import { Effect, Layer, Context, Stream } from "effect";
import { ProviderFactoryService } from "./ProviderFactoryService";
import { AgentLanguageModel, makeAgentLanguageModel } from "@/services/ai/core/AgentLanguageModel";
import { AiProviderError, AiConfigurationError } from "@/services/ai/core/AIError";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OllamaService } from "@/services/ollama";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { NIP90Service } from "@/services/nip90";
import { SparkService } from "@/services/spark";
import { CONFIG_KEYS } from "@/services/configuration/defaults";
import { GenerateTextOptions, StreamTextOptions, GenerateStructuredOptions } from "@/services/ai/core/AgentLanguageModel";
import { AiResponse } from "@/services/ai/core/AiResponse";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
};

export const ProviderFactoryServiceLive = Layer.succeed(
  ProviderFactoryService,
  ProviderFactoryService.of({
    _tag: "ProviderFactoryService",

    createProvider: (providerKey: string, modelName?: string): Effect.Effect<
      AgentLanguageModel,
      AiProviderError | AiConfigurationError,
      // Declare ALL services that any provider creation path might need
      ConfigurationService | TelemetryService | OllamaService | NostrService | NIP04Service | NIP90Service | SparkService
    > =>
      Effect.gen(function* (_) {
        // Resolve dependencies inside this method's Effect
        const config = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);
        
        // Log provider creation attempt (ignore errors)
        yield* _(
          telemetry.trackEvent({
            category: "provider_factory",
            action: "create_provider_start",
            label: providerKey
          }).pipe(
            Effect.catchAll(() => Effect.void)
          )
        );

        switch (providerKey) {
          case "ollama": {
            const ollama = yield* _(OllamaService);
            
            const isEnabled = yield* _(
              config.get(CONFIG_KEYS.OLLAMA_MODEL_ENABLED).pipe(
                Effect.map(value => value === "true"),
                Effect.catchAll(() => Effect.succeed(false))
              )
            );
            
            if (!isEnabled) {
              return yield* _(Effect.fail(new AiConfigurationError({
                message: "Ollama provider is disabled",
                context: { provider: "ollama" }
              })));
            }
            
            // Use Ollama provider
            const ollamaConfig = {
              modelName: modelName || (yield* _(
                config.get(CONFIG_KEYS.OLLAMA_MODEL_NAME).pipe(
                  Effect.catchAll(() => Effect.succeed("gemma3:1b"))
                )
              ))
            };
            
            // Import Ollama provider module
            const ollamaModule = yield* _(
              Effect.tryPromise({
                try: () => import("./ollama/index.js"),
                catch: (error) => new AiProviderError({
                  message: `Failed to load Ollama provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "ollama"
                })
              })
            );
            
            const { OllamaAgentLanguageModelLiveLayer, OllamaAsOpenAIClientLive } = ollamaModule;
            
            const ollamaAgentLMLayer = OllamaAgentLanguageModelLiveLayer.pipe(
              Layer.provide(OllamaAsOpenAIClientLive),
              Layer.provide(Layer.succeed(OllamaService, ollama)),
              Layer.provide(Layer.succeed(TelemetryService, telemetry)),
              Layer.provide(Layer.succeed(ConfigurationService, config))
            );
            
            const ollamaAgentLM = yield* _(
              Layer.build(ollamaAgentLMLayer).pipe(
                Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                Effect.scoped,
                Effect.mapError((error) => new AiProviderError({
                  message: `Failed to build Ollama provider: ${error}`,
                  cause: error,
                  isRetryable: false,
                  provider: "ollama"
                }))
              )
            );
            
            yield* _(
              telemetry.trackEvent({
                category: "provider_factory",
                action: "create_provider_success",
                label: "ollama"
              }).pipe(
                Effect.catchAll(() => Effect.void)
              )
            );
            
            return ollamaAgentLM;
          }
          
          case "claude_code": {
            // Use Claude Code CLI provider via IPC (main process only)
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
                        sessionId: (options as any).sessionId,
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
                          sessionId: (options as any).sessionId,
                        },
                        (chunk: string) => {
                          emit.single(AiResponse.fromSimple({
                            text: chunk
                          }));
                        },
                        () => {
                          emit.end();
                        },
                        (error: any) => {
                          const errorMessage = getErrorMessage(error);
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
                      const serializedCause = getErrorMessage(error);
                      emit.fail(new AiProviderError({
                        message: `Failed to start Claude Code stream: ${errorMessage}`,
                        cause: serializedCause,
                        isRetryable: false,
                        provider: "claude_code"
                      }));
                    }
                    
                    return Effect.sync(() => {
                      cleanup?.();
                    });
                  })
                ),
              
              generateStructured: (options: GenerateStructuredOptions): Effect.Effect<AiResponse, AiProviderError, never> =>
                Effect.gen(function* (_) {
                  // For now, just use generateText and try to parse
                  const response = yield* _(claudeCodeAgentLM.generateText(options));
                  
                  try {
                    const parsed = JSON.parse(response.text);
                    // The structured response should include the parsed data
                    const structuredResponse = {
                      text: response.text,
                      toolCalls: undefined, // claude_code doesn't support tool calls in this implementation
                      metadata: response.metadata
                    };
                    return AiResponse.fromSimple(structuredResponse);
                  } catch (error) {
                    return yield* _(Effect.fail(new AiProviderError({
                      message: `Failed to parse structured response: ${error}`,
                      cause: error,
                      isRetryable: false,
                      provider: "claude_code"
                    })));
                  }
                })
            });
            
            yield* _(
              telemetry.trackEvent({
                category: "provider_factory",
                action: "create_provider_success",
                label: "claude_code"
              }).pipe(
                Effect.catchAll(() => Effect.void)
              )
            );
            
            return claudeCodeAgentLM;
          }
          
          // Handle NIP90 providers (nip90:pubkey or nip90:alias format)
          default: {
            if (providerKey.startsWith("nip90:")) {
              const nostr = yield* _(NostrService);
              const nip04 = yield* _(NIP04Service);
              const nip90 = yield* _(NIP90Service);
              const spark = yield* _(SparkService);
              
              const nip90Config = yield* _(Effect.gen(function* (_) {
                const pubkeyOrAlias = providerKey.substring(6);
                
                // Check if it's a known alias
                const aliasMap: Record<string, string> = {
                  "testing_provider": "npub1hdhszmgmkfuzedpewx8tyh2krnmj30m6d2zjh3ua6xqhv5mxnfqqlmvq37"
                };
                
                const resolvedPubkey = aliasMap[pubkeyOrAlias] || pubkeyOrAlias;
                
                return {
                  modelName: modelName || "default",
                  isEnabled: true,
                  dvmPubkey: resolvedPubkey,
                  dvmRelays: ["wss://relay.damus.io", "wss://nos.lol"],
                  requestKind: 5050,
                  requiresEncryption: false,
                  useEphemeralRequests: true
                };
              }));
              
              // Import NIP90 provider module
              const nip90Module = yield* _(
                Effect.tryPromise({
                  try: () => import("./nip90/index.js"),
                  catch: (error) => new AiProviderError({
                    message: `Failed to load NIP90 provider: ${error}`,
                    cause: error,
                    isRetryable: false,
                    provider: providerKey
                  })
                })
              );
              
              const { NIP90AgentLanguageModelLive, NIP90ProviderConfigTag } = nip90Module;
              
              const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);
              const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
                Layer.provide(nip90ConfigLayer),
                Layer.provide(Layer.succeed(NIP90Service, nip90)),
                Layer.provide(Layer.succeed(NostrService, nostr)),
                Layer.provide(Layer.succeed(NIP04Service, nip04)),
                Layer.provide(Layer.succeed(TelemetryService, telemetry)),
                Layer.provide(Layer.succeed(SparkService, spark))
              );
              
              const nip90AgentLM = yield* _(
                Layer.build(nip90AgentLMLayer).pipe(
                  Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                  Effect.scoped,
                  Effect.mapError((error) => new AiProviderError({
                    message: `Failed to build NIP90 provider: ${error}`,
                    cause: error,
                    isRetryable: false,
                    provider: providerKey
                  }))
                )
              );
              
              yield* _(
                telemetry.trackEvent({
                  category: "provider_factory",
                  action: "create_provider_success",
                  label: providerKey
                }).pipe(
                  Effect.catchAll(() => Effect.void)
                )
              );
              
              return nip90AgentLM;
            }
            
            // Unknown provider
            return yield* _(Effect.fail(new AiConfigurationError({
              message: `Unknown provider: ${providerKey}`,
              context: { provider: providerKey }
            })));
          }
        }
      }),
    
    listProviders: (): Effect.Effect<string[], never, ConfigurationService> =>
      Effect.gen(function* (_) {
        const config = yield* _(ConfigurationService);
        const providers: string[] = ["claude_code"];
        
        // Check if Ollama is enabled
        const ollamaEnabled = yield* _(
          config.get(CONFIG_KEYS.OLLAMA_MODEL_ENABLED).pipe(
            Effect.map(value => value === "true"),
            Effect.catchAll(() => Effect.succeed(false))
          )
        );
        
        if (ollamaEnabled) {
          providers.push("ollama");
        }
        
        // TODO: Add logic to discover available NIP90 providers
        // For now, just include the testing provider
        providers.push("nip90:testing_provider");
        
        return providers;
      })
  })
);