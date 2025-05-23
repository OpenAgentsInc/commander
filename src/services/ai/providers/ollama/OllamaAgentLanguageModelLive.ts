// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
} from "@/services/ai/core";
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AIError";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiLanguageModel } from "@effect/ai-openai";
import { OpenAiClient } from "@effect/ai-openai";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";
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

  const modelName = yield* _(
    configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gemma3:1b")
    )
  );

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_model_from_config_service",
      value: modelName,
    })
  );

  // Step 1: Create the AiModel (this is just configuration, not an Effect)
  const ollamaModel = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });

  // Step 2: Build it with the OpenAI client to get a Provider
  const provider = yield* _(
    ollamaModel.pipe(
      Effect.provide(Layer.succeed(OpenAiClient.OpenAiClient, ollamaClient))
    )
  );

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_language_model_provider_ready",
      value: modelName,
    })
  );

  // Create our AgentLanguageModel implementation using the provider
  return makeAgentLanguageModel({
    generateText: (options: GenerateTextOptions) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(AiLanguageModel);
          const effectAiResponse = yield* _(
            languageModel.generateText({
              prompt: options.prompt,
              model: options.model,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              stopSequences: options.stopSequences
            })
          );
          return new AiResponse({
            parts: effectAiResponse.parts
          });
        })
      ).pipe(
        Effect.mapError((error) =>
          new AiProviderError({
            message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
            provider: "Ollama",
            isRetryable: true,
            cause: error
          })
        )
      ),

    streamText: (options: StreamTextOptions) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(AiLanguageModel);
            const stream = languageModel.streamText({
              prompt: options.prompt,
              model: options.model,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              signal: options.signal
            });
            return Stream.map(stream, (effectAiResponse) => new AiResponse({ 
              parts: effectAiResponse.parts 
            }));
          })
        )
      ).pipe(
        Stream.mapError((error) =>
          new AiProviderError({
            message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
            provider: "Ollama",
            isRetryable: true,
            cause: error
          })
        )
      ),

    generateStructured: (options: GenerateStructuredOptions) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported by Ollama provider",
          provider: "Ollama",
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
