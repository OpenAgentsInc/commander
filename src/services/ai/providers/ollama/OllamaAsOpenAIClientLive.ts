// src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
import { Layer, Effect, Stream, Cause, Context, Data } from "effect"; // Added Data
import { OpenAiClient } from "@effect/ai-openai"; // This is the main Tag

// Types from Generated.d.ts (OpenAI SDK structure)
import type {
  CreateChatCompletionRequest, // Used for typeof T.Encoded
  CreateChatCompletionResponse,
  CreateEmbeddingRequest,     // For stub
  CreateEmbeddingResponse,    // For stub
  ListModelsResponse,         // For stub
} from "@effect/ai-openai/Generated"; // Correct path to Generated types

// Types from OpenAiClient.d.ts (Effect AI wrapper)
import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient";
import * as AiResponse from "@effect/ai/AiResponse";

import * as HttpClientError from "@effect/platform/HttpClientError";
import { isHttpClientError } from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import { AiProviderError } from "@/services/ai/core/AiError";
import { TelemetryService } from "@/services/telemetry";
// ParseError may be needed if you do complex parsing that can fail
import type { ParseError } from "effect/ParseResult";

// We are providing the standard OpenAiClient.OpenAiClient tag
export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

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
          new AiProviderError({
            message: errorMsg,
            provider: "Ollama",
            isRetryable: false,
          }),
        ),
      );
    }

    const ollamaIPC = window.electronAPI.ollama;

    // Helper function to generate stub implementations for all the required methods
    const stubMethod = (methodName: string) => {
      const request = HttpClientRequest.get(`ollama-ipc-${methodName}`);
      const webResponse = new Response(null, { status: 501 });
      return Effect.fail(
        new HttpClientError.ResponseError({
          request,
          response: HttpClientResponse.fromWeb(request, webResponse),
          reason: "StatusCode",
          cause: new AiProviderError({
            message: `Not implemented in Ollama adapter: ${methodName}`,
            provider: "Ollama",
            isRetryable: false,
          }),
          description: `OllamaAdapter: ${methodName} not implemented`,
        })
      );
    };

    // Implement the OpenAiClient interface
    return OllamaOpenAIClientTag.of({
      // client property that adapts to the OpenAI client interface
      client: {
        createChatCompletion: (
          options: typeof CreateChatCompletionRequest.Encoded,
        ): Effect.Effect<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError> => {
          // Map the library's 'options' to the structure expected by your IPC call
          const ipcParams = {
            model: options.model,
            messages: options.messages.map(msg => {
              let contentString: string;
              if (typeof msg.content === 'string') {
                contentString = msg.content;
              } else if (Array.isArray(msg.content)) {
                // Handle array content (e.g., text parts for vision models)
                // For a simple Ollama text chat, join text parts.
                contentString = msg.content
                  .filter(part => part.type === 'text')
                  .map(part => (part as { type: "text"; text: string }).text)
                  .join("\n");
              } else {
                contentString = ""; // Handle null or other cases
              }

              // Create a basic message object with required fields
              const message: { role: string; content: string; name?: string } = {
                role: msg.role,
                content: contentString,
              };

              // Only add name if present in the message and not for role 'tool'
              if (msg.role !== 'tool' && 'name' in msg && msg.name) {
                message.name = msg.name;
              }

              return message;
            }),
            temperature: options.temperature,
            max_tokens: options.max_tokens,
            stream: false as const, // Explicitly set stream: false for non-streaming
            // Add any other parameters your IPC call expects, mapping from 'options'
            ...(options.top_p && { top_p: options.top_p }),
            ...(options.frequency_penalty && { frequency_penalty: options.frequency_penalty }),
            // ... and so on for other common parameters
          };

          return Effect.tryPromise<typeof CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>({
            try: async () => {
              await Effect.runPromise(
                telemetry.trackEvent({
                  category: "ollama_adapter:nonstream",
                  action: "create_start",
                  label: options.model,
                })
              );

              try {
                // Check if the IPC function exists and is callable
                if (!ollamaIPC || typeof ollamaIPC.generateChatCompletion !== 'function') {
                  throw new Error("Ollama IPC generateChatCompletion function is not available");
                }

                // Call the IPC function and await the response
                const response = await ollamaIPC.generateChatCompletion(ipcParams);

                // Defensive check for response
                if (!response) {
                  throw new Error("Ollama IPC returned null or undefined response");
                }

                // Check for error in response
                if (response.__error) {
                  const providerError = new AiProviderError({
                    message: `Ollama IPC error: ${response.message || "Unknown error"}`,
                    provider: "Ollama",
                    cause: response,
                    isRetryable: true,
                  });

                  await Effect.runPromise(
                    telemetry.trackEvent({
                      category: "ollama_adapter:nonstream:error",
                      action: "ipc_error",
                      label: providerError.message,
                    })
                  );

                  // Create a HttpClientError.ResponseError as expected by the interface
                  const request = HttpClientRequest.post("ollama-ipc-chat-error");
                  const webResponse = new Response(JSON.stringify(providerError), { status: 500 });
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
                    label: options.model,
                  })
                );

                // Return the response as CreateChatCompletionResponse.Type
                return response as typeof CreateChatCompletionResponse.Type;
              } catch (error) {
                // Rethrow to be caught by the outer catch handler
                throw error;
              }
            },
            catch: (error) => {
              // If already an HttpClientError or ParseError, rethrow it.
              if (HttpClientError.isHttpClientError(error) || (error as any)?._tag === "ParseError") {
                return error as HttpClientError.HttpClientError | ParseError;
              }

              // Check if the error is an Effect instance (should never happen, but might in tests)
              if (error && typeof error === 'object' && '_op' in error) {
                console.warn('Detected an Effect instance being thrown as an error. This is likely a mistake in test mocking.');
                // Create a plain object error instead
                error = new Error(`Unexpected Effect in error path: ${JSON.stringify({ _tag: (error as any)._tag })}`);
              }

              // Ensure any other caught error is wrapped in AiProviderError then HttpClientError
              const providerError =
                error instanceof AiProviderError
                  ? error
                  : new AiProviderError({
                    message: `Ollama IPC non-stream request failed: ${error instanceof Error ? error.message : String(error)}`,
                    provider: "Ollama",
                    cause: error,
                    isRetryable: true,
                  });

              // Log telemetry only if it wasn't an AiProviderError initially (to avoid double logging if it was already logged)
              if (!(error instanceof AiProviderError)) {
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "ollama_adapter:nonstream:error",
                    action: "request_exception",
                    label: providerError.message,
                  })
                );
              }

              const request = HttpClientRequest.post(options.model);
              const webResponse = new Response(JSON.stringify(providerError.message), { status: 500 });
              return new HttpClientError.ResponseError({
                request,
                response: HttpClientResponse.fromWeb(request, webResponse),
                reason: "StatusCode",
                description: providerError.message,
                cause: providerError // The 'cause' here is AiProviderError
              });
            },
          });
        },

        // Core methods
        createEmbedding: (_options: typeof CreateEmbeddingRequest.Encoded) => stubMethod("createEmbedding"),
        listModels: () => stubMethod("listModels"),

        // Assistant methods
        listAssistants: (_options: any) => stubMethod("listAssistants"),
        createAssistant: (_options: any) => stubMethod("createAssistant"),
        getAssistant: (_assistantId: string) => stubMethod("getAssistant"),
        modifyAssistant: (_assistantId: string, _options: any) => stubMethod("modifyAssistant"),
        deleteAssistant: (_assistantId: string) => stubMethod("deleteAssistant"),

        // Speech/Audio methods
        createSpeech: (_options: any) => stubMethod("createSpeech"),
        createTranscription: (_options: any) => stubMethod("createTranscription"),
        createTranslation: (_options: any) => stubMethod("createTranslation"),

        // Batch methods
        listBatches: (_options: any) => stubMethod("listBatches"),
        createBatch: (_options: any) => stubMethod("createBatch"),
        retrieveBatch: (_batchId: string) => stubMethod("retrieveBatch"),
        cancelBatch: (_batchId: string) => stubMethod("cancelBatch"),

        // Legacy completions
        createCompletion: (_options: any) => stubMethod("createCompletion"),

        // File methods
        listFiles: (_options: any) => stubMethod("listFiles"),
        createFile: (_options: any) => stubMethod("createFile"),
        retrieveFile: (_fileId: string) => stubMethod("retrieveFile"),
        deleteFile: (_fileId: string) => stubMethod("deleteFile"),
        downloadFile: (_fileId: string) => stubMethod("downloadFile"),

        // Fine-tuning methods
        listPaginatedFineTuningJobs: (_options: any) => stubMethod("listPaginatedFineTuningJobs"),
        createFineTuningJob: (_options: any) => stubMethod("createFineTuningJob"),
        retrieveFineTuningJob: (_fineTuningJobId: string) => stubMethod("retrieveFineTuningJob"),
        cancelFineTuningJob: (_fineTuningJobId: string) => stubMethod("cancelFineTuningJob"),
        listFineTuningJobCheckpoints: (_fineTuningJobId: string, _options: any) => stubMethod("listFineTuningJobCheckpoints"),
        listFineTuningEvents: (_fineTuningJobId: string, _options: any) => stubMethod("listFineTuningEvents"),

        // Image methods
        createImageEdit: (_options: any) => stubMethod("createImageEdit"),
        createImage: (_options: any) => stubMethod("createImage"),
        createImageVariation: (_options: any) => stubMethod("createImageVariation"),

        // Model methods
        retrieveModel: (_model: string) => stubMethod("retrieveModel"),
        deleteModel: (_model: string) => stubMethod("deleteModel"),

        // Moderation methods
        createModeration: (_options: any) => stubMethod("createModeration"),

        // Audit logs methods
        listAuditLogs: (_options: any) => stubMethod("listAuditLogs"),

        // Invite methods
        listInvites: (_options: any) => stubMethod("listInvites"),
        inviteUser: (_options: any) => stubMethod("inviteUser"),
        retrieveInvite: (_inviteId: string) => stubMethod("retrieveInvite"),
        deleteInvite: (_inviteId: string) => stubMethod("deleteInvite"),

        // Project methods
        listProjects: (_options: any) => stubMethod("listProjects"),
        createProject: (_options: any) => stubMethod("createProject"),
        retrieveProject: (_projectId: string) => stubMethod("retrieveProject"),
        modifyProject: (_projectId: string, _options: any) => stubMethod("modifyProject"),
        listProjectApiKeys: (_projectId: string, _options: any) => stubMethod("listProjectApiKeys"),
        retrieveProjectApiKey: (_projectId: string, _keyId: string) => stubMethod("retrieveProjectApiKey"),
        deleteProjectApiKey: (_projectId: string, _keyId: string) => stubMethod("deleteProjectApiKey"),
        archiveProject: (_projectId: string) => stubMethod("archiveProject"),
        listProjectServiceAccounts: (_projectId: string, _options: any) => stubMethod("listProjectServiceAccounts"),
        createProjectServiceAccount: (_projectId: string, _options: any) => stubMethod("createProjectServiceAccount"),
        retrieveProjectServiceAccount: (_projectId: string, _serviceAccountId: string) => stubMethod("retrieveProjectServiceAccount"),
        deleteProjectServiceAccount: (_projectId: string, _serviceAccountId: string) => stubMethod("deleteProjectServiceAccount"),

        // Project User methods
        listProjectUsers: (_projectId: string, _options: any) => stubMethod("listProjectUsers"),
        createProjectUser: (_projectId: string, _options: any) => stubMethod("createProjectUser"),
        retrieveProjectUser: (_projectId: string, _userId: string) => stubMethod("retrieveProjectUser"),
        modifyProjectUser: (_projectId: string, _userId: string, _options: any) => stubMethod("modifyProjectUser"),
        deleteProjectUser: (_projectId: string, _userId: string) => stubMethod("deleteProjectUser"),

        // User methods
        listUsers: (_options: any) => stubMethod("listUsers"),
        retrieveUser: (_userId: string) => stubMethod("retrieveUser"),
        modifyUser: (_userId: string, _options: any) => stubMethod("modifyUser"),
        deleteUser: (_userId: string) => stubMethod("deleteUser"),

        // Thread methods
        createThread: (_options: any) => stubMethod("createThread"),
        getThread: (_threadId: string) => stubMethod("getThread"),
        modifyThread: (_threadId: string, _options: any) => stubMethod("modifyThread"),
        deleteThread: (_threadId: string) => stubMethod("deleteThread"),

        // Message methods
        createMessage: (_threadId: string, _options: any) => stubMethod("createMessage"),
        getMessage: (_threadId: string, _messageId: string) => stubMethod("getMessage"),
        modifyMessage: (_threadId: string, _messageId: string, _options: any) => stubMethod("modifyMessage"),
        deleteMessage: (_threadId: string, _messageId: string) => stubMethod("deleteMessage"),
        listMessages: (_threadId: string, _options: any) => stubMethod("listMessages"),

        // Run methods
        createRun: (_threadId: string, _options: any) => stubMethod("createRun"),
        getRun: (_threadId: string, _runId: string) => stubMethod("getRun"),
        modifyRun: (_threadId: string, _runId: string, _options: any) => stubMethod("modifyRun"),
        cancelRun: (_threadId: string, _runId: string) => stubMethod("cancelRun"),
        submitToolOuputsToRun: (_threadId: string, _runId: string, _options: any) => stubMethod("submitToolOuputsToRun"),
        listRuns: (_threadId: string, _options: any) => stubMethod("listRuns"),
        listRunSteps: (_threadId: string, _runId: string, _options: any) => stubMethod("listRunSteps"),
        getRunStep: (_threadId: string, _runId: string, _stepId: string, _options: any) => stubMethod("getRunStep"),
        createThreadAndRun: (_options: any) => stubMethod("createThreadAndRun"),

        // Upload methods
        createUpload: (_options: any) => stubMethod("createUpload"),
        addUploadPart: (_uploadId: string, _options: any) => stubMethod("addUploadPart"),
        completeUpload: (_uploadId: string, _options: any) => stubMethod("completeUpload"),
        cancelUpload: (_uploadId: string) => stubMethod("cancelUpload"),

        // Vector store methods
        createVectorStore: (_options: any) => stubMethod("createVectorStore"),
        getVectorStore: (_vectorStoreId: string) => stubMethod("getVectorStore"),
        modifyVectorStore: (_vectorStoreId: string, _options: any) => stubMethod("modifyVectorStore"),
        deleteVectorStore: (_vectorStoreId: string) => stubMethod("deleteVectorStore"),
        listVectorStores: (_options: any) => stubMethod("listVectorStores"),
        createVectorStoreFile: (_vectorStoreId: string, _options: any) => stubMethod("createVectorStoreFile"),
        getVectorStoreFile: (_vectorStoreId: string, _fileId: string) => stubMethod("getVectorStoreFile"),
        deleteVectorStoreFile: (_vectorStoreId: string, _fileId: string) => stubMethod("deleteVectorStoreFile"),
        listVectorStoreFiles: (_vectorStoreId: string, _options: any) => stubMethod("listVectorStoreFiles"),
        createVectorStoreFileBatch: (_vectorStoreId: string, _options: any) => stubMethod("createVectorStoreFileBatch"),
        getVectorStoreFileBatch: (_vectorStoreId: string, _batchId: string) => stubMethod("getVectorStoreFileBatch"),
        cancelVectorStoreFileBatch: (_vectorStoreId: string, _batchId: string) => stubMethod("cancelVectorStoreFileBatch"),
        listFilesInVectorStoreBatch: (_vectorStoreId: string, _batchId: string, _options: any) => stubMethod("listFilesInVectorStoreBatch"),
      },

      // Top-level stream method for streaming chat completions
      stream: (params: StreamCompletionRequest) => {
        // Ensure stream parameter is set to true
        const streamingParams = { ...params, stream: true };

        console.log(`[OllamaAsOpenAIClientLive] Starting stream for ${params.model} with params:`, JSON.stringify(streamingParams, null, 2));

        return Stream.async<AiResponse.AiResponse, HttpClientError.HttpClientError>(
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
              console.log(`[OllamaAsOpenAIClientLive] Setting up IPC stream for ${params.model}`);

              ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                streamingParams,
                (chunk) => {
                  console.log(`[OllamaAsOpenAIClientLive] IPC onChunk received for ${params.model}:`, JSON.stringify(chunk).substring(0, 100));

                  if (
                    chunk &&
                    typeof chunk === "object" &&
                    "choices" in chunk
                  ) {
                    // Convert chunk to an AiResponse for compatibility
                    const content = chunk.choices?.[0]?.delta?.content || "";
                    const finishReason = chunk.choices?.[0]?.finish_reason;
                    const parts: any[] = [];
                    if (content) {
                      parts.push(new AiResponse.TextPart({
                        text: content,
                        annotations: []
                      }));
                    }
                    const aiResponse = new AiResponse.AiResponse({
                      parts
                    });
                    console.log(`[OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for ${params.model}:`, JSON.stringify(aiResponse));
                    emit.single(aiResponse);
                  } else {
                    console.error(`[OllamaAsOpenAIClientLive] Invalid chunk format for ${params.model}:`, chunk);
                    const err = new AiProviderError({
                      message:
                        "Ollama IPC stream received unexpected chunk format",
                      provider: "Ollama",
                      isRetryable: false,
                    });

                    const request = HttpClientRequest.post("ollama-ipc-stream-chunk-error");
                    const webResponse = new Response(JSON.stringify(err), { status: 500 });
                    console.log(`[OllamaAsOpenAIClientLive] Calling emit.fail() for ${params.model} due to invalid chunk format`);
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
                  console.log(`[OllamaAsOpenAIClientLive] IPC onDone received for ${params.model}. Calling emit.end().`);
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
                  console.error(`[OllamaAsOpenAIClientLive] IPC onError received for ${params.model}:`, error);
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

                  const providerError = new AiProviderError({
                    message: `Ollama IPC stream error: ${ipcError.message || "Unknown error"}`,
                    provider: "Ollama",
                    cause: error,
                    isRetryable: true,
                  });

                  const request = HttpClientRequest.post("ollama-ipc-stream-error");
                  const webResponse = new Response(JSON.stringify(providerError), { status: 500 });
                  console.log(`[OllamaAsOpenAIClientLive] Calling emit.fail() for ${params.model} due to IPC error`);
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
              console.error(`[OllamaAsOpenAIClientLive] Failed to setup IPC stream for ${params.model}:`, e);
              const errorMsg = `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`;

              Effect.runFork(
                telemetry.trackEvent({
                  category: "ollama_adapter:stream:error",
                  action: "setup_exception",
                  label: errorMsg,
                }),
              );

              const setupError = new AiProviderError({
                message: errorMsg,
                provider: "Ollama",
                cause: e,
                isRetryable: false,
              });

              const request = HttpClientRequest.post("ollama-ipc-stream-setup-error");
              const webResponse = new Response(JSON.stringify(setupError), { status: 500 });
              console.log(`[OllamaAsOpenAIClientLive] Calling emit.fail() for ${params.model} due to setup error`);
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
                console.log(`[OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with ${params.model}. ipcStreamCancel called.`);
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
            cause: new AiProviderError({
              message: "OllamaAdapter: streamRequest not implemented directly",
              provider: "Ollama",
              isRetryable: false,
            }),
            description: "OllamaAdapter: streamRequest not implemented directly",
          })
        ) as Stream.Stream<A, HttpClientError.HttpClientError>;
      },
    });
  }),
);
