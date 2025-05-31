Okay, Coding Agent, this is the plan for the **very first phase** of implementing our SWE-Bench Harness using Dockerode and Effect-TS. Your primary goal is to set up the foundational Docker utilities, including their interfaces, error types, live implementations, and unit tests.

**Phase 1.0: DockerUtilsService Foundation**

**I. Project Setup & Dependencies:**

1.  **Install Dockerode:**
    *   Add `dockerode` and its type definitions to `devDependencies` in `package.json`.
        ```bash
        pnpm add -D dockerode @types/dockerode
        ```
    *   Run `pnpm install`.

2.  **Create Initial Directory Structure:**
    *   Create the following directories and empty files:
        ```
        src/
        └── services/
            ├── docker/
            │   ├── DockerUtilsService.ts       # Interface, Tag, and data types
            │   ├── DockerUtilsServiceImpl.ts   # Live implementation
            │   ├── errors.ts                   # Custom Docker errors
            │   └── index.ts                    # Barrel file for docker/*
            ├── swe_bench_harness/
            │   ├── errors.ts                   # Empty for now
            │   └── types.ts                    # Empty for now
            └── index.ts                        # Ensure docker is exported from here
        ```

**II. Define Docker Error Types:**

*   **File:** `src/services/docker/errors.ts`
*   **Instructions:**
    *   Define custom tagged errors for Docker operations using `Effect/Data`.
    *   Create a base `DockerError` and specific errors: `DockerConnectionError` (for issues connecting to Docker daemon) and `DockerOperationError` (for errors during Docker commands like pull, create, start, etc.).

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
    *   Define input/output types for the service methods.
    *   Define the `DockerUtilsService` interface with the following methods for this phase:
        *   `listContainers(options?: Dockerode.ContainerListOptions): Effect.Effect<Dockerode.ContainerInfo[], DockerError>`
        *   `pullImage(imageName: string, onProgress?: (event: any) => void): Effect.Effect<void, DockerOperationError>`
        *   `createContainer(options: Dockerode.ContainerCreateOptions): Effect.Effect<string, DockerOperationError>` (Returns container ID)
        *   `startContainer(containerId: string): Effect.Effect<void, DockerOperationError>`
        *   `stopContainer(containerId: string, options?: Dockerode.ContainerStopOptions): Effect.Effect<void, DockerOperationError>`
        *   `removeContainer(containerId: string, options?: Dockerode.ContainerRemoveOptions): Effect.Effect<void, DockerOperationError>`
    *   Create and export the `Context.Tag` for `DockerUtilsService`.

    ```typescript
    // src/services/docker/DockerUtilsService.ts
    import { Context, Effect } from "effect";
    import type Dockerode from 'dockerode'; // Use 'import type' for type-only imports
    import { DockerError, DockerOperationError } from "./errors";

    // Define some specific input/output types if needed, or use Dockerode's directly
    // For now, we'll use Dockerode's types directly in the interface for simplicity

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

*   **File:** `src/services/docker/DockerUtilsService.test.ts` (Create this file)
*   **Instructions:**
    *   Use `vitest` (`describe`, `it`, `expect`, `vi`).
    *   Mock the `dockerode` library: `vi.mock('dockerode', () => { ... });`.
    *   For each method in `DockerUtilsService`:
        *   Test successful execution:
            *   Mock the corresponding `dockerode` method to resolve successfully (or simulate stream completion for `pullImage`).
            *   Run the Effect using `Effect.runPromiseExit`.
            *   Assert that the Effect succeeds and returns the expected value.
            *   Assert that the `dockerode` mock was called with correct arguments.
        *   Test error handling:
            *   Mock the `dockerode` method to reject or simulate an error.
            *   Run the Effect.
            *   Assert that the Effect fails with the appropriate custom `DockerError` (e.g., `DockerOperationError`).

    **Example Test Structure (for `listContainers`):**
    ```typescript
    // src/services/docker/DockerUtilsService.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect, Exit, Layer } from 'effect';
    import Dockerode from 'dockerode'; // Import default export for mocking
    import { DockerUtilsService } from './DockerUtilsService';
    import { DockerUtilsServiceLive } from './DockerUtilsServiceImpl';
    import { DockerError, DockerOperationError } from './errors';
    import { ConfigurationService, DefaultDevConfigLayer } from '@/services/configuration'; // For dependencies

    // Mock Dockerode constructor and methods
    const mockListContainers = vi.fn();
    const mockPull = vi.fn();
    const mockModemFollowProgress = vi.fn();
    const mockCreateContainer = vi.fn();
    const mockGetContainer = vi.fn();
    const mockContainerStart = vi.fn();
    const mockContainerStop = vi.fn();
    const mockContainerRemove = vi.fn();

    vi.mock('dockerode', () => {
      // console.log('Dockerode mock is being used'); // Debugging mock usage
      return {
        default: vi.fn().mockImplementation(() => ({
          listContainers: mockListContainers,
          pull: mockPull,
          modem: {
            followProgress: mockModemFollowProgress,
          },
          createContainer: mockCreateContainer,
          getContainer: mockGetContainer,
        })),
      };
    });

    // Test Layer (can be refined)
    const testLayer = DockerUtilsServiceLive.pipe(
      Layer.provide(DefaultDevConfigLayer) // DockerUtilsServiceImpl depends on ConfigurationService
    );

    describe('DockerUtilsService', () => {
      beforeEach(() => {
        vi.clearAllMocks();
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
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerError;
                expect(error._tag).toBe('DockerError'); // Changed from DockerOperationError to generic DockerError for list
                expect(error.message).toContain('Failed to list containers');
            }
          }
        });
      });

      describe('pullImage', () => {
        it('should pull an image successfully', async () => {
          mockPull.mockImplementation((_imageName, _options, callback) => {
            // Simulate a stream for Dockerode v2/v3, or direct callback for older
            const mockStream = {
              on: (event, handler) => {
                if (event === 'end') handler(); // Simulate end for modem.followProgress if it expects it
                return mockStream;
              },
              pipe: () => mockStream // Mock pipe if modem.followProgress uses it
            };
             // Simulate modem.followProgress behavior
            mockModemFollowProgress.mockImplementation((stream, onFinished) => {
                onFinished(null, [{ status: 'Downloaded' }]);
            });
            // For older Dockerode that might take a direct callback with stream
            if (typeof callback === 'function') {
                callback(null, mockStream);
            }
            return mockStream; // For newer Dockerode returning stream directly
          });

          const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isSuccess(result)).toBe(true);
          expect(mockPull).toHaveBeenCalledWith('test-image:latest', {}, expect.any(Function)); // Check if callback is passed
          expect(mockModemFollowProgress).toHaveBeenCalled();
        });

        it('should return DockerOperationError on pull failure', async () => {
          mockPull.mockImplementation((_imageName, _options, callback) => {
            const mockStream = {
                on: (event, handler) => { return mockStream; },
                pipe: () => mockStream
            };
            mockModemFollowProgress.mockImplementation((stream, onFinished) => {
                onFinished(new Error('Pull failed'), null);
            });
             if (typeof callback === 'function') {
                callback(null, mockStream);
            }
            return mockStream;
          });

          const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
          const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

          expect(Exit.isFailure(result)).toBe(true);
          if (Exit.isFailure(result)) {
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerOperationError;
                expect(error._tag).toBe('DockerOperationError');
                expect(error.message).toContain('Failed to pull image');
                expect(error.imageName).toBe('test-image:latest');
            }
          }
        });
      });

      describe('createContainer', () => {
        const containerOptions: Dockerode.ContainerCreateOptions = { Image: 'test-image' };
        it('should create a container successfully and return its ID', async () => {
          const mockContainer = { id: 'container-id-123' };
          mockCreateContainer.mockResolvedValue(mockContainer);

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
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerOperationError;
                expect(error._tag).toBe('DockerOperationError');
                expect(error.message).toContain('Failed to create container');
            }
          }
        });
      });

      describe('startContainer', () => {
        const containerId = 'container-id-123';
        mockGetContainer.mockReturnValue({ start: mockContainerStart });

        it('should start a container successfully', async () => {
          mockContainerStart.mockResolvedValue(undefined); // start resolves with no data

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
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerOperationError;
                expect(error._tag).toBe('DockerOperationError');
                expect(error.message).toContain('Failed to start container');
                expect(error.containerId).toBe(containerId);
            }
          }
        });
      });

      describe('stopContainer', () => {
        const containerId = 'container-id-123';
        mockGetContainer.mockReturnValue({ stop: mockContainerStop });

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
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerOperationError;
                expect(error._tag).toBe('DockerOperationError');
                expect(error.message).toContain('Failed to stop container');
                expect(error.containerId).toBe(containerId);
            }
          }
        });
      });

      describe('removeContainer', () => {
        const containerId = 'container-id-123';
        mockGetContainer.mockReturnValue({ remove: mockContainerRemove });

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
            const cause = result.cause;
            expect(cause._tag).toBe('Fail');
            if (cause._tag === 'Fail') {
                const error = cause.error as DockerOperationError;
                expect(error._tag).toBe('DockerOperationError');
                expect(error.message).toContain('Failed to remove container');
                expect(error.containerId).toBe(containerId);
            }
          }
        });
      });
    });
    ```

**V. Implement `DockerUtilsServiceLive`:**

*   **File:** `src/services/docker/DockerUtilsServiceImpl.ts`
*   **Instructions:**
    *   Import `Effect`, `Layer`, `Context`, `Dockerode`.
    *   Import `DockerUtilsService` Tag and your custom error types.
    *   Implement the `DockerUtilsServiceLive` Layer.
    *   Inside the Effect constructor for the Layer:
        *   Instantiate `Dockerode`. You can use default options: `new Dockerode()`. Add connection error handling using `docker.ping()` if needed, mapping to `DockerConnectionError`.
        *   Implement each method from the `DockerUtilsService` interface:
            *   `listContainers`: Use `Effect.tryPromise(() => docker.listContainers(options))`. Map errors to `DockerError`.
            *   `pullImage`: This is more complex due to Dockerode's stream handling. Use `Effect.async<void, DockerOperationError>((resume) => { ... })`.
                *   Inside the async callback, call `docker.pull(imageName, {})`. Dockerode's `pull` method itself takes a callback that receives the stream.
                *   Once you have the stream, use `docker.modem.followProgress(stream, onFinished, onProgressCallback)`.
                *   `onFinished(err, output)`: if `err`, `resume(Effect.fail(new DockerOperationError(...)))`; else `resume(Effect.succeed(undefined))`.
                *   The `onProgress` callback from `pullImage` params can be passed to `followProgress` if provided.
            *   `createContainer`: Use `Effect.tryPromise(() => docker.createContainer(options))`. Map errors. Extract and return `container.id`.
            *   `startContainer`: `Effect.tryPromise(() => docker.getContainer(containerId).start())`. Map errors.
            *   `stopContainer`: `Effect.tryPromise(() => docker.getContainer(containerId).stop(options))`. Map errors.
            *   `removeContainer`: `Effect.tryPromise(() => docker.getContainer(containerId).remove(options))`. Map errors.
    *   Ensure all promise rejections are caught and mapped to your custom `DockerError` types, including context like `operation`, `containerId`, `imageName`.

    ```typescript
    // src/services/docker/DockerUtilsServiceImpl.ts
    import { Effect, Layer } from "effect";
    import Dockerode from 'dockerode';
    import { DockerUtilsService } from "./DockerUtilsService";
    import { DockerError, DockerConnectionError, DockerOperationError } from "./errors";
    import { ConfigurationService } from "@/services/configuration"; // Dockerode doesn't strictly need config for default socket path

    export const DockerUtilsServiceLive = Layer.effect(
      DockerUtilsService,
      Effect.gen(function* (_) {
        // const configService = yield* _(ConfigurationService);
        // Dockerode will use DOCKER_HOST, DOCKER_PORT, DOCKER_SOCKET_PATH env vars or defaults.
        // Add explicit config if needed:
        // const dockerHost = yield* _(Effect.promise(() => configService.get("DOCKER_HOST").catch(() => undefined)));
        // const dockerPort = yield* _(Effect.promise(() => configService.get("DOCKER_PORT").then(p => parseInt(p,10)).catch(() => undefined)));
        // const socketPath = yield* _(Effect.promise(() => configService.get("DOCKER_SOCKET_PATH").catch(() => undefined)));
        // const docker = new Dockerode({ host: dockerHost, port: dockerPort, socketPath });

        const docker = new Dockerode(); // Uses default local connection settings

        // Optional: Test connection on service creation
        yield* _(Effect.tryPromise({
          try: () => docker.ping(),
          catch: (cause) => new DockerConnectionError({ message: "Failed to ping Docker daemon", cause })
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
                    // Check output for errors, Docker often puts errors in the last JSON object of the stream
                    const lastOp = output && output.length > 0 ? output[output.length -1] : null;
                    if(lastOp && lastOp.error) {
                         resume(Effect.fail(new DockerOperationError({ message: `Failed to pull image ${imageName}: ${lastOp.errorDetail?.message || lastOp.error}`, operation: "pullImage", imageName, cause: lastOp.error })));
                    } else {
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
    export * from "./DockerUtilsService";
    export * from "./DockerUtilsServiceImpl";
    export * from "./errors";
    ```
*   **File:** `src/services/index.ts`
    *   Ensure `export * as DockerUtils from "./docker";` is added.

**VII. Update Configuration Service for Docker Image:**

*   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
*   **Instructions:**
    *   In `DefaultDevConfigLayer`, add the configuration for `SWE_BENCH_DOCKER_IMAGE_NAME`.
        ```typescript
        // Inside DefaultDevConfigLayer's Effect.gen block
        yield* _(configService.set("SWE_BENCH_DOCKER_IMAGE_NAME", "swebench/swe-eval:latest"));
        ```

**VIII. README Update (Manual Step for User):**

*   **File:** `README.md` (or a new `docs/swebench/prerequisites.md`)
*   **Instructions:** Add a section instructing the user to ensure Docker is installed and running, and to pre-pull the SWE-Bench image:
    ```markdown
    ## SWE-Bench Harness Prerequisites

    To use the SWE-Bench evaluation harness:
    1.  Ensure Docker Desktop (or Docker Engine) is installed and running on your system.
    2.  Pull the official SWE-Bench evaluation image:
        ```bash
        docker pull swebench/swe-eval:latest
        ```
    ```

This completes the first phase, establishing a testable and functional `DockerUtilsService` using Dockerode and Effect-TS. The next steps in the `swebench-plan.md` will build upon this foundation.Okay, Coding Agent, this is the plan for the **very first phase** of implementing our SWE-Bench Harness using Dockerode and Effect-TS. Your primary goal is to set up the foundational Docker utilities, including their interfaces, error types, live implementations, and unit tests.

**Phase 1.0: DockerUtilsService Foundation**

**I. Project Setup & Dependencies:**

1.  **Install Dockerode:**
    *   Add `dockerode` and its type definitions to `devDependencies` in `package.json`.
        ```bash
        pnpm add -D dockerode @types/dockerode
        ```
    *   Run `pnpm install`.

2.  **Create Initial Directory Structure:**
    *   Ensure the following directories and files exist. Create them if they don't:
        ```
        src/
        └── services/
            ├── docker/
            │   ├── DockerUtilsService.ts       # Will contain Interface, Tag, and data types
            │   ├── DockerUtilsServiceImpl.ts   # Will contain Live implementation
            │   ├── errors.ts                   # Will contain Custom Docker errors
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
    *   Create a base `DockerError` and specific errors: `DockerConnectionError` (for issues connecting to Docker daemon) and `DockerOperationError` (for errors during Docker commands like pull, create, start, etc.).

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
    *   Define the `DockerUtilsService` interface with the following methods for this phase:
        *   `listContainers(options?: Dockerode.ContainerListOptions): Effect.Effect<Dockerode.ContainerInfo[], DockerError>`
        *   `pullImage(imageName: string, onProgress?: (event: any) => void): Effect.Effect<void, DockerOperationError>`
        *   `createContainer(options: Dockerode.ContainerCreateOptions): Effect.Effect<string, DockerOperationError>` (Returns container ID)
        *   `startContainer(containerId: string): Effect.Effect<void, DockerOperationError>`
        *   `stopContainer(containerId: string, options?: Dockerode.ContainerStopOptions): Effect.Effect<void, DockerOperationError>`
        *   `removeContainer(containerId: string, options?: Dockerode.ContainerRemoveOptions): Effect.Effect<void, DockerOperationError>`
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

*   **File:** `src/services/docker/DockerUtilsService.test.ts` (Create this file)
*   **Instructions:**
    *   Use `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`).
    *   Mock the `dockerode` library: `vi.mock('dockerode', () => { ... });`.
    *   For each method in `DockerUtilsService`:
        *   Test successful execution.
        *   Test error handling, ensuring errors are mapped to your custom `DockerError` types.
        *   Verify `dockerode` methods are called with correct arguments.

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
          const mockContainerInspect = { id: 'container-id-123' }; // createContainer returns a Container obj, not just id.
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
    *   Import `Effect`, `Layer`, `Dockerode`.
    *   Import `DockerUtilsService` Tag and your custom error types.
    *   Implement the `DockerUtilsServiceLive` Layer.
    *   Inside the Effect constructor for the Layer:
        *   Instantiate `Dockerode`: `const docker = new Dockerode();`.
        *   Perform an initial `docker.ping()` to test connectivity. If it fails, fail the Layer with a `DockerConnectionError`.
        *   Implement each method from the `DockerUtilsService` interface, wrapping `dockerode` calls with `Effect.tryPromise` and mapping errors.

    ```typescript
    // src/services/docker/DockerUtilsServiceImpl.ts
    import { Effect, Layer } from "effect";
    import Dockerode from 'dockerode';
    import { DockerUtilsService } from "./DockerUtilsService";
    import { DockerError, DockerConnectionError, DockerOperationError } from "./errors";
    // ConfigurationService is not strictly needed if Dockerode uses environment variables or defaults
    // import { ConfigurationService } from "@/services/configuration";

    export const DockerUtilsServiceLive = Layer.effect(
      DockerUtilsService,
      Effect.gen(function* (_) {
        const docker = new Dockerode();

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
                    if(lastOp && lastOp.errorDetail) { // Docker errors are in errorDetail
                         resume(Effect.fail(new DockerOperationError({ message: `Failed to pull image ${imageName}: ${lastOp.errorDetail.message}`, operation: "pullImage", imageName, cause: lastOp.errorDetail })));
                    } else if (lastOp && lastOp.error) { // Fallback for other error shapes
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
    *   Ensure `export * as DockerUtils from "./docker";` is present or add it.
    *   Ensure `export * from "./swe_bench_harness";` is added (for future phases).

**VII. Update Configuration Service for Docker Image:**

*   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
*   **Instructions:**
    *   In `DefaultDevConfigLayer`, add the configuration for `SWE_BENCH_DOCKER_IMAGE_NAME`.
        ```typescript
        // Inside DefaultDevConfigLayer's Effect.gen block, after existing configService.set calls:
        yield* _(configService.set("SWE_BENCH_DOCKER_IMAGE_NAME", "swebench/swe-eval:latest"));
        ```

**VIII. README Update (Manual Step for User):**

*   **File:** `README.md` (or a new `docs/swebench/prerequisites.md` if you prefer to separate it).
*   **Instructions:** Add a section at the end of the "Running a dev build" section, or a new top-level section, instructing the user to ensure Docker is installed and running, and to pre-pull the SWE-Bench image:
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

This completes the first phase, establishing a testable and functional `DockerUtilsService` using Dockerode and Effect-TS. The next steps in the `swebench-plan.md` will build upon this foundation.
