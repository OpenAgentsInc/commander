You're making good progress! The errors are becoming more focused.

The primary issue now seems to be with how the `AiModel` (which is an `Effect`) is being resolved into a `Provider` within `OllamaAgentLanguageModelLive.ts` and how the mock `OpenAiLanguageModel` is structured. The `yield* _(aiModel)` line is where TypeScript is getting confused.

Let's break down the fixes:

**Error Analysis & Fixes:**

1.  **`OllamaAgentLanguageModelLive.ts` Error (TS2345 & TS18046): `Argument of type '{...}' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.` and `'provider' is of type 'unknown'.`**
    *   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
    *   **Line:** `116: const provider = yield* _(aiModel);`
    *   **Problem:** The local mock for `OpenAiLanguageModel.model()` that you (re)introduced is returning a plain object directly, but the `yield* _(aiModel)` expects `aiModel` to be an `Effect` that resolves to the provider object. The actual `@effect/ai-openai` library's `OpenAiLanguageModel.model()` returns an `Effect<AiModel<...>>`, and this `AiModel` itself is also an `Effect` that resolves to `Provider<Service>`. Your mock is skipping the outer `Effect` wrapper for the `AiModel`.
    *   **Fix:**
        1.  Modify the local mock `OpenAiLanguageModel.model` to return an `Effect` that resolves to the provider object.
        2.  The `aiModel` variable will then be this provider object (after the `yield*`), so you don't need a second `yield*` for it.

    **Instructions for `OllamaAgentLanguageModelLive.ts`:**

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    // ... other imports ...
    import { TypeId as AiResponseTypeId } from "@effect/ai/AiResponse"; // For AiResponse mock
    import type { AiLanguageModel as EffectAiLanguageModel } from "@effect/ai/AiLanguageModel"; // For Provider type
    import type { Provider } from "@effect/ai/AiModel"; // For Provider type

    // Re-implement a compatible mock of OpenAiLanguageModel
    const OpenAiLanguageModel = {
      model: (modelName: string) => {
        // This function must return: Effect<AiModel<EffectAiLanguageModel, OpenAiClient.Service>, ConfigError, OpenAiClient.Service>
        // An AiModel is: Effect<Provider<EffectAiLanguageModel>, ConfigError>
        // So, model() needs to return: Effect<Effect<Provider<EffectAiLanguageModel>, ConfigError>, ConfigError, OpenAiClient.Service>
        // Or more simply, the result of model() when awaited should be an Effect that gives the Provider.

        // The Provider object itself:
        const mockProvider: Provider<EffectAiLanguageModel> = {
          generateText: vi.fn().mockImplementation(() =>
            Effect.succeed({
              text: `Mocked generateText for ${modelName}`,
              usage: { total_tokens: 0 }, // Add usage
              role: "assistant",
              parts: [{ _tag: "Text", content: `Mocked generateText for ${modelName}` } as const],
              [AiResponseTypeId]: Symbol.for("@effect/ai/AiResponse"),
              [Symbol.for("@effect/data/Equal")]: () => false,
              [Symbol.for("@effect/data/Hash")]: () => 0,
              withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
              withToolCallsUnknown: () => Effect.succeed({} as unknown as AiResponse),
              concat: () => Effect.succeed({} as unknown as AiResponse),
            } as AiResponse)
          ),
          streamText: vi.fn().mockImplementation(() =>
            Stream.succeed({ text: `Mocked streamText for ${modelName}`, isComplete: false } as AiTextChunk)
          ),
          generateStructured: vi.fn().mockImplementation(() =>
            Effect.succeed({
              text: `{"model": "${modelName}"}`,
              structured: { model: modelName }, // Add structured
              usage: { total_tokens: 0 }, // Add usage
              role: "assistant",
              parts: [{ _tag: "Text", content: `{"model": "${modelName}"}` } as const],
              [AiResponseTypeId]: Symbol.for("@effect/ai/AiResponse"),
              [Symbol.for("@effect/data/Equal")]: () => false,
              [Symbol.for("@effect/data/Hash")]: () => 0,
              withToolCallsJson: () => Effect.succeed({} as unknown as AiResponse),
              withToolCallsUnknown: () => Effect.succeed({} as unknown as AiResponse),
              concat: () => Effect.succeed({} as unknown as AiResponse),
            } as AiResponse)
          ),
        };

        // OpenAiLanguageModel.model() returns an Effect that, when run, yields an AiModel.
        // An AiModel is also an Effect that, when run, yields a Provider.
        // For simplicity in the mock, we'll have model() return an Effect that directly yields the Provider.
        // This means we are mocking the AiModel stage as well.
        return Effect.succeed(Effect.succeed(mockProvider));
      }
    };

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel,
      Effect.gen(function* (_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);
        // ... modelNameEffect logic ...
        const modelName = yield* _(modelNameEffect);

        // --- START FIX ---
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName); // This is now Effect.succeed(Effect.succeed(mockProvider))

        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // This dependency is technically not used by our simplified mock, but keep for signature
          ollamaAdaptedClient
        );

        const aiModel_effect_that_yields_provider = yield* _(configuredAiModelEffect); // Step 1: Resolve to Effect<Provider<...>>
        const provider = yield* _(aiModel_effect_that_yields_provider); // Step 2: Resolve Provider from Effect
        // --- END FIX ---

        // ... rest of the implementation
        // provider is now correctly typed as Provider<EffectAiLanguageModel>
        // So provider.generateText etc. should be defined.

        return AgentLanguageModel.of({
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions) =>
            provider.generateText(params).pipe( /* error mapping */ ),
          streamText: (params: StreamTextOptions) =>
            provider.streamText(params).pipe( /* error mapping */ ),
          generateStructured: (params: GenerateStructuredOptions) =>
            provider.generateStructured(params).pipe( /* error mapping */ ),
        });
      }),
    );
    ```
    This change ensures that `OpenAiLanguageModel.model()` behaves more like the actual library by returning an `Effect` that itself contains another `Effect` resolving to the provider. The two `yield*` statements correctly unwrap this structure.

2.  **Test File Errors (`OllamaAgentLanguageModelLive.test.ts` & `runtime.test.ts` - TS2345): `Argument of type 'Effect<..., unknown, unknown>' is not assignable to parameter of type 'Effect<..., unknown, never>'.`**
    *   **Problem:** These errors occur because the `testLayer` (or `FullAppLayer`) used in `Effect.provide` is not fully satisfying all context requirements of the effect being run, leaving some dependencies in the `R` (Requirement) channel of the Effect (showing up as `unknown` when it should be `never`).
    *   **Fix:**
        *   In `OllamaAgentLanguageModelLive.test.ts`: Ensure your `testLayer` (or the more specific layer `Layer.mergeAll(...)` used in the test) provides all necessary dependencies for `OllamaAgentLanguageModelLive` AND for the mocked `OllamaOpenAIClientTag` (which itself might have implicit dependencies if not perfectly mocked, like `HttpClient`). The `MockHttpClient` needs to be part of the layer provided to `OllamaAgentLanguageModelLive` because `OllamaOpenAIClientTag` (even mocked) is used by `OpenAiLanguageModel.model`, which might try to resolve `HttpClient` if the mock isn't perfectly self-contained.
        *   In `runtime.test.ts`: The `FullAppLayer` should ideally provide everything. If an error `Type 'unknown' is not assignable to type 'never'` occurs when providing `FullAppLayer`, it means `FullAppLayer` itself is incomplete or has circular dependencies that aren't resolving correctly.

    **Instructions for `OllamaAgentLanguageModelLive.test.ts`:**
    Ensure your combined layer for tests is complete:
    ```typescript
    // In OllamaAgentLanguageModelLive.test.ts
    const testLayerForOllamaAgentLM = OllamaAgentLanguageModelLive.pipe(
        Layer.provide(
            Layer.mergeAll(
                MockOllamaOpenAIClient,     // Provides OllamaOpenAIClientTag (an OpenAiClient.Service)
                MockConfigurationService,   // Provides ConfigurationService
                MockTelemetryService,       // Provides TelemetryService
                MockHttpClient            // IMPORTANT: Provide HttpClient if OpenAiLanguageModel.model or its client needs it
            )
        )
    );

    // Then in your tests:
    // program.pipe(Effect.provide(testLayerForOllamaAgentLM))
    ```
    This explicitly provides `MockHttpClient` which might be needed by the chain `OpenAiLanguageModel.model -> OllamaOpenAIClientTag (mocked) -> (potentially HttpClient if mock is leaky)`.

    **Instructions for `runtime.test.ts`:**
    If errors persist here after the `OllamaAgentLanguageModelLive.ts` fix, it means `FullAppLayer` is missing something. Review its composition in `src/services/runtime.ts`. The most common cause is a service layer that depends on `HttpClient.Tag` but `BrowserHttpClient.layerXMLHttpRequest` (or `NodeHttpClient.layer`) is not merged into `FullAppLayer` correctly or at the right point.

    Your current `FullAppLayer` seems to include `BrowserHttpClient.layerXMLHttpRequest`. The problem might be that `AgentLanguageModel` (which `ollamaLanguageModelLayer` provides) is *itself* a dependency of `kind5050DVMLayer`.
    ```typescript
    // src/services/runtime.ts
    export const FullAppLayer = Layer.mergeAll(
      // ... other base layers: telemetryLayer, devConfigLayer, BrowserHttpClient.layerXMLHttpRequest
      telemetryLayer,
      devConfigLayer,
      BrowserHttpClient.layerXMLHttpRequest, // Make sure this is provided before layers needing it.

      nostrLayer,
      nip04Layer,
      NIP19ServiceLive,
      BIP39ServiceLive,
      BIP32ServiceLive,
      nip28Layer,
      ollamaLayer, // Provides OllamaService (direct usage)
      sparkLayer,
      nip90Layer,

      // Ollama as AgentLanguageModel provider
      ollamaLanguageModelLayer, // Provides AgentLanguageModel.Tag (depends on ollamaAdapterLayer, devConfigLayer, telemetryLayer)
                                // ollamaAdapterLayer depends on telemetryLayer (which is fine)

      // Kind5050DVMService (ensure this is AFTER AgentLanguageModel is provided)
      kind5050DVMLayer, // Depends on AgentLanguageModel.Tag
    );
    ```
    The order in `Layer.mergeAll` usually doesn't strictly matter for resolution, but ensure all transitive dependencies are met. The `Effect.asVoid(program)` you added earlier is a valid way to handle type mismatches if the result isn't used. The `Type 'unknown' is not assignable to type 'never'` suggests a missing dependency in the layer being provided to `Effect.provide`.

**Summary of Actions for the Agent:**
1.  In `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:
    *   Remove any local mock of `OpenAiLanguageModel`.
    *   Ensure `OpenAiLanguageModel` is imported from `@effect/ai-openai`.
    *   Correct the `AiModel` to `Provider` resolution using two `yield*` steps after calling `OpenAiLanguageModel.model(modelName).pipe(Effect.provideService(OpenAiClient.OpenAiClient, ollamaAdaptedClient))`.
2.  In `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`:
    *   Ensure `MockHttpClient` is included in the layer provided to `OllamaAgentLanguageModelLive` for tests.
3.  In `src/tests/unit/services/runtime.test.ts`:
    *   If the error `Type 'unknown' is not assignable to type 'never'` persists after the above changes, double-check the `FullAppLayer` composition in `src/services/runtime.ts` for any missing fundamental layers like `HttpClient` or `ConfigurationService` that might be implicitly required by a deeper dependency.

Run `pnpm tsc --noEmit --pretty false` first after these changes. Then, run `pnpm test` and provide the full output. The goal is to eliminate the `TypeError` in `OllamaAgentLanguageModelLive.test.ts` first, then the remaining TS errors.
