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

  // Step 4: Build the provider with type cast to help TypeScript inference
  const provider = yield* _(
    (aiModel as unknown) as Effect.Effect<
      Provider<AiLanguageModel | Tokenizer>,
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
          // Map @effect/ai AiResponse to our custom AiResponse
          return AiResponse.fromSimple({
            text: effectAiResponse.text,
            toolCalls: effectAiResponse.toolCalls?.map(tc => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.params as Record<string, unknown>
            })),
            metadata: {
              usage: {
                promptTokens: effectAiResponse.getProviderMetadata ? 0 : 0, // TODO: Extract from metadata
                completionTokens: effectAiResponse.text.length,
                totalTokens: effectAiResponse.text.length
              }
            }
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
              Stream.map((effectAiResponse) => AiResponse.fromSimple({
                text: effectAiResponse.text,
                toolCalls: effectAiResponse.toolCalls?.map(tc => ({
                  id: tc.id,
                  name: tc.name,
                  arguments: tc.params as Record<string, unknown>
                })),
                metadata: {
                  usage: {
                    promptTokens: 0,
                    completionTokens: effectAiResponse.text.length,
                    totalTokens: effectAiResponse.text.length
                  }
                }
              })),
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
  OllamaAgentLanguageModelLive
);
