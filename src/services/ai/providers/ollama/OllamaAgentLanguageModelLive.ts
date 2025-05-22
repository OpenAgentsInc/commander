// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
} from "@/services/ai/core";
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AiError";
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse";
import { OpenAiClient } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { AiLanguageModel } from "@effect/ai";

console.log(
  "Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)",
);

/**
 * Live implementation of AgentLanguageModel using Ollama
 */
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const ollamaClient = yield* _(OllamaOpenAIClientTag);
  const configService = yield* _(ConfigurationService);
  const telemetry = yield* _(TelemetryService);

  // Get model name from config or use default
  const modelName = yield* _(
    configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gemma:3b"),
      Effect.tap(() =>
        telemetry.trackEvent({
          category: "ai:config",
          action: "ollama_model_name_resolved",
          value: modelName,
        })
      )
    )
  );

  // Create the language model implementation
  const languageModel = AiLanguageModel.make({
    generateText: (options) =>
      Effect.tryPromise({
        try: () =>
          ollamaClient.createChatCompletion({
            model: options.model || modelName,
            messages: [{ role: "user", content: options.prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            stop: options.stopSequences
          }),
        catch: (error) => mapToAiProviderError(error, "generateText", modelName, true)
      }).pipe(
        Effect.map(response => new AiResponse({
          text: response.choices?.[0]?.message?.content || "",
          metadata: {
            usage: response.usage && {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            }
          }
        }))
      ),

    streamText: (options) =>
      Stream.fromEffect(
        Effect.tryPromise({
          try: () =>
            ollamaClient.createChatCompletionStream({
              model: options.model || modelName,
              messages: [{ role: "user", content: options.prompt }],
              temperature: options.temperature,
              max_tokens: options.maxTokens,
              stop: options.stopSequences,
              stream: true
            }),
          catch: (error) => mapToAiProviderError(error, "streamText", modelName, true)
        })
      ).pipe(
        Stream.flatMap(response =>
          Stream.fromAsyncIterable(
            response.data,
            { onError: error => mapToAiProviderError(error, "streamText", modelName, true) }
          )
        ),
        Stream.map(chunk => new AiTextChunk({
          text: chunk.choices?.[0]?.delta?.content || ""
        }))
      )
  });

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_language_model_created",
      value: modelName,
    })
  );

  // Create our AgentLanguageModel implementation
  return makeAgentLanguageModel({
    generateText: (options) => languageModel.generateText(options),
    streamText: (options) => languageModel.streamText(options),
    generateStructured: (options: GenerateStructuredOptions) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not yet implemented for Ollama provider",
          isRetryable: false
        })
      )
  });
});

// Create the Layer by providing the implementation
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  OllamaAgentLanguageModelLive
);
