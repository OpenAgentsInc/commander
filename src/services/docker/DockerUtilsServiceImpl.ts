import { Effect, Layer } from "effect";
import Dockerode from 'dockerode';
import tar from 'tar-fs';
import path from 'path';
import { PassThrough } from 'stream';
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

      copyToContainer: (containerId: string, srcPathOnHost: string, destPathInContainer: string) =>
        Effect.gen(function* () {
          const container = docker.getContainer(containerId);
          
          // Create a TAR stream from the source path
          const tarStream = tar.pack(path.dirname(srcPathOnHost), {
            entries: [path.basename(srcPathOnHost)]
          });

          // putArchive expects the parent directory path where contents will be extracted
          const destDir = path.dirname(destPathInContainer);
          
          yield* Effect.tryPromise({
            try: () => container.putArchive(tarStream, { path: destDir }),
            catch: (cause) => new DockerOperationError({ 
              message: `Failed to copy ${srcPathOnHost} to container ${containerId}:${destPathInContainer}`, 
              operation: "copyToContainer", 
              containerId, 
              cause 
            }),
          });
        }),

      copyFromContainer: (containerId: string, srcPathInContainer: string) =>
        Effect.tryPromise({
          try: async () => {
            const container = docker.getContainer(containerId);
            const result = await container.getArchive({ path: srcPathInContainer });
            // dockerode returns the stream directly
            return result as NodeJS.ReadableStream;
          },
          catch: (cause) => new DockerOperationError({ 
            message: `Failed to copy from container ${containerId}:${srcPathInContainer}`, 
            operation: "copyFromContainer", 
            containerId, 
            cause 
          }),
        }),

      execInContainer: (containerId: string, cmd: string[], options) =>
        Effect.gen(function* () {
          const container = docker.getContainer(containerId);
          
          const execInstance = yield* Effect.tryPromise({
            try: () => container.exec({
              Cmd: cmd,
              AttachStdout: true,
              AttachStderr: true,
              Tty: options?.Tty || false,
              WorkingDir: options?.WorkingDir,
              Env: options?.Env,
              User: options?.User,
            }),
            catch: (cause) => new DockerOperationError({
              message: `Failed to create exec instance in container ${containerId}`,
              operation: "execInContainer.create",
              containerId,
              cause
            }),
          });

          const result = yield* Effect.async<{ stdout: string; stderr: string; exitCode: number }, DockerOperationError>((resume) => {
            execInstance.start({ hijack: true, stdin: false }, (err, stream) => {
              if (err) {
                return resume(Effect.fail(new DockerOperationError({
                  message: "Failed to start exec",
                  operation: "execInContainer.start",
                  containerId,
                  cause: err
                })));
              }
              if (!stream) {
                return resume(Effect.fail(new DockerOperationError({
                  message: "No stream returned from exec start",
                  operation: "execInContainer.start",
                  containerId
                })));
              }

              let stdout = "";
              let stderr = "";

              const stdoutStream = new PassThrough();
              const stderrStream = new PassThrough();

              stdoutStream.on('data', chunk => { stdout += chunk.toString(); });
              stderrStream.on('data', chunk => { stderr += chunk.toString(); });

              docker.modem.demuxStream(stream, stdoutStream, stderrStream);

              stream.on('end', () => {
                execInstance.inspect()
                  .then(data => {
                    resume(Effect.succeed({ 
                      stdout, 
                      stderr, 
                      exitCode: data.ExitCode ?? -1 
                    }));
                  })
                  .catch(inspectErr => {
                    resume(Effect.fail(new DockerOperationError({
                      message: "Failed to inspect exec after completion",
                      operation: "execInContainer.inspect",
                      containerId,
                      cause: inspectErr
                    })));
                  });
              });

              stream.on('error', (streamErr) => {
                resume(Effect.fail(new DockerOperationError({
                  message: "Exec stream error",
                  operation: "execInContainer.stream",
                  containerId,
                  cause: streamErr
                })));
              });
            });
          });

          return result;
        }),

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

              // Return the stream immediately for the caller to handle
              // The caller will need to use docker.modem.followProgress to track completion
              resume(Effect.succeed(stream));
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
    });
  })
);