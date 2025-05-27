import { Effect, Context } from "effect";
import { AgentLanguageModel } from "@/services/ai/core/AgentLanguageModel";
import { AiProviderError } from "@/services/ai/core/AIError";
import { AiConfigurationError } from "@/services/ai/core/AIError";

/**
 * Service responsible for creating AI provider instances.
 * Separates provider instantiation logic from orchestration concerns.
 */
export interface ProviderFactoryService {
  readonly _tag: "ProviderFactoryService";
  
  /**
   * Creates an AI provider instance based on the provider key.
   * @param providerKey The key identifying the provider (e.g., "ollama", "claude_code", "nip90:*")
   * @param modelName Optional model name override
   * @returns Effect that resolves to an AgentLanguageModel instance
   */
  createProvider(
    providerKey: string,
    modelName?: string
  ): Effect.Effect<AgentLanguageModel, AiProviderError | AiConfigurationError, never>;
  
  /**
   * Lists available provider keys.
   * @returns Effect that resolves to an array of provider keys
   */
  listProviders(): Effect.Effect<string[], never, never>;
}

export const ProviderFactoryService = Context.GenericTag<ProviderFactoryService>("ProviderFactoryService");