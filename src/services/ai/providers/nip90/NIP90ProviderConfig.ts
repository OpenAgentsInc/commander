import { Context } from "effect";
import { Schema } from "@effect/schema";

// Import the NIP90ProviderConfig type from core
import type { NIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";

/**
 * Context Tag for NIP90ProviderConfig
 * This tag is used by NIP90AgentLanguageModelLive to get its specific DVM configuration.
 */
export const NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>("NIP90ProviderConfig");

// Re-export the type for convenience
export type { NIP90ProviderConfig };
