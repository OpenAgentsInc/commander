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
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import { Tokenizer } from "@effect/ai/Tokenizer";
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
  const telemetry = yield* _(TelemetryService);
  // Expect OpenAiLanguageModel.Config to be in context
  const modelConfig = yield* _(OpenAiLanguageModel.Config);

  const modelName = modelConfig.model;

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_model_from_provided_config_service",
      value: modelName,
    })
  );

  // Step 1: Get the AiModel definition Effect  
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.max_tokens
  });

  // Step 2: Provide both the client service AND Config service to the model effect
  const configuredAiModelEffect = Effect.provideService(
    Effect.provideService(
      aiModelEffectDefinition,
      OpenAiLanguageModel.Config,
      modelConfig
    ),
    OpenAiClient.OpenAiClient, 
    ollamaClient
  );

  // Step 3: Get the AiModel instance (this is the provider, not an Effect)
  const provider = yield* _(configuredAiModelEffect);

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
          const effectAiResponse = yield* _(languageModel.generateText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          }));
          // Map @effect/ai's AiResponse to our core AiResponse
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
            return languageModel.streamText({
              prompt: options.prompt,
              model: options.model,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              signal: options.signal
            }).pipe(
              Stream.map((effectAiResponse) => new AiResponse({ parts: effectAiResponse.parts })),
              Stream.mapError((error) =>
                new AiProviderError({
                  message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
                  provider: "Ollama",
                  isRetryable: true,
                  cause: error
                })
              )
            );
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
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const modelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gemma3:1b"))
    );

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: 0.7,
      max_tokens: 2048,
    };

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_provider_config_service_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    return yield* _(
      Effect.provideService(
        OllamaAgentLanguageModelLive,
        OpenAiLanguageModel.Config,
        openAiModelConfigServiceValue
      )
    );
  })
);
