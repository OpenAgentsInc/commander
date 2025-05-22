import { Schema } from "@effect/schema";
import { Context } from "effect";
import { BaseProviderConfigSchema } from "@/services/ai/core/ProviderConfig";

export const NIP90ProviderConfigSchema = Schema.struct({
  ...BaseProviderConfigSchema.fields,
  dvmPubkey: Schema.string,
  dvmRelays: Schema.array(Schema.string),
  requestKind: Schema.number,
  requiresEncryption: Schema.boolean,
  useEphemeralRequests: Schema.boolean,
  modelIdentifier: Schema.optional(Schema.string),
  temperature: Schema.optional(Schema.number),
  maxTokens: Schema.optional(Schema.number),
});

export type NIP90ProviderConfig = Schema.Schema.Type<typeof NIP90ProviderConfigSchema>;

/**
 * Context Tag for NIP90ProviderConfig
 * This tag is used by NIP90AgentLanguageModelLive to get its specific DVM configuration.
 */
export const NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>("NIP90ProviderConfig");
