Okay, Agent, here are the specific instructions for implementing **Phase 6 (Execution Planning & Resilience with `AiPlan`)**. This phase introduces robustness to your AI interactions by using `@effect/ai`'s `AiPlan` to manage retries and fallbacks across different LLM providers.

**Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Continue strict adherence.
- **Directory Structure:** New services related to orchestration will go into `src/services/ai/orchestration/`.
- **Prerequisites:** Phases 0-5 must be completed. You need:
  - `AgentLanguageModel.Tag` defined.
  - Live implementations for `AgentLanguageModel.Tag` for at least two providers (e.g., `OpenAIAgentLanguageModelLive` and `AnthropicAgentLanguageModelLive`, and `OllamaAgentLanguageModelLive`). These concrete implementations should be available to be selected or composed.
  - `ConfigurationService` to manage provider preferences and API keys.
  - `HttpClient.Tag` available in `FullAppLayer`.
- **Understanding `AiPlan`:** Review `docs/effect/ai/03-execution-planning.md`. `AiPlan.make` takes `AiModel` definitions. An `AiModel` (e.g., `OpenAiLanguageModel.model("gpt-4o")`) is an `Effect` that, when run with its required client (like `OpenAiClient`), yields a `Provider<Service>`. The `AiPlan` orchestrates these `AiModel` effects.

---

## Phase 6: Execution Planning & Resilience with `AiPlan`

**Objective:** Implement a `ChatOrchestratorService` that uses `AiPlan` to manage chat completions, allowing for retries on transient errors and fallbacks to alternative LLM providers if a primary provider fails.

**Task 6.1: Create Directory and Index Files**

1.  **Action:** Create the directory `src/services/ai/orchestration/` (if it doesn't exist).
2.  **Action:** Create `src/services/ai/orchestration/index.ts`:
    ```typescript
    // src/services/ai/orchestration/index.ts
    export * from "./ChatOrchestratorService";
    ```
3.  **Action:** Update `src/services/ai/index.ts` to re-export from orchestration:
    ```typescript
    // src/services/ai/index.ts
    export * from "./core";
    export * from "./providers";
    export * from "./orchestration"; // Add this line
    ```

**Task 6.2: Define `ChatOrchestratorService` Interface**

1.  **Action:** Create the file `src/services/ai/orchestration/ChatOrchestratorService.ts`.
2.  **Content (Interface part):**

    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    import { Context, Effect, Stream } from "effect";
    import {
      AgentChatMessage,
      AiTextChunk,
      AIProviderError,
      AIConfigurationError,
      AgentLanguageModel,
      GenerateTextOptions,
      StreamTextOptions,
    } from "@/services/ai/core";
    import type { AiModel } from "@effect/ai"; // For type hint

    export interface PreferredProviderConfig {
      key: string; // e.g., "openai", "anthropic", "ollama"
      modelName?: string; // Specific model for this provider, overrides global default
    }

    export interface ChatOrchestratorService {
      readonly _tag: "ChatOrchestratorService";

      streamConversation(params: {
        messages: AgentChatMessage[];
        preferredProvider: PreferredProviderConfig;
        // Potentially other options like temperature, max_tokens if not part of GenerateTextOptions
        // For now, assume they are part of the options passed to the underlying AiModel
        options?: Partial<Omit<StreamTextOptions, "prompt">>; // Allow overriding some text generation options
      }): Stream.Stream<AiTextChunk, AIProviderError | AIConfigurationError>;

      // Optionally, a non-streaming version
      generateConversationResponse(params: {
        messages: AgentChatMessage[];
        preferredProvider: PreferredProviderConfig;
        options?: Partial<Omit<GenerateTextOptions, "prompt">>;
      }): Effect.Effect<string, AIProviderError | AIConfigurationError>; // Assuming simple string response for now
    }

    export const ChatOrchestratorService =
      Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

    // --- Implementation part will follow below ---
    ```

**Task 6.3: Implement `ChatOrchestratorServiceLive` Layer**

1.  **Action:** Add the implementation part to `src/services/ai/orchestration/ChatOrchestratorService.ts`.
2.  **Details:** This is the most complex part. The service needs to:

    - Depend on `ConfigurationService`, `HttpClient.Tag`, and potentially all specific client tags (`OpenAiClient.Tag`, `AnthropicClient.Tag`, etc.) if building `AiModel`s dynamically with their clients.
    - A helper function `getAiModelForProvider(providerConfig: PreferredProviderConfig): Effect.Effect<AiModel<AgentLanguageModel, any>, AIConfigurationError>` will be essential. This function will:
      - Read the global configuration for the given `providerConfig.key` (API keys, base URLs).
      - Use the provider-specific `AiModel` factory (e.g., `OpenAiLanguageModel.model(...)`, `AnthropicLanguageModel.model(...)`).
      - Construct and provide the necessary client layer (e.g., `OpenAIClientLive`, `AnthropicClientLive`) to this `AiModel` effect.
      - Return the `Effect` that yields the configured `AiModel`.

3.  **Content (Implementation part for `ChatOrchestratorService.ts`):**

    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... (imports and interface from Task 6.2) ...
    import { Layer, Config, Schedule, Cause, Option } from "effect";
    import {
      ConfigurationService,
      ConfigError,
    } from "@/services/configuration";
    import { HttpClient } from "@effect/platform";
    import { AiPlan, Provider as AiProvider } from "@effect/ai"; // Provider is the built AiModel
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
    import {
      AnthropicClient,
      AnthropicLanguageModel,
    } from "@effect/ai-anthropic";
    // Assuming OllamaAsOpenAIClientLive provides OllamaOpenAIClientTag which is an OpenAiClient.Tag
    import { OllamaOpenAIClientTag } from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
    import { TelemetryService } from "@/services/telemetry";

    // Helper function to get the correct model URI/name from config or default
    const getModelName = (
      configService: ConfigurationService,
      providerKey: string, // e.g., "OPENAI", "ANTHROPIC", "OLLAMA"
      overrideModelName?: string,
      defaultModel?: string,
    ): Effect.Effect<string, AIConfigurationError> => {
      if (overrideModelName) return Effect.succeed(overrideModelName);
      return configService.get(`${providerKey}_MODEL_NAME`).pipe(
        Effect.orElseSucceed(() => defaultModel || "default-model-not-set"),
        Effect.catchTag("ConfigError", (e) =>
          Effect.fail(
            new AIConfigurationError({
              message: `Error fetching ${providerKey} Model Name configuration.`,
              cause: e,
              context: { keyName: `${providerKey}_MODEL_NAME` },
            }),
          ),
        ),
      );
    };

    export const ChatOrchestratorServiceLive = Layer.effect(
      ChatOrchestratorService,
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigurationService);
        const httpClient = yield* _(HttpClient.Tag); // General HttpClient
        const telemetry = yield* _(TelemetryService);

        // --- Helper to build an AiModel<AgentLanguageModel, never> for a given provider config ---
        // This is the crucial part: it takes a provider key and dynamically builds the
        // corresponding AiModel with its client and configuration.
        const getResolvedAiModelProvider = (
          providerConfig: PreferredProviderConfig,
        ): Effect.Effect<
          AiProvider.Provider<AgentLanguageModel>,
          AIConfigurationError | AIProviderError
        > =>
          Effect.gen(function* (_) {
            const { key, modelName: modelNameOverride } = providerConfig;
            let specificAiModelEffect: Effect.Effect<
              AiModel<AgentLanguageModel, any>,
              ConfigError,
              any
            >;
            let clientContext: Layer.Layer<
              any,
              AIConfigurationError,
              ConfigurationService | HttpClient
            >;

            runTelemetry({
              category: "orchestrator",
              action: "get_resolved_model_start",
              label: key,
              value: modelNameOverride,
            });

            switch (key.toLowerCase()) {
              case "openai": {
                const modelName = yield* _(
                  getModelName(
                    configService,
                    "OPENAI",
                    modelNameOverride,
                    "gpt-4o",
                  ),
                );
                specificAiModelEffect = OpenAiLanguageModel.model(
                  modelName,
                ) as any; // Cast for now
                // Build the OpenAIClientLive layer which itself depends on ConfigService and HttpClient
                const apiKey = yield* _(
                  configService
                    .getSecret("OPENAI_API_KEY")
                    .pipe(
                      Effect.mapError(
                        (e) =>
                          new AIConfigurationError({
                            message: "OpenAI API Key failed",
                            cause: e,
                          }),
                      ),
                    ),
                );
                const baseUrlOpt = yield* _(
                  Effect.optional(configService.get("OPENAI_BASE_URL")),
                );
                const clientConfig = {
                  apiKey: Config.succeed(apiKey),
                  baseUrl: Option.match(baseUrlOpt, {
                    onNone: () => Config.none(),
                    onSome: Config.succeed,
                  }),
                };
                clientContext = Layer.provide(
                  OpenAiClient.layerConfig(clientConfig),
                  Layer.succeed(HttpClient.Tag, httpClient),
                );
                break;
              }
              case "anthropic": {
                const modelName = yield* _(
                  getModelName(
                    configService,
                    "ANTHROPIC",
                    modelNameOverride,
                    "claude-3-sonnet-20240229",
                  ),
                );
                specificAiModelEffect = AnthropicLanguageModel.model(
                  modelName,
                ) as any;
                const apiKey = yield* _(
                  configService
                    .getSecret("ANTHROPIC_API_KEY")
                    .pipe(
                      Effect.mapError(
                        (e) =>
                          new AIConfigurationError({
                            message: "Anthropic API Key failed",
                            cause: e,
                          }),
                      ),
                    ),
                );
                const clientConfig = { apiKey: Config.succeed(apiKey) };
                clientContext = Layer.provide(
                  AnthropicClient.layerConfig(clientConfig),
                  Layer.succeed(HttpClient.Tag, httpClient),
                );
                break;
              }
              case "ollama": {
                const modelName = yield* _(
                  getModelName(
                    configService,
                    "OLLAMA",
                    modelNameOverride,
                    "gemma3:1b",
                  ),
                );
                // Ollama uses the OpenAI compatible model, but needs its specific client adapter
                specificAiModelEffect = OpenAiLanguageModel.model(
                  modelName,
                ) as any; // This is key
                // The OllamaAsOpenAIClientLive layer provides the OpenAiClient.Tag via IPC
                // It needs Telemetry and potentially ConfigService for OLLAMA_BASE_URL if IPC listener needs it
                const { OllamaAsOpenAIClientLive } = yield* _(
                  Effect.promise(
                    () =>
                      import(
                        "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive"
                      ),
                  ),
                );
                clientContext = OllamaAsOpenAIClientLive.pipe(
                  Layer.provide(Layer.succeed(TelemetryService, telemetry)),
                  Layer.provide(
                    Layer.succeed(ConfigurationService, configService),
                  ), // If Ollama IPC needs base URL
                );
                break;
              }
              default:
                runTelemetry({
                  category: "orchestrator",
                  action: "get_resolved_model_unknown_provider",
                  label: key,
                });
                return yield* _(
                  Effect.fail(
                    new AIConfigurationError({
                      message: `Unsupported provider key: ${key}`,
                    }),
                  ),
                );
            }

            // Provide the specific client layer to the AiModel effect, then build the AiModel, then get the Provider
            const aiModel = yield* _(
              Effect.provide(specificAiModelEffect, clientContext),
            );
            const provider = yield* _(aiModel); // aiModel is Effect<Provider<Service>, ConfigError, Context>
            runTelemetry({
              category: "orchestrator",
              action: "get_resolved_model_success",
              label: key,
              value: yield* _(
                getModelName(
                  configService,
                  key.toUpperCase(),
                  modelNameOverride,
                ),
              ),
            });
            return provider as AiProvider.Provider<AgentLanguageModel>; // Cast to ensure type matches
          }).pipe(
            Effect.mapError((err) => {
              if (
                err instanceof AIConfigurationError ||
                err instanceof AIProviderError
              )
                return err;
              return new AIConfigurationError({
                message: `Failed to resolve AI model for ${providerConfig.key}`,
                cause: err,
              });
            }),
          );

        // --- Service Method Implementations ---
        return ChatOrchestratorService.of({
          _tag: "ChatOrchestratorService",
          streamConversation: ({ messages, preferredProvider, options }) => {
            runTelemetry({
              category: "orchestrator",
              action: "stream_conversation_start",
              label: preferredProvider.key,
            });
            // Define fallback providers (example)
            const fallbackProviders: PreferredProviderConfig[] = [
              { key: "anthropic", modelName: "claude-3-haiku-20240307" }, // Cheaper/faster fallback
              { key: "ollama" }, // Local fallback
            ].filter(
              (p) =>
                p.key.toLowerCase() !== preferredProvider.key.toLowerCase(),
            ); // Avoid self-fallback

            // Create an array of AiPlan steps including the preferred and fallbacks
            const planSteps = [preferredProvider, ...fallbackProviders].map(
              (pConfig) => ({
                // AiPlan.make expects `model` to be an Effect that yields a Provider.
                // Our getResolvedAiModelProvider already does this.
                model: getResolvedAiModelProvider(pConfig),
                attempts: pConfig.key === preferredProvider.key ? 3 : 1, // More attempts for preferred
                schedule: Schedule.exponential("100 millis").pipe(
                  Schedule.jittered,
                  Schedule.compose(
                    Schedule.recurs(
                      pConfig.key === preferredProvider.key ? 2 : 0,
                    ),
                  ),
                ),
                // Retry only on retryable provider errors for the preferred provider
                while: (err: AIProviderError | AIConfigurationError) =>
                  pConfig.key === preferredProvider.key &&
                  err._tag === "AIProviderError" &&
                  (err.context?.isRetryable === true ||
                    (err.cause instanceof Error &&
                      err.cause.name === "FetchError")), // Example for network issues
              }),
            );

            // @ts-ignore - AiPlan.make typing can be tricky with diverse error/context types from model effects
            const plan = AiPlan.make(...planSteps);

            const conversationHistoryObject = { messages }; // As expected by @effect/ai providers
            const streamOptions = {
              ...options,
              prompt: conversationHistoryObject,
            };

            return Stream.unwrap(
              Effect.gen(function* (_) {
                const builtPlan = yield* _(
                  plan.pipe(
                    Effect.tapError((err) =>
                      runTelemetry({
                        category: "orchestrator",
                        action: "ai_plan_build_error",
                        label: err.message,
                      }),
                    ),
                  ),
                ); // This builds the plan, yielding Provider<AgentLanguageModel>
                runTelemetry({
                  category: "orchestrator",
                  action: "ai_plan_built_successfully",
                });
                return builtPlan
                  .streamText(streamOptions)
                  .pipe(
                    Stream.tapErrorCause((cause) =>
                      Effect.sync(() =>
                        runTelemetry({
                          category: "orchestrator",
                          action: "stream_conversation_error_final",
                          label: Cause.pretty(cause),
                        }),
                      ),
                    ),
                  );
              }),
            ).pipe(
              Stream.tapErrorCause((cause) =>
                Effect.sync(() =>
                  runTelemetry({
                    category: "orchestrator",
                    action: "stream_conversation_error_unwrap",
                    label: Cause.pretty(cause),
                  }),
                ),
              ),
            );
          },

          generateConversationResponse: ({
            messages,
            preferredProvider,
            options,
          }) => {
            // Similar logic to streamConversation but calls generateText
            // For brevity, this is left as an exercise but follows the same AiPlan pattern.
            runTelemetry({
              category: "orchestrator",
              action: "generate_conversation_start",
              label: preferredProvider.key,
            });
            return Effect.flatMap(
              getResolvedAiModelProvider(preferredProvider),
              (provider) =>
                provider.generateText({ ...options, prompt: { messages } }),
            ).pipe(
              Effect.map((response) => response.text), // Assuming AiResponse has a text field
              Effect.tapErrorCause((cause) =>
                Effect.sync(() =>
                  runTelemetry({
                    category: "orchestrator",
                    action: "generate_conversation_error",
                    label: Cause.pretty(cause),
                  }),
                ),
              ),
            );
          },
        });
      }),
    );
    ```

**Task 6.4: Refactor `useAgentChat` Hook**

1.  **Action:** Modify `src/hooks/ai/useAgentChat.ts`.
2.  **Details:**
    - Remove direct dependency on `AgentLanguageModel.Tag`.
    - Instead, inject and use `ChatOrchestratorService.Tag`.
    - When `sendMessage` is called:
      - Get the user's selected provider and model from its own state or props (e.g., `currentProviderKey`, `currentModelName`).
      - Call `chatOrchestrator.streamConversation({ messages: conversationHistory, preferredProvider: { key: currentProviderKey, modelName: currentModelName }, options: { temperature: 0.7 /* etc */ } })`.
      - The rest of the stream handling logic (updating `messages` state) remains largely the same, but error types might need adjustment if `ChatOrchestratorService` refines them.

**Task 6.5: Runtime Integration Update**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**

    - Import `ChatOrchestratorServiceLive`.
    - Add `ChatOrchestratorServiceLive` to `FullAppLayer`. Ensure its dependencies (`ConfigurationService`, `HttpClient.Tag`, `TelemetryService`, and potentially all concrete client Tags like `OpenAiClient.OpenAiClientTag`, `AnthropicClient.AnthropicClientTag`, `OllamaOpenAIClientTag` if `getResolvedAiModelProvider` builds clients internally using these tags) are met.

      ```typescript
      // src/services/runtime.ts
      // ...
      import { ChatOrchestratorServiceLive } from "@/services/ai/orchestration";
      // Import specific client layers if ChatOrchestratorServiceLive's getResolvedAiModelProvider
      // depends on them directly for client construction (as per the example).
      import { OpenAIClientLive } from "@/services/ai/providers/openai";
      import { AnthropicClientLive } from "@/services/ai/providers/anthropic";
      import { OllamaAsOpenAIClientLive } from "@/services/ai/providers/ollama";

      // ... other layer definitions (telemetryLayer, configLayer, httpClientLayer)

      const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
        Layer.provide(ConfigurationServiceLive),
        Layer.provide(BrowserHttpClient.layerXMLHttpRequest), // General HttpClient
        Layer.provide(telemetryLayer),
        // If getResolvedAiModelProvider directly uses client tags:
        // Layer.provide(OpenAIClientLive), // This client layer itself needs ConfigService & HttpClient
        // Layer.provide(AnthropicClientLive),
        // Layer.provide(OllamaAsOpenAIClientLive)
      );

      export const FullAppLayer = Layer.mergeAll(
        // ... existing service layers ...
        ConfigurationServiceLive, // Ensure this is high up
        BrowserHttpClient.layerXMLHttpRequest, // Ensure this is high up
        telemetryLayer, // Ensure this is high up
        openAIAgentLanguageModelLayer, // Example: provides AgentLanguageModel.Tag via OpenAI
        ollamaAgentLanguageModelLayer, // Provides AgentLanguageModel.Tag via Ollama (if selected)
        anthropicAgentLanguageModelLayer, // Provides AgentLanguageModel.Tag via Anthropic (if selected)
        chatOrchestratorLayer, // Provides ChatOrchestratorService.Tag
      );
      ```

    - **Refined `FullAppLayer` for `ChatOrchestratorService`:** The `ChatOrchestratorServiceLive` as implemented in Task 6.3 attempts to build client layers internally. This means `ChatOrchestratorServiceLive` itself needs `ConfigurationService` and `HttpClient.Tag` (for building those client layers). The concrete `AgentLanguageModel` layers (`openAIAgentLanguageModelLayer`, etc.) are _not_ direct dependencies of the orchestrator _if_ it fully rebuilds the `AiModel` chain. However, `useAgentChat` will now depend on `ChatOrchestratorService.Tag` instead of `AgentLanguageModel.Tag`.

---

**Verification for Phase 6:**

1.  **Type Checking:** Run `pnpm t`.
2.  **Unit Tests:**
    - `ChatOrchestratorService.test.ts`:
      - Mock `ConfigurationService` to provide different provider setups (OpenAI preferred, Anthropic fallback, etc.).
      - Mock the `AiModel` factories (`OpenAiLanguageModel.model`, etc.) or their resulting `Provider` methods (`generateText`, `streamText`) to simulate:
        - Successful response from preferred provider.
        - Retryable error from preferred, then success.
        - Non-retryable error from preferred, then success from fallback 1.
        - Failure from preferred, failure from fallback 1, success from fallback 2.
        - All providers failing.
      - Verify that the `AiPlan` logic correctly sequences calls and respects retry/fallback rules.
3.  **Runtime Initialization Test:** `src/tests/unit/services/runtime.test.ts` should pass.
4.  **UI Functionality (Manual Testing):**
    - In `AgentChatPane`:
      - Configure OpenAI as preferred. Test normal chat.
      - Simulate OpenAI API failure (e.g., by temporarily using an invalid API key or blocking network access to OpenAI). Verify that the chat attempts retries (if applicable for the error type) and then falls back to Anthropic (if configured and API key is valid).
      - Simulate Anthropic also failing, verify fallback to Ollama (if configured and running).
      - Observe console logs for telemetry events from the orchestrator indicating plan execution steps.

Upon completion, Commander's `AgentChat` pane will be significantly more resilient, automatically handling transient errors and provider outages by attempting retries and falling back to alternative LLMs as defined in the `AiPlan`. This forms a robust core for AI interactions.
