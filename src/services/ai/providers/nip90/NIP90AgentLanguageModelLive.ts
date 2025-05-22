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
import { NIP90Service, type NIP90JobFeedback, type NIP90JobFeedbackStatus } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "./NIP90ProviderConfig";

// Log when this module is loaded
console.log("Loading NIP90AgentLanguageModelLive module");

// Dynamic import for ESM module
const nostrToolsImport = async () => {
  const { generateSecretKey, getPublicKey } = await import("nostr-tools/pure");
  return { generateSecretKey, getPublicKey };
};

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    // Get required services
    const nip90Service = yield* _(NIP90Service);
    const nostrService = yield* _(NostrService);
    const nip04Service = yield* _(NIP04Service);
    const telemetry = yield* _(TelemetryService);
    const dvmConfig = yield* _(NIP90ProviderConfigTag);

    // Load nostr-tools functions
    const { generateSecretKey, getPublicKey: getPublicKeyNostrTools } = yield* _(Effect.promise(() => nostrToolsImport()));

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

    const generateEphemeralKeyPair = (): { sk: Uint8Array; pk: string } => {
      const skBytes = generateSecretKey(); // Returns Uint8Array
      const pkHex = getPublicKeyNostrTools(skBytes); // Takes Uint8Array, returns hex string
      return { sk: skBytes, pk: pkHex };
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
        return Effect.gen(function* (_) {
          const messagesPayload = parsePromptMessages(params.prompt);
          const formattedPrompt = formatPromptForDVM(messagesPayload);

          // Generate ephemeral keypair if configured
          const { sk: requestSkBytes, pk: requestPkHex } = dvmConfig.useEphemeralRequests
            ? generateEphemeralKeyPair()
            : { sk: new Uint8Array(), pk: "" }; // Empty key for now, should be handled properly in future

          // Prepare NIP-90 inputs and params
          const inputsForNip90: ReadonlyArray<readonly [string, "text" | "url" | "event" | "job", string?, string?]> =
            [[formattedPrompt, "text"]];

          const paramsForNip90: Array<readonly ["param", string, string]> = [
            ["param", "model", dvmConfig.modelIdentifier || "default"]
          ];

          if (params.temperature) {
            paramsForNip90.push(["param", "temperature", params.temperature.toString()]);
          }
          if (params.maxTokens) {
            paramsForNip90.push(["param", "max_tokens", params.maxTokens.toString()]);
          }

          // Create job request
          const jobRequest = yield* _(
            nip90Service.createJobRequest({
              kind: dvmConfig.requestKind,
              inputs: inputsForNip90,
              params: paramsForNip90,
              targetDvmPubkeyHex: dvmConfig.dvmPubkey,
              requesterSk: requestSkBytes as Uint8Array<ArrayBuffer>,
              requiresEncryption: dvmConfig.requiresEncryption,
            })
          );

          // Wait for result
          const result = yield* _(
            nip90Service.getJobResult(
              jobRequest.id,
              dvmConfig.dvmPubkey,
              requestSkBytes
            )
          );

          if (!result) {
            return yield* _(Effect.fail(new AIProviderError({
              message: "NIP-90 job result not found",
              provider: "NIP90"
            })));
          }

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
            const { sk: requestSkBytes, pk: requestPkHex } = dvmConfig.useEphemeralRequests
              ? generateEphemeralKeyPair()
              : { sk: new Uint8Array(), pk: "" };

            // Prepare NIP-90 inputs and params
            const inputsForNip90: ReadonlyArray<readonly [string, "text" | "url" | "event" | "job", string?, string?]> =
              [[formattedPrompt, "text"]];

            const paramsForNip90: Array<readonly ["param", string, string]> = [
              ["param", "model", dvmConfig.modelIdentifier || "default"]
            ];

            if (params.temperature) {
              paramsForNip90.push(["param", "temperature", params.temperature.toString()]);
            }
            if (params.maxTokens) {
              paramsForNip90.push(["param", "max_tokens", params.maxTokens.toString()]);
            }

            // Create job request
            const jobRequest = yield* _(
              nip90Service.createJobRequest({
                kind: dvmConfig.requestKind,
                inputs: inputsForNip90,
                outputMimeType: "text/plain",
                additionalParams: paramsForNip90,
                targetDvmPubkeyHex: dvmConfig.dvmPubkey,
                requesterSk: requestSkBytes as Uint8Array<ArrayBuffer>,
                relays: dvmConfig.dvmRelays,
              })
            );

            // Subscribe to job updates
            const unsubscribe = yield* _(
              nip90Service.subscribeToJobUpdates(
                jobRequest.id,
                dvmConfig.dvmPubkey,
                requestSkBytes as Uint8Array<ArrayBuffer>,
                (eventUpdate) => {
                  if (eventUpdate.kind >= 6000 && eventUpdate.kind < 7000) { // Job Result
                    if (eventUpdate.content) {
                      emit.single({ text: eventUpdate.content });
                    }
                    emit.end();
                  } else if (eventUpdate.kind === 7000) { // Job Feedback
                    const feedbackEvent = eventUpdate as NIP90JobFeedback;
                    const statusTag = feedbackEvent.tags.find(t => t[0] === "status");
                    const status = statusTag?.[1] as NIP90JobFeedbackStatus | undefined;

                    if (status === "partial" && feedbackEvent.content) {
                      emit.single({ text: feedbackEvent.content });
                    } else if (status === "error") {
                      emit.fail(
                        new AIProviderError({
                          message: `NIP-90 DVM error: ${feedbackEvent.content || "Unknown error"}`,
                          provider: "NIP90",
                          context: { jobId: jobRequest.id, status },
                        })
                      );
                    }
                  }
                }
              )
            );

            return unsubscribe;
          }).pipe(
            Effect.mapError(err => {
              if (err instanceof AIProviderError) return err;
              return new AIProviderError({
                message: `NIP-90 stream setup error: ${err instanceof Error ? err.message : String(err)}`,
                provider: "NIP90",
                cause: err
              });
            })
          );

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
