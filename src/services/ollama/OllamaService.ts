import { Effect, Context, Schema } from "effect";
import { HttpClient } from "@effect/platform/HttpClient";

// --- Schema Definitions ---

// OllamaMessage schema
export const OllamaMessageSchema = Schema.Struct({
    role: Schema.Union(
        Schema.Literal("system"),
        Schema.Literal("user"),
        Schema.Literal("assistant")
    ),
    content: Schema.String
});
export type OllamaMessage = Schema.Schema.Type<typeof OllamaMessageSchema>;

// OllamaServiceConfig schema
export const OllamaServiceConfigSchema = Schema.Struct({
    baseURL: Schema.String,
    defaultModel: Schema.optionalWith(Schema.String, { default: () => "llama2" })
});
export type OllamaServiceConfig = Schema.Schema.Type<typeof OllamaServiceConfigSchema>;
export const OllamaServiceConfigTag = Context.GenericTag<OllamaServiceConfig>("OllamaServiceConfig");

// OllamaChatCompletionRequest schema
export const OllamaChatCompletionRequestSchema = Schema.Struct({
    model: Schema.optional(Schema.String),
    messages: Schema.Array(OllamaMessageSchema),
    stream: Schema.optionalWith(Schema.Boolean, { default: () => false })
});
export type OllamaChatCompletionRequest = Schema.Schema.Type<typeof OllamaChatCompletionRequestSchema>;

// OllamaChatCompletionChoice schema
export const OllamaChatCompletionChoiceSchema = Schema.Struct({
    index: Schema.Number,
    message: OllamaMessageSchema,
    finish_reason: Schema.String
});

// OllamaChatCompletionUsage schema
export const OllamaChatCompletionUsageSchema = Schema.Struct({
    prompt_tokens: Schema.Number,
    completion_tokens: Schema.Number,
    total_tokens: Schema.Number
});

// OllamaChatCompletionResponse schema
export const OllamaChatCompletionResponseSchema = Schema.Struct({
    id: Schema.String,
    object: Schema.String,
    created: Schema.Number,
    model: Schema.String,
    choices: Schema.Array(OllamaChatCompletionChoiceSchema),
    usage: Schema.optional(OllamaChatCompletionUsageSchema)
});
export type OllamaChatCompletionResponse = Schema.Schema.Type<typeof OllamaChatCompletionResponseSchema>;

// --- Error Schema Definitions ---
export const OllamaErrorSchema = Schema.Struct({
  _tag: Schema.Literal("OllamaError"),
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
});

export const OllamaHttpErrorSchema = Schema.Struct({
  _tag: Schema.Literal("OllamaHttpError"),
  message: Schema.String,
  request: Schema.Unknown,
  response: Schema.Unknown
});

export const OllamaParseErrorSchema = Schema.Struct({
  _tag: Schema.Literal("OllamaParseError"),
  message: Schema.String,
  data: Schema.Unknown
});

// --- Custom Error Types ---
export class OllamaError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = "OllamaError";
    }
}

export class OllamaHttpError extends Error {
    readonly _tag = "OllamaHttpError";
    constructor(
        message: string, 
        readonly request: unknown, 
        readonly response: unknown
    ) {
        super(message);
        this.name = "OllamaHttpError";
    }
}

export class OllamaParseError extends Error {
    readonly _tag = "OllamaParseError";
    constructor(
        message: string, 
        readonly data: unknown
    ) {
        super(message);
        this.name = "OllamaParseError";
    }
}

// --- Service Interface ---
export interface OllamaService {
    generateChatCompletion(
        request: OllamaChatCompletionRequest
    ): Effect.Effect<OllamaChatCompletionResponse, OllamaHttpError | OllamaParseError, never>;
}

// Define a Tag for the service that can be used in dependency injection
export const OllamaService = Context.GenericTag<OllamaService>("OllamaService");