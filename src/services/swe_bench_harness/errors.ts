import { Data } from "effect";

export class SWEBenchHarnessError extends Data.TaggedError("SWEBenchHarnessError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, any>;
}> {}

export class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  readonly instanceId: string;
  readonly pathSearched?: string;
  readonly cause?: unknown;
}> {
  get message() {
    return `SWE-Bench task not found: ${this.instanceId}${this.pathSearched ? ` (searched in ${this.pathSearched})` : ''}`;
  }
}

export class DatasetAccessError extends Data.TaggedError("DatasetAccessError")<{
  readonly message: string;
  readonly path?: string;
  readonly cause?: unknown;
}> {}

export class ScriptBuildError extends Data.TaggedError("ScriptBuildError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, any>;
}> {}

export class LifecycleSetupError extends Data.TaggedError("LifecycleSetupError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, any>;
}> {}

export class LifecycleEvalError extends Data.TaggedError("LifecycleEvalError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly context?: Record<string, any>;
}> {}

export class HarnessError extends Data.TaggedError("HarnessError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly instanceId?: string; // Optional: helps identify which task failed at harness level
  readonly context?: Record<string, any>;
}> {}

export class DockerBuildPrepError extends Data.TaggedError("DockerBuildPrepError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, any>;
}> {}