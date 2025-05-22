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
import { OpenAiClient } from "@effect/ai-openai";
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "@effect/ai-openai/Generated";
import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient";

import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { TelemetryService } from "@/services/telemetry";

// Define OpenAI message type to match the expected readonly structure
type OpenAIMessage = {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly name?: string | null;
  readonly tool_calls?: readonly any[];
  readonly tool_call_id?: string;
};

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

type OpenAIMessageTuple = readonly [OpenAISystemMessage, ...(OpenAIUserMessage | OpenAIAssistantMessage | OpenAIToolMessage)[]];

type CreateChatCompletionRequestEncoded = {
  readonly model: string;
  readonly messages: OpenAIMessageTuple;
  readonly temperature?: number;
  readonly max_tokens?: number;
};

console.log("Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)");

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    let modelName = "gemma3:1b";
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

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created_direct_client",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    const mapErrorToAIProviderError = (err: unknown, contextAction: string, params: any): AIProviderError => {
      const detail = (err as any)?.error || (err as any)?.cause || err;
      let message = `Ollama ${contextAction} error for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;

      if (typeof err === 'object' && err !== null && '_tag' in err && (err as any)._tag === "ResponseError") {
        const responseStatus = (err as any).response?.status;
        if (responseStatus) {
          message = `Ollama ${contextAction} HTTP error ${responseStatus} for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;
        }
      }

      return new AIProviderError({
        message: message,
        cause: detail,
        provider: "Ollama",
        context: { model: modelName, params, originalErrorTag: (detail as any)?._tag, originalErrorMessage: detail?.message }
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
      }
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    const mapToOpenAIMessages = (messages: AgentChatMessage[]): OpenAIMessageTuple => {
      // Ensure at least one system message exists
      const systemMessage: OpenAISystemMessage = {
        role: "system",
        content: "You are a helpful AI assistant.",
      };

      const mappedMessages = messages.map(msg => {
        switch (msg.role) {
          case "system":
            return {
              role: "system",
              content: msg.content || "",
              name: msg.name || null,
            } as OpenAISystemMessage;
          case "user":
            return {
              role: "user",
              content: msg.content || "",
              name: msg.name || null,
            } as OpenAIUserMessage;
          case "assistant":
            return {
              role: "assistant",
              content: msg.content || "",
              name: msg.name || null,
              tool_calls: msg.tool_calls as readonly any[] | undefined,
            } as OpenAIAssistantMessage;
          case "tool":
            return {
              role: "tool",
              content: msg.content || "",
              tool_call_id: msg.tool_call_id || "",
            } as OpenAIToolMessage;
          default:
            return {
              role: "user",
              content: msg.content || "",
              name: msg.name || null,
            } as OpenAIUserMessage;
        }
      });

      // Ensure first message is system message
      const hasSystemMessage = mappedMessages.some(msg => msg.role === "system");
      const finalMessages = hasSystemMessage ? mappedMessages : [systemMessage, ...mappedMessages];

      // Type assertion here is safe because we ensure there's always a system message first
      return finalMessages as unknown as OpenAIMessageTuple;
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

    const mapResponseToAiResponse = (response: CreateChatCompletionResponse): AiResponse => {
      const firstChoice = response.choices[0];
      const content = firstChoice?.message?.content || "";
      return createAiResponse(content);
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        return Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "ollama_adapter:nonstream",
            action: "create_start_invoking_client",
            label: request.model,
            value: JSON.stringify(request.messages)
          }).pipe(Effect.ignoreLogged));

          const response = yield* _(ollamaAdaptedClient.client.createChatCompletion(request).pipe(
            Effect.tapError(err => Effect.sync(() => console.error("Ollama generateText internal error:", err))),
            Effect.mapError(err => mapErrorToAIProviderError(err, "generateText", params))
          ));

          return mapResponseToAiResponse(response);
        });
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const streamRequest: StreamCompletionRequest = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        console.log("[OllamaAgentLanguageModelLive.streamText] Invoking ollamaAdaptedClient.stream with:", JSON.stringify(streamRequest, null, 2));

        return ollamaAdaptedClient.stream(streamRequest).pipe(
          Stream.map(chunk => ({
            text: chunk.text ? Option.getOrUndefined(chunk.text) || "" : ""
          } as AiTextChunk)),
          Stream.tapError(err => Effect.sync(() => console.error("Ollama streamText internal error:", err))),
          Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
        );
      },

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        return Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "ollama_adapter:structured",
            action: "create_start_invoking_client",
            label: request.model,
            value: JSON.stringify(request.messages)
          }).pipe(Effect.ignoreLogged));

          const response = yield* _(ollamaAdaptedClient.client.createChatCompletion(request).pipe(
            Effect.tapError(err => Effect.sync(() => console.error("Ollama generateStructured internal error:", err))),
            Effect.mapError(err => mapErrorToAIProviderError(err, "generateStructured", params))
          ));

          return mapResponseToAiResponse(response);
        });
      }
    });
  })
);
