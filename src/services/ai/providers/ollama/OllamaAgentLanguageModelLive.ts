// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  AiTextChunk,
} from "@/services/ai/core";
import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"; // Ensure OpenAiCompletions is imported
import type { ConfigError } from "effect/ConfigError";
import { ConfigurationService } from "@/services/configuration";
import {
  AIProviderError,
  AIConfigurationError,
} from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import type { AiResponse } from "@effect/ai/AiResponse";

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    // Get the Ollama model name from config, with a default fallback
    let modelName = "gemma3:1b"; // Default model
    const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
    const configResult = yield* _(Effect.either(configGetEffect));

    if (configResult._tag === 'Right') {
      modelName = configResult.right;
    } else {
      yield* _(
        telemetry.trackEvent({
          category: "ai:config:error",
          action: "ollama_model_name_fetch_failed_raw",
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

    // --- USE REAL LIBRARY and CORRECT RESOLUTION ---
    // 1. Get the AiModel definition Effect from the library
    const aiModelEffectDefinition = OpenAiCompletions.model(modelName);
    // Type: Effect<AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, OpenAiClient.Service>

    // 2. Provide the required client (your ollamaAdaptedClient) to this AiModel definition Effect
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient, // The Tag for the service OpenAiLanguageModel.model needs
      ollamaAdaptedClient         // Your implementation that satisfies OpenAiClient.OpenAiClient
    );
    // Type: Effect<AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, never>

    // 3. Execute the configuredAiModelEffect to get the AiModel instance.
    // An AiModel is an Effect that, when run, yields a Provider.
    const aiModel = yield* _(configuredAiModelEffect);
    // Type: AiModel<EffectAiLanguageModel, OpenAiClient.Service>
    // (which is also: Effect<Provider<EffectAiLanguageModel>, ConfigError, never>)

    // 4. Execute the AiModel (which is an Effect) to get the actual Provider
    const provider = yield* _(aiModel);
    // Type: Provider<EffectAiLanguageModel>
    // --- END OF REAL LIBRARY USAGE AND RESOLUTION ---

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    // The 'provider' variable should now be correctly typed and instantiated by the real library logic.
    const serviceImplementation: AgentLanguageModel = {
      _tag: "AgentLanguageModel" as const,
      
      generateText: (params) => provider.generateText(params).pipe(
        Effect.mapError((err) => { // `err` here will be an AiError from @effect/ai-openai
          const aiError = err as any; // Cast to access potential properties like _tag or cause
          return new AIProviderError({
            message: `Ollama generateText error for model ${modelName}: ${aiError?.message || String(aiError) || "Unknown provider error"}`,
            cause: aiError.cause || aiError, // Prefer cause if AiError has it
            provider: "Ollama",
            context: { model: modelName, params, originalErrorTag: aiError?._tag }
          });
        })
      ),
      
      streamText: (params) => provider.streamText(params).pipe(
        Stream.mapError((err) => { // `err` here will be an AiError
          const aiError = err as any;
          return new AIProviderError({
            message: `Ollama streamText error: ${aiError?.message || String(aiError) || "Unknown provider error"}`,
            cause: aiError.cause || aiError,
            provider: "Ollama",
            context: { model: modelName, params, originalErrorTag: aiError?._tag }
          });
        })
      ),
      
      generateStructured: (params) => provider.generateStructured(params).pipe(
        Effect.mapError((err) => { // `err` here will be an AiError
          const aiError = err as any;
          return new AIProviderError({
            message: `Ollama generateStructured error: ${aiError?.message || String(aiError) || "Unknown provider error"}`,
            cause: aiError.cause || aiError,
            provider: "Ollama",
            context: { model: modelName, params, originalErrorTag: aiError?._tag }
          });
        })
      ),
    };
    
    return serviceImplementation;
  }),
);