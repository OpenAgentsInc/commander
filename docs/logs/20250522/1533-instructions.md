Okay, Agent, we are down to **39 errors**. This is excellent progress! The major architectural refactoring is largely complete. The remaining errors are concentrated in:

1.  **`OllamaAsOpenAIClientLive.ts`**: Missing stubs for the comprehensive `Generated.Client` interface.
2.  **Test Mock Completeness:** Mocks in test files don't fully implement the service interfaces they are mocking.
3.  **`Effect.provide` Pattern / `R = never` in Tests:** Incorrect layer provisioning or dependency resolution in tests.
4.  **Miscellaneous Test Issues:** Minor property name mismatches or error instantiation issues.

Let's address these systematically.

**I. Complete `OllamaAsOpenAIClientLive.ts` Implementation (CRITICAL)**

*   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
*   **Error Ref (Example):** `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts(161,3): error TS2345: Argument of type '{ client: { ... } }' is not assignable to 'Service'. ... missing ... "getChatCompletionMessages", ... and 24 more.` (The "24 more" count was from a previous log, the actual number may vary as you've added some).
*   **Action:**
    1.  Refer to `node_modules/@effect/ai-openai/dist/dts/Generated.d.ts` and find the `Client` interface definition.
    2.  In `OllamaAsOpenAIClientLive.ts`, within the `client: { ... }` object that is part of the service implementation, ensure **every single method** declared in the `Generated.Client` interface has a corresponding entry.
    3.  For all methods that your Ollama IPC adapter does not actually implement (which will be most of them, apart from `createChatCompletion`), use the `stubMethod(methodName: string)` helper you previously defined.
        *   Example: If `listAssistants` is missing, add: `listAssistants: (_options: any) => stubMethod("listAssistants"),`
        *   Systematically go through the `Generated.Client` interface and add stubs for all methods that are not `createChatCompletion`.
    4.  Additionally, ensure the top-level `streamRequest` method (required by `OpenAiClient.Service`) is present on the service object returned by `OllamaAsOpenAIClientLive`. This can also be a stub.
        ```typescript
        // At the end of OllamaAsOpenAIClientLive's returned service object:
        // return {
        //   client: { /* ... all 96 methods from Generated.Client, mostly stubs ... */ },
        //   stream: (params: StreamCompletionRequest) => { /* your IPC streaming logic */ },
        //   streamRequest: <A>(_request: HttpClientRequest.HttpClientRequest) => Stream.fail(
        //     new HttpClientError.RequestError({ request: _request, reason: "Transport", cause: new AiProviderError({ message: "OllamaAdapter: streamRequest not implemented", provider: "Ollama", isRetryable: false }) })
        //   ) as Stream.Stream<A, HttpClientError.HttpClientError> // Make sure the error type matches
        // };
        ```

---

**II. Test File Fixes: Mock Completeness**

1.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 2.1 (Mock `OpenAiClient.Service` - `mockOpenAiClient` - Error `TS2345` line 51):**
        *   The `mockOpenAiClient` instance must fully implement the `OpenAiClient.Service` interface from `@effect/ai-openai`.
        *   Add a `client` property: an object where *every* method from `Generated.Client` is mocked (e.g., `vi.fn().mockReturnValue(Effect.fail(new Error("Not Mocked in OpenAIAgentLanguageModelLive.test.ts")))`). You can create a helper object for this if it's too verbose inline.
        *   Add top-level `stream: vi.fn(() => Stream.empty)` and `streamRequest: vi.fn(() => Stream.empty)` methods.
    *   **Action 2.2 (Mock `ConfigurationService` - `mockConfigService` - Error `TS2345` line 56):**
        *   Complete the `mockConfigService` to implement all methods of `ConfigurationService`:
            ```typescript
            const mockConfigService: ConfigurationService = {
              get: vi.fn((key: string) => Effect.succeed("gpt-4o")), // Default to a valid model for tests
              getSecret: vi.fn((key: string) => Effect.succeed("mock-api-key")),
              set: vi.fn((key: string, value: string) => Effect.void),
              delete: vi.fn((key: string) => Effect.void)
            };
            ```
    *   **Action 2.3 (Mock `TelemetryService` - `mockTelemetry` - Error `TS2345` line 61):**
        *   Complete the `mockTelemetry` to implement all methods of `TelemetryService`:
            ```typescript
            const mockTelemetry: TelemetryService = {
              trackEvent: vi.fn(() => Effect.void),
              isEnabled: vi.fn(() => Effect.succeed(true)),
              setEnabled: vi.fn((enabled: boolean) => Effect.void)
            };
            ```

---

**III. Test File Fixes: Error Types, Property Access, and Layer Provisioning**

1.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action 3.1 (`TS2345 isRetryable` missing in `AiProviderError` constructor line 49):**
        *   The constructor call for `AiProviderError` must include the `isRetryable` property.
            ```typescript
            // Line 49 should be:
            const error = new AiProviderError({
              message: "Provider API error",
              provider: "OpenAI", // Added missing provider
              isRetryable: false // ADD THIS
            });
            ```
    *   **Action 3.2 (`TS2353 context` on `AiContentPolicyError` line 205, and `TS2339 error.context` line 216):**
        *   In `src/services/ai/core/AiError.ts`, add `readonly context?: Record<string, any>;` to the props interface of `AiContentPolicyError`. This will allow the test to pass a `context` and also allow accessing `error.context`.

2.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 3.3 (Layer Provisioning & `R=never` errors - Lines 84, 109, 147, 174):**
        *   Ensure the `TestLayers` constant correctly provides all dependencies for `OpenAIAgentLanguageModelLiveLayer`. The `Effect.provide` call should use this fully composed layer.
            ```typescript
            // Structure in the test file:
            const DependenciesLayer = Layer.mergeAll(
              TestOpenAiClientLayer, // From Action 2.1
              TestConfigServiceLayer, // Layer.succeed(ConfigurationService, mockConfigService from Action 2.2)
              TestTelemetryLayer      // Layer.succeed(TelemetryService, mockTelemetry from Action 2.3)
            );
            const TestSUTLayer = OpenAIAgentLanguageModelLiveLayer.pipe(
              Layer.provide(DependenciesLayer)
            );
            // Then in test:
            // await Effect.runPromise(program.pipe(Effect.provide(TestSUTLayer)) as any);
            ```
    *   **Action 3.4 (`TS2551 total_tokens` vs `totalTokens` line 89):**
        *   Change the assertion `expect(result.metadata?.usage?.total_tokens)` to `expect(result.metadata?.usage?.totalTokens)`.
        *   Ensure the mock for `mockOpenAiModel.generateText` returns `usage: { totalTokens: ..., promptTokens: ..., completionTokens: ... }`.
    *   **Action 3.5 (`TS2322 Error vs never` lines 95, 159):**
        *   When mocking failures, use the specific error type expected by the SUT's method signature.
            ```typescript
            // Example for line 95
            mockOpenAiModel.generateText.mockImplementationOnce(() =>
              Effect.fail(new AiProviderError({ message: "API Error", provider: "OpenAI", isRetryable: false })) as any
            );
            // For streamText, use Stream.fail(...)
            ```

3.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action 3.6 (`TS2345 Tag/Effect` line 123):**
        *   The test program to resolve `AgentLanguageModel` should be:
            ```typescript
            const program = Effect.service(AgentLanguageModel.Tag);
            // ...
            // Cast is okay here since FullAppLayer is complex.
            await Effect.runPromise(Effect.provide(program, FullAppLayer) as Effect.Effect<unknown, unknown, never>);
            ```
        *   The error "Type '{ Tag: Tag<AgentLanguageModel, AgentLanguageModel>; }' is not assignable..." usually means `AgentLanguageModel` (the namespace object) was used where `AgentLanguageModel.Tag` was expected, often in `Layer.succeed` or `Effect.service`/`Effect.flatMap`. Double-check `FullAppLayer` composition in `src/services/runtime.ts` to ensure a concrete provider layer (like `ollamaLanguageModelLayer`) is correctly providing `AgentLanguageModel.Tag`.

---

After applying these changes, run `pnpm tsc --noEmit`. The error count should decrease significantly. Address any remaining errors based on the specific messages, keeping the established patterns in mind. Once TypeScript errors are minimal or zero, run `pnpm test` to check runtime behavior.
