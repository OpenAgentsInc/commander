import { Effect, Layer, Schema } from "effect";
import path from "path";
import simpleGit from "simple-git";
import { extract } from "tar-stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { FileSystem } from "@effect/platform/FileSystem";
import { SWEBenchLifecycleService } from "./SWEBenchLifecycleService";
import { DockerUtilsService, DockerError } from "@/services/docker";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
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

    const git = simpleGit();

    return SWEBenchLifecycleService.of({
      setupContainerForTask: (task) => 
        Effect.gen(function* () {
          // Get configuration values
            const hostTempDir = yield* config.get("SWE_BENCH_HOST_TEMP_DIR");
            const containerWorkdir = yield* config.get("SWE_BENCH_CONTAINER_WORKDIR");
            const dockerImage = yield* config.get("SWE_BENCH_DOCKER_IMAGE_NAME");

            // Create unique temp directory for this task
            const taskTempDir = yield* fs.makeTempDirectory({
              directory: hostTempDir,
              prefix: `swe-bench-${task.instance_id}-`
            }).pipe(
              Effect.mapError(error => new LifecycleSetupError({
                message: "Failed to create temp directory",
                cause: error,
                context: { hostTempDir, task: task.instance_id }
              }))
            );

            // Clone repository
            const repoName = task.repo.split('/').pop() || 'repo';
            const repoPath = path.join(taskTempDir, repoName);
            
            yield* Effect.tryPromise({
              try: async () => {
                await git.clone(`https://github.com/${task.repo}.git`, repoPath);
                await git.cwd(repoPath).checkout(task.base_commit);
              },
              catch: (error) => new LifecycleSetupError({
                message: `Failed to clone repository ${task.repo}`,
                cause: error,
                context: { repo: task.repo, commit: task.base_commit }
              })
            });

            // Set up container paths
            const containerEvalDir = path.join(containerWorkdir, task.instance_id);
            const containerRepoPath = path.join(containerEvalDir, repoName);

            // Create container with bind mount
            const containerOptions: Dockerode.ContainerCreateOptions = {
              Image: dockerImage,
              Tty: false,
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              OpenStdin: false,
              WorkingDir: containerRepoPath,
              HostConfig: {
                AutoRemove: false,
                Mounts: [{
                  Type: 'bind',
                  Source: taskTempDir,
                  Target: containerEvalDir,
                  ReadOnly: false
                }]
              },
              // Keep container running
              Cmd: ["tail", "-f", "/dev/null"]
            };

            const containerId = yield* docker.createContainer(containerOptions);
            yield* docker.startContainer(containerId);

            const context: ContainerContext = {
              containerId,
              hostEvalDir: taskTempDir,
              containerEvalDir,
              containerRepoPath
            };

            yield* telemetry.trackEvent({
              category: "swe_bench",
              action: "container_setup_complete",
              label: task.instance_id,
              value: containerId
            }).pipe(Effect.catchAll(() => Effect.void));

            return context;
        }),

      runEvaluationInContainer: (containerContext, evalScriptContent, patchContent, patchFileName = "patch.diff") =>
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
            const execResult = yield* docker.execInContainer(
              containerContext.containerId,
              ["/bin/bash", path.join(containerContext.containerEvalDir, "eval.sh")],
              { WorkingDir: containerContext.containerRepoPath }
            );

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

          // Remove temp directory
          yield* fs.remove(containerContext.hostEvalDir, { recursive: true }).pipe(
            Effect.mapError(() => new DockerError({ 
              message: "Failed to remove temp directory",
              cause: { path: containerContext.hostEvalDir }
            }))
          );

          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "container_cleanup_complete",
            value: containerContext.containerId
          }).pipe(Effect.catchAll(() => Effect.void));
        })
    });
  })
);