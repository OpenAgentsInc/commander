import { Context, Effect } from "effect";
import type { EvaluationResult } from "./types";
import { HarnessError } from "./errors";
// Import other error types that might be bubbled up or wrapped
import type { TaskNotFoundError, DatasetAccessError, ScriptBuildError, LifecycleSetupError, LifecycleEvalError, DockerBuildPrepError } from "./errors";
import type { DockerError, DockerOperationError } from "@/services/docker";
import type { ConfigError } from "@/services/configuration";

export type EvaluateTaskError = HarnessError | TaskNotFoundError | DatasetAccessError | ScriptBuildError | LifecycleSetupError | LifecycleEvalError | DockerError | DockerOperationError | ConfigError | DockerBuildPrepError;

export interface SWEBenchHarnessService {
  /**
   * Evaluates a given patch content for a specific SWE-Bench task instance.
   * This method orchestrates the entire process:
   * 1. Fetches task details.
   * 2. Sets up a Docker container with the task's repository.
   * 3. Generates an evaluation script.
   * 4. Applies the patch and runs the evaluation script inside the container.
   * 5. Collects results and cleans up resources.
   * @param instanceId The ID of the SWE-Bench task to evaluate.
   * @param patchContent The content of the patch to apply.
   * @returns An Effect resolving to an EvaluationResult or failing with a HarnessError or underlying service error.
   */
  evaluateTask(
    instanceId: string,
    patchContent: string
  ): Effect.Effect<EvaluationResult, EvaluateTaskError>;
}

export const SWEBenchHarnessService = Context.GenericTag<SWEBenchHarnessService>("SWEBenchHarnessService");