Okay, let's address the TypeScript errors and then the failing tests systematically.

**Priority 1: TypeScript Errors in `src/tests/unit/services/runtime.test.ts`**

The errors indicate that an `Effect` which results in an `AgentLanguageModel` instance is being used where an `Effect` resulting in `never` (or `void`) is expected. This typically means an effect's successful result is not being properly discarded or handled in a pipeline that expects no specific success value.

**Instructions for the Coding Agent:**

1.  **Open the file `src/tests/unit/services/runtime.test.ts`.**
2.  **Locate Lines 117 and 128 (and any similar patterns).**
    You are looking for a situation where an `Effect` that successfully yields an `AgentLanguageModel` (or an `Effect` that requires `AgentLanguageModel` and then yields it) is being passed to a function or used in an Effect combinator (like `Effect.tap`, or as the last statement in an `Effect.gen` that should yield `void`) which expects its input Effect to have `never` or `void` as its success type (`A`).

3.  **Apply the Fix:**
    If the `AgentLanguageModel` instance produced by the effect is not needed by the subsequent logic in that specific part of the test (i.e., it's a step in a larger setup or a check that doesn't contribute a value to the next step), you should explicitly discard its success value.

    *   **If the effect is `myEffectThatYieldsAgentLM: Effect<R, E, AgentLanguageModel>`:**
        Change its usage from:
        ```typescript
        // Potentially problematic usage if someOperation expects Effect<R, E, never>
        Effect.someOperation(myEffectThatYieldsAgentLM, /* ... */)
        // or
        yield* myEffectThatYieldsAgentLM // as last statement in a void-returning Effect.gen
        ```
        To:
        ```typescript
        Effect.someOperation(Effect.asVoid(myEffectThatYieldsAgentLM), /* ... */)
        // or
        yield* Effect.asVoid(myEffectThatYieldsAgentLM)
        // or, if you need to use it for a side-effect first:
        // yield* myEffectThatYieldsAgentLM.pipe(
        //   Effect.tap((agentLM) => console.log("Used for side effect:", agentLM)),
        //   Effect.asVoid
        // )
        ```
    This tells TypeScript and Effect that you are intentionally ignoring the `AgentLanguageModel` success value of that particular effect.

    **Since I don't have the exact code for `runtime.test.ts`, you'll need to identify the specific expression at column 36 on line 117 (and similarly for line 128) and apply this `Effect.asVoid(...)` or a similar ignoring combinator like `Effect.ignore` if appropriate.**

    For instance, if line 117 is part of `FullAppLayer`'s definition *within the test file* (which is unusual, but possible if it's a complex test setup) and it involves an Effect that resolves to `AgentLanguageModel` where it shouldn't, that's where the fix applies. More likely, a test case is incorrectly using an effect.

    **If `runtime.test.ts` has something like this:**
    ```typescript
    // Example of what might be in runtime.test.ts causing the error
    const testEffect = Effect.gen(function*(_) {
        // ... some setup ...
        const resolvedModel = yield* _(Effect.provide(AgentLanguageModel, FullAppLayer)); // This resolves to AgentLanguageModel
        // If the test's overall effect is expected to be Effect<..., void>
        // but this is the last line, it will infer Effect<..., AgentLanguageModel>
        return resolvedModel; // This might be the issue if the test context expects never/void
    });
    // If 'testEffect' is then used in a void context:
    // Effect.runPromise(Effect.tap(testEffect, () => {})) // This tap would complain
    ```
    The fix would be to change the return or the usage:
    `return yield* Effect.asVoid(resolvedModel);` or `Effect.runPromise(Effect.asVoid(testEffect))` if the value of `testEffect` itself is not used.

**Priority 2: Test Failures - `TypeError: Cannot read properties of undefined (reading 'pipe')` in `OllamaAgentLanguageModelLive.test.ts`**

This error indicates that the `OpenAiLanguageModel.model(...)` factory (from `@effect/ai-openai`) is not being used correctly within `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`. It's likely due to an incorrect local mock overriding the library's implementation or a misunderstanding of how `AiModel` resolves to a `Provider`.

**Instructions for the Coding Agent:**

1.  **Open `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`.**
2.  **Remove Local Mock of `OpenAiLanguageModel`:**
    Delete or comment out any local mock definition of `OpenAiLanguageModel`. For example, if you have:
    ```typescript
    // const OpenAiLanguageModel = { model: (modelName: string) => Effect.succeed({ ... }) }; // REMOVE THIS
    ```
3.  **Ensure Correct Import:**
    Make sure you are importing `OpenAiLanguageModel` from `@effect/ai-openai`:
    ```typescript
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
    ```
4.  **Correctly Resolve `AiModel` to `Provider`:**
    The `OpenAiLanguageModel.model(modelName)` function returns an `Effect<AiModel<...>>`. This `AiModel` is *also* an `Effect` that, when run, yields the actual `Provider<Service>`. You need two `yield*` steps.

    Modify the section where `provider` is obtained:
    ```typescript
    // Inside the Effect.gen block of OllamaAgentLanguageModelLive:
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
    // ... (configService, telemetry, modelNameEffect logic) ...
    const modelName = yield* _(modelNameEffect);

    // --- START FIX ---
    const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName); // This is Effect<AiModel<...>, ..., OpenAiClient>

    // Provide the ollamaAdaptedClient (which implements OpenAiClient.Service)
    const configuredAiModelEffect = Effect.provideService(
      aiModelEffectDefinition,
      OpenAiClient.OpenAiClient, // The Tag for the service being provided
      ollamaAdaptedClient         // The actual service instance (your OllamaAsOpenAIClientLive)
    );

    // Yielding this effect gives us the AiModel<AgentLanguageModel, never>
    const aiModel = yield* _(configuredAiModelEffect); // Step 1: Resolve AiModel

    // An AiModel is an Effect that resolves to a Provider. So, run the AiModel effect.
    const provider = yield* _(aiModel); // Step 2: Resolve Provider from AiModel
    // --- END FIX ---

    // ... (rest of the telemetry and service implementation)
    // The 'provider' variable will now correctly be the Provider<AgentLanguageModel>
    // and provider.generateText(...).pipe(...) should work.
    ```
    The key is the two-stage `yield*` process for `AiModel` resolution.

**Priority 3: Test Failure - `AIProviderError` Assertion in `OllamaAgentLanguageModelLive.test.ts`**

This is likely a consequence of the `TypeError` above. If the `pipe` error is fixed, the effect pipeline might complete correctly, allowing the error mapping to be tested. If it still fails after fixing the `pipe` error, it means the `Effect.mapError(...)` in `OllamaAgentLanguageModelLive.ts` is not correctly constructing or returning the `AIProviderError`. Ensure the `cause` is properly passed and the new error is instantiated correctly.

**Priority 4: Test Failure - `ResponseError` in `OllamaAsOpenAIClientLive.test.ts`**

The error `Ollama IPC non-stream request failed: Cannot read properties of undefined (reading '_op')` within `OllamaAsOpenAIClientLive.test.ts` suggests an issue where an Effect operation is being performed on a non-Effect value, or an Effect is being returned/handled incorrectly by the IPC mock or the SUT's interaction with it.

**Instructions for the Coding Agent:**

1.  **Open `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`.**
2.  **Review the `createChatCompletion` method's `catch` block:**
    ```typescript
    // Inside createChatCompletion:
    catch: (error) => {
      // If already an HttpClientError or ParseError, rethrow it.
      if (HttpClientError.isHttpClientError(error) || (error as any)._tag === "ParseError") {
          return error as HttpClientError.HttpClientError | ParseError; // This is fine.
      }
      // Wrap other errors
      const providerError = error instanceof AIProviderError ? error : new AIProviderError({ /* ... */ cause: error });
      // ... (telemetry error)
      const request = HttpClientRequest.post(options.model); // 'options' was 'params'
      const webResponse = new Response(JSON.stringify(providerError.message), { status: 500 });
      // THIS IS WHERE THE HttpClientError.ResponseError IS CREATED
      return new HttpClientError.ResponseError({
        request,
        response: HttpClientResponse.fromWeb(request, webResponse),
        reason: "StatusCode",
        description: providerError.message,
        cause: providerError // The 'cause' here is AIProviderError
      });
    },
    ```
    The error `Cannot read properties of undefined (reading '_op')` can sometimes happen if `Effect.runPromise` tries to execute something that isn't a valid `Effect<A, E>`. If the `error` variable caught by `catch` is itself an `Effect` instance (which can happen if the promise from `ollamaIPC.generateChatCompletion` accidentally resolves or rejects with an Effect object), then creating `new HttpClientError.ResponseError` with that Effect as a `cause` might lead to Effect trying to introspect its internal `_op` field.

    **Action:**
    *   In `OllamaAsOpenAIClientLive.test.ts`, ensure the mock for `window.electronAPI.ollama.generateChatCompletion` strictly returns a `Promise` that resolves to data or rejects with a plain `Error` or a simple error object, not an `Effect` instance.
        ```typescript
        // In OllamaAsOpenAIClientLive.test.ts
        mockGenerateChatCompletion.mockImplementation(async (ipcParams) => {
          if (ipcParams.model === "error-model") {
            // Simulate an IPC error by rejecting with a plain error object
            // Or a structure that your IPC error handling expects
            return Promise.reject({ __error: true, message: "Simulated IPC failure" });
          }
          return Promise.resolve(mockResponse); // mockResponse is your valid data
        });
        ```
    *   Ensure your `ollamaIPC.generateChatCompletion` (in `ollama-context.ts`) and its handler (`ollama-listeners.ts`) correctly serialize errors from the main process to be simple objects or strings, not complex Effect structures. The `extractErrorForIPC` function should handle this.

After applying these fixes:
1.  Run `pnpm tsc --noEmit --pretty false` and report the output.
2.  Then run `pnpm test` and report the full test results.

Let's tackle these systematically. The TypeScript errors in `runtime.test.ts` and the `pipe` errors in `OllamaAgentLanguageModelLive.test.ts` are the highest priority.
