// src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
import { Layer, Effect, Stream, Cause, Context } from "effect";
import { OpenAiClient } from "@effect/ai-openai";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
// Import StreamChunk class for compatibility
import { StreamChunk } from "@effect/ai-openai/OpenAiClient";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";

// We are providing the standard OpenAiClient.OpenAiClient tag
export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

// Types for chat completions
type ChatCompletionCreateParams = {
  model: string;
  messages: Array<{role: string; content: string}>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: any;
};

type ChatCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {role: string; content: string};
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type ChatCompletionChunk = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {role?: string; content?: string};
    finish_reason: string | null;
  }>;
  usage?: any;
};

type StreamCompletionRequest = ChatCompletionCreateParams & {
  stream: true;
};

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
      // client property containing methods like chat.completions.create
      client: {
        chat: {
          completions: {
            create: (params: ChatCompletionCreateParams) => {
              // Ensure stream is explicitly false for this path
              const nonStreamingParams = { ...params, stream: false };
              
              return Effect.tryPromise({
                try: async () => {
                  await Effect.runPromise(telemetry.trackEvent({ 
                    category: "ollama_adapter:nonstream", 
                    action: "create_start", 
                    label: params.model 
                  }));
                  
                  const response = await ollamaIPC.generateChatCompletion(nonStreamingParams);
                  
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
                  
                  // Return OpenAI-compatible response
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
                  
                  // Use HttpClientError for compatibility with OpenAiClient interface
                  return new HttpClientError.ResponseError({
                    request: HttpClientRequest.get("ollama-ipc-nonstream"),
                    response: HttpClientResponse.empty({ status: 500 }),
                    reason: "StatusCode",
                    cause: providerError,
                    message: providerError.message
                  });
                }
              });
            }
          }
        },
        embeddings: {
          create: (_params: any) => Effect.fail(new HttpClientError.ResponseError({
            request: HttpClientRequest.get("ollama-ipc-embeddings"),
            response: HttpClientResponse.empty({ status: 501 }),
            reason: "StatusCode",
            cause: new AIProviderError({ 
              message: "OllamaAdapter: embeddings.create not implemented", 
              provider: "OllamaAdapter" 
            }),
            message: "OllamaAdapter: embeddings.create not implemented"
          }))
        },
        models: {
          list: () => Effect.fail(new HttpClientError.ResponseError({
            request: HttpClientRequest.get("ollama-ipc-models"),
            response: HttpClientResponse.empty({ status: 501 }),
            reason: "StatusCode",
            cause: new AIProviderError({ 
              message: "OllamaAdapter: models.list not implemented", 
              provider: "OllamaAdapter" 
            }),
            message: "OllamaAdapter: models.list not implemented"
          }))
        }
      },
      
      // Top-level stream method for streaming chat completions
      stream: (params: StreamCompletionRequest) => {
        // Ensure stream parameter is set to true
        const streamingParams = { ...params, stream: true };
        
        return Stream.async<StreamChunk, HttpClientError.HttpClientError>(emit => {
          Effect.runFork(telemetry.trackEvent({ 
            category: "ollama_adapter:stream", 
            action: "create_start", 
            label: params.model 
          }));
          
          let ipcStreamCancel: (() => void) | undefined;
          
          try {
            ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
              streamingParams,
              (chunk) => {
                if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                  // Convert chunk to a StreamChunk for compatibility
                  const content = chunk.choices?.[0]?.delta?.content || "";
                  const streamChunk = new StreamChunk({
                    parts: [
                      {
                        _tag: "Content",
                        content
                      }
                    ]
                  });
                  emit.single(streamChunk);
                  
                  /* Commented out ChatCompletionChunk format since we're using StreamChunk
                  const openAiChunk = {
                    id: chunk.id || `ollama-chunk-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: chunk.created || Math.floor(Date.now() / 1000),
                    model: chunk.model || params.model,
                    choices: chunk.choices.map((ollamaChoice: any) => ({
                      index: ollamaChoice.index,
                      delta: {
                        role: ollamaChoice.delta?.role,
                        content: ollamaChoice.delta?.content,
                      },
                      finish_reason: ollamaChoice.finish_reason || null,
                    })),
                  };
                  */
                } else {
                  const err = new AIProviderError({
                    message: "Ollama IPC stream received unexpected chunk format",
                    provider: "OllamaAdapter(IPC-Stream)",
                    context: { chunk }
                  });
                  emit.fail(new HttpClientError.ResponseError({
                    request: HttpClientRequest.get("ollama-ipc-stream"),
                    response: HttpClientResponse.empty({ status: 500 }),
                    reason: "StatusCode",
                    cause: err,
                    message: err.message
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
                
                const providerError = new AIProviderError({
                  message: `Ollama IPC stream error: ${ipcError.message || "Unknown error"}`,
                  provider: "OllamaAdapter(IPC-Stream)",
                  cause: error,
                  context: { model: params.model }
                });
                
                emit.fail(new HttpClientError.ResponseError({
                  request: HttpClientRequest.get("ollama-ipc-stream-error"),
                  response: HttpClientResponse.empty({ status: 500 }),
                  reason: "StatusCode",
                  cause: providerError,
                  message: providerError.message
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
            
            const setupError = new AIProviderError({
              message: errorMsg,
              provider: "OllamaAdapterSetup(IPC-Stream)",
              cause: e
            });
            
            emit.fail(new HttpClientError.ResponseError({
              request: HttpClientRequest.get("ollama-ipc-stream-setup"),
              response: HttpClientResponse.empty({ status: 500 }),
              reason: "StatusCode",
              cause: setupError,
              message: setupError.message
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
      },
      
      // streamRequest method (can be a stub if not needed)
      streamRequest: <A>(request: HttpClientRequest.HttpClientRequest) =>
        Stream.fail(new HttpClientError.ResponseError({
          request,
          response: HttpClientResponse.empty({ status: 501 }),
          reason: "StatusCode",
          cause: new AIProviderError({ 
            message: "OllamaAdapter: streamRequest not implemented directly", 
            provider: "OllamaAdapter" 
          }),
          message: "OllamaAdapter: streamRequest not implemented directly"
        })) as Stream.Stream<A, HttpClientError.HttpClientError>,
    });
  })
);