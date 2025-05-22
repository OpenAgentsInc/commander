Okay, Agent, we're targeting the remaining 39 TypeScript errors. The core patterns (`Provider.use()`, `AiResponse` unification) are mostly in place for provider implementations. The current errors are heavily concentrated in test files (mock completeness, Effect layer provisioning) and finishing the `OllamaAsOpenAIClientLive.ts` stubs.

**I. Complete `OllamaAsOpenAIClientLive.ts` Implementation (CRITICAL)**

*   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
*   **Error Ref:** `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts(161,3): error TS2345: Argument of type '{ client: { ... } }' is not assignable to 'Service'. ... missing ... "listChatCompletions", ... and 28 more.`
*   **Action:**
    1.  **Complete `Generated.Client` Stubs:** Open `node_modules/@effect/ai-openai/dist/dts/Generated.d.ts`. Find the `Client` interface.
    2.  In your `OllamaAsOpenAIClientLive.ts`, inside the `client: { ... }` object, ensure **every single method** from the `Generated.Client` interface has a corresponding stub. You have a `stubMethod` helper; use it for all methods not yet implemented. The error message indicates at least 28 methods plus the listed ones (`listChatCompletions`, `getChatCompletion`, `updateChatCompletion`, `deleteChatCompletion`) are missing. You need to add stubs for ALL methods in `Generated.Client` that are not `createChatCompletion`.
    3.  **Add Top-Level `streamRequest` Stub:** Ensure the service object returned by `OllamaAsOpenAIClientLive` also has the `streamRequest` method, matching the `OpenAiClient.Service` interface.
        ```typescript
        // End of OllamaAsOpenAIClientLive's returned service object:
        // return {
        //   client: { /* ... all 96 methods from Generated.Client, mostly stubs ... */ },
        //   stream: (params: StreamCompletionRequest) => { /* your IPC streaming logic */ },
        //   streamRequest: <A>(_request: HttpClientRequest.HttpClientRequest) => Stream.fail(
        //     new HttpClientError.RequestError({ request: _request, reason: "Transport", cause: new AiProviderError({ message: "OllamaAdapter: streamRequest not implemented", provider: "Ollama", isRetryable: false }) })
        //   ) as Stream.Stream<A, HttpClientError.HttpClientError>
        // };
        ```

---

**II. Test File Fixes: Mock Completeness & Correctness**

1.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 2.1 (Mock `OpenAiClient.Service` - `mockOpenAiClient` - Error `TS2345` line 51):**
        *   The `mockOpenAiClient` must fully implement `OpenAiClient.Service`.
        *   Add a `client` property: an object where *every* method from `Generated.Client` is mocked (e.g., `vi.fn().mockReturnValue(Effect.fail("Not Mocked"))`).
        *   Add top-level `stream: vi.fn(() => Stream.empty)` and `streamRequest: vi.fn(() => Stream.empty)` methods.
    *   **Action 2.2 (Mock `ConfigurationService` - `mockConfigService` - Error `TS2345` line 56):**
        *   Add missing methods: `getSecret: vi.fn(() => Effect.succeed("mock-secret-key"))`, `set: vi.fn(() => Effect.void)`, `delete: vi.fn(() => Effect.void)`.
    *   **Action 2.3 (Mock `TelemetryService` - `mockTelemetry` - Error `TS2345` line 61):**
        *   Add missing method: `setEnabled: vi.fn((enabled: boolean) => Effect.void)`.

---

**III. Test File Fixes: Error Types, Property Access, and `Effect.provide` Patterns**

1.  **File: `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`**
    *   **Action 3.1 (`TS2339 AiProviderError.of` line 139):** Change `AiProviderError.of({ ... })` to `new AiProviderError({ ... })`.

2.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action 3.2 (`TS2345 isRetryable` missing line 49):** `AiProviderError` constructor requires `isRetryable`. Update test: `new AiProviderError({ message: "...", provider: "OpenAI", isRetryable: false })`.
    *   **Action 3.3 (`TS2353 context` on `AiContentPolicyError` line 205):** In `src/services/ai/core/AiError.ts`, add `readonly context?: Record<string, any>;` to `AiContentPolicyError`'s props interface.
    *   **Action 3.4 (`TS2339 error.context` line 216):** This will be fixed by Action 3.3.
    *   **Action 3.5 (`TS2345 mapToAiProviderError` boolean to string lines 223, 234):** Change the third argument from `true` to a string model name, e.g., `"test-model"`.

3.  **File: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`**
    *   **Action 3.6 (Duplicate `AiResponse` lines 5, 23):** Alias library import: `import { AiResponse as EffectAiResponse } from "@effect/ai/AiResponse";`. Use `EffectAiResponse` for library types.
    *   **Action 3.7 (`TS2345 R = never` and layer composition lines 213, 216):**
        *   Refactor test layer setup:
            ```typescript
            // Inside the test file
            const DependenciesLayer = Layer.mergeAll(MockOllamaOpenAIClientLayer, MockConfigurationServiceLayer, MockTelemetryServiceLayer);
            const TestSUTLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(Layer.provide(DependenciesLayer));
            // When running:
            // await Effect.runPromise(program.pipe(Effect.provide(TestSUTLayer)));
            ```
        *   The error on line 216 `Layer.provide(OllamaAgentLanguageModelLive.pipe(...))` suggests the `OllamaAgentLanguageModelLive` (the Effect.gen block) is being used directly instead of `OllamaAgentLanguageModelLiveLayer` (the Layer definition).

4.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 3.8 (`TS2345 "make"` line 44):** Change `vi.spyOn(OpenAiLanguageModel, "make")` to `vi.spyOn(OpenAiLanguageModel, "model")`.
    *   **Action 3.9 (`TS2322 Effect<...> not Config | ProviderMetadata` line 45):** Mock for `OpenAiLanguageModel.model()` should return `Effect.succeed(mockProviderInstanceEffect)` where `mockProviderInstanceEffect` is an `Effect` resolving to a mock `Provider` instance.
    *   **Action 3.10 (`R = never` mismatches lines 84, 109, 147, 174):** Apply `Effect.provide(TestSUTLayer)` correctly using the pattern from Action 3.7.
    *   **Action 3.11 (`TS2551 total_tokens` line 89):** Change assertion to `result.metadata?.usage?.totalTokens`. Mock `generateText` to return `usage: { totalTokens: ..., promptTokens: ..., completionTokens: ... }`.
    *   **Action 3.12 (`TS2322 Error vs never` lines 95, 159):** Mocked methods should fail with `new AiProviderError(...)`.

5.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action 3.13 (`TS2345 Tag/Effect` line 123):** The test program should be `const program = Effect.service(AgentLanguageModel.Tag);`. Review `FullAppLayer` in `runtime.ts` to ensure `AgentLanguageModel.Tag` is correctly provided by a concrete provider layer.

---

After completing these steps, re-run `pnpm tsc --noEmit`. Address any remaining errors, which should be few and highly specific. Then proceed to run `pnpm test` and fix any test failures.

The goal is zero TypeScript errors. The test failures from the quality report will then guide further refinement.```json
[
  {"command": "Update `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`: In the `client` object, add stubs for all remaining ~24 methods from the `Generated.Client` interface (from `node_modules/@effect/ai-openai/dist/dts/Generated.d.ts`). Use the `stubMethod` helper for each. Ensure the top-level `streamRequest` method is also present on the returned service object and stubbed (e.g., `streamRequest: <A>(_request: HttpClientRequest.HttpClientRequest) => Stream.fail(...)`)."},
  {"command": "Update `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`: For `mockOpenAiClient`, ensure it fully implements `OpenAiClient.Service`. Add a `client` property that is an object mocking all methods from `Generated.Client` with `vi.fn()`. Add top-level `stream: vi.fn(() => Stream.empty)` and `streamRequest: vi.fn(() => Stream.empty)` methods."},
  {"command": "Update `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`: For `mockConfigService`, add missing methods: `getSecret: vi.fn(() => Effect.succeed(\"mock-secret-key\"))`, `set: vi.fn(() => Effect.void)`, `delete: vi.fn(() => Effect.void)`."},
  {"command": "Update `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`: For `mockTelemetry`, add the missing `setEnabled: vi.fn((enabled: boolean) => Effect.void)` method."},
  {"command": "Update `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`: Change `AiProviderError.of({ ... })` on line 139 to `new AiProviderError({ ... })`."},
  {"command": "Update `src/services/ai/core/AiError.ts`: For `AiContentPolicyError`, add `readonly context?: Record<string, any>;` to its props interface to allow passing a context object in tests."},
  {"command": "Update `src/tests/unit/services/ai/core/AIError.test.ts`: In the `mapToAiProviderError` test calls (lines 223, 234), change the third argument (modelName) from `true` (boolean) to a string like `\"test-model\"`."},
  {"command": "Update `src/tests/unit/services/ai/core/AIError.test.ts`: In the constructor call for `AiProviderError` on line 49, add the required `isRetryable: false` (or `true`) property: `new AiProviderError({ message: \"Provider API error\", provider: \"OpenAI\", isRetryable: false })`."},
  {"command": "Update `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test
