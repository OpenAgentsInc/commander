// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
import { Layer, Effect, Stream, Option } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AgentChatMessage,
} from "@/services/ai/core";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { AiProviderError } from "@/services/ai/core/AIError";
import { NIP90Service, type NIP90JobFeedback, type NIP90JobFeedbackStatus } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { SparkService } from "@/services/spark";
import { getMainRuntime } from "@/services/runtime";
import { NIP90ProviderConfigTag } from "./NIP90ProviderConfig";

// Log when this module is loaded
console.log("Loading NIP90AgentLanguageModelLive module");

// Dynamic import for ESM module
const nostrToolsImport = async () => {
  const { generateSecretKey, getPublicKey } = await import("nostr-tools/pure");
  return { generateSecretKey, getPublicKey };
};

const nip90AgentLanguageModelEffect = Effect.gen(function* (_) {
    // Get required services
    const nip90Service = yield* _(NIP90Service);
    const nostrService = yield* _(NostrService);
    const nip04Service = yield* _(NIP04Service);
    const telemetry = yield* _(TelemetryService);
    const sparkService = yield* _(SparkService);
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
      return AiResponse.fromSimple({
        text,
        metadata: {
          usage: {
            promptTokens: 0,
            completionTokens: text.length,
            totalTokens: text.length
          }
        }
      });
    };

    const generateEphemeralKeyPair = (): { sk: Uint8Array; pk: string } => {
      const skBytes = generateSecretKey(); // Returns Uint8Array
      const pkHex = getPublicKeyNostrTools(skBytes); // Takes Uint8Array, returns hex string
      return { sk: skBytes, pk: pkHex };
    };

    return makeAgentLanguageModel({

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError> => {
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

          // Log the target DVM pubkey and requester pubkey for debugging
          yield* _(
            telemetry.trackEvent({
              category: "nip90:consumer",
              action: "target_dvm_pubkey",
              label: dvmConfig.dvmPubkey,
              value: `Ephemeral: ${dvmConfig.useEphemeralRequests}, Encrypted: ${dvmConfig.requiresEncryption}`,
            })
          );
          
          // Log the requester pubkey
          if (requestPkHex) {
            yield* _(
              telemetry.trackEvent({
                category: "nip90:consumer",
                action: "requester_pubkey",
                label: requestPkHex,
                value: "Ephemeral key",
              })
            );
          } else {
            yield* _(
              telemetry.trackEvent({
                category: "nip90:consumer",
                action: "requester_pubkey",
                label: "NOT SET",
                value: "No key configured - requests will fail!",
              })
            );
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

          // Wait for result
          const result = yield* _(
            nip90Service.getJobResult(
              jobRequest.id,
              dvmConfig.dvmPubkey,
              requestSkBytes as Uint8Array<ArrayBuffer>
            )
          );

          if (!result) {
            return yield* _(Effect.fail(new AiProviderError({
              message: "NIP-90 job result not found",
              provider: "NIP90",
              isRetryable: true
            })));
          }

          return createAiResponse(result.content || "");
        }).pipe(
          Effect.mapError(err => new AiProviderError({
            message: `NIP-90 generateText error: ${err instanceof Error ? err.message : String(err)}`,
            provider: "NIP90",
            isRetryable: true,
            cause: err
          }))
        );
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiResponse, AiProviderError> => {
        return Stream.asyncScoped<AiResponse, AiProviderError>((emit) => {
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

            // Log requester pubkey for streaming
            if (requestPkHex) {
              yield* _(
                telemetry.trackEvent({
                  category: "nip90:consumer",
                  action: "requester_pubkey_stream",
                  label: requestPkHex,
                  value: "Ephemeral key",
                })
              );
            } else {
              yield* _(
                telemetry.trackEvent({
                  category: "nip90:consumer",
                  action: "requester_pubkey_stream",
                  label: "NOT SET",
                  value: "No key configured - requests will fail!",
                })
              );
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

            // Subscribe to job updates using DVM-specific relays
            const unsubscribe = yield* _(
              nip90Service.subscribeToJobUpdates(
                jobRequest.id,
                dvmConfig.dvmPubkey,
                requestSkBytes as Uint8Array<ArrayBuffer>,
                async (eventUpdate) => {
                  if (eventUpdate.kind >= 6000 && eventUpdate.kind < 7000) { // Job Result
                    if (eventUpdate.content) {
                      emit.single(createAiResponse(eventUpdate.content));
                    }
                    emit.end();
                  } else if (eventUpdate.kind === 7000) { // Job Feedback
                    const feedbackEvent = eventUpdate as NIP90JobFeedback;
                    const statusTag = feedbackEvent.tags.find(t => t[0] === "status");
                    const status = statusTag?.[1] as NIP90JobFeedbackStatus | undefined;

                    if (status === "partial" && feedbackEvent.content) {
                      emit.single(createAiResponse(feedbackEvent.content));
                    } else if (status === "error") {
                      emit.fail(
                        new AiProviderError({
                          message: `NIP-90 DVM error: ${feedbackEvent.content || "Unknown error"}`,
                          provider: "NIP90",
                          isRetryable: true,
                          cause: feedbackEvent
                        })
                      );
                    } else if (status === "payment-required") {
                      // Handle payment required
                      const amountTag = feedbackEvent.tags.find(t => t[0] === "amount");
                      if (amountTag && amountTag[1]) {
                        const invoice = amountTag[1];
                        const amountSats = 3; // TODO: Extract from bolt11 invoice
                        
                        // Track telemetry (fire and forget)
                        const runtime = getMainRuntime();
                        Effect.runFork(
                          Effect.flatMap(TelemetryService, ts => ts.trackEvent({
                            category: "nip90:consumer",
                            action: "payment_required",
                            label: jobRequest.id,
                            value: `${amountSats} sats`
                          })).pipe(Effect.provide(runtime))
                        );
                        
                        // Auto-pay small amounts
                        if (amountSats <= 10) {
                          // Track payment attempt (fire and forget)
                          Effect.runFork(
                            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
                              category: "nip90:consumer",
                              action: "auto_payment_triggered",
                              label: jobRequest.id,
                              value: `${amountSats} sats`
                            })).pipe(Effect.provide(runtime))
                          );
                          
                          // Execute payment asynchronously
                          Effect.runPromise(
                            Effect.gen(function* () {
                              const spark = yield* SparkService;
                              return yield* spark.payLightningInvoice({
                                invoice,
                                maxFeeSats: 10,
                                timeoutSeconds: 60
                              });
                            }).pipe(Effect.provide(runtime))
                          ).then(paymentResult => {
                            // Emit payment success feedback
                            emit.single(createAiResponse(`Auto-paid ${amountSats} sats. Payment hash: ${paymentResult.payment.paymentHash.substring(0, 12)}... Waiting for DVM to process...`));
                            
                            // Track payment success (fire and forget)
                            Effect.runFork(
                              Effect.flatMap(TelemetryService, ts => ts.trackEvent({
                                category: "nip90:consumer",
                                action: "payment_success",
                                label: jobRequest.id,
                                value: paymentResult.payment.paymentHash
                              })).pipe(Effect.provide(runtime))
                            );
                          }).catch(payError => {
                            // Track payment failure (fire and forget)
                            Effect.runFork(
                              Effect.flatMap(TelemetryService, ts => ts.trackEvent({
                                category: "nip90:consumer",
                                action: "payment_error",
                                label: jobRequest.id,
                                value: payError instanceof Error ? payError.message : String(payError)
                              })).pipe(Effect.provide(runtime))
                            );
                            
                            emit.fail(new AiProviderError({
                              message: `Payment failed: ${payError instanceof Error ? payError.message : String(payError)}`,
                              provider: "NIP90",
                              isRetryable: false,
                              cause: payError
                            }));
                          });
                        } else {
                          // For larger amounts, just notify user
                          emit.single(createAiResponse(`Payment required: ${amountSats} sats. Invoice: ${invoice.substring(0, 30)}... Manual payment needed.`));
                        }
                      }
                    }
                  }
                },
[...dvmConfig.dvmRelays] // Use DVM-specific relays for payment events
              )
            );

            return unsubscribe;
          }).pipe(
            Effect.mapError(err => {
              if (err instanceof AiProviderError) return err;
              return new AiProviderError({
                message: `NIP-90 stream setup error: ${err instanceof Error ? err.message : String(err)}`,
                provider: "NIP90",
                isRetryable: true,
                cause: err
              });
            })
          );

          return program;
        });
      },

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AiProviderError> => {
        return Effect.fail(
          new AiProviderError({
            message: "generateStructured not supported by NIP-90 provider",
            provider: "NIP90",
            isRetryable: false
          })
        );
      },
    });
  });

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel.Tag,
  nip90AgentLanguageModelEffect
);
