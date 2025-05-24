# AI Roadmap: Phase 3 - Implement `AgentChat` Pane (Initial Version with OpenAI)

**Objective:** Create a new pane where users can interact with an AI agent. This initial version will use the `AgentLanguageModel` service (provided by the OpenAI-compatible backend implemented in Phase 2) for chat completions.

**Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Continue to strictly follow Effect-TS patterns for any service interactions. UI components will primarily use React patterns.
- **Prerequisites:**
  - Phases 0 and 1 must be completed (core AI abstractions defined).
  - Phase 2's `OpenAIAgentLanguageModelLive` (or a similar layer providing `AgentLanguageModel.Tag`) must be correctly integrated into `FullAppLayer` and assumed to be functional.
  - A `ConfigurationService` should be available in the runtime if `AgentLanguageModel` relies on it for model names or other settings (as implemented in Phase 2).
- **UI Components:** Utilize existing Shadcn UI components like `ChatWindow` (from `src/components/chat/`), `Button`, `Input`, `ScrollArea`, `Card`, `Label`, `Tabs`, `Textarea`, and `Alert` (from `src/components/ui/`).
- **Error Handling:** UI should gracefully display errors received from the AI services.
- **Logging and Telemetry:** All significant user actions and events (pane opening, message sending, errors) **MUST** be logged using the `TelemetryService`.
- **State Management:**
  - Pane state is managed by `usePaneStore`.
  - Chat-specific state (messages, input, loading status) will be managed locally within the `useAgentChat` hook.

---

## Phase 3 Tasks:

**Task 3.1: Define New Pane Type, Constants, and Store Logic**

1.  **Update `src/types/pane.ts`:**

    - Add `'agent_chat'` to the `Pane['type']` union.
      ```typescript
      // src/types/pane.ts
      export type Pane = {
        // ... existing types ...
        type: /* ... existing types ... */ "agent_chat" | string; // Added 'agent_chat'
        // ...
      };
      ```

2.  **Update `src/stores/panes/constants.ts`:**

    - Define and export constants for the new pane:
      ```typescript
      // src/stores/panes/constants.ts
      export const AGENT_CHAT_PANE_ID = "agent_chat_main";
      export const AGENT_CHAT_PANE_TITLE = "Agent Chat";
      export const AGENT_CHAT_PANE_DEFAULT_WIDTH = 500;
      export const AGENT_CHAT_PANE_DEFAULT_HEIGHT = 600;
      ```

3.  **Create `src/stores/panes/actions/openAgentChatPane.ts`:**

    - **Content:**

      ```typescript
      // src/stores/panes/actions/openAgentChatPane.ts
      import { type PaneInput } from "@/types/pane";
      import { type PaneStoreType, type SetPaneStore } from "../types";
      import { addPaneActionLogic } from "./addPane";
      import {
        AGENT_CHAT_PANE_ID,
        AGENT_CHAT_PANE_TITLE,
        AGENT_CHAT_PANE_DEFAULT_WIDTH,
        AGENT_CHAT_PANE_DEFAULT_HEIGHT,
      } from "../constants";

      export function openAgentChatPaneAction(set: SetPaneStore) {
        set((state: PaneStoreType) => {
          const newPaneInput: PaneInput = {
            id: AGENT_CHAT_PANE_ID, // For now, assume a single main agent chat pane
            type: "agent_chat",
            title: AGENT_CHAT_PANE_TITLE,
            dismissable: true,
            width: AGENT_CHAT_PANE_DEFAULT_WIDTH,
            height: AGENT_CHAT_PANE_DEFAULT_HEIGHT,
          };
          // addPaneActionLogic handles focusing if exists, or creating if new
          return addPaneActionLogic(
            state,
            newPaneInput,
            true /* tile positioning */,
          );
        });
      }
      ```

4.  **Update `src/stores/panes/actions/index.ts`:**

    - Export the new action: `export * from './openAgentChatPane';`

5.  **Update `src/stores/panes/types.ts`:**

    - Add the action signature to `PaneStoreType`: `openAgentChatPane: () => void;`

6.  **Update `src/stores/pane.ts`:**
    - Import `openAgentChatPaneAction`.
    - Add it to the store implementation: `openAgentChatPane: () => openAgentChatPaneAction(set),`

**Task 3.2: Create `useAgentChat` Hook**

This hook will encapsulate the logic for interacting with the `AgentLanguageModel` service and managing chat state.

1.  **Create Directory:** `src/hooks/ai/` (if it doesn't exist).
2.  **Create File:** `src/hooks/ai/useAgentChat.ts`.
3.  **Content:**

    ```typescript
    // src/hooks/ai/useAgentChat.ts
    import { useState, useCallback, useRef, useEffect } from "react";
    import { Effect, Stream, Cause, Option } from "effect";
    import {
      AgentLanguageModel,
      type AiTextChunk,
      type AgentChatMessage,
      type AIProviderError,
    } from "@/services/ai/core";
    import { getMainRuntime } from "@/services/runtime";
    import {
      TelemetryService,
      type TelemetryEvent,
    } from "@/services/telemetry";

    interface UseAgentChatOptions {
      initialSystemMessage?: string;
      // Provider and model selection can be passed if needed, or use defaults from AgentLanguageModel
    }

    // Extending AgentChatMessage for UI-specific properties
    interface UIAgentChatMessage extends AgentChatMessage {
      id: string; // Ensure every UI message has a unique ID
      _updateId?: number; // For forcing re-renders during streaming
      isStreaming?: boolean;
    }

    export function useAgentChat(options: UseAgentChatOptions = {}) {
      const { initialSystemMessage = "You are a helpful AI assistant." } =
        options;

      const systemMessage: UIAgentChatMessage = {
        id: "system-0",
        role: "system",
        content: initialSystemMessage,
        timestamp: Date.now(),
      };

      const [messages, setMessages] = useState<UIAgentChatMessage[]>([
        systemMessage,
      ]);
      const [currentInput, setCurrentInput] = useState<string>("");
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [error, setError] = useState<AIProviderError | null>(null);

      const runtimeRef = useRef(getMainRuntime());
      const streamAbortControllerRef = useRef<AbortController | null>(null);
      const currentAssistantMessageIdRef = useRef<string | null>(null); // Ref to track the ID of the current streaming message

      const runTelemetry = useCallback(
        (event: TelemetryEvent) => {
          Effect.runFork(
            Effect.provideService(
              Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)),
              TelemetryService, // Provide the Tag
              runtimeRef.current.context.get(TelemetryService), // Provide the live service instance
            ),
          );
        },
        [runtimeRef],
      );

      const sendMessage = useCallback(
        async (promptText: string) => {
          if (!promptText.trim()) return;

          const userMessage: UIAgentChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: promptText.trim(),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, userMessage]);
          setCurrentInput("");
          setIsLoading(true);
          setError(null);
          runTelemetry({
            category: "agent_chat",
            action: "send_message_start",
            label: "User message sent",
          });

          // Prepare conversation history for the LLM
          // Exclude UI-specific fields and any existing streaming message.
          const conversationHistoryForLLM: AgentChatMessage[] = messages
            .filter(
              (m) =>
                m.id !== currentAssistantMessageIdRef.current &&
                m.role !== "system",
            ) // Exclude current streaming & system (will be added first)
            .map(
              ({ id: _id, _updateId, isStreaming, timestamp, ...coreMsg }) =>
                coreMsg,
            ) // Strip UI fields
            .concat(
              [userMessage].map(
                ({ id: _id, _updateId, isStreaming, timestamp, ...coreMsg }) =>
                  coreMsg,
              ),
            );

          if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            runTelemetry({
              category: "agent_chat",
              action: "previous_stream_aborted",
              label: currentAssistantMessageIdRef.current || "unknown",
            });
          }
          streamAbortControllerRef.current = new AbortController();
          const signal = streamAbortControllerRef.current.signal;

          const assistantMessageId = `assistant-${Date.now()}`;
          currentAssistantMessageIdRef.current = assistantMessageId; // Track the ID of the new streaming message

          // Add a placeholder for the assistant's response
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant",
              content: "",
              isStreaming: true,
              timestamp: Date.now(),
            },
          ]);

          const program = Effect.gen(function* (_) {
            const agentLM = yield* _(AgentLanguageModel); // Get AgentLanguageModel service
            const textStream = agentLM.streamText({
              // Send history with system message prepended
              prompt: {
                messages: [
                  { role: "system", content: initialSystemMessage }, // Ensure system prompt is included
                  ...conversationHistoryForLLM,
                ],
              },
            });

            // Handle the stream
            yield* _(
              Stream.runForEach(
                textStream,
                (chunk: AiTextChunk) =>
                  Effect.sync(() => {
                    if (signal.aborted) {
                      runTelemetry({
                        category: "agent_chat",
                        action: "stream_aborted_client_side_chunk",
                        label: assistantMessageId,
                      });
                      // The stream should automatically terminate due to the signal.
                      // No need to throw a custom error here, runForEach will handle it.
                      return;
                    }
                    setMessages((prevMsgs) =>
                      prevMsgs.map((msg) =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: (msg.content || "") + chunk.text,
                              _updateId: Date.now(),
                            }
                          : msg,
                      ),
                    );
                  }),
                { signal }, // Pass the AbortSignal to Effect's stream processing
              ),
            );
          }).pipe(
            Effect.provideService(
              AgentLanguageModel,
              runtimeRef.current.context.get(AgentLanguageModel),
            ),
            Effect.tapErrorCause((cause) =>
              Effect.sync(() => {
                if (
                  Cause.isInterruptedOnly(cause) ||
                  (signal.aborted &&
                    Cause.isDieType(cause) &&
                    (cause.defect as Error)?.name === "AbortError")
                ) {
                  runTelemetry({
                    category: "agent_chat",
                    action: "stream_interrupted_or_aborted",
                    label: assistantMessageId,
                  });
                  console.log("Agent chat stream was interrupted or aborted.");
                } else {
                  const squashedError = Cause.squash(cause);
                  setError(squashedError as AIProviderError);
                  runTelemetry({
                    category: "agent_chat",
                    action: "send_message_failure_stream",
                    label: (squashedError as Error).message,
                  });
                }
              }),
            ),
            Effect.ensuring(
              Effect.sync(() => {
                setMessages((prevMsgs) =>
                  prevMsgs.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false, _updateId: Date.now() }
                      : msg,
                  ),
                );
                setIsLoading(false);
                if (streamAbortControllerRef.current?.signal === signal) {
                  streamAbortControllerRef.current = null;
                }
                currentAssistantMessageIdRef.current = null; // Clear tracked streaming message ID
              }),
            ),
          );

          Effect.runFork(program);
        },
        [messages, initialSystemMessage, runTelemetry],
      );

      useEffect(() => {
        return () => {
          if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            runTelemetry({
              category: "agent_chat",
              action: "hook_unmount_stream_cancel",
            });
          }
        };
      }, [runTelemetry]); // runTelemetry is memoized

      return {
        messages,
        currentInput,
        setCurrentInput,
        isLoading,
        error,
        sendMessage,
      };
    }
    ```

**Task 3.3: Create `AgentChatPane` UI Component**

1.  **Create Directory:** `src/components/ai/` (if it doesn't exist).
2.  **Create File:** `src/components/ai/AgentChatPane.tsx`.
3.  **Content:**

    ```typescript
    // src/components/ai/AgentChatPane.tsx
    import React, { useEffect } from 'react';
    import { ChatContainer } from '@/components/chat';
    import { useAgentChat } from '@/hooks/ai/useAgentChat';
    import { Button } from '@/components/ui/button'; // Ensure Button is imported
    import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For error display
    import { AlertTriangle } from 'lucide-react';
    import { Effect } from 'effect';
    import { TelemetryService } from '@/services/telemetry';
    import { getMainRuntime } from '@/services/runtime';

    // Placeholder for provider/model selection UI.
    // For Phase 3, we assume the default provider (OpenAI) configured in AgentLanguageModel.
    const currentProviderName = "Default Provider"; // This would be dynamic later
    const currentModelName = "Default Model";    // This would be dynamic later

    const AgentChatPane: React.FC = () => {
      const {
        messages,
        currentInput,
        setCurrentInput,
        isLoading,
        error,
        sendMessage,
      } = useAgentChat({
        initialSystemMessage: "You are Commander's AI Agent. Be helpful and concise."
      });

      const runtime = getMainRuntime();

      useEffect(() => {
        Effect.runFork(
          Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: 'ui:pane',
              action: 'open_agent_chat_pane'
          })).pipe(Effect.provide(runtime))
        );
      }, [runtime]);

      const handleSend = () => {
        if (currentInput.trim()) {
          sendMessage(currentInput.trim());
        }
      };

      return (
        <div className="flex flex-col h-full p-1">
          <div className="flex-shrink-0 p-1 text-xs text-muted-foreground text-center border-b border-border mb-1">
            Provider: {currentProviderName} | Model: {currentModelName}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>AI Error</AlertTitle>
              <AlertDescription className="text-xs">
                {error.message || "An unknown AI error occurred."}
                {error.cause && <div className="mt-1 text-xs opacity-70">Cause: {String(error.cause)}</div>}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-grow min-h-0">
            <ChatContainer
              className="!border-0 !shadow-none !bg-transparent"
              messages={messages.map(m => ({ // Adapt UIAgentChatMessage to ChatMessageProps
                id: m.id,
                role: m.role,
                content: m.content || "",
                isStreaming: m.isStreaming,
                author: m.role === 'user' ? 'You' : (m.role === 'assistant' ? 'Agent' : 'System'),
                timestamp: m.timestamp || Date.now(),
              }))}
              userInput={currentInput}
              onUserInputChange={setCurrentInput}
              onSendMessage={handleSend}
              isLoading={isLoading}
            />
          </div>
        </div>
      );
    };

    export default AgentChatPane;
    ```

**Task 3.4: Integrate `AgentChatPane` into `PaneManager` and Hotbar**

1.  **Modify `src/panes/PaneManager.tsx`:**

    - Import `AgentChatPane` from `../components/ai/AgentChatPane`.
    - Add a case to render `<AgentChatPane />` when `pane.type === 'agent_chat'`.
    - Update the final fallback condition in `PaneManager` to include `'agent_chat'`.

2.  **Modify `src/components/hud/Hotbar.tsx`:**
    - Import `usePaneStore` and `AGENT_CHAT_PANE_ID`.
    - Import an appropriate icon (e.g., `Bot` or `Brain` from `lucide-react`).
    - Add a new `HotbarItem`:
      - `slotNumber`: Assign an available slot.
      - `onClick`: `usePaneStore.getState().openAgentChatPane()`.
      - `title`: "Agent Chat".
      - `isActive`: `activePaneId === AGENT_CHAT_PANE_ID`.
    - Adjust the number of empty slots rendered if maintaining a fixed Hotbar size.

**Task 3.5: Runtime Integration Verification**

1.  **Review `src/services/runtime.ts`:**
    - Confirm that `OpenAIAgentLanguageModelLive` (which provides `AgentLanguageModel.Tag`) is correctly composed into `FullAppLayer`.
    - Ensure all its dependencies (`OpenAIClient.OpenAiClient`, `ConfigurationService`, `HttpClient.Tag`, `TelemetryService`) are also correctly provided within `FullAppLayer`.
    - The `getMainRuntime().context.get(AgentLanguageModel)` call in `useAgentChat` should resolve to the `OpenAIAgentLanguageModelLive` implementation.

---

## Detailed Testing Guidelines for Phase 3

**I. Unit Tests for `useAgentChat` Hook (`src/tests/unit/hooks/ai/useAgentChat.test.ts`)**

- **Setup:**

  - Mock `getMainRuntime()` to return a test runtime.
  - This test runtime should provide a mock `AgentLanguageModel` service and a mock `TelemetryService`.
  - The mock `AgentLanguageModel` should have `vi.fn()` for `streamText` that can be controlled to return:
    - A successful stream of `AiTextChunk`s.
    - A stream that emits an `AIProviderError`.
    - A stream that can be programmatically interrupted/aborted.
  - Spy on `TelemetryService.trackEvent`.

- **Test Cases:**
  1.  **Initial State:**
      - Verify `messages` array contains only the initial system message.
      - Verify `currentInput` is empty.
      - Verify `isLoading` is `false`.
      - Verify `error` is `null`.
  2.  **`sendMessage` - Happy Path (Streaming Success):**
      - Set `currentInput` to a test prompt.
      - Call `sendMessage(currentInput)`.
      - Assert `isLoading` becomes `true`.
      - Assert a user message is added to `messages`.
      - Assert an assistant placeholder message (with `isStreaming: true` and an `id`) is added.
      - Verify `AgentLanguageModel.streamText` is called with the correct parameters (including formatted conversation history).
      - Simulate the mock stream emitting `AiTextChunk`s:
        - Verify the content of the streaming assistant message in `messages` state updates incrementally.
        - Verify `_updateId` changes to force re-renders.
      - Simulate stream completion:
        - Verify `isStreaming` on the assistant message becomes `false`.
        - Verify `isLoading` becomes `false`.
        - Verify `error` remains `null`.
      - Verify `currentInput` is cleared.
      - Verify appropriate `TelemetryService.trackEvent` calls (e.g., "send_message_start", "stream_chunk_received" (if added), "stream_completed").
  3.  **`sendMessage` - Error from `streamText`:**
      - Set `currentInput` to a test prompt.
      - Configure mock `AgentLanguageModel.streamText` to return `Stream.fail(new AIProviderError(...))`.
      - Call `sendMessage(currentInput)`.
      - Verify `isLoading` becomes `true`, then `false`.
      - Verify user message and assistant placeholder are added.
      - Verify the `error` state is set to the `AIProviderError` instance.
      - Verify the streaming assistant message is updated to reflect the error or removed/marked as failed.
      - Verify `TelemetryService.trackEvent` for "send_message_failure_stream".
  4.  **`sendMessage` - Stream Abort/Cancel:**
      - Set `currentInput`. Call `sendMessage`.
      - Simulate stream starting.
      - Programmatically trigger the `AbortController.abort()` (used internally by the hook if `streamAbortControllerRef` is used).
      - Verify `isLoading` becomes `false`.
      - Verify the streaming assistant message is finalized (not left in `isStreaming: true` state).
      - Verify `TelemetryService.trackEvent` for "stream_interrupted_or_aborted".
      - Test that sending a new message aborts any previous ongoing stream.
  5.  **Input Handling:**
      - Verify `sendMessage` does nothing if `currentInput` is empty or only whitespace.
  6.  **History Preparation:**
      - Send multiple messages and verify that `AgentLanguageModel.streamText` is called with a prompt containing the correct history (system message first, then alternating user/assistant messages, excluding any incomplete streaming message).
  7.  **Cleanup Effect:**
      - Test that if the hook is unmounted while a stream is active, the `AbortController.abort()` is called. (Use `renderHook`'s `unmount` function).
      - Verify `TelemetryService.trackEvent` for "hook_unmount_stream_cancel".

**II. Unit Tests for `AgentChatPane` Component (`src/tests/unit/components/ai/AgentChatPane.test.tsx`)**

- **Setup:**

  - Mock the `useAgentChat` hook using `vi.mock()`. The mock should return controllable state values (`messages`, `isLoading`, `error`, `currentInput`) and mock functions (`setCurrentInput`, `sendMessage`).
  - Mock `getMainRuntime` to provide a mock `TelemetryService`.
  - Wrap the component in `QueryClientProvider` and `TooltipProvider` if not already handled by a global test setup.

- **Test Cases:**
  1.  **Rendering Messages:**
      - Provide various `messages` (user, assistant, system, streaming assistant) to the mocked `useAgentChat`.
      - Verify `ChatContainer` receives correctly mapped props.
      - Verify messages are rendered with appropriate styling/authors.
  2.  **Input Handling:**
      - Simulate typing in the `ChatWindow`'s input. Verify `setCurrentInput` (from mocked hook) is called.
  3.  **Sending Messages:**
      - Simulate clicking the "Send" button. Verify `sendMessage` (from mocked hook) is called.
      - Verify "Send" button is disabled when `isLoading` (from mocked hook) is `true` or input is empty.
  4.  **Loading State:**
      - Set `isLoading` (from mocked hook) to `true`. Verify UI elements (e.g., input, send button) are appropriately disabled or show loading indicators.
  5.  **Error Display:**
      - Provide an `error` object (e.g., `new AIProviderError(...)`) from the mocked `useAgentChat`.
      - Verify the `Alert` component displays the error message correctly.
  6.  **Telemetry:**
      - Verify that on mount, `TelemetryService.trackEvent` is called with `category: 'ui:pane', action: 'open_agent_chat_pane'`.
  7.  **Provider/Model Display:**
      - Verify the placeholder text for provider and model name is rendered.

**III. Unit Tests for Store Actions (`src/tests/unit/stores/panes/actions/openAgentChatPane.test.ts`)**

- **Setup:** Use `create` from Zustand directly to create a test instance of the store or mock the `set` function.
- **Test Cases:**
  1.  **Open New Pane:**
      - Call `openAgentChatPaneAction(mockSet)`.
      - Verify `mockSet` was called with a function that updates state:
        - Adds a new pane with `id: AGENT_CHAT_PANE_ID`, `type: 'agent_chat'`, correct title, and default dimensions.
        - Makes the new pane active.
  2.  **Open Existing Pane:**
      - Initialize store state with an existing 'agent_chat' pane (inactive).
      - Call `openAgentChatPaneAction(mockSet)`.
      - Verify `mockSet` was called to:
        - Make the existing 'agent_chat' pane active.
        - Bring it to the front (e.g., move to end of `panes` array).

---

**Verification for Phase 3:**

1.  **Type Checking:** Run `pnpm tsc --noEmit`.
2.  **Linting & Formatting:** Run `pnpm lint` and `pnpm format:write`.
3.  **Unit Tests:** All unit tests specified above MUST pass.
4.  **UI Functionality (Manual Testing):**
    - Open the "Agent Chat" pane from the Hotbar.
    - Verify the pane opens with the initial system message.
    - Verify the placeholder provider/model names are displayed.
    - Send a message. Observe:
      - User message appears correctly.
      - `isLoading` state activates (e.g., Send button shows "...", input might be disabled).
      - A streaming response from the assistant appears and updates incrementally.
      - `isLoading` state deactivates on completion.
    - Test sending multiple messages; verify history is maintained correctly for the LLM prompt.
    - Test error handling:
      - Temporarily misconfigure OpenAI API key (e.g., in `ConfigurationService` if it's read by `OpenAIClientLive`, or by modifying the mock in `OpenAIClientLive.test.ts` if testing directly against a mock).
      - Send a message and verify an error message is displayed in the `AgentChatPane`.
    - Test stream cancellation: Send a message, then quickly send another. Verify the first stream appears to stop or is replaced, and the new stream starts. (Requires robust `AbortController` logic in `useAgentChat`).
    - Verify console logs for telemetry events. Check for any React warnings or Effect-related errors.

Upon successful completion and verification of these tasks, Commander will have a functional `AgentChat` pane using the OpenAI-compatible AI provider, with responses streamed to the UI. This forms the first end-to-end integration of the new Effect AI backend for a core user-facing feature.Okay, Phase 2 analysis complete. The core implementation is likely sound, but the lack of working unit tests is a significant issue that needs to be addressed eventually.

Here's the rewritten `docs/AI-PHASE03.md` with extra details and explicit test instructions.

---

# AI Roadmap: Phase 3 - Implement `AgentChat` Pane (Initial Version with OpenAI)

**Objective:** Create a new pane where users can interact with an AI agent. This initial version will use the `AgentLanguageModel` service (provided by the OpenAI-compatible backend implemented in Phase 2) for chat completions.

**Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Continue to strictly follow Effect-TS patterns for any service interactions. UI components will primarily use React patterns.
- **Prerequisites:**
  - Phases 0 and 1 must be completed (core AI abstractions defined: `AgentLanguageModel`, `AgentChatMessage`, `AIProviderError`, etc.).
  - Phase 2's `OpenAIAgentLanguageModelLive` layer (providing `AgentLanguageModel.Tag`) must be correctly integrated into `FullAppLayer` (from `src/services/runtime.ts`) and assumed to be functional. This layer depends on `OpenAIClient.OpenAiClient`, `ConfigurationService`, and `TelemetryService`.
  - The `AgentLanguageModel` interface should use `AIProviderError` (or a more generic custom error like `AIGenericError`) for its error channel, as established by Phase 2 fixes.
- **UI Components:** Utilize existing Shadcn UI components like `ChatContainer` and `ChatWindow` (from `src/components/chat/`), `Button`, `Input`, `ScrollArea`, `Card`, `Label`, `Tabs`, `Textarea`, and `Alert` (from `src/components/ui/`).
- **Error Handling:** The UI should gracefully display errors of type `AIProviderError` (or its parent types) received from the AI services.
- **Logging and Telemetry:** All significant user actions and events (pane opening, message sending, errors) **MUST** be logged using the `TelemetryService` via the main Effect runtime.
- **State Management:**
  - Pane state is managed by `usePaneStore` (Zustand).
  - Chat-specific state (messages, input, loading status, errors) will be managed locally within the `useAgentChat` hook.

---

## Phase 3 Tasks:

**Task 3.1: Define New Pane Type, Constants, and Store Logic**

1.  **Update `src/types/pane.ts`:**

    - Add `'agent_chat'` to the `Pane['type']` union.
      ```typescript
      // src/types/pane.ts
      export type Pane = {
        // ... existing types ...
        type: /* ... existing types ... */ "agent_chat" | string;
      };
      ```

2.  **Update `src/stores/panes/constants.ts`:**

    - Define and export constants for the new pane:
      ```typescript
      // src/stores/panes/constants.ts
      export const AGENT_CHAT_PANE_ID = "agent_chat_main";
      export const AGENT_CHAT_PANE_TITLE = "Agent Chat";
      export const AGENT_CHAT_PANE_DEFAULT_WIDTH = 500;
      export const AGENT_CHAT_PANE_DEFAULT_HEIGHT = 600;
      ```

3.  **Create `src/stores/panes/actions/openAgentChatPane.ts`:**

    - Implement `openAgentChatPaneAction` using `addPaneActionLogic`. This action should open a new pane of type `'agent_chat'` with the defined ID, title, and default dimensions, or bring an existing one to the front.

      ```typescript
      // src/stores/panes/actions/openAgentChatPane.ts
      import { type PaneInput } from "@/types/pane";
      import { type PaneStoreType, type SetPaneStore } from "../types";
      import { addPaneActionLogic } from "./addPane";
      import {
        AGENT_CHAT_PANE_ID,
        AGENT_CHAT_PANE_TITLE,
        AGENT_CHAT_PANE_DEFAULT_WIDTH,
        AGENT_CHAT_PANE_DEFAULT_HEIGHT,
      } from "../constants";

      export function openAgentChatPaneAction(set: SetPaneStore) {
        set((state: PaneStoreType) => {
          const newPaneInput: PaneInput = {
            id: AGENT_CHAT_PANE_ID,
            type: "agent_chat",
            title: AGENT_CHAT_PANE_TITLE,
            dismissable: true,
            width: AGENT_CHAT_PANE_DEFAULT_WIDTH,
            height: AGENT_CHAT_PANE_DEFAULT_HEIGHT,
          };
          return addPaneActionLogic(
            state,
            newPaneInput,
            true /* tile positioning */,
          );
        });
      }
      ```

4.  **Update `src/stores/panes/actions/index.ts`:** Export `openAgentChatPaneAction`.
5.  **Update `src/stores/panes/types.ts`:** Add `openAgentChatPane: () => void;` to `PaneStoreType`.
6.  **Update `src/stores/pane.ts`:** Import and integrate `openAgentChatPaneAction`.

**Task 3.2: Create `useAgentChat` Hook**

This hook will encapsulate the logic for interacting with the `AgentLanguageModel` service and managing chat state for a single chat session.

1.  **Create Directory:** `src/hooks/ai/` (if it doesn't exist).
2.  **Create File:** `src/hooks/ai/useAgentChat.ts`.
3.  **Content:**

    ```typescript
    // src/hooks/ai/useAgentChat.ts
    import { useState, useCallback, useRef, useEffect } from "react";
    import { Effect, Stream, Cause, Option } from "effect";
    import {
      AgentLanguageModel,
      type AiTextChunk,
      type AgentChatMessage,
      type AIProviderError,
      type StreamTextOptions,
    } from "@/services/ai/core";
    import { getMainRuntime } from "@/services/runtime";
    import {
      TelemetryService,
      type TelemetryEvent,
    } from "@/services/telemetry";

    interface UseAgentChatOptions {
      initialSystemMessage?: string;
      // Future: providerKey?: string; modelName?: string;
    }

    // Extend AgentChatMessage for UI-specific properties for local state management
    export interface UIAgentChatMessage extends AgentChatMessage {
      id: string; // Unique ID for React list keys and targeting updates
      _updateId?: number; // Force re-render for streaming updates
      isStreaming?: boolean; // Indicates if the message is currently being streamed
      timestamp: number; // Client-side timestamp for ordering and display
    }

    export function useAgentChat(options: UseAgentChatOptions = {}) {
      const { initialSystemMessage = "You are a helpful AI assistant." } =
        options;

      const systemMessageInstance: UIAgentChatMessage = {
        id: `system-${Date.now()}`, // Unique ID for system message
        role: "system",
        content: initialSystemMessage,
        timestamp: Date.now(),
      };

      const [messages, setMessages] = useState<UIAgentChatMessage[]>([
        systemMessageInstance,
      ]);
      const [currentInput, setCurrentInput] = useState<string>("");
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [error, setError] = useState<AIProviderError | null>(null);

      const runtimeRef = useRef(getMainRuntime()); // Capture runtime instance
      const streamAbortControllerRef = useRef<AbortController | null>(null);
      const currentAssistantMessageIdRef = useRef<string | null>(null);

      const runTelemetry = useCallback(
        (event: TelemetryEvent) => {
          Effect.runFork(
            Effect.provideService(
              Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)),
              TelemetryService,
              runtimeRef.current.context.get(TelemetryService),
            ),
          );
        },
        [runtimeRef],
      ); // runtimeRef is stable

      const sendMessage = useCallback(
        async (promptText: string) => {
          if (!promptText.trim()) return;

          const userMessage: UIAgentChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: promptText.trim(),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, userMessage]);
          setCurrentInput("");
          setIsLoading(true);
          setError(null);
          runTelemetry({
            category: "agent_chat",
            action: "send_message_start",
            label: "User message sent",
            value: promptText.substring(0, 50),
          });

          // Prepare conversation history for the LLM (core AgentChatMessage, no UI fields)
          const conversationHistoryForLLM: AgentChatMessage[] = messages
            .filter(
              (m) =>
                m.id !== currentAssistantMessageIdRef.current &&
                m.role !== "system",
            ) // Exclude current streaming assistant and system message
            .map(
              ({ id: _id, _updateId, isStreaming, timestamp, ...coreMsg }) =>
                coreMsg,
            )
            .concat([{ role: "user", content: userMessage.content }]); // Add current user message

          // Abort previous stream if any
          if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            runTelemetry({
              category: "agent_chat",
              action: "previous_stream_aborted",
              label: currentAssistantMessageIdRef.current || "N/A",
            });
          }
          streamAbortControllerRef.current = new AbortController();
          const signal = streamAbortControllerRef.current.signal;

          const assistantMsgId = `assistant-${Date.now()}`;
          currentAssistantMessageIdRef.current = assistantMsgId;

          // Add a placeholder for the assistant's response
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: "",
              isStreaming: true,
              timestamp: Date.now(),
            },
          ]);

          const streamTextOptions: StreamTextOptions = {
            prompt: {
              // Ensure prompt matches what @effect/ai expects
              messages: [
                { role: "system", content: initialSystemMessage },
                ...conversationHistoryForLLM,
              ],
            },
            // model, temperature, maxTokens can be added here if desired
          };

          const program = Effect.gen(function* (_) {
            const agentLM = yield* _(AgentLanguageModel);
            const textStream = agentLM.streamText(streamTextOptions);

            yield* _(
              Stream.runForEach(
                textStream,
                (chunk: AiTextChunk) =>
                  Effect.sync(() => {
                    if (signal.aborted) {
                      // Check if this specific stream was aborted
                      runTelemetry({
                        category: "agent_chat",
                        action: "stream_aborted_client_chunk_processing",
                        label: assistantMsgId,
                      });
                      return; // Stop processing if aborted
                    }
                    setMessages((prevMsgs) =>
                      prevMsgs.map((msg) =>
                        msg.id === assistantMsgId
                          ? {
                              ...msg,
                              content: (msg.content || "") + chunk.text,
                              _updateId: Date.now(),
                            }
                          : msg,
                      ),
                    );
                  }),
                { signal }, // Pass AbortSignal to Effect stream processing
              ),
            );
          }).pipe(
            Effect.provideService(
              AgentLanguageModel,
              runtimeRef.current.context.get(AgentLanguageModel),
            ),
            Effect.tapErrorCause((cause) =>
              Effect.sync(() => {
                // Check if the error is due to AbortSignal
                let isAbort = signal.aborted;
                if (!isAbort && Cause.isDieType(cause)) {
                  const defect = cause.defect;
                  if (defect instanceof Error && defect.name === "AbortError") {
                    isAbort = true;
                  }
                }

                if (isAbort || Cause.isInterruptedOnly(cause)) {
                  runTelemetry({
                    category: "agent_chat",
                    action: "stream_interrupted_or_aborted",
                    label: assistantMsgId,
                  });
                  console.log(
                    `Agent chat stream (${assistantMsgId}) was interrupted or aborted.`,
                  );
                } else {
                  const squashedError = Cause.squash(cause) as AIProviderError; // Cast to our error type
                  setError(squashedError);
                  runTelemetry({
                    category: "agent_chat",
                    action: "send_message_failure_stream",
                    label: (squashedError as Error).message,
                    value: Cause.pretty(cause),
                  });
                }
              }),
            ),
            Effect.ensuring(
              Effect.sync(() => {
                setMessages((prevMsgs) =>
                  prevMsgs.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, isStreaming: false, _updateId: Date.now() }
                      : msg,
                  ),
                );
                setIsLoading(false);
                // Only clear the controller if it's the one for the completed/failed stream
                if (streamAbortControllerRef.current?.signal === signal) {
                  streamAbortControllerRef.current = null;
                }
                if (currentAssistantMessageIdRef.current === assistantMsgId) {
                  currentAssistantMessageIdRef.current = null;
                }
              }),
            ),
          );

          Effect.runFork(program);
        },
        [messages, initialSystemMessage, runTelemetry],
      ); // Dependencies for sendMessage

      // Cleanup stream on unmount
      useEffect(() => {
        return () => {
          if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            runTelemetry({
              category: "agent_chat",
              action: "hook_unmount_stream_cancel",
              label: currentAssistantMessageIdRef.current || "N/A",
            });
          }
        };
      }, [runTelemetry]); // runTelemetry is memoized

      return {
        messages,
        currentInput,
        setCurrentInput,
        isLoading,
        error,
        sendMessage,
      };
    }
    ```

    **Notes on `useAgentChat.ts`:**

    - Extends `AgentChatMessage` to `UIAgentChatMessage` for local state to include UI-specific fields like `id`, `_updateId` (for forcing re-renders during streaming), and `isStreaming`.
    - The `sendMessage` function now correctly filters out UI-specific fields and the current streaming message before preparing `conversationHistoryForLLM`.
    - It ensures the `system` message is prepended to the history sent to the LLM.
    - Uses an `AbortController` to cancel ongoing streams if a new message is sent or the component unmounts.
    - The `Stream.runForEach` has the `signal` option passed.
    - Error handling in `tapErrorCause` differentiates between deliberate interruption/abort and other errors.
    - `currentAssistantMessageIdRef` helps target updates and cleanup correctly.

**Task 3.3: Create `AgentChatPane` UI Component**

1.  **Create Directory:** `src/components/ai/` (if it doesn't exist).
2.  **Create File:** `src/components/ai/AgentChatPane.tsx`.
3.  **Content:**

    ```typescript
    // src/components/ai/AgentChatPane.tsx
    import React, { useEffect } from 'react';
    import { ChatContainer } from '@/components/chat'; // Re-use existing ChatContainer/ChatWindow
    import { useAgentChat, type UIAgentChatMessage } from '@/hooks/ai/useAgentChat';
    import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
    import { AlertTriangle } from 'lucide-react';
    import { Effect } from 'effect';
    import { TelemetryService } from '@/services/telemetry';
    import { getMainRuntime } from '@/services/runtime';

    const currentProviderName = "Default Provider"; // Placeholder
    const currentModelName = "Default Model";    // Placeholder

    const AgentChatPane: React.FC = () => {
      const {
        messages,
        currentInput,
        setCurrentInput,
        isLoading,
        error,
        sendMessage,
      } = useAgentChat({
        initialSystemMessage: "You are Commander's AI Agent. Be helpful and concise."
      });

      const runtime = getMainRuntime();

      useEffect(() => {
        Effect.runFork(
          Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: 'ui:pane',
              action: 'open_agent_chat_pane',
              label: AGENT_CHAT_PANE_TITLE // Assuming AGENT_CHAT_PANE_TITLE is accessible or use a hardcoded string
          })).pipe(Effect.provide(runtime))
        );
      }, [runtime]);

      const handleSend = () => {
        if (currentInput.trim()) {
          sendMessage(currentInput.trim());
        }
      };

      return (
        <div className="flex flex-col h-full p-1">
          <div className="flex-shrink-0 p-1 text-xs text-muted-foreground text-center border-b border-border mb-1">
            Provider: {currentProviderName} | Model: {currentModelName}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-2 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>AI Error</AlertTitle>
              <AlertDescription className="text-xs">
                {error.message || "An unknown AI error occurred."}
                {error.cause && <div className="mt-1 text-xs opacity-70">Cause: {String(error.cause)}</div>}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-grow min-h-0"> {/* Essential for ScrollArea in ChatContainer */}
            <ChatContainer
              className="!border-0 !shadow-none !bg-transparent !p-0" // Adjusted for pane context
              messages={messages.map((m: UIAgentChatMessage) => ({ // Map UIAgentChatMessage to ChatMessageProps for ChatWindow
                id: m.id,
                role: m.role,
                content: m.content || "",
                isStreaming: m.isStreaming,
                author: m.role === 'user' ? 'You' : (m.role === 'assistant' ? 'Agent' : 'System'),
                timestamp: m.timestamp, // Pass timestamp
              }))}
              userInput={currentInput}
              onUserInputChange={setCurrentInput}
              onSendMessage={handleSend}
              isLoading={isLoading}
            />
          </div>
        </div>
      );
    };

    export default AgentChatPane;
    ```

    **Notes on `AgentChatPane.tsx`:**

    - Maps `UIAgentChatMessage` (from `useAgentChat`) to `ChatMessageProps` (expected by `ChatContainer`/`ChatWindow`).
    - Displays provider/model name placeholders.
    - Includes an `Alert` component to display errors.

**Task 3.4: Integrate `AgentChatPane` into `PaneManager` and Hotbar**

1.  **Modify `src/panes/PaneManager.tsx`:**

    - Import `AgentChatPane` from `../components/ai/AgentChatPane`.
    - Add a case: `{pane.type === 'agent_chat' && <AgentChatPane />}`.
    - Update the final fallback condition to include `'agent_chat'`.

2.  **Modify `src/components/hud/Hotbar.tsx`:**
    - Import `usePaneStore` and `AGENT_CHAT_PANE_ID`.
    - Import an icon (e.g., `Bot` from `lucide-react`).
    - Add `<HotbarItem slotNumber={X} onClick={() => usePaneStore.getState().openAgentChatPane()} title="Agent Chat" isActive={activePaneId === AGENT_CHAT_PANE_ID}><Bot ... /></HotbarItem>`. Adjust slot number.
    - Adjust empty slots calculation if necessary.

**Task 3.5: Runtime Integration Verification (Conceptual)**

- No code changes here, but conceptually verify that `OpenAIAgentLanguageModelLive` is correctly part of `FullAppLayer` and provides `AgentLanguageModel.Tag`. This ensures `useAgentChat` can resolve the service.

---

## Detailed Testing Guidelines for Phase 3

**I. Unit Tests for `useAgentChat` Hook (`src/tests/unit/hooks/ai/useAgentChat.test.ts`)**

- **File:** `src/tests/unit/hooks/ai/useAgentChat.test.ts`
- **Setup:**

  - Mock `getMainRuntime()`:

    ```typescript
    import {
      AgentLanguageModel,
      type AiTextChunk,
      type AIProviderError,
    } from "@/services/ai/core";
    import { TelemetryService } from "@/services/telemetry";
    import { Effect, Stream, Context, Layer, Runtime } from "effect";
    import { vi } from "vitest";

    const mockStreamText = vi.fn();
    const mockAgentLanguageModel: AgentLanguageModel = {
      _tag: "AgentLanguageModel",
      generateText: vi.fn(),
      streamText: mockStreamText,
      generateStructured: vi.fn(),
    };
    const mockTrackEvent = vi.fn(() => Effect.void);
    const mockTelemetryService: TelemetryService = {
      trackEvent: mockTrackEvent,
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn(() => Effect.void),
    };

    const TestAgentLMLayer = Layer.succeed(
      AgentLanguageModel,
      mockAgentLanguageModel,
    );
    const TestTelemetryLayer = Layer.succeed(
      TelemetryService,
      mockTelemetryService,
    );
    const TestRuntimeLayer = Layer.merge(TestAgentLMLayer, TestTelemetryLayer);
    const testRuntime = Runtime.makeDefault(
      Context.make(
        TestAgentLMLayer.context.pipe(
          _Context.merge(TestTelemetryLayer.context),
        ) as any,
      ),
    );

    vi.mock("@/services/runtime", () => ({
      getMainRuntime: () => testRuntime,
    }));
    ```

  - Use `renderHook` from `@testing-library/react` for testing the hook.
  - Use `act` to wrap state updates.

- **Test Cases:**
  1.  **Initial State:**
      - Verify `messages` array has one system message with content from `initialSystemMessage`.
      - Verify `currentInput` is `""`, `isLoading` is `false`, `error` is `null`.
  2.  **`sendMessage` - Successful Stream:**
      - `mockStreamText.mockReturnValue(Stream.fromIterable([{text: "Hello"}, {text: " World"}]))`.
      - Call `sendMessage("Hi")`.
      - Assert `isLoading` becomes `true` then `false`.
      - Assert `messages` updates: user message added, then assistant placeholder, then assistant content updates, finally `isStreaming: false`.
      - Verify `mockStreamText` called with correct history (system message prepended, user message included).
      - Verify `mockTrackEvent` called for "send_message_start".
  3.  **`sendMessage` - Stream Error:**
      - `mockStreamText.mockReturnValue(Stream.fail(new AIProviderError({ message: "Test Error", provider: "Mock" })))`.
      - Call `sendMessage("Error test")`.
      - Verify `error` state is set to the `AIProviderError` instance.
      - Verify `isLoading` becomes `false`.
      - Verify `messages` reflect the failed attempt (e.g., assistant placeholder marked as not streaming, or error message added).
      - Verify `mockTrackEvent` for "send_message_failure_stream".
  4.  **`sendMessage` - Stream Abort (New Message):**
      - `mockStreamText.mockImplementation(() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 50); return Stream.asyncInterrupt<AiTextChunk>(() => Effect.never(), { signal: ac.signal }); })`.
      - Call `sendMessage("First")`.
      - Immediately call `sendMessage("Second")`.
      - Verify the first stream's `AbortController` was called.
      - Verify `mockTrackEvent` for "previous_stream_aborted" and then for the new stream.
  5.  **`sendMessage` - Empty Input:**
      - Call `sendMessage("   ")`.
      - Verify `mockStreamText` was NOT called and state remains unchanged (except input clearing).
  6.  **Cleanup on Unmount:**
      - Render the hook. Call `sendMessage`.
      - Simulate stream starting.
      - Call `unmount()` from `renderHook`.
      - Verify the `AbortController` for the stream was aborted.
      - Verify `mockTrackEvent` for "hook_unmount_stream_cancel".

**II. Unit Tests for `AgentChatPane` Component (`src/tests/unit/components/ai/AgentChatPane.test.tsx`)**

- **File:** `src/tests/unit/components/ai/AgentChatPane.test.tsx`
- **Setup:**

  - Mock `useAgentChat` hook:
    ```typescript
    import { vi } from "vitest";
    const mockUseAgentChat = {
      messages: [],
      currentInput: "",
      setCurrentInput: vi.fn(),
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
    };
    vi.mock("@/hooks/ai/useAgentChat", () => ({
      useAgentChat: () => mockUseAgentChat,
    }));
    ```
  - Mock `getMainRuntime` as in `useAgentChat.test.ts` to provide `TelemetryService`.
  - Render `AgentChatPane` within `QueryClientProvider` and `TooltipProvider`.

- **Test Cases:**
  1.  **Initial Render:**
      - Provide initial messages (system message) via `mockUseAgentChat.messages`.
      - Verify `ChatContainer` is rendered and receives mapped messages.
      - Verify provider/model name placeholders are shown.
  2.  **Input Interaction:**
      - Simulate typing in the `ChatContainer`'s input area (this will involve finding the `Textarea` within `ChatWindow`).
      - Verify `mockUseAgentChat.setCurrentInput` is called.
  3.  **Send Button:**
      - Set `mockUseAgentChat.currentInput` to some text.
      - Simulate clicking the "Send" button.
      - Verify `mockUseAgentChat.sendMessage` is called.
      - Set `mockUseAgentChat.isLoading` to `true`. Verify button is disabled.
      - Set `mockUseAgentChat.currentInput` to `""`. Verify button is disabled.
  4.  **Error Display:**
      - Set `mockUseAgentChat.error` to an `AIProviderError` instance.
      - Verify the `Alert` component renders and displays the error message.
  5.  **Telemetry on Mount:**
      - Verify `TelemetryService.trackEvent` (via its mock) is called with `category: 'ui:pane', action: 'open_agent_chat_pane'`.

**III. Unit Tests for Store Actions (`src/tests/unit/stores/panes/actions/openAgentChatPane.test.ts`)**

- **File:** `src/tests/unit/stores/panes/actions/openAgentChatPane.test.ts`
- **Setup:**
  - Create a mock `set` function: `const mockSet = vi.fn();`
  - Create initial store states for different scenarios.
- **Test Cases:**
  1.  **Open New Pane:**
      - `const initialState = { panes: [], activePaneId: null, ... };`
      - `openAgentChatPaneAction(mockSet)(initialState);`
      - `expect(mockSet).toHaveBeenCalledWith(expect.any(Function));`
      - Call the function passed to `mockSet` with `initialState` and assert the returned state:
        - Has one pane with `id: AGENT_CHAT_PANE_ID`, `type: 'agent_chat'`, correct title, default dimensions.
        - This new pane is active (`isActive: true`, `activePaneId` is set).
  2.  **Activate Existing Pane:**
      - `const existingPane = { id: AGENT_CHAT_PANE_ID, type: 'agent_chat', ..., isActive: false };`
      - `const initialState = { panes: [existingPane], activePaneId: 'other-pane', ... };`
      - `openAgentChatPaneAction(mockSet)(initialState);`
      - Assert the `mockSet` function results in:
        - The existing pane becoming active.
        - `activePaneId` being `AGENT_CHAT_PANE_ID`.
        - Pane order potentially changed to bring it to front.

---

**Verification for Phase 3:**

1.  **Type Checking:** Run `pnpm tsc --noEmit`.
2.  **Linting & Formatting:** Run `pnpm lint` and `pnpm format:write`.
3.  **Unit Tests:** All unit tests specified above (for `useAgentChat`, `AgentChatPane`, and store actions) MUST pass.
4.  **UI Functionality (Manual Testing):**
    - Open the "Agent Chat" pane from the Hotbar.
    - Verify the pane opens with the initial system message: "You are Commander's AI Agent. Be helpful and concise."
    - Verify the placeholder provider/model names are displayed.
    - Send a message (e.g., "Hello"). Observe:
      - User message appears correctly.
      - `isLoading` state activates (Send button shows "...", input might be disabled).
      - An assistant message placeholder appears with `isStreaming: true`.
      - The assistant's response streams into the placeholder message.
      - Once the full response is received, `isStreaming` becomes `false` for the assistant message.
      - `isLoading` state deactivates on completion.
    - Test sending multiple messages; verify history is maintained correctly for the LLM prompt (system message + user/assistant turns).
    - Test error handling:
      - Temporarily set an invalid OpenAI API key in `ConfigurationService` (via `DefaultDevConfigLayer` or by direct modification for testing if your `OpenAIClientLive` reads it dynamically).
      - Send a message and verify an `AIProviderError` message is displayed in the `AgentChatPane`.
    - Test stream cancellation: Send a message, then quickly send another. Verify the first stream appears to stop or is replaced, and the new stream starts.
    - Verify console logs for telemetry events related to chat actions. Check for any React warnings or Effect-related errors.

Upon successful completion and verification of these tasks, Commander will have a functional `AgentChat` pane using the OpenAI-compatible AI provider, with responses streamed to the UI. This forms the first end-to-end integration of the new Effect AI backend for a core user-facing feature.
