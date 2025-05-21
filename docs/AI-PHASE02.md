# AI Roadmap: Phase 2 - OpenAI-Compatible Provider Implementation

**Objective:** Implement the live service layers for an OpenAI-compatible provider using `@effect/ai-openai` and the core AI abstractions defined in Phase 1. This phase will deliver a functional `AgentLanguageModel` ready for integration into UI components.

**Preamble for the Coding Agent:**

*   **Adherence to Effect-TS Best Practices:**
    *   Continue to strictly follow Effect-TS patterns: `Context.Tag` for service interfaces, `Layer` for implementations, and `Effect` for all operations involving side effects.
    *   Ensure all `Effect`s have explicit error types (`E`) and context requirements (`R`).
    *   Use `@effect/schema` for data validation for any configurations or parameters not already covered by Phase 1 schemas.
    *   Utilize the custom tagged errors (e.g., `AIProviderError`, `AIConfigurationError`) defined in Phase 1 (`src/services/ai/core/AIError.ts`) for all domain-specific error handling.
*   **TypeScript Strictness & Type Safety:**
    *   All TypeScript code MUST adhere to strict type checking (as configured in `tsconfig.json` with `strict: true`).
    *   The use of `any` is strictly discouraged. Strive for precise type definitions. If `any` seems necessary, it indicates a potential design flaw or misunderstanding that should be addressed. Do not use `//@ts-ignore` or `//@ts-expect-error` to bypass type errors; resolve them correctly.
    *   Ensure all function parameters and return types are explicitly typed.
*   **Immutability:**
    *   Treat all data structures (objects, arrays) as immutable. When modifications are needed, create new instances (e.g., using spread syntax or functional programming methods like `map`, `filter`) rather than mutating in place. This is crucial for predictable state management with Effect and React.
*   **Logging and Telemetry:**
    *   **ALL** diagnostic logging, warnings, and errors MUST use the `TelemetryService` (`src/services/telemetry/`). Refer to the guidelines in `docs/AGENTS.md#11-logging-and-telemetry`.
    *   Direct use of `console.log()`, `console.warn()`, `console.error()`, etc., is **PROHIBITED** except for temporary, local debugging during development and **MUST be removed** before committing code.
*   **Directory Structure:**
    *   All new files for this specific provider implementation should be located within `src/services/ai/providers/openai/`.
    *   Create an `index.ts` file in `src/services/ai/providers/` and `src/services/ai/providers/openai/` for re-exporting public symbols (Tags, Layers, types).
*   **Configuration Management:**
    *   Interaction with the existing `ConfigurationService` (assumed to be in `src/services/configuration/`) is required.
    *   This service must be capable of fetching:
        *   Non-sensitive configuration values (e.g., `OPENAI_MODEL_NAME`, `OPENAI_BASE_URL`).
        *   Sensitive values like `OPENAI_API_KEY` (e.g., from secure storage abstracted by `ConfigurationService`).
    *   Assume `configService.get("KEY_NAME")` and `configService.getSecret("SECRET_KEY_NAME")` methods exist and return `Effect.Effect<string, ConfigError | SecretNotFoundError>` or similar typed Effects. The `ConfigError` should be a custom tagged error.
*   **HTTP Client:**
    *   An `HttpClient.Tag` (from `@effect/platform`) must be available in the application's runtime context (`FullAppLayer`). This will be used by `@effect/ai-openai`. For calls made from the main Electron process or proxied through it, this would typically be provided by `@effect/platform-node/NodeHttpClient`. For renderer-direct calls (if any, and if security allows), `BrowserHttpClient.layerXMLHttpRequest` would be used. The chosen `HttpClient` layer must be provided to the `OpenAiClient` layer.
*   **Testing:**
    *   Comprehensive unit tests are mandatory for all new layers and services created in this phase.
    *   Refer to `docs/AI-PHASE02-TESTS.md` for detailed testing guidelines and example test structures. Tests defined there **MUST** be implemented.
    *   Focus on testing success paths, error handling (including mapping to custom `AIError` types), configuration variations, and edge cases.

---

## Phase 2: OpenAI-Compatible Provider Implementation

**Task 2.1: Create Directory and Index Files**

1.  **Action:** Create the directory `src/services/ai/providers/openai/` if it doesn't exist.
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
    // export * as AnthropicProvider from "./anthropic"; // Placeholder for later
    // export * as OllamaProvider from "./ollama";     // Placeholder for later
    ```
4.  **Action:** Update `src/services/ai/index.ts` to re-export from `providers`:
    ```typescript
    // src/services/ai/index.ts
    export * from './core';
    export * from './providers'; // Ensure this line is present and correct
    ```

**Task 2.2: Implement `OpenAIClientLive` Layer**

This layer is responsible for providing a configured `OpenAiClient.OpenAiClient` instance from the `@effect/ai-openai` package.

1.  **Action:** Create the file `src/services/ai/providers/openai/OpenAIClientLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/openai/OpenAIClientLive.ts
    import { Layer, Effect, Config, Option, Context } from "effect";
    import { OpenAiClient } from "@effect/ai-openai"; // Tag from @effect/ai-openai
    import { ConfigurationService, type ConfigError } from "@/services/configuration"; // Adjust path and ensure ConfigError is a typed error
    import { HttpClient } from "@effect/platform"; // Tag from @effect/platform
    import { AIConfigurationError } from "@/services/ai/core/AIError";
    import { TelemetryService } from "@/services/telemetry";

    export const OpenAIClientLive = Layer.effect(
      OpenAiClient.OpenAiClient, // The service tag this layer provides
      Effect.gen(function*(_) {
        const configService = yield* _(ConfigurationService);
        const httpClient = yield* _(HttpClient.Tag); // HttpClient is a dependency
        const telemetry = yield* _(TelemetryService); // For logging configuration attempts

        // Fetch API Key (secret)
        const apiKeyEffect = configService.getSecret("OPENAI_API_KEY").pipe(
          Effect.tapError(e => telemetry.trackEvent({
            category: "ai:config:error",
            action: "openai_api_key_fetch_failed",
            label: "OPENAI_API_KEY",
            value: (e as Error).message || String(e) // Ensure error message is captured
          })),
          Effect.mapError(e => new AIConfigurationError({
            message: "OpenAI API Key not found or configuration error.",
            cause: e,
            context: { keyName: "OPENAI_API_KEY" }
          })),
          Effect.filterOrFail(
            (key): key is string => typeof key === 'string' && key.trim() !== "",
            () => new AIConfigurationError({ message: "OpenAI API Key cannot be empty." })
          )
        );
        const apiKey = yield* _(apiKeyEffect);
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_api_key_loaded" }));

        // Fetch Base URL (optional)
        const baseUrlEffect = configService.get("OPENAI_BASE_URL").pipe(
          Effect.map(Option.some), // Wrap in Option for optional config
          Effect.catchTag("ConfigError", (e: ConfigError) => { // Assuming ConfigError is a tagged error
            // If OPENAI_BASE_URL is not explicitly configured, treat as Option.none()
            // Log that it's not found but don't fail unless it's a different ConfigError type.
            if (e.message.includes("not found")) { // Adapt this check to your ConfigError structure
              return Effect.succeed(Option.none<string>());
            }
            return Effect.fail(new AIConfigurationError({
                message: "Error fetching OpenAI Base URL configuration.",
                cause: e,
                context: { keyName: "OPENAI_BASE_URL" }
            }));
          }),
          Effect.tapError(e => telemetry.trackEvent({
            category: "ai:config:error",
            action: "openai_base_url_fetch_failed",
            label: "OPENAI_BASE_URL",
            value: (e as Error).message || String(e)
          }))
        );
        const baseUrlOption = yield* _(baseUrlEffect);
        if (Option.isSome(baseUrlOption)) {
            yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_base_url_loaded", value: baseUrlOption.value }));
        } else {
            yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_base_url_not_configured" }));
        }

        const clientSetupConfig = {
          apiKey: Config.succeed(apiKey), // apiKey is now a resolved string
          baseUrl: Option.match(baseUrlOption, {
            onNone: () => Config.none(), // Use Config.none() for missing optional Config<A>
            onSome: (url) => Config.succeed(url)
          }),
        };

        // OpenAiClient.layerConfig returns Layer<OpenAiClient, never, HttpClient>
        // We provide HttpClient to it to get Layer<OpenAiClient, never, never>
        // then extract the service implementation using Layer.build and Context.get
        const clientLayerWithHttp = Layer.provide(
          OpenAiClient.layerConfig(clientSetupConfig),
          Layer.succeed(HttpClient.Tag, httpClient) // Provide the specific HttpClient instance
        );

        // Build the layer in a scoped effect and get the service instance
        const openAiClientService = yield* _(
          Layer.build(clientLayerWithHttp).pipe(
            Effect.map(context => Context.get(context, OpenAiClient.OpenAiClient)),
            Effect.scoped // Ensure resources are managed correctly if clientLayerWithHttp has finalizers
          )
        );

        yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_client_created" }));
        return openAiClientService;
      })
    );
    ```

**Task 2.3: Implement `OpenAIAgentLanguageModelLive` Layer**

This layer adapts the `@effect/ai-openai` `OpenAiLanguageModel` to our application's `AgentLanguageModel.Tag` interface.

1.  **Action:** Create the file `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`.
2.  **Content:**
    ```typescript
    // src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import { AgentLanguageModel, type GenerateTextOptions, type StreamTextOptions, type GenerateStructuredOptions, type AiTextChunk } from "@/services/ai/core";
    import type { AiError } from "@effect/ai/AiError"; // Native AiError from @effect/ai
    import type { AiResponse } from "@effect/ai/AiResponse"; // Native AiResponse from @effect/ai
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
    import { ConfigurationService, type ConfigError } from "@/services/configuration";
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
    import { TelemetryService } from "@/services/telemetry";

    export const OpenAIAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel.Tag,
      Effect.gen(function*(_) {
        const openAiClient = yield* _(OpenAiClient.OpenAiClient); // Depends on OpenAIClientLive
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        // Fetch model name
        const modelNameEffect = configService.get("OPENAI_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gpt-4o"), // Default model if not configured
          Effect.tapError(e => telemetry.trackEvent({
            category: "ai:config:error",
            action: "openai_model_name_fetch_failed",
            label: "OPENAI_MODEL_NAME",
            value: (e as Error).message || String(e)
          })),
          Effect.mapError(e => new AIConfigurationError({
            message: "Error fetching OpenAI Model Name configuration.",
            cause: e,
            context: { keyName: "OPENAI_MODEL_NAME" }
          }))
        );
        const modelName = yield* _(modelNameEffect);
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_model_name_resolved", value: modelName }));

        // OpenAiLanguageModel.model(modelName) returns Effect<AiModel<AiLanguageModel, OpenAiClient>, ConfigError, OpenAiClient>
        // An AiModel is itself an Effect that yields a Provider<Service>
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

        // Provide the OpenAiClient to the AiModel definition effect to get the AiModel instance
        // This resolves the OpenAiClient dependency of aiModelEffectDefinition
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // The Context.Tag for the service being provided
          openAiClient              // The actual service instance
        );

        // Yielding this effect gives us the Provider<AgentLanguageModel>
        const provider = yield* _(configuredAiModelEffect);

        yield* _(telemetry.trackEvent({ category: "ai:config", action: "openai_language_model_provider_created", value: modelName }));

        // Adapt the provider methods to the AgentLanguageModel interface
        // and map errors to our custom AIProviderError.
        return AgentLanguageModel.Tag.of({
          _tag: "AgentLanguageModel", // Ensure the tag is explicitly part of the implementation
          generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => // Ensure error type matches our defined errors
            provider.generateText(params).pipe(
              Effect.mapError(err => new AIProviderError({ // Map native AiError to our AIProviderError
                message: `OpenAI generateText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                cause: err, // Preserve original error as cause
                provider: "OpenAI",
                context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => // Ensure error type matches
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `OpenAI streamText error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "OpenAI",
                context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => // Ensure error type matches
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `OpenAI generateStructured error for model ${modelName}: ${err.message || "Unknown provider error"}`,
                cause: err,
                provider: "OpenAI",
                context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
        });
      })
    );
    ```

**Task 2.4: Update `ConfigurationService` (Conceptual Reminder)**

1.  **Action:** Ensure `src/services/configuration/ConfigurationService.ts` (and its implementation) can manage the following keys:
    *   `OPENAI_API_KEY` (as a secret)
    *   `OPENAI_BASE_URL` (optional, non-secret)
    *   `OPENAI_MODEL_NAME` (non-secret, with a default like "gpt-4o")
    *   `OPENAI_ENABLED` (boolean, to toggle the provider, for future use in dynamic provider selection).
2.  **Details:** If `ConfigurationService` does not yet support these, its interface and implementation would need to be updated. For this phase, we assume it can handle these. API key security (e.g., via Electron `safeStorage` or an OS keychain, abstracted by `ConfigurationService`'s `getSecret` method) is paramount.

**Task 2.5: Integrate OpenAI Provider into `FullAppLayer`**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**
    *   Import the new layers:
        ```typescript
        // src/services/runtime.ts
        // ... other imports ...
        import { OpenAIClientLive, OpenAIAgentLanguageModelLive } from "@/services/ai/providers/openai";
        // Assume ConfigurationServiceLive and a suitable HttpClient layer (e.g., BrowserHttpClient.layerXMLHttpRequest) are already defined and exported
        import { ConfigurationServiceLive } from "@/services/configuration"; // Example import
        import { BrowserHttpClient } from "@effect/platform-browser"; // Example import for HttpClient
        ```
    *   Add the new AI provider layers to `FullAppLayer`. `OpenAIClientLive` depends on `ConfigurationService` and `HttpClient.Tag`. `OpenAIAgentLanguageModelLive` depends on `OpenAIClient.OpenAiClient` and `ConfigurationService`. `Layer.mergeAll` will resolve these dependencies from the context.

        ```typescript
        // src/services/runtime.ts
        // ... other layer definitions (telemetryLayer, nostrLayer, etc.)

        export const FullAppLayer = Layer.mergeAll(
          // Core services that AI layers might depend on (must be provided)
          ConfigurationServiceLive,         // Provides ConfigurationService
          BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient.Tag (use NodeHttpClient.layer if in main process)
          TelemetryServiceLive, // Provides TelemetryService (assuming this is how it's structured)

          // AI Provider Layers
          OpenAIClientLive,                 // Provides OpenAiClient.OpenAiClient, depends on ConfigService & HttpClient
          OpenAIAgentLanguageModelLive,     // Provides AgentLanguageModel.Tag, depends on OpenAIClient & ConfigService

          // ... other existing service layers like nostrLayer ...
        );
        ```
    *   **Important:**
        *   Ensure `ConfigurationServiceLive` (or its equivalent) and a live layer for `HttpClient.Tag` (e.g., `BrowserHttpClient.layerXMLHttpRequest` or `NodeHttpClient.layer`) are correctly defined and included in `FullAppLayer` *before* or at the same level as layers that depend on them. The composition order in `Layer.mergeAll` generally doesn't enforce construction order, but dependencies must be satisfiable from the merged context.
        *   If `OpenAIClientLive` or `OpenAIAgentLanguageModelLive` are intended to be used in different Electron processes (main vs. renderer), the appropriate `HttpClient` layer must be chosen for the context where these layers will run.

---

**Task 2.6: Implement Unit Tests**

1.  **Action:** Create and implement the unit tests as specified in `docs/AI-PHASE02-TESTS.md`.
2.  **Details:**
    *   **`OpenAIClientLive.test.ts`:**
        *   Mock `ConfigurationService` and `HttpClient.Tag`.
        *   Test successful client creation with various valid configurations (API key only, API key + base URL).
        *   Test failure scenarios: missing API key, empty API key, errors from `ConfigurationService`. Ensure correct `AIConfigurationError`s are thrown and telemetry is called.
    *   **`OpenAIAgentLanguageModelLive.test.ts`:**
        *   Mock `OpenAiClient.OpenAiClient` and `ConfigurationService`.
        *   Test successful provider creation and that it correctly uses configured or default model names.
        *   Test that calls to `generateText`, `streamText`, and `generateStructured` are correctly delegated to the underlying `@effect/ai-openai` provider.
        *   Crucially, test error mapping: simulate the underlying provider throwing an `AiError` (from `@effect/ai`) and verify it's correctly mapped to your custom `AIProviderError`, including the `provider: "OpenAI"` context and preservation of the original error as `cause`.
    *   **Runtime Integration Test (in `src/tests/unit/services/runtime.test.ts`):**
        *   Verify that `AgentLanguageModel.Tag` can be successfully resolved from the `FullAppLayer` (after it's been updated to include the new AI layers). This confirms correct dependency injection.
3.  **General Testing Guidelines:**
    *   Use `Effect.runPromiseExit` for tests expecting success or failure to inspect the `Exit` value.
    *   Mock dependencies using `Layer.succeed(ServiceTag, mockImplementation)`.
    *   Ensure tests cover both success and error paths for each function.
    *   Verify that telemetry events are tracked appropriately for configuration loading, successes, and failures.

---

**Verification and Quality Assurance for Phase 2:**

1.  **TypeScript Compilation:** Run `pnpm tsc --noEmit` (or `pnpm t` if `t` script is set up for this) to ensure no TypeScript errors. Address any reported issues.
2.  **Linting and Formatting:** Run `pnpm lint` and `pnpm format:write` to ensure code quality and consistency.
3.  **Unit Tests:** All unit tests specified in `docs/AI-PHASE02-TESTS.md` and for any helper functions MUST pass. Aim for high test coverage.
4.  **Runtime Initialization Test:** The augmented test in `src/tests/unit/services/runtime.test.ts` (verifying `FullAppLayer` buildability and `AgentLanguageModel.Tag` resolvability) must pass.
5.  **Code Review:** Conduct a thorough code review focusing on:
    *   Adherence to Effect-TS best practices.
    *   Correct error handling and mapping to custom AI errors.
    *   Absence of `any` types or shortcuts.
    *   Proper use of `TelemetryService`.
    *   Clarity, readability, and maintainability of the code.
    *   Correctness of dependency injection and layer composition.

Upon successful completion and verification of these tasks, Commander will have a foundational OpenAI-compatible AI provider integrated using the Effect AI backend. This `AgentLanguageModel` service will be robust, well-tested, and ready for use by UI components in subsequent phases.
