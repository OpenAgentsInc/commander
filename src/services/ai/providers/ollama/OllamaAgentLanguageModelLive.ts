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
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import type { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import type { AiResponse as OpenAiResponse } from "@effect/ai/AiResponse";

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

  // Step 1: Get the AiModel definition Effect
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

  // Step 2: Provide the client dependency to get the AiModel instance
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    ollamaClient
  );

  // Step 3: Get the provider
  const provider = yield* _(configuredAiModelEffect) as unknown as AiLanguageModel;

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_language_model_created",
      value: modelName,
    })
  );

  // Create our AgentLanguageModel implementation using the provider
  return makeAgentLanguageModel({
    generateText: (options: GenerateTextOptions) =>
      Effect.gen(function* (_) {
        const response = yield* _(Effect.promise(() =>
          provider.generateText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          })
        ));
        return new AiResponse({
          text: response.text,
          metadata: {
            usage: response.usage
          }
        });
      }).pipe(
        Effect.mapError(error => mapToAiProviderError(error, "generateText", modelName, true))
      ),

    streamText: (options: StreamTextOptions) =>
      Stream.fromEffect(
        Effect.promise(() =>
          provider.streamText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            signal: options.signal
          })
        )
      ).pipe(
        Stream.map((chunk: OpenAiResponse) => new AiTextChunk({ text: chunk.text })),
        Stream.mapError(error => mapToAiProviderError(error, "streamText", modelName, true))
      ),

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
