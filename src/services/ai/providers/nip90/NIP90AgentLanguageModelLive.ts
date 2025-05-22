// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
import { Layer, Effect, Stream, Option } from "effect";
import { generateSecretKey } from "nostr-tools/pure";
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
import { NIP90Service, type NIP90JobFeedback, type NIP90JobResult } from "@/services/nip90";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "./NIP90ProviderConfig";

console.log("Loading NIP90AgentLanguageModelLive module");

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const nip90Service = yield* _(NIP90Service);
    const telemetry = yield* _(TelemetryService);
    const dvmConfig = yield* _(NIP90ProviderConfigTag);

    // Helper to parse the prompt string into messages
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

    // Helper to format messages into a prompt string for the DVM
    const formatPromptForDVM = (messages: AgentChatMessage[]): string => {
      // For now, a simple format: concatenate messages with role prefixes
      return messages.map(msg => {
        if (msg.role === "system") return `Instructions: ${msg.content}\n\n`;
        if (msg.role === "assistant") return `Assistant: ${msg.content}\n`;
        if (msg.role === "user") return `User: ${msg.content}\n`;
        return `${msg.role}: ${msg.content}\n`;
      }).join("");
    };

    // Helper to create an AiResponse from text
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

    // Helper to generate a new ephemeral key pair for a request
    const generateEphemeralKeyPair = () => {
      const sk = generateSecretKey();
      return { sk: new Uint8Array(sk) };
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
        return Effect.gen(function* (_) {
          const messagesPayload = parsePromptMessages(params.prompt);
          const formattedPrompt = formatPromptForDVM(messagesPayload);

          // Generate ephemeral keypair if configured
          const { sk } = dvmConfig.useEphemeralRequests ? generateEphemeralKeyPair() : { sk: new Uint8Array() }; // TODO: Get user's SK if not using ephemeral

          // Create job request
          const jobParams = {
            kind: dvmConfig.requestKind,
            inputs: [[formattedPrompt, "text"]],
            targetDvmPubkeyHex: dvmConfig.requiresEncryption ? dvmConfig.dvmPubkey : undefined,
            requesterSk: sk,
            relays: dvmConfig.dvmRelays,
            additionalParams: [
              ...(dvmConfig.modelIdentifier ? [["param", "model", dvmConfig.modelIdentifier]] : []),
              ...(params.temperature ? [["param", "temperature", params.temperature.toString()]] : []),
              ...(params.maxTokens ? [["param", "max_tokens", params.maxTokens.toString()]] : []),
            ],
          };

          yield* _(telemetry.trackEvent({
            category: "nip90_adapter:nonstream",
            action: "create_start",
            label: dvmConfig.modelName,
            value: formattedPrompt.substring(0, 100),
          }));

          const jobRequest = yield* _(
            nip90Service.createJobRequest(jobParams).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Failed to create NIP-90 job request: ${err.message}`,
                cause: err,
                provider: "NIP90",
                context: { model: dvmConfig.modelName, dvmPubkey: dvmConfig.dvmPubkey }
              }))
            )
          );

          // Wait for result
          const result = yield* _(
            nip90Service.getJobResult(jobRequest.id, dvmConfig.dvmPubkey, sk).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Failed to get NIP-90 job result: ${err.message}`,
                cause: err,
                provider: "NIP90",
                context: { model: dvmConfig.modelName, jobId: jobRequest.id }
              }))
            )
          );

          if (!result) {
            throw new AIProviderError({
              message: "No result received from NIP-90 DVM",
              provider: "NIP90",
              context: { model: dvmConfig.modelName, jobId: jobRequest.id }
            });
          }

          return createAiResponse(result.content);
        });
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        return Stream.asyncInterrupt<AiTextChunk, AIProviderError>((emit) => {
          return Effect.gen(function* (_) {
            const messagesPayload = parsePromptMessages(params.prompt);
            const formattedPrompt = formatPromptForDVM(messagesPayload);

            // Generate ephemeral keypair if configured
            const { sk } = dvmConfig.useEphemeralRequests ? generateEphemeralKeyPair() : { sk: new Uint8Array() }; // TODO: Get user's SK if not using ephemeral

            // Create job request
            const jobParams = {
              kind: dvmConfig.requestKind,
              inputs: [[formattedPrompt, "text"]],
              targetDvmPubkeyHex: dvmConfig.requiresEncryption ? dvmConfig.dvmPubkey : undefined,
              requesterSk: sk,
              relays: dvmConfig.dvmRelays,
              additionalParams: [
                ...(dvmConfig.modelIdentifier ? [["param", "model", dvmConfig.modelIdentifier]] : []),
                ...(params.temperature ? [["param", "temperature", params.temperature.toString()]] : []),
                ...(params.maxTokens ? [["param", "max_tokens", params.maxTokens.toString()]] : []),
              ],
            };

            yield* _(telemetry.trackEvent({
              category: "nip90_adapter:stream",
              action: "create_start",
              label: dvmConfig.modelName,
              value: formattedPrompt.substring(0, 100),
            }));

            const jobRequest = yield* _(
              nip90Service.createJobRequest(jobParams).pipe(
                Effect.mapError(err => new AIProviderError({
                  message: `Failed to create NIP-90 job request: ${err.message}`,
                  cause: err,
                  provider: "NIP90",
                  context: { model: dvmConfig.modelName, dvmPubkey: dvmConfig.dvmPubkey }
                }))
              )
            );

            console.log(`[NIP90AgentLanguageModelLive] Created job request ${jobRequest.id} for DVM ${dvmConfig.dvmPubkey}`);

            // Subscribe to updates
            const subscription = yield* _(
              nip90Service.subscribeToJobUpdates(
                jobRequest.id,
                dvmConfig.dvmPubkey,
                sk,
                (update: NIP90JobResult | NIP90JobFeedback) => {
                  console.log(`[NIP90AgentLanguageModelLive] Received update for job ${jobRequest.id}:`, update);

                  if ('status' in update) { // This is a feedback event
                    const feedback = update as NIP90JobFeedback;
                    if (feedback.status === "partial") {
                      console.log(`[NIP90AgentLanguageModelLive] Emitting partial content for job ${jobRequest.id}`);
                      emit.single({ text: feedback.content });
                    } else if (feedback.status === "error") {
                      console.error(`[NIP90AgentLanguageModelLive] Error feedback for job ${jobRequest.id}:`, feedback.content);
                      emit.fail(new AIProviderError({
                        message: `NIP-90 DVM error: ${feedback.content}`,
                        provider: "NIP90",
                        context: { model: dvmConfig.modelName, jobId: jobRequest.id }
                      }));
                    }
                    // Ignore other feedback statuses for now
                  } else { // This is a result event
                    const result = update as NIP90JobResult;
                    console.log(`[NIP90AgentLanguageModelLive] Received final result for job ${jobRequest.id}`);
                    emit.single({ text: result.content });
                    emit.end();
                  }
                }
              ).pipe(
                Effect.mapError(err => new AIProviderError({
                  message: `Failed to subscribe to NIP-90 job updates: ${err.message}`,
                  cause: err,
                  provider: "NIP90",
                  context: { model: dvmConfig.modelName, jobId: jobRequest.id }
                }))
              )
            );

            // Return cleanup function
            return Effect.sync(() => {
              console.log(`[NIP90AgentLanguageModelLive] Cleaning up subscription for job ${jobRequest.id}`);
              subscription.unsubscribe();
            });
          });
        });
      },

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
        return Effect.fail(new AIProviderError({
          message: "generateStructured not supported by NIP-90 provider",
          provider: "NIP90",
          context: { model: dvmConfig.modelName }
        }));
      }
    });
  })
);
