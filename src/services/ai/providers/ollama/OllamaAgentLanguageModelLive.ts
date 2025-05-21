// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import { 
  AgentLanguageModel, 
  GenerateTextOptions, 
  StreamTextOptions, 
  GenerateStructuredOptions,
  AiTextChunk
} from "@/services/ai/core";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import type { AiResponse } from "@effect/ai/AiResponse";

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function*(_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    // Get the Ollama model name from config, with a default fallback
    const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gemma3:1b"), // Default model if not configured
      Effect.tapError(e => telemetry.trackEvent({
        category: "ai:config:error", 
        action: "ollama_model_name_fetch_failed", 
        label: "OLLAMA_MODEL_NAME", 
        value: (e as Error).message || String(e)
      }).pipe(Effect.ignoreLogged)),
      Effect.mapError(e => new AIConfigurationError({
        message: "Error fetching Ollama Model Name.", 
        cause: e, 
        context: { keyName: "OLLAMA_MODEL_NAME" }
      }))
    );
    const modelName = yield* _(modelNameEffect);
    yield* _(telemetry.trackEvent({ 
      category: "ai:config", 
      action: "ollama_model_name_resolved", 
      value: modelName 
    }).pipe(Effect.ignoreLogged));

    // Use the standard OpenAI model factory with our adapter
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient,
      ollamaAdaptedClient
    );
    const provider = yield* _(configuredAiModelEffect);
    
    yield* _(telemetry.trackEvent({ 
      category: "ai:config", 
      action: "ollama_language_model_provider_created", 
      value: modelName 
    }).pipe(Effect.ignoreLogged));

    // Create and return the AgentLanguageModel implementation
    return AgentLanguageModel.Tag.of({
      _tag: "AgentLanguageModel", 
      
      // Generate text (non-streaming)
      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> =>
        (provider as any).generateText(params).pipe(
          Effect.mapError(err => new AIProviderError({
            message: `Ollama generateText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)._tag }
          }))
        ),
      
      // Stream text
      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> =>
        (provider as any).streamText(params).pipe(
          Stream.mapError(err => new AIProviderError({
            message: `Ollama streamText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)._tag }
          }))
        ),
      
      // Generate structured output
      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> =>
        (provider as any).generateStructured(params).pipe(
          Effect.mapError(err => new AIProviderError({
            message: `Ollama generateStructured error for model ${modelName}: ${err.message || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)._tag }
          }))
        ),
    });
  })
);