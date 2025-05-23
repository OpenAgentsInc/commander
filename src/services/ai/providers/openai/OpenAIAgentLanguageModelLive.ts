// src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
import { Layer, Effect, Stream } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
} from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AIError";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

/**
 * Live implementation of AgentLanguageModel using OpenAI
 */
export const OpenAIAgentLanguageModelLive = Effect.gen(function* (_) {
  const openAiClient = yield* _(OpenAiClient.OpenAiClient);
  const configService = yield* _(ConfigurationService);
  const telemetry = yield* _(TelemetryService);

  const modelName = yield* _(
    configService.get("OPENAI_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gpt-4o")
    )
  );

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_model_from_config_service",
      value: modelName,
    })
  );

  // Step 1: Create the AiModel (this is just configuration, not an Effect)
  const openAiModel = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });

  // Step 2: Build it with the OpenAI client to get a Provider
  const provider = yield* _(
    openAiModel.pipe(
      Effect.provide(Layer.succeed(OpenAiClient.OpenAiClient, openAiClient))
    )
  );

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_language_model_provider_ready",
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
        Stream.mapError((error) => new AiProviderError({
          message: `OpenAI streamText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "OpenAI",
          isRetryable: true,
          cause: error
        }))
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
