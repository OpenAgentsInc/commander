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
import { StreamChunk } from "@effect/ai-openai/OpenAiClient"; // Import the class directly

import * as HttpClientError from "@effect/platform/HttpClientError";
import { isHttpClientError } from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import { AIProviderError } from "@/services/ai/core/AIError";
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
          new AIProviderError({
            message: errorMsg,
            provider: "OllamaAdapterSetup",
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
          cause: new AIProviderError({
            message: `Not implemented in Ollama adapter: ${methodName}`, 
            provider: "OllamaAdapter"
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

              const response = await ollamaIPC.generateChatCompletion(ipcParams);

              if (response && response.__error) {
                const providerError = new AIProviderError({
                  message: `Ollama IPC error: ${response.message}`,
                  provider: "OllamaAdapter(IPC-NonStream)",
                  cause: response,
                  context: { model: options.model, originalError: response },
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
            },
            catch: (error) => {
              // If already an HttpClientError, return it
              if (isHttpClientError(error)) {
                return error;
              }

              // Ensure any other caught error is wrapped in AIProviderError then HttpClientError
              const providerError =
                error instanceof AIProviderError
                  ? error
                  : new AIProviderError({
                      message: `Ollama IPC non-stream request failed: ${error instanceof Error ? error.message : String(error)}`,
                      provider: "OllamaAdapter(IPC-NonStream)",
                      cause: error,
                      context: { model: options.model },
                    });

              // Log telemetry only if it wasn't an AIProviderError initially (to avoid double logging if it was already logged)
              if (!(error instanceof AIProviderError)) {
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "ollama_adapter:nonstream:error",
                    action: "request_exception",
                    label: providerError.message,
                  })
                );
              }
              
              const request = HttpClientRequest.post("ollama-ipc-chat-exception");
              const webResponse = new Response(JSON.stringify(providerError), { status: 500 });
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
                  } else {
                    const err = new AIProviderError({
                      message:
                        "Ollama IPC stream received unexpected chunk format",
                      provider: "OllamaAdapter(IPC-Stream)",
                      context: { chunk },
                    });
                    
                    const request = HttpClientRequest.post("ollama-ipc-stream-chunk-error");
                    const webResponse = new Response(JSON.stringify(err), { status: 500 });
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

                  const request = HttpClientRequest.post("ollama-ipc-stream-error");
                  const webResponse = new Response(JSON.stringify(providerError), { status: 500 });
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

              const request = HttpClientRequest.post("ollama-ipc-stream-setup-error");
              const webResponse = new Response(JSON.stringify(setupError), { status: 500 });
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