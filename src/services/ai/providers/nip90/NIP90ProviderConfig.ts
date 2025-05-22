import { Schema } from "effect";
import { Context } from "effect";
import { BaseProviderConfigSchema, NIP90ProviderConfig as CoreNIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";

// Re-export the core NIP90ProviderConfig type
export type NIP90ProviderConfig = CoreNIP90ProviderConfig;

/**
 * Context Tag for NIP90ProviderConfig
 * This tag is used by NIP90AgentLanguageModelLive to get its specific DVM configuration.
 */
export const NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>("NIP90ProviderConfig");
