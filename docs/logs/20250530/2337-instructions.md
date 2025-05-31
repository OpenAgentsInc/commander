Okay, this is a significant and exciting change in direction! We're moving from using a pre-built Docker image to implementing a dynamic, per-task Docker image building process, aligning with the sophisticated methodology of the SWE-Bench authors and the DGM paper.

This is a multi-phase effort. Here are the specific instructions for the coding agent to begin porting the core logic for dynamic Docker image building and SWE-Bench task execution into the OpenAgents Commander's Effect-TS based harness.

**Overall Objective:**
Refactor the SWE-Bench harness in Commander to dynamically build Docker images for each task instance, manage the container lifecycle for evaluation, and execute tests within these custom environments.

---

**Phase 1: Enhance `DockerUtilsService` for Image Building & Removal**

**Goal:** Extend `DockerUtilsService` to support building Docker images from a Dockerfile and context, and to remove images.

1.  **File:** `src/services/docker/DockerUtilsService.ts`
    *   **Action:** Add the following method signatures to the `DockerUtilsService` interface:
        ```typescript
        // Add these to the existing DockerUtilsService interface
        readonly buildImage: (
          contextPath: string, // Path to the directory containing the Dockerfile and build context
          options: Dockerode.ImageBuildOptions // e.g., { t: "image-name:tag", dockerfile: "Dockerfile.name" }
        ) => Effect.Effect<NodeJS.ReadableStream, DockerOperationError>; // Stream of build output

        readonly removeImage: (
          imageNameOrId: string,
          options?: Dockerode.ImageRemoveOptions
        ) => Effect.Effect<void, DockerOperationError>;
        ```

2.  **File:** `src/services/docker/DockerUtilsServiceImpl.ts`
    *   **Action:** Implement the new methods in `DockerUtilsServiceLive`.
        *   **Import `tar-fs`**:
            ```typescript
            import tar from 'tar-fs';
            ```
        *   **Implement `buildImage`**:
            -   This method needs to create a TAR stream of the `contextPath` directory.
            -   Use `docker.buildImage(tarStream, options)`.
            -   The `options.dockerfile` should specify the name of the Dockerfile *relative to the root of the TAR stream* (usually just "Dockerfile" if it's at the root of `contextPath`).
            -   Handle the returned stream for build logs (similar to `pullImage`, but it resolves when the build is done, not on first data). Map errors to `DockerOperationError`.

            ```typescript
            // Inside DockerUtilsServiceLive's return object:
            buildImage: (contextPath: string, options: Dockerode.ImageBuildOptions) =>
              Effect.async<NodeJS.ReadableStream, DockerOperationError>((resume) => {
                try {
                  const tarStream = tar.pack(contextPath);

                  docker.buildImage(tarStream, options, (err, stream) => {
                    if (err) {
                      resume(Effect.fail(new DockerOperationError({
                        message: `Failed to start image build for context ${contextPath}`,
                        operation: "buildImage.start",
                        imageName: options.t as string,
                        cause: err
                      })));
                      return;
                    }
                    if (!stream) {
                      resume(Effect.fail(new DockerOperationError({
                        message: `No stream returned for image build from context ${contextPath}`,
                        operation: "buildImage.nostream",
                        imageName: options.t as string
                      })));
                      return;
                    }

                    // The stream itself is the output. The caller should handle followProgress.
                    // However, we need to know when the build *finishes* or errors for the Effect.
                    // For simplicity in this phase, we will return the stream immediately.
                    // A more robust solution would involve a separate Effect for waiting on followProgress.
                    // Let's assume the caller of buildImage will handle the stream events for completion/error.
                    // For this Effect, succeeding with the stream means the build process started.
                    // For now, let's resolve immediately with the stream. The caller will need to manage it.
                    resume(Effect.succeed(stream));

                    // If we wanted to wait for completion here:
                    /*
                    docker.modem.followProgress(stream, (errFollow, output) => {
                      if (errFollow) {
                        resume(Effect.fail(new DockerOperationError({
                          message: `Image build failed for ${options.t}`,
                          operation: "buildImage.followProgress",
                          imageName: options.t as string,
                          cause: errFollow
                        })));
                      } else {
                        // Check output for errors
                        const lastLine = output && output.length > 0 ? output[output.length - 1] : null;
                        if (lastLine && (lastLine.error || lastLine.errorDetail)) {
                          resume(Effect.fail(new DockerOperationError({
                            message: `Image build error for ${options.t}: ${lastLine.errorDetail?.message || lastLine.error}`,
                            operation: "buildImage.result",
                            imageName: options.t as string,
                            cause: lastLine.errorDetail || lastLine.error
                          })));
                        } else {
                          resume(Effect.succeed(stream)); // Or Effect.void if stream is consumed
                        }
                      }
                    });
                    */
                  });
                } catch (e) {
                  resume(Effect.fail(new DockerOperationError({
                    message: "Error creating TAR stream for Docker build context",
                    operation: "buildImage.tar",
                    imageName: options.t as string,
                    cause: e
                  })));
                }
              }),

            removeImage: (imageNameOrId, options) =>
              Effect.tryPromise({
                try: () => docker.getImage(imageNameOrId).remove(options),
                catch: (cause) => new DockerOperationError({
                  message: `Failed to remove image ${imageNameOrId}`,
                  operation: "removeImage",
                  imageName: imageNameOrId,
                  cause
                })
              }).pipe(Effect.asVoid),
            ```

3.  **File:** `src/services/docker/DockerUtilsService.test.ts`
    *   **Action:** Add unit tests for `buildImage` and `removeImage`.
        *   Mock `docker.buildImage` and `docker.getImage().remove()`.
        *   For `buildImage`, mock `tar.pack` and simulate the stream returned by `docker.buildImage`. Test success and error cases.
        *   For `removeImage`, test success and error cases.

---

**Phase 2: Dockerfile Management & Build Context Preparation**

**Goal:** Create a service to manage Dockerfiles and prepare the build context for a given SWE-Bench task.

1.  **Create Dockerfile Template(s)**:
    *   **Action (Manual for now, or instruct agent to create as a string):** Create a template Dockerfile for SWE-Bench. Let's start with a simplified one that assumes `swebench/swe-eval:latest` as a base for its first stage, and then stages for repo cloning and setup.
    *   **Path:** `assets/dockerfiles/swe_bench_task.Dockerfile` (The agent will be instructed to copy this or use its content).
    *   **Content for `assets/dockerfiles/swe_bench_task.Dockerfile`**:
        ```dockerfile
        # Stage 1: Base environment (official SWE-Bench image)
        ARG SWE_BENCH_BASE_IMAGE=swebench/swe-eval:latest
        FROM ${SWE_BENCH_BASE_IMAGE} as base

        # Stage 2: Task-specific repository setup
        FROM base as instance
        ARG REPO_URL_ARG
        ARG BASE_COMMIT_ARG
        ARG CONTAINER_REPO_PATH_ARG=/opt/swe-bench/repo

        ENV REPO_URL=${REPO_URL_ARG}
        ENV BASE_COMMIT=${BASE_COMMIT_ARG}
        ENV CONTAINER_REPO_PATH=${CONTAINER_REPO_PATH_ARG}

        RUN apt-get update && apt-get install -y --no-install-recommends git-lfs && rm -rf /var/lib/apt/lists/*

        # Clone the specific repository and checkout the base commit
        # Ensure git-lfs is available if needed by some repos
        RUN git clone ${REPO_URL} ${CONTAINER_REPO_PATH} && \
            cd ${CONTAINER_REPO_PATH} && \
            git checkout ${BASE_COMMIT} && \
            (git lfs pull || true) # Attempt lfs pull, ignore if it fails or not configured

        # Set the working directory for subsequent commands in the harness
        WORKDIR /swe_bench_workdir
        # The eval.sh script will be copied here and will cd into CONTAINER_REPO_PATH

        # Default command (can be overridden by docker run)
        CMD ["/bin/bash"]
        ```

2.  **File:** `src/services/swe_bench_harness/errors.ts`
    *   **Action:** Define `DockerBuildPrepError`.
        ```typescript
        // Add to existing errors
        export class DockerBuildPrepError extends Data.TaggedError(
          "DockerBuildPrepError",
        )<{
          readonly message: string;
          readonly cause?: unknown;
          readonly context?: Record<string, any>;
        }> {}
        ```

3.  **File:** `src/services/swe_bench_harness/DockerBuildManagerService.ts` (Create this file)
    *   **Action:** Define the interface and Tag.
        ```typescript
        // src/services/swe_bench_harness/DockerBuildManagerService.ts
        import { Context, Effect } from "effect";
        import type { SWEBenchTask } from "./types";
        import { DockerBuildPrepError } from "./errors";
        import type { ConfigError } from "@/services/configuration";
        import type { FileSystem } from "@effect/platform/FileSystem";

        export interface BuildContextResult {
          readonly contextPath: string; // Path to the directory containing Dockerfile and context
          readonly dockerfileName: string; // Name of the Dockerfile within contextPath (e.g., "Dockerfile")
          readonly imageName: string; // Suggested image name:tag
          readonly containerRepoPath: string; // Path where repo will be inside the container
        }

        export interface DockerBuildManagerService {
          prepareBuildContext(
            task: SWEBenchTask,
            hostWorkspaceRoot: string // Root for temp build contexts
          ): Effect.Effect<BuildContextResult, DockerBuildPrepError | ConfigError, FileSystem>;
        }

        export const DockerBuildManagerService =
          Context.GenericTag<DockerBuildManagerService>("DockerBuildManagerService");
        ```

4.  **File:** `src/services/swe_bench_harness/DockerBuildManagerServiceImpl.ts` (Create this file)
    *   **Action:** Implement `DockerBuildManagerServiceLive`.
        -   Dependencies: `ConfigurationService`, `FileSystem`, `TelemetryService`.
        -   `prepareBuildContext`:
            1.  Create a unique temporary subdirectory under `hostWorkspaceRoot` for this task's build context (e.g., `fs.makeTempDirectoryScoped`). This is `contextPath`.
            2.  Copy the `assets/dockerfiles/swe_bench_task.Dockerfile` template into this `contextPath` as `Dockerfile`. (Use `fs.readFileString` to get template content, then `fs.writeFileString`).
            3.  Construct the full GitHub repository URL (e.g., `https://github.com/${task.repo}.git`).
            4.  Define `containerRepoPath` (e.g., from config or default `/opt/swe-bench/repo`).
            5.  Generate a unique `imageName` (e.g., `swe-bench-task/${task.instance_id.replace(/[\/\:]/g, "--")}:latest`).
            6.  Return `{ contextPath, dockerfileName: "Dockerfile", imageName, containerRepoPath }`.
            7.  Map errors to `DockerBuildPrepError`.

5.  **File:** `src/services/swe_bench_harness/DockerBuildManagerService.test.ts` (Create this file)
    *   **Action:** Unit test `prepareBuildContext`.
        -   Mock `ConfigurationService`, `FileSystem`, `TelemetryService`.
        -   Verify that the correct Dockerfile content is written (or that the correct template is copied).
        -   Verify correct `contextPath`, `imageName`, and `containerRepoPath` are returned.

---

**Phase 3: Update `SWEBenchLifecycleService` for Dynamic Image Building**

**Goal:** Refactor `SWEBenchLifecycleService` to build a custom Docker image for each task before creating the container.

1.  **File:** `src/services/swe_bench_harness/SWEBenchLifecycleService.ts`
    *   **Action:** Modify the `ContainerContext` and method signatures.
        ```typescript
        // Update ContainerContext
        export interface ContainerContext {
          readonly containerId: string;
          readonly hostEvalDir: string; // Temp dir on HOST where patch/eval.sh are placed
          readonly containerEvalDir: string; // Mount point of hostEvalDir INSIDE container
          readonly containerRepoPath: string; // Path of repo cloned INSIDE container (by Dockerfile)
          readonly imageName: string; // Name of the dynamically built image
          readonly hostBuildCtxDir: string; // Path to the Docker build context on HOST (temp dir)
        }

        // Update method signature (now returns ContainerContext, and R includes DockerBuildManagerService)
        setupContainerForTask( // Rename to prepareEvaluationEnvironment in next iteration if desired
          task: SWEBenchTask
        ): Effect.Effect<
          ContainerContext,
          LifecycleSetupError | DockerError | DockerOperationError | ConfigError | DockerBuildPrepError,
          FileSystem | DockerBuildManagerService // Add DockerBuildManagerService to R
        >;
        ```

2.  **File:** `src/services/swe_bench_harness/SWEBenchLifecycleServiceImpl.ts`
    *   **Action:** Refactor `setupContainerForTask`.
        -   Add `DockerBuildManagerService` as a dependency.
        -   **Workflow:**
            1.  Get `SWE_BENCH_HOST_TEMP_DIR` (this is now the root for build contexts).
            2.  Call `dockerBuildManager.prepareBuildContext(task, hostTempDir)` to get `contextPath`, `dockerfileName`, `imageName`, `containerRepoPath`. `contextPath` becomes `hostBuildCtxDir` in `ContainerContext`.
            3.  Call `docker.buildImage(contextPath, { t: imageName, dockerfile: dockerfileName, buildargs: { REPO_URL_ARG: `https://github.com/${task.repo}.git`, BASE_COMMIT_ARG: task.base_commit, CONTAINER_REPO_PATH_ARG: containerRepoPath } })`.
                *   Crucially, handle the build output stream. Log it. The `Effect` should only succeed if the build is successful. This requires enhancing `DockerUtilsService.buildImage` or handling its stream here.
                *   **Simplified build stream handling for now:**
                    ```typescript
                    const buildStream = yield* _(docker.buildImage(...));
                    // This Effect will consume the stream and resolve/fail based on Docker build output.
                    yield* _(Effect.async<void, DockerOperationError>(resume => {
                      let buildSuccess = false;
                      let buildErrorOutput = "";
                      docker.modem.followProgress(buildStream, (err, output) => {
                        if (err) {
                          resume(Effect.fail(new DockerOperationError({ ... })));
                        } else {
                          const lastLine = output && output.length > 0 ? output[output.length-1] : null;
                          if (lastLine && (lastLine.error || lastLine.errorDetail)) {
                            resume(Effect.fail(new DockerOperationError({ message: `Image build failed: ${lastLine.errorDetail?.message || lastLine.error}`, ... })));
                          } else {
                            resume(Effect.succeed(undefined));
                          }
                        }
                      }, (event) => { /* Log progress via telemetry */ });
                    }));
                    ```
            4.  Create `hostEvalDir`: A *new, separate* temporary directory under `SWE_BENCH_HOST_TEMP_DIR` (e.g., `fs.makeTempDirectoryScoped({ prefix: 'eval-' })`). This directory will be mounted into the container for `eval.sh`, `patch.diff`, and `report.json`.
            5.  `containerEvalDir` is now where `hostEvalDir` (the one for script/patch/report) is mounted (e.g., `/swe_bench_workdir`).
            6.  `DockerUtilsService.createContainer` using the newly built `imageName`. The mount will be `Source: hostEvalDir, Target: containerEvalDir`. The `WorkingDir` in container options should be `containerEvalDir`.
            7.  Return the updated `ContainerContext` (including `imageName` and `hostBuildCtxDir`).
    *   **Refactor `runEvaluationInContainer`**:
        -   The `eval.sh` will `cd ${containerRepoPath}` (which is fixed in the image).
        -   The patch file will be referenced as `${containerEvalDir}/${patchFileName}`.
    *   **Refactor `cleanupContainerResources`**:
        -   After stopping/removing container, also call `docker.removeImage(containerContext.imageName, { force: true })`.
        -   Remove `containerContext.hostBuildCtxDir` recursively.
        -   Remove `containerContext.hostEvalDir` recursively.

3.  **File:** `src/services/swe_bench_harness/SWEBenchLifecycleService.test.ts`
    *   **Action:** Update unit tests. Add `DockerBuildManagerService` mock. Test new image building flow.

---

**Phase 4: Adjust `SWEBenchEvaluationScriptService`**

**Goal:** Ensure the `eval.sh` script works correctly within the new dynamically built image environment.

1.  **File:** `src/services/swe_bench_harness/SWEBenchEvaluationScriptServiceImpl.ts`
    *   **Action:** Review and adjust `buildEvalScript`.
        -   The `condaActivate` line might become optional if the Dockerfile's `instance` stage already activates the correct conda environment. However, keeping it makes the script more robust to Dockerfile changes.
        -   The `cd "${containerRepoPath}"` command is now critical.
        -   The path to the patch file will be `${containerEvalDir}/${patchFileNameInContainer}` because `eval.sh` runs from `/swe_bench_workdir` (which is `containerEvalDir`).
        -   Ensure paths for `report.json` and `test_output.txt` (e.g., `/tmp/report.json`) are consistent with what `runEvaluationInContainer` expects to copy out.

2.  **File:** `src/services/swe_bench_harness/SWEBenchEvaluationScriptService.test.ts`
    *   **Action:** Update tests to reflect any changes in the script generation logic.

---

**Phase 5: Configuration Updates and README**

1.  **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action:** In `DefaultDevConfigLayer`:
        *   Rename `SWE_BENCH_DOCKER_IMAGE_NAME` to `SWE_BENCH_BASE_DOCKER_IMAGE_NAME` and ensure its value is `swebench/swe-eval:latest`.
        *   Add `configService.set("SWE_BENCH_DOCKERFILE_TEMPLATE_PATH", "./assets/dockerfiles/swe_bench_task.Dockerfile")`.

2.  **File:** `README.md`
    *   **Action:** **Drasically update** the "SWE-Bench Harness Prerequisites" section.
        *   It should now explain that the harness *builds* Docker images per task.
        *   It should still instruct users to ensure Docker is installed and running.
        *   It might mention that `swebench/swe-eval:latest` is used as a *base* image and can be pre-pulled to speed up the first build:
            ```markdown
            ## SWE-Bench Harness Prerequisites (Optional)

            If you plan to use or develop the SWE-Bench evaluation harness:

            1.  **Ensure Docker is installed and running:**
                Docker Desktop (for Mac/Windows) or Docker Engine (for Linux) must be installed and the Docker daemon must be running.

            2.  **Understanding the Docker Environment:**
                Commander's SWE-Bench harness dynamically builds a custom Docker image for each task instance to ensure a precise and reproducible evaluation environment. This process is automated by the harness.
                The base image used for these builds is typically `swebench/swe-eval:latest`. You can optionally pre-pull this base image to potentially speed up the initial build for your first task evaluation:
                ```bash
                docker pull swebench/swe-eval:latest
                ```
            ```

---

**Phase 6: Update Barrel Files & Layer Compositions**

1.  **File:** `src/services/swe_bench_harness/index.ts`
    *   **Action:** Export `DockerBuildManagerService` and `DockerBuildManagerServiceImpl`.

2.  **File:** `src/services/runtime.ts` (or `example-layer-composition.ts`)
    *   **Action:** Add `DockerBuildManagerServiceLive` to the `FullSWEBenchHarnessLayer` composition. Ensure it's provided with its dependencies (`ConfigurationService`, `FileSystem`, `TelemetryService`).
        ```typescript
        // In example-layer-composition.ts, within FullSWEBenchHarnessLayer composition:
        // ...
        import { DockerBuildManagerServiceLive } from "@/services/swe_bench_harness"; // Adjust path if needed
        // ...
        export const FullSWEBenchHarnessLayer = SWEBenchHarnessServiceLive.pipe(
          // ... existing provides ...
          Layer.provide(DockerBuildManagerServiceLive), // Add this
          Layer.provide(BaseServicesLayer) // BaseServicesLayer should include FileSystem, Config, Telemetry
        );
        ```

---

This set of instructions outlines a major refactor. Proceed carefully, phase by phase, testing thoroughly at each step. The goal is a much more robust and accurate SWE-Bench harness. Good luck, agent!
