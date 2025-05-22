// src/services/ai/core/AgentLanguageModel.ts
import { Context, Effect, Stream } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { AiError, AiProviderError } from "./AiError";
import { AiResponse, AiTextChunk } from "./AiResponse";

// Import from @effect/ai package, but not AiError since we're using our own error types
import type { AiResponse as AiResponseEffect } from "@effect/ai/AiResponse";

// Import our custom error type
import type { AIProviderError } from "./AIError";

/**
 * Options for generating text
 */
export interface GenerateTextOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

/**
 * Options for streaming text
 */
export interface StreamTextOptions extends GenerateTextOptions {
  signal?: AbortSignal;
}

export type GenerateStructuredOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  schema?: unknown;
};

/**
 * Our AgentLanguageModel interface that extends AiLanguageModel
 */
export interface AgentLanguageModel extends AiLanguageModel.Service<never> {
  readonly _tag: "AgentLanguageModel";

  // Legacy methods for backward compatibility
  streamText(options: StreamTextOptions): Stream.Stream<AiTextChunk, AiProviderError>;
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError>;
}

/**
 * Context tag for AgentLanguageModel
 */
export const AgentLanguageModel = Context.GenericTag<AgentLanguageModel>("AgentLanguageModel");

/**
 * Helper to create an AgentLanguageModel implementation
 */
export const makeAgentLanguageModel = (
  impl: {
    streamText: (options: StreamTextOptions) => Stream.Stream<AiTextChunk, AiProviderError>;
    generateText: (options: GenerateTextOptions) => Effect.Effect<AiResponse, AiProviderError>;
  }
): Effect.Effect<AgentLanguageModel> =>
  Effect.gen(function* (_) {
    // Create base AiLanguageModel implementation
    const base = yield* _(AiLanguageModel.make({
      generateText: (options) => impl.generateText({
        prompt: options.prompt,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      }),
      streamText: (options) => impl.streamText({
        prompt: options.prompt,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        signal: options.signal
      }),
      generateObject: (options) => Effect.fail(new AiProviderError({
        message: "generateObject not implemented",
        isRetryable: false
      }))
    }));

    // Combine with our legacy interface
    return {
      _tag: "AgentLanguageModel",
      ...base,
      streamText: impl.streamText,
      generateText: impl.generateText
    };
  });
