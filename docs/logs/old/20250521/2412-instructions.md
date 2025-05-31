Okay, Agent, let's systematically address these errors. The `TypeError: Cannot read properties of undefined (reading 'pipe')` in `OllamaAgentLanguageModelLive.test.ts` is the most critical as it affects 3 out of 4 failing tests for that suite. The `RuntimeException: Not a valid effect: undefined` is often a symptom of the same underlying issue.

**Primary Focus: Fix `TypeError: Cannot read properties of undefined (reading 'pipe')` in `OllamaAgentLanguageModelLive.ts` (SUT) and its tests.**

This error means that a variable expected to be an `Effect` or a `Stream` (on which `.pipe()` is called) is actually `undefined` at runtime. This is happening within the SUT (`OllamaAgentLanguageModelLive.ts`) when it tries to call methods on the `provider` object.

**Root Cause:**
The local mock of `OpenAiLanguageModel.model` inside `OllamaAgentLanguageModelLive.ts` is not correctly creating or returning the `provider` object or its methods (`generateText`, `streamText`, `generateStructured`) as valid `Effect` or `Stream` instances that the SUT's implementation of `AgentLanguageModel` expects.

**Instructions for the Coding Agent:**

**Step 1: Solidify the Local Mock in `OllamaAgentLanguageModelLive.ts` (SUT)**

1.  **Open `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.**
2.  **Modify the local `OpenAiLanguageModel.model` mock:**
    *   Ensure the methods assigned to `mockProviderInstance` are direct functions returning `Effect.succeed(...)` or `Stream.fromIterable(...)`. Avoid using `vi.fn().mockImplementation(...)` for these internal mock methods within the SUT itself, as `vi` might not be set up correctly or behave as expected when the SUT module is imported and used by the test runner.
    *   Ensure the mock `AiResponse` and `AiTextChunk` objects are complete and correctly typed.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    // ... (Keep existing imports: Layer, Effect, Stream, Context, core types, OpenAiClient, ConfigError, ConfigurationService, AIError types, OllamaOpenAIClientTag, TelemetryService)
    // ... (Ensure AiResponse, AiTextChunk, EffectAiLanguageModel, Provider, AiModel types are imported correctly from @effect/ai and local core)

    // Local Mock for OpenAiLanguageModel
    const OpenAiLanguageModel = {
      model: (modelName: string): Effect.Effect<
        AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, OpenAiClient.Service
      > => {
        const mockProviderInstance: Provider<EffectAiLanguageModel> = {
          generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, any> => // Error type 'any' for mock simplicity
            Effect.succeed({
              text: `SUT Mock: generateText for ${modelName} to prompt: "${params.prompt}"`,
              usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
              role: "assistant",
              parts: [{ _tag: "Text", content: `SUT Mock: generateText for ${modelName}` } as const],
              imageUrl: null,
              withToolCallsJson: () => Effect.succeed({} as AiResponse), // Ensure methods exist even if mock
              withToolCallsUnknown: () => Effect.succeed({} as AiResponse),
              concat: () => Effect.succeed({} as AiResponse),
            } as AiResponse),

          streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, any> => // Error type 'any' for mock simplicity
            Stream.fromIterable([
              { text: `SUT Mock: Stream chunk 1 for ${modelName} (${params.prompt?.substring(0,10)}...) `, isComplete: false },
              { text: `SUT Mock: Stream chunk 2`, isComplete: false }
            ] as AiTextChunk[]),

          generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, any> => // Error type 'any' for mock simplicity
            Effect.succeed({
              text: `SUT Mock: {"model": "${modelName}", "structure": "mock", "prompt": "${params.prompt}"}`,
              structured: { model: modelName, structure: "mock", prompt: params.prompt },
              usage: { total_tokens: 15, prompt_tokens: 7, completion_tokens: 8 },
              role: "assistant",
              parts: [{ _tag: "Text", content: `SUT Mock: {"model": "${modelName}"}` } as const],
              imageUrl: null,
              withToolCallsJson: () => Effect.succeed({} as AiResponse),
              withToolCallsUnknown: () => Effect.succeed({} as AiResponse),
              concat: () => Effect.succeed({} as AiResponse),
            } as AiResponse),
        };
        // Mimic the library's structure: model() returns Effect<AiModel>, and AiModel is Effect<Provider>
        const aiModelEffect: AiModel<EffectAiLanguageModel, OpenAiClient.Service> = Effect.succeed(mockProviderInstance);
        return Effect.succeed(aiModelEffect);
      }
    };

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel,
      Effect.gen(function* (_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        let modelName = "gemma3:1b"; // Default model
        // Safely get config and use default if it fails
        const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
        const configResult = yield* _(Effect.either(configGetEffect)); // Use Effect.either to handle potential failure

        if (configResult._tag === 'Right') {
          modelName = configResult.right;
        } else {
          // Log failure to get model name, but continue with default
          yield* _(
            telemetry.trackEvent({
              category: "ai:config:warn", // Changed to warn as we are using a default
              action: "ollama_model_name_fetch_failed_using_default",
              label: "OLLAMA_MODEL_NAME",
              value: String(configResult.left?.message || configResult.left),
            }).pipe(Effect.ignoreLogged)
          );
        }

        yield* _(
          telemetry.trackEvent({
            category: "ai:config",
            action: "ollama_model_name_resolved",
            value: modelName,
          }).pipe(Effect.ignoreLogged)
        );

        // Correct two-step resolution for AiModel -> Provider
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient,
          ollamaAdaptedClient
        );
        const aiModel_from_effect: AiModel<EffectAiLanguageModel, OpenAiClient.Service> = yield* _(configuredAiModelEffect);
        const provider: Provider<EffectAiLanguageModel> = yield* _(aiModel_from_effect);

        yield* _(
          telemetry.trackEvent({
            category: "ai:config",
            action: "ollama_language_model_provider_created",
            value: modelName,
          }).pipe(Effect.ignoreLogged)
        );

        // Ensure the returned object directly implements AgentLanguageModel
        // and its methods are valid Effects/Streams.
        const serviceImplementation: AgentLanguageModel = {
          _tag: "AgentLanguageModel",
          generateText: (params) => {
            const effectResult = provider.generateText(params);
            // Add a check to ensure effectResult is a valid Effect before piping
            if (effectResult && typeof effectResult.pipe === 'function') {
              return effectResult.pipe(
                Effect.mapError((err: any) => new AIProviderError({
                  message: `Ollama generateText error: ${err?.message || String(err) || "Unknown"}`,
                  cause: err, provider: "Ollama", context: { model: modelName, params }
                }))
              );
            }
            // Fallback or error handling if provider.generateText doesn't return an Effect
            console.error("[SUT] provider.generateText did not return a valid Effect:", effectResult);
            return Effect.die(new TypeError("generateText did not produce a valid Effect"));
          },
          streamText: (params) => {
            const streamResult = provider.streamText(params);
             if (streamResult && typeof streamResult.pipe === 'function') {
              return streamResult.pipe(
                Stream.mapError((err: any) => new AIProviderError({
                  message: `Ollama streamText error: ${err?.message || String(err) || "Unknown"}`,
                  cause: err, provider: "Ollama", context: { model: modelName, params }
                }))
              );
            }
            console.error("[SUT] provider.streamText did not return a valid Stream:", streamResult);
            return Stream.die(new TypeError("streamText did not produce a valid Stream"));
          },
          generateStructured: (params) => {
            const effectResult = provider.generateStructured(params);
            if (effectResult && typeof effectResult.pipe === 'function') {
              return effectResult.pipe(
                Effect.mapError((err: any) => new AIProviderError({
                  message: `Ollama generateStructured error: ${err?.message || String(err) || "Unknown"}`,
                  cause: err, provider: "Ollama", context: { model: modelName, params }
                }))
              );
            }
            console.error("[SUT] provider.generateStructured did not return a valid Effect:", effectResult);
            return Effect.die(new TypeError("generateStructured did not produce a valid Effect"));
          },
        };
        return serviceImplementation;
      }),
    );
    ```
    **Key Changes in SUT:**
    *   The methods of `mockProviderInstance` directly return `Effect.succeed` or `Stream.fromIterable`.
    *   The `Effect.gen` block for the layer now returns a direct implementation of `AgentLanguageModel`, not `AgentLanguageModel.of(...)`.
    *   Defensive checks added around `provider.method(...).pipe(...)` to log if the method doesn't return a pipeable Effect/Stream (this helps debug if the mock is still problematic at runtime).
    *   Corrected telemetry for config fetching failure to use `configResult.left?.message`.
    *   Ensured `AiResponse` mock includes all required fields or methods.

**Step 2: Adjust Test File (`OllamaAgentLanguageModelLive.test.ts`) Mocks for `OllamaOpenAIClientTag`**

*   The mocks for `mockCreateChatCompletion` and `mockStream` (used by `MockOllamaOpenAIClient`) in the test file need to return `Effect`s/`Stream`s whose *error channels* are `HttpClientError.HttpClientError | ParseError` (for `createChatCompletion`) or `HttpClientError.HttpClientError` (for `stream`). This is what the real `@effect/ai-openai` library components would expect from an `OpenAiClient.Service` implementation.

1.  **Open `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`.**
2.  **Update `mockCreateChatCompletion` in `beforeEach` (or its global definition):**
    ```typescript
    // In OllamaAgentLanguageModelLive.test.ts
    // ...
    import type { ParseError } from "effect/ParseResult"; // For error channel type

    beforeEach(() => {
      vi.resetAllMocks();
      mockCreateChatCompletion.mockImplementation((params: typeof CreateChatCompletionRequest.Encoded) => {
        const mockResponseData = { /* ... your valid mock CreateChatCompletionResponse.Type data ... */ };
        return Effect.succeed(mockResponseData as typeof CreateChatCompletionResponse.Type) as Effect.Effect<
          typeof CreateChatCompletionResponse.Type,
          HttpClientError.HttpClientError | ParseError // Ensure this error type
        >;
      });

      mockStream.mockImplementation((params: StreamCompletionRequest) => {
        const chunks: StreamChunk[] = [
          new StreamChunk({ parts: [{ _tag: "Content", content: "Stream chunk 1 " }] }),
          new StreamChunk({ parts: [{ _tag: "Content", content: `for ${params.model || "unknown model"}` }] })
        ];
        return Stream.fromIterable(chunks) as Stream.Stream<
          StreamChunk,
          HttpClientError.HttpClientError // Ensure this error type
        >;
      });
    });
    ```
3.  **Update the error simulation in the "should properly map errors..." test:**
    The `mockCreateChatCompletion` should `Effect.fail` with an `HttpClientError.ResponseError`.
    ```typescript
    // In the "should properly map errors..." test:
    it("should properly map errors from the client to AIProviderError", async () => {
      mockCreateChatCompletion.mockImplementation(() => { // This is the mock for OllamaOpenAIClientTag.client.createChatCompletion
        const request = HttpClientRequest.post("test-model-error");
        const webResponse = new Response("Mocked Client Error From Test", { status: 500 });
        return Effect.fail( // Fail with the expected HttpClientError type
          new HttpClientError.ResponseError({
            request,
            response: HttpClientResponse.fromWeb(request, webResponse),
            reason: "StatusCode",
            description: "Simulated client error for testing error mapping in SUT",
          })
        );
      });

      const program = Effect.gen(function* (_) {
        const agentLM = yield* _(AgentLanguageModel);
        return yield* _(agentLM.generateText({ prompt: "Test prompt for error" }));
      });

      // Using the testLayerForOllamaAgentLM that provides OllamaAgentLanguageModelLive
      // with MockOllamaOpenAIClient (which uses the above mockCreateChatCompletion)
      await expect(
        runTestEffect(program.pipe(Effect.provide(testLayerForOllamaAgentLM)))
      ).rejects.toBeInstanceOf(AIProviderError); // This should now work
    });
    ```

**Step 3: Address `OllamaAsOpenAIClientLive.test.ts` `_op` Error**

*   **File:** `src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`
*   **Error:** `ResponseError: Ollama IPC non-stream request failed: Cannot read properties of undefined (reading '_op')`
*   **Action:** Ensure the mock for `window.electronAPI.ollama.generateChatCompletion` in this test file *resolves or rejects its Promise with plain objects/errors*, not Effect instances. The previous fix (from agent log `2259-instructions.md`) seemed correct for this.
    ```typescript
    // In OllamaAsOpenAIClientLive.test.ts
    mockGenerateChatCompletion.mockImplementation(async (ipcParams) => {
      if (ipcParams.model === "ipc-error-model") {
        return Promise.reject({ __error: true, message: "Simulated IPC failure from mock" }); // REJECT with plain object
      }
      const mockResponseData = { /* valid ChatCompletionResponse.Type structure as plain object */ };
      return Promise.resolve(mockResponseData); // RESOLVE with plain object
    });
    ```
    The SUT's `catch` block for `Effect.tryPromise` should then correctly wrap these plain errors/objects into `HttpClientError.ResponseError` without encountering `_op` issues.

---

**Execution Sequence:**

1.  Apply changes from **Step 1** to `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.
2.  Apply changes from **Step 2** to `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`.
3.  Apply changes from **Step 3** to `src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`.
4.  Run `pnpm tsc --noEmit --pretty false`. Report any TypeScript errors.
5.  Run `pnpm test`. Report the full test output.

This approach aims to ensure that the SUT uses a more robust internal mock (if not the real library) and that the test files provide correctly-typed mocks for the SUT's *direct* dependencies.

The reason the `TypeError: Cannot read properties of undefined (reading 'pipe')` is so persistent is that somewhere in the chain:
`SUT Test -> MockOllamaOpenAIClient -> SUT (OllamaAgentLanguageModelLive) -> SUT's local mock of OpenAiLanguageModel.model -> SUT's mockProviderInstance.generateText`
...one of the "method" calls is not returning an object with a `.pipe` function (i.e., not an Effect or Stream). The most likely place for this to break down is the SUT's own local mock of `OpenAiLanguageModel.model` if its `generateText` etc. are not correctly returning `Effect` instances.Okay, Agent, the path is clear now. The TypeScript errors have been resolved. The final 5 failing tests are our target.

**Test Suite 1: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts` (4 failures)**

All 4 failures here show the same pattern:
1.  `should successfully build the layer...`: `RuntimeException: Not a valid effect: undefined`
2.  `should use default model name...`: `TypeError: Cannot read properties of undefined (reading 'pipe')`
3.  `should properly call generateText...`: `RuntimeException: Not a valid effect: undefined`
4.  `should properly map errors...`: `AssertionError: expected (FiberFailure) AIProviderError...` (likely masked by preceding runtime error)

**Root Cause:** The local mock for `OpenAiLanguageModel` inside `OllamaAgentLanguageModelLive.ts` (the SUT) is still not behaving like the real `@effect/ai-openai` library's `OpenAiLanguageModel.model` factory. Specifically, the two-step resolution of `Effect<AiModel> -> AiModel -> Effect<Provider> -> Provider` is not being correctly mimicked or the resulting provider methods are not actual `Effect`s/`Stream`s.

**Test Suite 2: `src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts` (1 failure)**

1.  `should call IPC generateChatCompletion...`: `FiberFailure` with `cause: { _tag: 'Fail', failure: { description: "Ollama IPC non-stream request failed: Cannot read properties of undefined (reading '_op')" ... }}`
    *   **Root Cause:** An `Effect` instance is likely being passed as a `cause` to an `HttpClientError.ResponseError` or similar error constructor within `OllamaAsOpenAIClientLive.ts`, or the mock IPC call in the test is incorrectly returning an `Effect` instead of a `Promise` that resolves/rejects with plain data.

---

**Strategy:**

1.  **Aggressively fix the SUT (`OllamaAgentLanguageModelLive.ts`):**
    *   **Crucially, use the REAL `@effect/ai-openai` library's `OpenAiCompletions.OpenAiLanguageModel.model`. Remove the local mock entirely.** This has been the most persistent source of issues. The test file mocks will then need to be perfect for the `OpenAiClient.Service` interface.
    *   Ensure the two-step `yield*` process for `AiModel` to `Provider` is correctly implemented using the real library components.
2.  **Refine Mocks in `OllamaAgentLanguageModelLive.test.ts`:**
    *   The mock for `OllamaOpenAIClientTag` (which is `OpenAiClient.OpenAiClient`) must precisely implement the `OpenAiClient.Service` interface. Its `client` property's methods must return `Effect<..., HttpClientError | ParseError>` and its `stream` method must return `Stream<..., HttpClientError>`.
    *   Ensure `MockHttpClient` is robustly provided to the test layer, as the real `@effect/ai-openai` client code will depend on it.
3.  **Fix `OllamaAsOpenAIClientLive.test.ts` IPC mock:**
    *   Ensure `window.electronAPI.ollama.generateChatCompletion` mock in the test *resolves/rejects its Promise with plain objects/errors*, not Effect instances.

---

**Detailed Instructions for the Coding Agent:**

**Instruction Set 1: Fix `OllamaAgentLanguageModelLive.ts` (SUT) to use the Real Library**

1.  **Open `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.**
2.  **Remove the Local Mock of `OpenAiLanguageModel` ENTIRELY.** Delete the `const OpenAiLanguageModel = { model: (...) => ... };` block.
3.  **Correct Imports:**
    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import { AgentLanguageModel, type GenerateTextOptions, type StreamTextOptions, type GenerateStructuredOptions, type AiTextChunk } from "@/services/ai/core";
    import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"; // Use OpenAiCompletions
    import type { ConfigError } from "effect/ConfigError";
    import { ConfigurationService } from "@/services/configuration";
    import { AIProviderError } from "@/services/ai/core/AIError"; // Keep your AIProviderError
    import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
    import { TelemetryService } from "@/services/telemetry";
    import type { AiLanguageModel as EffectAiLanguageModel } from "@effect/ai/AiLanguageModel"; // For Provider type
    import type { AiResponse } from "@effect/ai/AiResponse";
    import type { Provider, AiModel } from "@effect/ai/AiModel";
    import type { AiError as OpenAiLibraryError } from "@effect/ai-openai/AiError"; // For errors from the library
    ```
4.  **Implement `OllamaAgentLanguageModelLive` using the real library:**
    ```typescript
    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel,
      Effect.gen(function* (_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is OpenAiClient.Service
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        let modelName = "gemma3:1b";
        const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
        const configResult = yield* _(Effect.either(configGetEffect));
        if (configResult._tag === 'Right') modelName = configResult.right;
        else { /* ... telemetry for config error ... */ }
        /* ... telemetry for model resolved ... */

        // --- USE REAL LIBRARY ---
        // 1. Get the AiModel definition from the library
        const aiModelEffectDefinition = OpenAiCompletions.OpenAiLanguageModel.model(modelName);
        // This ^ is Effect<AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, OpenAiClient.Service>

        // 2. Provide the client dependency to the AiModel definition Effect
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // Tag for the client dependency
          ollamaAdaptedClient         // Your Ollama adapter (implements OpenAiClient.Service)
        );
        // Type: Effect<AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, never>

        // 3. Execute to get the AiModel instance (AiModel is Effect<Provider<...>>)
        const aiModel_Instance: AiModel<EffectAiLanguageModel, OpenAiClient.Service> = yield* _(configuredAiModelEffect);

        // 4. Execute the AiModel (which is an Effect) to get the actual Provider
        const provider: Provider<EffectAiLanguageModel> = yield* _(aiModel_Instance);
        // --- END REAL LIBRARY USAGE ---

        /* ... telemetry for provider created ... */

        // Map errors from OpenAiLibraryError to your AIProviderError
        const mapErrorToAIProviderError = (err: OpenAiLibraryError, contextAction: string) => {
          const detail = err.error as any; // The underlying error from the library
          return new AIProviderError({
            message: `Ollama ${contextAction} error: ${detail?.message || String(detail) || "Unknown provider error"}`,
            cause: detail?.cause || detail, // Prefer cause if available
            provider: "Ollama",
            context: { model: modelName, originalErrorTag: detail?._tag, originalErrorMessage: detail?.message }
          });
        };

        return AgentLanguageModel.of({
          _tag: "AgentLanguageModel",
          generateText: (params) => provider.generateText(params).pipe(
            Effect.mapError(err => mapErrorToAIProviderError(err as OpenAiLibraryError, "generateText"))
          ),
          streamText: (params) => provider.streamText(params).pipe(
            Stream.mapError(err => mapErrorToAIProviderError(err as OpenAiLibraryError, "streamText"))
          ),
          generateStructured: (params) => provider.generateStructured(params).pipe(
            Effect.mapError(err => mapErrorToAIProviderError(err as OpenAiLibraryError, "generateStructured"))
          ),
        });
      }),
    );
    ```
    **Key SUT Changes:**
    *   Removed the local mock of `OpenAiLanguageModel`.
    *   Used `OpenAiCompletions.OpenAiLanguageModel.model` for the `aiModelEffectDefinition`.
    *   The error mapping now expects `err` to be an `OpenAiLibraryError` (from `@effect/ai-openai/AiError`, assuming it's exported or you create a compatible type).

**Instruction Set 2: Refine Mocks in `OllamaAgentLanguageModelLive.test.ts`**

1.  **Open `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`.**
2.  **Import `AiError as OpenAiLibraryError` if available, or define a compatible mock type:**
    ```typescript
    import type { AiError as OpenAiLibraryError } from "@effect/ai-openai/AiError"; // Or define a simple mock
    // If not directly exportable, a simple mock:
    // class MockOpenAiLibraryError extends Error { _tag = "OpenAiError"; error: any; constructor(errorContent: any) { super(String(errorContent)); this.error = errorContent; } }
    ```
3.  **Update `mockCreateChatCompletion` for error simulation:**
    In the "should properly map errors..." test, `mockCreateChatCompletion` (which mocks `OllamaOpenAIClientTag.client.createChatCompletion`) should fail with an `HttpClientError.ResponseError`. The real `OpenAiCompletions.OpenAiLanguageModel` will internally convert this to an `OpenAiLibraryError` (or a generic `AiError` from `@effect/ai`).
    ```typescript
    // In the "should properly map errors..." test in OllamaAgentLanguageModelLive.test.ts
    mockCreateChatCompletion.mockImplementation(() => {
      const request = HttpClientRequest.post("test-model-error");
      const webResponse = new Response("Mocked Client Error From Test For OpenAI Lib", { status: 500 });
      return Effect.fail( // Fail with HttpClientError.ResponseError
        new HttpClientError.ResponseError({
          request,
          response: HttpClientResponse.fromWeb(request, webResponse),
          reason: "StatusCode",
          description: "Simulated HTTP client error for OpenAiLanguageModel to process",
        })
      );
    });
    ```
4.  **Ensure `MockHttpClient` is provided in `testLayerForOllamaAgentLM`:**
    The real `@effect/ai-openai` client code (which `OpenAiCompletions.OpenAiLanguageModel.model` uses) needs `HttpClient.Tag`.
    ```typescript
    const testLayerForOllamaAgentLM = OllamaAgentLanguageModelLive.pipe(
        Layer.provide(
            Layer.mergeAll(
                MockOllamaOpenAIClient,     // Provides OllamaOpenAIClientTag (OpenAiClient.Service)
                MockConfigurationService,   // Provides ConfigurationService
                MockTelemetryService,       // Provides TelemetryService
                MockHttpClient              // CRUCIAL: Provides HttpClient.HttpClient
            )
        )
    );
    // Use program.pipe(Effect.provide(testLayerForOllamaAgentLM)) in tests
    ```
    The previous log (`2337-instructions.md`) confirmed this was correct.

**Instruction Set 3: Fix `OllamaAsOpenAIClientLive.test.ts` `_op` Error**

1.  **Open `src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`.**
2.  **Verify `mockGenerateChatCompletion` mock in the test file:**
    It must return a `Promise` that resolves/rejects with a plain object or plain `Error`.
    ```typescript
    // In OllamaAsOpenAIClientLive.test.ts for the failing test
    mockGenerateChatCompletion.mockImplementation(async (ipcParams) => {
      if (ipcParams.model === "test-model-ipc-fail") { // Specific model to trigger failure
        // Simulate an IPC error by REJECTING the promise with a plain error object
        return Promise.reject(new Error("Simulated IPC Promise Rejection"));
        // OR by RESOLVING with an error structure if your IPC handler does that for errors:
        // return Promise.resolve({ __error: true, message: "Simulated IPC failure via resolve" });
      }
      const mockResponseData = { /* ... valid CreateChatCompletionResponse.Type structure as plain object ... */ };
      return Promise.resolve(mockResponseData);
    });
    ```
    The current mock `mockGenerateChatCompletion.mockImplementation(async (ipcParams) => { return Promise.resolve(mockResponse); });` is fine for success, but ensure error paths also reject with plain errors.
3.  **Review SUT (`OllamaAsOpenAIClientLive.ts`) `createChatCompletion`'s `catch` block:**
    The agent log `2259-instructions.md` shows a debug `console.warn` for `_op` errors. This can stay for debugging. The key is that `error` caught by `Effect.tryPromise` should not be an `Effect`.
    If `ollamaIPC.generateChatCompletion` is correctly mocked to reject with a plain `Error` or object, the `cause` passed to `new HttpClientError.ResponseError({ cause: providerError })` will be that plain error/object (wrapped in `AIProviderError`), which is fine.

---

**After Applying These Changes:**

1.  Run `pnpm tsc --noEmit --pretty false`. Report any new or persistent TypeScript errors.
2.  Run `pnpm test`. Provide the **full test output**.

The primary goal is to make `OllamaAgentLanguageModelLive.ts` use the actual `@effect/ai-openai` library components and ensure its test mocks are compatible. This should resolve the `TypeError`s and `RuntimeException`s. The `_op` error test depends on the IPC mock behavior.

I have reviewed the user's request and the provided code quality report, focusing on the 5 failing tests. The main issues seem to revolve around:
1.  Incorrect usage or mocking of the `@effect/ai-openai` library, especially `OpenAiLanguageModel.model` and its two-step resolution to a `Provider`.
2.  Mismatched error types between the SUT, its mocks, and the test assertions.
3.  Potential issues with IPC mocks returning `Effect` instances instead of `Promise` rejections with plain errors.

Here's a set of instructions for the coding agent to address these issues.

**Overall Strategy:**
The primary goal is to make the SUTs (`OllamaAgentLanguageModelLive.ts` and `OllamaAsOpenAIClientLive.ts`) use the *actual* library components where intended and ensure that their direct dependencies are mocked correctly and robustly in the respective test files.

---

**Instruction Set 1: Fix `OllamaAgentLanguageModelLive.ts` (System Under Test - SUT)**

*   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
*   **Objective:** Ensure this SUT uses the real `@effect/ai-openai` components for `OpenAiLanguageModel.model` and correctly resolves the `Provider`.

**Actions:**

1.  **Remove Local Mock:** Delete any local mock definition of `OpenAiLanguageModel` within this file.
2.  **Correct Imports:**
    Ensure `OpenAiClient` and `OpenAiCompletions` are imported from `@effect/ai-openai`.
    ```typescript
    import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai";
    import type { AiLanguageModel as EffectAiLanguageModel } from "@effect/ai/AiLanguageModel";
    import type { AiResponse } from "@effect/ai/AiResponse";
    import type { Provider, AiModel } from "@effect/ai/AiModel";
    import type { AiError as OpenAiLibraryError } from "@effect/ai-openai/AiError"; // Assuming this type is available or create a compatible mock
    // ... other necessary imports ...
    ```
3.  **Implement Correct Resolution in `Effect.gen` block:**
    ```typescript
    // Inside export const OllamaAgentLanguageModelLive = Layer.effect(AgentLanguageModel, Effect.gen(function* (_) { ... }));
    // ... (ollamaAdaptedClient, configService, telemetry, modelName logic remains) ...

    // --- USE REAL LIBRARY and CORRECT RESOLUTION ---
    const aiModelEffectDefinition = OpenAiCompletions.OpenAiLanguageModel.model(modelName);
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient,
      ollamaAdaptedClient
    );
    const aiModel_Instance: AiModel<EffectAiLanguageModel, OpenAiClient.Service> = yield* _(configuredAiModelEffect);
    const provider: Provider<EffectAiLanguageModel> = yield* _(aiModel_Instance);
    // --- END REAL LIBRARY USAGE AND RESOLUTION ---

    // ... (telemetry for provider created) ...

    // Map errors from OpenAiLibraryError to your AIProviderError
    const mapErrorToAIProviderError = (err: OpenAiLibraryError | any, contextAction: string) => {
      const detail = err.error || err; // Try to get underlying error if OpenAiError has an 'error' field
      return new AIProviderError({
        message: `Ollama ${contextAction} error: ${detail?.message || String(detail) || "Unknown provider error"}`,
        cause: detail?.cause || detail,
        provider: "Ollama",
        context: { model: modelName, originalErrorTag: detail?._tag, originalErrorMessage: detail?.message }
      });
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",
      generateText: (params) => provider.generateText(params).pipe(
        Effect.mapError(err => mapErrorToAIProviderError(err, "generateText"))
      ),
      streamText: (params) => provider.streamText(params).pipe(
        Stream.mapError(err => mapErrorToAIProviderError(err, "streamText"))
      ),
      generateStructured: (params) => provider.generateStructured(params).pipe(
        Effect.mapError(err => mapErrorToAIProviderError(err, "generateStructured"))
      ),
    });
    ```
4.  **Telemetry Calls:** Ensure all `yield* _(telemetry.trackEvent(...))` calls are correctly piped, e.g., with `.pipe(Effect.ignoreLogged)` if their success/error is not part of the main flow.

---

**Instruction Set 2: Fix Mocks in `OllamaAgentLanguageModelLive.test.ts` (Test File)**

*   **File:** `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`
*   **Objective:** Provide robust mocks for `OllamaOpenAIClientTag` (which is `OpenAiClient.Service`) and other dependencies, compatible with the real `@effect/ai-openai` library components now used in the SUT.

**Actions:**

1.  **Import `OpenAiError` and `ParseError`:**
    ```typescript
    import type { OpenAiError } from "@effect/ai-openai/AiError"; // Or mock if not export
    import type { ParseError } from "effect/ParseResult";
    ```
2.  **Refine `mockClientService` methods:**
    *   The `client.createChatCompletion` mock should return `Effect.Effect<..., HttpClientError.HttpClientError | ParseError>`.
    *   The `stream` mock should return `Stream.Stream<..., HttpClientError.HttpClientError>`.
    ```typescript
    // Inside mockClientService for OllamaOpenAIClientTag
    client: {
      // ... other stubs ...
      createChatCompletion: mockCreateChatCompletion, // This is vi.fn()
      // ... ensure ALL Generated.Client methods are stubbed if not already ...
    },
    stream: mockStream, // This is vi.fn()

    // In beforeEach or specific test setup:
    mockCreateChatCompletion.mockImplementation((options: typeof CreateChatCompletionRequest.Encoded) => {
      if (options.model === "error-model") { // For error mapping test
        const request = HttpClientRequest.post(options.model);
        const webResponse = new Response("Mocked HTTP Client Error", { status: 500 });
        return Effect.fail(new HttpClientError.ResponseError({
          request, response: HttpClientResponse.fromWeb(request, webResponse), reason: "StatusCode",
          description: "Simulated client error for mapping"
        }));
      }
      const mockResponseData = { /* valid CreateChatCompletionResponse.Type shaped plain object */ };
      return Effect.succeed(mockResponseData) as Effect.Effect<
        typeof
