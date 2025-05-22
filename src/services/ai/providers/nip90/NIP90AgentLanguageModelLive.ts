// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
import { Layer, Effect, Stream, Option } from "effect";
import { generatePrivateKey, getPublicKey } from "nostr-tools/pure";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
  type AgentChatMessage,
} from "@/services/ai/core";
import type { AiResponse } from "@effect/ai/AiResponse";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "./NIP90ProviderConfig";

console.log("Loading NIP90AgentLanguageModelLive module");

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const nip90Service = yield* _(NIP90Service);
    const nostrService = yield* _(NostrService);
    const nip04Service = yield* _(NIP04Service);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    const dvmConfig = yield* _(NIP90ProviderConfigTag);

    // Helper function to parse prompt messages
    const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
      try {
        const parsed = JSON.parse(promptString);
        if (parsed && Array.isArray(parsed.messages)) {
          return parsed.messages as AgentChatMessage[];
        }
      } catch (e) {
        console.warn("[NIP90AgentLanguageModelLive] Failed to parse prompt as JSON messages:", e);
      }
      // Fallback: treat the prompt string as a single user message
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    // Helper function to format messages for DVM
    const formatPromptForDVM = (messages: AgentChatMessage[]): string => {
      return messages
        .map(msg => {
          if (msg.role === "system") return `Instructions: ${msg.content}\n\n`;
          if (msg.role === "user") return `User: ${msg.content}\n`;
          if (msg.role === "assistant") return `Assistant: ${msg.content}\n`;
          return "";
        })
        .join("");
    };

    // Helper function to create AiResponse
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

    // Helper function to generate ephemeral keypair
    const generateEphemeralKeyPair = () => {
      const sk = generatePrivateKey();
      const pk = getPublicKey(sk);
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

          // Get job result
          const jobResult = yield* _(
            nip90Service.getJobResult({
              jobRequestEventId: jobRequest.id,
              decryptionKey: requestSk,
              targetDvmPubkeyHex: dvmConfig.dvmPubkey,
              resultKind: dvmConfig.requestKind + 1000,
              relays: dvmConfig.dvmRelays,
            })
          );

          return createAiResponse(jobResult.content);
        }).pipe(
          Effect.tapError((err) =>
            Effect.sync(() => console.error("[NIP90AgentLanguageModelLive] generateText error:", err))
          ),
          Effect.mapError((err) => {
            if (err instanceof AIProviderError) return err;
            return new AIProviderError({
              message: `NIP-90 generateText error: ${err instanceof Error ? err.message : String(err)}`,
              provider: "NIP90",
              cause: err,
              context: { model: dvmConfig.modelIdentifier, params },
            });
          })
        );
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        return Stream.asyncInterrupt<AiTextChunk, AIProviderError>((emit) => {
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

          // Run the program and return cleanup function
          const fiber = Effect.runFork(program);
          return Effect.sync(() => {
            fiber.interrupt();
          });
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
