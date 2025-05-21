Okay, Agent, here are the specific instructions for implementing **Phase 5 (Anthropic Provider Implementation)**. This phase extends our AI backend to support Anthropic models, following the patterns established for OpenAI-compatible providers.

**Preamble for the Coding Agent:**

*   **Effect-TS Best Practices:** Continue strict adherence.
*   **Directory Structure:** New files related to the Anthropic provider will go into `src/services/ai/providers/anthropic/`.
*   **Prerequisites:** Phases 0, 1, 2, and 3 (or at least the core `AgentLanguageModel.Tag` and `ConfigurationService` parts) must be completed.
*   **HttpClient:** An `HttpClient.Tag` (from `@effect/platform`) must be available in the application's runtime context (`FullAppLayer`). This will likely be `@effect/platform-node/NodeHttpClient` if Anthropic API calls are made from the main process or proxied through it.

---

## Phase 5: Anthropic Provider Implementation

**Objective:** Integrate Anthropic as a supported LLM provider, using the `@effect/ai-anthropic` package and aligning with the `AgentLanguageModel` abstraction.

**Task 5.1: Create Directory and Index Files**

1.  **Action:** Create the directory `src/services/ai/providers/anthropic/` (if it doesn't exist).
2.  **Action:** Create `src/services/ai/providers/anthropic/index.ts`:
    ```typescript
    // src/services/ai/providers/anthropic/index.ts
    export * from "./AnthropicClientLive";
    export * from "./AnthropicAgentLanguageModelLive";
    ```
3.  **Action:** Update `src/services/ai/providers/index.ts`:
    ```typescript
    // src/services/ai/providers/index.ts
    export * as OpenAIProvider from "./openai";
    export * as AnthropicProvider from "./anthropic"; // Add/Update this line
    export * as OllamaProvider from "./ollama";
    ```

**Task 5.2: Implement `AnthropicClientLive` Layer**

1.  **Action:** Create the file `src/services/ai/providers/anthropic/AnthropicClientLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/anthropic/AnthropicClientLive.ts
    import { Layer, Effect, Config, Option } from "effect";
    import { AnthropicClient } from "@effect/ai-anthropic"; // Service Tag from @effect/ai-anthropic
    import { ConfigurationService, ConfigError } from "@/services/configuration"; // Adjust path
    import { HttpClient } from "@effect/platform";
    import { AIConfigurationError } from "@/services/ai/core/AIError";

    export const AnthropicClientLive = Layer.effect(
      AnthropicClient.AnthropicClient, // The service tag this layer provides
      Effect.gen(function*(_) {
        const configService = yield* _(ConfigurationService);
        const httpClient = yield* _(HttpClient.Tag);

        // Fetch API Key (secret)
        const apiKeyEffect = configService.getSecret("ANTHROPIC_API_KEY").pipe(
          Effect.catchTag("ConfigError", (e) => Effect.fail(new AIConfigurationError({
            message: "Anthropic API Key not found or configuration error.",
            cause: e,
            context: { keyName: "ANTHROPIC_API_KEY" }
          }))),
          Effect.filterOrFail(
            (key) => key.trim() !== "",
            () => new AIConfigurationError({ message: "Anthropic API Key cannot be empty."})
          )
        );
        const apiKey = yield* _(apiKeyEffect);

        // Fetch Base URL (optional, AnthropicClient might have a default)
        const baseUrlEffect = configService.get("ANTHROPIC_BASE_URL").pipe(
          Effect.map(Option.some),
          Effect.catchTag("ConfigError", (e) => {
            if (e.message.includes("not found")) return Effect.succeed(Option.none<string>());
            return Effect.fail(new AIConfigurationError({
                message: "Error fetching Anthropic Base URL configuration.",
                cause: e,
                context: { keyName: "ANTHROPIC_BASE_URL" }
            }));
          })
        );
        const baseUrlOption = yield* _(baseUrlEffect);

        const clientConfig = {
          apiKey: Config.succeed(apiKey),
          // AnthropicClient.layerConfig might not support baseUrl directly,
          // or it might be part of a more general options object.
          // Refer to @effect/ai-anthropic docs for exact config structure.
          // If baseUrl is needed, it might be set via customizing the HttpClient.
          // For now, assume layerConfig primarily needs apiKey.
        };

        // If ANTHROPIC_BASE_URL is set, we might need to customize the HttpClient provided to AnthropicClient.layer
        // For now, we'll proceed assuming the default AnthropicClient.layerConfig handles it or uses default endpoints.
        // If customization is needed:
        // const anthropicHttpClient = httpClient.pipe(
        //   HttpClient.mapRequest(req =>
        //     Option.match(baseUrlOption, {
        //       onNone: () => req,
        //       onSome: baseUrl => HttpClientRequest.prependUrl(req, baseUrl) // This is conceptual for base URL
        //     })
        //   )
        // );
        // const clientLayerProvidingHttp = Layer.provide(AnthropicClient.layerConfig(clientConfig), Layer.succeed(HttpClient.Tag, anthropicHttpClient));

        const clientLayerProvidingHttp = Layer.provide(
            AnthropicClient.layerConfig(clientConfig), // Pass relevant config
            Layer.succeed(HttpClient.Tag, httpClient)
        );

        const anthropicClientService = yield* _(
            Layer.build(clientLayerProvidingHttp).pipe(
                Effect.map(context => Context.get(context, AnthropicClient.AnthropicClient)),
                Effect.scoped
            )
        );

        return anthropicClientService;
      })
    );
    ```
    *   **Note:** The exact configuration options for `AnthropicClient.layerConfig` (from `@effect/ai-anthropic`) need to be verified from its documentation. It typically requires `apiKey`. If `baseUrl` or other options are needed, they should be passed in the `clientConfig` object as per the package's API. If `@effect/ai-anthropic`'s `AnthropicClient.layerConfig` doesn't take `baseUrl`, but you need to override it, you'd typically customize the `HttpClient` instance provided to it (e.g., by using `HttpClient.mapRequest` to prepend the base URL if one is configured).

**Task 5.3: Implement `AnthropicAgentLanguageModelLive` Layer**

1.  **Action:** Create the file `src/services/ai/providers/anthropic/AnthropicAgentLanguageModelLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/anthropic/AnthropicAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import { AgentLanguageModel, GenerateTextOptions, StreamTextOptions, GenerateStructuredOptions, AiResponse, AiTextChunk, AiError } from "@/services/ai/core";
    import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";

    export const AnthropicAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel.Tag,
      Effect.gen(function*(_) {
        const anthropicClient = yield* _(AnthropicClient.AnthropicClient); // Depends on AnthropicClientLive
        const configService = yield* _(ConfigurationService);

        const modelNameEffect = configService.get("ANTHROPIC_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "claude-3-opus-20240229"), // Default Anthropic model
          Effect.catchTag("ConfigError", (e) => Effect.fail(new AIConfigurationError({
            message: "Error fetching Anthropic Model Name configuration.",
            cause: e,
            context: { keyName: "ANTHROPIC_MODEL_NAME" }
          })))
        );
        const modelName = yield* _(modelNameEffect);

        const aiModelEffectDefinition = AnthropicLanguageModel.model(modelName);

        const aiModelInstance = yield* _(Effect.provideService(
          aiModelEffectDefinition,
          AnthropicClient.AnthropicClient,
          anthropicClient
        ));

        const provider = yield* _(aiModelInstance); // Build AiModel into Provider

        return AgentLanguageModel.Tag.of({
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateText(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Anthropic generateText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Anthropic",
                context: { model: modelName, params }
              }))
            ),
          streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AiError> =>
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `Anthropic streamText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Anthropic",
                context: { model: modelName, params }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Anthropic generateStructured error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "Anthropic",
                context: { model: modelName, params }
              }))
            ),
        });
      })
    );
    ```

**Task 5.4: Update `ConfigurationService` (Conceptual)**

1.  **Action:** Review `src/services/configuration/ConfigurationService.ts`.
2.  **Details:**
    *   Ensure the service can manage:
        *   `ANTHROPIC_API_KEY` (as a secret).
        *   `ANTHROPIC_BASE_URL` (optional, non-secret, if needed for overrides).
        *   `ANTHROPIC_MODEL_NAME` (non-secret, e.g., "claude-3-opus-20240229", "claude-3-sonnet-20240229").
        *   `ANTHROPIC_ENABLED` (boolean).

**Task 5.5: UI Selection for Anthropic**

1.  **Action:** Modify `src/components/ai/AgentChatPane.tsx`.
2.  **Details:**
    *   Add "Anthropic" to the AI Provider selection UI (e.g., a dropdown).
    *   When "Anthropic" is selected, the `useAgentChat` hook (or the `AgentChatPane` component) should trigger the use of the `AnthropicAgentLanguageModelLive` implementation for `AgentLanguageModel.Tag`.
    *   This might involve:
        *   The `AgentChatPane` (or its parent managing provider selection) passing the selected provider key (e.g., `"anthropic"`) to `useAgentChat`.
        *   `useAgentChat` then using a factory service or conditional logic to get the appropriate `AgentLanguageModel` instance. (This becomes more relevant in Phase 6 with `ChatOrchestratorService`).
        *   For now, you might have to make `FullAppLayer` conditionally provide `AnthropicAgentLanguageModelLive` as `AgentLanguageModel.Tag` if Anthropic is globally selected. A more dynamic per-pane or per-request provider selection is a more advanced step.

**Task 5.6: Runtime Integration Update**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**
    *   Import the new Anthropic provider layers:
        ```typescript
        import { AnthropicClientLive, AnthropicAgentLanguageModelLive } from "@/services/ai/providers/anthropic";
        ```
    *   Compose these layers into `FullAppLayer`.
        ```typescript
        // src/services/runtime.ts
        // ...
        const anthropicClientLayer = AnthropicClientLive.pipe(
          Layer.provide(ConfigurationServiceLive), // Provide ConfigurationService
          Layer.provide(BrowserHttpClient.layerXMLHttpRequest) // Provide HttpClient for AnthropicClient
        );

        const anthropicAgentLanguageModelLayer = AnthropicAgentLanguageModelLive.pipe(
          Layer.provide(anthropicClientLayer), // Provide the configured AnthropicClient
          Layer.provide(ConfigurationServiceLive) // Also needs ConfigurationService for model name
        );

        // How you merge this into FullAppLayer depends on your provider selection strategy.
        // If OpenAI is the default and Anthropic is an alternative:
        export const FullAppLayer = Layer.mergeAll(
          // ... other layers including openAIAgentLanguageModelLayer (providing AgentLanguageModel.Tag) ...
          // To make Anthropic available, you might provide it under a different specific Tag,
          // or use a more advanced factory pattern to select which one provides AgentLanguageModel.Tag.
          // For a simple start, if you want to *switch* to Anthropic as the main provider:
          // Replace openAIAgentLanguageModelLayer with anthropicAgentLanguageModelLayer.
          // For simultaneous availability, see Strategy B in Phase 4, Task 4.7.

          // Example: Assuming OpenAI is primary, Anthropic is available but needs selection.
          // This means anthropicAgentLanguageModelLayer needs to be available for the factory/orchestrator.
          // For testing, you could temporarily make it the default:
          // ...
          // ConfigurationServiceLive,
          // openAIAgentLanguageModelLayer, // Comment out OpenAI if testing Anthropic as default
          // anthropicAgentLanguageModelLayer, // Uncomment to make Anthropic the default provider for AgentLanguageModel.Tag
          // ...
        );
        ```
    *   **Recommendation for enabling multiple providers for `AgentLanguageModel.Tag`:**
        *   Instead of directly merging `OpenAIAgentLanguageModelLive`, `OllamaAgentLanguageModelLive`, and `AnthropicAgentLanguageModelLive` (which would cause `AgentLanguageModel.Tag` to be ambiguously provided), you should implement a **Provider Factory/Selector Service** as hinted in Phase 4.
        *   This factory service would depend on `ConfigurationService` and all *concrete* provider implementations (each provided under a unique tag, e.g., `OpenAIConcreteLMLive.Tag`, `AnthropicConcreteLMLive.Tag`).
        *   The factory service would then expose a method like `getActiveLanguageModel(): Effect<AgentLanguageModel, ...>` which, based on current global configuration, returns the selected concrete `AgentLanguageModel` implementation.
        *   `FullAppLayer` would provide this factory, and `AgentLanguageModel.Tag` itself would be provided by this factory layer.
        *   *For this phase, if the factory is too complex to implement now, ensure `AnthropicAgentLanguageModelLive` can be built and tested. You can manually switch which provider layer is active in `FullAppLayer` for testing.*

---

**Verification for Phase 5:**

1.  **Type Checking:** Run `pnpm t`.
2.  **Unit Tests:**
    *   `AnthropicClientLive.test.ts`: Mock `ConfigurationService` and `HttpClient`. Verify correct instantiation and API key usage.
    *   `AnthropicAgentLanguageModelLive.test.ts`: Mock `AnthropicClient.AnthropicClient` and `ConfigurationService`. Verify correct use of `AnthropicLanguageModel.model`.
3.  **Runtime Initialization Test:** `src/tests/unit/services/runtime.test.ts` should pass, especially if Anthropic is made the default `AgentLanguageModel` provider for testing this.
4.  **UI Functionality (Manual Testing):**
    *   If UI provider selection is implemented in `AgentChatPane`:
        *   Select "Anthropic" as the provider.
        *   Select an available Anthropic model (e.g., "claude-3-sonnet-20240229").
        *   Configure your `ANTHROPIC_API_KEY` (e.g., via environment variables that `ConfigurationService` can pick up, or by modifying `ConfigurationService`'s defaults for testing).
        *   Send messages and verify responses are streamed correctly from Anthropic.
        *   Test error handling (e.g., invalid API key).

Upon completion, Commander will support Anthropic models through the new AI backend, further demonstrating the backend's provider-agnostic capabilities. The next step (Phase 6) will focus on leveraging `AiPlan` for resilience across these providers.
