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
  
  // Phase 3 additions
  readonly copyToContainer: (containerId: string, srcPathOnHost: string, destPathInContainer: string) => Effect.Effect<void, DockerOperationError>;
  readonly copyFromContainer: (containerId: string, srcPathInContainer: string) => Effect.Effect<NodeJS.ReadableStream, DockerOperationError>;
  readonly execInContainer: (
    containerId: string,
    cmd: string[],
    options?: {
      WorkingDir?: string;
      Env?: string[];
      Tty?: boolean;
      AttachStdout?: boolean;
      AttachStderr?: boolean;
      User?: string;
    }
  ) => Effect.Effect<{ stdout: string; stderr: string; exitCode: number }, DockerOperationError>;
  
  // Phase 1 additions for dynamic image building
  readonly buildImage: (
    contextPath: string, // Path to the directory containing the Dockerfile and build context
    options: Dockerode.ImageBuildOptions // e.g., { t: "image-name:tag", dockerfile: "Dockerfile.name" }
  ) => Effect.Effect<NodeJS.ReadableStream, DockerOperationError>; // Stream of build output

  readonly removeImage: (
    imageNameOrId: string,
    options?: Dockerode.ImageRemoveOptions
  ) => Effect.Effect<void, DockerOperationError>;
}

export const DockerUtilsService = Context.GenericTag<DockerUtilsService>("DockerUtilsService");