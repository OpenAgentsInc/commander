// src/services/swe_bench_harness/AgentPatchGeneratorService.ts
import { Effect, Context } from "effect";
import type { SWEBenchTask } from "./types";
import type { AiProviderError, AiConfigurationError } from "@/services/ai/core";
import { AgentPatchGenerationError } from "./errors";

export interface AgentPatchGeneratorService {
  /**
   * Generates a patch for a given SWE-Bench task using a specified AI agent.
   * @param task - The SWEBenchTask object.
   * @param repoPathOnHost - Absolute path to the cloned repository on the host machine.
   * @param preferredProviderKey - The key of the AI provider to use (e.g., "claude_code").
   * @returns Effect resolving to the generated patch string or failing with an error.
   */
  generatePatch(
    task: SWEBenchTask,
    repoPathOnHost: string,
    preferredProviderKey: string
  ): Effect.Effect<string, AgentPatchGenerationError | AiProviderError | AiConfigurationError>;
}

export const AgentPatchGeneratorService = Context.GenericTag<AgentPatchGeneratorService>("AgentPatchGeneratorService");