// src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
import { Layer, Effect, Stream } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
} from "@/services/ai/core";
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AIError";
import { AiResponse, mapProviderResponseToAiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import { Tokenizer } from "@effect/ai/Tokenizer";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

/**
 * Live implementation of AgentLanguageModel using OpenAI
 */
export const OpenAIAgentLanguageModelLive = Effect.gen(function* (_) {
  const openAiClient = yield* _(OpenAiClient.OpenAiClient);
  const configService = yield* _(ConfigurationService);
  const telemetry = yield* _(TelemetryService);

  // Fetch model name
  const modelName = yield* _(
    configService.get("OPENAI_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gpt-4"),
      Effect.tap(() =>
        telemetry.trackEvent({
          category: "ai:config",
          action: "openai_model_name_resolved",
          value: modelName,
        })
      )
    )
  );

  // Step 1: Get the AiModel definition Effect  
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });

  // Step 2: Provide the client dependency to get the AiModel instance
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    openAiClient
  );

  // Step 3: Get the AiModel instance (this is the provider, not an Effect)
  const provider = yield* _(configuredAiModelEffect);

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_language_model_created",
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
        Effect.mapError((error) => new AiProviderError({
          message: `OpenAI generateText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "OpenAI",
          isRetryable: true,
          cause: error
        }))
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
              Stream.mapError((error) => new AiProviderError({
                message: `OpenAI streamText error: ${error instanceof Error ? error.message : String(error)}`,
                provider: "OpenAI",
                isRetryable: true,
                cause: error
              }))
            );
          })
        )
      ),

    generateStructured: (options: GenerateStructuredOptions) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not yet implemented for OpenAI provider",
          provider: "OpenAI",
          isRetryable: false
        })
      )
  });
});

export const OpenAIAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  OpenAIAgentLanguageModelLive
);
