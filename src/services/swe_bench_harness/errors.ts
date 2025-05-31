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