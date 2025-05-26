# AI Backend and Orchestration System Architecture

## Table of Contents
1.  [Overview](#1-overview)
2.  [Architecture Diagram](#2-architecture-diagram)
3.  [Core AI Abstractions (`src/services/ai/core/`)](#3-core-ai-abstractions-srcservicesaicore)
    3.1.  [`AgentLanguageModel.Tag` & Interface](#31-agentlanguagemodeltag--interface)
    3.2.  [`AgentChatMessageSchema` & Type](#32-agentchatmessageschema--type)
    3.3.  [`AiResponse` & `AiTextChunk` (Application Types)](#33-airesponse--aitextchunk-application-types)
    3.4.  [`AIError` Types](#34-aierror-types)
    3.5.  [`ProviderConfig` Schemas](#35-providerconfig-schemas)
    3.6.  [`AgentToolkitManager.Tag` & `ToolHandlerService.Tag`](#36-agenttoolkitmanagertag--toolhandlerservicetag)
4.  [Provider Implementations (`src/services/ai/providers/`)](#4-provider-implementations-srcservicesaiproviders)
    4.1.  [General Provider Pattern](#41-general-provider-pattern)
    4.2.  [OpenAI-Compatible Provider (e.g., OpenAI API)](#42-openai-compatible-provider-eg-openai-api)
    4.3.  [Ollama Provider (as OpenAI-Compatible)](#43-ollama-provider-as-openai-compatible)
    4.4.  [Anthropic Provider](#44-anthropic-provider)
    4.5.  [Claude Code CLI Provider (via Bridge Service)](#45-claude-code-cli-provider-via-bridge-service)
    4.6.  [NIP-90 DVM Provider](#46-nip-90-dvm-provider)
5.  [Orchestration Layer (`src/services/ai/orchestration/`)](#5-orchestration-layer-srcservicesaiorchestration)
    5.1.  [`ChatOrchestratorService.Tag` & Interface](#51-chatorchestratorservicetag--interface)
    5.2.  [`ChatOrchestratorServiceLive` Layer](#52-chatorchestratorservicelive-layer)
    5.3.  [Resilience with `AiPlan`](#53-resilience-with-aiplan)
6.  [Tool Use Framework (`src/services/ai/tools/`)](#6-tool-use-framework-srcservicesaitools)
    6.1.  [Defining Tools (`AiTool` & Schemas)](#61-defining-tools-aitool--schemas)
    6.2.  [`ToolHandlerService`](#62-toolhandlerservice)
    6.3.  [`CommanderToolkitManager`](#63-commandertoolkitmanager)
    6.4.  [Tool Calling Loop in `ChatOrchestratorService`](#64-tool-calling-loop-in-chatorchestratorservice)
7.  [UI Integration](#7-ui-integration)
    7.1.  [`useAgentChat` Hook](#71-useagentchat-hook)
    7.2.  [`AgentChatPane.tsx` Component](#72-agentchatpanetsx-component)
    7.3.  [`agentChatStore.ts`](#73-agentchatstorets)
8.  [Configuration Management](#8-configuration-management)
9.  [Error Handling](#9-error-handling)
10. [Telemetry](#10-telemetry)
11. [Testing Strategy](#11-testing-strategy)
12. [Future Considerations](#12-future-considerations)

## 1. Overview

The AI Backend and Orchestration System in OpenAgents Commander is a sophisticated, provider-agnostic framework designed to manage interactions with various Large Language Models (LLMs). Built entirely with Effect-TS, it emphasizes robustness, testability, composability, and resilience. The system allows users to seamlessly switch between local models (Ollama), cloud-based APIs (OpenAI, Anthropic), decentralized NIP-90 Data Vending Machines, and specialized CLI tools like Claude Code, all through a unified interface.

**Key Design Goals & Features:**
-   **Provider Agnosticism:** A core `AgentLanguageModel.Tag` interface abstracts specific LLM provider details.
-   **Effect-Native Architecture:** Leverages Effect-TS for managing side effects, concurrency, error handling, and dependency injection (Layers), ensuring a highly reliable and composable system.
-   **Resilience & Fallbacks:** The `ChatOrchestratorService` uses `@effect/ai`'s `AiPlan` to implement retries for transient errors and automatic fallbacks to alternative providers or models.
-   **Integrated Tool Use (Function Calling):** A flexible framework allows AI models to invoke predefined application-specific tools, with schema-based validation for parameters and results.
-   **Modular and Extensible:** New AI providers and tools can be added with minimal changes to the core system.
-   **Centralized Configuration:** API keys, model names, and provider settings are managed by `ConfigurationService`.
-   **IPC for Local/Bridged Services:** Local models like Ollama and CLI tools like Claude Code are accessed via Electron's IPC mechanism or an external WebSocket bridge, managed within their respective provider layers.
-   **Comprehensive Telemetry:** All significant operations, errors, and configuration states are logged via `TelemetryService`.

## 2. Architecture Diagram

```
+---------------------+      +---------------------+      +----------------------------------+
|    AgentChatPane    |<---->|   useAgentChat Hook   |<---->|      ChatOrchestratorService     |
| (React UI)          |      | (Local Chat State,   |      | (Effect Service: AiPlan, Tool    |
+---------------------+      |  UI Logic)           |      |  Loop, Provider Selection)       |
                             +----------+----------+      +-----------------+----------------+
                                        | Calls                               | Manages
                                        v                                     v
+-------------------------------------------------------------------------------------------------------+
|                                           AI Provider Ecosystem                                         |
|                                                                                                       |
| +---------------------------+     +------------------------+     +----------------------------------+ |
| |  AgentLanguageModel.Tag   |<----| AiPlan Execution       |<----| getResolvedAiModelProvider()     | |
| | (Core AI Interface)       |     | (Selects & Retries     |     | (Dynamically builds/selects      | |
| +-----------+---------------+     |  AgentLanguageModel    |     |  specific AgentLanguageModel     | |
|             ^                       |  Providers)            |     |  provider implementation)        | |
|             | Implemented by        +------------------------+     +-----------------+----------------+ |
|             |                                                                     | Uses
| +-----------+---------------------------------------------------------------------+-----------------+ |
| |                                                                                                   | |
| v                                                                                                   v |
| Concrete AgentLanguageModel Providers (Layers):                                                       |
|  - OpenAIAgentLanguageModelLive  -----> uses -----> OpenAIClientLive  -----> uses -----> HttpClient    |
|  - OllamaAgentLanguageModelLive  -----> uses -----> OllamaAsOpenAIClientLive -> uses -> IPC/OllamaService|
|  - AnthropicAgentLanguageModelLive --> uses -----> AnthropicClientLive --> uses -----> HttpClient    |
|  - ClaudeCodeCliAgentLanguageModelLive -> uses --> IPC to ClaudeCodeSdkService (Main Proc/Bridge)    |
|  - NIP90AgentLanguageModelLive ------> uses -----> NIP90Service & other Nostr/Spark services        |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
       ^                                     ^                                   ^
       | Interacts with                      | Interacts with                    | Configuration via
       |                                     |                                   |
+------+------------------+      +-----------+-------------+      +--------------+-------------+
| AgentToolkitManager /   |      | TelemetryService        |      |   ConfigurationService     |
| ToolHandlerService      |      | (Logging/Diagnostics)   |      | (API Keys, Models, URLs)   |
| (For Tool Use)          |      +-------------------------+      +----------------------------+
+-------------------------+

External Dependencies:
- @effect/ai, @effect/ai-openai, @effect/ai-anthropic
- @effect/platform (HttpClient)
- Electron IPC / WebSocket Bridge (for local/CLI models)
- Nostr Services, SparkService (for NIP-90 DVM provider)
```

## 3. Core AI Abstractions (`src/services/ai/core/`)

These define the fundamental interfaces, data structures, and error types for the AI system, ensuring provider agnosticism.

### 3.1. `AgentLanguageModel.Tag` & Interface
-   **File:** `src/services/ai/core/AgentLanguageModel.ts`
-   **Purpose:** A `Context.Tag` for an Effect service that defines the standard contract for interacting with any LLM.
-   **Key Methods:**
    -   `generateText(options: GenerateTextOptions): Effect<AiResponse, AiProviderError>`
    -   `streamText(options: StreamTextOptions): Stream<AiResponse, AiProviderError>`
    -   `generateStructured(options: GenerateStructuredOptions): Effect<AiResponse, AiProviderError>` (Primarily for tool use, expecting structured output from LLM).
-   **Alignment with `@effect/ai`:** While initially mirroring `@effect/ai`'s `AiLanguageModel`, during the upgrade to `@effect/ai@0.16.5+`, this interface and its implementations were refactored to directly use or closely align with the library's `AiLanguageModel.Service` type, including its handling of `AiModel` options and `AiTool` integration.
-   **Error Channel:** Methods consistently use `AiProviderError` (or a compatible custom error type) in their error channel.

### 3.2. `AgentChatMessageSchema` & Type
-   **File:** `src/services/ai/core/AgentChatMessage.ts`
-   **Purpose:** Defines the structure of a single chat message using `@effect/schema`. Aligns with standard LLM chat message formats (OpenAI, Anthropic).
-   **Schema:**
    ```typescript
    export const AgentChatMessageSchema = Schema.Struct({
      role: Schema.Union(Schema.Literal("user"), /* ... */ Schema.Literal("tool")),
      content: Schema.NullishOr(Schema.String),
      name: Schema.optional(Schema.String), // For tool role
      tool_calls: Schema.optional(Schema.Array(ToolCallSchema)), // For assistant messages requesting tool calls
      tool_call_id: Schema.optional(Schema.String), // For tool messages responding to a tool call
    });
    export type AgentChatMessage = Schema.Schema.Type<typeof AgentChatMessageSchema>;
    ```
-   Includes `ToolCallSchema` for structured tool invocation data.

### 3.3. `AiResponse` & `AiTextChunk` (Application Types)
-   **File:** `src/services/ai/core/AiResponse.ts`
-   **Purpose:** Defines the application's representation of an LLM response. After the `@effect/ai@0.16.5` upgrade, `AiResponse.ts` in our codebase was refactored to extend `@effect/ai/AiResponse.AiResponse`.
-   **`AiResponse` Class:**
    -   Extends `EffectAiResponse` from `@effect/ai/AiResponse`.
    -   Includes `[EffectAiResponseTypeId]` for compatibility.
    -   Provides convenience getters like `.text` and `.toolCalls` to extract data from the `parts` array (which is the standard in `@effect/ai@0.16.5+`).
    -   Includes a static factory method `AiResponse.fromSimple({...})` for easier construction and backward compatibility during the transition.
-   **`AiTextChunk`:** Previously a custom type for streaming, this was largely **deprecated** in favor of streaming `AiResponse` objects directly from `AgentLanguageModel.streamText`, aligning with `@effect/ai@0.16.5+` which often streams full `AiResponse` chunks (where each chunk might be a delta). See `docs/fixes/008-streaming-type-unification.md`.

### 3.4. `AIError` Types
-   **File:** `src/services/ai/core/AIError.ts` (or `AiError.ts` post-casing fix)
-   **Purpose:** A hierarchy of custom tagged errors for AI operations.
-   **Types:**
    -   `AiError` (base class)
    -   `AiProviderError`: For errors originating from specific LLM providers. Includes `provider: string` and `isRetryable: boolean` context. (See `docs/fixes/006-error-constructor-migration.md`)
    -   `AiConfigurationError`: For configuration issues (e.g., missing API key).
    -   `AiToolExecutionError`: For errors during the execution of an agent tool.
    -   `AiContextWindowError`: For issues with context limits.
    -   `AiContentPolicyError`: For content policy violations.

### 3.5. `ProviderConfig` Schemas
-   **File:** `src/services/ai/core/ProviderConfig.ts`
-   **Purpose:** Defines `@effect/schema` structures for configuring different AI providers.
-   **Examples:** `BaseProviderConfigSchema`, `ApiKeyProviderConfigSchema`, `OpenAICompatibleProviderConfigSchema`, `OllamaProviderConfigSchema`, `AnthropicProviderConfigSchema`, `NIP90ProviderConfigSchema`.
-   Used by `ConfigurationService` and provider-specific layers.

### 3.6. `AgentToolkitManager.Tag` & `ToolHandlerService.Tag`
-   **Files:** `src/services/ai/core/AgentToolkitManager.ts`, `src/services/ai/tools/ToolHandlerService.ts`
-   **Purpose:**
    -   `AgentToolkitManager`: Manages the collection of tools available to the AI. Its `getToolkit()` method returns an `AiToolkit` instance.
    -   `ToolHandlerService`: Registers tool definitions with their corresponding handler `Effect`s and executes tools when called by the LLM (via the orchestrator).
-   These form the basis of the tool use framework (Phase 7).

## 4. Provider Implementations (`src/services/ai/providers/`)

Each supported LLM provider has a dedicated module that implements the `AgentLanguageModel.Tag` interface.

### 4.1. General Provider Pattern
Most provider implementations follow a two-layer pattern:
1.  **Client Layer (e.g., `OpenAIClientLive.ts`):**
    -   Provides the provider-specific client (e.g., `OpenAiClient.OpenAiClient` from `@effect/ai-openai`).
    -   Dependencies: `ConfigurationService` (for API keys, base URLs, etc.) and `HttpClient.Tag` (from `@effect/platform`) for making API calls, or an IPC mechanism for local/bridged services.
    -   Uses the provider-specific library's `layerConfig` (e.g., `OpenAiClient.layerConfig()`).
2.  **AgentLanguageModel Layer (e.g., `OpenAIAgentLanguageModelLive.ts`):**
    -   Provides the application's standard `AgentLanguageModel.Tag`.
    -   Dependencies: The provider-specific Client Layer (from step 1) and `ConfigurationService` (for model name, default parameters).
    -   Implementation Strategy (post `@effect/ai@0.16.5` upgrade, see `docs/fixes/021-library-abstraction-bypass-pattern.md`):
        -   Bypasses the library's `AiModel` -> `Provider.use()` abstraction if it causes internal service context issues (like the "Config service not found" error with `OpenAiLanguageModel.Config`).
        -   Instead, it directly uses the methods of the underlying client (e.g., `client.client.createChatCompletion()`, `client.stream()`) and manually maps requests and responses to/from the `AgentLanguageModel` interface and `AiResponse` application types.
    -   Maps provider-specific errors to `AiProviderError`.

### 4.2. OpenAI-Compatible Provider (e.g., OpenAI API)
-   **Files:** `src/services/ai/providers/openai/*`
-   **Libraries:** `@effect/ai-openai`
-   **Details:** Implements `OpenAIClientLive` and `OpenAIAgentLanguageModelLive`. Fetches `OPENAI_API_KEY`, `OPENAI_BASE_URL` (optional), and `OPENAI_MODEL_NAME` from `ConfigurationService`. (As per AI Roadmap Phase 2).

### 4.3. Ollama Provider (as OpenAI-Compatible)
-   **Files:** `src/services/ai/providers/ollama/*`
-   **Strategy:** Adapts local Ollama (which has an OpenAI-compatible `/v1/chat/completions` endpoint) to the `OpenAiClient.OpenAiClient` interface via an IPC bridge, then uses `@effect/ai-openai`'s `OpenAiLanguageModel.model()` for the `AgentLanguageModel` implementation. (As per AI Roadmap Phase 4).
    -   **`OllamaAsOpenAIClientLive.ts`:** Implements `OpenAiClient.OpenAiClientTag`.
        -   Instead of direct HTTP calls, it uses `window.electronAPI.ollama.generateChatCompletion[Stream]` to invoke IPC handlers in the main process.
        -   Main process IPC handlers (`src/helpers/ipc/ollama/ollama-listeners.ts`) use the main-process `OllamaService` (which itself uses `NodeHttpClient`) to call Ollama's API.
        -   Handles mapping between IPC data and `OpenAiClient` method signatures/types, including error mapping to `OpenAiError` (wrapping an `AiProviderError`). (See `docs/fixes/010-generated-client-interface-completion.md` for stubbing the full `OpenAiClient` interface).
    -   **`OllamaAgentLanguageModelLive.ts`:**
        -   Provides `AgentLanguageModel.Tag`.
        -   Depends on `OllamaAsOpenAIClientTag`.
        -   Uses `OpenAiLanguageModel.model()` (from `@effect/ai-openai`) with the Ollama-adapted client.
        -   Maps errors to `AiProviderError` with `provider: "Ollama"`.
        -   Crucially, after the `@effect/ai@0.16.5` upgrade and subsequent "fixes" documentation (`019`, `020`, `021`), this layer was refactored to directly use `ollamaClient.client.createChatCompletion()` and `ollamaClient.stream()` to bypass internal `OpenAiLanguageModel.Config` issues.

### 4.4. Anthropic Provider
-   **Files:** `src/services/ai/providers/anthropic/*`
-   **Libraries:** `@effect/ai-anthropic`
-   **Details:** Implements `AnthropicClientLive` and `AnthropicAgentLanguageModelLive`. Fetches `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_NAME` from `ConfigurationService`. (As per AI Roadmap Phase 5). Adapts to the application's `AgentLanguageModel` interface and `AiResponse` type, similar to the OpenAI provider.

### 4.5. Claude Code CLI Provider (via Bridge Service)
-   **Files:** `src/services/ai/providers/claude_code_cli/*` (implementation based on speculation in `docs/claude-code/gemini-speculate.md`)
-   **SDK:** Jason Kneen's TypeScript wrapper for `@anthropic-ai/claude-code` CLI (`src/kneen-claude-code-sdk/`).
-   **Strategy:**
    1.  **`ClaudeCodeSdkService` (Main Process/External Bridge):** A service that instantiates and uses Jason Kneen's SDK. This must run in the main process or an external Node.js bridge service (like `claude-bridge-service.js`) due to subprocess management. The bridge service communicates with Electron via WebSockets.
    2.  **IPC/WebSocket Bridge:** Channels (`claude-code-channels.ts`), main process listeners (`main-claude-websocket.ts`), and preload context (`claude-code-context.ts`) relay requests from the renderer to the SDK service and stream responses back.
    3.  **`ClaudeCodeCliAgentLanguageModelLive` (Renderer):** Implements `AgentLanguageModel.Tag`. Uses the IPC/WebSocket invokers (`window.electronAPI.claudeCodeCli...`) to communicate with the SDK service. Adapts request/response formats.
-   **Database Integration:** The `main-claude-websocket.ts` handler saves chat sessions and messages to the PGlite database via the bridge service's direct DB access.

### 4.6. NIP-90 DVM Provider
-   **Files:** `src/services/ai/providers/nip90/*`
-   **Purpose:** An `AgentLanguageModel` implementation that interacts with NIP-90 Data Vending Machines on the Nostr network.
-   **`NIP90AgentLanguageModelLive.ts`:**
    -   Dependencies: `NIP90Service`, `NostrService`, `NIP04Service`, `SparkService` (for payments), `TelemetryService`, `NIP90ProviderConfigTag` (for DVM-specific details like pubkey, relays, request kind).
    -   `streamText`/`generateText`:
        1.  Constructs a NIP-90 job request (e.g., Kind 5050) using `createNip90JobRequest` helper. Encrypts if `config.requiresEncryption` is true.
        2.  Publishes the request via `NostrService`.
        3.  Subscribes to job results (Kind 6xxx) and feedback (Kind 7000) using `NIP90Service.subscribeToJobUpdates` or `getJobResult`/`listJobFeedback`.
        4.  Handles "payment-required" feedback by initiating a Lightning payment via `SparkService`.
        5.  Decrypts results/feedback if necessary.
        6.  Streams/returns the content from the DVM's job result.
    -   Error Handling: Maps Nostr, NIP-04, Spark, and NIP-90 errors to `AiProviderError`.

## 5. Orchestration Layer (`src/services/ai/orchestration/`)

### 5.1. `ChatOrchestratorService.Tag` & Interface
-   **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
-   **Purpose:** Manages the overall chat completion flow, including provider selection, resilience, and tool use.
-   **Key Methods:**
    -   `streamConversation(params: { messages: AgentChatMessage[], preferredProvider: PreferredProviderConfig, options?: ... }): Stream<AiResponse, ...>`
    -   `generateConversationResponse(...)` (non-streaming version)

### 5.2. `ChatOrchestratorServiceLive` Layer
-   **Dependencies:** `ConfigurationService`, `HttpClient.Tag`, `TelemetryService`, `AgentToolkitManager.Tag`, `ToolHandlerService.Tag`, and access to all concrete `AgentLanguageModel` provider implementations (or a factory to get them).
-   **`getResolvedAiModelProvider` Helper:**
    -   Takes a `PreferredProviderConfig` (key like "ollama_gemma3_1b", "nip90_devstral", "claude_code").
    -   Dynamically constructs or selects the appropriate `Provider<AgentLanguageModel>` instance. This involves:
        -   Fetching necessary API keys and model names from `ConfigurationService`.
        -   Building the required client layer (e.g., `OpenAIClientLive`, `OllamaAsOpenAIClientLive`) and providing it to the provider-specific `AgentLanguageModel` layer.
        -   For NIP-90, it builds the `NIP90AgentLanguageModelLive` with its specific dependencies and configuration.
        -   For Claude Code CLI, it uses the IPC-backed `AgentLanguageModel` implementation.
-   **Error Handling:** Catches errors from `getResolvedAiModelProvider` and `AiPlan` execution, mapping them to appropriate service-level errors.

### 5.3. Resilience with `AiPlan`
-   The `ChatOrchestratorService` uses `AiPlan.make` (from `@effect/ai`) to define execution strategies.
-   **Plan Steps:** An array of `{ model: Effect<Provider<AgentLanguageModel>, ...>, attempts: number, schedule: Schedule, while: (error) => boolean }`.
    -   The `model` property is an `Effect` that yields the fully configured `Provider<AgentLanguageModel>` for a specific provider (obtained via `getResolvedAiModelProvider`).
-   **Logic:**
    1.  Tries the `preferredProvider`.
    2.  Retries on transient errors (e.g., network issues, specified by `AiProviderError.isRetryable`) using an exponential backoff `Schedule`.
    3.  If the preferred provider fails permanently or exhausts retries, falls back to other configured providers (e.g., Anthropic, then Ollama, then a specific NIP-90 DVM).
-   The `AiPlan` itself, when run, yields a `Provider<AgentLanguageModel>` representing the successfully chosen (or fallen-back-to) provider. This provider's `streamText` or `generateText` method is then called.

## 6. Tool Use Framework (`src/services/ai/tools/`)

Allows AI models to invoke application-defined functions (tools). (As per AI Roadmap Phase 7).

### 6.1. Defining Tools (`AiTool` & Schemas)
-   **File Example:** `src/services/ai/tools/WeatherTool.ts`
-   Tools are defined using `@effect/ai`'s `AiTool.make` constructor.
-   Requires:
    -   `name`: A unique name for the tool.
    -   `description`: Natural language description for the LLM.
    -   `parameters`: An `@effect/schema` defining the input parameters the LLM must provide.
    -   `success`: An `@effect/schema` for the successful output structure of the tool.
    -   `failure`: An `@effect/schema` for the tool's specific error structure (e.g., `Schema.instanceOf(GetWeatherToolError)`).

### 6.2. `ToolHandlerService`
-   **File:** `src/services/ai/tools/ToolHandlerService.ts`
-   **`ToolHandlerServiceLive` Layer:**
    -   Manages an in-memory registry of `ToolRegistryEntry` objects. Each entry contains:
        -   `toolDefinition: AiTool<I, S, E>`
        -   `handler: (input: I) => Effect<S, E, R>` (the actual Effectful function implementing the tool)
        -   `handlerContextLayer?: Layer<R, any, any>` (optional layer to provide dependencies `R` to the handler).
    -   `registerTool()`: Adds a tool entry to the registry.
    -   `getAllToolDefinitions()`: Returns an array of all `AiTool` definitions for building an `AiToolkit`.
    -   `executeTool(toolName: string, encodedArgsString: string)`:
        1.  Finds the tool by name.
        2.  Decodes `encodedArgsString` (JSON from LLM) against the tool's `parameters` schema.
        3.  Executes the tool's `handler` `Effect`, providing `handlerContextLayer` if defined.
        4.  Returns the raw success output (`S`) or wraps handler errors (`E` or others) into `AIToolExecutionError`.

### 6.3. `CommanderToolkitManager`
-   **File:** `src/services/ai/tools/CommanderToolkitManager.ts`
-   **`CommanderToolkitManagerLive` Layer:**
    -   Provides `AgentToolkitManager.Tag`.
    -   Depends on `ToolHandlerService.Tag` and `TelemetryService.Tag`.
    -   On initialization, it registers all application-defined tools (e.g., `GetCurrentWeatherTool` with `handleGetCurrentWeather` and its `TelemetryService` dependency layer) with the `ToolHandlerService`.
    -   `getToolkit()`: Fetches all tool definitions from `ToolHandlerService` and dynamically constructs an `AiToolkit` instance using `class extends AiToolkit.make(...toolDefinitions) {}`.

### 6.4. Tool Calling Loop in `ChatOrchestratorService`
-   When `streamConversation` is called:
    1.  Retrieves the `AiToolkit` from `AgentToolkitManager`.
    2.  Passes this `toolkit` to the `AgentLanguageModel` provider's `streamText` method (or equivalent that supports tools).
    3.  The stream from the LLM provider can yield `AiTextChunk` or `AiToolCall`.
    4.  If `AiToolCall` is received:
        -   The orchestrator logs it.
        -   Calls `ToolHandlerService.executeTool(toolCall.name, toolCall.arguments)`.
        -   The tool's result (success data or error data, stringified) is formatted as an `AgentChatMessage` with `role: "tool"` and `tool_call_id`.
        -   This "tool" message is added to the conversation history.
        -   A new call is made to the LLM provider's `streamText` with the updated history to get the agent's final response based on the tool's output.
    5.  If `AiTextChunk` is received, it's passed on to the UI.
    6.  This loop continues until the LLM provides a final text response without new tool calls.

## 7. UI Integration

### 7.1. `useAgentChat` Hook
-   **File:** `src/hooks/ai/useAgentChat.ts`
-   **Responsibilities:**
    -   Manages local state for a single chat session: `messages: UIAgentChatMessage[]`, `currentInput`, `isLoading`, `error`, `currentSessionId`.
    -   Depends on `ChatOrchestratorService.Tag` (fetched via `getMainRuntime()`).
    -   **`sendMessage(promptText: string)`:**
        1.  Adds user message to local state and saves to DB via `DatabaseService`.
        2.  Calls `chatOrchestrator.streamConversation()` with current message history, selected provider config (from `agentChatStore`), and `sessionId`.
        3.  Processes the stream of `AiResponse` chunks:
            -   Appends text from `chunk.text` to the current assistant message.
            -   If `chunk.toolCalls` are present, updates UI to indicate tool usage and prepares for tool result messages.
        4.  Handles errors and loading states.
    -   **History Loading:** On `currentSessionId` change, loads messages from `DatabaseService` and populates local state.
    -   **Stream Cancellation:** Uses an `AbortController` to cancel ongoing streams if a new message is sent or the component unmounts.

### 7.2. `AgentChatPane.tsx` Component
-   **File:** `src/components/ai/AgentChatPane.tsx`
-   **Responsibilities:**
    -   Uses the `useAgentChat` hook.
    -   Renders the chat UI using `ChatContainer` / `ChatWindow`.
    -   Provides UI for selecting AI Provider (via `Select` component) and displays the current model. Provider list and selection are managed by `agentChatStore`.
    -   Displays error messages from the AI services.
    -   Handles rendering of different `AgentChatMessage` roles, including assistant messages with tool call information and tool result messages.

### 7.3. `agentChatStore.ts`
-   **File:** `src/stores/ai/agentChatStore.ts`
-   **Responsibilities:**
    -   Manages the `selectedProviderKey` (e.g., "ollama_gemma3_1b", "nip90_devstral", "claude_code").
    -   Stores an array of `availableProviders: AIProvider[]`.
    -   `loadAvailableProviders(configService: ConfigurationService)`: Action that fetches provider enablement status and default model names from `ConfigurationService` to populate `availableProviders`.
    -   Persists `selectedProviderKey` to `localStorage`.

## 8. Configuration Management

-   **`ConfigurationService` (`src/services/configuration/`):** The central service for all application configuration.
    -   Provides methods like `get(key)` and `getSecret(key)`.
    -   Stores AI provider settings:
        -   `[PROVIDER_KEY]_ENABLED` (e.g., `OLLAMA_ENABLED`, `CLAUDE_CODE_PROVIDER_ENABLED`)
        -   `[PROVIDER_KEY]_API_KEY` (for cloud providers, fetched via `getSecret`)
        -   `[PROVIDER_KEY]_BASE_URL` (optional, for self-hosted or proxies)
        -   `[PROVIDER_KEY]_MODEL_NAME` (default model for the provider)
        -   Specific NIP-90 DVM configurations (`AI_PROVIDER_DEVSTRAL_DVM_PUBKEY`, `USER_NIP90_DVM_PUBKEY`, etc.).
-   **Secure Storage:** API keys are intended to be fetched via `configService.getSecret()`, implying an underlying secure storage mechanism (e.g., Electron `safeStorage` or OS keychain, abstracted by the `ConfigurationService` implementation). Fallback to environment variables for development.
-   **Default Configurations:** `DefaultDevConfigLayer` in `ConfigurationServiceImpl.ts` pre-populates many AI provider settings for ease of development.

## 9. Error Handling

-   **Custom `AIError` Types:** As defined in `src/services/ai/core/AIError.ts`, provide typed and contextualized error information.
-   **Provider Layers:** Each `AgentLanguageModel` provider implementation is responsible for catching errors from its specific SDK/client/IPC mechanism and mapping them to an `AiProviderError`, including the provider name and retryability.
-   **`ChatOrchestratorService`:**
    -   Handles errors from `getResolvedAiModelProvider` (e.g., `AiConfigurationError` if a provider key is invalid or API key is missing).
    -   `AiPlan` manages retryable `AiProviderError`s based on `isRetryable` flag and schedule.
    -   If all providers in the plan fail, the orchestrator returns the last error.
    -   Handles errors from `ToolHandlerService.executeTool`.
-   **UI (`useAgentChat`):** Catches errors from `ChatOrchestratorService` and sets an error state for display in `AgentChatPane`.

## 10. Telemetry

-   **`TelemetryService`:** Integrated throughout the AI backend.
-   **Events Tracked:**
    -   Provider configuration loading (success/failure).
    -   `ChatOrchestratorService` operations (plan building, provider selection, tool calls, final success/failure).
    -   `ToolHandlerService` tool registration and execution.
    -   Errors at all levels.
    -   Usage of specific providers and models.
-   Refer to `docs/AGENTS.md#11-logging-and-telemetry` and `docs/TELEMETRY.md`.

## 11. Testing Strategy

-   **Unit Tests:**
    -   Each `AgentLanguageModel` provider layer is tested by mocking its client layer (`OpenAIClient`, `AnthropicClient`, IPC invokers) and `ConfigurationService`. Focus on request/response adaptation and error mapping.
    -   `ChatOrchestratorService` is tested by mocking `ConfigurationService`, `AgentToolkitManager`, `ToolHandlerService`, and the `getResolvedAiModelProvider` helper (or the underlying `AiModel` factories) to simulate various provider success/failure/tool call scenarios.
    -   Tool handlers are tested individually with mocked dependencies.
    -   `useAgentChat` hook is tested by mocking `ChatOrchestratorService`.
-   **Integration Tests:**
    -   Test flows from `AgentChatPane` (or a simplified test component) through `ChatOrchestratorService` to a mocked `HttpClient` or mocked IPC bridge, verifying the correct sequence of operations and data transformations.
-   **E2E Tests:**
    -   Focus on `AgentChatPane` interaction with a local Ollama instance.
    -   If CI/dev environments have API keys, E2E tests for OpenAI/Anthropic/Claude Code CLI can be run.
    -   Test `AiPlan` fallback by configuring a primary provider to fail and observing successful fallback to a secondary provider.
-   **Runtime Error Detection:** Specialized tests (as per `docs/fixes/013-runtime-error-detection-testing.md`) to catch Effect generator runtime errors, especially for complex provider layers.

## 12. Future Considerations

-   **Advanced Context Window Management:** Implement `AgentChatSession` service for robust message truncation, summarization (potentially using an LLM call), and token counting to prevent exceeding context limits.
-   **Persistent Chat History:** Integrate `ChatHistoryRepository` (using PGlite as per `docs/pglite.md` and `docs/systems/message-persistence-architecture.md`) into `AgentChatSession` for durable storage of conversations.
-   **User-Configurable `AiPlan`:** Allow users to define their own provider preferences, retry strategies, and fallback orders.
-   **Dynamic Model Listing:** Fetch available models directly from providers instead of relying solely on `ConfigurationService`.
-   **Streaming Tool Calls:** More sophisticated handling of LLMs that can stream partial tool arguments or interleave text with tool call requests.
-   **Cost Tracking & Budgeting:** Integrate cost estimation for different providers/models into the orchestrator and UI.

This AI Backend and Orchestration System provides a powerful, flexible, and resilient foundation for all AI-driven features within OpenAgents Commander, enabling a rich and adaptable user experience.
