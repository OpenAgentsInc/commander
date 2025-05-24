## Commander AI Roadmap: Migrating to the New Effect AI Backend

**Objective:** Transition OpenAgents Commander to a new, robust, and provider-agnostic AI backend leveraging Effect and the `@effect/ai` ecosystem. This will enhance testability, composability, resilience, and support for advanced features like tool use and sophisticated execution planning.

**Guiding Principles:**

- **Provider Agnosticism:** Support various LLM providers (initially OpenAI-compatible and Anthropic) through a unified interface.
- **Effect-Native:** Utilize Effect for managing side effects, concurrency, error handling, and dependency injection (Layers).
- **Modularity & Testability:** Decouple AI logic from UI and specific provider implementations for easier testing and maintenance.
- **Resilience:** Implement robust error handling, retries, and fallbacks.
- **Extensibility:** Design for future integration of advanced features like tool use and diverse AI models.

---

**Phase 0: Foundation and Setup**

1.  **Dependencies:**
    - Add core Effect AI packages to `package.json`:
      - `@effect/ai` (for core abstractions)
      - `@effect/ai-openai` (for OpenAI and compatible providers)
      - `@effect/ai-anthropic` (for Anthropic provider)
    - Ensure `@effect/platform` and `@effect/platform-node` (or `@effect/platform-browser` for renderer-specific HTTP if not proxied) are available for `HttpClient` implementations.
2.  **Study Documentation:**
    - Thoroughly review the `effect/ai` documentation ([`01-introduction.md`](./docs/effect/ai/01-introduction.md), [`02-getting-started.md`](./docs/effect/ai/02-getting-started.md), [`03-execution-planning.md`](./docs/effect/ai/03-execution-planning.md), [`04-tool-use.md`](./docs/effect/ai/04-tool-use.md)).
    - Understand `AiModel`, `Provider`, `AiPlan`, `AiTool`, `AiToolkit`, and client layer configuration.
3.  **Establish Patterns:**
    - Define project-wide conventions for creating Effect services, layers, and using `Context` for AI-related functionalities.
    - Standardize error handling using custom tagged errors extending `Data.TaggedError`.

---

**Phase 1: Core AI Service Abstractions**

1.  **Define Core Service Tags and Interfaces (e.g., in `src/services/ai/`):**
    - **`AgentLanguageModel.Tag`**:
      - Interface mirroring `AiLanguageModel` from `@effect/ai`.
      - Methods: `generateText`, `streamText`, `generateStructured` (for future tool use).
    - **`AgentChatSession.Tag` (Conceptual, for managing conversation state):**
      - Interface: `addMessage(message: AgentChatMessage)`, `getHistory(options: { limit?: number }): AgentChatMessage[]`, `clearHistory()`.
      - This service will manage the conversation context provided to `AgentLanguageModel`.
    - **`AgentToolkit.Tag` (For future tool use):**
      - Interface mirroring `AiToolkit` from `@effect/ai`.
2.  **Define Data Structures and Schemas (using `@effect/schema`):**
    - **`AgentChatMessageSchema`**: `Schema.Struct({ role: Schema.Union(Schema.Literal("user"), Schema.Literal("assistant"), Schema.Literal("system")), content: Schema.String, name: Schema.optional(Schema.String), tool_calls: Schema.optional(Schema.Array(ToolCallSchema)), tool_call_id: Schema.optional(Schema.String) })`
    - **`ToolCallSchema` / `ToolResultSchema`** (align with `@effect/ai` when implementing tool use).
    - **`ProviderConfigSchema`**: Base schema for provider configurations (e.g., `apiKey`, `baseUrl`, `modelName`).
3.  **Define Custom AI Error Types:**
    - `AIGenericError(Data.TaggedError)`
    - `AIProviderError(AIGenericError)`: For errors specific to an LLM provider.
    - `AIConfigurationError(AIGenericError)`: For issues with AI service configuration.
    - `AIToolExecutionError(AIGenericError)`: For errors during tool execution.

---

**Phase 2: OpenAI-Compatible Provider Implementation**

1.  **`OpenAIClientLayer`:**
    - Create a `Layer` (e.g., `src/services/ai/providers/openai/OpenAIClientLive.ts`).
    - This layer will provide `OpenAiClient.OpenAiClient` (from `@effect/ai-openai`).
    - It depends on `ConfigurationService` to fetch:
      - `OPENAI_API_KEY` (from secure storage).
      - `OPENAI_BASE_URL` (optional, for self-hosted or alternative OpenAI-compatible endpoints).
    - Uses `OpenAiClient.layerConfig({ apiKey: Config.succeed(apiKey), baseUrl: Config.option(baseUrl) })`.
    - Requires `HttpClient` (likely `NodeHttpClient.layer` if this client lives in the main process, or `BrowserHttpClient.layerXMLHttpRequest` if in renderer and not proxied).
2.  **`OpenAIAgentLanguageModelLive`:**
    - Create a `Layer` (e.g., `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`) that provides `AgentLanguageModel.Tag`.
    - Dependencies: `OpenAIClientLayer` and `ConfigurationService` (for `OPENAI_MODEL_NAME`).
    - Implementation:
      ```typescript
      Effect.gen(function* (_) {
        const openAiClient = yield* _(OpenAIClient.OpenAiClient); // From OpenAIClientLayer
        const config = yield* _(ConfigurationService);
        const modelName = yield* _(
          config.get("OPENAI_MODEL_NAME", DefaultOpenAIModelName),
        );
        const aiModel = OpenAiLanguageModel.model(modelName); // From @effect/ai-openai
        const provider = yield* _(
          Effect.provideService(
            aiModel,
            OpenAIClient.OpenAiClient,
            openAiClient,
          ),
        );
        // Adapt 'provider' to match AgentLanguageModel.Tag interface if necessary
        return provider; // This 'provider' is of type Provider<AiLanguageModel>
      });
      ```
    - Map OpenAI-specific errors from the provider to custom `AIProviderError`s.
3.  **Configuration Integration:**
    - Update `ConfigurationService` to manage new settings: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`.
    - Ensure API keys are stored securely (e.g., using existing patterns if `SecureStorageService` is available, or OS keychain via Electron).

---

**Phase 3: Implement `AgentChat` Pane (Initial Version with OpenAI)**

1.  **New Pane Type & Store Logic:**
    - **Type:** Add `'agent_chat'` to `Pane['type']` in `src/types/pane.ts`.
    - **Constants:** Define `AGENT_CHAT_PANE_ID` and `AGENT_CHAT_PANE_TITLE` in `src/stores/panes/constants.ts`.
    - **Action:** Create `openAgentChatPaneAction` in `src/stores/panes/actions/` and integrate into `usePaneStore`.
2.  **UI Component (`src/components/ai/AgentChatPane.tsx`):**
    - A new component, similar in structure to `Nip28ChannelChat.tsx` or `Nip90ConsumerChatPane.tsx`.
    - Uses `ChatWindow.tsx` for message display and input.
    - Includes UI elements (e.g., dropdowns) for selecting the AI Provider (initially "OpenAI") and Model (e.g., "gpt-4o", "gpt-3.5-turbo" - fetched from `ConfigurationService` or hardcoded).
    - Displays loading indicators and error messages.
3.  **`useAgentChat` Hook (`src/hooks/useAgentChat.ts`):**
    - Manages state: `messages: AgentChatMessage[]`, `currentInput: string`, `isLoading: boolean`, `error: AIError | null`.
    - `sendMessage(prompt: string)` function:
      1.  Adds user message to `messages` state.
      2.  Sets `isLoading(true)`.
      3.  Yields `AgentLanguageModel.Tag` from `getMainRuntime().context`.
      4.  Prepares the full conversation history for the prompt.
      5.  Calls `agentLangModel.streamText({ prompt: conversationHistory })`.
      6.  Handles the `Stream<AiTextChunk, AiError>`:
          - On stream open, adds an empty assistant message with `isStreaming: true`.
          - For each `AiTextChunk`, appends `textChunk` to the streaming assistant message.
          - On stream end or error, sets `isStreaming: false` for the assistant message.
      7.  Updates `error` state if the stream fails.
      8.  Sets `isLoading(false)` upon completion or error.
4.  **Integration:**
    - Add `AgentChatPane` rendering logic to `PaneManager.tsx`.
    - Add a Hotbar button to trigger `openAgentChatPaneAction`.
5.  **Initial Runtime Integration:**
    - Add `OpenAIAgentLanguageModelLive` (composed with `OpenAIClientLayer`) to `FullAppLayer` in `src/services/runtime.ts`. Ensure `HttpClient` is provided.

---

**Phase 4: Refactor Ollama Integration as an OpenAI-Compatible Provider**

1.  **`OllamaClientLayer` (New or Adapt Existing IPC for `OpenAiClient` Interface):**
    - **Objective:** Create a layer that provides an `OpenAiClient.OpenAiClient`-like interface for Ollama.
    - **Strategy:**
      - The `OllamaServiceLive` (or a new `OllamaAsOpenAIClientLive`) will need to satisfy the methods expected by `OpenAiLanguageModel.model()`, specifically the chat completions endpoint (`/v1/chat/completions`).
      - The existing IPC mechanism (`ollama-context.ts`, `ollama-listeners.ts`) will be used by this client layer to proxy requests to the main process where the actual HTTP call to Ollama is made using `@effect/platform-node/NodeHttpClient`.
      - The IPC handler in `ollama-listeners.ts` for `/v1/chat/completions` must correctly implement request/response translation to/from Ollama's native format and the OpenAI format, including streaming (SSE).
    - This layer will effectively be a "Ollama-to-OpenAI-Adapter Client".
2.  **`OllamaAgentLanguageModelLive`:**
    - Create a `Layer` that provides `AgentLanguageModel.Tag` specifically for Ollama.
    - Dependencies: The `OllamaClientLayer` (from step 1) and `ConfigurationService` (for Ollama base URL, default model like `gemma3:1b`).
    - Implementation:
      ```typescript
      Effect.gen(function* (_) {
        const ollamaClient = yield* _(OllamaClientTag); // Tag for the Ollama-to-OpenAI-Adapter Client
        const config = yield* _(ConfigurationService);
        const modelName = yield* _(
          config.get("OLLAMA_MODEL_NAME", DefaultOllamaModelName),
        );
        // Use OpenAiLanguageModel.model() but with the ollamaClient that speaks OpenAI format via Ollama
        const aiModel = OpenAiLanguageModel.model(modelName);
        const provider = yield* _(
          Effect.provideService(
            aiModel,
            OpenAIClient.OpenAiClient,
            ollamaClient,
          ),
        );
        return provider;
      });
      ```
3.  **Update `ConfigurationService`:** Add settings for `OLLAMA_BASE_URL`, `OLLAMA_MODEL_NAME`.
4.  **UI Selection:** Allow "Ollama" as a provider choice in `AgentChatPane`, which dynamically uses `OllamaAgentLanguageModelLive`.
5.  **Refactor Existing Ollama Users:**
    - Modify `Nip90ConsumerChatPane`'s `useNip90ConsumerChat.ts` to use `AgentLanguageModel.Tag` when Ollama is selected/configured.
    - Modify `Kind5050DVMService` (for its `processLocalTestJob` and actual DVM processing) to use `AgentLanguageModel.Tag` for Ollama calls. This ensures consistent API interaction.

---

**Phase 5: Anthropic Provider Implementation**

1.  **`AnthropicClientLayer`:**
    - Create a `Layer` (e.g., `src/services/ai/providers/anthropic/AnthropicClientLive.ts`).
    - Provides `AnthropicClient.AnthropicClient` (from `@effect/ai-anthropic`).
    - Depends on `ConfigurationService` for `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` (optional).
    - Uses `AnthropicClient.layerConfig({ apiKey: Config.succeed(apiKey) })`.
    - Requires `HttpClient`.
2.  **`AnthropicAgentLanguageModelLive`:**
    - Create a `Layer` providing `AgentLanguageModel.Tag`.
    - Dependencies: `AnthropicClientLayer`, `ConfigurationService` (for `ANTHROPIC_MODEL_NAME`).
    - Uses `AnthropicLanguageModel.model()` from `@effect/ai-anthropic`.
    - Maps Anthropic errors to `AIProviderError`.
3.  **Configuration:** Add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_NAME` to `ConfigurationService`.
4.  **UI Selection:** Allow "Anthropic" in `AgentChatPane`.

---

**Phase 6: Execution Planning & Resilience with `AiPlan`**

1.  **`ChatOrchestratorService` (New Service):**
    - Create `src/services/ai/ChatOrchestratorService.ts`.
    - Interface method: `streamConversation(messages: AgentChatMessage[], preferredProviderConfig: ProviderConfig): Stream.Stream<AgentChatMessageChunk, AIProviderError | AIConfigurationError>`.
    - Implementation:
      - Takes the preferred provider and model from `preferredProviderConfig`.
      - Dynamically builds the primary `AiModel` (e.g., `OpenAiLanguageModel.model(...)`) and its client `Layer` based on the config.
      - Defines fallback `AiModel`s (e.g., Anthropic, then Ollama) similarly.
      - Constructs an `AiPlan` using `AiPlan.make`:
        - Primary model attempt: Retry on network errors (e.g., `Schedule.recurs(3).pipe(Schedule.addDelay(() => "1 seconds"))`).
        - Fallback 1 (e.g., Anthropic): If primary fails with `AIProviderError` (non-retryable) or max retries reached.
        - Fallback 2 (e.g., Ollama): If Fallback 1 also fails.
      - Builds the `AiPlan` into a `Provider<AiLanguageModel>`.
      - Uses this provider's `streamText` method.
    - The `ChatOrchestratorServiceLive` layer will depend on `ConfigurationService` and `HttpClient` (for dynamically building client layers).
2.  **Refactor `useAgentChat`:**
    - Remove direct dependency on `AgentLanguageModel.Tag`.
    - Instead, call `ChatOrchestratorService.streamConversation`, passing current messages and the selected provider/model config from the UI.
3.  **Runtime Integration:** Add `ChatOrchestratorServiceLive` to `FullAppLayer`.

---

**Phase 7: Tool Use Integration (Foundation)**

1.  **Define Tools with `AiTool` and `@effect/schema`:**

    - Create example tools (e.g., in `src/services/ai/tools/`).
    - Example `GetCurrentWeatherTool`:

      ```typescript
      const GetWeatherParams = Schema.Struct({ city: Schema.String });
      const GetWeatherSuccess = Schema.Struct({
        temperature: Schema.String,
        description: Schema.String,
      });
      const GetWeatherError = Schema.TaggedError("GetWeatherError")<{
        message: string;
      }>();

      const GetCurrentWeatherTool = AiTool.make("get_current_weather", {
        description: "Fetches the current weather for a given city.",
        parameters: GetWeatherParams,
        success: GetWeatherSuccess,
        failure: GetWeatherError,
      });
      ```

2.  **`ToolHandlerService` (New Service):**
    - Manages a registry of available tools and their handlers.
    - `registerTool<I, S, E>(tool: AiTool.AiTool<I, S, E>, handler: (input: I) => Effect.Effect<S, E>)`
    - `executeTool(toolName: string, args: unknown): Effect.Effect<any, AIToolExecutionError | any>`: Decodes args against the tool's schema, calls the handler, encodes success/failure.
3.  **Create `CommanderToolkit` (extends `AiToolkit`):**
    - Dynamically builds an `AiToolkit` instance from tools registered with `ToolHandlerService`.
    - `CommanderToolkitLive` layer will provide this specific toolkit.
4.  **Update `ChatOrchestratorService`:**
    - Depend on `CommanderToolkit.Tag`.
    - When calling `AgentLanguageModel` (via `AiPlan`), use methods that support tool calling (e.g., `generateStructuredMessages` from `OpenAiLanguageModel` or equivalent). Pass the `CommanderToolkit` instance.
    - Message loop:
      - User prompt -> LLM.
      - If LLM requests tool call -> `ChatOrchestratorService` uses `ToolHandlerService` to execute.
      - Tool result -> LLM (for final response).
      - LLM final response -> User.
5.  **UI Updates in `AgentChatPane`:**
    - Display "Agent is using tool: [tool_name] with params: [params]" messages.
    - Display tool results (or errors) before the agent's final response based on that result.

---

**Phase 8: Testing and Refinement**

1.  **Unit Tests:**
    - Mock `HttpClient` responses for provider client layers.
    - Test `AgentLanguageModel` implementations for each provider.
    - Test `ChatOrchestratorService` with mock `AiModel`s to verify `AiPlan` logic (retries, fallbacks).
    - Test `ToolHandlerService` and individual tool handlers.
    - Test `useAgentChat` hook with mocked `ChatOrchestratorService`.
2.  **Integration Tests:**
    - Test `AgentChatPane` -> `ChatOrchestratorService` -> (Mocked) Provider flow.
    - Test tool calling flow from UI to tool execution and back to UI.
3.  **E2E Tests:**
    - Set up local Ollama. Test chat interactions via `AgentChatPane` with Ollama provider.
    - If possible, test against a sandboxed OpenAI-compatible API or actual OpenAI with dev keys for full flow testing.

---

This roadmap provides a structured approach to migrating Commander to the new Effect AI backend, progressively adding features and ensuring robustness. Each phase builds upon the previous, leading to a flexible and powerful AI integration.

````markdown
# Commander AI Roadmap: Migrating to the New Effect AI Backend

**Objective:** Transition OpenAgents Commander to a new, robust, and provider-agnostic AI backend leveraging Effect and the `@effect/ai` ecosystem. This will enhance testability, composability, resilience, and support for advanced features like tool use and sophisticated execution planning.

**Guiding Principles:**

- **Provider Agnosticism:** Support various LLM providers (initially OpenAI-compatible and Anthropic) through a unified interface.
- **Effect-Native:** Utilize Effect for managing side effects, concurrency, error handling, and dependency injection (Layers).
- **Modularity & Testability:** Decouple AI logic from UI and specific provider implementations for easier testing and maintenance.
- **Resilience:** Implement robust error handling, retries, and fallbacks.
- **Extensibility:** Design for future integration of advanced features like tool use and diverse AI models.

---

## Phase 0: Foundation and Setup

1.  **Install Dependencies:**
    - Add core Effect AI packages to `package.json`:
      - `@effect/ai` (for core abstractions)
      - `@effect/ai-openai` (for OpenAI and compatible providers)
      - `@effect/ai-anthropic` (for Anthropic provider)
    - Ensure `@effect/platform` (for `HttpClient`), `@effect/platform-node` (for main process HTTP), and `@effect/platform-browser` (for renderer HTTP if needed) are correctly configured.
2.  **Documentation Review:**
    - Thoroughly review the official `effect/ai` documentation, focusing on:
      - Core concepts: `AiModel`, `Provider<Service>` (from `AiModel.use()`).
      - Provider packages: `OpenAiLanguageModel`, `AnthropicLanguageModel`, client configuration layers (`OpenAiClient.layerConfig`, `AnthropicClient.layerConfig`).
      - Execution planning: `AiPlan` for retries and fallbacks.
      - Tool use: `AiTool`, `AiToolkit`, and schema-based parameters/responses.
3.  **Establish Effect-TS Coding Patterns:**
    - Define project-wide conventions for creating Effect services (using `Context.Tag`) and layers (`Layer.effect`, `Layer.succeed`).
    - Standardize error handling: Define custom tagged errors (e.g., `AIProviderError`, `AIConfigurationError`) extending `Data.TaggedError` for domain-specific AI failures.
    - Utilize `@effect/schema` for all data structures related to AI interactions (messages, tool parameters, configurations).

---

## Phase 1: Core AI Service Abstractions

**Location:** `src/services/ai/core/`

1.  **Define Core Service Tags and Interfaces:**
    - **`AgentLanguageModel.Tag`**: An Effect `Context.Tag` for a service interface that mirrors `AiLanguageModel` from `@effect/ai`.
      - Methods: `generateText(params): Effect<AiResponse, AiError>`, `streamText(params): Stream<AiTextChunk, AiError>`, `generateStructured(params): Effect<AiResponse, AiError>` (for structured output/tool use).
      - Params and return types (`AiResponse`, `AiTextChunk`, `AiError`) should align with `@effect/ai` types.
    - **`AgentChatSession.Tag` (Conceptual - for conversation management):**
      - Interface methods: `addMessage(message: AgentChatMessage): Effect<void>`, `getHistory(options: { limit?: number }): Effect<AgentChatMessage[]>`, `clearHistory(): Effect<void>`.
      - This service will encapsulate logic for maintaining conversation history, including potential context window management (truncation, summarization - future). It will be used by UI-facing services to prepare prompts for `AgentLanguageModel`.
    - **`AgentToolkitManager.Tag` (Conceptual - for managing available tools):**
      - Interface methods: `getToolkit(): Effect<AiToolkit>`, `registerTool(tool: AiTool): Effect<void>`.
      - This service will be responsible for dynamically building the `AiToolkit` instance to be passed to `AgentLanguageModel` calls that support tool use.
2.  **Define Data Structures and Schemas (using `@effect/schema`):**
    - **`AgentChatMessageSchema`**:
      ```typescript
      import { Schema } from "@effect/schema";
      export const AgentChatMessageSchema = Schema.Struct({
        role: Schema.Union(
          Schema.Literal("user"),
          Schema.Literal("assistant"),
          Schema.Literal("system"),
        ),
        content: Schema.String,
        name: Schema.optional(Schema.String),
        // Placeholder for tool call related fields, to be aligned with @effect/ai
        // tool_calls: Schema.optional(Schema.Array(Schema.Any)),
        // tool_call_id: Schema.optional(Schema.String),
      });
      export type AgentChatMessage = Schema.Schema.Type<
        typeof AgentChatMessageSchema
      >;
      ```
    - **Provider Configuration Schemas:**
      - `BaseProviderConfigSchema`: `Schema.Struct({ modelName: Schema.String,isEnabled: Schema.Boolean })`
      - `ApiKeyProviderConfigSchema`: Extends `BaseProviderConfigSchema` with `apiKey: Schema.String`.
      - `UrlProviderConfigSchema`: Extends `BaseProviderConfigSchema` with `baseUrl: Schema.String`.
3.  **Define Custom AI Error Types (extending `Data.TaggedError`):**
    - `AIError.ts`:
      - `AIGeneralicError`: Base error for AI system.
      - `AIProviderError`: For errors from LLM providers (e.g., API errors, rate limits). Include provider name context.
      - `AIConfigurationError`: For issues with AI service/provider configuration (e.g., missing API key).
      - `AIToolExecutionError`: For errors during the execution of an agent tool.
      - `AIContextWindowError`: For issues related to exceeding context limits.

---

## Phase 2: OpenAI-Compatible Provider Implementation

**Location:** `src/services/ai/providers/openai/`

1.  **`OpenAIClientLive.ts` Layer:**

    - Purpose: Provides a configured `OpenAiClient.OpenAiClient` (from `@effect/ai-openai`).
    - Dependencies: `ConfigurationService` (from Commander's existing services), `HttpClient.Tag` (from `@effect/platform`).
    - Implementation:

      ```typescript
      import { Layer, Effect, Config } from "effect";
      import { OpenAiClient } from "@effect/ai-openai";
      import { ConfigurationService } from "@/services/configuration"; // Assuming path
      import { HttpClient } from "@effect/platform";

      export const OpenAIClientLive = Layer.effect(
        OpenAiClient.OpenAiClient,
        Effect.gen(function* (_) {
          const configService = yield* _(ConfigurationService);
          // Fetch API Key securely and base URL from ConfigurationService
          const apiKey = yield* _(configService.getSecret("OPENAI_API_KEY")); // Example
          const baseUrl = yield* _(
            Effect.optional(configService.get("OPENAI_BASE_URL")),
          );

          const clientConfig = {
            apiKey: Config.succeed(apiKey),
            baseUrl: Config.option(
              baseUrl.pipe(Effect.map((url) => url || undefined)),
            ), // Ensure undefined if empty
          };
          // OpenAiClient.layerConfig returns Layer<OpenAiClient, never, HttpClient>
          // We need to provide HttpClient to it.
          const clientLayer = OpenAiClient.layerConfig(clientConfig);
          return yield* _(
            Effect.provide(clientLayer, yield* _(HttpClient.Tag)),
          ); // Provide HttpClient
        }),
      );
      ```

2.  **`OpenAIAgentLanguageModelLive.ts` Layer:**

    - Purpose: Provides `AgentLanguageModel.Tag` using the OpenAI provider.
    - Dependencies: `OpenAIClient.OpenAiClient` (from `OpenAIClientLive`), `ConfigurationService`.
    - Implementation:

      ```typescript
      import { Layer, Effect } from "effect";
      import { AgentLanguageModel } from "@/services/ai/core"; // Your core tag
      import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
      import { ConfigurationService } from "@/services/configuration";
      import { AIProviderError } from "@/services/ai/core/AIError"; // Your custom error

      export const OpenAIAgentLanguageModelLive = Layer.effect(
        AgentLanguageModel.Tag,
        Effect.gen(function* (_) {
          const openAiClient = yield* _(OpenAiClient.OpenAiClient);
          const configService = yield* _(ConfigurationService);
          const modelName = yield* _(
            configService.get("OPENAI_MODEL_NAME", "gpt-4o"),
          ); // Default model

          const aiModelEffect = OpenAiLanguageModel.model(modelName); // This is Effect<AiModel<...>, ConfigError, OpenAiClient>
          const aiModel = yield* _(
            Effect.provideService(
              aiModelEffect,
              OpenAiClient.OpenAiClient,
              openAiClient,
            ),
          );

          // aiModel is AiModel<AiLanguageModel, never>
          // We need Provider<AiLanguageModel>
          const provider = yield* _(aiModel); // Builds AiModel into Provider

          // Adapt 'provider' methods to match AgentLanguageModel.Tag interface if there are minor differences
          // and map errors to AIProviderError.
          return AgentLanguageModel.Tag.of({
            generateText: (params) =>
              provider
                .generateText(params)
                .pipe(
                  Effect.mapError(
                    (err) =>
                      new AIProviderError({
                        message: err.message,
                        cause: err,
                        provider: "OpenAI",
                      }),
                  ),
                ),
            streamText: (params) =>
              provider
                .streamText(params)
                .pipe(
                  Stream.mapError(
                    (err) =>
                      new AIProviderError({
                        message: err.message,
                        cause: err,
                        provider: "OpenAI",
                      }),
                  ),
                ),
            generateStructured: (params) =>
              provider
                .generateStructured(params)
                .pipe(
                  Effect.mapError(
                    (err) =>
                      new AIProviderError({
                        message: err.message,
                        cause: err,
                        provider: "OpenAI",
                      }),
                  ),
                ),
          });
        }),
      );
      ```

3.  **Integrate into `ConfigurationService`:**
    - Add schemas and methods for managing OpenAI provider settings: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME`, `OPENAI_ENABLED`.
    - API keys must be stored securely (e.g., Electron `safeStorage` or OS keychain, abstracted via a `SecureStorageService`).

---

## Phase 3: Implement `AgentChat` Pane (using OpenAI)

1.  **New Pane Type & Store Logic:**
    - **Type:** Add `'agent_chat'` to `Pane['type']` in `src/types/pane.ts`.
    - **Constants:** Define `AGENT_CHAT_PANE_ID = 'agent_chat_main'` and `AGENT_CHAT_PANE_TITLE = 'Agent Chat'` in `src/stores/panes/constants.ts`.
    - **Action:** Create `openAgentChatPaneAction(set)` in `src/stores/panes/actions/`, using `addPaneActionLogic`. Integrate into `usePaneStore`.
2.  **UI Component (`src/components/ai/AgentChatPane.tsx`):**
    - Structure: Similar to `Nip28ChannelChat.tsx`.
    - Use `ChatWindow.tsx` for message display and input.
    - UI Elements:
      - Dropdown to select AI Provider (initially hardcoded/defaulted to "OpenAI").
      - Dropdown to select Model (e.g., "gpt-4o", "gpt-3.5-turbo", fetched from `ConfigurationService` for the selected provider).
    - Display loading states (e.g., spinner while agent is responding) and error messages.
3.  **`useAgentChat` Hook (`src/hooks/useAgentChat.ts`):**
    - State: `messages: AgentChatMessage[]`, `currentInput: string`, `isLoading: boolean`, `error: AIError | null`, `currentProvider: string`, `currentModel: string`.
    - `sendMessage(promptText: string)` function:
      1.  Adds user message (`{role: "user", content: promptText}`) to `messages`.
      2.  Sets `isLoading(true)`, `error(null)`.
      3.  Constructs the full conversation history from `messages`.
      4.  Gets the `AgentLanguageModel` service from `getMainRuntime().context`.
      5.  Invokes `agentLangModel.streamText({ prompt: conversationHistoryObject })` (Note: `prompt` for `streamText` in `@effect/ai` typically takes the entire structured prompt including history, not just the last message).
      6.  Handles the `Stream<AiTextChunk, AiError>`:
          - On stream open, add an empty assistant message (`{role: "assistant", content: "", isStreaming: true}`) to `messages`.
          - For each `AiTextChunk` received, append `textChunk.text` to the `content` of the streaming assistant message. Ensure React sees this as a state update (e.g., by creating a new message object or using an update counter).
          - On stream completion or error, set `isStreaming: false` for the assistant message.
      7.  Updates `error` state if the stream fails, mapping the error to a user-friendly message.
      8.  Sets `isLoading(false)` upon completion or error.
    - Effect for fetching available models when `currentProvider` changes.
4.  **Integration:**
    - Add `AgentChatPane` rendering logic to `PaneManager.tsx`.
    - Add a "New Agent Chat" button to the Hotbar (or other appropriate UI location) to trigger `openAgentChatPaneAction`.
5.  **Runtime Integration:**
    - Add `OpenAIAgentLanguageModelLive` (composed with `OpenAIClientLive` and its dependencies like `HttpClient`) to `FullAppLayer` in `src/services/runtime.ts`.

---

## Phase 4: Refactor Ollama as an OpenAI-Compatible Provider

**Location:** `src/services/ai/providers/ollama/`

1.  **`OllamaAsOpenAIClientLive.ts` Layer:**
    - **Purpose:** Provide an `OpenAiClient.OpenAiClient`-compatible interface that internally calls the local Ollama instance.
    - **Dependencies:** `ConfigurationService` (for Ollama base URL), `HttpClient.Tag`.
    - **IPC Proxying:**
      - The `HttpClient` used by this layer for Ollama calls should be proxied through Electron's main process to avoid CORS/CSP issues in the renderer.
      - Modify/reuse `ollama-listeners.ts` in `src/helpers/ipc/ollama/` to handle requests to Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`). This IPC handler will use `NodeHttpClient` (from `@effect/platform-node`) to make the actual HTTP request to the Ollama server.
      - The `OllamaAsOpenAIClientLive` layer in the renderer will use a special `HttpClient` implementation that forwards requests over IPC to these main process handlers.
    - **Implementation:**
      - Implement the necessary methods of `OpenAiClient.OpenAiClient` (primarily `chat.completions.create`).
      - Translate OpenAI-formatted requests to Ollama's native request structure if needed (though Ollama's `/v1` endpoint aims for compatibility).
      - Handle Ollama's response (including SSE for streaming) and translate it back to the OpenAI-compatible format expected by `@effect/ai-openai`'s `OpenAiLanguageModel`.
2.  **`OllamaAgentLanguageModelLive.ts` Layer:**
    - Purpose: Provides `AgentLanguageModel.Tag` for Ollama.
    - Dependencies: `OllamaAsOpenAIClientLive` (from step 1), `ConfigurationService` (for Ollama model name, e.g., "gemma3:1b").
    - Implementation: Similar to `OpenAIAgentLanguageModelLive`, but uses `OllamaAsOpenAIClientLive`.
      ```typescript
      // ...
      const ollamaAsOpenAIClient = yield * _(OllamaOpenAIClientTag); // Tag for the adapter client
      const modelName =
        yield * _(configService.get("OLLAMA_MODEL_NAME", "gemma3:1b"));
      const aiModelEffect = OpenAiLanguageModel.model(modelName); // Still uses OpenAiLanguageModel
      const aiModel =
        yield *
        _(
          Effect.provideService(
            aiModelEffect,
            OpenAiClient.OpenAiClient,
            ollamaAsOpenAIClient,
          ),
        );
      const provider = yield * _(aiModel);
      // Adapt and map errors to AIProviderError with provider: "Ollama"
      // ...
      ```
3.  **Update `ConfigurationService`:** Add/verify settings for `OLLAMA_BASE_URL` and `OLLAMA_MODEL_NAME`.
4.  **UI Selection:** Enable "Ollama" as a provider choice in `AgentChatPane`. This will involve dynamically selecting the correct `AgentLanguageModel` implementation based on user choice (e.g., using a factory or conditional provider in the runtime context for the pane).
5.  **Refactor Existing Ollama Users:**
    - Modify `Kind5050DVMService` and `Nip90ConsumerChatPane`'s `useNip90ConsumerChat.ts` to depend on `AgentLanguageModel.Tag`. When their configuration points to an Ollama model, the `OllamaAgentLanguageModelLive` implementation will be used.
    - This ensures all Ollama interactions go through the new, standardized AI backend. Remove direct calls to `OllamaService` if it's fully superseded.

---

## Phase 5: Anthropic Provider Implementation

**Location:** `src/services/ai/providers/anthropic/`

1.  **`AnthropicClientLive.ts` Layer:**
    - Provides `AnthropicClient.AnthropicClient` (from `@effect/ai-anthropic`).
    - Depends on `ConfigurationService` (for `ANTHROPIC_API_KEY`, optional `ANTHROPIC_BASE_URL`) and `HttpClient.Tag`.
    - Uses `AnthropicClient.layerConfig()`.
2.  **`AnthropicAgentLanguageModelLive.ts` Layer:**
    - Provides `AgentLanguageModel.Tag`.
    - Depends on `AnthropicClient.AnthropicClient`, `ConfigurationService` (for `ANTHROPIC_MODEL_NAME`).
    - Uses `AnthropicLanguageModel.model()` from `@effect/ai-anthropic`.
    - Maps Anthropic errors to `AIProviderError` (provider: "Anthropic").
3.  **Configuration:** Add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_NAME`, `ANTHROPIC_ENABLED` to `ConfigurationService`.
4.  **UI Selection:** Enable "Anthropic" in `AgentChatPane`.
5.  **Runtime Integration:** Add `AnthropicAgentLanguageModelLive` (composed with its client layer) to `FullAppLayer`.

---

## Phase 6: Execution Planning & Resilience (`AiPlan`)

1.  **`ChatOrchestratorService.Tag` (New Service):**

    - **Location:** `src/services/ai/orchestration/`
    - **Interface:** `streamConversation(messages: AgentChatMessage[], preferredProviderKey: string): Stream.Stream<AgentChatMessageChunk, AIProviderError | AIConfigurationError>`
      - `preferredProviderKey` could be e.g., "openai", "anthropic", "ollama".
    - **Implementation (`ChatOrchestratorServiceLive`):**

      - Depends on `ConfigurationService`, `HttpClient.Tag`, and all individual `AgentLanguageModel` provider layers (or a way to dynamically construct them).
      - Inside `streamConversation`:

        1.  Fetch configurations for preferred, primary fallback, and secondary fallback providers from `ConfigurationService`.
        2.  Dynamically construct the `AiModel` and their respective client layers for each provider in the plan. This is complex with Effect Layers; an alternative is to have pre-composed `AgentLanguageModel` services for each provider type and select them. For simplicity, let's assume we can get handles to the different `AgentLanguageModel` implementations.
        3.  Example `AiPlan` construction:
            ```typescript
            const primaryModelEffect = getLanguageModelForProvider(preferredProviderKey); // Helper to get the Effect<AgentLanguageModel,...>
            const fallback1Effect = getLanguageModelForProvider("anthropic_default");
            const fallback2Effect = getLanguageModelForProvider("ollama_default");

                const plan = AiPlan.make(
                  {
                    model: primaryModelEffect, // Effect that yields the AiModel Provider
                    attempts: 3,
                    schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered),
                    while: (error) => error._tag === "AIProviderError" && error.isRetryable, // Hypothetical property
                  },
                  { // Fallback 1
                    model: fallback1Effect,
                    attempts: 2,
                    while: (error) => error._tag === "AIProviderError", // Fallback on any provider error
                  },
                  { // Fallback 2
                    model: fallback2Effect,
                    attempts: 1
                  }
                );
                const plannedModelProvider = yield* _(plan.pipe(Effect.provide(/* needed context for model building */)));
                return plannedModelProvider.streamText({ prompt: conversationHistoryObject });
                ```

            _Note: Providing context to dynamically built `AiModel`s within `AiPlan.make` needs careful handling with Effect Layers. It might be easier to have `AiPlan` take already built `Provider<AiLanguageModel>` instances._

2.  **Refactor `useAgentChat`:**
    - Call `ChatOrchestratorService.streamConversation` instead of `AgentLanguageModel.Tag` directly.
    - Pass the user's selected provider key (from UI) to the orchestrator.
3.  **Runtime Integration:** Add `ChatOrchestratorServiceLive` to `FullAppLayer`.

---

## Phase 7: Tool Use Integration (Foundation)

1.  **Define Tools with `AiTool` and `@effect/schema`:**

    - Create a `src/services/ai/tools/` directory.
    - Example: `WeatherTool.ts`:

      ```typescript
      import { Schema } from "@effect/schema";
      import { AiTool } from "@effect/ai";
      import { Effect } from "effect"; // For handler

      export const GetWeatherParamsSchema = Schema.Struct({
        city: Schema.String,
      });
      export const GetWeatherSuccessSchema = Schema.Struct({
        temperature: Schema.String,
        description: Schema.String,
      });
      export class GetWeatherError extends Data.TaggedError("GetWeatherError")<{
        message: string;
      }>() {}

      export const GetCurrentWeatherTool = AiTool.make("get_current_weather", {
        description: "Fetches the current weather for a given city.",
        parameters: GetWeatherParamsSchema,
        success: GetWeatherSuccessSchema,
        failure: Schema.union(GetWeatherError), // AiTool expects Schema for failure
      });

      // Example Handler (would live in a service)
      export const handleGetCurrentWeather = (
        input: Schema.Schema.Type<typeof GetWeatherParamsSchema>,
      ) => Effect.succeed({ temperature: "72F", description: "Sunny" }); // Mock handler
      ```

2.  **`ToolHandlerService.Tag` (New Service):**
    - Methods: `executeTool(toolName: string, encodedArgs: unknown): Effect.Effect<Schema.Schema.Type<AiToolSuccessSchema>, Schema.Schema.Type<AiToolFailureSchema> | AIToolExecutionError>`.
    - Internally, it will find the registered tool by `toolName`, decode `encodedArgs` using the tool's `parameters` schema, call the tool's actual handler `Effect`, and then encode the success or failure using the tool's `success` or `failure` schemas.
3.  **`CommanderToolkitManagerLive.ts` Layer:**
    - Provides `AgentToolkitManager.Tag`.
    - On initialization, it registers all available tools (e.g., `GetCurrentWeatherTool`) with their handlers (which might themselves be other Effect services).
    - `getToolkit()` method returns an `AiToolkit` instance built from these registered tools.
4.  **Update `ChatOrchestratorService`:**
    - Depend on `AgentToolkitManager.Tag` to get the `AiToolkit`.
    - When calling `AgentLanguageModel`, use methods that support tool calling (e.g., from `@effect/ai-openai`: `OpenAiLanguageModel.chat.completions.toolMessages(...)`). Pass the `AiToolkit` instance.
    - **Message Loop for Tool Calls:**
      1.  User sends prompt.
      2.  LLM responds. If it's a request for a tool call:
          - `ChatOrchestratorService` receives the tool call details.
          - Displays "Agent is using tool: [tool_name]..." in `AgentChatPane`.
          - Invokes `ToolHandlerService.executeTool(toolName, args)`.
          - Sends the tool's success or failure result back to the LLM.
      3.  LLM processes tool result and generates a final response.
      4.  Final response is streamed to `AgentChatPane`.
5.  **UI Updates (`AgentChatPane.tsx`):**
    - Render messages indicating tool usage ("Agent is using tool X...").
    - Render tool results before the agent's subsequent response.

---

## Phase 8: Testing, Refinement, and Advanced Features

1.  **Comprehensive Testing:**
    - **Unit Tests:**
      - Mock `HttpClient` for provider client layers. Test request/response formatting, error mapping.
      - Test `AgentLanguageModel` provider implementations against mocked clients.
      - Test `ChatOrchestratorService` with various `AiPlan` configurations (mocking the underlying `AiModel`s).
      - Test `ToolHandlerService` and individual tool handlers with mocked dependencies.
      - Test `useAgentChat` hook with a mocked `ChatOrchestratorService`.
    - **Integration Tests:** Test flows from `AgentChatPane` -> `ChatOrchestratorService` -> (Mocked) Provider. Test tool calling from UI to execution and back.
    - **E2E Tests:** Test live chat with local Ollama. Test with sandboxed OpenAI/Anthropic if feasible.
2.  **Advanced Features:**
    - **Context Window Management:** Implement strategies in `AgentChatSession` for message truncation or summarization (potentially using another `AgentLanguageModel` call) when context limits are approached.
    - **Persistent Chat History:** Integrate with PGlite (as per `docs/pglite.md`) via a new `ChatHistoryRepository` service used by `AgentChatSession`.
    - **UI/UX Refinements:** More sophisticated provider/model selection, display of `AiPlan` status, tool execution visualization.
    - User-configurable `AiPlan` strategies.
````
