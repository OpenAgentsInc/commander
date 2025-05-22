// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
} from "@/services/ai/core";
import * as OpenAiClient from "@effect/ai-openai/OpenAiClient";
import * as OpenAiCompletions from "@effect/ai-openai/OpenAiCompletions";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";

// Log when this module is loaded
console.log("Loading OllamaAgentLanguageModelLive module (Effect-based implementation)");

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is an instance of OpenAiClient.Service
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

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

    try {
      // Get and use the OpenAI Language Model layer factory
      // This provides an AiLanguageModel service that we can wrap
      console.log("Using OpenAiCompletions.layerCompletions to create AiLanguageModel layer");
      
      const aiModelLayer = OpenAiCompletions.layerCompletions({
        model: modelName,
        temperature: 0.7,
        maxTokens: 1000
      });
      
      console.log("Created aiModelLayer with model:", modelName);
      
      // Provide the Ollama adapter client to the layer
      const aiModelLayerWithClient = aiModelLayer.pipe(
        Layer.provide(Layer.succeed(OpenAiClient.OpenAiClient, ollamaAdaptedClient))
      );
      
      console.log("Provided ollamaAdaptedClient to aiModelLayer");
      
      // Build a context with our AiLanguageModel implementation
      // This temporarily creates a runtime with the layer
      const runtime = yield* _(Effect.runtime<never>());
      const context = yield* _(Layer.buildWithRuntime(aiModelLayerWithClient, runtime));
      
      console.log("Built context with aiModelLayerWithClient");
      
      // Get the AiLanguageModel service from the context
      // The service tag isn't directly exposed, so we access it via Effect.contextWith
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiLanguageModelTag = (OpenAiCompletions as any).AiLanguageModel ?? 
                               (OpenAiCompletions as any).OpenAiCompletions ??
                               (OpenAiCompletions as any).OpenAiLanguageModel;
      
      if (!aiLanguageModelTag) {
        console.error("Could not find AiLanguageModel tag in OpenAiCompletions");
        throw new Error("Could not find AiLanguageModel tag in OpenAiCompletions");
      }
      
      // Get the provider from the context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = Context.get(context, aiLanguageModelTag as any);
      
      console.log("Got provider from context");

      yield* _(
        telemetry.trackEvent({
          category: "ai:config",
          action: "ollama_language_model_provider_created",
          value: modelName,
        }).pipe(Effect.ignoreLogged)
      );

      // Map errors from library error to AIProviderError
      const mapErrorToAIProviderError = (err: any, contextAction: string, params: any) => {
        const detail = err.error || err; // Often errors have an 'error' field for the underlying cause
        return new AIProviderError({
          message: `Ollama ${contextAction} error for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`,
          cause: detail?.cause || detail,
          provider: "Ollama",
          context: { 
            model: modelName, 
            params, 
            originalErrorTag: detail?._tag, 
            originalErrorMessage: detail?.message 
          }
        });
      };

      // Return the implementation of our AgentLanguageModel interface
      const serviceImplementation: AgentLanguageModel = {
        _tag: "AgentLanguageModel" as const,
        generateText: (params: GenerateTextOptions) => 
          provider.generateText(params).pipe(
            Effect.mapError(err => mapErrorToAIProviderError(err, "generateText", params))
          ),
        streamText: (params: StreamTextOptions) => 
          provider.streamText(params).pipe(
            Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
          ),
        generateStructured: (params: GenerateStructuredOptions) => 
          provider.generateStructured(params).pipe(
            Effect.mapError(err => mapErrorToAIProviderError(err, "generateStructured", params))
          )
      };
      
      return serviceImplementation;
    } catch (error) {
      console.error("Critical error in OllamaAgentLanguageModelLive:", error);
      throw error;
    }
  })
);