// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import { 
  AgentLanguageModel, 
  GenerateTextOptions, 
  StreamTextOptions, 
  GenerateStructuredOptions,
  AiTextChunk
} from "@/services/ai/core";
import { OpenAiClient } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";
import type { AiResponse } from "@effect/ai/AiResponse";

// Since OpenAiLanguageModel is not available in the current version of @effect/ai-openai,
// we'll create a simplified version that provides the same functionality
const createLanguageModel = (modelName: string, client: OpenAiClient.Service) => {
  return Effect.succeed({
    generateText: (params: any) => {
      return Effect.flatMap(
        client.client.chat.completions.create({
          model: modelName,
          messages: params.messages || [{ role: "user", content: params.prompt }],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens,
          stream: false
        }),
        (completion) => Effect.succeed({ 
          text: completion.choices[0]?.message?.content || "",
          usage: completion.usage
        })
      );
    },
    streamText: (params: any) => {
      return client.stream({
        model: modelName,
        messages: params.messages || [{ role: "user", content: params.prompt }],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens
      }).pipe(Stream.map(chunk => ({
        text: chunk.text.getOrElse(""),
        isComplete: false
      })));
    },
    generateStructured: (params: any) => {
      return Effect.flatMap(
        client.client.chat.completions.create({
          model: modelName,
          messages: [...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []), 
                    { role: "user", content: params.prompt }],
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens,
          response_format: { type: "json_object" },
          stream: false
        }),
        (completion) => {
          try {
            const text = completion.choices[0]?.message?.content || "{}";
            return Effect.succeed({ 
              text,
              structured: JSON.parse(text),
              usage: completion.usage
            });
          } catch (e) {
            return Effect.fail(new AIProviderError({
              message: `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`,
              provider: "Ollama",
              cause: e
            }));
          }
        }
      );
    }
  });
};

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
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

    // Use our custom language model factory with the Ollama adapter
    const configuredAiModelEffect = createLanguageModel(modelName, ollamaAdaptedClient);
    const provider = yield* _(configuredAiModelEffect);
    
    yield* _(telemetry.trackEvent({ 
      category: "ai:config", 
      action: "ollama_language_model_provider_created", 
      value: modelName 
    }).pipe(Effect.ignoreLogged));

    // Create and return the AgentLanguageModel implementation
    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel", 
      
      // Generate text (non-streaming)
      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> =>
        (provider as any).generateText(params).pipe(
          Effect.mapError(err => new AIProviderError({
            message: `Ollama generateText error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)?._tag }
          }))
        ),
      
      // Stream text
      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> =>
        (provider as any).streamText(params).pipe(
          Stream.mapError(err => new AIProviderError({
            message: `Ollama streamText error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)?._tag }
          }))
        ),
      
      // Generate structured output
      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> =>
        (provider as any).generateStructured(params).pipe(
          Effect.mapError(err => new AIProviderError({
            message: `Ollama generateStructured error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
            cause: err, 
            provider: "Ollama", 
            context: { model: modelName, params, originalErrorTag: (err as any)?._tag }
          }))
        ),
    });
  })
);