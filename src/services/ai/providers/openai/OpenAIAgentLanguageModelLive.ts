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
  const telemetry = yield* _(TelemetryService);
  // Expect OpenAiLanguageModel.Config to be in context
  const modelConfig = yield* _(OpenAiLanguageModel.Config);

  const modelName = modelConfig.model;

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_model_from_provided_config_service",
      value: modelName,
    })
  );

  // Step 1: Get the AiModel definition Effect  
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName as any, {
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
    openAiClient
  );

  // Step 3: Get the AiModel instance (this is the provider, not an Effect)
  const provider = yield* _(configuredAiModelEffect);

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
        }).pipe(
          // Provide the Config service to the provider.use() execution context
          Effect.provideService(OpenAiLanguageModel.Config, modelConfig)
        )
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
              Stream.provideService(OpenAiLanguageModel.Config, modelConfig),
              Stream.map((effectAiResponse) => new AiResponse({ parts: effectAiResponse.parts })),
              Stream.mapError((error) => new AiProviderError({
                message: `OpenAI streamText error: ${error instanceof Error ? error.message : String(error)}`,
                provider: "OpenAI",
                isRetryable: true,
                cause: error
              }))
            );
          }).pipe(
            // Provide the Config service to the provider.use() execution context
            Effect.provideService(OpenAiLanguageModel.Config, modelConfig)
          )
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
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const modelName = yield* _(
      configService.get("OPENAI_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gpt-4o"))
    );

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: 0.7,
      max_tokens: 2048,
    };

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "openai_provider_config_service_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    return yield* _(
      Effect.provideService(
        OpenAIAgentLanguageModelLive,
        OpenAiLanguageModel.Config,
        openAiModelConfigServiceValue
      )
    );
  })
);
