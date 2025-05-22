// src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
import { Layer, Effect, Stream, Cause, Context } from "effect";
import { OpenAiClient } from "@effect/ai-openai";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
// Import StreamChunk class for compatibility
import { StreamChunk } from "@effect/ai-openai/OpenAiClient";
import type { Client } from "@effect/ai-openai/Generated";
import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";

// We are providing the standard OpenAiClient.OpenAiClient tag
export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

// Note: We're now importing these types from @effect/ai-openai instead of defining them locally
// The local definitions were causing type conflicts with the expected interface

export const OllamaAsOpenAIClientLive = Layer.effect(
  OllamaOpenAIClientTag,
  Effect.gen(function* (_) {
    const telemetry = yield* _(TelemetryService);

    // Check if the Ollama IPC bridge is available
    if (
      !window.electronAPI?.ollama?.generateChatCompletion ||
      !window.electronAPI?.ollama?.generateChatCompletionStream
    ) {
      const errorMsg =
        "Ollama IPC bridge (window.electronAPI.ollama functions) is not fully available.";
      yield* _(
        telemetry
          .trackEvent({
            category: "ollama_adapter:error",
            action: "ipc_unavailable",
            label: errorMsg,
          })
          .pipe(Effect.ignoreLogged),
      );

      return yield* _(
        Effect.die(
          new AIProviderError({
            message: errorMsg,
            provider: "OllamaAdapterSetup",
          }),
        ),
      );
    }

    const ollamaIPC = window.electronAPI.ollama;

    // Implement the OpenAiClient interface
    return OllamaOpenAIClientTag.of({
      // client property that adapts to the OpenAI client interface
      client: {
        chat: {
          completions: {
            create: (params: any): Effect.Effect<any, HttpClientError.HttpClientError> => {
              // Map the complex, readonly type to the simpler structure expected by IPC
              const nonStreamingParamsForIPC = {
                model: params.model,
                messages: params.messages.map((msg: any) => {
                  let contentString: string;
                  if (typeof msg.content === 'string') {
                    contentString = msg.content;
                  } else if (Array.isArray(msg.content)) {
                    // Handle array content (e.g., text parts for vision models)
                    contentString = msg.content
                      .filter((part: any) => part.type === 'text')
                      .map((part: any) => (part as { type: "text"; text: string }).text)
                      .join("\n");
                  } else {
                    // Handle null or other unexpected content forms
                    contentString = "";
                  }
                  return {
                    role: msg.role,
                    content: contentString,
                    name: msg.name, // Pass name if present
                  };
                }),
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                stream: false as const, // Explicitly set for clarity
              };

              return Effect.tryPromise({
                try: async () => {
                  await Effect.runPromise(
                    telemetry.trackEvent({
                      category: "ollama_adapter:nonstream",
                      action: "create_start",
                      label: params.model,
                    })
                  );

                  const response =
                    await ollamaIPC.generateChatCompletion(nonStreamingParamsForIPC);

                  if (response && response.__error) {
                    const providerError = new AIProviderError({
                      message: `Ollama IPC error: ${response.message}`,
                      provider: "OllamaAdapter(IPC-NonStream)",
                      cause: response,
                      context: { model: params.model, originalError: response },
                    });

                    await Effect.runPromise(
                      telemetry.trackEvent({
                        category: "ollama_adapter:nonstream:error",
                        action: "ipc_error",
                        label: providerError.message,
                      })
                    );

                    const request = HttpClientRequest.get("ollama-ipc-chat-error");
                    const webResponse = new Response(null, { status: 500 });
                    throw new HttpClientError.ResponseError({
                      request,
                      response: HttpClientResponse.fromWeb(request, webResponse),
                      reason: "StatusCode",
                      cause: providerError,
                      description: providerError.message || "Ollama IPC error",
                    });
                  }

                  await Effect.runPromise(
                    telemetry.trackEvent({
                      category: "ollama_adapter:nonstream",
                      action: "create_success",
                      label: params.model,
                    })
                  );

                  // Return OpenAI-compatible response
                  return response;
                },
                catch: (error) => {
                  if (error instanceof HttpClientError.ResponseError) return error;

                  const providerError =
                    error instanceof AIProviderError
                      ? error
                      : new AIProviderError({
                          message: `Ollama IPC non-stream request failed: ${error instanceof Error ? error.message : String(error)}`,
                          provider: "OllamaAdapter(IPC-NonStream)",
                          cause: error,
                          context: { model: params.model },
                        });

                  if (!(error instanceof AIProviderError)) {
                    Effect.runFork(
                      telemetry.trackEvent({
                        category: "ollama_adapter:nonstream:error",
                        action: "request_exception",
                        label: providerError.message,
                      })
                    );
                  }

                  const request = HttpClientRequest.get("ollama-ipc-chat-error");
                  const webResponse = new Response(null, { status: 500 });
                  return new HttpClientError.ResponseError({
                    request,
                    response: HttpClientResponse.fromWeb(request, webResponse),
                    reason: "StatusCode",
                    cause: providerError,
                    description: providerError.message || "Ollama IPC request failed",
                  });
                },
              });
            },
          },
        },
        
        embeddings: {
          create: (_params: any) => {
            const request = HttpClientRequest.get("ollama-ipc-embeddings");
            const webResponse = new Response(null, { status: 501 }); // Use null for body
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse), // CORRECTED
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "OllamaAdapter: embeddings.create not implemented",
                  provider: "OllamaAdapter",
                }),
                description: "OllamaAdapter: embeddings.create not implemented",
              })
            );
          },
        },
          
        models: {
          list: () => {
            const request = HttpClientRequest.get("ollama-ipc-models");
            const webResponse = new Response(null, { status: 501 }); // Use null for body
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse), // CORRECTED
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "OllamaAdapter: models.list not implemented",
                  provider: "OllamaAdapter",
                }),
                description: "OllamaAdapter: models.list not implemented",
              })
            );
          },
        },
          
        // Add minimal stubs for other required Client methods
        assistants: {
          list: (_options: any) => {
            const request = HttpClientRequest.get("ollama-ipc-assistants-list");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: assistants.list not implemented",
              })
            );
          },
          create: (_options: any) => {
            const request = HttpClientRequest.get("ollama-ipc-assistants-create");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: assistants.create not implemented",
              })
            );
          },
          retrieve: (_assistantId: string) => {
            const request = HttpClientRequest.get("ollama-ipc-assistants-retrieve");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: assistants.retrieve not implemented",
              })
            );
          },
          update: (_assistantId: string, _options: any) => {
            const request = HttpClientRequest.get("ollama-ipc-assistants-update");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: assistants.update not implemented",
              })
            );
          },
          del: (_assistantId: string) => {
            const request = HttpClientRequest.get("ollama-ipc-assistants-delete");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: assistants.del not implemented",
              })
            );
          },
        },
        completions: {
          create: (_options: any) => {
            const request = HttpClientRequest.get("ollama-ipc-completions-create");
            const webResponse = new Response(null, { status: 501 });
            return Effect.fail(
              new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                cause: new AIProviderError({
                  message: "Not implemented in Ollama adapter", 
                  provider: "OllamaAdapter"
                }),
                description: "OllamaAdapter: completions.create not implemented",
              })
            );
          },
        },
      },

      // Top-level stream method for streaming chat completions
      stream: (params: StreamCompletionRequest) => {
        // Ensure stream parameter is set to true
        const streamingParams = { ...params, stream: true };

        return Stream.async<StreamChunk, HttpClientError.HttpClientError>(
          (emit) => {
            Effect.runFork(
              telemetry.trackEvent({
                category: "ollama_adapter:stream",
                action: "create_start",
                label: params.model,
              }),
            );

            let ipcStreamCancel: (() => void) | undefined;

            try {
              ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                streamingParams,
                (chunk) => {
                  if (
                    chunk &&
                    typeof chunk === "object" &&
                    "choices" in chunk
                  ) {
                    // Convert chunk to a StreamChunk for compatibility
                    const content = chunk.choices?.[0]?.delta?.content || "";
                    const streamChunk = new StreamChunk({
                      parts: [
                        {
                          _tag: "Content",
                          content,
                        },
                      ],
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
                      message:
                        "Ollama IPC stream received unexpected chunk format",
                      provider: "OllamaAdapter(IPC-Stream)",
                      context: { chunk },
                    });
                    const request = HttpClientRequest.get("ollama-ipc-stream-error");
                    const webResponse = new Response(null, { status: 500 });
                    emit.fail(
                      new HttpClientError.ResponseError({
                        request,
                        response: HttpClientResponse.fromWeb(request, webResponse),
                        reason: "StatusCode",
                        cause: err,
                        description: err.message || "Unexpected stream chunk format",
                      })
                    );
                  }
                },
                () => {
                  Effect.runFork(
                    telemetry.trackEvent({
                      category: "ollama_adapter:stream",
                      action: "create_done",
                      label: params.model,
                    }),
                  );
                  emit.end();
                },
                (error) => {
                  const ipcError =
                    error &&
                    typeof error === "object" &&
                    error.hasOwnProperty("__error")
                      ? (error as { __error: true; message: string })
                      : { __error: true, message: String(error) };

                  Effect.runFork(
                    telemetry.trackEvent({
                      category: "ollama_adapter:stream:error",
                      action: "ipc_error",
                      label: ipcError.message || "Unknown IPC error",
                    }),
                  );

                  const providerError = new AIProviderError({
                    message: `Ollama IPC stream error: ${ipcError.message || "Unknown error"}`,
                    provider: "OllamaAdapter(IPC-Stream)",
                    cause: error,
                    context: { model: params.model },
                  });

                  const request = HttpClientRequest.get("ollama-ipc-stream-error");
                  const webResponse = new Response(null, { status: 500 });
                  emit.fail(
                    new HttpClientError.ResponseError({
                      request,
                      response: HttpClientResponse.fromWeb(request, webResponse),
                      reason: "StatusCode",
                      cause: providerError,
                      description: providerError.message || "Ollama IPC stream error",
                    })
                  );
                },
              );
            } catch (e) {
              const errorMsg = `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`;

              Effect.runFork(
                telemetry.trackEvent({
                  category: "ollama_adapter:stream:error",
                  action: "setup_exception",
                  label: errorMsg,
                }),
              );

              const setupError = new AIProviderError({
                message: errorMsg,
                provider: "OllamaAdapterSetup(IPC-Stream)",
                cause: e,
              });

              const request = HttpClientRequest.get("ollama-ipc-stream-setup-error");
              const webResponse = new Response(null, { status: 500 });
              emit.fail(
                new HttpClientError.ResponseError({
                  request,
                  response: HttpClientResponse.fromWeb(request, webResponse),
                  reason: "StatusCode",
                  cause: setupError,
                  description: setupError.message || "Failed to setup Ollama IPC stream",
                })
              );
            }

            // Return a cancellation function
            return Effect.sync(() => {
              if (ipcStreamCancel) {
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "ollama_adapter:stream",
                    action: "cancel_requested",
                    label: params.model,
                  }),
                );
                ipcStreamCancel();
              }
            });
          },
        );
      },

      // streamRequest method (can be a stub if not needed)
      streamRequest: <A>(_request: HttpClientRequest.HttpClientRequest) => {
        const request = HttpClientRequest.get("ollama-ipc-streamrequest");
        const webResponse = new Response(null, { status: 501 });
        return Stream.fail(
          new HttpClientError.ResponseError({
            request,
            response: HttpClientResponse.fromWeb(request, webResponse),
            reason: "StatusCode",
            cause: new AIProviderError({
              message: "OllamaAdapter: streamRequest not implemented directly",
              provider: "OllamaAdapter",
            }),
            description: "OllamaAdapter: streamRequest not implemented directly",
          })
        ) as Stream.Stream<A, HttpClientError.HttpClientError>;
      },
    });
  }),
);
