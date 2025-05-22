// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
} from "@/services/ai/core";
import type { AiResponse } from "@effect/ai/AiResponse";
import * as OpenAiClient from "@effect/ai-openai/OpenAiClient";
import * as OpenAiCompletions from "@effect/ai-openai/OpenAiCompletions";
import { Completions } from "@effect/ai/Completions";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";

// Log when this module is loaded
console.log("Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)");

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    // Get required services
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    // Get the model name from config
    let modelName = "gemma3:1b"; // Default model
    const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
    const configResult = yield* _(Effect.either(configGetEffect));

    if (configResult._tag === 'Right') {
      modelName = configResult.right;
    } else {
      yield* _(
        telemetry.trackEvent({
          category: "ai:config:warn",
          action: "ollama_model_name_fetch_failed_using_default",
          label: "OLLAMA_MODEL_NAME",
          value: String(configResult.left?.message || configResult.left),
        }).pipe(Effect.ignoreLogged)
      );
    }
    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_model_name_resolved",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    // Create the completions service using the OpenAI adapter pattern
    const completionsLayer = OpenAiCompletions.layerCompletions({
      model: modelName
    });

    const completionsWithClientLayer = completionsLayer.pipe(
      Layer.provide(Layer.succeed(OpenAiClient.OpenAiClient, ollamaAdaptedClient))
    );

    // Get the completions service from the layer
    const completionsService = yield* _(
      Effect.provide(
        Effect.map(
          Effect.context<Completions>(),
          (context) => Context.get(context, Completions)
        ),
        completionsWithClientLayer
      )
    );

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    // Map errors from provider error to AIProviderError
    const mapErrorToAIProviderError = (err: unknown, contextAction: string, params: unknown) => {
      const detail = (err as any)?.error || err;
      return new AIProviderError({
        message: `Ollama ${contextAction} error for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`,
        cause: detail?.cause || detail,
        provider: "Ollama",
        context: {
          model: modelName,
          params,
          originalErrorTag: (detail as any)?._tag,
          originalErrorMessage: (detail as any)?.message
        }
      });
    };

    // Create the service implementation
    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel" as const,

      generateText: (params: GenerateTextOptions) => {
        console.log("Ollama generateText called with params:", params);
        return Effect.tryPromise({
          try: async () => {
            const response = await Effect.runPromise(
              completionsService.create(params.prompt)
            );
            return response as AiResponse;
          },
          catch: (error) => mapErrorToAIProviderError(error, "generateText", params)
        });
      },

      streamText: (params: StreamTextOptions) => {
        console.log("Ollama streamText called with params:", params);
        return completionsService.stream(params.prompt).pipe(
          Stream.map(chunk => ({
            text: chunk.text || ""
          } as AiTextChunk)),
          Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
        );
      },

      generateStructured: (params: GenerateStructuredOptions) => {
        console.log("Ollama generateStructured called with params:", params);
        return Effect.tryPromise({
          try: async () => {
            const response = await Effect.runPromise(
              completionsService.create(params.prompt)
            );
            return response as AiResponse;
          },
          catch: (error) => mapErrorToAIProviderError(error, "generateStructured", params)
        });
      }
    });
  })
);
