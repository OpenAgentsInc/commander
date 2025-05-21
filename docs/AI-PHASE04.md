# AI Roadmap: Phase 4 - Refactor Ollama Integration as an OpenAI-Compatible Provider

**Objective:** Integrate the existing local Ollama functionality into the new AI backend architecture by creating an adapter layer. This will make Ollama accessible through the standard `AgentLanguageModel.Tag`, allowing it to be used interchangeably with other providers like OpenAI and Anthropic, and benefit from features like `AiPlan` for resilience.

**Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Strict adherence to Effect-TS patterns (`Context.Tag`, `Layer`, `Effect`) for all new services and modifications.
- **Prerequisites:**
  - Phases 0, 1, 2, and 3 of the AI Roadmap are conceptually complete. Key interfaces like `AgentLanguageModel.Tag`, `AgentChatMessage`, and error types like `AIProviderError` are defined and used. The `AgentLanguageModel` interface methods now use `AIProviderError` in their error channel.
  - An OpenAI-compatible provider (from Phase 2, e.g., `OpenAIAgentLanguageModelLive`) is available.
  - The `AgentChatPane` (from Phase 3) uses `AgentLanguageModel.Tag` for its interactions.
  - Commander has an existing IPC mechanism for Ollama calls (`ollama-listeners.ts` in main, `ollama-context.ts` in preload), and an `OllamaService` (e.g., `src/services/ollama/OllamaServiceImpl.ts`) that handles direct interaction with Ollama's API (assumed to be its OpenAI-compatible `/v1/chat/completions` endpoint).
- **Core Strategy:**
  1.  Create an `OllamaAsOpenAIClientLive` layer. This layer will implement the `OpenAiClient.OpenAiClient` interface (from `@effect/ai-openai`). Instead of making direct HTTP calls, this client's methods will use the existing IPC bridge (`window.electronAPI.ollama`) to send requests to the main process.
  2.  The main process IPC handlers in `src/helpers/ipc/ollama/ollama-listeners.ts` must be updated/verified to:
      - Accept OpenAI-compatible request payloads.
      - Utilize the existing main-process `OllamaService` (from `src/services/ollama/`) to interact with Ollama's `/v1/chat/completions` endpoint.
      - Return OpenAI-compatible responses (including streaming Server-Sent Events for chat completions) to the renderer.
  3.  Create an `OllamaAgentLanguageModelLive` layer, similar in structure to `OpenAIAgentLanguageModelLive`. This layer will provide `AgentLanguageModel.Tag`. Crucially, because our Ollama adapter (`OllamaAsOpenAIClientLive`) presents an `OpenAiClient` interface, this new `AgentLanguageModel` layer will still be built using `OpenAiLanguageModel.model(...)` from the `@effect/ai-openai` package.
- **Testing:** Comprehensive unit tests for the new adapter layers and updated IPC handlers are mandatory.

---

## Phase 4 Tasks:

**Task 4.1: Create Directory and Index Files for Ollama Provider**

1.  **Action:** Ensure the directory `src/services/ai/providers/ollama/` exists.
2.  **Action:** Create/Update `src/services/ai/providers/ollama/index.ts`:
    ```typescript
    // src/services/ai/providers/ollama/index.ts
    export * from "./OllamaAsOpenAIClientLive";
    export * from "./OllamaAgentLanguageModelLive";
    ```
3.  **Action:** Update `src/services/ai/providers/index.ts` to include the Ollama provider:
    ```typescript
    // src/services/ai/providers/index.ts
    export * as OpenAIProvider from "./openai";
    // export * as AnthropicProvider from "./anthropic"; // Placeholder for Phase 5
    export * as OllamaProvider from "./ollama"; // Add/ensure this line
    ```

**Task 4.2: Implement `OllamaAsOpenAIClientLive` IPC Adapter Layer**

This layer provides an `OpenAiClient.OpenAiClient` service tag. Its implementation will adapt calls to this interface into IPC calls to the main process.

1.  **Action:** Create `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    import { Layer, Effect, Stream, Cause, Context } from "effect";
    import { OpenAiClient, OpenAiError } from "@effect/ai-openai";
    import type {
      ChatCompletion,
      ChatCompletionChunk,
      CreateChatCompletionRequest,
    } from "@effect/ai-openai/OpenAiClient";
    import { ConfigurationService } from "@/services/configuration";
    import { AIProviderError } from "@/services/ai/core/AIError";
    import { TelemetryService } from "@/services/telemetry";

    export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient; // We are providing this standard Tag

    export const OllamaAsOpenAIClientLive = Layer.effect(
      OllamaOpenAIClientTag,
      Effect.gen(function* (_) {
        const telemetry = yield* _(TelemetryService);
        // Optional: const configService = yield* _(ConfigurationService); // For default Ollama model if IPC needs it

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

        return OllamaOpenAIClientTag.of({
          "chat.completions.create": (
            params: CreateChatCompletionRequest,
          ):
            | Effect.Effect<ChatCompletion, OpenAiError>
            | Stream.Stream<ChatCompletionChunk, OpenAiError> => {
            const ipcParams = { ...params }; // Pass params as is; main process OllamaService handles defaults if needed.

            if (params.stream) {
              return Stream.asyncInterrupt<ChatCompletionChunk, OpenAiError>(
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
                      ipcParams,
                      (chunk) => {
                        if (
                          chunk &&
                          typeof chunk === "object" &&
                          "choices" in chunk
                        ) {
                          emit.single(chunk as ChatCompletionChunk);
                        } else {
                          emit.failCause(
                            Cause.die(
                              new AIProviderError({
                                message:
                                  "Ollama IPC stream received unexpected chunk format",
                                provider: "OllamaAdapter(IPC-Stream)",
                                context: { chunk },
                              }),
                            ),
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
                        const providerError = new AIProviderError({
                          message: `Ollama IPC stream error: ${ipcError.message}`,
                          provider: "OllamaAdapter(IPC-Stream)",
                          cause: ipcError,
                          context: { model: params.model },
                        });
                        Effect.runFork(
                          telemetry.trackEvent({
                            category: "ollama_adapter:stream:error",
                            action: "ipc_error",
                            label: providerError.message,
                          }),
                        );
                        emit.failCause(Cause.die(providerError));
                      },
                    );
                  } catch (e) {
                    const setupError = new AIProviderError({
                      message: `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`,
                      provider: "OllamaAdapterSetup(IPC-Stream)",
                      cause: e,
                    });
                    Effect.runFork(
                      telemetry.trackEvent({
                        category: "ollama_adapter:stream:error",
                        action: "setup_exception",
                        label: setupError.message,
                      }),
                    );
                    emit.failCause(Cause.die(setupError));
                  }
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
              ).pipe(
                Stream.mapError(
                  (err) => new OpenAiError({ error: err as any }),
                ), // Map AIProviderError to OpenAiError
              );
            } else {
              return Effect.tryPromise({
                try: async () => {
                  await Effect.runPromise(
                    telemetry.trackEvent({
                      category: "ollama_adapter:nonstream",
                      action: "create_start",
                      label: params.model,
                    }),
                  );
                  const response =
                    await ollamaIPC.generateChatCompletion(ipcParams);
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
                      }),
                    );
                    throw providerError;
                  }
                  await Effect.runPromise(
                    telemetry.trackEvent({
                      category: "ollama_adapter:nonstream",
                      action: "create_success",
                      label: params.model,
                    }),
                  );
                  return response as ChatCompletion;
                },
                catch: (error) => {
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
                      }),
                    );
                  }
                  return new OpenAiError({ error: providerError as any });
                },
              });
            }
          },
          "embeddings.create": (params) =>
            Effect.die(
              new AIProviderError({
                message: "OllamaAdapter: embeddings.create not implemented",
                provider: "OllamaAdapter",
              }),
            ),
          "models.list": () =>
            Effect.die(
              new AIProviderError({
                message: "OllamaAdapter: models.list not implemented",
                provider: "OllamaAdapter",
              }),
            ),
          // Add stubs for other methods defined in OpenAiClient.OpenAiClient if any.
        });
      }),
    );
    ```

**Task 4.3: Implement `OllamaAgentLanguageModelLive` Layer**

This layer provides `AgentLanguageModel.Tag` and uses the Ollama-adapted `OpenAiClient`.

1.  **Action:** Create `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import {
      AgentLanguageModel,
      GenerateTextOptions,
      StreamTextOptions,
      GenerateStructuredOptions,
      AiResponse,
      AiTextChunk,
    } from "@/services/ai/core";
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
    import { ConfigurationService } from "@/services/configuration";
    import {
      AIProviderError,
      AIConfigurationError,
    } from "@/services/ai/core/AIError";
    import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
    import { TelemetryService } from "@/services/telemetry";

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel.Tag,
      Effect.gen(function* (_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gemma3:1b"),
          Effect.tapError((e) =>
            telemetry
              .trackEvent({
                category: "ai:config:error",
                action: "ollama_model_name_fetch_failed",
                label: "OLLAMA_MODEL_NAME",
                value: (e as Error).message || String(e),
              })
              .pipe(Effect.ignoreLogged),
          ),
          Effect.mapError(
            (e) =>
              new AIConfigurationError({
                message: "Error fetching Ollama Model Name.",
                cause: e,
                context: { keyName: "OLLAMA_MODEL_NAME" },
              }),
          ),
        );
        const modelName = yield* _(modelNameEffect);
        yield* _(
          telemetry
            .trackEvent({
              category: "ai:config",
              action: "ollama_model_name_resolved",
              value: modelName,
            })
            .pipe(Effect.ignoreLogged),
        );

        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient,
          ollamaAdaptedClient,
        );
        const provider = yield* _(configuredAiModelEffect);
        yield* _(
          telemetry
            .trackEvent({
              category: "ai:config",
              action: "ollama_language_model_provider_created",
              value: modelName,
            })
            .pipe(Effect.ignoreLogged),
        );

        return AgentLanguageModel.Tag.of({
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions) =>
            provider.generateText(params).pipe(
              Effect.mapError(
                (err) =>
                  new AIProviderError({
                    message: `Ollama generateText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                    cause: err,
                    provider: "Ollama",
                    context: {
                      model: modelName,
                      params,
                      originalErrorTag: (err as any)._tag,
                    },
                  }),
              ),
            ),
          streamText: (params: StreamTextOptions) =>
            provider.streamText(params).pipe(
              Stream.mapError(
                (err) =>
                  new AIProviderError({
                    message: `Ollama streamText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                    cause: err,
                    provider: "Ollama",
                    context: {
                      model: modelName,
                      params,
                      originalErrorTag: (err as any)._tag,
                    },
                  }),
              ),
            ),
          generateStructured: (params: GenerateStructuredOptions) =>
            provider.generateStructured(params).pipe(
              Effect.mapError(
                (err) =>
                  new AIProviderError({
                    message: `Ollama generateStructured error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                    cause: err,
                    provider: "Ollama",
                    context: {
                      model: modelName,
                      params,
                      originalErrorTag: (err as any)._tag,
                    },
                  }),
              ),
            ),
        });
      }),
    );
    ```

**Task 4.4: Update Ollama IPC Handlers (`ollama-listeners.ts`)**

The main process IPC handlers are critical. They must correctly use the main process `OllamaService` to call Ollama's `/v1/chat/completions` endpoint and ensure request/response formats are OpenAI-compatible.

1.  **Action:** Modify `src/helpers/ipc/ollama/ollama-listeners.ts`.
2.  **Details:**
    - **Initialize Main Process Services:** Ensure `OllamaService` and `TelemetryService` are initialized in the main process context. This might involve creating a small main-process Effect runtime.
    - **`ollamaChannels.checkStatus` Handler:** Should use `mainProcessOllamaService.checkOllamaStatus()`.
    - **`ollamaChannels.chatCompletion` (Non-Streaming) Handler:**
      - Accepts an `OllamaChatCompletionRequest` (OpenAI-compatible) from the renderer.
      - Calls `mainProcessOllamaService.generateChatCompletion(request)`.
      - Returns the `OllamaChatCompletionResponse` (OpenAI-compatible) or a serialized error.
    - **`ollamaChannels.chatCompletionStream` (Streaming) Handler:**
      - Accepts an `OllamaChatCompletionRequest`.
      - Calls `mainProcessOllamaService.generateChatCompletionStream({ ...request, stream: true })`.
      - Iterates over the `Stream<OllamaOpenAIChatStreamChunk, ...>` returned by the service.
      - For each chunk, sends it to the renderer via `event.sender.send(${ollamaChannels.chatCompletionStream}:chunk, requestId, chunk)`.
      - Sends `:done` or `:error` messages to the renderer upon stream completion or failure.
      - Handles stream cancellation requests from the renderer.
    - **Error Serialization:** Use a helper like `extractErrorForIPC` (from previous logs) to serialize errors before sending over IPC.

**Task 4.5: Update Configuration & UI for Provider Selection**

1.  **`ConfigurationService`**: Ensure settings like `OLLAMA_MODEL_NAME` (e.g., "gemma3:1b") and `OLLAMA_ENABLED` (boolean) are manageable.
2.  **`AgentChatPane.tsx` (Conceptual for this phase):**
    - The UI will eventually need to allow selecting "Ollama" as a provider.
    - For testing Phase 4, you can temporarily make Ollama the default provider in `FullAppLayer` (Task 4.7).

**Task 4.6: Refactor Existing Ollama Users (e.g., `Kind5050DVMService`, `useChat.ts`)**

1.  **`src/components/chat/useChat.ts`**:
    - This hook currently uses `window.electronAPI.ollama` directly for local Ollama chat.
    - **Refactor:** It should be modified to use `AgentLanguageModel.Tag` instead. This makes it provider-agnostic.
    - The `AgentChatPane` (from Phase 3) should be the primary chat interface using the new AI backend. If `useChat.ts` is still used elsewhere for a simple Ollama chat, it too must be updated. _If it's only used by the old `ChatContainer` which is now wrapped by `AgentChatPane`, this refactor might not be strictly necessary for `AgentChatPane` to function with Ollama via the new backend, but it's good for consistency._
2.  **`Kind5050DVMService` (`src/services/dvm/Kind5050DVMServiceImpl.ts`):**
    - Currently, this service uses `OllamaService.Tag` directly.
    - **Refactor:** Change its dependency from `OllamaService.Tag` to `AgentLanguageModel.Tag`.
    - When processing jobs, it will use the provided `AgentLanguageModel` instance. If Ollama is the configured provider, this will be `OllamaAgentLanguageModelLive`.
    - Prepare requests as `AgentChatMessage[]` or `GenerateTextOptions` and handle responses accordingly.

**Task 4.7: Runtime Integration Update (`FullAppLayer`)**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**

    - Import the new Ollama provider layers: `OllamaAsOpenAIClientLive`, `OllamaAgentLanguageModelLive`.
    - Compose them into `FullAppLayer`.
    - **To test Ollama as the default:**

      ```typescript
      // src/services/runtime.ts
      import {
        OllamaAsOpenAIClientLive,
        OllamaAgentLanguageModelLive,
      } from "@/services/ai/providers/ollama";
      // ... other imports ...

      const ollamaAdapterClientLayer = OllamaAsOpenAIClientLive.pipe(
        Layer.provide(telemetryLayer),
        // Layer.provide(configLayer) // If OllamaAsOpenAIClientLive needs ConfigurationService for default model
      );

      const ollamaAgentLanguageModelLayer = OllamaAgentLanguageModelLive.pipe(
        Layer.provide(ollamaAdapterClientLayer),
        Layer.provide(devConfigLayer), // For OLLAMA_MODEL_NAME from ConfigurationService
      );

      export const FullAppLayer = Layer.mergeAll(
        telemetryLayer,
        devConfigLayer, // Provides ConfigurationService
        BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient
        // ... other non-AI service layers ...
        // nostrLayer, nip04Layer, sparkLayer, etc.

        // Comment out OpenAI as the default AgentLanguageModel provider
        // openAIAgentLanguageModelLayer,

        // Add Ollama as the AgentLanguageModel provider
        ollamaAgentLanguageModelLayer,
        // ... other application layers like DVM service (which will now use AgentLanguageModel) ...
      );
      ```

    - **Note on Dynamic Provider Selection:** For a more flexible system where the user can choose the provider at runtime, a "Provider Factory Service" will be needed in a later phase. This factory would take a provider key (e.g., "openai", "ollama") and return the corresponding `AgentLanguageModel` service. For Phase 4, manually setting the default in `FullAppLayer` is sufficient.

---

## Tests for Phase 4

**I. Unit Tests for `OllamaAsOpenAIClientLive` (`src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`)**

- **File:** `src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`
- **Setup:**
  - Mock `window.electronAPI.ollama` (for `generateChatCompletion` and `generateChatCompletionStream`).
  - Mock `TelemetryService` and `ConfigurationService` (if used by the client layer).
  - Provide these mocks using `Layer.succeed`.
- **Test Cases:**
  1.  **Layer Build:**
      - Test successful instantiation if `window.electronAPI.ollama` functions are available.
      - Test layer build failure (e.g., `Effect.die` is caught) if IPC functions are missing.
  2.  **`chat.completions.create` (Non-Streaming):**
      - Given valid `CreateChatCompletionRequest`, verify `ollamaIPC.generateChatCompletion` is called with these params.
      - Simulate successful IPC response (OpenAI `ChatCompletion` format). Assert the Effect resolves to this response.
      - Simulate IPC error response (e.g., `{ __error: true, message: "IPC error" }`). Assert the Effect fails with an `OpenAiError` wrapping an `AIProviderError` containing the IPC error details.
      - Simulate an exception during the `ollamaIPC.generateChatCompletion` call (e.g., IPC not available at runtime). Assert the Effect fails with an `OpenAiError`.
  3.  **`chat.completions.create` (Streaming):**
      - Given `CreateChatCompletionRequest` with `stream: true`.
      - Verify `ollamaIPC.generateChatCompletionStream` is called.
      - Mock the `onChunk` callback from IPC: ensure the stream emits `ChatCompletionChunk` objects.
      - Mock the `onDone` callback: ensure the stream completes.
      - Mock the `onError` callback: ensure the stream fails with an `OpenAiError` wrapping an `AIProviderError`.
      - Test that the returned `Effect.sync(...)` (for cancellation) calls the `ipcStreamCancel` function when executed.
  4.  **Telemetry:** For all methods, verify `TelemetryService.trackEvent` is called for key events (start, success, error, cancel).

**II. Unit Tests for `OllamaAgentLanguageModelLive` (`src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`)**

- **File:** `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`
- **Setup:**
  - Mock `OllamaOpenAIClientTag` (which resolves to an `OpenAiClient.OpenAiClient` implementation). This mock client should have `vi.fn()` for `chat.completions.create`.
  - Mock `ConfigurationService` to provide `OLLAMA_MODEL_NAME`.
  - Mock `TelemetryService`.
- **Test Cases:**
  1.  **Layer Build & Configuration:**
      - Test successful layer build.
      - Verify `OpenAiLanguageModel.model(...)` is called by the layer, using the model name from `ConfigurationService` (or the default if not configured).
  2.  **`generateText` Method:**
      - Call `agentLanguageModel.generateText(params)`.
      - Verify it calls the mocked `ollamaAdaptedClient["chat.completions.create"]` with `stream: false` and correct params.
      - If client returns success: Assert method returns the expected `AiResponse`.
      - If client returns `OpenAiError`: Assert method maps it to an `AIProviderError` with `provider: "Ollama"` and includes original error as `cause`.
  3.  **`streamText` Method:**
      - Call `agentLanguageModel.streamText(params)`.
      - Verify it calls `ollamaAdaptedClient["chat.completions.create"]` with `stream: true`.
      - If client returns success stream: Assert method returns a stream of `AiTextChunk`.
      - If client returns error stream: Assert method maps it to an `AIProviderError`.
  4.  **`generateStructured` Method:** (Similar to `generateText`, but note that Ollama's direct support for structured output via OpenAI API mode might vary; test according to what the underlying `OpenAiLanguageModel.model(...).generateStructured` would attempt).
  5.  **Telemetry:** Verify configuration loading and provider creation events are tracked.

**III. Unit Tests for IPC Handlers (`src/tests/unit/helpers/ipc/ollama-listeners.test.ts`)**

- **File:** `src/tests/unit/helpers/ipc/ollama-listeners.test.ts` (May require an Electron testing environment like `electron-vitest` or careful mocking of `ipcMain`).
- **Setup:**
  - Mock the main process `OllamaService` and its methods (`generateChatCompletion`, `generateChatCompletionStream`, `checkOllamaStatus`).
  - Mock `TelemetryService` for the main process.
  - Simulate `ipcMain.handle` and `ipcMain.on` calls.
- **Test Cases for `addOllamaEventListeners()`:**
  1.  **Status Check Handler (`ollamaChannels.checkStatus`):**
      - Simulate `invoke`. Verify it calls `mainProcessOllamaService.checkOllamaStatus()`.
      - Test success (returns `true`/`false`) and error paths.
  2.  **Non-Streaming Handler (`ollamaChannels.chatCompletion`):**
      - Simulate `invoke` with an OpenAI-compatible `request` payload.
      - Verify it calls `mainProcessOllamaService.generateChatCompletion(request)`.
      - If service succeeds: Assert handler returns the `OllamaChatCompletionResponse`.
      - If service fails: Assert handler returns a serialized error object (using `extractErrorForIPC`).
  3.  **Streaming Handler (`ollamaChannels.chatCompletionStream`):**
      - Simulate `on` event with `requestId` and `request`.
      - Verify it calls `mainProcessOllamaService.generateChatCompletionStream({ ...request, stream: true })`.
      - Mock the stream from `OllamaService` to emit `OllamaOpenAIChatStreamChunk`s. Verify `event.sender.send` is called with `${channel}:chunk`, `requestId`, and the chunk.
      - Simulate stream completion. Verify `:done` is sent.
      - Simulate stream error. Verify `:error` is sent with serialized error.
      - Simulate stream cancellation request. Verify the stream processing is stopped.
  4.  **Telemetry:** Verify `mainProcessTelemetryService.trackEvent` is called for IPC requests and responses/errors.

**IV. Integration Tests (Refactored Services - e.g., `Kind5050DVMService.test.ts`)**

- **File:** e.g., `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
- **Setup:**
  - If `Kind5050DVMService` (or other services like `useChat.ts`) are refactored to use `AgentLanguageModel.Tag`:
    - Update their test setups to provide `AgentLanguageModel.Tag`.
    - Create a specific test suite or context where `OllamaAgentLanguageModelLive` is the provided implementation.
    - Mock the underlying IPC bridge (`window.electronAPI.ollama`) for this test to simulate the main process responses.
- **Test Cases:**
  - Test the core functionality of the service (e.g., DVM job processing for `Kind5050DVMService`) ensuring it works correctly when the `AgentLanguageModel` is backed by the Ollama provider.
  - Verify requests are formatted correctly for `AgentLanguageModel` and responses are handled as expected.

**V. Runtime Integration Test (`src/tests/unit/services/runtime.test.ts`)**

1.  **Modify `FullAppLayer`:** Temporarily set `OllamaAgentLanguageModelLive` as the default provider for `AgentLanguageModel.Tag`.
2.  **Test:** Augment the existing test "should successfully resolve AgentLanguageModel from FullAppLayer".
    - After resolving `AgentLanguageModel.Tag`, call one of its methods (e.g., `generateText` with a simple prompt).
    - Mock `window.electronAPI.ollama.generateChatCompletion` to return a valid (but minimal) `OllamaChatCompletionResponse`.
    - Assert that the call succeeds, indicating the Ollama provider chain is correctly wired up in `FullAppLayer`.

---

This refactoring makes Ollama a fully integrated and interchangeable provider within the new AI backend, paving the way for more advanced features like multi-provider plans and unified tool use. The updated IPC handlers are crucial for maintaining the OpenAI-compatible abstraction.

````

## Agent Pitfalls and Best Practices for Phase 4

This document outlines common pitfalls an AI agent might encounter while implementing Phase 4 (Refactoring Ollama Integration) of the Commander AI Roadmap, along with best practices to avoid them.

**Phase 4 Objective:** Make the existing Ollama integration conform to the new AI backend by creating an adapter that presents Ollama as an OpenAI-compatible provider. This involves routing requests through the existing IPC mechanism but translating them to/from the `OpenAiClient` interface used by `@effect/ai-openai`.

---

### 1. IPC Handler (`ollama-listeners.ts`) Implementation

*   **Pitfall:** IPC handlers in the main process (`ollama-listeners.ts`) directly calling Ollama's native API (e.g., `/api/chat`) instead of Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`) or an `OllamaService` that uses the compatible endpoint.
*   **Consequence:** The renderer-side adapter (`OllamaAsOpenAIClientLive`) will send OpenAI-formatted requests, but if the IPC handler expects/sends Ollama-native format, there will be a mismatch. Responses will also be in the wrong format.
*   **Best Practice:**
    1.  Ensure the main process `OllamaService` (from `src/services/ollama/OllamaServiceImpl.ts`) is robust and primarily uses Ollama's `/v1/chat/completions` endpoint.
    2.  The IPC handlers in `ollama-listeners.ts` **MUST** depend on and use this `OllamaService` instance.
    3.  The `OllamaService` methods (`generateChatCompletion`, `generateChatCompletionStream`) should accept OpenAI-compatible request objects (like `CreateChatCompletionRequest`) and return OpenAI-compatible responses (`ChatCompletion`, `Stream<ChatCompletionChunk>`). This keeps the translation logic within `OllamaServiceImpl.ts`.
    4.  The IPC handler's main job becomes passing the request to `OllamaService` and relaying its (already OpenAI-compatible) response.

*   **Pitfall:** Incorrectly handling streaming SSE events from Ollama in the IPC stream handler.
*   **Consequence:** Renderer receives malformed chunks, incomplete streams, or no "done" signal.
*   **Best Practice:**
    1.  The `ollamaService.generateChatCompletionStream` in the main process should yield individual `OllamaOpenAIChatStreamChunk` objects (which are OpenAI `ChatCompletionChunk` compatible).
    2.  The IPC handler in `ollama-listeners.ts` should iterate this stream and send each `OllamaOpenAIChatStreamChunk` object (JSON-stringified if necessary, but typically objects are fine over IPC) to the renderer using `event.sender.send(${channelName}:chunk, requestId, chunk)`.
    3.  Properly signal stream end (`:done`) and errors (`:error`) to the renderer.

### 2. Renderer Adapter (`OllamaAsOpenAIClientLive.ts`)

*   **Pitfall:** The `OllamaAsOpenAIClientLive` layer attempting to do too much translation between Ollama-native and OpenAI formats.
*   **Consequence:** Duplication of logic that should reside in the main process `OllamaService` or IPC handlers. Increased complexity in the renderer.
*   **Best Practice:** `OllamaAsOpenAIClientLive` should assume that the IPC bridge (`window.electronAPI.ollama...`) it calls already speaks the OpenAI API protocol. Its main job is to map the `OpenAiClient.OpenAiClient` interface calls to the corresponding IPC calls and map IPC responses/errors back to `OpenAiClient`'s expected types (e.g., `OpenAiError`).

*   **Pitfall:** Incorrect error mapping in `OllamaAsOpenAIClientLive`. The `OpenAiClient.OpenAiClient` interface expects methods to fail with `OpenAiError` (from `@effect/ai-openai`).
*   **Consequence:** Type errors if the adapter returns `AIProviderError` directly where `OpenAiError` is expected by `OpenAiLanguageModel.model()`.
*   **Best Practice:**
    1.  Catch errors from IPC calls (which should ideally be structured, e.g., `AIProviderError` serialized from main).
    2.  Wrap these errors in `new OpenAiError({ error: yourAIProviderErrorInstance })` before failing the Effect/Stream.

### 3. `OllamaAgentLanguageModelLive.ts`

*   **Pitfall:** Trying to use a custom `OllamaLanguageModel.model(...)` factory instead of the one from `@effect/ai-openai`.
*   **Consequence:** Unnecessary complexity and potential deviation from `@effect/ai` patterns.
*   **Best Practice:** Since `OllamaAsOpenAIClientLive` provides the standard `OpenAiClient.OpenAiClient` tag and speaks the OpenAI protocol (via IPC), the `OllamaAgentLanguageModelLive` layer **SHOULD** use `OpenAiLanguageModel.model(...)` from `@effect/ai-openai`. It simply provides its Ollama-backed client to this standard model factory.
    ```typescript
    // Inside OllamaAgentLanguageModelLive
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is an OpenAiClient
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName); // Use standard OpenAI model factory
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient, // The Tag it requires
      ollamaAdaptedClient         // Our adapter that fulfills it
    );
    const provider = yield* _(configuredAiModelEffect);
    // ... then wrap provider methods to map errors to AIProviderError with provider: "Ollama"
    ```

*   **Pitfall:** Error types in `OllamaAgentLanguageModelLive` not matching the `AgentLanguageModel` interface (which expects `AIProviderError`).
*   **Consequence:** Type errors.
*   **Best Practice:** Ensure all methods (`generateText`, `streamText`, `generateStructured`) in `OllamaAgentLanguageModelLive` map any errors from the underlying `OpenAiLanguageModel` provider (which might be `OpenAiError` or a generic `AiError`) into your application's `AIProviderError` type, setting `provider: "Ollama"`.

### 4. Configuration

*   **Pitfall:** Confusion about where `OLLAMA_BASE_URL` is used.
*   **Consequence:** Incorrect Ollama endpoint being called.
*   **Best Practice:**
    1.  `OLLAMA_BASE_URL` is primarily a main process concern. The `UiOllamaConfigLive` should provide this to the main process `OllamaService`.
    2.  The renderer-side components (like `OllamaAsOpenAIClientLive` or `OllamaAgentLanguageModelLive`) generally do not need `OLLAMA_BASE_URL` because they talk to IPC, not directly to Ollama.
    3.  `OLLAMA_MODEL_NAME` *is* needed by `OllamaAgentLanguageModelLive` to pass to `OpenAiLanguageModel.model(modelName)`.

### 5. Testing

*   **Pitfall:** Not adequately testing the IPC layer and the main process `OllamaService` behavior with OpenAI-compatible formats.
*   **Consequence:** The adapter in the renderer might work based on assumptions that the main process doesn't fulfill.
*   **Best Practice:**
    1.  Write unit tests for `ollama-listeners.ts` (IPC handlers) that mock the main process `OllamaService`. These tests should verify that OpenAI-formatted requests are correctly passed to `OllamaService` and that its (OpenAI-formatted) responses/streams are correctly relayed back.
    2.  Ensure `OllamaServiceImpl.ts` tests cover its interaction with Ollama's `/v1/chat/completions` endpoint using OpenAI-compatible structures.

*   **Pitfall:** Mocking `window.electronAPI.ollama` in `OllamaAsOpenAIClientLive.test.ts` to return Ollama-native responses instead of OpenAI-compatible responses.
*   **Consequence:** Tests for the adapter might pass, but the integration fails because the real IPC bridge (backed by `ollama-listeners.ts`) is expected to handle the OpenAI compatibility.
*   **Best Practice:** Mocks for `window.electronAPI.ollama` in renderer tests should simulate the behavior of the *actual IPC handler*, meaning they should return data as if it came from an OpenAI-compatible endpoint (because `ollama-listeners.ts` ensures this).

### 6. Refactoring Existing Services (e.g., `Kind5050DVMService`)

*   **Pitfall:** Forgetting to update services that used `OllamaService.Tag` directly.
*   **Consequence:** Inconsistent AI interaction patterns, and these services won't benefit from the new `AgentLanguageModel` abstraction or `AiPlan`.
*   **Best Practice:** Thoroughly identify all previous direct users of `OllamaService` and refactor them to use `AgentLanguageModel.Tag`. Update
````
