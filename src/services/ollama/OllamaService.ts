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
export type OllamaMessage = Schema.To<typeof OllamaMessageSchema>;

// OllamaServiceConfig schema
export const OllamaServiceConfigSchema = Schema.Struct({
    baseURL: Schema.String,
    defaultModel: Schema.String.pipe(Schema.withDefault(() => "llama2"))
});
export type OllamaServiceConfig = Schema.To<typeof OllamaServiceConfigSchema>;
export const OllamaServiceConfigTag = Context.Tag<OllamaServiceConfig>("OllamaServiceConfig");

// OllamaChatCompletionRequest schema
export const OllamaChatCompletionRequestSchema = Schema.Struct({
    model: Schema.Optional(Schema.String),
    messages: Schema.Array(OllamaMessageSchema),
    stream: Schema.Boolean.pipe(Schema.withDefault(() => false))
});
export type OllamaChatCompletionRequest = Schema.To<typeof OllamaChatCompletionRequestSchema>;

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
    usage: Schema.Optional(OllamaChatCompletionUsageSchema)
});
export type OllamaChatCompletionResponse = Schema.To<typeof OllamaChatCompletionResponseSchema>;

// --- Error Schema Definitions ---
export const OllamaErrorSchema = Schema.Struct({
  _tag: Schema.Literal("OllamaError"),
  message: Schema.String,
  cause: Schema.Optional(Schema.Unknown)
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
    readonly _tag = "OllamaError";
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = "OllamaError";
    }
}

export class OllamaHttpError extends OllamaError {
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

export class OllamaParseError extends OllamaError {
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

export const OllamaService = Context.Tag<OllamaService>("OllamaService");