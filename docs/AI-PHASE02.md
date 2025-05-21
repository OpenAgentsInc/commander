Okay, Agent, here are the specific instructions for implementing **Phase 2 (OpenAI-Compatible Provider Implementation)**. This phase focuses on creating the concrete service layers for interacting with OpenAI and OpenAI-compatible LLMs using the `@effect/ai-openai` package and the abstractions defined in Phase 1.

**Preamble for the Coding Agent:**

*   **Effect-TS Best Practices:** Continue adhering to Effect-TS patterns (Tags, Layers, Effect, Schema, custom errors).
*   **Directory Structure:** All files for this phase should be located within `src/services/ai/providers/openai/`. Create this directory if it doesn't exist. Remember to add an `index.ts` in `src/services/ai/providers/` and `src/services/ai/providers/openai/` for re-exporting.
*   **ConfigurationService:** You will need to interact with an existing `ConfigurationService` (assumed to be in `src/services/configuration/`). This service should be capable of:
    *   Fetching non-sensitive configuration values (e.g., `OPENAI_MODEL_NAME`, `OPENAI_BASE_URL`).
    *   Fetching sensitive values like `OPENAI_API_KEY` (which it might get from a `SecureStorageService` or Electron's `safeStorage` via IPC).
    *   If `ConfigurationService` doesn't yet support these specific keys, you'll need to (conceptually or actually) add them to its interface and implementation. For this task, assume `configService.get("KEY_NAME")` and `configService.getSecret("SECRET_KEY_NAME")` methods exist and return `Effect.Effect<string, ConfigError>`.
*   **HttpClient:** An `HttpClient.Tag` (from `@effect/platform`) must be available in the application's runtime context (`FullAppLayer`). For calls made from the main Electron process or proxied through it, this would typically be provided by `@effect/platform-node/NodeHttpClient`.

---

## Phase 2: OpenAI-Compatible Provider Implementation

**Objective:** Implement the live service layers for an OpenAI-compatible provider using `@effect/ai-openai` and the core AI abstractions from Phase 1.

**Task 2.1: Create Directory and Index Files**

1.  **Action:** Create the directory `src/services/ai/providers/openai/`.
2.  **Action:** Create `src/services/ai/providers/openai/index.ts`:
    ```typescript
    // src/services/ai/providers/openai/index.ts
    export * from "./OpenAIClientLive";
    export * from "./OpenAIAgentLanguageModelLive";
    ```
3.  **Action:** Create/Update `src/services/ai/providers/index.ts`:
    ```typescript
    // src/services/ai/providers/index.ts
    export * as OpenAIProvider from "./openai";
    // export * as AnthropicProvider from "./anthropic"; // For later
    // export * as OllamaProvider from "./ollama"; // For later
    ```
4.  **Action:** Update `src/services/ai/index.ts` to re-export from providers:
    ```typescript
    // src/services/ai/index.ts
    export * from './core';
    export * from './providers'; // Add this line
    ```

**Task 2.2: Implement `OpenAIClientLive` Layer**

1.  **Action:** Create the file `src/services/ai/providers/openai/OpenAIClientLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/openai/OpenAIClientLive.ts
    import { Layer, Effect, Config, Option } from "effect";
    import { OpenAiClient } from "@effect/ai-openai";
    import { ConfigurationService, ConfigError } from "@/services/configuration"; // Adjust path as needed
    import { HttpClient } from "@effect/platform";
    import { AIConfigurationError } from "@/services/ai/core/AIError";

    export const OpenAIClientLive = Layer.effect(
      OpenAiClient.OpenAiClient, // The service tag this layer provides
      Effect.gen(function*(_) {
        const configService = yield* _(ConfigurationService);
        const httpClient = yield* _(HttpClient.Tag); // HttpClient is a dependency

        // Fetch API Key (secret)
        const apiKeyEffect = configService.getSecret("OPENAI_API_KEY").pipe(
          Effect.catchTag("ConfigError", (e) => Effect.fail(new AIConfigurationError({
            message: "OpenAI API Key not found or configuration error.",
            cause: e,
            context: { keyName: "OPENAI_API_KEY" }
          }))),
          // Ensure the API key is not empty
          Effect.filterOrFail(
            (key) => key.trim() !== "",
            () => new AIConfigurationError({ message: "OpenAI API Key cannot be empty."})
          )
        );
        const apiKey = yield* _(apiKeyEffect);

        // Fetch Base URL (optional)
        const baseUrlEffect = configService.get("OPENAI_BASE_URL").pipe(
          Effect.map(Option.some), // Wrap in Option if it might be missing
          Effect.catchTag("ConfigError", (e) => {
            // If OPENAI_BASE_URL is not explicitly configured, treat as Option.none()
            // Only fail if there's a different kind of config error.
            if (e.message.includes("not found")) return Effect.succeed(Option.none<string>());
            return Effect.fail(new AIConfigurationError({
                message: "Error fetching OpenAI Base URL configuration.",
                cause: e,
                context: { keyName: "OPENAI_BASE_URL" }
            }));
          })
        );
        const baseUrlOption = yield* _(baseUrlEffect);

        const clientConfig = {
          apiKey: Config.succeed(apiKey), // Config.succeed as apiKey is now definitely a string
          // If baseUrlOption is Some, use Config.succeed, else Config.none()
          baseUrl: Option.isSome(baseUrlOption) ? Config.succeed(baseUrlOption.value) : Config.none(),
        };

        // OpenAiClient.layerConfig returns Layer<OpenAiClient, never, HttpClient>
        // We need to provide HttpClient to it to get Layer<OpenAiClient, never, never>
        // then extract the service implementation using Layer.build and Context.get
        const clientLayerProvidingHttp = Layer.provide(OpenAiClient.layerConfig(clientConfig), Layer.succeed(HttpClient.Tag, httpClient));

        // Build the layer in a scoped effect and get the service
        const openAiClientService = yield* _(Layer.build(clientLayerProvidingHttp).pipe(Effect.map(context => Context.get(context, OpenAiClient.OpenAiClient)), Effect.scoped));

        return openAiClientService;
      })
    );
    ```

**Task 2.3: Implement `OpenAIAgentLanguageModelLive` Layer**

1.  **Action:** Create the file `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import { AgentLanguageModel, GenerateTextOptions, StreamTextOptions, GenerateStructuredOptions, AiTextChunk } from "@/services/ai/core";
    import type { AiError } from "@effect/ai/AiError";
    import type { AiResponse } from "@effect/ai/AiResponse";
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
    import { ConfigurationService, ConfigError } from "@/services/configuration"; // Adjust path
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";

    export const OpenAIAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel.Tag,
      Effect.gen(function*(_) {
        const openAiClient = yield* _(OpenAiClient.OpenAiClient); // Depends on OpenAIClientLive
        const configService = yield* _(ConfigurationService);

        // Fetch model name
        const modelNameEffect = configService.get("OPENAI_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gpt-4o"), // Default model if not configured
          Effect.catchTag("ConfigError", (e) => Effect.fail(new AIConfigurationError({
            message: "Error fetching OpenAI Model Name configuration.",
            cause: e,
            context: { keyName: "OPENAI_MODEL_NAME" }
          })))
        );
        const modelName = yield* _(modelNameEffect);

        // Create the AiModel (which is an Effect that requires OpenAiClient)
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

        // Provide the OpenAiClient to the AiModel definition effect to get the AiModel instance
        const aiModelInstance = yield* _(Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient,
          openAiClient
        ));

        // Build the AiModel into a Provider<AiLanguageModel>
        // The `aiModelInstance` itself is the `Effect<Provider<Service>, ConfigError, Context>`
        // So we yield it to get the Provider.
        const provider = yield* _(aiModelInstance);

        // Adapt the provider methods to the AgentLanguageModel interface
        // and map errors to AIProviderError.
        return AgentLanguageModel.Tag.of({
          _tag: "AgentLanguageModel", // Explicitly set the _tag
          generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateText(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `OpenAI generateText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "OpenAI",
                context: { model: modelName, params }
              }))
            ),
          streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AiError> =>
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `OpenAI streamText error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "OpenAI",
                context: { model: modelName, params }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AiError> =>
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `OpenAI generateStructured error: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "OpenAI",
                context: { model: modelName, params }
              }))
            ),
        });
      })
    );
    ```

**Task 2.4: Update `ConfigurationService` (Conceptual)**

1.  **Action:** Review `src/services/configuration/ConfigurationService.ts` (and its implementation).
2.  **Details:**
    *   Ensure that the service interface and implementation can handle the following new configuration keys:
        *   `OPENAI_API_KEY` (as a secret)
        *   `OPENAI_BASE_URL` (optional, non-secret)
        *   `OPENAI_MODEL_NAME` (non-secret, with a sensible default like "gpt-4o")
        *   `OPENAI_ENABLED` (boolean, to toggle the provider)
    *   The `ConfigurationService` should already use some form of persistence (e.g., `localStorage`, Electron store, or the planned PGlite). How API keys are securely managed (e.g., if `SecureStorageService` is a dependency of `ConfigurationService`) is crucial but assumed to be handled by existing patterns in `ConfigurationService`.
3.  **No specific code changes to `ConfigurationService` are instructed here**, but the coding agent must be aware that these keys need to be readable by the new AI provider layers. If the `ConfigurationService` is simple (e.g., only uses `localStorage`), then new entries for these keys will be implicitly supported.

**Task 2.5: Integrate OpenAI Provider into `FullAppLayer`**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**
    *   Import the new layers:
        ```typescript
        import { OpenAIClientLive, OpenAIAgentLanguageModelLive } from "@/services/ai/providers/openai";
        ```
    *   Compose these layers into `FullAppLayer`. `OpenAIAgentLanguageModelLive` depends on `OpenAIClientLive`. `OpenAIClientLive` depends on `ConfigurationService` and `HttpClient.Tag`.
        ```typescript
        // src/services/runtime.ts
        // ... other imports and layer definitions (telemetryLayer, nostrLayer, etc.)
        // Assume ConfigurationServiceLive is already part of FullAppLayer or defined

        const openAIClientLayer = OpenAIClientLive.pipe(
          Layer.provide(ConfigurationServiceLive), // Provide ConfigurationService
          Layer.provide(BrowserHttpClient.layerXMLHttpRequest) // Provide HttpClient for OpenAIClient
          // If ConfigurationService itself needs layers, they should be provided here too.
        );

        const openAIAgentLanguageModelLayer = OpenAIAgentLanguageModelLive.pipe(
          Layer.provide(openAIClientLayer), // Provide the configured OpenAIClient
          Layer.provide(ConfigurationServiceLive) // Also needs ConfigurationService for model name
        );

        // Add openAIAgentLanguageModelLayer to FullAppLayer
        export const FullAppLayer = Layer.mergeAll(
          telemetryLayer,
          nostrLayer,
          // ... other existing service layers ...
          BrowserHttpClient.layerXMLHttpRequest, // Ensure HttpClient is broadly available
          ConfigurationServiceLive, // Ensure ConfigurationService is available
          openAIAgentLanguageModelLayer // Provides AgentLanguageModel.Tag via OpenAI
        );
        ```
    *   **Important:** Ensure `ConfigurationServiceLive` (or its equivalent) and `BrowserHttpClient.layerXMLHttpRequest` are correctly defined and included in `FullAppLayer` *before* or at the same level as layers that depend on them. The order in `Layer.mergeAll` doesn't strictly enforce construction order, but dependencies must be satisfiable from the merged context. Using `Layer.provide` explicitly chains dependencies.

---

**Verification for Phase 2:**

1.  **Type Checking:** Run `pnpm t` to ensure no TypeScript errors.
2.  **Unit Tests (Conceptual for now, will be built in later phases):**
    *   A test for `OpenAIClientLive` could mock `ConfigurationService` and `HttpClient` to verify it attempts to build the `OpenAiClient` correctly.
    *   A test for `OpenAIAgentLanguageModelLive` could mock `OpenAIClient.OpenAiClient` and `ConfigurationService` to ensure it correctly creates and adapts the `OpenAiLanguageModel.model` provider.
3.  **Runtime Initialization Test:**
    *   The test created in Phase 0 (`src/tests/unit/services/runtime.test.ts`) for `FullAppLayer` should still pass. If it fails with "Service not found" errors for `ConfigurationService` or `HttpClient.Tag` when building the OpenAI layers, it means their provision in `FullAppLayer` needs adjustment.

Upon successful completion of these tasks, Commander will have a foundational OpenAI-compatible AI provider integrated using the Effect AI backend, ready for use by the `AgentChat` pane in the next phase.
