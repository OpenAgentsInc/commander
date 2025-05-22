import { Effect, Stream, pipe } from "effect";
import { AgentLanguageModel, makeAgentLanguageModel } from "../core/AgentLanguageModel";
import { AiError } from "../core/AiError";
import { AiResponse, AiTextChunk } from "../core/AiResponse";
import { OllamaClient } from "./OllamaClient";
import { OllamaConfig } from "./OllamaConfig";

/**
 * Live implementation of AgentLanguageModel using Ollama
 */
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const config = yield* _(OllamaConfig);
  const client = yield* _(OllamaClient);

  const impl = {
    streamText: ({ prompt, model, temperature, maxTokens, signal }) =>
      pipe(
        client.streamCompletion({
          model: model ?? config.defaultModel,
          prompt,
          temperature: temperature ?? config.defaultTemperature,
          maxTokens: maxTokens ?? config.defaultMaxTokens,
          signal
        }),
        Stream.map((chunk) => ({
          text: chunk.response
        } as AiTextChunk)),
        Stream.mapError((error) => new AiError({
          message: "Error streaming from Ollama",
          cause: error
        }))
      ),

    generateText: ({ prompt, model, temperature, maxTokens }) =>
      pipe(
        client.getCompletion({
          model: model ?? config.defaultModel,
          prompt,
          temperature: temperature ?? config.defaultTemperature,
          maxTokens: maxTokens ?? config.defaultMaxTokens
        }),
        Effect.map((response) => ({
          text: response.response,
          metadata: {
            usage: {
              promptTokens: response.promptEvalCount,
              completionTokens: response.evalCount,
              totalTokens: response.promptEvalCount + response.evalCount
            }
          }
        } as AiResponse)),
        Effect.mapError((error) => new AiError({
          message: "Error getting completion from Ollama",
          cause: error
        }))
      )
  };

  return yield* _(makeAgentLanguageModel(impl));
});

export const OllamaAgentLanguageModelLiveLayer = Effect.layer({
  id: AgentLanguageModel,
  build: OllamaAgentLanguageModelLive
});
