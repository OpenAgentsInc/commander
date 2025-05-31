Okay, Agent, we're making progress. The error count is 54, down from 76. This indicates the provider implementation fixes (especially the `provider.use()` pattern for Ollama and OpenAI) are working.

The remaining errors are now concentrated in:

1.  **Core Type Issues:** `AiResponse` and `AiTextChunk` definitions and their usage.
2.  **Test Files:** Mocking, layer provisioning, and error/type assertions.

Let's refine the instructions, focusing on these areas.

**I. Solidify Core AI Types (`AiResponse.ts`, `AgentLanguageModel.ts`)**

1.  **File: `src/services/ai/core/AiResponse.ts`**
    *   **Action 1.1 (Ensure Full Compatibility):** This is the **absolute top priority**. Your `AiResponse` class MUST correctly implement or be a fully compatible extension of `@effect/ai/AiResponse.AiResponse`. The errors in NIP-90 and OpenAI providers (`TS2322: Type 'AiResponse' is missing ... properties ...`) directly point to this.
        *   **Key missing properties/methods from `@effect/ai/AiResponse` likely include:**
            *   `readonly [TypeId]: EffectAiResponseFormat.TypeId;`
            *   `get parts(): ReadonlyArray<EffectAiResponseFormat.Part>;` (Must return an array of `TextPart`, `ToolCallPart`, `FinishPart`, etc., from `@effect/ai/AiResponse`)
            *   `get finishReason(): FinishReason;` (Type from `@effect/ai/AiResponse`)
            *   `getProviderMetadata<I, S>(tag: Context.Tag<I, S>): Option.Option<S>;`
            *   `withToolCallsJson(...)`, `withToolCallsUnknown(...)`, `withFunctionCallJson(...)`, `withFunctionCallUnknown(...)`, `withJsonMode(...)`. These must return `Effect.Effect<this, AiError>`.
        *   **Constructor:** Ensure your constructor aligns with `EffectAiResponseFormat.Props` from `@effect/ai/AiResponse`.
        *   **`AiResponse.fromSimple` helper:** Update this static method to construct `parts` correctly (e.g., using `TextPart.make(...)`, `ToolCallPart.make(...)`, `FinishPart.make(...)` from `@effect/ai/AiResponse`).
        *   **Example for `get parts()` (if your class stores `text`, `toolCalls`, `metadata` directly):**
            ```typescript
            // In src/services/ai/core/AiResponse.ts
            import { AiResponse as EffectAiResponseFormat, PartTypeId, TextPart, ToolCallPart, FinishPart, Usage, FinishReason } from "@effect/ai/AiResponse";
            // ... other imports ...

            export class AiResponse extends EffectAiResponseFormat { // Extend the library's class
              // Your convenience getters (text, toolCalls, metadata) are ALREADY on EffectAiResponseFormat
              // So you might not need to re-declare them if they match.

              // Ensure the constructor accepts EffectAiResponseFormat.Props
              constructor(props: EffectAiResponseFormat.Props) {
                super(props); // Call the super constructor
              }

              // If you need custom logic, override methods. Otherwise, inheritance might suffice.
              // Example: If you store 'text' directly and need to provide 'parts':
              // get parts(): ReadonlyArray<EffectAiResponseFormat.Part> {
              //   const _parts: EffectAiResponseFormat.Part[] = [];
              //   if (this.text) { // Assuming 'this.text' is a property you added
              //     _parts.push(TextPart.make({ text: this.text }));
              //   }
              //   // ... map this.toolCalls to ToolCallPart ...
              //   // ... add FinishPart from this.metadata ...
              //   return _parts;
              // }

              // Static factory like fromSimple becomes more important
              static fromSimple(data: { /* ... */ }): AiResponse {
                const parts: EffectAiResponseFormat.Part[] = [];
                if (data.text) parts.push(TextPart.make({ text: data.text }));
                // ... convert data.toolCalls to ToolCallPart[] ...
                parts.push(FinishPart.make({
                  reason: (data.metadata?.finishReason as FinishReason) || "unknown",
                  usage: new Usage({ /* map from data.metadata.usage */ }),
                  providerMetadata: {}
                }));
                return new AiResponse({ parts });
              }
            }
            ```
    *   **Action 1.2 (`AiTextChunk`):**
        *   **Decision:** It's simpler if `streamText` methods in `AgentLanguageModel` (and all providers) stream `AiResponse` objects where each object represents a chunk.
        *   **Change:**
            *   Remove the custom `AiTextChunk` class from `AiResponse.ts` (and its export from `core/index.ts`).
            *   Update `AgentLanguageModel.ts`: `streamText` returns `Stream.Stream<AiResponse, AiProviderError, never>`.
            *   Update all provider implementations: `streamText` should map chunks from the underlying library (which are usually `@effect/ai` `AiResponse` objects) to your (now fixed) core `AiResponse` type.
            *   Update `useAgentChat.ts`: The `Stream.runForEach` callback will receive `AiResponse` chunks. Access `chunk.text`.

2.  **File: `src/services/ai/core/AiError.ts`**
    *   **Action 2.1 (Add `provider` to `AiContentPolicyError` props):**
        *   The `TS2353` error in `AIError.test.ts (line 205)` for `AiContentPolicyError` suggests the test is trying to pass `context` but it's not defined. If `context` is intended, add `readonly context?: Record<string, any>;` to its props interface. The provided log's `AiContentPolicyError` already has `provider` as a required prop.
        *   **Verify:**
            ```typescript
            export class AiContentPolicyError extends Data.TaggedError("AiContentPolicyError")<{
              readonly message: string;
              readonly provider: string; // Already there
              readonly flaggedContent?: string;
              readonly cause?: unknown;
              readonly context?: Record<string, any>; // ADD THIS if tests need it
            }> {}
            ```
    *   **Action 2.2 (Constructor for `AiProviderError`):**
        *   The error `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts(180,22): error TS2339: Property 'provider' does not exist on type 'AiProviderError'.` implies that even though `provider` is in the props type, it's not being correctly assigned or accessed.
        *   `Data.TaggedError` handles property assignment from the constructor args. Ensure the constructor argument type matches the props type and that tests access `error.provider`.
        *   **Check `mapToAiProviderError`:** Ensure it correctly passes `providerName` to `new AiProviderError({ provider: providerName, ... })`.
    *   **Action 2.3 (Remove `AiGenericError` if unused):** If `AiError` is the base for all others and `AiGenericError` isn't specifically used or exported for a reason, consider removing it to simplify. If it *is* used (e.g., by `MockAiError` in `AgentLanguageModel.test.ts`), ensure it's exported from `core/index.ts`.

---

**II. Provider Implementation Refinements**

1.  **Files:** `OllamaAgentLanguageModelLive.ts`, `OpenAIAgentLanguageModelLive.ts`, `NIP90AgentLanguageModelLive.ts`
    *   **Action 3.1 (Consistent `Provider.use` Pattern):**
        *   Apply the `provider.use(...)` pattern consistently as detailed in `1336-instructions.md (Action I.1.1 for Ollama, apply similarly to OpenAI)`.
        *   Ensure mapping from your `GenerateTextOptions`/`StreamTextOptions` to `@effect/ai`'s options for `languageModel.generateText/streamText` is correct. Specifically, `maxTokens` (not `max_tokens` for `@effect/ai` methods typically), `temperature`, `stopSequences`, etc.
        *   Ensure mapping of the result from `@effect/ai` `AiResponse` back to your core `AiResponse` (now fixed per I.1) is complete, including `text`, `metadata`, and `toolCalls` (if any).
    *   **Action 3.2 (`generateStructured`):**
        *   Ensure all providers have a `generateStructured` method. If not supported, it should be:
            ```typescript
            generateStructured: (options: GenerateStructuredOptions) =>
              Effect.fail(new AiProviderError({
                message: `generateStructured not supported by ${ProviderName} provider`,
                provider: "ProviderName",
                isRetryable: false
              }))
            ```

2.  **File: `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`**
    *   **Action 4.1 (Full `Generated.Client` Implementation):** This is critical for `TS2740` ("missing properties from `Client`").
        *   The `client` object returned by `OllamaAsOpenAIClientLive`'s effect **MUST** implement every single method declared in `Generated.Client` from `node_modules/@effect/ai-openai/dist/dts/Generated.d.ts`.
        *   For methods not implemented by your Ollama IPC bridge (most of them), provide stub implementations:
            ```typescript
            // Example stub for listAssistants
            listAssistants: (_options: any) => Effect.fail(
              new HttpClientError.RequestError({ // Or ResponseError if more appropriate for "Not Implemented"
                request: HttpClientRequest.get("ollama-ipc-listAssistants"),
                reason: "Transport", // Or a custom reason
                cause: new AiProviderError({
                  message: "OllamaAdapter: listAssistants not implemented",
                  provider: "Ollama",
                  isRetryable: false,
                }),
              })
            ),
            // ... and so on for ALL other methods in Generated.Client ...
            ```
        *   Ensure `createChatCompletion` is correctly mapping between `Generated.CreateChatCompletionRequest.Encoded` and what your IPC expects, and its return type matches `Effect.Effect<Generated.CreateChatCompletionResponse.Type, HttpClientError.HttpClientError | ParseError>`.
    *   **Action 4.2 (`TextPart` error on line 413):** When creating `AiResponse` instances for the stream, use `TextPart.make({ text: content })` (imported from `@effect/ai/AiResponse`) for text parts.

---

**III. Test File Fixes**

1.  **General Test Fix Pattern: `Effect.provide(layer)`**
    *   **Action 5.1:** In all test files, where `Effect.runPromise` or `Effect.runPromiseExit` is used on a program that has dependencies, ensure the *final* pipe is `Effect.provide(testLayer)`, where `testLayer` is a `Layer.Layer<RequiredContext, Error, never>`.
        ```typescript
        // Correct:
        await Effect.runPromise(myTestProgram.pipe(Effect.provide(testLayer)));
        ```

2.  **File: `src/tests/unit/services/ai/core/AgentLanguageModel.test.ts`**
    *   **Action 6.1 (`TS2459 AiTextChunk` not exported):** This will be fixed if `AiTextChunk` is removed/aliased (Action I.1.2). If kept, export it from `AiResponse.ts` and `core/index.ts`.
    *   **Action 6.2 (`TS2305 AiGenericError` not exported):** Fix by exporting `AiGenericError` from `core/index.ts` if it's a used base class.
    *   **Action 6.3 (`TS2339 _tag` on `MockAiError`):** `MockAiError` should extend `Data.TaggedError("MockAiErrorTag")`. The `_tag` property will be on instances (`errorInstance._tag`). If `this._tag = "AiProviderError"` is used, it's incorrect for `Data.TaggedError`.
    *   **Action 6.4 (`TS2345` Tag/Effect argument issues for lines 71, 73, 87, 90, 109, 112, 141, 146, 165, 171):**
        *   `Layer.succeed(AgentLanguageModel.Tag, mockServiceInstance)`
        *   `Effect.flatMap(AgentLanguageModel.Tag, (serviceInstance) => ...)`
        *   Do not pass `{ Tag: AgentLanguageModel.Tag }`. Use `AgentLanguageModel.Tag` directly.

3.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action 7.1 (`TS2353` Object literal known properties):**
        *   When constructing errors (e.g., `new AiError({ message: "...", context: { foo: "bar" } })`), the constructor properties must match the error class's `props` generic type.
        *   If `AiError`, `AiProviderError`, `AiContentPolicyError`, etc., in `AiError.ts` do not define `context` in their props, then tests cannot pass it. **Modify the error classes in `AiError.ts` to include `readonly context?: Record<string, any>;` in their props if this is intended.**
    *   **Action 7.2 (`TS2345` mapToAiProviderError boolean to string lines 223, 234):** `mapToAiProviderError`'s third arg is `modelName: string`. Pass a string: `mapToAiProviderError(err, "Ollama", "some-model", true)`.

4.  **File: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`**
    *   **Action 8.1 (`TS2345 Client` mismatch on line 161):** The mock for `OllamaOpenAIClientTag` must be a *full* implementation of `OpenAiClient.Service` (from `@effect/ai-openai`), including all methods from `Generated.Client` (stubbed with `vi.fn().mockReturnValue(Effect.fail(...))`).
    *   **Action 8.2 (`TS2345 R = never` mismatch line 213):** Ensure `TestLayer` correctly provides *all* dependencies for `OllamaAgentLanguageModelLiveLayer`. The structure for `TestLayer` (providing to the SUT layer) should be:
        ```typescript
        const DependenciesLayer = Layer.mergeAll(MockOllamaOpenAIClient, MockConfigurationService, MockTelemetryService);
        const TestLayer = OllamaAgentLanguageModelLiveLayer.pipe(Layer.provide(DependenciesLayer));
        ```
    *   **Action 8.3 (`TS2345 Layer.provide` signature mismatch line 216):** This looks like a complex pipe. Ensure `Layer.provide` is used as `LayerToProvideTo.pipe(Layer.provide(LayerOfDependencies))`.

5.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 9.1 (`TS2345 "make"` line 44):** Change `vi.spyOn(OpenAiLanguageModel, "make")` to `vi.spyOn(OpenAiLanguageModel, "model")`.
    *   **Action 9.2 (`TS2322 Effect<...> not Config | ProviderMetadata` line 45):** The mock for `OpenAiLanguageModel.model()` should return `Effect.succeed(mockAiModelEffect)` where `mockAiModelEffect` itself resolves to a mock `Provider` instance. See `1336-instructions.md (Action TF.8.2)` for a sketch.
    *   **Action 9.3 (Mocks Incomplete lines 51, 56, 61):** Mocks for `OpenAiClient.OpenAiClient`, `ConfigurationService`, `TelemetryService` must implement all their interface methods.
    *   **Action 9.4 (`TS2339 total_tokens` line 89):** Update your core `AiResponse` and the mock `generateText` to use `metadata: { usage: { totalTokens: number, ... } }`.
    *   **Action 9.5 (`TS2345 AiResponse` vs `AiTextChunk` line 138):** Fix based on Action I.1.2. The stream should be `AiResponse` chunks.

6.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action 10.1 (`TS2345 Tag/Effect` line 123):** Likely `Effect.flatMap(AgentLanguageModel.Tag, ...)` or similar needs to use `AgentLanguageModel.Tag` directly, not an object containing it. The `program` should be `Effect.service(AgentLanguageModel.Tag)`.

---

**After applying these fixes, run `pnpm tsc --noEmit` (or `pnpm t`). Many errors should be resolved. Address any remaining errors with similar logic.**

The key is strict adherence to the `@effect/ai` interfaces and ensuring your core types and provider implementations are perfectly aligned. Test mocks must also precisely match the interfaces they are mocking.Okay, Agent, we're at 54 errors. This is a good point to consolidate and apply the established patterns more broadly. The core `AiResponse` type and the `Provider.use()` pattern are central to fixing the remaining provider and test issues.

**I. Ensure `AiResponse` is Fully Implemented and Used (`src/services/ai/core/AiResponse.ts`)**

1.  **Action (Re-iterate and Verify - CRITICAL):**
    *   Confirm your `AiResponse` class in `src/services/ai/core/AiResponse.ts` **extends** `EffectAiResponseFormat` (imported from `@effect/ai/AiResponse`).
    *   The constructor MUST be `constructor(props: EffectAiResponseFormat.Props) { super(props); }`.
    *   Remove any manual assignment of `[EffectAiResponseFormat.TypeId]`. Inheritance handles this.
    *   **Remove custom `get text()`, `get toolCalls()`, `get metadata()` getters** from your `AiResponse` class if they simply replicate what the base `EffectAiResponseFormat` class provides. The base class already has these.
    *   The `static fromSimple()` method is good for convenience if your internal logic prefers constructing with simpler objects. Ensure its output `parts` array correctly uses `TextPart.make`, `ToolCallPart.make`, `FinishPart.make` etc., from `@effect/ai/AiResponse`.
    *   **Remove `AiTextChunk`:**
        *   Delete the `AiTextChunk` class from `AiResponse.ts`.
        *   Remove its export from `core/index.ts`.
        *   Update `AgentLanguageModel.ts`: `streamText` returns `Stream.Stream<AiResponse, AiProviderError, never>`.
        *   Update all provider implementations: `streamText` methods must map their streamed chunks (which are likely `@effect/ai` `AiResponse` objects) to your application's core `AiResponse` type (which now extends the library's one). This mapping might just be `new AiResponse(chunkFromLibrary.props)` or similar.
        *   Update `useAgentChat.ts`: The `Stream.runForEach` callback for `textStream` should expect `AiResponse` chunks. Access `chunk.text`.
        *   Update `NIP90AgentLanguageModelLive.test.ts` and `OpenAIAgentLanguageModelLive.test.ts` which still refer to `AiTextChunk`.

---

**II. Finalize Provider Implementations (Ollama & OpenAI - Apply `Provider.use()` and `AiResponse` mapping)**

1.  **Files:**
    *   `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
    *   `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`
2.  **Action (Apply `Provider.use()` and correct `AiResponse` mapping):**
    *   **Recap the pattern (for `generateText`):**
        ```typescript
        // Your method signature:
        // generateText: (options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never> =>

        return provider.use( // Use the provider's .use() method
          Effect.gen(function* (_) {
            const languageModel = yield* _(EffectAiLanguageModel.AiLanguageModel); // Get the service from context
            const libResponse = yield* _(languageModel.generateText({ /* map your GenerateTextOptions */
              prompt: options.prompt,
              temperature: options.temperature, // Ensure these are valid options for @effect/ai's generateText
              maxTokens: options.maxTokens,
              stopSequences: options.stopSequences
              // model: options.model, // model is usually part of AiModel creation
            }));
            // Construct YOUR AiResponse using the library's AiResponse
            // If your AiResponse extends @effect/ai's, this might be:
            return new AiResponse(libResponse.props); // Pass the props from the library's response
          })
        ).pipe(
          Effect.mapError((error) => new AiProviderError({ /* ... */ provider: "SpecificProviderName", /* ... */ }))
        );
        ```
    *   **For `streamText`:**
        ```typescript
        // Your method signature:
        // streamText: (options: StreamTextOptions): Stream.Stream<AiResponse, AiProviderError, never> =>

        return Stream.unwrap(
          provider.use(
            Effect.gen(function* (_) {
              const languageModel = yield* _(EffectAiLanguageModel.AiLanguageModel);
              return languageModel.streamText({ /* map StreamTextOptions */
                prompt: options.prompt,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                signal: options.signal
              }); // This returns Stream.Stream<EffectAiLib.AiResponse, ...>
            })
          )
        ).pipe(
          Stream.map((effectAiResponse) => new AiResponse(effectAiResponse.props)), // Map each chunk
          Stream.mapError((error) => new AiProviderError({ /* ... */ provider: "SpecificProviderName", /* ... */ }))
        );
        ```
    *   **Specific to `OpenAIAgentLanguageModelLive.ts` (`TS2339` for `max_tokens`, `temperature`):**
        *   Verify that `temperature` and `maxTokens` are valid properties on the options object for `@effect/ai-openai`'s `languageModel.generateText` and `streamText`. If they are part of the `OpenAiLanguageModel.model(name, config)` call, then you might not need to pass them per-request unless the library supports overrides.
            *   **Check `OpenAiLanguageModel.d.ts`:** Look at `Config.Service` for model-level config and the `GenerateTextOptions` for `AiLanguageModel.Service` for per-request options.
            *   The `@effect/ai` `GenerateTextOptions` (from `@effect/ai/AiLanguageModel`) should accept `temperature`, `maxTokens`. Ensure your local `GenerateTextOptions` in `core/AgentLanguageModel.ts` aligns with this or provides a compatible subset.

---

**III. Test File Fixes**

1.  **File: `src/tests/helpers/effect-test-utils.ts`**
    *   **Action (`TS2345 Effect<A, any, any>` vs `Effect<A, any, never>`):**
        *   The `runTest` helper's type signature for `layer` should indicate it has no further input requirements (`RIn = never`).
            ```typescript
            export const runTest = <A, E, ROut, E2>(
              effect: Effect.Effect<A, E, ROut>, // Effect requires ROut
              layer: Layer.Layer<ROut, E2, never> // Layer provides ROut and has no further inputs
            ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));
            ```
        *   This means any `TestLayer` passed to `runTest` must be fully composed with all its dependencies.
    *   **Action (`TS2551 Effect.service` vs `Effect.Service`):** Correct to `Effect.service(tag)`.

2.  **File: `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`**
    *   **Action (`TS2339 AiProviderError.of`):** Change to `new AiProviderError({ ... })`.
    *   **Action (`TS2339 error.provider`):** Ensure `AiProviderError` has `provider` as a direct, readable property and tests access it correctly. If it's in `context`, use `error.context.provider`.

3.  **File: `src/tests/unit/services/ai/core/AgentLanguageModel.test.ts`**
    *   **Action (`TS2459 AiTextChunk` not exported / `TS2305 AiGenericError` not exported):** Fix by exporting from `core/index.ts` (if `AiTextChunk` is kept and `AiGenericError` is used).
    *   **Action (`TS2339 _tag` on `MockAiError`):** Define `MockAiError` as `class MockAiError extends Data.TaggedError("MockAiErrorTag")<{...}> {}`. Access `errorInstance._tag`.
    *   **Action (`TS2345` Tag/Effect argument issues for lines 71, etc.):** Use `AgentLanguageModel.Tag` directly. For `Layer.succeed`, use `Layer.succeed(AgentLanguageModel.Tag, mockServiceInstance)`. For resolving service in Effect, use `Effect.service(AgentLanguageModel.Tag)`.

4.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action (`TS2353` Object literal known properties for `context`):**
        *   Ensure `AiError` and its subclasses in `AiError.ts` that are tested with a `context` property have `readonly context?: Record<string, any>;` in their props interface.
    *   **Action (`TS2345` mapToAiProviderError boolean to string lines 223, 234):** Pass a string model name: `mapToAiProviderError(err, "Ollama", "test-model", true)`.

5.  **File: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`**
    *   **Action (`TS2345 Client` mismatch line 161):** The mock for `OllamaOpenAIClientTag` (`mockOpenAiClient`) must be a full implementation of `@effect/ai-openai`'s `OpenAiClient.Service` interface, including the nested `client: Generated.Client` structure and all its methods (can be `vi.fn()`).
    *   **Action (`TS2345 R = never` mismatch line 213):** The `TestLayer` needs to correctly provide *all* dependencies for `OllamaAgentLanguageModelLiveLayer`.
        ```typescript
        const DependenciesLayer = Layer.mergeAll(MockOllamaOpenAIClientLayer, MockConfigurationServiceLayer, MockTelemetryServiceLayer);
        const TestSUTLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(Layer.provide(DependenciesLayer));
        // then for running the program:
        // Effect.runPromise(program.pipe(Effect.provide(TestSUTLayer)));
        ```
    *   **Action (`TS2345 Layer.provide` signature mismatch line 216):** This is likely an incorrect composition. It should be `LayerToProvideTo.pipe(Layer.provide(LayerOfDependencies))`. The line `Layer.provide(OllamaAgentLanguageModelLive.pipe(Layer.provide(Layer.mergeAll(...))))` is trying to provide a `Layer` *to itself* in a way. Correct structure:
        ```typescript
        const ollamaAgentLMImplEffect = OllamaAgentLanguageModelLive; // This is the Effect.gen block
        const dependencies = Layer.mergeAll(...); // Mocked dependencies
        const testLayer = Layer.effect(AgentLanguageModel.Tag, ollamaAgentLMImplEffect).pipe(Layer.provide(dependencies));
        ```

6.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action (`TS2345 "make"` line 44):** Change to `vi.spyOn(OpenAiLanguageModel, "model")`.
    *   **Action (`TS2322 Effect<...> not Config | ProviderMetadata` line 45):** The mock for `OpenAiLanguageModel.model()` should return an `Effect` that resolves to a mock `AiModel` instance (e.g., `Effect.succeed(mockAiModelEffect)` where `mockAiModelEffect` itself yields a `Provider`).
    *   **Action (Mocks Incomplete lines 51, 56, 61):** Mocks for `OpenAiClient.OpenAiClient`, `ConfigurationService`, `TelemetryService` must implement all their interface methods.
    *   **Action (`TS2339 total_tokens` line 89):** Ensure mock `generateText` returns `metadata: { usage: { totalTokens: ..., promptTokens: ..., completionTokens: ... } }`.
    *   **Action (`TS2322 Error vs never` lines 95, 159):** Mocked methods should fail with `new AiProviderError(...)`.

7.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action (`TS2345 Tag/Effect` line 123):** The program should be `const program = Effect.service(AgentLanguageModel.Tag);`. `FullAppLayer` must correctly provide `AgentLanguageModel.Tag`.

---

**After this round, TypeScript errors should be significantly reduced, hopefully to a handful related to specific test assertions or very nuanced type issues.** Focus on one file or one pattern at a time.

```

File: vite.renderer.config.mts

```typescript
import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/renderer";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig((config) => {
  rmSync("dist-electron/renderer", { recursive: true, force: true });

  const isTest = process.env.NODE_ENV === "test";

  return {
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
      },
    },
    plugins: [
      react({
        babel: {
          plugins: [
            ["babel-plugin-react-compiler", {}], // Enable React Compiler
          ],
        },
      }),
      svgr(),
      tailwindcss(),
      tsconfigPaths(),
      electron({
        page: 0, // The entry point for Electron main process
        sourcemap: config.mode === "development",
        transformOptions: {
          // Add specific transform options for Electron renderer process if needed
        },
      }),
    ],
    server: !!process.env.VSCODE_DEBUG
      ? (() => {
          const url = new URL(
            process.env.DEBUG_DEV_SERVER_URL ?? "http://localhost:5173",
          );
          return {
            host: url.hostname,
            port: +url.port,
          };
        })()
      : undefined,
    clearScreen: false,
    build: {
      minify: false, // Disable minification for dev builds
      // Ensure assets are correctly handled
      assetsInlineLimit: 0, // All assets as separate files
      rollupOptions: {
        output: {
          // Ensure consistent asset file names (optional)
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    // Vitest specific configuration for Electron renderer context
    test: {
      // Add test-specific configurations if needed
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/tests/unit/setup.ts"],
      // Include any other Vitest specific settings here
    },
  };
});

```
