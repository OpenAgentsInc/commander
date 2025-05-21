// src/services/ai/core/AgentLanguageModel.ts
import { Context, Effect, Stream } from "effect";

// Import from @effect/ai package
import type { AiError } from "@effect/ai/AiError";
import type { AiResponse } from "@effect/ai/AiResponse"; 

// Define the types we need based on Effect AI's interface
export type AiTextChunk = {
  text: string;
};

export type GenerateTextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type StreamTextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
    params: GenerateTextOptions
  ): Effect.Effect<AiResponse, AiError>;

  /**
   * Streams text completion chunks as they're generated
   * @param params Options for text streaming including prompt
   * @returns Stream of text chunks from the AI model
   */
  streamText(
    params: StreamTextOptions
  ): Stream.Stream<AiTextChunk, AiError>;

  /**
   * Generates structured output (for future tool use)
   * @param params Options for structured generation including prompt and output schema
   * @returns Effect wrapping the AI response
   */
  generateStructured(
    params: GenerateStructuredOptions
  ): Effect.Effect<AiResponse, AiError>;
}

/**
 * Context tag for accessing the AgentLanguageModel service
 */
export const AgentLanguageModel = Context.GenericTag<AgentLanguageModel>("AgentLanguageModel");