// src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
import { Layer, Effect, Stream } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
} from "@/services/ai/core";
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AiError";
import { AiResponse, AiTextChunk, mapProviderResponseToAiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
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

  // Create the OpenAI language model
  const openAiModel = yield* _(OpenAiLanguageModel.make({
    client: openAiClient,
    model: modelName,
    defaultOptions: {
      temperature: 0.7,
      maxTokens: 2048
    }
  }));

  // Log successful model creation
  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_language_model_created",
      value: modelName,
    })
  );

  // Create our implementation
  const impl = {
    streamText: (options: StreamTextOptions) =>
      openAiModel.streamText({
        prompt: options.prompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences,
        signal: options.signal
      }).pipe(
        Stream.map((chunk) => new AiTextChunk({
          text: chunk.text
        })),
        Stream.mapError((error) =>
          mapToAiProviderError(
            error,
            "streamText",
            modelName,
            error instanceof Error && error.name === "AbortError"
          )
        )
      ),

    generateText: (options: GenerateTextOptions) =>
      openAiModel.generateText({
        prompt: options.prompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      }).pipe(
        Effect.map(mapProviderResponseToAiResponse),
        Effect.mapError((error) =>
          mapToAiProviderError(
            error,
            "generateText",
            modelName,
            error instanceof Error && error.name === "AbortError"
          )
        )
      )
  };

  return yield* _(makeAgentLanguageModel(impl));
});

export const OpenAIAgentLanguageModelLiveLayer = Layer.succeed(
  AgentLanguageModel,
  OpenAIAgentLanguageModelLive
);
