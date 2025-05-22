// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  AiTextChunk,
} from "@/services/ai/core";
import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"; 
import type { ConfigError } from "effect/ConfigError";
import { ConfigurationService } from "@/services/configuration";
import {
  AIProviderError,
  AIConfigurationError,
} from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import type { AiLanguageModel as EffectAiLanguageModel } from "@effect/ai/AiLanguageModel";
import type { AiResponse } from "@effect/ai/AiResponse";
import type { Provider, AiModel } from "@effect/ai/AiModel";

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
          category: "ai:config:warn", // Changed to warn as we are using a default
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

    // --- USE REAL LIBRARY and CORRECT RESOLUTION ---
    // 1. Get the AiModel definition Effect from the library
    const aiModelEffectDefinition = OpenAiCompletions.OpenAiLanguageModel.model(modelName);
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
    const aiModel: AiModel<EffectAiLanguageModel, OpenAiClient.Service> = yield* _(configuredAiModelEffect);
    // Type: AiModel<EffectAiLanguageModel, OpenAiClient.Service>
    // (which is also: Effect<Provider<EffectAiLanguageModel>, ConfigError, never>)

    // 4. Execute the AiModel (which is an Effect) to get the actual Provider
    const provider: Provider<EffectAiLanguageModel> = yield* _(aiModel);
    // Type: Provider<EffectAiLanguageModel>
    // --- END OF REAL LIBRARY USAGE AND RESOLUTION ---

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    // Map errors from library error to AIProviderError
    const mapErrorToAIProviderError = (err: any, contextAction: string, params: any) => {
      const detail = err.error || err; // Try to get underlying error if it has an 'error' field
      return new AIProviderError({
        message: `Ollama ${contextAction} error: ${detail?.message || String(detail) || "Unknown provider error"}`,
        cause: detail?.cause || detail, // Prefer cause if available
        provider: "Ollama",
        context: { 
          model: modelName, 
          params,
          originalErrorTag: detail?._tag, 
          originalErrorMessage: detail?.message 
        }
      });
    };

    // The 'provider' variable should now be correctly typed and instantiated by the real library logic.
    const serviceImplementation: AgentLanguageModel = {
      _tag: "AgentLanguageModel" as const,
      
      generateText: (params) => {
        try {
          // Check if provider is defined
          if (!provider) {
            console.error("SUT Error: provider is undefined");
            return Effect.die(new TypeError("SUT Error: provider is undefined"));
          }
          
          // Check if generateText method exists
          if (typeof provider.generateText !== 'function') {
            console.error("SUT Error: provider.generateText is not a function. Provider:", provider);
            return Effect.die(new TypeError("SUT Error: provider.generateText is not a function"));
          }

          const effect = provider.generateText(params);
          
          // Check if effect is a valid Effect with pipe method
          if (!effect || typeof effect.pipe !== 'function') {
            console.error("SUT Error: provider.generateText did not return a valid Effect. Provider:", provider, "Params:", params);
            return Effect.die(new TypeError("SUT Error: generateText is not a valid Effect from provider"));
          }
          
          return effect.pipe(
            Effect.mapError((err) => mapErrorToAIProviderError(err, "generateText", params))
          );
        } catch (err) {
          // If something goes wrong, return a failed effect with AIProviderError
          console.error("SUT Exception in generateText:", err);
          return Effect.fail(new AIProviderError({
            message: `Ollama generateText error for model ${modelName}: ${String(err)}`,
            cause: err,
            provider: "Ollama",
            context: {
              model: modelName,
              params,
            },
          }));
        }
      },
      
      streamText: (params) => {
        try {
          // Check if provider is defined
          if (!provider) {
            console.error("SUT Error: provider is undefined");
            return Stream.die(new TypeError("SUT Error: provider is undefined"));
          }
          
          // Check if streamText method exists
          if (typeof provider.streamText !== 'function') {
            console.error("SUT Error: provider.streamText is not a function. Provider:", provider);
            return Stream.die(new TypeError("SUT Error: provider.streamText is not a function"));
          }

          const stream = provider.streamText(params);
          
          // Check if stream is a valid Stream with pipe method
          if (!stream || typeof stream.pipe !== 'function') {
            console.error("SUT Error: provider.streamText did not return a valid Stream. Provider:", provider, "Params:", params);
            return Stream.die(new TypeError("SUT Error: streamText is not a valid Stream from provider"));
          }
          
          return stream.pipe(
            Stream.mapError((err) => mapErrorToAIProviderError(err, "streamText", params))
          );
        } catch (err) {
          // If something goes wrong, return a failed stream with AIProviderError
          console.error("SUT Exception in streamText:", err);
          return Stream.fail(new AIProviderError({
            message: `Ollama streamText error for model ${modelName}: ${String(err)}`,
            cause: err,
            provider: "Ollama",
            context: {
              model: modelName,
              params,
            },
          }));
        }
      },
      
      generateStructured: (params) => {
        try {
          // Check if provider is defined
          if (!provider) {
            console.error("SUT Error: provider is undefined");
            return Effect.die(new TypeError("SUT Error: provider is undefined"));
          }
          
          // Check if generateStructured method exists
          if (typeof provider.generateStructured !== 'function') {
            console.error("SUT Error: provider.generateStructured is not a function. Provider:", provider);
            return Effect.die(new TypeError("SUT Error: provider.generateStructured is not a function"));
          }

          const effect = provider.generateStructured(params);
          
          // Check if effect is a valid Effect with pipe method
          if (!effect || typeof effect.pipe !== 'function') {
            console.error("SUT Error: provider.generateStructured did not return a valid Effect. Provider:", provider, "Params:", params);
            return Effect.die(new TypeError("SUT Error: generateStructured is not a valid Effect from provider"));
          }
          
          return effect.pipe(
            Effect.mapError((err) => mapErrorToAIProviderError(err, "generateStructured", params))
          );
        } catch (err) {
          // If something goes wrong, return a failed effect with AIProviderError
          console.error("SUT Exception in generateStructured:", err);
          return Effect.fail(new AIProviderError({
            message: `Ollama generateStructured error for model ${modelName}: ${String(err)}`,
            cause: err,
            provider: "Ollama",
            context: {
              model: modelName,
              params,
            },
          }));
        }
      },
    };
    
    return serviceImplementation;
  }),
);