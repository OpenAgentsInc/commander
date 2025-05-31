// src/services/swe_bench_harness/DockerBuildManagerServiceImpl.ts
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { DockerBuildManagerService, type BuildContextResult } from "./DockerBuildManagerService";
import { SWEBenchEnvironmentSetupService } from "./SWEBenchEnvironmentSetupService";
import { DockerBuildPrepError } from "./errors";
import type { SWEBenchTask } from "./types";
import path from "path";

export const DockerBuildManagerServiceLive = Layer.effect(
  DockerBuildManagerService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    const fs = yield* _(FileSystem);
    const envSetup = yield* _(SWEBenchEnvironmentSetupService);

    return DockerBuildManagerService.of({
      prepareBuildContext: (task: SWEBenchTask, hostWorkspaceRoot: string) =>
        Effect.gen(function* (_) {
          // Track the operation (ignore errors)
          yield* _(telemetry.trackEvent({
            category: "swe_bench",
            action: "docker_build_context_start",
            label: task.instance_id
          }).pipe(Effect.catchAll(() => Effect.void)));

          // 1. Create a unique temporary subdirectory for this task's build context
          const tempDirPrefix = `swe-bench-build-${task.instance_id.replace(/[\/\:]/g, "--")}`;
          const contextPath = yield* _(
            fs.makeTempDirectory({ 
              directory: hostWorkspaceRoot,
              prefix: tempDirPrefix 
            }).pipe(
              Effect.mapError(cause => new DockerBuildPrepError({
                message: "Failed to create build context directory",
                cause,
                context: { task: task.instance_id, hostWorkspaceRoot }
              }))
            )
          );

          // 2. Analyze task environment requirements
          const envConfig = yield* _(envSetup.analyzeTaskEnvironment(task));

          // 3. Determine which Dockerfile template to use
          const useEnhanced = yield* _(
            config.get("SWE_BENCH_USE_ENHANCED_DOCKERFILE").pipe(
              Effect.orElse(() => Effect.succeed("true"))
            )
          );

          const dockerfileTemplatePath = yield* _(
            config.get("SWE_BENCH_DOCKERFILE_TEMPLATE_PATH").pipe(
              Effect.orElse(() => Effect.succeed(
                useEnhanced === "true" 
                  ? "./assets/dockerfiles/swe_bench_task_enhanced.Dockerfile"
                  : "./assets/dockerfiles/swe_bench_task.Dockerfile"
              ))
            )
          );

          const dockerfileContent = yield* _(
            fs.readFileString(dockerfileTemplatePath).pipe(
              Effect.mapError(cause => new DockerBuildPrepError({
                message: `Failed to read Dockerfile template from ${dockerfileTemplatePath}`,
                cause,
                context: { task: task.instance_id }
              }))
            )
          );

          // 4. Write the Dockerfile to the build context
          const dockerfilePath = path.join(contextPath, "Dockerfile");
          yield* _(
            fs.writeFileString(dockerfilePath, dockerfileContent).pipe(
              Effect.mapError(cause => new DockerBuildPrepError({
                message: "Failed to write Dockerfile to build context",
                cause,
                context: { contextPath, task: task.instance_id }
              }))
            )
          );

          // Store condaEnvName early since we need it for setup script
          const repoSanitized = task.repo.replace(/[\\/]/g, "__").replace(/[^a-zA-Z0-9_-]/g, "_");
          const versionSanitized = (task.version || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
          const condaEnvName = `${repoSanitized}-${versionSanitized}`;

          // 5. Generate and write the setup script if using enhanced Dockerfile
          if (useEnhanced === "true") {
            const containerRepoPath = yield* _(
              config.get("SWE_BENCH_CONTAINER_REPO_PATH").pipe(
                Effect.orElse(() => Effect.succeed("/opt/swe-bench/repo"))
              )
            );

            // Use the same virtualEnvPath as in the Dockerfile
            const virtualEnvPath = `/opt/venv/${condaEnvName}`;
            const setupScript = yield* _(envSetup.generateSetupScript(
              envConfig,
              containerRepoPath,
              virtualEnvPath
            ));

            const setupScriptPath = path.join(contextPath, "setup_environment.sh");
            yield* _(
              fs.writeFileString(setupScriptPath, setupScript).pipe(
                Effect.mapError(cause => new DockerBuildPrepError({
                  message: "Failed to write setup script to build context",
                  cause,
                  context: { contextPath, task: task.instance_id }
                }))
              )
            );
          }

          // 6. Construct the full GitHub repository URL
          const repoUrl = `https://github.com/${task.repo}.git`;

          // 7. Define containerRepoPath (from config or default)
          const containerRepoPath = yield* _(
            config.get("SWE_BENCH_CONTAINER_REPO_PATH").pipe(
              Effect.orElse(() => Effect.succeed("/opt/swe-bench/repo"))
            )
          );

          // 8. Use Python version from environment config
          const pythonVersion = envConfig.pythonVersion;

          // 9. condaEnvName was already calculated above for setup script

          // 10. Get base image name from config
          const baseImageName = yield* _(
            config.get("SWE_BENCH_BASE_IMAGE_NAME").pipe(
              Effect.orElse(() => Effect.succeed("swebench/swe-eval:latest"))
            )
          );

          // 11. Generate a unique image name
          const sanitizedInstanceId = task.instance_id.replace(/[\/\:]/g, "--");
          const imageName = `swe-bench-task/${sanitizedInstanceId}:latest`;

          // Track completion (ignore errors)
          yield* _(telemetry.trackEvent({
            category: "swe_bench",
            action: "docker_build_context_prepared",
            label: task.instance_id,
            context: {
              contextPath,
              imageName,
              repoUrl,
              pythonVersion,
              condaEnvName
            }
          }).pipe(Effect.catchAll(() => Effect.void)));

          return {
            contextPath,
            dockerfileName: "Dockerfile",
            imageName,
            containerRepoPath,
            pythonVersion,
            condaEnvName,
            baseImageName
          };
        }).pipe(
          Effect.provide(Layer.mergeAll(
            Layer.succeed(FileSystem, fs),
            Layer.succeed(ConfigurationService, config),
            Layer.succeed(TelemetryService, telemetry),
            Layer.succeed(SWEBenchEnvironmentSetupService, envSetup)
          ))
        ),
    });
  })
);