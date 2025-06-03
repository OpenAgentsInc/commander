import { Context, Effect } from "effect";
import type { EvaluationResult } from "./types";
import { HarnessError } from "./errors";
// Import other error types that might be bubbled up or wrapped
import type { TaskNotFoundError, DatasetAccessError, ScriptBuildError, LifecycleSetupError, LifecycleEvalError, DockerBuildPrepError, AgentPatchGenerationError } from "./errors";
import type { DockerError, DockerOperationError } from "@/services/docker";
import type { ConfigError } from "@/services/configuration";
import type { AiProviderError, AiConfigurationError } from "@/services/ai/core";
import type { PythonBridgeError } from "./SWEBenchPythonBridgeService";

export type PatchSource =
  | { type: "gold" }
  | { type: "empty" }
  | { type: "content"; content: string }
  | { type: "agent_generated"; providerKey: string };

export type EvaluateTaskError = HarnessError | TaskNotFoundError | DatasetAccessError | ScriptBuildError | LifecycleSetupError | LifecycleEvalError | DockerError | DockerOperationError | ConfigError | DockerBuildPrepError | AgentPatchGenerationError | AiProviderError | AiConfigurationError | PythonBridgeError;

export interface SWEBenchHarnessService {
  /**
   * Evaluates a task with a patch from the specified source.
   * This method orchestrates the entire process:
   * 1. Fetches task details.
   * 2. Sets up a Docker container with the task's repository.
   * 3. Obtains the patch based on the source (gold, empty, content, or agent-generated).
   * 4. Generates an evaluation script.
   * 5. Applies the patch and runs the evaluation script inside the container.
   * 6. Collects results and cleans up resources.
   * @param instanceId The ID of the SWE-Bench task to evaluate.
   * @param patchSource The source of the patch to apply.
   * @returns An Effect resolving to an EvaluationResult or failing with a HarnessError or underlying service error.
   */
  evaluateTask(
    instanceId: string,
    patchSource: PatchSource
  ): Effect.Effect<EvaluationResult, EvaluateTaskError>;
}

export const SWEBenchHarnessService = Context.GenericTag<SWEBenchHarnessService>("SWEBenchHarnessService");