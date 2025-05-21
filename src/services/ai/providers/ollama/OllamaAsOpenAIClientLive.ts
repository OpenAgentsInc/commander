// src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
import { Layer, Effect, Stream, Cause, Context } from "effect";
import { OpenAiClient } from "@effect/ai-openai";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
// Import Stream chunk here rather than as a type since we need to use it as a value
import { StreamChunk } from "@effect/ai-openai/OpenAiClient";
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
      client: {
        chat: {
          completions: {
            create: (params: any) => {
              const ipcParams = { ...params }; // Pass params as is; main process OllamaService handles defaults if needed.
              
              // Non-streaming implementation (we handle streaming separately)
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
                  
                  // In practice, we'd need to properly map the response to match OpenAI's expected schema
                  return response;
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
                  
                  return new HttpClientError.ResponseError({
                    request: HttpClientRequest.get("ollama-ipc-nonstream"),
                    response: HttpClientResponse.json(
                      500, 
                      { error: providerError.message }, 
                      { headers: {} }
                    ),
                    reason: "StatusCode"
                  });
                }
              });
            }
          }
        },
        embeddings: {
          create: () => Effect.die(new AIProviderError({ 
            message: "OllamaAdapter: embeddings.create not implemented", 
            provider: "OllamaAdapter" 
          }))
        },
        models: {
          list: () => Effect.die(new AIProviderError({ 
            message: "OllamaAdapter: models.list not implemented", 
            provider: "OllamaAdapter" 
          }))
        }
      },
      
      streamRequest: (request) => Effect.die(new AIProviderError({ 
        message: "OllamaAdapter: streamRequest not implemented directly, use stream instead", 
        provider: "OllamaAdapter" 
      })),
      
      stream: (params: any) => {
        // Stream implementation
        return Stream.async<StreamChunk, HttpClientError.HttpClientError>(emit => {
          Effect.runFork(telemetry.trackEvent({ 
            category: "ollama_adapter:stream", 
            action: "create_start", 
            label: params.model 
          }));
          
          let ipcStreamCancel: (() => void) | undefined;
          
          try {
            ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
              params,
              (chunk) => {
                if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                  // Convert chunk to StreamChunk
                  // This is a simplification - in practice, we'd need to properly map the structure
                  const streamChunk = new StreamChunk({
                    parts: [
                      {
                        _tag: "Content",
                        content: chunk.choices[0]?.message?.content || ""
                      }
                    ]
                  });
                  emit.single(streamChunk);
                } else {
                  emit.fail(new HttpClientError.ResponseError({
                    request: HttpClientRequest.get("ollama-ipc-stream"),
                    response: HttpClientResponse.json(
                      500, 
                      { error: "Ollama IPC stream received unexpected chunk format" }, 
                      { headers: {} }
                    ),
                    reason: "StatusCode"
                  }));
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
                
                Effect.runFork(telemetry.trackEvent({ 
                  category: "ollama_adapter:stream:error", 
                  action: "ipc_error", 
                  label: ipcError.message || "Unknown IPC error" 
                }));
                
                emit.fail(new HttpClientError.ResponseError({
                  request: HttpClientRequest.get("ollama-ipc-stream"),
                  response: HttpClientResponse.json(
                    500, 
                    { 
                      error: `Ollama IPC stream error: ${ipcError.message || "Unknown error"}`,
                      context: { model: params.model }
                    }, 
                    { headers: {} }
                  ),
                  reason: "StatusCode"
                }));
              }
            );
          } catch (e) {
            const errorMsg = `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`;
            
            Effect.runFork(telemetry.trackEvent({ 
              category: "ollama_adapter:stream:error", 
              action: "setup_exception", 
              label: errorMsg 
            }));
            
            emit.fail(new HttpClientError.ResponseError({
              request: HttpClientRequest.get("ollama-ipc-stream"),
              response: HttpClientResponse.json(
                500, 
                { 
                  error: errorMsg,
                  provider: "OllamaAdapterSetup(IPC-Stream)"
                }, 
                { headers: {} }
              ),
              reason: "StatusCode"
            }));
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
        });
      }
    });
  })
);