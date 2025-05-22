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
import { OpenAiLanguageModel } from "@effect/ai-openai";
import { OpenAiClient } from "@effect/ai-openai";
import type { Provider } from "@effect/ai/AiPlan";
import type { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";

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
      Effect.orElseSucceed(() => "gemma3:1b"),
      Effect.tap((name) =>
        telemetry.trackEvent({
          category: "ai:config",
          action: "ollama_model_name_resolved",
          value: name,
        })
      )
    )
  );

  // Step 1: Get the AiModel definition Effect
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

  // Step 2: Provide the client dependency
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    ollamaClient
  );

  // Step 3: Get the AiModel instance
  const aiModel = yield* _(configuredAiModelEffect);

  // Step 4: Build the provider with type cast
  const provider = yield* _(
    aiModel as Effect.Effect<
      Provider<AiLanguageModel>,
      never,
      never
    >
  );

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
      provider.generateText({
        prompt: options.prompt,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      }).pipe(
        Effect.mapError((error) =>
          new AiProviderError({
            message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
            isRetryable: true,
            cause: error
          })
        )
      ),

    streamText: (options: StreamTextOptions) =>
      provider.streamText({
        prompt: options.prompt,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        signal: options.signal
      }).pipe(
        Stream.mapError((error) =>
          new AiProviderError({
            message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
            isRetryable: true,
            cause: error
          })
        )
      ),

    generateStructured: (options: GenerateStructuredOptions) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported by Ollama provider",
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
