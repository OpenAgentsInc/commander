import { Context, Effect, Stream, Layer, Schedule } from "effect";
import { HttpClient } from "@effect/platform";
import {
  AgentChatMessage,
  AiResponse,
  AiProviderError,
  AiConfigurationError,
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
} from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { SparkService } from "@/services/spark";

export interface PreferredProviderConfig {
  key: string;
  modelName?: string;
}

export interface ChatOrchestratorService {
  readonly _tag: "ChatOrchestratorService";
  streamConversation(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<StreamTextOptions, "prompt">>;
  }): Stream.Stream<AiResponse, AiProviderError | AiConfigurationError>;
  generateConversationResponse(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<GenerateTextOptions, "prompt">>;
  }): Effect.Effect<string, AiProviderError | AiConfigurationError>;
}

export const ChatOrchestratorService = Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

export const ChatOrchestratorServiceLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* (_) {
    const telemetry = yield* _(TelemetryService);
    const configService = yield* _(ConfigurationService);
    const httpClient = yield* _(HttpClient.HttpClient);
    const defaultAgentLM = yield* _(AgentLanguageModel.Tag);
    const nip90Service = yield* _(NIP90Service);
    const nostrService = yield* _(NostrService);
    const nip04Service = yield* _(NIP04Service);
    const sparkService = yield* _(SparkService);

    const runTelemetry = (event: any) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));

    // Helper to get provider-specific AgentLanguageModel
    const getProviderLanguageModel = (providerKey: string, modelName?: string): Effect.Effect<AgentLanguageModel, AiConfigurationError | AiProviderError> => {
      return Effect.gen(function* (_) {
        runTelemetry({ category: "orchestrator", action: "get_provider_model_start", label: providerKey, value: modelName });
        
        switch (providerKey.toLowerCase()) {
          case "ollama_gemma3_1b": {
            // Use the default Ollama provider from runtime
            runTelemetry({ category: "orchestrator", action: "get_provider_model_success_ollama", label: providerKey });
            return defaultAgentLM;
          }
          
          case "nip90_devstral": {
            // Build NIP90 provider with devstral configuration
            runTelemetry({ category: "orchestrator", action: "get_provider_model_start_nip90", label: providerKey });
            
            // Fetch NIP90 devstral configuration
            const dvmPubkey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(Effect.orElseSucceed(() => "default_dvm_pk")));
            const relaysStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_RELAYS").pipe(Effect.orElseSucceed(() => '["wss://relay.damus.io"]')));
            const relays = JSON.parse(relaysStr) as string[];
            const reqKindStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
            const reqKind = parseInt(reqKindStr, 10);
            const reqEncryptionStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
            const useEphemeralStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
            const modelIdFromConfig = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "devstral")));
            
            // Create NIP90 provider configuration
            const nip90Config: NIP90ProviderConfig = {
              modelName: modelName || modelIdFromConfig,
              isEnabled: true,
              dvmPubkey,
              dvmRelays: relays,
              requestKind: !isNaN(reqKind) ? reqKind : 5050,
              requiresEncryption: reqEncryptionStr === "true",
              useEphemeralRequests: useEphemeralStr === "true",
              modelIdentifier: modelIdFromConfig,
            };
            
            console.log("[ChatOrchestratorService] Building NIP90 provider with config:", nip90Config);
            
            // Create NIP90 provider config layer
            const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);
            
            // Build NIP90AgentLanguageModel with all required dependencies
            const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
              Layer.provide(nip90ConfigLayer),
              Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
              Layer.provide(Layer.succeed(NostrService, nostrService)),
              Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
              Layer.provide(Layer.succeed(TelemetryService, telemetry)),
              Layer.provide(Layer.succeed(SparkService, sparkService))
            );
            
            const nip90AgentLM: AgentLanguageModel = yield* _(
              Layer.build(nip90AgentLMLayer).pipe(
                Effect.map((context) =>
                  Context.get(context, AgentLanguageModel.Tag)
                ),
                Effect.scoped
              )
            );
            
            runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90", label: providerKey });
            console.log("[ChatOrchestratorService] Successfully built NIP90 provider for", providerKey);
            return nip90AgentLM;
          }
          
          default:
            runTelemetry({ category: "orchestrator", action: "get_provider_model_unknown", label: providerKey });
            return yield* _(Effect.fail(new AiConfigurationError({ message: `Unsupported provider key: ${providerKey}` })));
        }
      });
    };

    return {
      _tag: "ChatOrchestratorService" as const,
      streamConversation: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "stream_conversation_start", label: preferredProvider.key });

        return Stream.fromEffect(
          getProviderLanguageModel(preferredProvider.key, preferredProvider.modelName)
        ).pipe(
          Stream.flatMap((agentLM) => {
            const streamOptions: StreamTextOptions = {
              ...options,
              prompt: JSON.stringify({ messages }),
              model: preferredProvider.modelName,
            };

            // Use Stream.retry instead of Effect.retry for streams
            return agentLM.streamText(streamOptions).pipe(
              Stream.retry(
                Schedule.intersect(
                  Schedule.recurs(preferredProvider.key.includes("ollama") ? 2 : 0),
                  Schedule.exponential("100 millis")
                ).pipe(
                  Schedule.whileInput((err: AiProviderError | AiConfigurationError) =>
                    err._tag === "AiProviderError" && err.isRetryable === true
                  )
                )
              ),
              Stream.tapError((err) => runTelemetry({
                category: "orchestrator",
                action: "stream_error",
                label: err instanceof Error ? err.message : String(err)
              }))
            );
          })
        );
      },
      generateConversationResponse: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "generate_conversation_start", label: preferredProvider.key });

        return getProviderLanguageModel(preferredProvider.key, preferredProvider.modelName).pipe(
          Effect.flatMap((agentLM) => {
            const generateOptions: GenerateTextOptions = {
              ...options,
              prompt: JSON.stringify({ messages }),
              model: preferredProvider.modelName,
            };

            return Effect.retry(
              agentLM.generateText(generateOptions).pipe(
                Effect.map(aiResponse => aiResponse.text)
              ),
              Schedule.intersect(
                Schedule.recurs(preferredProvider.key.includes("ollama") ? 2 : 0),
                Schedule.exponential("100 millis")
              ).pipe(
                Schedule.whileInput((err: AiProviderError | AiConfigurationError) =>
                  err._tag === "AiProviderError" && err.isRetryable === true
                )
              )
            ).pipe(
              Effect.tapError((err) => runTelemetry({
                category: "orchestrator",
                action: "generate_conversation_error",
                label: err instanceof Error ? err.message : String(err)
              }))
            );
          })
        );
      },
    };
  })
);
