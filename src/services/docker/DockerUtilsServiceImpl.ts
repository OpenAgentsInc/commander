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