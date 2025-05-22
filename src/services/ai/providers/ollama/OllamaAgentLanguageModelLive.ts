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
// This implementation follows the two-step structure of the real library
const OpenAiLanguageModel = {
  model: (modelName: string): Effect.Effect<
    // This is the Effect that AiModel resolves to, which is Provider<Service>
    Effect.Effect<{
      generateText: (params: GenerateTextOptions) => Effect.Effect<AiResponse, AIProviderError>;
      streamText: (params: StreamTextOptions) => Stream.Stream<AiTextChunk, AIProviderError>;
      generateStructured: (params: GenerateStructuredOptions) => Effect.Effect<AiResponse, AIProviderError>;
    }, never, never>,
    ConfigError, 
    never        
  > => {
    // Define the provider instance with concrete methods
    // Using type annotations to ensure TypeScript understands the structure
    const mockProviderInstance: {
      generateText: (params: GenerateTextOptions) => Effect.Effect<AiResponse, AIProviderError>;
      streamText: (params: StreamTextOptions) => Stream.Stream<AiTextChunk, AIProviderError>;
      generateStructured: (params: GenerateStructuredOptions) => Effect.Effect<AiResponse, AIProviderError>;
    } = {
      // Directly define the functions to return Effect/Stream
      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> =>
        Effect.succeed({
          text: `SUT Mock: generateText for ${modelName}, prompt: "${params.prompt}"`,
          usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
          role: "assistant",
          parts: [{ _tag: "Text", content: `SUT Mock: generateText for ${modelName}` } as const],
          imageUrl: null,
          withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
          withToolCallsUnknown: () => Effect.succeed({} as unknown as AiResponse),
          concat: () => Effect.succeed({} as unknown as AiResponse),
        } as unknown as AiResponse),

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> =>
        Stream.fromIterable([
          { text: `SUT Mock: Stream chunk 1 for ${modelName} (${params.prompt?.substring(0,10) || ""}...) ` } as AiTextChunk,
          { text: `SUT Mock: Stream chunk 2` } as AiTextChunk
        ]),

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> =>
        Effect.succeed({
          text: `SUT Mock: {"model": "${modelName}", "structure": "mock", "prompt": "${params.prompt}"}`,
          structured: { model: modelName, structure: "mock", prompt: params.prompt },
          usage: { total_tokens: 15, prompt_tokens: 7, completion_tokens: 8 },
          role: "assistant",
          parts: [{ _tag: "Text", content: `SUT Mock: {"model": "${modelName}"}` } as const],
          imageUrl: null,
          withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
          withToolCallsUnknown: () => Effect.succeed({} as unknown as AiResponse),
          concat: () => Effect.succeed({} as unknown as AiResponse),
        } as unknown as AiResponse),
    };

    // The actual @effect/ai-openai OpenAiLanguageModel.model returns Effect<AiModel<...>>
    // AiModel<...> is itself an Effect<Provider<...>>
    // To mock this two-step process correctly:
    return Effect.succeed(Effect.succeed(mockProviderInstance));
  }
};

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

    // Get the AiModel definition for the specified model
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);
    
    // Provide the ollamaAdaptedClient to the AiModel definition
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient,
      ollamaAdaptedClient
    );
    
    // First yield gets the AiModel, which is an Effect of a Provider
    const aiModel_from_effect = yield* _(configuredAiModelEffect);
    
    // Second yield resolves the Provider from the AiModel
    const provider = yield* _(aiModel_from_effect);

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    // Create and return the AgentLanguageModel implementation
    const serviceImplementation: AgentLanguageModel = {
      _tag: "AgentLanguageModel" as const,
      
      // Generate text (non-streaming)
      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
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
            Effect.mapError((err: any) => new AIProviderError({
              message: `Ollama generateText error: ${err?.message || String(err) || "Unknown"}`,
              cause: err,
              provider: "Ollama",
              context: {
                model: modelName,
                params,
                originalErrorTag: err && typeof err === 'object' && '_tag' in err ? err._tag : undefined
              }
            }))
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

      // Stream text
      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
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
            Stream.mapError((err: any) => new AIProviderError({
              message: `Ollama streamText error: ${err?.message || String(err) || "Unknown"}`,
              cause: err,
              provider: "Ollama",
              context: {
                model: modelName,
                params,
                originalErrorTag: err && typeof err === 'object' && '_tag' in err ? err._tag : undefined
              }
            }))
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

      // Generate structured output
      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
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
            Effect.mapError((err: any) => new AIProviderError({
              message: `Ollama generateStructured error: ${err?.message || String(err) || "Unknown"}`,
              cause: err, 
              provider: "Ollama", 
              context: {
                model: modelName,
                params,
                originalErrorTag: err && typeof err === 'object' && '_tag' in err ? err._tag : undefined
              }
            }))
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
