// src/services/swe_bench_harness/DockerBuildManagerServiceImpl.ts
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { DockerBuildManagerService, type BuildContextResult } from "./DockerBuildManagerService";
import { DockerBuildPrepError } from "./errors";
import type { SWEBenchTask } from "./types";
import path from "path";

export const DockerBuildManagerServiceLive = Layer.effect(
  DockerBuildManagerService,
  Effect.gen(function* (_) {
    const config = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    const fs = yield* _(FileSystem);

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

          // 2. Read the Dockerfile template
          const dockerfileTemplatePath = yield* _(
            config.get("SWE_BENCH_DOCKERFILE_TEMPLATE_PATH").pipe(
              Effect.orElse(() => Effect.succeed("./assets/dockerfiles/swe_bench_task.Dockerfile"))
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

          // 3. Write the Dockerfile to the build context
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

          // 4. Construct the full GitHub repository URL
          const repoUrl = `https://github.com/${task.repo}.git`;

          // 5. Define containerRepoPath (from config or default)
          const containerRepoPath = yield* _(
            config.get("SWE_BENCH_CONTAINER_REPO_PATH").pipe(
              Effect.orElse(() => Effect.succeed("/opt/swe-bench/repo"))
            )
          );

          // 6. Generate a unique image name
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
              repoUrl
            }
          }).pipe(Effect.catchAll(() => Effect.void)));

          return {
            contextPath,
            dockerfileName: "Dockerfile",
            imageName,
            containerRepoPath
          };
        }).pipe(
          Effect.provide(Layer.mergeAll(
            Layer.succeed(FileSystem, fs),
            Layer.succeed(ConfigurationService, config),
            Layer.succeed(TelemetryService, telemetry)
          ))
        ),
    });
  })
);