That's an excellent and very pertinent question, especially after the refactoring effort we're going through! It highlights a common architectural decision point.

Here's the rationale behind having custom types that closely wrap library types (like those from `@effect/ai`), the benefits, and when it might be worth simplifying:

**Rationale & Benefits of Custom Wrapper Types:**

1.  **Abstraction and Decoupling (Anti-Corruption Layer):**
    *   **Why:** This is the primary reason. Our custom types (`AgentLanguageModel`, our `AiResponse`, `AiError` hierarchy) define the language and contracts for AI interactions *within our application's domain*. The provider-specific layers (like `OpenAIAgentLanguageModelLive`) then act as **adapters** or an **anti-corruption layer**. They translate between our application's domain types/interfaces and the specifics of the external library (`@effect/ai` and its provider packages).
    *   **Benefit:**
        *   **Reduces Coupling:** The core of our application (UI, other services) depends on our stable, self-defined interfaces, not directly on the potentially volatile or more complex API of `@effect/ai`.
        *   **Easier Library Upgrades/Swaps:** If `@effect/ai` has a significant breaking change (as we've seen), or if we decide to switch to a completely different AI interaction library in the future, the changes are (ideally) localized to these adapter layers. The rest of our application, which uses `AgentLanguageModel.Tag`, remains largely unaffected.
        *   **Clearer Domain Model:** Our types can be tailored to exactly what *Commander* needs, potentially simplifying or augmenting what the library provides.

2.  **Control Over Type Evolution:**
    *   **Why:** External library APIs can change at a pace we don't control.
    *   **Benefit:** By having our own types, we control the evolution of the interfaces our internal services consume. We can choose when and how to expose new library features or adapt to breaking changes.

3.  **Simplified API Surface (Potentially):**
    *   **Why:** Library interfaces can sometimes be very broad or generic (e.g., if `AiLanguageModel.Service` from `@effect/ai` had many methods we don't intend to use).
    *   **Benefit:** Our custom interface (`AgentLanguageModel`) can expose only the subset of functionality relevant to Commander, making it simpler for consuming services within our app to understand and use. (In our current case, our `AgentLanguageModel` and `@effect/ai`'s `AiLanguageModel.Service` are quite similar, so this benefit is less pronounced for method signatures but still applies to the type contracts of request/response objects).

4.  **Adding Application-Specific Logic/Data:**
    *   **Why:** We might want to attach additional information or behavior to AI responses or requests that are specific to Commander's needs but not part of the generic library.
    *   **Benefit:** Our custom `AiResponse` (once it correctly implements/extends the library's `AiResponse`) could have additional convenience methods or properties relevant only to our UI or other internal services, without polluting the library's concern.

5.  **Consistency Across Different Underlying Libraries:**
    *   **Why:** If we were to integrate another AI SDK that *doesn't* use `@effect/ai` (hypothetically), our `AgentLanguageModel` interface would provide a consistent contract for all AI interactions, regardless of the underlying tech for a specific provider. The adapter for that new SDK would map its capabilities to our standard interface.

**Costs & When to Simplify by Removing Wrappers:**

1.  **Boilerplate and Mapping Overhead:**
    *   **Cost:** The most significant cost is the need to write and maintain the adapter code that maps between our custom types and the library's types. This is what we were doing in the `generateText` and `streamText` methods of our provider implementations (e.g., taking our `GenerateTextOptions`, mapping them to `@effect/ai`'s options, calling the library, then taking `@effect/ai`'s `AiResponse` and mapping it back to our `AiResponse`).
    *   **The Pain Point We Experienced:** When our custom types (especially `AiResponse` and `AiTextChunk`) diverged too much or didn't correctly implement the *contract* expected by the new `@effect/ai` version (e.g., missing `TypeId`, `parts`, `finishReason`), it caused a cascade of type errors. This means the wrapper wasn't a perfect abstraction or wasn't maintained in sync.

2.  **Increased Initial Complexity:**
    *   **Cost:** Developers need to understand both the application's internal AI types and the external library's types, plus the mapping layer.

3.  **Risk of Stale Wrappers:**
    *   **Cost:** If the external library evolves with useful new features, our custom wrappers need to be updated to expose them, otherwise, our application can't benefit. This requires ongoing maintenance.

**When to Simplify (Remove Custom Wrappers and Use Library Types Directly):**

*   **Very Stable Library API:** If `@effect/ai`'s API (like `AiLanguageModel.Service`, `AiResponse`) is extremely stable and unlikely to have frequent breaking changes.
*   **Perfect Fit:** If the library's types and interfaces are a perfect or near-perfect fit for our application's domain needs, with little to no need for simplification or augmentation.
*   **High Team Familiarity with the Library:** If the entire team is deeply familiar with `@effect/ai` and comfortable using its types directly throughout the application.
*   **Small Application or Tightly-Coupled Module:** In very small projects or within a module that is already tightly coupled to the library, the overhead of an extra abstraction layer might not be justified.
*   **Performance-Critical Path with Zero Overhead Desired:** Though usually negligible, if the mapping layer introduced any performance overhead in an extremely hot path.

**Applying this to Commander's Current Situation:**

*   **`AgentLanguageModel` Interface:** Keeping this as our application's primary AI interaction contract is still valuable for the abstraction benefits. The goal should be for its method signatures (parameters, success types, error types) to be *compatible* with what can be reasonably provided by an `@effect/ai` `AiLanguageModel.Service` adapter.
*   **`AiError` Hierarchy:** Our custom error hierarchy (`AiError`, `AiProviderError`, etc.) built with `Data.TaggedError` is good. It provides domain-specific, typed errors that are idiomatic in Effect-TS and allow for precise error handling. The adapter layers are responsible for mapping library errors to these.
*   **`AiResponse` and `AiTextChunk` (The Core of Recent Issues):**
    *   Our custom `AiResponse` *needed* to be what `@effect/ai`'s methods returned (especially for streaming chunks, where each chunk *is* an `AiResponse` from the library's perspective).
    *   The fix to make our `AiResponse` **extend** `@effect/ai/AiResponse.AiResponse` was the correct compromise. This ensures our type *is* an `@effect/ai` `AiResponse` (satisfying the library's contract) while still allowing us to:
        1.  Have a named type (`AiResponse`) within our domain.
        2.  Potentially add Commander-specific convenience methods or properties to it in the future, if needed (though we removed the direct `text`, `toolCalls`, `metadata` getters as the base class provides them).
    *   Removing our custom `AiTextChunk` and using `AiResponse` directly for stream elements was a simplification that aligned us better with `@effect/ai`'s streaming model.

**Recommendation for "Commander":**

1.  **Keep `AgentLanguageModel` as the primary internal interface.** Ensure its method signatures are designed to be implementable by an adapter around `@effect/ai`'s `AiLanguageModel.Service`.
2.  **Keep our `AiResponse` extending `@effect/ai/AiResponse.AiResponse`.** This gives us the best of both worlds: compatibility and a domain-specific named type. If, over time, we find we *never* add any custom extensions to it, we *could* consider directly using `@effect/ai/AiResponse.AiResponse` and type-aliasing it within our domain (e.g., `export type MyAppAiResponse = EffectAiResponse.AiResponse;`). But for now, extending is fine and common.
3.  **Continue to simplify by removing custom types where they offer little value over the library's types and cause friction.** The removal of `AiTextChunk` was a good example.
4.  **The adapter layers (`OpenAIAgentLanguageModelLive`, etc.) are where the "wrapping" happens.** They depend on `@effect/ai` and our `AgentLanguageModel.Tag`. They take our domain-specific request options, translate them if necessary for the `@effect/ai` provider, call the provider, and then translate the `@effect/ai` response (e.g., `EffectAiResponse.AiResponse`) back into our application's `AiResponse` type (which, because it extends, might just be `new AiResponse(libraryResponse.props)`).

The main benefit isn't just *wrapping* but creating a well-defined **seam** or **boundary** between our application's core logic and the external AI library. This seam makes the system more resilient to changes in the external library. The key is to ensure the seam is well-maintained and doesn't cause more friction than it solves, which was the issue with our `AiResponse` not being fully compatible initially.

```

```
Okay, Agent, the refactor is nearly complete. With only 54 errors remaining, we're very close. The primary issues seem to be concentrated in the test files and a few lingering type mismatches in provider implementations due to the `@effect/ai` upgrade.

**I. Finalize Provider Implementations (`OpenAIAgentLanguageModelLive.ts` and NIP-90)**

1.  **File: `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`**
    *   **Action 1.1 (Fix options for `languageModel.generateText` and `streamText`):**
        *   The error `TS2339: Property 'max_tokens' does not exist on type '{ readonly prompt: string | Prompt; readonly modelId?: string | undefined; ... }'` in `OpenAIAgentLanguageModelLive.ts` indicates that the options object being passed to the `@effect/ai-openai` library's `generateText` or `streamText` methods is incorrect.
        *   **Consult `@effect/ai/AiLanguageModel.d.ts` for the correct `GenerateTextOptions` and `StreamTextOptions` structures.** The library expects options like `temperature`, `maxTokens`, `stopSequences` etc., directly on the options object.
        *   Ensure your internal `GenerateTextOptions` (from `src/services/ai/core/AgentLanguageModel.ts`) correctly maps to these.
        *   **Example Correction:**
            ```typescript
            // Inside OpenAIAgentLanguageModelLive's generateText method after getting languageModel service
            const libResponse = yield* _(languageModel.generateText({
              prompt: options.prompt, // This is likely a string or { messages: ... }
              // model: options.model, // model is typically part of AiModel creation, not per-call. Remove if not needed.
              temperature: options.temperature, // Pass directly if defined in @effect/ai options
              maxTokens: options.maxTokens,     // Pass directly
              stopSequences: options.stopSequences, // Pass directly
              // Check @effect/ai's GenerateTextOptions for any other relevant fields
            }));
            ```
        *   Apply the same fix to the `streamText` method's options.

2.  **File: `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`**
    *   **Action 2.1 (Return type of `generateText`):**
        *   The error `Type 'Effect<AiResponse, AiProviderError, NIP04Service | ...>' is not assignable to type 'Effect<AiResponse, AiProviderError, never>'.` means the `generateText` method still has unresolved dependencies (`NIP04Service`, `NostrService`, etc.).
        *   **The `NIP90AgentLanguageModelLive` is an `Effect.gen` block that *builds* the service implementation. All its dependencies (like `nip90Service`, `nostrService`, `nip04Service`) should be resolved from the context *within this outer `Effect.gen` block*.**
        *   The methods defined *inside* the returned service object (like `generateText`) should then use these already-resolved services from their closure scope. Their own `R` channel should be `never`.
        *   **Refactor:**
            ```typescript
            // src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
            const nip90AgentLanguageModelEffect = Effect.gen(function* (_) {
              // Yield all dependencies ONCE here
              const nip90Service = yield* _(NIP90Service);
              const nostrService = yield* _(NostrService); // Assuming this tag exists
              const nip04Service = yield* _(NIP04Service);
              const telemetry = yield* _(TelemetryService);
              const dvmConfig = yield* _(NIP90ProviderConfigTag);
              // ... other setup like nostrToolsImport ...

              return makeAgentLanguageModel({
                generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError /*, never - implicitly */> => {
                  // NOW use the services from the closure scope, DO NOT yield them again here.
                  // This returned Effect should not require NIP90Service etc., in its R channel.
                  return Effect.gen(function* (_) { // Inner Effect.gen for this method's logic
                    // ... existing logic for generateText ...
                    // Example:
                    // const jobRequest = yield* _(
                    //   nip90Service.createJobRequest({ ... }).pipe(
                    //     Effect.provideService(NIP04Service, nip04Service) // If createJobRequest itself needs it
                    //   )
                    // );
                    // IMPORTANT: If nip90Service.createJobRequest itself is an Effect needing NIP04Service,
                    // provide it locally:
                    const jobRequest = yield* _(
                      Effect.provideService(
                        nip90Service.createJobRequest({ /* ... */ }),
                        NIP04Service, // The Tag
                        nip04Service    // The instance from the outer scope
                      )
                    );
                    // ... rest of logic ...
                  }).pipe(Effect.mapError(err => new AiProviderError({ /* ... */ provider: "NIP90", cause: err })));
                },
                streamText: (params: StreamTextOptions): Stream.Stream<AiResponse, AiProviderError /*, never */> => {
                  // Similar refactor for streamText, ensure its R is never.
                  // Use services from outer scope, provide them locally to helpers if needed.
                  return Stream.asyncScoped<AiResponse, AiProviderError>((emit) => {
                    // ... existing streamText logic ...
                    // Calls to nip90Service should be piped with local provisions if they need context
                    // e.g., nip90Service.createJobRequest(...).pipe(Effect.provideService(NIP04Service, nip04Service))
                  }).pipe(Stream.mapError(err => new AiProviderError({ /* ... */ provider: "NIP90", cause: err })));
                },
                // ... generateStructured stub ...
              });
            });

            export const NIP90AgentLanguageModelLive = Layer.effect(
              AgentLanguageModel.Tag,
              nip90AgentLanguageModelEffect // This is the Effect that builds the service
            );
            ```
        *   The key is that the methods of the service returned by `makeAgentLanguageModel` must be self-contained once the `NIP90AgentLanguageModelLive` layer is built.

---

**II. Test File Fixes (High Priority due to Volume)**

1.  **File: `src/tests/unit/services/ai/core/AgentLanguageModel.test.ts`**
    *   **Action 3.1 (`TS2345` Argument type errors):**
        *   **Lines 71, 87, 109, 141, 165:** When using `Layer.succeed` for `AgentLanguageModel.Tag`, the second argument should be the `mockServiceInstance`, not `AgentLanguageModel` (the namespace object).
            ```typescript
            // Example for line 71
            const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
            ```
        *   **Lines 73, 90, 112, 146, 171:** When using `Effect.flatMap` or `Effect.gen` to get the service instance, use the Tag:
            ```typescript
            // Example for line 73
            const program = Effect.flatMap(AgentLanguageModel.Tag, (serviceInstance) => serviceInstance.generateText(params));
            // Or in Effect.gen:
            // const serviceInstance = yield* _(AgentLanguageModel.Tag);
            ```
    *   **Action 3.2 (`TS18046 service unknown`):** This should be fixed by Action 3.1. The `serviceInstance` in the callback of `Effect.flatMap` or from `yield* _(AgentLanguageModel.Tag)` will be correctly typed.

2.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action 4.1 (`TS2353` Object literal properties for `context` - Lines 35, 205, etc.):**
        *   If `AiError` (and its subclasses like `AiContentPolicyError`) are intended to have an optional `context: Record<string, any>` property (as `AIGenericError` in Phase 1 plan did), **ensure this property is added to the `props` generic type of these error classes in `AiError.ts`**.
            ```typescript
            // In AiError.ts
            export class AiError extends Data.TaggedError("AiError")<{
              readonly message: string;
              readonly cause?: unknown;
              readonly context?: Record<string, any>; // Add this
            }> {}

            export class AiContentPolicyError extends Data.TaggedError("AiContentPolicyError")<{
              // ... other props ...
              readonly context?: Record<string, any>; // Add this
            }> {}
            ```
        *   If `context` is not intended for these specific error types, then remove the `context` property from the constructor calls in the tests.
    *   **Action 4.2 (`TS2339 error.context` on line 216 for `AiContentPolicyError`):** This will be fixed by Action 4.1 if `context` is added. If not, the test assertion is wrong.

3.  **File: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`**
    *   **Action 5.1 (`TS2345 Client` mismatch on line 161):** The mock for `OllamaOpenAIClientTag` (which is `mockOpenAiClient`) must be a **complete implementation of `OpenAiClient.Service`** from `@effect/ai-openai`. This means it needs a `client` property which is an object that implements *all* methods from `Generated.Client` (from `@effect/ai-openai/Generated`), and also the top-level `stream` and `streamRequest` methods. Use `vi.fn()` for all of them.
        *   Refer to `node_modules/@effect/ai-openai/dist/dts/OpenAiClient.d.ts` and `Generated.d.ts` for the full interface.
    *   **Action 5.2 (`TS2345 R = never` mismatch line 213, 216):**
        *   The test setup needs to correctly provide layers. `Effect.provide(TestOllamaClientLayer)` should provide the mocked client to the `OllamaAgentLanguageModelLive` layer.
            ```typescript
            // Inside the test
            const TestLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(
              Layer.provide(
                Layer.mergeAll(
                  MockOllamaOpenAIClientLayer, // Layer.succeed(OllamaOpenAIClientTag, mockOpenAiClientImpl)
                  MockConfigurationServiceLayer,
                  MockTelemetryServiceLayer
                )
              )
            );
            // ...
            const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
            ```
        *   `Layer.provide(OllamaAgentLanguageModelLive.pipe(Layer.provide(Layer.mergeAll(...))))` in line 216 is incorrect for `Effect.provide`.

4.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 6.1 (`TS2345 "make"` line 44):** Change `vi.spyOn(OpenAiLanguageModel, "make")` to `vi.spyOn(OpenAiLanguageModel, "model")`.
    *   **Action 6.2 (`TS2322 Effect<...> not Config | ProviderMetadata` line 45):** The mock for `OpenAiLanguageModel.model()` should return `Effect.succeed(mockAiModelInstanceEffect)` where `mockAiModelInstanceEffect` resolves to a mock `Provider` instance.
        ```typescript
        // mockOpenAiModelProvider is a mock of Provider<EffectAiLanguageModel.AiLanguageModel | EffectTokenizer.Tokenizer>
        const mockActualProvider = { /* mock generateText, streamText methods here */ };
        const mockAiModelEffectYieldingProvider = Effect.succeed(mockActualProvider); // This AiModel IS the Effect
        vi.spyOn(OpenAiLanguageModel, "model").mockReturnValue(mockAiModelEffectYieldingProvider);
        ```
    *   **Action 6.3 (Mocks Incomplete lines 51, 56, 61):** Ensure mocks for `OpenAiClient.OpenAiClient`, `ConfigurationService`, `TelemetryService` implement all their interface methods.
    *   **Action 6.4 (`TS2339 total_tokens` line 89):** Correct to `totalTokens` in mock data and `AiResponse` type.
    *   **Action 6.5 (`TS2322 Error vs never` lines 95, 159):** Mocked methods should fail with `new AiProviderError(...)`.

5.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action 7.1 (`TS2345 Tag/Effect` line 123):**
        *   The test program should be `const program = Effect.service(AgentLanguageModel.Tag);` or `Effect.flatMap(AgentLanguageModel.Tag, service => ...)`.
        *   The error `Type '{ Tag: Tag<AgentLanguageModel, AgentLanguageModel>; }' is not assignable...` suggests that somewhere in the `FullAppLayer` composition, `AgentLanguageModel` (the namespace/object containing the Tag) is being used where a `Layer` providing `AgentLanguageModel.Tag` is expected.
        *   **Review `src/services/runtime.ts`:** Specifically how `ollamaLanguageModelLayer` or `openAIAgentLanguageModelLayer` are merged. They should be providing `AgentLanguageModel.Tag`.
            ```typescript
            // In runtime.ts, if ollamaLanguageModelLayer provides AgentLanguageModel.Tag:
            // export const FullAppLayer = Layer.mergeAll(
            //   // ... other base layers ...
            //   ollamaLanguageModelLayer, // This layer already results in Layer<AgentLanguageModel, E, R_deps>
            //   // ...
            // );
            // Then, ensure R_deps are provided to FullAppLayer.
            ```

---

By systematically applying these fixes, especially the core type alignments (I) and the provider `Provider.use()` patterns (II & previous instructions), many errors should fall away. The test errors often highlight underlying type mismatches in the main code.Okay, Agent, the error count is now at a much more manageable 54. We're primarily dealing with test file issues and ensuring our core `AiResponse` and provider implementations are correctly aligned with the new `@effect/ai` patterns.

Let's proceed with the following focused instructions:

**I. Finalize Provider Implementations (`OpenAIAgentLanguageModelLive.ts` and `NIP90AgentLanguageModelLive.ts`)**

1.  **File: `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`**
    *   **Action 1.1 (Fix options for `languageModel.generateText` and `streamText`):**
        *   The error `TS2339: Property 'max_tokens' does not exist on type '{ readonly prompt: string | Prompt; ... }'` indicates a mismatch.
        *   **Correction:** The `@effect/ai` `generateText` and `streamText` methods (from `AiLanguageModel.Service`) accept options like `temperature`, `maxTokens`, `stopSequences` directly in their options object. Your internal `GenerateTextOptions` from `core/AgentLanguageModel.ts` should map to these.
        *   Modify the calls within `OpenAIAgentLanguageModelLive.ts`'s `generateText` and `streamText` methods:
            ```typescript
            // Inside OpenAIAgentLanguageModelLive's generateText method, after getting languageModel service:
            const libResponse = yield* _(languageModel.generateText({
              prompt: options.prompt, // This is likely your core.GenerateTextOptions.prompt
              temperature: options.temperature, // Pass through if defined in your core.GenerateTextOptions
              maxTokens: options.maxTokens,     // Pass through
              stopSequences: options.stopSequences, // Pass through
              // model: options.model, // Model is usually part of AiModel creation, not per-call. Remove if not needed here.
                                        // If @effect/ai takes modelId here, ensure options.model is string.
            }));

            // Similar changes for streamText, passing options.signal if it exists
            // return languageModel.streamText({
            //   prompt: options.prompt,
            //   temperature: options.temperature,
            //   maxTokens: options.maxTokens,
            //   stopSequences: options.stopSequences, // If supported by @effect/ai streamText
            //   signal: options.signal
            // });
            ```
        *   Verify the exact option names and types from `@effect/ai/AiLanguageModel.d.ts`'s `GenerateTextOptions` and `StreamTextOptions`.

2.  **File: `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`**
    *   **Action 2.1 (Fix `R = never` issue in `generateText` and `streamText`):**
        *   The core issue: `nip90Service.createJobRequest(...)` and `nip90Service.getJobResult(...)` are `Effect`s that themselves require dependencies (like `NostrService`, `NIP04Service`). When you use them inside the `generateText` method of your DVM, those dependencies "leak" into `generateText`'s `R` channel.
        *   **Solution:** Provide the dependencies locally to these `nip90Service` calls *within* the `generateText` (and `streamText`) methods, using the service instances already resolved in the outer `nip90AgentLanguageModelEffect` scope.
        *   **Refactor `generateText`:**
            ```typescript
            // Inside NIP90AgentLanguageModelLive.ts -> nip90AgentLanguageModelEffect -> generateText
            // ...
            // const nip04Service = yield* _(NIP04Service); // from outer scope
            // ...
            const jobRequest = yield* _(
              nip90Service.createJobRequest({ /* ... */ }).pipe(
                Effect.provideService(NIP04Service, nip04Service) // Provide NIP04Service locally
                // If createJobRequest also needs NostrService or TelemetryService, provide them here too
                // Effect.provide(Layer.succeed(NostrService, nostrServiceFromOuterScope)) // for example
              )
            );

            const result = yield* _(
              nip90Service.getJobResult(
                jobRequest.id,
                dvmConfig.dvmPubkey,
                requestSkBytes as Uint8Array<ArrayBuffer>
              ).pipe(
                // Provide dependencies for getJobResult if it needs them
                Effect.provideService(NIP04Service, nip04Service) // Example
              )
            );
            // ...
            ```
        *   Apply a similar local dependency provision pattern to `streamText` for calls like `nip90Service.createJobRequest` and `nip90Service.subscribeToJobUpdates`. The goal is that the `Effect` or `Stream` returned by `generateText`/`streamText` methods has `R = never`.

    *   **Action 2.2 (Fix `AiResponse` return type in `streamText`):**
        *   The error `Stream.Stream<AiTextChunk, AiProviderError, never>' is not assignable to type 'Stream<AiResponse, AiProviderError, never>'` (line 200) indicates that the `streamText` method is still typed or implemented to return `AiTextChunk`.
        *   **Change:** The `streamText` method in `NIP90AgentLanguageModelLive.ts` (and its definition in `makeAgentLanguageModel`) must now emit `AiResponse` objects.
            ```typescript
            // Inside streamText -> Stream.asyncScoped -> onUpdate callback
            // emit.single(new AiTextChunk({ text: eventUpdate.content }));
            // Change to (assuming createAiResponse maps to your fixed core AiResponse):
            emit.single(createAiResponse(eventUpdate.content || ""));
            ```
        *   Ensure the `createAiResponse` helper in this file constructs your application's core `AiResponse` (which should extend `@effect/ai`'s).

---

**II. Test File Fixes**

1.  **File: `src/tests/helpers/effect-test-utils.ts`**
    *   **Action 3.1 (`TS2345 Effect<A, any, any>` vs `Effect<A, any, never>`):**
        *   Update `runTest` signature for clarity and correctness (ensure `RIn` of layer is `never`):
            ```typescript
            export const runTest = <A, E, ROut, E2>(
              effect: Effect.Effect<A, E, ROut>,
              layer: Layer.Layer<ROut, E2, never>
            ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));
            ```
    *   **Action 3.2 (`TS2551 Effect.service` vs `Effect.Service`):** Correct to `Effect.service(tag)`.

2.  **File: `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`**
    *   **Action 4.1 (`AiProviderError.of`):** Change to `new AiProviderError({ ...props })`.
    *   **Action 4.2 (`error.provider`):** Ensure `AiProviderError` definition and instantiation are consistent. If `provider` is a direct prop, use `error.provider`.

3.  **File: `src/tests/unit/services/ai/core/AgentLanguageModel.test.ts`**
    *   **Action 5.1 (`TS2459 AiTextChunk` not exported):**
        *   If `AiTextChunk` was removed (recommended), update this test to use `AiResponse` for stream chunks.
        *   If `AiTextChunk` was kept and intended to be used, ensure it's exported from `core/index.ts`.
    *   **Action 5.2 (`TS2305 AiGenericError` not exported):** Export `AiGenericError` from `core/index.ts` if it's a base class used in tests.
    *   **Action 5.3 (`TS2339 _tag` on `MockAiError`):** `MockAiError` should extend `Data.TaggedError("MockAiErrorTag")<{...props}> {}`. Access `errorInstance._tag`. Do not set `this._tag` manually.
    *   **Action 5.4 (`TS2345` Tag/Effect argument issues):**
        *   Correct usages: `Layer.succeed(AgentLanguageModel.Tag, mockServiceInstance)` and `Effect.service(AgentLanguageModel.Tag)` or `Effect.flatMap(AgentLanguageModel.Tag, service => ...)`.

4.  **File: `src/tests/unit/services/ai/core/AIError.test.ts`**
    *   **Action 6.1 (`TS2353` Object literal properties for `context`):**
        *   For each error type (`AiError`, `AiProviderError`, `AiContentPolicyError`, etc.), if tests are passing a `context` property in the constructor, ensure that the error class definition in `AiError.ts` includes `readonly context?: Record<string, any>;` in its `props` interface.
    *   **Action 6.2 (`TS2345` mapToAiProviderError args):** Pass a string model name: `mapToAiProviderError(err, "Ollama", "test-model", true)`.

5.  **File: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`**
    *   **Action 7.1 (`TS2345 Client` mismatch line 161):** The mock for `OllamaOpenAIClientTag` (`mockOpenAiClient`) must be a **complete implementation of `@effect/ai-openai`'s `OpenAiClient.Service` interface**, including `client: Generated.Client` and all its methods (stubbed with `vi.fn()`), plus top-level `stream` and `streamRequest`.
    *   **Action 7.2 (`TS2345 R = never` mismatch line 213):** Ensure the `TestLayer` correctly provides all dependencies using `Layer.provide(DependenciesLayer)` to the SUT layer.
        ```typescript
        const DependenciesLayer = Layer.mergeAll(MockOllamaOpenAIClientLayer, MockConfigurationServiceLayer, MockTelemetryServiceLayer);
        const TestSUTLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(Layer.provide(DependenciesLayer));
        // ...
        await Effect.runPromise(program.pipe(Effect.provide(TestSUTLayer)));
        ```

6.  **File: `src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts`**
    *   **Action 8.1 (`TS2345 "make"` line 44):** Change `vi.spyOn(OpenAiLanguageModel, "make")` to `vi.spyOn(OpenAiLanguageModel, "model")`.
    *   **Action 8.2 (`TS2322 Effect<...> not Config | ProviderMetadata` line 45):** The mock for `OpenAiLanguageModel.model()` should be `Effect.succeed(mockProviderInstanceEffect)`, where `mockProviderInstanceEffect` is an `Effect` that resolves to a mock `Provider` instance (which itself has `use` method).
        ```typescript
        // mockOpenAiModelProvider is a mock of Provider<EffectAiLanguageModel.AiLanguageModel | EffectTokenizer.Tokenizer>
        // It should have a .use method.
        const mockProviderInstance = { use: vi.fn(effect => effect) }; // Simplified mock
        const mockAiModelEffectYieldingProvider = Effect.succeed(mockProviderInstance);
        vi.spyOn(OpenAiLanguageModel, "model").mockReturnValue(mockAiModelEffectYieldingProvider);
        ```
    *   **Action 8.3 (Mocks Incomplete lines 51, 56, 61):** Mocks for `OpenAiClient.OpenAiClient`, `ConfigurationService`, `TelemetryService` must implement all their interface methods.
    *   **Action 8.4 (`TS2339 total_tokens` line 89):** Ensure `AiResponse` and mock data use `totalTokens`.
    *   **Action 8.5 (`TS2322 Error vs never` lines 95, 159):** Mocked methods should fail with `new AiProviderError(...)`.
    *   **Action 8.6 (`TS2345 AiResponse` vs `AiTextChunk` line 138):** Use `AiResponse` for stream chunks.

7.  **File: `src/tests/unit/services/runtime.test.ts`**
    *   **Action 9.1 (`TS2345 Tag/Effect` line 123):** The test program should be `const program = Effect.service(AgentLanguageModel.Tag);`. Ensure `FullAppLayer` correctly provides `AgentLanguageModel.Tag`.

---

This is a focused set of instructions. After this, the error count should be very low, and we can address any stragglers. The key is consistent application of the new `@effect/ai` patterns.
