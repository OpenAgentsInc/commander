Okay, Agent, here are the specific instructions for implementing **Phase 4 (Refactor Ollama Integration as an OpenAI-Compatible Provider)**. This phase is critical for unifying AI provider interactions and leveraging the `@effect/ai` patterns for local models.

**Preamble for the Coding Agent:**

*   **Effect-TS Best Practices:** Continue strict adherence.
*   **Directory Structure:** New files related to this specific Ollama adapter will go into `src/services/ai/providers/ollama/`.
*   **Prerequisites:** Phases 0, 1, 2, and 3 must be completed. You need `AgentLanguageModel.Tag`, a working `OpenAIClient.OpenAiClient` interface from `@effect/ai-openai`, and the existing IPC mechanism for Ollama.
*   **IPC for Ollama:** The current Commander app proxies Ollama requests through the main Electron process via IPC (`ollama-listeners.ts` and `ollama-context.ts`). This phase will build an adapter on top of this IPC mechanism.
*   **OpenAI Compatibility of Ollama:** Ollama's `/v1/chat/completions` endpoint aims to be OpenAI-compatible. This refactor leverages that compatibility.

---

## Phase 4: Refactor Ollama Integration as an OpenAI-Compatible Provider

**Objective:** Make the existing Ollama integration conform to the new AI backend by creating an adapter that presents Ollama as an OpenAI-compatible provider. This involves routing requests through the existing IPC mechanism but translating them to/from the `OpenAiClient` interface used by `@effect/ai-openai`.

**Task 4.1: Create Directory and Index Files**

1.  **Action:** Create the directory `src/services/ai/providers/ollama/` (if it doesn't exist from previous phases like a basic `OllamaService`).
2.  **Action:** Create/Update `src/services/ai/providers/ollama/index.ts`:
    ```typescript
    // src/services/ai/providers/ollama/index.ts
    export * from "./OllamaAsOpenAIClientLive"; // New adapter client
    export * from "./OllamaAgentLanguageModelLive";
    ```
3.  **Action:** Update `src/services/ai/providers/index.ts`:
    ```typescript
    // src/services/ai/providers/index.ts
    export * as OpenAIProvider from "./openai";
    export * as AnthropicProvider from "./anthropic"; // For later
    export * as OllamaProvider from "./ollama"; // Add/Update this line
    ```

**Task 4.2: Implement `OllamaAsOpenAIClientLive` Layer (IPC Adapter)**

This is the core of the refactor. This layer will provide an `OpenAiClient.OpenAiClient` but its implementation will use `window.electronAPI.ollama` (IPC) to communicate with the main process, which then calls Ollama.

1.  **Action:** Create the file `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    import { Layer, Effect, Stream, Cause, Fiber } from "effect";
    import { OpenAiClient, OpenAiError, ChatCompletion, ChatCompletionChunk } from "@effect/ai-openai"; // Use types from @effect/ai-openai
    import type { CreateChatCompletionRequest } from "@effect/ai-openai/OpenAiClient"; // Specific request type
    import { ConfigurationService } from "@/services/configuration"; // To get OLLAMA_BASE_URL if needed by IPC layer, though likely not
    import { AIProviderError } from "@/services/ai/core/AIError";
    import { TelemetryService } from "@/services/telemetry"; // For logging

    // This is the service tag we are providing an implementation for
    export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

    export const OllamaAsOpenAIClientLive = Layer.effect(
      OllamaOpenAIClientTag,
      Effect.gen(function*(_) {
        // const configService = yield* _(ConfigurationService); // May not be needed if IPC handles URL
        const telemetry = yield* _(TelemetryService);

        // Check if electronAPI is available (important for non-Electron test environments)
        if (!window.electronAPI?.ollama) {
            const errorMsg = "Ollama IPC bridge (window.electronAPI.ollama) is not available. Cannot create Ollama client.";
            yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "ipc_unavailable_error", label: errorMsg }));
            return yield* _(Effect.die(new AIProviderError({ message: errorMsg, provider: "OllamaAdapter" })));
        }

        const ollamaIPC = window.electronAPI.ollama;

        return OllamaOpenAIClientTag.of({
          // Implement the OpenAiClient interface methods
          // Primarily, we need to implement `chat.completions.create` for both streaming and non-streaming

          // --- Non-Streaming Chat Completions ---
          "chat.completions.create": (params: CreateChatCompletionRequest) => {
            if (params.stream && params.stream !== false) { // Explicitly check for true or a stream options object
              // --- Streaming Chat Completions ---
              return Stream.asyncInterrupt<ChatCompletionChunk, OpenAiError, never>(emit => {
                yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "stream_create_start", label: params.model }));

                let ipcStreamCancel: (() => void) | undefined;
                try {
                  ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                    params, // Pass OpenAI compatible params directly to IPC
                    (chunk) => { // onChunk
                      // Ollama IPC gives us chunks that should already be OpenAI compatible
                      // due to the main process listener's transformation.
                      // We need to cast/validate it to ChatCompletionChunk
                      // For now, assume it's correctly formatted by the IPC listener.
                      if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                        emit.single(chunk as ChatCompletionChunk);
                      } else {
                        // This might be an error or an unexpected chunk format
                        console.warn("[OllamaAdapter] Received unexpected stream chunk format:", chunk);
                        // Optionally, emit an error or ignore
                      }
                    },
                    () => { // onDone
                      yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "stream_create_done", label: params.model }));
                      emit.end();
                    },
                    (error) => { // onError
                      console.error("[OllamaAdapter] IPC Stream Error:", error);
                      const providerError = new AIProviderError({
                          message: `Ollama IPC stream error: ${error.message || "Unknown IPC stream error"}`,
                          provider: "Ollama(IPC)",
                          cause: error,
                          context: { model: params.model }
                      });
                      yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "stream_create_error", label: providerError.message }));
                      emit.failCause(Cause.die(providerError)); // Use Cause.die for unexpected errors
                    }
                  );
                } catch (e) {
                    const setupError = new AIProviderError({
                        message: `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`,
                        provider: "OllamaAdapterSetup",
                        cause: e
                    });
                    yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "stream_setup_exception", label: setupError.message }));
                    emit.failCause(Cause.die(setupError));
                }
                // Return a Left containing the cancel function for the stream
                return Effect.sync(() => {
                  if (ipcStreamCancel) {
                    yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "stream_cancel_requested", label: params.model }));
                    ipcStreamCancel();
                  }
                });
              });
            } else {
              // --- Non-Streaming Chat Completions ---
              return Effect.tryPromise({
                try: async () => {
                  yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "non_stream_create_start", label: params.model }));
                  const response = await ollamaIPC.generateChatCompletion(params); // OpenAI compatible params
                  if (response && response.__error) { // Error from IPC
                    yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "non_stream_ipc_error", label: response.message }));
                    throw new AIProviderError({
                        message: `Ollama IPC error: ${response.message}`,
                        provider: "Ollama(IPC)",
                        cause: response,
                        context: { model: params.model }
                    });
                  }
                  yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "non_stream_create_success", label: params.model }));
                  // Assume response is already OpenAI ChatCompletion compatible
                  return response as ChatCompletion;
                },
                catch: (error) => {
                  const providerError = new AIProviderError({
                      message: `Ollama IPC request failed: ${error instanceof Error ? error.message : String(error)}`,
                      provider: "Ollama(IPC)",
                      cause: error,
                      context: { model: params.model }
                  });
                  yield* _(telemetry.trackEvent({ category: "ollama_adapter", action: "non_stream_create_exception", label: providerError.message }));
                  return new OpenAiError({ error: providerError }); // Wrap in OpenAiError as expected by the interface
                }
              });
            }
          },
          // --- Other OpenAiClient methods (embeddings, models, etc.) ---
          // These would need to be implemented if used. For AgentChat, only chat.completions is critical.
          // For now, stub them to throw NotImplemented or return a sensible default.
          "embeddings.create": (params) => Effect.die(new AIProviderError({ message: "OllamaAdapter: embeddings.create not implemented", provider:"OllamaAdapter" })),
          "models.list": () => Effect.die(new AIProviderError({ message: "OllamaAdapter: models.list not implemented", provider:"OllamaAdapter" })),
          // Add stubs for other methods if OpenAiClient.OpenAiClient requires them.
        });
      })
    );

    ```
    *   **IPC Interaction:**
        *   The `ollamaIPC.generateChatCompletion` and `ollamaIPC.generateChatCompletionStream` are assumed to be defined in `src/helpers/ipc/ollama/ollama-context.ts` (preload script) and handled by `ollama-listeners.ts` in the main process.
        *   **Crucially, the IPC listener in `ollama-listeners.ts` for `OLLAMA_CHAT_COMPLETION_CHANNEL` and `OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL` must now ensure it translates Ollama's *native* API response (if it was calling the native endpoint) into the OpenAI Chat Completion format.** This includes:
            *   Mapping fields like `message.role`, `message.content`.
            *   For streaming, ensuring each SSE `data:` payload is a valid JSON representation of `ChatCompletionChunk`.
            *   Handling `[DONE]` markers appropriately for streams.
            *   The existing `OllamaServiceImpl` already does this translation logic when calling Ollama's `/v1/chat/completions` endpoint. This logic needs to be in the IPC *handler* in the main process.

**Task 4.3: Implement `OllamaAgentLanguageModelLive` Layer**

1.  **Action:** Create the file `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import { AgentLanguageModel, GenerateTextOptions, StreamTextOptions, GenerateStructuredOptions, AiResponse, AiTextChunk, AiError } from "@/services/ai/core";
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"; // We use OpenAiLanguageModel as the adapter base
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
    import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive"; // Import the Tag for our adapter

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel.Tag,
      Effect.gen(function*(_) {
        const ollamaAdapterClient = yield* _(OllamaOpenAIClientTag); // Use our IPC-backed Ollama client
        const configService = yield* _(ConfigurationService);

        const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gemma3:1b"), // Default Ollama model
          Effect.catchTag("ConfigError", (e) => Effect.fail(new AIConfigurationError({
            message: "Error fetching Ollama Model Name configuration.",
            cause: e,
            context: { keyName: "OLLAMA_MODEL_NAME" }
          })))
        );
        const modelName = yield* _(modelNameEffect);

        // Use OpenAiLanguageModel.model() from @effect/ai-openai, but provide our
        // OllamaAsOpenAIClientLive implementation that speaks to Ollama via IPC.
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

        const aiModelInstance = yield* _(Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // The service this AiModel definition requires
          ollamaAdapterClient       // Our implementation that fulfills this requirement via Ollama IPC
        ));

        const provider = yield* _(aiModelInstance); // Build AiModel into Provider

        return AgentLanguageModel.Tag.of({
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateText(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Ollama",
                context: { model: modelName, params }
              }))
            ),
          streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AiError> =>
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `Ollama streamText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Ollama",
                context: { model: modelName, params }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateStructured error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Ollama",
                context: { model: modelName, params }
              }))
            ),
        });
      })
    );
    ```

**Task 4.4: Update `ConfigurationService` (Conceptual)**

1.  **Action:** Review `src/services/configuration/ConfigurationService.ts`.
2.  **Details:**
    *   Ensure settings for `OLLAMA_BASE_URL` (though primarily used by the main process IPC handler now) and `OLLAMA_MODEL_NAME` (e.g., "gemma3:1b", "llama3") and `OLLAMA_ENABLED` (boolean) are manageable.
    *   The `OLLAMA_BASE_URL` might still be read by `OllamaAsOpenAIClientLive` if the IPC needs to be told which Ollama instance to target, but typically the main process would know this.

**Task 4.5: Update Ollama IPC Handlers (`ollama-listeners.ts`)**

1.  **Action:** Modify `src/helpers/ipc/ollama/ollama-listeners.ts`.
2.  **Details:**
    *   **Crucial Change:** The IPC handlers for `OLLAMA_CHAT_COMPLETION_CHANNEL` (non-streaming) and `OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL` (streaming) in the main process must now:
        1.  Accept an OpenAI-compatible `CreateChatCompletionRequest` payload from the renderer (sent by `OllamaAsOpenAIClientLive`).
        2.  Make an HTTP request to the configured Ollama instance's `/v1/chat/completions` endpoint (which is OpenAI-compatible).
        3.  **No extensive translation should be needed here if Ollama's `/v1` endpoint is truly OpenAI compatible.** The primary role of the IPC handler becomes request forwarding and error handling.
        4.  For streaming, it must correctly handle Ollama's SSE stream and forward each `data:` chunk (which should be an OpenAI `ChatCompletionChunk` JSON) back to the renderer over the IPC channel.
        5.  Ensure robust error handling: if Ollama returns an error, it should be transformed into a serializable error object (like `extractErrorForIPC` already does) and sent back.
    *   The `OllamaServiceLive` and `createOllamaService` (from `src/services/ollama/OllamaServiceImpl.ts`) already contain logic for calling Ollama's `/v1/chat/completions` endpoint and handling its (OpenAI-compatible) streaming format. **This existing logic should be leveraged or adapted within the IPC handlers in `ollama-listeners.ts`.**
    *   Instead of `OllamaAsOpenAIClientLive` re-implementing the call to `window.electronAPI.ollama...`, the `ollama-listeners.ts` itself should use an instance of `OllamaService` (from `OllamaServiceLive` in `src/services/ollama/`) to make the call to the Ollama server. This keeps the actual Ollama interaction logic within `OllamaServiceImpl.ts`.

    **Revised conceptual flow for `ollama-listeners.ts` (main process):**
    ```typescript
    // src/helpers/ipc/ollama/ollama-listeners.ts (Conceptual)
    // ... imports, including OllamaService, OllamaServiceLive, UiOllamaConfigLive, NodeHttpClient ...

    // Initialize OllamaService once (or ensure it's part of a main process runtime)
    // This needs to be done carefully with Electron's lifecycle.
    // For simplicity, assume it's initialized and available.
    let mainProcessOllamaService: OllamaService;
    Effect.runPromise(
        Layer.toRuntime(OllamaServiceLive.pipe(Layer.provide(Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer))))
            .pipe(Effect.map(ctx => Context.get(ctx, OllamaService)), Effect.scoped)
    ).then(service => {
        mainProcessOllamaService = service;
        console.log("[IPC Ollama] Main process OllamaService initialized.");
    }).catch(err => console.error("[IPC Ollama] Failed to initialize main process OllamaService:", err));


    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, requestParams /* OpenAI compatible */) => {
      if (!mainProcessOllamaService) return extractErrorForIPC("Ollama service not ready in main process");
      try {
        // mainProcessOllamaService.generateChatCompletion now expects OpenAI compatible params
        // if its underlying implementation calls Ollama's /v1/chat/completions
        const result = await Effect.runPromise(mainProcessOllamaService.generateChatCompletion(requestParams));
        return result; // Should be OpenAI compatible ChatCompletion
      } catch (error) {
        return extractErrorForIPC(error);
      }
    });

    ipcMain.on(OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, async (event, requestId, requestParams /* OpenAI compatible */) => {
      if (!mainProcessOllamaService) { /* ... error handling ... */ return; }
      // ... setup AbortController ...
      try {
        const stream = mainProcessOllamaService.generateChatCompletionStream(requestParams); // Expects OpenAI compatible
        // Stream.runForEach to send chunks back via event.sender.send(...)
        // Ensure chunks sent back are OpenAI ChatCompletionChunk compatible
      } catch (error) { /* ... error handling ... */ }
    });
    ```
    *   The `OllamaServiceImpl` from `src/services/ollama/OllamaServiceImpl.ts` needs to be robust enough to handle the OpenAI-compatible request format if it's directly calling Ollama's `/v1/chat/completions` endpoint. It seems it already is designed this way.

**Task 4.6: UI Selection & Refactor Existing Ollama Users**

1.  **Action:** Modify `src/components/ai/AgentChatPane.tsx`.
    *   Update the provider selection UI to include "Ollama".
    *   When "Ollama" is selected, the `useAgentChat` hook (or the component itself) should ensure that the `AgentLanguageModel.Tag` in its Effect context is resolved to the `OllamaAgentLanguageModelLive` implementation. This typically means that `FullAppLayer` needs to be constructed or adapted to provide the correct implementation based on a global or pane-specific configuration.
        *   *Simplification for now:* If the app has a global "current AI provider" setting, `FullAppLayer` could conditionally include `OpenAIAgentLanguageModelLive` OR `OllamaAgentLanguageModelLive` under the same `AgentLanguageModel.Tag`.
2.  **Action:** Refactor `Kind5050DVMService` (`src/services/dvm/Kind5050DVMServiceImpl.ts`).
    *   Change its dependency from `OllamaService.Tag` to `AgentLanguageModel.Tag`.
    *   When it needs to perform an Ollama call (for processing DVM jobs):
        *   It will get an `AgentLanguageModel` instance. If the system is configured to use Ollama, this instance will be the one provided by `OllamaAgentLanguageModelLive`.
        *   It must prepare its request in the `AgentChatMessage[]` format expected by `agentLM.streamText` or `agentLM.generateText`.
        *   It needs to handle the `AiResponse` or `Stream<AiTextChunk>` correctly.
    *   This standardizes how the DVM service interacts with LLMs.
3.  **Action:** Refactor `useNip90ConsumerChat` hook (`src/hooks/useNip90ConsumerChat.ts`).
    *   Similarly, change its Ollama interaction to use `AgentLanguageModel.Tag`. If the user wants this consumer pane to use Ollama, the provided `AgentLanguageModel` should be the Ollama implementation.

**Task 4.7: Runtime Integration Update**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**
    *   Import the new Ollama provider layers:
        ```typescript
        import { OllamaAsOpenAIClientLive, OllamaAgentLanguageModelLive } from "@/services/ai/providers/ollama";
        ```
    *   Compose these layers into `FullAppLayer`. This is tricky if you want to select providers dynamically at runtime under the same `AgentLanguageModel.Tag`.
    *   **Strategy A (Static Default):** Provide one as the default `AgentLanguageModel.Tag`.
        ```typescript
        // Example: Defaulting to OpenAI, Ollama is available if explicitly layered in for a specific scope.
        const ollamaAdapterClientLayer = OllamaAsOpenAIClientLive.pipe(
            // Layer.provide(ConfigurationServiceLive), // If needed by the client adapter
            Layer.provide(TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer))) // Provide telemetry
        );
        const ollamaAgentLanguageModelLayer = OllamaAgentLanguageModelLive.pipe(
            Layer.provide(ollamaAdapterClientLayer),
            Layer.provide(ConfigurationServiceLive) // For OLLAMA_MODEL_NAME
        );

        // In FullAppLayer (assuming OpenAI is the default AgentLanguageModel)
        export const FullAppLayer = Layer.mergeAll(
          // ... other layers ...
          openAIAgentLanguageModelLayer, // Provides AgentLanguageModel.Tag
          // ollamaAgentLanguageModelLayer, // This would conflict if both provide AgentLanguageModel.Tag directly.
          // Instead, you might provide it under a different tag or use a factory.
        );
        ```
    *   **Strategy B (Provider Factory - More Flexible):**
        *   Create an `AiProviderFactoryService.Tag` whose job is to return an `Effect<AgentLanguageModel, AIConfigurationError>`.
        *   `FullAppLayer` provides all individual *concrete* language model layers (e.g., `OpenAIAgentLanguageModelConcreteLive`, `OllamaAgentLanguageModelConcreteLive`) under their own specific tags.
        *   `AiProviderFactoryServiceLive` depends on `ConfigurationService` and all these concrete tags. Its method `getAgentLanguageModel(providerKey: string)` would then select and return the appropriate concrete service.
        *   Components like `AgentChatPane` would use `AiProviderFactoryService` to get the `AgentLanguageModel` for the user's selected provider.
        *   *For this phase, Strategy A (defaulting to OpenAI, and having Ollama capability ready for more advanced dynamic switching later or specific use cases) is simpler to implement initially.* Ensure `OllamaAgentLanguageModelLive` can be built and tested.

---

**Verification for Phase 4:**

1.  **Type Checking:** Run `pnpm t`.
2.  **Unit Tests:**
    *   `OllamaAsOpenAIClientLive.test.ts`: Mock `window.electronAPI.ollama`. Test that it correctly forwards requests and translates responses/errors in the OpenAI format. Test both streaming and non-streaming.
    *   `OllamaAgentLanguageModelLive.test.ts`: Mock `OllamaOpenAIClientTag` and `ConfigurationService`. Verify it uses `OpenAiLanguageModel.model` with the adapter client.
    *   IPC Listener Tests (`ollama-listeners.test.ts` - if possible in main process testing context): Verify the main process handler for Ollama IPC calls the local `OllamaService` (which uses `NodeHttpClient`) and correctly handles SSE.
3.  **Runtime Initialization Test:** `src/tests/unit/services/runtime.test.ts` should continue to pass.
4.  **UI Functionality (Manual Testing):**
    *   In `AgentChatPane`, if you implement basic provider switching UI:
        *   Select "Ollama" as the provider.
        *   Select an available Ollama model (e.g., `gemma3:1b`).
        *   Send messages and verify responses are streamed correctly from your local Ollama instance.
        *   Test error handling (e.g., Ollama not running).
    *   Verify `Kind5050DVMService` and `Nip90ConsumerChatPane` still function correctly when configured to use Ollama (this implies they now use `AgentLanguageModel.Tag` and the system routes to the Ollama implementation).

This refactoring of Ollama is a key step towards a unified AI backend. It ensures that all LLM interactions, whether local or remote, use the same Effect-TS patterns and `AgentLanguageModel` interface.
