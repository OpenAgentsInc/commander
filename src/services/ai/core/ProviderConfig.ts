// src/services/ai/core/ProviderConfig.ts
import { Schema } from "effect";

/**
 * Base schema for all provider configurations
 * Contains common fields that all AI providers need
 */
export const BaseProviderConfigSchema = Schema.Struct({
  modelName: Schema.String,
  isEnabled: Schema.Boolean, // To toggle providers on/off
});

export type BaseProviderConfig = Schema.Schema.Type<
  typeof BaseProviderConfigSchema
>;

/**
 * Provider config for services requiring an API key
 * Extends the base config with an apiKey field
 */
export const ApiKeyProviderConfigSchema = Schema.extend(
  BaseProviderConfigSchema,
  Schema.Struct({
    apiKey: Schema.String, // This should represent a secret key
  }),
);

export type ApiKeyProviderConfig = Schema.Schema.Type<
  typeof ApiKeyProviderConfigSchema
>;

/**
 * Provider config for services requiring a base URL
 * Extends the base config with a baseUrl field
 */
export const UrlProviderConfigSchema = Schema.extend(
  BaseProviderConfigSchema,
  Schema.Struct({
    baseUrl: Schema.String,
  }),
);

export type UrlProviderConfig = Schema.Schema.Type<
  typeof UrlProviderConfigSchema
>;

/**
 * Combined config for providers requiring both an API key and an optional URL
 * Typical for OpenAI and OpenAI-compatible providers
 */
export const OpenAICompatibleProviderConfigSchema = Schema.extend(
  ApiKeyProviderConfigSchema,
  Schema.Struct({
    baseUrl: Schema.optional(Schema.String),
    temperature: Schema.optional(Schema.Number),
    maxTokens: Schema.optional(Schema.Number),
  }),
);

export type OpenAICompatibleProviderConfig = Schema.Schema.Type<
  typeof OpenAICompatibleProviderConfigSchema
>;

/**
 * Config for Ollama provider
 */
export const OllamaProviderConfigSchema = Schema.extend(
  BaseProviderConfigSchema,
  Schema.Struct({
    baseUrl: Schema.String,
    temperature: Schema.optional(Schema.Number),
    maxTokens: Schema.optional(Schema.Number),
  }),
);

export type OllamaProviderConfig = Schema.Schema.Type<
  typeof OllamaProviderConfigSchema
>;

/**
 * Config for Anthropic provider
 */
export const AnthropicProviderConfigSchema = Schema.extend(
  ApiKeyProviderConfigSchema,
  Schema.Struct({
    baseUrl: Schema.optional(Schema.String),
    temperature: Schema.optional(Schema.Number),
    maxTokens: Schema.optional(Schema.Number),
  }),
);

export type AnthropicProviderConfig = Schema.Schema.Type<
  typeof AnthropicProviderConfigSchema
>;

/**
 * Config for NIP-90 DVM provider
 */
export const NIP90ProviderConfigSchema = Schema.extend(
  BaseProviderConfigSchema,
  Schema.Struct({
    dvmPubkey: Schema.String, // Hex public key of the DVM
    dvmRelays: Schema.Array(Schema.String), // Relays to publish job requests and listen for results
    requestKind: Schema.NumberFromString.pipe(
      Schema.filter((n): n is number => n >= 5000 && n <= 5999)
    ), // Filtered to be between 5000-5999
    requiresEncryption: Schema.Boolean, // If NIP-04 encryption is needed for job inputs
    useEphemeralRequests: Schema.Boolean, // If true, generate a new ephemeral keypair for each NIP-90 job request
    modelIdentifier: Schema.optional(Schema.String), // String the DVM uses to identify the model/job type
    temperature: Schema.optional(Schema.Number), // Temperature for sampling
    maxTokens: Schema.optional(Schema.Number), // Maximum tokens to generate
  })
);

export type NIP90ProviderConfig = Schema.Schema.Type<
  typeof NIP90ProviderConfigSchema
>;

/**
 * Union type of all supported provider configurations
 */
export const ProviderConfigSchema = Schema.Union(
  OpenAICompatibleProviderConfigSchema,
  OllamaProviderConfigSchema,
  AnthropicProviderConfigSchema,
  NIP90ProviderConfigSchema,
);

export type ProviderConfig = Schema.Schema.Type<typeof ProviderConfigSchema>;

/**
 * Discriminated union schema for provider configurations with a type field
 * Useful for runtime type checking and routing
 */
export const TypedProviderConfigSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("openai"),
    config: OpenAICompatibleProviderConfigSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("ollama"),
    config: OllamaProviderConfigSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("anthropic"),
    config: AnthropicProviderConfigSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("nip90"),
    config: NIP90ProviderConfigSchema,
  }),
);

export type TypedProviderConfig = Schema.Schema.Type<
  typeof TypedProviderConfigSchema
>;
