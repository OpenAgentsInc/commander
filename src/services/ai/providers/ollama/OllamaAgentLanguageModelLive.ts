// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Option } from "effect";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
  type AgentChatMessage,
} from "@/services/ai/core";

import type { AiResponse } from "@effect/ai/AiResponse";
import type { CreateChatCompletionResponse } from "@effect/ai-openai/Generated";
import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient";

import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";

type OpenAISystemMessage = {
  readonly role: "system";
  readonly content: string;
  readonly name?: string | null;
};

type OpenAIUserMessage = {
  readonly role: "user";
  readonly content: string;
  readonly name?: string | null;
};

type OpenAIAssistantMessage = {
  readonly role: "assistant";
  readonly content: string;
  readonly name?: string | null;
  readonly tool_calls?: readonly any[];
};

type OpenAIToolMessage = {
  readonly role: "tool";
  readonly content: string;
  readonly tool_call_id: string;
};

type OpenAIMessageTuple = readonly [
  OpenAISystemMessage,
  ...(OpenAIUserMessage | OpenAIAssistantMessage | OpenAIToolMessage)[],
];

type CreateChatCompletionRequestEncoded = {
  readonly model: string;
  readonly messages: OpenAIMessageTuple;
  readonly temperature?: number;
  readonly max_tokens?: number;
};

console.log(
  "Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)",
);

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    let modelName = "gemma3:1b";
    const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
    const configResult = yield* _(Effect.either(configGetEffect));

    if (configResult._tag === "Right") {
      modelName = configResult.right;
    } else {
      yield* _(
        telemetry
          .trackEvent({
            category: "ai:config:warn",
            action: "ollama_model_name_fetch_failed_using_default",
            label: "OLLAMA_MODEL_NAME",
            value: String(configResult.left?.message || configResult.left),
          })
          .pipe(Effect.ignoreLogged),
      );
    }
    yield* _(
      telemetry
        .trackEvent({
          category: "ai:config",
          action: "ollama_model_name_resolved",
          value: modelName,
        })
        .pipe(Effect.ignoreLogged),
    );

    yield* _(
      telemetry
        .trackEvent({
          category: "ai:config",
          action: "ollama_language_model_provider_created_direct_client",
          value: modelName,
        })
        .pipe(Effect.ignoreLogged),
    );

    const mapErrorToAIProviderError = (err: unknown, contextAction: string, params: any): AIProviderError => {
      let messageContent = "Unknown provider error";
      let causeContent: unknown = err;

      if (typeof err === 'object' && err !== null) {
        if ('_tag' in err && (err as any)._tag === "ResponseError") { // HttpClientError.ResponseError
          const responseError = err as any;
          messageContent = `HTTP error ${responseError.response?.status}: ${responseError.response?.body || responseError.message || String(err)}`;
          causeContent = responseError.cause || err;
        } else if (err instanceof Error) {
          messageContent = err.message;
          causeContent = err.cause || err;
        } else {
          messageContent = String(err);
        }
      } else {
        messageContent = String(err);
      }

      const finalMessage = `Ollama ${contextAction} error for model ${modelName}: ${messageContent}`;
      return new AIProviderError({
        message: finalMessage,
        cause: causeContent,
        provider: "Ollama",
        context: {
          model: modelName,
          params,
          originalErrorTag: (err as any)?._tag,
          originalErrorMessage: typeof err === 'object' && err !== null ? (err as any)?.message : undefined
        }
      });
    };

    const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
      try {
        const parsed = JSON.parse(promptString);
        if (parsed && Array.isArray(parsed.messages)) {
          return parsed.messages as AgentChatMessage[];
        }
      } catch (e) {
        // Not a JSON string of messages, or malformed
        console.warn("[OllamaAgentLanguageModelLive] Failed to parse prompt as JSON messages:", e);
      }
      // Fallback: treat the prompt string as a single user message
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    const mapToOpenAIMessages = (messages: AgentChatMessage[]): OpenAIMessageTuple => {
      // Find system message or create default one
      const foundSystemMessage = messages.find(msg => msg.role === "system");
      const systemMessage: OpenAISystemMessage = foundSystemMessage ? {
        role: "system" as const,
        content: foundSystemMessage.content || "",
        name: foundSystemMessage.name
      } : {
        role: "system" as const,
        content: "You are a helpful AI assistant."
      };

      // Map all non-system messages
      const otherMessages = messages
        .filter(msg => msg.role !== "system")
        .map(msg => ({
          role: msg.role as "user" | "assistant" | "tool",
          content: msg.content || "",
          name: msg.name,
          tool_calls: msg.tool_calls as any,
          tool_call_id: msg.tool_call_id,
        }));

      // Combine with system message first
      return [systemMessage, ...otherMessages] as unknown as OpenAIMessageTuple;
    };

    const createAiResponse = (text: string): AiResponse => {
      // Create a recursive type that matches AiResponse
      type RecursiveAiResponse = {
        text: string;
        imageUrl: Option.Option<never>;
        withToolCallsJson: () => Effect.Effect<RecursiveAiResponse>;
        withToolCallsUnknown: () => Effect.Effect<RecursiveAiResponse>;
        withFunctionCallJson: () => Effect.Effect<RecursiveAiResponse>;
        withFunctionCallUnknown: () => Effect.Effect<RecursiveAiResponse>;
        withJsonMode: () => Effect.Effect<RecursiveAiResponse>;
      };

      // Create the response object recursively
      const response: RecursiveAiResponse = {
        text,
        imageUrl: Option.none(),
        withToolCallsJson: () => Effect.succeed(response),
        withToolCallsUnknown: () => Effect.succeed(response),
        withFunctionCallJson: () => Effect.succeed(response),
        withFunctionCallUnknown: () => Effect.succeed(response),
        withJsonMode: () => Effect.succeed(response),
      };

      // Cast to AiResponse since our recursive type matches the interface
      return response as unknown as AiResponse;
    };

    const mapResponseToAiResponse = (
      response: CreateChatCompletionResponse,
    ): AiResponse => {
      const firstChoice = response.choices[0];
      const content = firstChoice?.message?.content || "";
      return createAiResponse(content);
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (
        params: GenerateTextOptions,
      ): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        return Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "ollama_adapter:nonstream",
                action: "create_start_invoking_client",
                label: request.model,
                value: JSON.stringify(request.messages),
              })
              .pipe(Effect.ignoreLogged),
          );

          const response = yield* _(
            ollamaAdaptedClient.client.createChatCompletion(request).pipe(
              Effect.tapError((err) =>
                Effect.sync(() =>
                  console.error("Ollama generateText internal error:", err),
                ),
              ),
              Effect.mapError((err) =>
                mapErrorToAIProviderError(err, "generateText", params),
              ),
            ),
          );

          return mapResponseToAiResponse(response);
        });
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        const messagesFromPrompt = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesFromPrompt);

        const streamRequest: StreamCompletionRequest = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        console.log(
          "[OllamaAgentLanguageModelLive.streamText] Invoking ollamaAdaptedClient.stream with:",
          JSON.stringify(streamRequest, null, 2),
        );

        return ollamaAdaptedClient.stream(streamRequest).pipe(
          Stream.tap(chunk => Effect.sync(() =>
            console.log("[OllamaAgentLanguageModelLive streamText] Pre-transform chunk:", JSON.stringify(chunk))
          )),
          Stream.map(
            (chunk) => {
              const text = chunk.text ? Option.getOrUndefined(chunk.text) || "" : "";
              console.log("[OllamaAgentLanguageModelLive streamText] Transformed chunk text:", text);
              return { text } as AiTextChunk;
            }
          ),
          Stream.tapError((err) =>
            Effect.sync(() => {
              console.error("[OllamaAgentLanguageModelLive streamText] Stream error:", err);
              console.error("[OllamaAgentLanguageModelLive streamText] Error details:", {
                message: err.message,
                cause: err.cause,
                stack: err.stack,
                httpStatus: (err as any).response?.status,
                responseBody: (err as any).response?.body
              });
            })
          ),
          Stream.mapError((err) =>
            mapErrorToAIProviderError(err, "streamText", params),
          ),
          Stream.tap(chunk => Effect.sync(() =>
            console.log("[OllamaAgentLanguageModelLive streamText] Yielding chunk:", JSON.stringify(chunk))
          ))
        );
      },

      generateStructured: (
        params: GenerateStructuredOptions,
      ): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        return Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "ollama_adapter:structured",
                action: "create_start_invoking_client",
                label: request.model,
                value: JSON.stringify(request.messages),
              })
              .pipe(Effect.ignoreLogged),
          );

          const response = yield* _(
            ollamaAdaptedClient.client.createChatCompletion(request).pipe(
              Effect.tapError((err) =>
                Effect.sync(() =>
                  console.error(
                    "Ollama generateStructured internal error:",
                    err,
                  ),
                ),
              ),
              Effect.mapError((err) =>
                mapErrorToAIProviderError(err, "generateStructured", params),
              ),
            ),
          );

          return mapResponseToAiResponse(response);
        });
      },
    });
  }),
);
