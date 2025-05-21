Okay, Agent, here are the specific instructions for **Phase 8 (Testing, Refinement, and Advanced Features)**. This phase is about solidifying the work done so far, ensuring robustness through comprehensive testing, and laying the groundwork for more advanced AI capabilities.

**Preamble for the Coding Agent:**

*   **Effect-TS Best Practices:** Continue strict adherence.
*   **Prerequisites:** Phases 0-7 must be largely complete. You should have a functional `AgentChat` pane capable of basic chat and tool use, supported by providers like OpenAI, Ollama (as OpenAI-compatible), and Anthropic, with resilience managed by `ChatOrchestratorService` using `AiPlan`.
*   **Iterative Approach:** This phase is less about new, distinct features and more about improving what exists and preparing for what's next. Some "Advanced Features" might become their own subsequent phases.

---

## Phase 8: Testing, Refinement, and Advanced Features

**Objective:** Ensure the stability and correctness of the new AI backend through thorough testing. Refine existing UI/UX based on the new capabilities. Begin foundational work for advanced features like context management and persistent chat history.

**Task 8.1: Comprehensive Unit Testing**

1.  **Action:** Review and augment unit tests for all new AI services and hooks.
2.  **Details & Files:**
    *   **`src/services/ai/core/AIError.test.ts` (New):**
        *   Test instantiation of each custom AI error type (`AIProviderError`, `AIConfigurationError`, etc.).
        *   Verify they correctly extend `Data.TaggedError` and store `cause` and `context`.
    *   **`src/services/ai/providers/openai/OpenAIClientLive.test.ts` (Augment):**
        *   Mock `ConfigurationService` and `HttpClient.Tag`.
        *   Test successful client creation with valid API key.
        *   Test failure scenarios: missing API key, invalid API key format (if schema validation is added), error fetching config. Ensure correct `AIConfigurationError` is thrown.
    *   **`src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts` (Augment):**
        *   Mock `OpenAiClient.OpenAiClient` and `ConfigurationService`.
        *   Test successful provider creation.
        *   Test error mapping: Simulate `OpenAiClient` methods throwing `OpenAiError` and verify they are correctly mapped to `AIProviderError` with `provider: "OpenAI"` context.
        *   Test default model name usage if `OPENAI_MODEL_NAME` is not configured.
    *   **`src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts` (Augment):**
        *   Mock `window.electronAPI.ollama` (IPC bridge).
        *   Test successful creation.
        *   Test calls to `chat.completions.create` (both streaming and non-streaming) correctly delegate to IPC, pass parameters, and handle responses/errors (mapping them to `OpenAiError` or `AIProviderError` as appropriate for the adapter).
        *   Test failure if `window.electronAPI.ollama` is undefined.
    *   **`src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts` (Augment):** Similar to OpenAI, but testing with the `OllamaAsOpenAIClientLive` adapter.
    *   **`src/services/ai/providers/anthropic/AnthropicClientLive.test.ts` (New/Augment):** Similar to OpenAI.
    *   **`src/services/ai/providers/anthropic/AnthropicAgentLanguageModelLive.test.ts` (New/Augment):** Similar to OpenAI.
    *   **`src/services/ai/tools/WeatherTool.test.ts` (Augment):**
        *   Test `handleGetCurrentWeather` more thoroughly:
            *   Mock `TelemetryService`.
            *   Test success case with different units.
            *   Test "ErrorCity" and "UnknownCity" failure cases, verifying correct `GetWeatherToolError` is returned.
            *   Verify telemetry calls.
    *   **`src/services/ai/tools/ToolHandlerService.test.ts` (Augment):**
        *   Test `executeTool` with a tool whose handler requires context (e.g., `WeatherTool` needing `TelemetryService`). Ensure the `handlerContextLayer` is correctly applied.
        *   Test argument schema validation failure (e.g., sending incorrect params to `get_current_weather`).
        *   Test tool handler returning its defined error type (e.g., `GetWeatherToolError`) and verify `executeTool` wraps it in `AIToolExecutionError` or passes it correctly based on design.
    *   **`src/services/ai/tools/CommanderToolkitManager.test.ts` (Augment):**
        *   Verify `getToolkit()` builds an `AiToolkit` instance containing all registered tool definitions.
    *   **`src/services/ai/orchestration/ChatOrchestratorService.test.ts` (Augment):**
        *   Refine tests for `AiPlan` execution:
            *   Mock `getResolvedAiModelProvider` to return `Effect.fail` for specific providers to test fallback sequences.
            *   Simulate `AIProviderError` with `isRetryable: true` to test retry logic and `Schedule`.
            *   Verify correct telemetry for plan steps (e.g., "attempting_provider_X", "fallback_to_provider_Y").
        *   Test tool calling loop:
            *   Mock `AgentToolkitManager.getToolkit()` to return a toolkit with mock tools.
            *   Mock `ToolHandlerService.executeTool()` to return success/failure for these tools.
            *   Send a prompt that triggers a tool call. Verify the orchestrator:
                1.  Receives `AiToolCall` from the primary LLM stream.
                2.  Calls `ToolHandlerService.executeTool`.
                3.  Sends the tool result message back to the LLM.
                4.  Streams the LLM's final response.
    *   **`src/hooks/ai/useAgentChat.test.ts` (Augment):**
        *   Mock `ChatOrchestratorService.streamConversation` to emit various sequences of `AiTextChunk` (with `AgentChatMessage` inside, including tool_call and tool_result roles) and errors.
        *   Verify `messages` state in the hook updates correctly to reflect tool usage steps and final responses.
        *   Test error display logic.
        *   Test stream cancellation.

**Task 8.2: Integration Testing Refinements**

1.  **Action:** Review and enhance existing integration tests, or add new ones focusing on AI interactions.
2.  **Details:**
    *   Test the flow from `AgentChatPane` -> `useAgentChat` -> `ChatOrchestratorService`.
        *   Mock `ChatOrchestratorService.streamConversation` at the boundary of `useAgentChat` to verify the hook correctly processes the orchestrated stream.
    *   Test specific provider integrations by setting up a minimal `FullAppLayer` in tests that wires up, for example, only the OpenAI provider chain (`OpenAIClientLive` -> `OpenAIAgentLanguageModelLive` -> `ChatOrchestratorService` where it's the *only* provider in the plan). Then, test `ChatOrchestratorService` against a mocked `HttpClient` that simulates OpenAI API responses (success, errors, tool calls).

**Task 8.3: E2E Testing Enhancements**

1.  **Action:** Expand E2E tests for the `AgentChat` pane.
2.  **Details:**
    *   **Setup:**
        *   Ensure local Ollama is running with a known model (e.g., `gemma3:1b`).
        *   Configure Commander (e.g., via `localStorage` pre-seeding or automated UI interaction in test setup) to use Ollama as the selected provider for `AgentChatPane`.
    *   **Test Scenarios:**
        *   Basic chat: Send a prompt, verify a streamed response appears from Ollama.
        *   Multi-turn conversation.
        *   If simple tool use is testable with Ollama's OpenAI-compatible endpoint (and your adapter supports it), test a prompt that should trigger the `get_current_weather` tool.
    *   **OpenAI/Anthropic E2E (Optional, if CI/dev environment has API keys):**
        *   If API keys can be securely provided to the E2E test environment:
            *   Test chat with OpenAI.
            *   Test chat with Anthropic.
            *   Test tool calling with OpenAI (as it has strong support).
            *   Test `AiPlan` fallback: Configure OpenAI with an invalid key, Anthropic with a valid key. Send a message. Verify it attempts OpenAI, fails, then successfully uses Anthropic.

**Task 8.4: Implement Basic Context Window Management (Foundation)**

1.  **Action:** Modify `src/services/ai/core/AgentChatSession.ts` and create `AgentChatSessionLive.ts`.
2.  **Details for `AgentChatSessionLive.ts`:**
    *   **State:** Store messages in an in-memory array.
    *   **`addMessage`**: Adds a message to the array.
    *   **`getHistory`**:
        *   Implements a simple "token counting & truncation" strategy (most basic).
        *   **Dependency:** `TokenizerService` (from earlier phases, or a new simple one based on character count as a rough proxy if a full tokenizer is too complex for now).
        *   **Logic:**
            1.  Iterate messages from newest to oldest, accumulating token count (or char count).
            2.  Keep adding messages to the history to be returned as long as total tokens are below a configurable limit (e.g., `MAX_CHAT_HISTORY_TOKENS` from `ConfigurationService`, default to ~3000 tokens).
            3.  Always include the latest `N` messages, regardless of token count, to preserve recent context (N also configurable).
            4.  Always include the initial system message.
    *   **`clearHistory`**: Clears the message array (except system message).
3.  **Action:** Modify `useAgentChat.ts`.
    *   Depend on `AgentChatSession.Tag`.
    *   When `sendMessage` is called:
        *   Call `agentChatSession.addMessage(userMessage)`.
        *   Call `agentChatSession.getHistory()` to get the context to send to the LLM.
        *   When LLM response is received, call `agentChatSession.addMessage(assistantMessage)`.
    *   When messages are displayed, fetch them from `agentChatSession.getHistory()`.
4.  **Runtime Integration:** Add `AgentChatSessionLive` (and `TokenizerServiceLive` if used) to `FullAppLayer`.

**Task 8.5: Implement Persistent Chat History (Foundation with PGlite)**

*This is a more involved task and might be deferred or simplified for an initial pass.*

1.  **Action:** Create `ChatHistoryRepository.Tag` service and `PgLiteChatHistoryRepositoryLive` layer (e.g., in `src/services/persistence/`).
2.  **Details for `PgLiteChatHistoryRepositoryLive.ts`:**
    *   **Dependency:** `PGliteService.Tag` (from `docs/pglite.md` integration guide - requires PGlite setup in Electron main/renderer).
    *   **Schema:** Define a PGlite table schema for chat messages (e.g., `chat_messages (id TEXT PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, name TEXT, tool_call_id TEXT, tool_calls_json TEXT, timestamp INTEGER)`).
    *   **Methods:** `saveMessage(sessionId: string, message: AgentChatMessage)`, `getMessages(sessionId: string, limit?: number, offset?: number): Effect<AgentChatMessage[]>`, `clearSession(sessionId: string)`.
    *   Use `Effect.tryPromise` around PGlite queries.
3.  **Action:** Modify `AgentChatSessionLive.ts`.
    *   **Dependency:** `ChatHistoryRepository.Tag`.
    *   **State:** `currentSessionId: string`. The session ID could be derived from the pane ID or be a new UUID.
    *   **`addMessage`**: Saves the message via `ChatHistoryRepository` *in addition* to in-memory (or primarily relies on repository for history).
    *   **`getHistory`**: Fetches messages from `ChatHistoryRepository` for the `currentSessionId`. Context window management still applies to the fetched history before sending to LLM.
    *   **`clearHistory`**: Calls `ChatHistoryRepository.clearSession`.
4.  **PGlite Setup:**
    *   Follow `docs/pglite.md` to set up PGlite in Electron (main or renderer).
    *   Define `PGliteServiceLive` layer and add it to `FullAppLayer`.
5.  **UI for Sessions (Conceptual):**
    *   A new pane or UI element to list chat sessions.
    *   Clicking a session loads its history into an `AgentChat` pane by setting the `currentSessionId` in `AgentChatSession`.

**Task 8.6: UI/UX Refinements for AI Interactions**

1.  **Provider/Model Selection in `AgentChatPane`:**
    *   If not already robust, implement clear dropdowns or selection UI.
    *   Fetch available models for the selected provider from `ConfigurationService` (or the provider itself if it has a `listModels` method - `@effect/ai` clients might).
2.  **Loading/Streaming Indicators:**
    *   Ensure `ChatMessage.tsx`'s `isStreaming` prop provides clear visual feedback (e.g., a blinking cursor, "Agent is typing...").
    *   Global loading indicator in `AgentChatPane` while awaiting the first chunk or full non-streamed response.
3.  **Error Display:**
    *   Display `AIProviderError` and other AI errors gracefully in the `AgentChatPane`.
    *   Provide a "Retry" button for retryable errors.
4.  **Tool Call Visualization:**
    *   When `AgentChatMessage.tool_calls` is present, render it clearly (e.g., "Agent wants to use tool: `get_current_weather` with params: `{"city": "London"}`").
    *   When `AgentChatMessage.role === "tool"` is present, render the tool result clearly (e.g., "Tool `get_current_weather` returned: `{"temperature": "15C", ...}`").
5.  **Configuration UI:**
    *   Add a new section in the application settings (if a settings pane/modal exists) for AI Providers.
    *   Allow users to input API keys, select default models, and enable/disable providers.
    *   API keys must be handled securely.

---

**Verification for Phase 8:**

1.  **All Unit Tests Passing:** Ensure existing and new unit tests cover the AI backend thoroughly.
2.  **E2E Tests Passing:** E2E tests for chat, tool use, and provider fallbacks should be stable.
3.  **Manual QA:**
    *   Test all supported providers (OpenAI, Ollama, Anthropic) in the `AgentChatPane`.
    *   Test tool calling with various inputs and expected outcomes (success/error).
    *   Verify context management (if implemented): long conversations should lead to truncation/summarization, and the agent should still maintain reasonable context.
    *   Verify chat history persistence (if PGlite implemented): close and reopen the app; chat history should be restored for the active session.
    *   Check UI/UX refinements for clarity and usability.

This phase brings the AI backend to a more mature state, ready for further expansion or integration into more complex agent workflows. The "Advanced Features" part, especially context management and persistent history, can be substantial and might be broken down further. Focus on getting the testing and basic refinements solid first.
