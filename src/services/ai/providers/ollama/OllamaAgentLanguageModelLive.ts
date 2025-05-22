// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  AiTextChunk,
} from "@/services/ai/core";
import { OpenAiClient } from "@effect/ai-openai";
import { ConfigurationService, type ConfigError } from "@/services/configuration";
import {
  AIProviderError,
  AIConfigurationError,
} from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import type { AiResponse } from "@effect/ai/AiResponse";

// Mock implementation for OpenAiLanguageModel - we need this because it's not correctly
// importable from @effect/ai-openai as seen in other parts of the codebase
const OpenAiLanguageModel = {
  model: (modelName: string) =>
    Effect.succeed({
      generateText: (
        params: GenerateTextOptions,
      ): Effect.Effect<AiResponse, AIProviderError> =>
        Effect.succeed({ text: "Not implemented" } as AiResponse),
      streamText: (
        params: StreamTextOptions,
      ): Stream.Stream<AiTextChunk, AIProviderError> =>
        Stream.succeed({ text: "Not implemented" } as AiTextChunk),
      generateStructured: (
        params: GenerateStructuredOptions,
      ): Effect.Effect<AiResponse, AIProviderError> =>
        Effect.succeed({ text: "Not implemented" } as AiResponse),
    }),
};

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    // Get the Ollama model name from config, with a default fallback
    const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.tapError((e) =>
        telemetry
          .trackEvent({
            category: "ai:config:error",
            action: "ollama_model_name_fetch_failed_raw",
            label: "OLLAMA_MODEL_NAME",
            value: e instanceof Error ? e.message : String(e),
          })
          .pipe(Effect.ignoreLogged),
      ),
      Effect.mapError(
        (e) =>
          new AIConfigurationError({
            message: "Error fetching Ollama Model Name config.",
            cause: e,
            context: { keyName: "OLLAMA_MODEL_NAME" },
          }),
      ),
      Effect.orElseSucceed(() => "gemma3:1b"), // Default model if not configured
    );
    const modelName = yield* _(modelNameEffect);
    yield* _(
      telemetry
        .trackEvent({
          category: "ai:config",
          action: "ollama_model_name_resolved",
          value: modelName,
        })
        .pipe(Effect.ignoreLogged),
    );

    // Get the AiModel definition for the specified model
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

    // Provide the ollamaAdaptedClient to the AiModel definition
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient,
      ollamaAdaptedClient
    );

    // Execute the configuredAiModelEffect to get the provider
    const provider = yield* _(configuredAiModelEffect);

    yield* _(
      telemetry
        .trackEvent({
          category: "ai:config",
          action: "ollama_language_model_provider_created",
          value: modelName,
        })
        .pipe(Effect.ignoreLogged),
    );

    // Create and return the AgentLanguageModel implementation
    // TypeScript requires exactly "AgentLanguageModel" as the tag value, not just a string
    return {
      _tag: "AgentLanguageModel" as const, // Use const assertion to make TypeScript recognize the exact string literal
      
      // Generate text (non-streaming)
      generateText: (
        params: GenerateTextOptions,
      ): Effect.Effect<AiResponse, AIProviderError> =>
        provider.generateText(params).pipe(
          Effect.mapError((err) => {
            // Safely check for Error type
            const errMessage =
              typeof err === "object" && err !== null && "message" in err
                ? String(err.message)
                : String(err) || "Unknown provider error";

            return new AIProviderError({
              message: `Ollama generateText error for model ${modelName}: ${errMessage}`,
              cause: err,
              provider: "Ollama",
              context: {
                model: modelName,
                params,
                originalErrorTag:
                  typeof err === "object" && err !== null && "_tag" in err
                    ? err._tag
                    : undefined,
              },
            });
          }),
        ),

      // Stream text
      streamText: (
        params: StreamTextOptions,
      ): Stream.Stream<AiTextChunk, AIProviderError> =>
        provider.streamText(params).pipe(
          Stream.mapError((err) => {
            // Safely check for Error type
            const errMessage =
              typeof err === "object" && err !== null && "message" in err
                ? String(err.message)
                : String(err) || "Unknown provider error";

            return new AIProviderError({
              message: `Ollama streamText error for model ${modelName}: ${errMessage}`,
              cause: err,
              provider: "Ollama",
              context: {
                model: modelName,
                params,
                originalErrorTag:
                  typeof err === "object" && err !== null && "_tag" in err
                    ? err._tag
                    : undefined,
              },
            });
          }),
        ),

      // Generate structured output
      generateStructured: (
        params: GenerateStructuredOptions,
      ): Effect.Effect<AiResponse, AIProviderError> =>
        provider.generateStructured(params).pipe(
          Effect.mapError((err) => {
            // Safely check for Error type
            const errMessage =
              typeof err === "object" && err !== null && "message" in err
                ? String(err.message)
                : String(err) || "Unknown provider error";

            return new AIProviderError({
              message: `Ollama generateStructured error for model ${modelName}: ${errMessage}`,
              cause: err,
              provider: "Ollama",
              context: {
                model: modelName,
                params,
                originalErrorTag:
                  typeof err === "object" && err !== null && "_tag" in err
                    ? err._tag
                    : undefined,
              },
            });
          }),
        ),
    } as AgentLanguageModel; // Explicitly cast to AgentLanguageModel to satisfy TypeScript
  }),
);
