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