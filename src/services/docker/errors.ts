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