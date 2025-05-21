// src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
import { Layer, Effect, Stream, Cause, Context } from "effect";
import { OpenAiClient, OpenAiError } from "@effect/ai-openai";
import type { ChatCompletion, ChatCompletionChunk, CreateChatCompletionRequest } from "@effect/ai-openai/OpenAiClient";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";

// We are providing the standard OpenAiClient.OpenAiClient tag
export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

export const OllamaAsOpenAIClientLive = Layer.effect(
  OllamaOpenAIClientTag,
  Effect.gen(function*(_) {
    const telemetry = yield* _(TelemetryService);

    // Check if the Ollama IPC bridge is available
    if (!window.electronAPI?.ollama?.generateChatCompletion || !window.electronAPI?.ollama?.generateChatCompletionStream) {
      const errorMsg = "Ollama IPC bridge (window.electronAPI.ollama functions) is not fully available.";
      yield* _(telemetry.trackEvent({ 
        category: "ollama_adapter:error", 
        action: "ipc_unavailable", 
        label: errorMsg 
      }).pipe(Effect.ignoreLogged));
      
      return yield* _(
        Effect.die(new AIProviderError({ 
          message: errorMsg, 
          provider: "OllamaAdapterSetup" 
        }))
      );
    }
    
    const ollamaIPC = window.electronAPI.ollama;

    // Implement the OpenAiClient interface
    return OllamaOpenAIClientTag.of({
      "chat.completions.create": (params: CreateChatCompletionRequest) => {
        const ipcParams = { ...params }; // Pass params as is; main process OllamaService handles defaults if needed.

        if (params.stream) {
          // Stream implementation
          return Stream.asyncInterrupt<ChatCompletionChunk, OpenAiError>(emit => {
            Effect.runFork(telemetry.trackEvent({ 
              category: "ollama_adapter:stream", 
              action: "create_start", 
              label: params.model 
            }));
            
            let ipcStreamCancel: (() => void) | undefined;
            
            try {
              ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                ipcParams,
                (chunk) => {
                  if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                    emit.single(chunk as ChatCompletionChunk);
                  } else {
                    emit.failCause(Cause.die(new AIProviderError({
                      message: "Ollama IPC stream received unexpected chunk format",
                      provider: "OllamaAdapter(IPC-Stream)",
                      context: { chunk }
                    })));
                  }
                },
                () => {
                  Effect.runFork(telemetry.trackEvent({ 
                    category: "ollama_adapter:stream", 
                    action: "create_done", 
                    label: params.model 
                  }));
                  emit.end();
                },
                (error) => {
                  const ipcError = error && typeof error === 'object' && error.hasOwnProperty('__error') 
                    ? error as {__error: true, message: string} 
                    : { __error: true, message: String(error) };
                  
                  const providerError = new AIProviderError({
                    message: `Ollama IPC stream error: ${ipcError.message}`,
                    provider: "OllamaAdapter(IPC-Stream)",
                    cause: ipcError,
                    context: { model: params.model }
                  });
                  
                  Effect.runFork(telemetry.trackEvent({ 
                    category: "ollama_adapter:stream:error", 
                    action: "ipc_error", 
                    label: providerError.message 
                  }));
                  
                  emit.failCause(Cause.die(providerError));
                }
              );
            } catch (e) {
              const setupError = new AIProviderError({
                message: `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`,
                provider: "OllamaAdapterSetup(IPC-Stream)",
                cause: e
              });
              
              Effect.runFork(telemetry.trackEvent({ 
                category: "ollama_adapter:stream:error", 
                action: "setup_exception", 
                label: setupError.message 
              }));
              
              emit.failCause(Cause.die(setupError));
            }
            
            // Return a cancellation function
            return Effect.sync(() => {
              if (ipcStreamCancel) {
                Effect.runFork(telemetry.trackEvent({ 
                  category: "ollama_adapter:stream", 
                  action: "cancel_requested", 
                  label: params.model 
                }));
                ipcStreamCancel();
              }
            });
          }).pipe(
            Stream.mapError(err => new OpenAiError({ error: err as any })) // Map AIProviderError to OpenAiError
          );
        } else {
          // Non-streaming implementation
          return Effect.tryPromise({
            try: async () => {
              await Effect.runPromise(telemetry.trackEvent({ 
                category: "ollama_adapter:nonstream", 
                action: "create_start", 
                label: params.model 
              }));
              
              const response = await ollamaIPC.generateChatCompletion(ipcParams);
              
              if (response && response.__error) {
                const providerError = new AIProviderError({
                  message: `Ollama IPC error: ${response.message}`,
                  provider: "OllamaAdapter(IPC-NonStream)",
                  cause: response,
                  context: { model: params.model, originalError: response }
                });
                
                await Effect.runPromise(telemetry.trackEvent({ 
                  category: "ollama_adapter:nonstream:error", 
                  action: "ipc_error", 
                  label: providerError.message 
                }));
                
                throw providerError;
              }
              
              await Effect.runPromise(telemetry.trackEvent({ 
                category: "ollama_adapter:nonstream", 
                action: "create_success", 
                label: params.model 
              }));
              
              return response as ChatCompletion;
            },
            catch: (error) => {
              const providerError = error instanceof AIProviderError ? error : new AIProviderError({
                message: `Ollama IPC non-stream request failed: ${error instanceof Error ? error.message : String(error)}`,
                provider: "OllamaAdapter(IPC-NonStream)",
                cause: error,
                context: { model: params.model }
              });
              
              if (!(error instanceof AIProviderError)) {
                Effect.runFork(telemetry.trackEvent({ 
                  category: "ollama_adapter:nonstream:error", 
                  action: "request_exception", 
                  label: providerError.message 
                }));
              }
              
              return new OpenAiError({ error: providerError as any });
            }
          });
        }
      },
      
      // Stub implementations for other required methods
      "embeddings.create": (params) => 
        Effect.die(new AIProviderError({ 
          message: "OllamaAdapter: embeddings.create not implemented", 
          provider: "OllamaAdapter" 
        })),
      
      "models.list": () => 
        Effect.die(new AIProviderError({ 
          message: "OllamaAdapter: models.list not implemented", 
          provider: "OllamaAdapter" 
        })),
    });
  })
);