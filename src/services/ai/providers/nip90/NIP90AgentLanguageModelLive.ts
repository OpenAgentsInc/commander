// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
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
import { AIProviderError } from "@/services/ai/core/AIError";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "./NIP90ProviderConfig";
import { generateSecretKey } from "nostr-tools/pure";

// Log when this module is loaded
console.log("Loading NIP90AgentLanguageModelLive module");

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    // Get required services
    const nip90Service = yield* _(NIP90Service);
    const nostrService = yield* _(NostrService);
    const nip04Service = yield* _(NIP04Service);
    const telemetry = yield* _(TelemetryService);
    const dvmConfig = yield* _(NIP90ProviderConfigTag);

    const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
      try {
        const parsed = JSON.parse(promptString);
        if (parsed && Array.isArray(parsed.messages)) {
          return parsed.messages as AgentChatMessage[];
        }
      } catch (e) {
        // Not a JSON string of messages, or malformed
      }
      // Fallback: treat the prompt string as a single user message
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    const formatPromptForDVM = (messages: AgentChatMessage[]): string => {
      // For now, a simple concatenation. This can be made more sophisticated based on DVM requirements
      return messages
        .map(msg => {
          switch (msg.role) {
            case "system":
              return `Instructions: ${msg.content}\n\n`;
            case "assistant":
              return `Assistant: ${msg.content}\n`;
            case "user":
              return `User: ${msg.content}\n`;
            case "tool":
              return `Tool (${msg.tool_call_id}): ${msg.content}\n`;
            default:
              return `${msg.content}\n`;
          }
        })
        .join("");
    };

    const createAiResponse = (text: string): AiResponse => {
      type RecursiveAiResponse = {
        text: string;
        imageUrl: Option.Option<never>;
        withToolCallsJson: () => Effect.Effect<RecursiveAiResponse>;
        withToolCallsUnknown: () => Effect.Effect<RecursiveAiResponse>;
        withFunctionCallJson: () => Effect.Effect<RecursiveAiResponse>;
        withFunctionCallUnknown: () => Effect.Effect<RecursiveAiResponse>;
        withJsonMode: () => Effect.Effect<RecursiveAiResponse>;
      };

      const response: RecursiveAiResponse = {
        text,
        imageUrl: Option.none(),
        withToolCallsJson: () => Effect.succeed(response),
        withToolCallsUnknown: () => Effect.succeed(response),
        withFunctionCallJson: () => Effect.succeed(response),
        withFunctionCallUnknown: () => Effect.succeed(response),
        withJsonMode: () => Effect.succeed(response),
      };

      return response as unknown as AiResponse;
    };

    const generateEphemeralKeyPair = () => {
      const sk = generateSecretKey();
      const pk = nostrService.getPublicKey(sk);
      return { sk, pk };
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
        return Effect.gen(function* (_) {
          const messagesPayload = parsePromptMessages(params.prompt);
          const formattedPrompt = formatPromptForDVM(messagesPayload);

          // Generate ephemeral keypair if configured
          const { sk: requestSk, pk: requestPk } = dvmConfig.useEphemeralRequests
            ? generateEphemeralKeyPair()
            : { sk: "", pk: "" }; // TODO: Get from wallet if not using ephemeral

          // Prepare NIP-90 inputs and params
          const inputs = [["text", formattedPrompt]];
          const additionalParams = [
            ["param", "model", dvmConfig.modelIdentifier || "default"],
            ...(params.temperature ? [["param", "temperature", params.temperature.toString()]] : []),
            ...(params.maxTokens ? [["param", "max_tokens", params.maxTokens.toString()]] : []),
          ];

          // Create job request
          const jobRequest = yield* _(
            nip90Service.createJobRequest({
              targetDvmPubkeyHex: dvmConfig.dvmPubkey,
              requestKind: dvmConfig.requestKind,
              inputs,
              params: additionalParams,
              requesterSk: requestSk,
              requiresEncryption: dvmConfig.requiresEncryption,
            })
          );

          // Wait for result
          const result = yield* _(
            nip90Service.getJobResult({
              jobRequestEventId: jobRequest.id,
              decryptionKey: requestSk,
              targetDvmPubkeyHex: dvmConfig.dvmPubkey,
              resultKind: dvmConfig.requestKind + 1000,
              relays: dvmConfig.dvmRelays,
            })
          );

          return createAiResponse(result.content || "");
        }).pipe(
          Effect.mapError(err => new AIProviderError({
            message: `NIP-90 generateText error: ${err instanceof Error ? err.message : String(err)}`,
            provider: "NIP90",
            cause: err,
          }))
        );
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        return Stream.asyncScoped<AiTextChunk, AIProviderError>((emit) => {
          const program = Effect.gen(function* (_) {
            const messagesPayload = parsePromptMessages(params.prompt);
            const formattedPrompt = formatPromptForDVM(messagesPayload);

            // Generate ephemeral keypair if configured
            const { sk: requestSk, pk: requestPk } = dvmConfig.useEphemeralRequests
              ? generateEphemeralKeyPair()
              : { sk: "", pk: "" }; // TODO: Get from wallet if not using ephemeral

            // Prepare NIP-90 inputs and params
            const inputs = [["text", formattedPrompt]];
            const additionalParams = [
              ["param", "model", dvmConfig.modelIdentifier || "default"],
              ...(params.temperature ? [["param", "temperature", params.temperature.toString()]] : []),
              ...(params.maxTokens ? [["param", "max_tokens", params.maxTokens.toString()]] : []),
            ];

            // Create job request
            const jobRequest = yield* _(
              nip90Service.createJobRequest({
                targetDvmPubkeyHex: dvmConfig.dvmPubkey,
                requestKind: dvmConfig.requestKind,
                inputs,
                params: additionalParams,
                requesterSk: requestSk,
                requiresEncryption: dvmConfig.requiresEncryption,
              })
            );

            // Subscribe to job updates
            const unsubscribe = yield* _(
              nip90Service.subscribeToJobUpdates({
                jobRequestEventId: jobRequest.id,
                decryptionKey: requestSk,
                targetDvmPubkeyHex: dvmConfig.dvmPubkey,
                resultKind: dvmConfig.requestKind + 1000,
                relays: dvmConfig.dvmRelays,
                onFeedback: (feedback) => {
                  if (feedback.status === "partial" && feedback.content) {
                    emit.single({ text: feedback.content });
                  } else if (feedback.status === "error") {
                    emit.fail(
                      new AIProviderError({
                        message: `NIP-90 DVM error: ${feedback.content || "Unknown error"}`,
                        provider: "NIP90",
                        context: { jobId: jobRequest.id, status: feedback.status },
                      })
                    );
                  }
                },
                onResult: (result) => {
                  if (result.content) {
                    emit.single({ text: result.content });
                  }
                  emit.end();
                },
                onError: (error) => {
                  emit.fail(
                    new AIProviderError({
                      message: `NIP-90 subscription error: ${error instanceof Error ? error.message : String(error)}`,
                      provider: "NIP90",
                      cause: error,
                      context: { jobId: jobRequest.id },
                    })
                  );
                },
              })
            );

            return unsubscribe;
          });

          return program;
        });
      },

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
        return Effect.fail(
          new AIProviderError({
            message: "generateStructured not supported by NIP-90 provider",
            provider: "NIP90",
          })
        );
      },
    });
  })
);
