// src/services/ai/core/AgentLanguageModel.ts
import { Context, Effect, Stream } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { AiError, AiProviderError } from "./AiError";
import { AiResponse, AiTextChunk } from "./AiResponse";

// Import from @effect/ai package
import type { AiResponse as AiResponseEffect } from "@effect/ai/AiResponse";

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

/**
 * Options for generating structured output
 */
export interface GenerateStructuredOptions extends GenerateTextOptions {
  schema?: unknown;
}

/**
 * Our AgentLanguageModel interface
 */
export interface AgentLanguageModel {
  readonly _tag: "AgentLanguageModel";

  /**
   * Generate text using a language model
   */
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never>;
  
  /**
   * Stream text using a language model
   */
  streamText(options: StreamTextOptions): Stream.Stream<AiTextChunk, AiProviderError, never>;
  
  /**
   * Generate structured output using a language model
   */
  generateStructured(options: GenerateStructuredOptions): Effect.Effect<AiResponse, AiProviderError, never>;
}

/**
 * Tag for AgentLanguageModel
 */
export const AgentLanguageModel = {
  Tag: Context.GenericTag<AgentLanguageModel>("AgentLanguageModel")
};

/**
 * Helper to create an AgentLanguageModel implementation
 */
export const makeAgentLanguageModel = (
  impl: {
    streamText: (options: StreamTextOptions) => Stream.Stream<AiTextChunk, AiProviderError>;
    generateText: (options: GenerateTextOptions) => Effect.Effect<AiResponse, AiProviderError>;
    generateStructured: (options: GenerateStructuredOptions) => Effect.Effect<AiResponse, AiProviderError>;
  }
): AgentLanguageModel => {
  return {
    _tag: "AgentLanguageModel",
    streamText: impl.streamText,
    generateText: impl.generateText,
    generateStructured: impl.generateStructured
  };
};
