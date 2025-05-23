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
            // TODO: Implement NIP90 provider once dependencies are properly resolved
            // For now, log the attempt and fall back to default provider
            runTelemetry({ category: "orchestrator", action: "get_provider_model_nip90_not_implemented", label: providerKey });
            console.warn("[ChatOrchestratorService] NIP90 provider not yet implemented, falling back to default Ollama provider");
            return defaultAgentLM;
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
