## Phase 2: SWE-Bench Harness - DockerUtilsService Foundation

**Goal:** To establish the foundational Docker utilities service (`DockerUtilsService`) using Dockerode and Effect-TS. This service will abstract Docker client interactions for managing containers and images, which is a prerequisite for running SWE-bench tasks in isolated environments.

**I. Project Setup & Dependencies:**

1.  **Install Dockerode:**
    *   Verify or add `dockerode` and its type definitions to `devDependencies` in `package.json`. The target versions (based on your `package.json`) are:
        ```json
        "dockerode": "^4.0.6",
        "@types/dockerode": "^3.3.39"
        ```
    *   If not already present or if versions differ, run:
        ```bash
        pnpm add -D dockerode@^4.0.6 @types/dockerode@^3.3.39
        ```
    *   Ensure changes are reflected by running `pnpm install`.

2.  **Create Initial Directory Structure:**
    *   Ensure the following directory structure exists. Create any missing directories or files:
        ```
        src/
        └── services/
            ├── docker/
            │   ├── DockerUtilsService.ts       # Interface, Tag, and data types
            │   ├── DockerUtilsServiceImpl.ts   # Live implementation
            │   ├── errors.ts                   # Custom Docker errors
            │   └── index.ts                    # Barrel file for docker/*
            ├── swe_bench_harness/
            │   ├── errors.ts                   # Create as empty file for now
            │   └── types.ts                    # Create as empty file for now
            └── index.ts                        # Main barrel file for services/
        ```

**II. Define Docker Error Types:**

*   **File:** `src/services/docker/errors.ts`
*   **Instructions:**
    *   Define custom tagged errors for Docker operations using `Effect/Data`.
    *   Create a base `DockerError`, a `DockerConnectionError` for issues connecting to the Docker daemon, and a `DockerOperationError` for errors during Docker commands.

    ```typescript
    // src/services/docker/errors.ts
    import { Data } from "effect";

    export class DockerError extends Data.TaggedError("DockerError")<{
      readonly message: string;
      readonly cause?: unknown;
      readonly context?: Record<string, any>;
    }> {}

    export class DockerConnectionError extends Data.TaggedError("DockerConnectionError")<{
      readonly message: string;
      readonly cause?: unknown;
    }> {}

    export class DockerOperationError extends Data.TaggedError("DockerOperationError")<{
      readonly message: string;
      readonly operation: string;
      readonly cause?: unknown;
      readonly containerId?: string;
      readonly imageName?: string;
    }> {}
    ```

**III. Define `DockerUtilsService` Interface and Data Types:**

*   **File:** `src/services/docker/DockerUtilsService.ts`
*   **Instructions:**
    *   Import necessary types from `dockerode` and your custom errors.
    *   Define the `DockerUtilsService` interface with methods for listing containers, pulling images, creating, starting, stopping, and removing containers.
    *   Create and export the `Context.Tag` for `DockerUtilsService`.

    ```typescript
    // src/services/docker/DockerUtilsService.ts
    import { Context, Effect } from "effect";
    import type Dockerode from 'dockerode';
    import { DockerError, DockerOperationError } from "./errors";

    export interface DockerUtilsService {
      readonly listContainers: (options?: Dockerode.ContainerListOptions) => Effect.Effect<Dockerode.ContainerInfo[], DockerError>;
      readonly pullImage: (imageName: string, onProgress?: (event: any) => void) => Effect.Effect<void, DockerOperationError>;
      readonly createContainer: (options: Dockerode.ContainerCreateOptions) => Effect.Effect<string, DockerOperationError>; // Returns container ID
      readonly startContainer: (containerId: string) => Effect.Effect<void, DockerOperationError>;
      readonly stopContainer: (containerId: string, options?: Dockerode.ContainerStopOptions) => Effect.Effect<void, DockerOperationError>;
      readonly removeContainer: (containerId: string, options?: Dockerode.ContainerRemoveOptions) => Effect.Effect<void, DockerOperationError>;
    }

    export const DockerUtilsService = Context.GenericTag<DockerUtilsService>("DockerUtilsService");
    ```

**IV. Implement Unit Tests for `DockerUtilsService`:**

*   **File:** `src/services/docker/DockerUtilsService.test.ts` (Create this new file)
*   **Instructions:**
    *   Use `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`).
    *   Mock the `dockerode` library.
    *   For each method in `DockerUtilsService`:
        *   Test successful execution, ensuring the mock was called correctly and the Effect succeeds.
        *   Test error handling, ensuring the Effect fails with the appropriate custom `DockerError` type.
    *   The `DockerUtilsServiceLive` layer depends on `ConfigurationService`. Provide `DefaultDevConfigLayer` for tests.

    ```typescript
    // src/services/docker/DockerUtilsService.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect, Exit, Layer } from 'effect';
    import Dockerode from 'dockerode';
    import { DockerUtilsService } from './DockerUtilsService';
    import { DockerUtilsServiceLive } from './DockerUtilsServiceImpl';
    import { DockerError, DockerOperationError, DockerConnectionError } from './errors';
    import { ConfigurationService, DefaultDevConfigLayer } from '@/services/configuration';

    const mockListContainers = vi.fn();
    const mockPull = vi.fn();
    const mockModemFollowProgress = vi.fn();
    const mockCreateContainer = vi.fn();
    const mockGetContainer = vi.fn();
    const mockContainerStart = vi.fn();
    const mockContainerStop = vi.fn();
    const mockContainerRemove = vi.fn();
    const mockPing = vi.fn();

    vi.mock('dockerode', () => ({
      default: vi.fn().mockImplementation(() => ({
        listContainers: mockListContainers,
        pull: mockPull,
        modem: {
          followProgress: mockModemFollowProgress,
        },
        createContainer: mockCreateContainer,
        getContainer: mockGetContainer,
        ping: mockPing,
      })),
    }));

    const testLayer = DockerUtilsServiceLive.pipe(
      Layer.provide(DefaultDevConfigLayer)
    );

    describe('DockerUtilsService', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementations for success
        mockPing.mockResolvedValue("OK");
      });

      describe('listContainers', () => {
        it('should list containers successfully', async () => {
          const mockContainerList = [{ Id: '123', Names: ['/test'] }] as Dockerode.ContainerInfo[];
          mockListContainers.mockResolvedValue(mockContainerList);

          const program = Effect.flatMap(DockerUtilsService, (service) => service.listContainers());
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          if (Exit.isSuccess(result)) {
            expect(result.value).toEqual(mockContainerList);
          }
          expect(mockListContainers).toHaveBeenCalled();
        });

        it('should return DockerError on failure', async () => {
          mockListContainers.mockRejectedValue(new Error('Docker daemon error'));

          const program = Effect.flatMap(DockerUtilsService, (service) => service.listContainers());
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerError;
            expect(error._tag).toBe('DockerError');
            expect(error.message).toContain('Failed to list containers');
          }
        });
      });

      describe('pullImage', () => {
        it('should pull an image successfully', async () => {
          mockPull.mockImplementation((_imageName, _options, callback) => {
            const mockStream = {
              on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis()
            };
            mockModemFollowProgress.mockImplementation((stream, onFinished) => {
                onFinished(null, [{ status: 'Downloaded' }]);
            });
            if (typeof callback === 'function') callback(null, mockStream);
            return mockStream;
          });

          const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          expect(mockPull).toHaveBeenCalledWith('test-image:latest', {}, expect.any(Function));
          expect(mockModemFollowProgress).toHaveBeenCalled();
        });

        it('should return DockerOperationError on pull failure reported by followProgress', async () => {
          mockPull.mockImplementation((_imageName, _options, callback) => {
            const mockStream = { on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis() };
            mockModemFollowProgress.mockImplementation((stream, onFinished) => {
                onFinished(new Error('Network error during pull'), null);
            });
            if (typeof callback === 'function') callback(null, mockStream);
            return mockStream;
          });

          const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Failed to pull image test-image:latest');
            expect(error.operation).toBe('pullImage');
            expect(error.imageName).toBe('test-image:latest');
          }
        });

        it('should return DockerOperationError if pull stream itself errors', async () => {
          mockPull.mockImplementation((_imageName, _options, callback) => {
            if (typeof callback === 'function') {
              callback(new Error('Stream creation failed'), undefined);
            } else {
              // If Dockerode version returns Promise that might reject for stream
              return Promise.reject(new Error('Stream creation failed'));
            }
            return undefined; // Or mock stream that emits error
          });

          const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Docker pull stream error for test-image:latest');
          }
        });

        it('should return DockerOperationError if pull stream is not provided by Dockerode', async () => {
            mockPull.mockImplementation((_imageName, _options, callback) => {
              if (typeof callback === 'function') {
                callback(null, undefined); // Simulate no stream
              }
              return undefined;
            });

            const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result)) {
              const error = result.cause.error as DockerOperationError;
              expect(error._tag).toBe('DockerOperationError');
              expect(error.message).toContain('No stream returned for pull test-image:latest');
            }
        });

        it('should return DockerOperationError if followProgress output indicates error', async () => {
            mockPull.mockImplementation((_imageName, _options, callback) => {
              const mockStream = { on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis() };
              mockModemFollowProgress.mockImplementation((stream, onFinished) => {
                  onFinished(null, [{ error: 'Image not found', errorDetail: { message: 'Image not found in repository' } }]);
              });
              if (typeof callback === 'function') callback(null, mockStream);
              return mockStream;
            });

            const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
            const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

            expect(Exit.isFailure(result)).toBe(true);
            if (Exit.isFailure(result)) {
              const error = result.cause.error as DockerOperationError;
              expect(error._tag).toBe('DockerOperationError');
              expect(error.message).toContain('Failed to pull image test-image:latest: Image not found');
            }
          });
      });

      describe('createContainer', () => {
        const containerOptions: Dockerode.ContainerCreateOptions = { Image: 'test-image' };
        it('should create a container successfully and return its ID', async () => {
          const mockContainerInspect = { id: 'container-id-123' };
          const mockContainerObj = { id: 'container-id-123', inspect: vi.fn().mockResolvedValue(mockContainerInspect) };
          mockCreateContainer.mockResolvedValue(mockContainerObj);

          const program = Effect.flatMap(DockerUtilsService, (service) => service.createContainer(containerOptions));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          if (Exit.isSuccess(result)) {
            expect(result.value).toBe('container-id-123');
          }
          expect(mockCreateContainer).toHaveBeenCalledWith(containerOptions);
        });

        it('should return DockerOperationError on createContainer failure', async () => {
          mockCreateContainer.mockRejectedValue(new Error('Create container failed'));

          const program = Effect.flatMap(DockerUtilsService, (service) => service.createContainer(containerOptions));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Failed to create container');
            expect(error.operation).toBe('createContainer');
          }
        });
      });

      describe('startContainer', () => {
        const containerId = 'container-id-123';

        beforeEach(() => {
            mockGetContainer.mockReturnValue({ start: mockContainerStart });
        });

        it('should start a container successfully', async () => {
          mockContainerStart.mockResolvedValue(undefined);

          const program = Effect.flatMap(DockerUtilsService, (service) => service.startContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          expect(mockGetContainer).toHaveBeenCalledWith(containerId);
          expect(mockContainerStart).toHaveBeenCalled();
        });

        it('should return DockerOperationError on startContainer failure', async () => {
          mockContainerStart.mockRejectedValue(new Error('Start container failed'));

          const program = Effect.flatMap(DockerUtilsService, (service) => service.startContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Failed to start container');
            expect(error.containerId).toBe(containerId);
            expect(error.operation).toBe('startContainer');
          }
        });
      });

      describe('stopContainer', () => {
        const containerId = 'container-id-123';

        beforeEach(() => {
            mockGetContainer.mockReturnValue({ stop: mockContainerStop });
        });

        it('should stop a container successfully', async () => {
          mockContainerStop.mockResolvedValue(undefined);

          const program = Effect.flatMap(DockerUtilsService, (service) => service.stopContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          expect(mockGetContainer).toHaveBeenCalledWith(containerId);
          expect(mockContainerStop).toHaveBeenCalled();
        });

        it('should return DockerOperationError on stopContainer failure', async () => {
          mockContainerStop.mockRejectedValue(new Error('Stop container failed'));

          const program = Effect.flatMap(DockerUtilsService, (service) => service.stopContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
           if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Failed to stop container');
            expect(error.containerId).toBe(containerId);
            expect(error.operation).toBe('stopContainer');
          }
        });
      });

      describe('removeContainer', () => {
        const containerId = 'container-id-123';

        beforeEach(() => {
            mockGetContainer.mockReturnValue({ remove: mockContainerRemove });
        });

        it('should remove a container successfully', async () => {
          mockContainerRemove.mockResolvedValue(undefined);

          const program = Effect.flatMap(DockerUtilsService, (service) => service.removeContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          expect(mockGetContainer).toHaveBeenCalledWith(containerId);
          expect(mockContainerRemove).toHaveBeenCalled();
        });

        it('should return DockerOperationError on removeContainer failure', async () => {
          mockContainerRemove.mockRejectedValue(new Error('Remove container failed'));

          const program = Effect.flatMap(DockerUtilsService, (service) => service.removeContainer(containerId));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const error = result.cause.error as DockerOperationError;
            expect(error._tag).toBe('DockerOperationError');
            expect(error.message).toContain('Failed to remove container');
            expect(error.containerId).toBe(containerId);
            expect(error.operation).toBe('removeContainer');
          }
        });
      });
    });
    ```

**V. Implement `DockerUtilsServiceLive`:**

*   **File:** `src/services/docker/DockerUtilsServiceImpl.ts`
*   **Instructions:**
    *   Implement the `DockerUtilsServiceLive` Layer.
    *   Instantiate `Dockerode`. Perform an initial `docker.ping()` to check connectivity, failing with `DockerConnectionError` if it fails.
    *   Implement each service method using `Effect.tryPromise` or `Effect.async` for `pullImage`, wrapping `dockerode` calls.
    *   Map errors to your custom `DockerError` types, including context like `operation`, `containerId`, `imageName`.

    ```typescript
    // src/services/docker/DockerUtilsServiceImpl.ts
    import { Effect, Layer } from "effect";
    import Dockerode from 'dockerode';
    import { DockerUtilsService } from "./DockerUtilsService";
    import { DockerError, DockerConnectionError, DockerOperationError } from "./errors";

    export const DockerUtilsServiceLive = Layer.effect(
      DockerUtilsService,
      Effect.gen(function* (_) {
        const docker = new Dockerode(); // Uses default local Docker socket connection

        // Test connection on service creation
        yield* _(Effect.tryPromise({
          try: () => docker.ping(),
          catch: (cause) => new DockerConnectionError({ message: "Failed to ping Docker daemon. Is Docker running and accessible?", cause })
        }));

        return DockerUtilsService.of({
          listContainers: (options?: Dockerode.ContainerListOptions) =>
            Effect.tryPromise({
              try: () => docker.listContainers(options),
              catch: (cause) => new DockerError({ message: "Failed to list containers", cause }),
            }),

          pullImage: (imageName: string, onProgress?: (event: any) => void) =>
            Effect.async<void, DockerOperationError>((resume) => {
              docker.pull(imageName, {}, (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
                if (err) {
                  resume(Effect.fail(new DockerOperationError({ message: `Docker pull stream error for ${imageName}`, operation: "pullImage", imageName, cause: err })));
                  return;
                }
                if (!stream) {
                  resume(Effect.fail(new DockerOperationError({ message: `No stream returned for pull ${imageName}`, operation: "pullImage", imageName })));
                  return;
                }

                docker.modem.followProgress(stream, (errFollow, output) => {
                  if (errFollow) {
                    resume(Effect.fail(new DockerOperationError({ message: `Failed to pull image ${imageName}`, operation: "pullImage", imageName, cause: errFollow })));
                  } else {
                    const lastOp = output && output.length > 0 ? output[output.length -1] : null;
                    if(lastOp && lastOp.errorDetail) {
                         resume(Effect.fail(new DockerOperationError({ message: `Failed to pull image ${imageName}: ${lastOp.errorDetail.message}`, operation: "pullImage", imageName, cause: lastOp.errorDetail })));
                    } else if (lastOp && lastOp.error) {
                        resume(Effect.fail(new DockerOperationError({ message: `Failed to pull image ${imageName}: ${lastOp.error}`, operation: "pullImage", imageName, cause: lastOp.error })));
                    }
                    else {
                        resume(Effect.succeed(undefined));
                    }
                  }
                }, onProgress);
              });
            }),

          createContainer: (options: Dockerode.ContainerCreateOptions) =>
            Effect.tryPromise({
              try: async () => {
                const container = await docker.createContainer(options);
                return container.id;
              },
              catch: (cause) => new DockerOperationError({ message: "Failed to create container", operation: "createContainer", cause }),
            }),

          startContainer: (containerId: string) =>
            Effect.tryPromise({
              try: () => docker.getContainer(containerId).start(),
              catch: (cause) => new DockerOperationError({ message: `Failed to start container ${containerId}`, operation: "startContainer", containerId, cause }),
            }).pipe(Effect.asVoid),

          stopContainer: (containerId: string, options?: Dockerode.ContainerStopOptions) =>
            Effect.tryPromise({
              try: () => docker.getContainer(containerId).stop(options),
              catch: (cause) => new DockerOperationError({ message: `Failed to stop container ${containerId}`, operation: "stopContainer", containerId, cause }),
            }).pipe(Effect.asVoid),

          removeContainer: (containerId: string, options?: Dockerode.ContainerRemoveOptions) =>
            Effect.tryPromise({
              try: () => docker.getContainer(containerId).remove(options),
              catch: (cause) => new DockerOperationError({ message: `Failed to remove container ${containerId}`, operation: "removeContainer", containerId, cause }),
            }).pipe(Effect.asVoid),
        });
      })
    );
    ```

**VI. Update Barrel Files:**

*   **File:** `src/services/docker/index.ts`
    ```typescript
    // src/services/docker/index.ts
    export * from "./DockerUtilsService";
    export * from "./DockerUtilsServiceImpl";
    export * from "./errors";
    ```
*   **File:** `src/services/index.ts`
    *   Add: `export * as DockerUtils from "./docker";`
    *   Also add (for future phases): `export * from "./swe_bench_harness";` (if not already present from other tasks)

**VII. Update Configuration Service for Docker Image:**

*   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
*   **Instructions:**
    *   In `DefaultDevConfigLayer`, add the configuration for `SWE_BENCH_DOCKER_IMAGE_NAME`.
        ```typescript
        // Inside DefaultDevConfigLayer's Effect.gen block, after existing configService.set calls:
        yield* _(configService.set("SWE_BENCH_DOCKER_IMAGE_NAME", "swebench/swe-eval:latest"));
        ```

**VIII. README Update:**

*   **File:** `README.md`
*   **Instructions:**
    *   Locate the existing section: `## SWE-Bench Harness Prerequisites (Optional)`
    *   Ensure it matches the following (update if necessary):
        ```markdown
        ## SWE-Bench Harness Prerequisites (Optional)

        If you plan to use or develop the SWE-Bench evaluation harness:

        1.  **Ensure Docker is installed and running:**
            Docker Desktop (for Mac/Windows) or Docker Engine (for Linux) must be installed and the Docker daemon must be running.

        2.  **Pull the SWE-Bench evaluation image:**
            Open your terminal and run the following command to download the necessary Docker image:
            ```bash
            docker pull swebench/swe-eval:latest
            ```
            This image is required for running SWE-Bench task evaluations in an isolated environment.
        ```

**IX. Live Integration Testing (Manual Script):**

*   **File:** `src/services/docker/test-docker-integration.ts` (Create this new file)
*   **Instructions:** Create a script to test the `DockerUtilsService` against a live Docker daemon. This script can be run manually by developers.

    ```typescript
    #!/usr/bin/env tsx
    /**
     * Docker Integration Test Script
     *
     * Run with: pnpm tsx src/services/docker/test-docker-integration.ts
     * (Ensure tsx is installed: pnpm add -D tsx)
     * Or compile and run with node.
     *
     * Prerequisites:
     * - Docker must be installed and running
     * - The test image (hello-world) will be pulled if not present
     */

    import { Effect, Exit, Layer, Console } from "effect";
    import { DockerUtilsService } from "./DockerUtilsService";
    import { DockerUtilsServiceLive } from "./DockerUtilsServiceImpl";
    import { ConfigurationService } from "@/services/configuration"; // Minimal config for test

    // Create a minimal config layer for testing
    // DockerUtilsServiceLive does not strictly depend on ConfigurationService for default Docker connection
    const TestConfigLayer = Layer.succeed(
      ConfigurationService,
      ConfigurationService.of({
        get: () => Effect.fail({ _tag: "ConfigError" as const, message: "Not needed for this test" }),
        getSecret: () => Effect.fail({ _tag: "SecretNotFoundError" as const, message: "Not needed", keyName: "" }),
        set: () => Effect.succeed(undefined),
        delete: () => Effect.succeed(undefined),
      })
    );

    const testProgram = Effect.gen(function* (_) {
      const docker = yield* _(DockerUtilsService);

      yield* _(Console.log("🐳 Docker Integration Test Starting..."));

      yield* _(Console.log("\n📋 Test 1: Listing containers..."));
      const containers = yield* _(docker.listContainers({ all: true }));
      yield* _(Console.log(`Found ${containers.length} containers (showing max 3):`));
      containers.slice(0, 3).forEach(c => {
        console.log(`  - ${c.Names?.[0] || 'unnamed'} (${c.Id.substring(0, 12)}) - ${c.State}`);
      });

      const testImage = "hello-world:latest";
      yield* _(Console.log(`\n📥 Test 2: Pulling image ${testImage}...`));

      let pullProgressEvents = 0;
      yield* _(docker.pullImage(testImage, (event) => {
        if (event.status) {
          process.stdout.write(`\r  ${event.status} ${event.progress || ''}`);
          pullProgressEvents++;
        }
      }));
      process.stdout.write('\n'); // Newline after progress
      yield* _(Console.log(`  ✓ Image pulled successfully (${pullProgressEvents} progress events)`));

      yield* _(Console.log("\n📦 Test 3: Creating container..."));
      const containerName = `test-container-${Date.now()}`;
      const containerId = yield* _(docker.createContainer({
        Image: testImage,
        name: containerName,
        HostConfig: {
          AutoRemove: false,
        }
      }));
      yield* _(Console.log(`  ✓ Container created: ${containerName} (${containerId.substring(0, 12)})`));

      yield* _(Console.log("\n▶️  Test 4: Starting container..."));
      yield* _(docker.startContainer(containerId));
      yield* _(Console.log("  ✓ Container started"));

      yield* _(Console.log("  ⏳ Waiting for hello-world container to exit..."));
      yield* _(Effect.sleep("2 seconds"));

      yield* _(Console.log("\n⏹️  Test 5: Stopping container (if not already stopped)..."));
      yield* _(
        docker.stopContainer(containerId, { t: 5 }) // 5 sec timeout
          .pipe(
            Effect.tap(() => Console.log("  ✓ Container stopped or was already stopped.")),
            Effect.catchTag("DockerOperationError", (e) => {
              if (e.message.includes("is already stopped")) {
                return Console.log("  ℹ️  Container already stopped as expected.");
              }
              return Effect.fail(e);
            })
          )
      );

      yield* _(Console.log("\n🗑️  Test 6: Removing container..."));
      yield* _(docker.removeContainer(containerId, { force: true })); // force remove
      yield* _(Console.log("  ✓ Container removed"));

      yield* _(Console.log("\n✅ Docker Integration Test Passed!"));
    });

    const main = async () => {
      const layer = DockerUtilsServiceLive.pipe(Layer.provide(TestConfigLayer));
      const result = await Effect.runPromiseExit(testProgram.pipe(Effect.provide(layer)));

      if (Exit.isFailure(result)) {
        console.error("\n❌ Docker Integration Test Failed!");
        console.error("Error details:", result.cause);

        if (result.cause._tag === "Fail") {
          const error = result.cause.error as any;
          console.error("\nError message:", error.message);
          if (error.cause) console.error("Underlying cause:", error.cause);
        }

        console.error("\nTroubleshooting:");
        console.error("1. Is Docker installed and running? Run `docker ps`.");
        console.error("2. Docker Desktop (Mac/Win) or Docker Engine (Linux) must be active.");

        process.exit(1);
      } else {
        console.log("\n🎉 All integration tests completed successfully!");
        process.exit(0);
      }
    };

    main().catch(console.error);

    // To run:
    // 1. Save as src/services/docker/test-docker-integration.ts
    // 2. Ensure you have tsx: `pnpm add -D tsx`
    // 3. Run from project root: `pnpm tsx src/services/docker/test-docker-integration.ts`
    ```

*   **File:** `scripts/test-docker.js` (Create this new file)
*   **Instructions:** Add a Node.js script to easily run the integration test.
    ```javascript
    // scripts/test-docker.js
    const { exec } = require('child_process');
    const path = require('path');

    console.log("Starting Docker integration test runner...");

    // Check if Docker is running
    exec('docker ps', (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Docker daemon is not running or not accessible.");
        console.error("Please start Docker and try again.");
        if (stderr) console.error("Stderr:", stderr);
        process.exit(1);
      }

      console.log("✅ Docker daemon is running.");
      console.log("🚀 Running DockerUtilsService integration tests...\n");

      const testScriptPath = path.join(__dirname, '../src/services/docker/test-docker-integration.ts');

      // Determine if tsx is available locally or globally
      let tsxCmd = 'tsx';
      try {
        require.resolve('tsx'); // Check if tsx is in node_modules
        tsxCmd = `node --loader tsx --no-warnings ${testScriptPath}`; // More robust way to call local tsx
      } catch (e) {
        console.warn("tsx not found locally, trying global tsx. For best results, install with `pnpm add -D tsx`");
        tsxCmd = `tsx ${testScriptPath}`;
      }


      const testProcess = exec(tsxCmd, { cwd: path.join(__dirname, '..') });

      testProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      testProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      testProcess.on('close', (code) => {
        console.log(`\nIntegration test process exited with code ${code}`);
        process.exit(code);
      });

      testProcess.on('error', (err) => {
        console.error("Failed to start integration test script:", err);
        process.exit(1);
      });
    });
    ```

*   **File:** `package.json`
*   **Instructions:** Add a script to `scripts` to run the integration test:
    ```json
        "test:docker": "node scripts/test-docker.js",
    ```
    (Ensure `tsx` is installed as a dev dependency: `pnpm add -D tsx`)

*   **File:** `src/services/docker/README.md` (Create this new file)
*   **Instructions:** Add basic documentation for the Docker service and its testing.
    ```markdown
    # Docker Utilities Service

    This service provides an Effect-TS based interface for interacting with the Docker daemon, abstracting operations like container and image management using `dockerode`.

    ## Features

    - Container lifecycle management (create, start, stop, remove)
    - Docker image pulling with progress tracking
    - Container listing
    - Robust error handling integrated with Effect-TS.

    ## Testing

    ### Unit Tests (Mocked)

    Unit tests for this service use mocked implementations of `dockerode` and do not require a running Docker daemon.

    Run unit tests with:
    ```bash
    pnpm vitest run src/services/docker/DockerUtilsService.test.ts
    ```

    ### Integration Tests (Requires Live Docker)

    To test the service against a live Docker daemon:

    1.  **Ensure Docker is running** on your system.
    2.  Run the integration test script:
        ```bash
        pnpm test:docker
        ```
        This script will:
        - Check if Docker is installed and the daemon is running.
        - Execute `src/services/docker/test-docker-integration.ts` using `tsx`.
        - The test script performs operations like pulling `hello-world`, creating, starting, stopping, and removing a container.

    #### Troubleshooting Integration Tests:

    -   If tests fail, ensure your Docker daemon is active and responsive (`docker ps` should work).
    -   On Linux, you might need to add your user to the `docker` group or run Docker commands with `sudo`.
    -   Check the output of the `pnpm test:docker` command for specific error messages.
    ```

---
This concludes Phase 2 (originally Phase 1.0 of the DockerUtilsService Foundation). The service should now be functional and well-tested, ready for integration into the higher-level SWE-Bench harness services.
