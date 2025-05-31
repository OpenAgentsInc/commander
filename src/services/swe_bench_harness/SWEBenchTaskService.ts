import { Context, Effect } from "effect";
import type { SWEBenchTask } from "./types";
import { TaskNotFoundError, DatasetAccessError } from "./errors";
import type { ConfigError } from "@/services/configuration";

export interface SWEBenchTaskService {
  getTask(instanceId: string): Effect.Effect<SWEBenchTask, TaskNotFoundError | DatasetAccessError | ConfigError>;
  listAvailableTaskIds(subset?: string): Effect.Effect<string[], DatasetAccessError | ConfigError>;
}

export const SWEBenchTaskService = Context.GenericTag<SWEBenchTaskService>("SWEBenchTaskService");