// src/services/ai/core/AgentLanguageModel.ts
import { Context, Effect, Stream } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { AiError } from "./AiError";
import { AiResponse, AiTextChunk } from "./AiResponse";

// Import from @effect/ai package, but not AiError since we're using our own error types
import type { AiResponse as AiResponseEffect } from "@effect/ai/AiResponse";

// Import our custom error type
import type { AIProviderError } from "./AIError";

// Define the types we need based on Effect AI's interface
export type GenerateTextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
};

export type StreamTextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type GenerateStructuredOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  schema?: unknown;
};

/**
 * Interface for a provider-agnostic language model service
 * This abstraction allows different LLM providers to be used interchangeably
 */
export interface AgentLanguageModel {
  readonly _tag: "AgentLanguageModel";

  /**
   * Generates text completion in a single request
   * @param params Options for text generation including prompt
   * @returns Effect wrapping the AI response
   */
  generateText(
    params: GenerateTextOptions,
  ): Effect.Effect<AiResponse, AIProviderError>;

  /**
   * Streams text completion chunks as they're generated
   * @param params Options for text streaming including prompt
   * @returns Stream of text chunks from the AI model
   */
  streamText(
    params: StreamTextOptions,
  ): Stream.Stream<AiTextChunk, AIProviderError>;

  /**
   * Generates structured output (for future tool use)
   * @param params Options for structured generation including prompt and output schema
   * @returns Effect wrapping the AI response
   */
  generateStructured(
    params: GenerateStructuredOptions,
  ): Effect.Effect<AiResponse, AIProviderError>;
}

/**
 * Context tag for accessing the AgentLanguageModel service
 */
export const AgentLanguageModel =
  Context.GenericTag<AgentLanguageModel>("AgentLanguageModel");

/**
 * Helper to create an AgentLanguageModel implementation
 */
export const makeAgentLanguageModel = (
  impl: {
    streamText: (options: StreamTextOptions) => Stream.Stream<AiTextChunk, AIProviderError>;
    generateText: (options: GenerateTextOptions) => Effect.Effect<AiResponse, AIProviderError>;
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
      generateObject: (options) => Effect.fail(new AIProviderError({
        message: "generateObject not implemented"
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
