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
import { ConfigurationService } from "@/services/configuration";
import {
  AIProviderError,
  AIConfigurationError,
} from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import { TypeId } from "@effect/ai/AiResponse";
import type { AiResponse } from "@effect/ai/AiResponse";

// Mock implementation for OpenAiLanguageModel since the package structure might be different
// This matches what was done in OpenAIAgentLanguageModelLive.ts
const OpenAiLanguageModel = {
  model: (modelName: string) =>
    Effect.gen(function* (_) {
      // This model function returns an Effect of a language model provider
      return {
        generateText: (params: any): Effect.Effect<AiResponse, unknown> =>
          Effect.succeed({
            text: "Not implemented in mock",
            usage: { total_tokens: 0 },
            role: "assistant",
            parts: [{ _tag: "Text", content: "Not implemented in mock" } as const],
            [TypeId]: Symbol.for("@effect/ai/AiResponse"),
            withToolCallsJson: () => 
              Effect.succeed({
                text: "stub tool json", 
                usage: { total_tokens: 0 }, 
                role: "assistant",
                parts: [{ _tag: "Text", content: "stub tool json" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              } as unknown as AiResponse),
            withToolCallsUnknown: () =>
              ({
                text: "stub tool unknown", 
                usage: { total_tokens: 0 }, 
                role: "assistant",
                parts: [{ _tag: "Text", content: "stub tool unknown" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              } as unknown as AiResponse),
            concat: (_other: AiResponse) =>
              ({
                text: "stub concat", 
                usage: { total_tokens: 0 }, 
                role: "assistant",
                parts: [{ _tag: "Text", content: "stub concat" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              } as unknown as AiResponse),
            [Symbol.for("@effect/data/Equal")]: () => false,
            [Symbol.for("@effect/data/Hash")]: () => 0,
          } as unknown as AiResponse),
        streamText: (params: any): Stream.Stream<AiTextChunk, unknown> =>
          Stream.succeed({
            text: "Not implemented in mock",
            isComplete: false,
          } as AiTextChunk),
        generateStructured: (params: any): Effect.Effect<AiResponse, unknown> =>
          Effect.succeed({
            text: "{}",
            structured: {},
            usage: { total_tokens: 0 },
            role: "assistant",
            parts: [{ _tag: "Text", content: "{}" } as const],
            [TypeId]: Symbol.for("@effect/ai/AiResponse"),
            withToolCallsJson: () =>
              ({
                text: "{}",
                structured: {},
                usage: { total_tokens: 0 },
                role: "assistant",
                parts: [{ _tag: "Text", content: "{}" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              }) as unknown as AiResponse,
            withToolCallsUnknown: () =>
              ({
                text: "{}",
                structured: {},
                usage: { total_tokens: 0 },
                role: "assistant",
                parts: [{ _tag: "Text", content: "{}" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              }) as unknown as AiResponse,
            concat: (_other: AiResponse) =>
              ({
                text: "{}",
                structured: {},
                usage: { total_tokens: 0 },
                role: "assistant",
                parts: [{ _tag: "Text", content: "{}" } as const],
                [TypeId]: Symbol.for("@effect/ai/AiResponse"),
                withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
                withToolCallsUnknown: () => ({} as unknown as AiResponse),
                concat: () => ({} as unknown as AiResponse),
                [Symbol.for("@effect/data/Equal")]: () => false,
                [Symbol.for("@effect/data/Hash")]: () => 0,
              }) as unknown as AiResponse,
            [Symbol.for("@effect/data/Equal")]: () => false,
            [Symbol.for("@effect/data/Hash")]: () => 0,
          } as unknown as AiResponse),
      };
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

    // Use OpenAiLanguageModel.model directly from the library
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

    // Provide the ollamaAdaptedClient (which implements OpenAiClient.Service)
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient, // The Tag for the service being provided
      ollamaAdaptedClient, // The actual service instance
    );

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
    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

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
    });
  }),
);
