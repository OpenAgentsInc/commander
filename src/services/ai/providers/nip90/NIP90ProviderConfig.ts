import { Context } from "effect";
import { NIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";

/**
 * Context Tag for NIP-90 provider configuration
 * This tag will be used by NIP90AgentLanguageModelLive to get its specific DVM configuration
 */
export const NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>(
  "NIP90ProviderConfig",
);

// Re-export the NIP90ProviderConfig type for convenience
export type { NIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";
