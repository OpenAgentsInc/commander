import { Effect, Layer, Schema } from "effect";
import path from "path";
import { extract } from "tar-stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { FileSystem } from "@effect/platform/FileSystem";
import { SWEBenchLifecycleService } from "./SWEBenchLifecycleService";
import { DockerUtilsService, DockerError, DockerOperationError } from "@/services/docker";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { DockerBuildManagerService } from "./DockerBuildManagerService";
import type { SWEBenchTask, EvaluationReport, ContainerContext } from "./types";
import { EvaluationReportSchema } from "./types";
import { LifecycleSetupError, LifecycleEvalError } from "./errors";
import type Dockerode from "dockerode";

export const SWEBenchLifecycleServiceLive = Layer.effect(
  SWEBenchLifecycleService,
  Effect.gen(function* () {
    const docker = yield* DockerUtilsService;
    const config = yield* ConfigurationService;
    const telemetry = yield* TelemetryService;
    const fs = yield* FileSystem;
    const dockerBuildManager = yield* DockerBuildManagerService;

    return SWEBenchLifecycleService.of({
      setupContainerForTask: (task) => 
        Effect.gen(function* () {
          // Get configuration values
          const hostTempDir = yield* config.get("SWE_BENCH_HOST_TEMP_DIR");
          const containerWorkdir = yield* config.get("SWE_BENCH_CONTAINER_WORKDIR");

          // Step 1: Prepare Docker build context
          const buildContext = yield* dockerBuildManager.prepareBuildContext(task, hostTempDir);

          // Step 2: Build the Docker image
          const buildStream = yield* docker.buildImage(buildContext.contextPath, {
            t: buildContext.imageName,
            dockerfile: buildContext.dockerfileName,
            buildargs: {
              SWE_BENCH_BASE_IMAGE_ARG: buildContext.baseImageName,
              PYTHON_VERSION_ARG: buildContext.pythonVersion,
              CONDA_ENV_NAME_ARG: buildContext.condaEnvName,
              REPO_URL_ARG: `https://github.com/${task.repo}.git`,
              BASE_COMMIT_ARG: task.base_commit,
              CONTAINER_REPO_PATH_ARG: buildContext.containerRepoPath
            }
          });

          // Handle the build stream
          yield* Effect.async<void, DockerOperationError>((resume) => {
            // Note: We need to follow the build progress manually since the DockerUtilsService
            // doesn't expose the modem. For now, we'll just check if the stream completes.
            buildStream.on('end', () => {
              resume(Effect.succeed(undefined));
            });
            
            buildStream.on('error', (err) => {
              resume(Effect.fail(new DockerOperationError({
                message: `Image build failed for ${buildContext.imageName}`,
                operation: "buildImage.stream",
                imageName: buildContext.imageName,
                cause: err
              })));
            });
            
            // Log build output
            buildStream.on('data', (chunk) => {
              const lines = chunk.toString().split('\n');
              lines.forEach((line: string) => {
                if (line.trim()) {
                  try {
                    const event = JSON.parse(line);
                    if (event.stream) {
                      console.log(`[Docker Build] ${event.stream.trim()}`);
                    } else if (event.error) {
                      console.error(`[Docker Build Error] ${event.error}`);
                    }
                  } catch {
                    // Not JSON, just log as is
                    console.log(`[Docker Build] ${line}`);
                  }
                }
              });
            });
          }).pipe(
            Effect.mapError(error => new LifecycleSetupError({
              message: "Failed to build Docker image",
              cause: error,
              context: { task: task.instance_id, imageName: buildContext.imageName }
            }))
          );

          // Step 3: Create temp directory for evaluation scripts
          const hostEvalDir = yield* fs.makeTempDirectory({
            directory: hostTempDir,
            prefix: `swe-bench-eval-${task.instance_id}-`
          }).pipe(
            Effect.mapError(error => new LifecycleSetupError({
              message: "Failed to create evaluation temp directory",
              cause: error,
              context: { hostTempDir, task: task.instance_id }
            }))
          );

          // Step 4: Create and start container
          const containerEvalDir = containerWorkdir; // /swe_bench_workdir
          const containerOptions: Dockerode.ContainerCreateOptions = {
            Image: buildContext.imageName,
            Tty: false,
            AttachStdin: false,
            AttachStdout: false,
            AttachStderr: false,
            OpenStdin: false,
            WorkingDir: "/swe_bench_workdir",
            HostConfig: {
              AutoRemove: false,
              RestartPolicy: { Name: 'no' },
              Mounts: [{
                Type: 'bind',
                Source: hostEvalDir,
                Target: containerEvalDir,
                ReadOnly: false
              }]
            },
            // Override entrypoint and cmd to keep container running
            Entrypoint: ["/bin/sh", "-c"],
            Cmd: ["tail -f /dev/null"]
          };

          const containerId = yield* docker.createContainer(containerOptions);
          yield* docker.startContainer(containerId);
          
          console.log(`[Lifecycle] Container ${containerId} started with tail -f /dev/null`);

          const context: ContainerContext = {
            containerId,
            hostEvalDir,
            containerEvalDir,
            containerRepoPath: buildContext.containerRepoPath,
            imageName: buildContext.imageName,
            hostBuildCtxDir: buildContext.contextPath
          };

          yield* telemetry.trackEvent({
              category: "swe_bench",
              action: "container_setup_complete",
              label: task.instance_id,
              value: containerId
            }).pipe(Effect.catchAll(() => Effect.void));

            return context;
        }),

      runEvaluationInContainer: (containerContext, evalScriptContent, patchContent, patchFileName = "patch.diff", testPatchContent) =>
        Effect.gen(function* () {
          // Write patch file to host
            const patchPath = path.join(containerContext.hostEvalDir, patchFileName);
            yield* fs.writeFileString(patchPath, patchContent).pipe(
              Effect.mapError(error => new LifecycleEvalError({
                message: "Failed to write patch file",
                cause: error,
                context: { patchPath }
              }))
            );

            // Write test patch file to host if provided
            if (testPatchContent) {
              const testPatchPath = path.join(containerContext.hostEvalDir, "test_patch.diff");
              yield* fs.writeFileString(testPatchPath, testPatchContent).pipe(
                Effect.mapError(error => new LifecycleEvalError({
                  message: "Failed to write test patch file",
                  cause: error,
                  context: { testPatchPath }
                }))
              );
            }

            // Write eval script to host
            const scriptPath = path.join(containerContext.hostEvalDir, "eval.sh");
            yield* fs.writeFileString(scriptPath, evalScriptContent).pipe(
              Effect.mapError(error => new LifecycleEvalError({
                message: "Failed to write eval script",
                cause: error,
                context: { scriptPath }
              }))
            );
            yield* fs.chmod(scriptPath, 0o755).pipe(
              Effect.mapError(error => new LifecycleEvalError({
                message: "Failed to chmod eval script",
                cause: error,
                context: { scriptPath }
              }))
            );

            // Execute eval script in container
            console.log(`[Lifecycle] Executing eval.sh in container ${containerContext.containerId}`);
            const execResult = yield* docker.execInContainer(
              containerContext.containerId,
              ["/bin/bash", path.join(containerContext.containerEvalDir, "eval.sh")],
              { WorkingDir: containerContext.containerRepoPath }
            );

            // Log execution results for debugging
            console.log(`[Lifecycle] Eval script execution results:`);
            console.log(`  Exit code: ${execResult.exitCode}`);
            console.log(`  Stdout: ${execResult.stdout.substring(0, 500)}...`);
            console.log(`  Stderr: ${execResult.stderr.substring(0, 500)}...`);

            // Try to retrieve report.json from container
            const reportStream = yield* docker.copyFromContainer(
              containerContext.containerId,
              "/tmp/report.json"
            ).pipe(
              Effect.mapError(error => new LifecycleEvalError({
                message: "Failed to retrieve report.json from container",
                cause: error,
                exitCode: execResult.exitCode,
                stdout: execResult.stdout,
                stderr: execResult.stderr,
                context: { containerId: containerContext.containerId }
              }))
            );

            // Extract report.json from TAR stream
            const reportContent = yield* Effect.async<string, LifecycleEvalError>((resume) => {
              const extractor = extract();
              let content = "";

              extractor.on('entry', (header, stream, next) => {
                if (header.name === 'report.json' || header.name.endsWith('/report.json')) {
                  stream.on('data', chunk => { content += chunk.toString(); });
                  stream.on('end', next);
                  stream.resume();
                } else {
                  stream.on('end', next);
                  stream.resume();
                }
              });

              extractor.on('finish', () => {
                if (content) {
                  resume(Effect.succeed(content));
                } else {
                  resume(Effect.fail(new LifecycleEvalError({
                    message: "report.json not found in container",
                    exitCode: execResult.exitCode,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr
                  })));
                }
              });

              extractor.on('error', (error) => {
                resume(Effect.fail(new LifecycleEvalError({
                  message: "Failed to extract report.json",
                  cause: error,
                  exitCode: execResult.exitCode,
                  stdout: execResult.stdout,
                  stderr: execResult.stderr
                })));
              });

              reportStream.pipe(extractor);
            });

            // Parse and validate report
            const reportData = yield* Effect.try({
              try: () => JSON.parse(reportContent),
              catch: (error) => new LifecycleEvalError({
                message: "Failed to parse report.json",
                cause: error,
                context: { reportContent }
              })
            });

            let report = yield* Schema.decodeUnknown(EvaluationReportSchema)(reportData).pipe(
              Effect.mapError(error => new LifecycleEvalError({
                message: "Invalid report schema",
                cause: error,
                context: { reportData }
              }))
            );

            // Try to copy test output if mentioned in report
            if (report.test_output_log_path) {
              const testOutputResult = yield* Effect.try({
                try: () => docker.copyFromContainer(
                  containerContext.containerId,
                  "/tmp/test_output.txt"
                ).pipe(
                  Effect.flatMap(testOutputStream => {
                    const testOutputPath = path.join(containerContext.hostEvalDir, "test_output.txt");
                    return Effect.tryPromise({
                      try: () => pipeline(testOutputStream, createWriteStream(testOutputPath)),
                      catch: () => undefined
                    }).pipe(
                      Effect.map(() => testOutputPath)
                    );
                  })
                ),
                catch: () => Effect.succeed(undefined)
              }).pipe(
                Effect.flatten,
                Effect.catchAll(() => Effect.succeed(undefined))
              );

              if (testOutputResult) {
                // Update report with host path
                report = { ...report, test_output_log_path: testOutputResult };
              }
            }

            yield* telemetry.trackEvent({
              category: "swe_bench",
              action: "evaluation_complete",
              label: report.instance_id,
              value: report.resolved ? "resolved" : "not_resolved"
            }).pipe(Effect.catchAll(() => Effect.void));

            return report;
        }),

      cleanupContainerResources: (containerContext) =>
        Effect.gen(function* () {
          // Stop container (ignore errors if already stopped)
          yield* docker.stopContainer(containerContext.containerId, { t: 10 }).pipe(
            Effect.catchAll(() => Effect.void)
          );

          // Remove container
          yield* docker.removeContainer(containerContext.containerId, { force: true });

          // Remove Docker image
          yield* docker.removeImage(containerContext.imageName, { force: true }).pipe(
            Effect.mapError(error => new DockerError({
              message: `Failed to remove Docker image ${containerContext.imageName}`,
              cause: error
            }))
          );

          // Remove build context directory
          yield* fs.remove(containerContext.hostBuildCtxDir, { recursive: true }).pipe(
            Effect.mapError(error => new DockerError({ 
              message: "Failed to remove build context directory",
              cause: { path: containerContext.hostBuildCtxDir, error }
            }))
          );

          // Remove evaluation temp directory
          yield* fs.remove(containerContext.hostEvalDir, { recursive: true }).pipe(
            Effect.mapError(error => new DockerError({ 
              message: "Failed to remove evaluation temp directory",
              cause: { path: containerContext.hostEvalDir, error }
            }))
          );

          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "container_cleanup_complete",
            label: containerContext.containerId,
            context: {
              imageName: containerContext.imageName,
              hostBuildCtxDir: containerContext.hostBuildCtxDir,
              hostEvalDir: containerContext.hostEvalDir
            }
          }).pipe(Effect.catchAll(() => Effect.void));
        })
    });
  })
);