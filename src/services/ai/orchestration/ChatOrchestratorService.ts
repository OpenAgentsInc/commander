import { Context, Effect, Stream, Layer, Schedule, Option } from "effect";
import { HttpClient } from "@effect/platform";
import {
  AgentChatMessage,
  AiResponse,
  AiProviderError,
  AiConfigurationError,
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  makeAgentLanguageModel,
} from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
// Import NIP90 types only, not the implementation
import { type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { SparkService } from "@/services/spark";

// Helper to safely access error message
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return error && typeof error === 'object' ? 
    JSON.stringify(error, Object.getOwnPropertyNames(error)) : 
    String(error);
};
import { DEFAULT_RELAYS_ARRAY } from "@/services/relays";

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
    const getProviderLanguageModel = (providerKey: string, modelName?: string): Effect.Effect<AgentLanguageModel, AiConfigurationError | AiProviderError, never> => {
      return (Effect.gen(function* (_) {
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
            
            // Dynamically import NIP90 provider to avoid loading in renderer
            const nip90Module: any = yield* _(
              Effect.tryPromise({
                try: () => import("@/services/ai/providers/nip90" as any),
                catch: (error) => new AiProviderError({
                  message: `Failed to load NIP90 provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "nip90"
                })
              })
            );
            const { NIP90AgentLanguageModelLive, NIP90ProviderConfigTag } = nip90Module;
            
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
                Effect.scoped,
                Effect.mapError((error) => new AiProviderError({
                  message: `Failed to build NIP90 provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "nip90"
                }))
              )
            );
            
            runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90", label: providerKey });
            console.log("[ChatOrchestratorService] Successfully built NIP90 provider for", providerKey);
            return nip90AgentLM;
          }

          case "nip90_custom": {
            runTelemetry({ category: "orchestrator", action: "get_provider_model_start_nip90_custom", label: providerKey });

            const dvmPubkey = yield* _(
              configService.get("USER_NIP90_DVM_PUBKEY").pipe(
                Effect.mapError(() => new AiConfigurationError({ 
                  message: "Custom NIP-90 DVM Pubkey not configured for provider 'nip90_custom'" 
                }))
              )
            );
            
            if (!dvmPubkey.trim()) {
              return yield* _(Effect.fail(new AiConfigurationError({ 
                message: "Custom NIP-90 DVM Pubkey is empty for provider 'nip90_custom'" 
              })));
            }

            const relaysStr = yield* _(configService.get("USER_NIP90_RELAYS").pipe(Effect.orElseSucceed(() => JSON.stringify(DEFAULT_RELAYS_ARRAY))));
            let relaysCfg: string[];
            try {
              relaysCfg = JSON.parse(relaysStr);
              if (!Array.isArray(relaysCfg) || relaysCfg.length === 0) relaysCfg = DEFAULT_RELAYS_ARRAY;
            } catch { relaysCfg = DEFAULT_RELAYS_ARRAY; }

            const reqKindStr = yield* _(configService.get("USER_NIP90_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
            const reqKind = parseInt(reqKindStr, 10);
            const reqEncryptionStr = yield* _(configService.get("USER_NIP90_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
            const useEphemeralStr = yield* _(configService.get("USER_NIP90_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
            const modelIdFromConfig = yield* _(configService.get("USER_NIP90_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "custom_nip90_model")));

            const nip90ConfigCustom: NIP90ProviderConfig = {
              modelName: modelName || modelIdFromConfig,
              isEnabled: true,
              dvmPubkey,
              dvmRelays: relaysCfg,
              requestKind: (!isNaN(reqKind) && reqKind >= 5000 && reqKind <= 5999) ? reqKind : 5050,
              requiresEncryption: reqEncryptionStr === "true",
              useEphemeralRequests: useEphemeralStr === "true",
              modelIdentifier: modelIdFromConfig,
            };

            // Dynamically import NIP90 provider to avoid loading in renderer
            const nip90ModuleCustom: any = yield* _(
              Effect.tryPromise({
                try: () => import("@/services/ai/providers/nip90" as any),
                catch: (error) => new AiProviderError({
                  message: `Failed to load NIP90 provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "nip90_custom"
                })
              })
            );
            const { NIP90AgentLanguageModelLive: NIP90AgentLanguageModelLiveCustom, NIP90ProviderConfigTag: NIP90ProviderConfigTagCustom } = nip90ModuleCustom;

            const nip90ConfigLayerCustom = Layer.succeed(NIP90ProviderConfigTagCustom, nip90ConfigCustom);

            const nip90AgentLMLayerCustom = NIP90AgentLanguageModelLiveCustom.pipe(
              Layer.provide(nip90ConfigLayerCustom),
              Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
              Layer.provide(Layer.succeed(NostrService, nostrService)),
              Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
              Layer.provide(Layer.succeed(TelemetryService, telemetry)),
              Layer.provide(Layer.succeed(SparkService, sparkService))
            );

            const nip90AgentLMCustomInstance = yield* _(
              Layer.build(nip90AgentLMLayerCustom).pipe(
                Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                Effect.scoped,
                Effect.mapError((error) => new AiProviderError({
                  message: `Failed to build NIP90 custom provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "nip90_custom"
                }))
              )
            );
            runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90_custom", label: providerKey });
            return nip90AgentLMCustomInstance;
          }

          case "claude_code": {
            // Use Claude Code CLI provider via IPC (main process only)
            runTelemetry({ category: "orchestrator", action: "get_provider_model_start_claude_code", label: providerKey });
            
            // Create an IPC-based AgentLanguageModel that delegates to main process
            const claudeCodeAgentLM: AgentLanguageModel = makeAgentLanguageModel({
              generateText: (options: GenerateTextOptions) =>
                Effect.gen(function* (_) {
                  // Parse messages from prompt string 
                  let messages: any[];
                  try {
                    const parsed = JSON.parse(options.prompt);
                    messages = parsed.messages || [];
                  } catch {
                    messages = [{ role: "user", content: options.prompt }];
                  }
                  
                  // Use IPC to call main process Claude Code implementation
                  const response = yield* _(
                    Effect.tryPromise({
                      try: () => window.electronAPI.claudeCode!.chatCompletion({
                        messages: messages.map(msg => ({
                          role: msg.role,
                          content: msg.content
                        })),
                        model: options.model || "claude-3-opus-20240229",
                        max_tokens: options.maxTokens,
                        temperature: options.temperature,
                        sessionId: (options as any).sessionId, // Pass sessionId for database persistence,
                        activeFolder: (options as any).activeFolder, // Pass activeFolder for Claude Code context
                      }),
                      catch: (error) => {
                        const serializedCause = getErrorMessage(error);
                        return new AiProviderError({
                          message: `Claude Code IPC call failed: ${error}`,
                          cause: serializedCause,
                          isRetryable: false,
                          provider: "claude_code"
                        });
                      }
                    })
                  );
                  
                  // Handle error response format
                  if (typeof response === 'object' && response !== null && '__error' in response) {
                    return yield* _(Effect.fail(new AiProviderError({
                      message: `Claude Code CLI error: ${response.message}`,
                      cause: response && typeof response === 'object' ? (response.message || JSON.stringify(response, Object.getOwnPropertyNames(response))) : String(response),
                      isRetryable: false,
                      provider: "claude_code"
                    })));
                  }
                  
                  // Parse successful response
                  const content = typeof response === 'string' ? response : JSON.stringify(response);
                  
                  return AiResponse.fromSimple({
                    text: content,
                    metadata: {
                      usage: {
                        promptTokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0), // Rough estimate
                        completionTokens: content.length / 4, // Rough estimate
                        totalTokens: 0
                      }
                    }
                  });
                }),

              streamText: (options: StreamTextOptions) =>
                Stream.asyncScoped((emit) =>
                  Effect.gen(function* (_) {
                    // Parse messages from prompt string 
                    let messages: any[];
                    try {
                      const parsed = JSON.parse(options.prompt);
                      messages = parsed.messages || [];
                    } catch {
                      messages = [{ role: "user", content: options.prompt }];
                    }
                    
                    let cleanup: (() => void) | undefined;
                    
                    try {
                      cleanup = window.electronAPI.claudeCode!.streamChat(
                        {
                          messages: messages.map(msg => ({
                            role: msg.role,
                            content: msg.content
                          })),
                          model: options.model || "claude-sonnet",
                          max_tokens: options.maxTokens,
                          temperature: options.temperature,
                          sessionId: (options as any).sessionId, // Pass sessionId for database persistence,
                          activeFolder: (options as any).activeFolder, // Pass activeFolder for Claude Code context
                        },
                        (chunk: string) => {
                          // Emit each chunk as a text delta
                          emit.single(AiResponse.fromSimple({
                            text: chunk
                          }));
                        },
                        () => {
                          // Stream completed
                          emit.end();
                        },
                        (error: any) => {
                          // Stream error
                          const errorMessage = getErrorMessage(error);
                          // Serialize cause properly for logging
                          const serializedCause = getErrorMessage(error);
                          emit.fail(new AiProviderError({
                            message: `Claude Code stream error: ${errorMessage}`,
                            cause: serializedCause,
                            isRetryable: false,
                            provider: "claude_code"
                          }));
                        }
                      );
                    } catch (error) {
                      const errorMessage = getErrorMessage(error);
                      // Serialize cause properly for logging
                      const serializedCause = getErrorMessage(error);
                      emit.fail(new AiProviderError({
                        message: `Failed to start Claude Code stream: ${errorMessage}`,
                        cause: serializedCause,
                        isRetryable: false,
                        provider: "claude_code"
                      }));
                    }
                    
                    // Return cleanup function
                    return Effect.sync(() => {
                      cleanup?.();
                    });
                  })
                ),
              
              generateStructured: (options: GenerateStructuredOptions) =>
                Effect.gen(function* (_) {
                  // Parse messages from prompt string 
                  let messages: any[];
                  try {
                    const parsed = JSON.parse(options.prompt);
                    messages = parsed.messages || [];
                  } catch {
                    messages = [{ role: "user", content: options.prompt }];
                  }
                  
                  // Use IPC to call main process Claude Code implementation
                  const response = yield* _(
                    Effect.tryPromise({
                      try: () => window.electronAPI.claudeCode!.chatCompletion({
                        messages: messages.map(msg => ({
                          role: msg.role,
                          content: msg.content
                        })),
                        model: options.model || "claude-3-opus-20240229",
                        max_tokens: options.maxTokens,
                        temperature: options.temperature,
                        sessionId: (options as any).sessionId, // Pass sessionId for database persistence,
                        activeFolder: (options as any).activeFolder, // Pass activeFolder for Claude Code context
                      }),
                      catch: (error) => {
                        const serializedCause = getErrorMessage(error);
                        return new AiProviderError({
                          message: `Claude Code IPC call failed: ${error}`,
                          cause: serializedCause,
                          isRetryable: false,
                          provider: "claude_code"
                        });
                      }
                    })
                  );
                  
                  // Handle error response format
                  if (typeof response === 'object' && response !== null && '__error' in response) {
                    return yield* _(Effect.fail(new AiProviderError({
                      message: `Claude Code CLI error: ${response.message}`,
                      cause: response && typeof response === 'object' ? (response.message || JSON.stringify(response, Object.getOwnPropertyNames(response))) : String(response),
                      isRetryable: false,
                      provider: "claude_code"
                    })));
                  }
                  
                  // Parse successful response
                  const content = typeof response === 'string' ? response : JSON.stringify(response);
                  
                  return AiResponse.fromSimple({
                    text: content,
                    metadata: {
                      usage: {
                        promptTokens: messages.reduce((acc, msg) => acc + msg.content.length / 4, 0),
                        completionTokens: content.length / 4,
                        totalTokens: 0
                      }
                    }
                  });
                })
            });
            
            runTelemetry({ category: "orchestrator", action: "get_provider_model_success_claude_code", label: providerKey });
            console.log("[ChatOrchestratorService] Successfully created Claude Code IPC provider for", providerKey);
            return claudeCodeAgentLM;
          }

          default:
            runTelemetry({ category: "orchestrator", action: "get_provider_model_unknown", label: providerKey });
            return yield* _(Effect.fail(new AiConfigurationError({ message: `Unsupported provider key: ${providerKey}` })));
        }
      }) as Effect.Effect<AgentLanguageModel, AiConfigurationError | AiProviderError, unknown>).pipe(
        Effect.catchAllDefect((defect) => 
          Effect.fail(new AiProviderError({
            message: `Unexpected error in provider ${providerKey}: ${defect}`,
            cause: defect,
            isRetryable: false,
            provider: providerKey
          }))
        )
      ) as Effect.Effect<AgentLanguageModel, AiConfigurationError | AiProviderError, never>;
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
