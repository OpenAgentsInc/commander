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
import { OpenAiClient } from "@effect/ai-openai";
import { TextPart } from "@effect/ai/AiResponse";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

/**
 * Live implementation of AgentLanguageModel using OpenAI
 * Uses direct OpenAI client instead of AiModel abstraction to avoid Config service issues
 */
export const OpenAIAgentLanguageModelLive = Effect.gen(function* (_) {
  const client = yield* _(OpenAiClient.OpenAiClient);
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

  // Helper to parse messages from prompt JSON
  const parseMessages = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return parsed.messages || [];
    } catch {
      return [{ role: "user", content: prompt }];
    }
  };

  // Create our AgentLanguageModel implementation using direct client
  return makeAgentLanguageModel({
    generateText: (options: GenerateTextOptions) =>
      Effect.gen(function* (_) {
        const messages = parseMessages(options.prompt);
        const response = yield* _(
          client.client.createChatCompletion({
            model: modelName,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stop: options.stopSequences
          })
        );
        
        const content = response.choices[0]?.message?.content || "";
        return new AiResponse({
          parts: [new TextPart({ text: content })]
        });
      }).pipe(
        Effect.mapError((error) => new AiProviderError({
          message: `OpenAI generateText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "OpenAI",
          isRetryable: true,
          cause: error
        }))
      ),

    streamText: (options: StreamTextOptions) => {
      const messages = parseMessages(options.prompt);
      return client.stream({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stop: options.stopSequences
      }).pipe(
        Stream.map((chunk) => {
          // The stream already returns AiResponse objects from @effect/ai
          // We need to convert to our AiResponse
          return new AiResponse({
            parts: chunk.parts
          });
        }),
        Stream.mapError((error) => new AiProviderError({
          message: `OpenAI streamText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "OpenAI",
          isRetryable: true,
          cause: error
        }))
      );
    },

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
