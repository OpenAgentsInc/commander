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

    try {
      // Create the OpenAI completions layer with our model configuration
      const completionsLayer = OpenAiCompletions.layerCompletions({
        model: modelName
      });
      
      console.log("Created OpenAiCompletions layer with model:", modelName);

      // Provide the Ollama adapter client to the completions layer
      const completionsWithClientLayer = Layer.provide(
        Layer.succeed(OpenAiClient.OpenAiClient, ollamaAdaptedClient),
        completionsLayer
      );
      
      console.log("Provided Ollama adapter client to completions layer");
      
      // Add this layer to our current context by making a scoped runtime
      // and running an effect with it to get the Completions service
      const scope = yield* _(Effect.scope);
      const runtime = yield* _(Layer.buildRuntime(completionsWithClientLayer).pipe(Effect.scoped));
      
      // Get the Completions service using the runtime directly
      const completionsService = Context.get(runtime.context, Completions);
      
      console.log("Got Completions service from context");

      yield* _(
        telemetry.trackEvent({
          category: "ai:config",
          action: "ollama_language_model_provider_created",
          value: modelName,
        }).pipe(Effect.ignoreLogged)
      );

      // Map errors from provider error to AIProviderError
      const mapErrorToAIProviderError = (err: any, contextAction: string, params: any) => {
        const detail = err.error || err;
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

      // Create the service implementation by adapting the completionsService
      const serviceImplementation: AgentLanguageModel = {
        _tag: "AgentLanguageModel" as const,
        
        // Adapt the generateText method
        generateText: (params: GenerateTextOptions) => {
          console.log("Ollama generateText called with params:", params);
          return Effect.tryPromise({
            try: async () => {
              // Call the completions service's create method
              const response = await Effect.runPromise(
                runtime.run(completionsService.create(params.prompt))
              );
              return response as AiResponse;
            },
            catch: (error) => mapErrorToAIProviderError(error, "generateText", params)
          });
        },
        
        // Adapt the streamText method
        streamText: (params: StreamTextOptions) => {
          console.log("Ollama streamText called with params:", params);
          try {
            // Use the runtime to run the stream method
            const stream = Stream.unwrapScoped(
              Effect.map(
                runtime.run(completionsService.stream(params.prompt)),
                stream => stream
              )
            );
            
            // Convert the stream to AiTextChunk format
            return stream.pipe(
              Stream.map(chunk => {
                const textChunk: AiTextChunk = {
                  text: chunk.text || ""
                };
                return textChunk;
              }),
              Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
            );
          } catch (error) {
            return Stream.fail(mapErrorToAIProviderError(error, "streamText", params));
          }
        },
        
        // Adapt the generateStructured method
        generateStructured: (params: GenerateStructuredOptions) => {
          console.log("Ollama generateStructured called with params:", params);
          return Effect.tryPromise({
            try: async () => {
              // Call the completions service's create method with the schema
              const response = await Effect.runPromise(
                runtime.run(completionsService.create(params.prompt))
              );
              return response as AiResponse;
            },
            catch: (error) => mapErrorToAIProviderError(error, "generateStructured", params)
          });
        }
      };
      
      // Return the service implementation
      return serviceImplementation;
    } catch (error) {
      console.error("Critical error in OllamaAgentLanguageModelLive:", error);
      throw error;
    }
  })
);