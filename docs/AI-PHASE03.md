Okay, Agent, here are the specific instructions for implementing **Phase 3 (Implement `AgentChat` Pane - Initial Version with OpenAI)**. This phase focuses on creating the user-facing chat interface that will utilize the `AgentLanguageModel` service provided by the OpenAI-compatible backend implemented in Phase 2.

**Preamble for the Coding Agent:**

*   **Effect-TS Best Practices:** Continue adhering to Effect-TS patterns.
*   **Directory Structure:** Create new directories and files as specified.
*   **Prerequisites:** Phase 0, 1, and 2 must be completed. Specifically, `AgentLanguageModel.Tag` must be defined, and `OpenAIAgentLanguageModelLive` (or a similar layer providing `AgentLanguageModel.Tag`) must be correctly integrated into `FullAppLayer`.
*   **UI Components:** You will be using existing Shadcn UI components like `ChatWindow.tsx`, `Button`, `Select` (or a custom dropdown if `Select` is not yet added/suitable).

---

## Phase 3: Implement `AgentChat` Pane (Initial Version with OpenAI)

**Objective:** Create a new pane where users can interact with an AI agent, initially using the OpenAI-compatible backend.

**Task 3.1: Define New Pane Type, Constants, and Store Logic**

1.  **Action:** Update `src/types/pane.ts`.
    *   Add `'agent_chat'` to the `Pane['type']` union.
        ```typescript
        // src/types/pane.ts
        export type Pane = {
          // ... existing types ...
          type: /* ... existing types ... */ | 'agent_chat' | string;
          // ...
        }
        ```
2.  **Action:** Update `src/stores/panes/constants.ts`.
    *   Define and export constants for the new pane:
        ```typescript
        // src/stores/panes/constants.ts
        export const AGENT_CHAT_PANE_ID = 'agent_chat_main'; // Or generate unique IDs if multiple agent chats are needed
        export const AGENT_CHAT_PANE_TITLE = 'Agent Chat';
        ```
3.  **Action:** Create `src/stores/panes/actions/openAgentChatPane.ts`.
    *   **Content:**
        ```typescript
        // src/stores/panes/actions/openAgentChatPane.ts
        import { type PaneInput } from '@/types/pane';
        import { type PaneStoreType, type SetPaneStore } from '../types';
        import { addPaneActionLogic } from './addPane';
        import { AGENT_CHAT_PANE_ID, AGENT_CHAT_PANE_TITLE } from '../constants';

        export function openAgentChatPaneAction(set: SetPaneStore) {
          set((state: PaneStoreType) => {
            const newPaneInput: PaneInput = {
              id: AGENT_CHAT_PANE_ID, // For now, assume a single main agent chat pane
              type: 'agent_chat',
              title: AGENT_CHAT_PANE_TITLE,
              dismissable: true,
              width: 500, // Default size, adjust as needed
              height: 600,
            };
            // addPaneActionLogic already handles focusing if exists, or creating if new
            return addPaneActionLogic(state, newPaneInput, true /* tile positioning */);
          });
        }
        ```
4.  **Action:** Update `src/stores/panes/actions/index.ts`.
    *   Export the new action: `export * from './openAgentChatPane';`
5.  **Action:** Update `src/stores/panes/types.ts`.
    *   Add the action signature to `PaneStoreType`: `openAgentChatPane: () => void;`
6.  **Action:** Update `src/stores/pane.ts`.
    *   Import `openAgentChatPaneAction`.
    *   Add it to the store implementation: `openAgentChatPane: () => openAgentChatPaneAction(set),`

**Task 3.2: Create `useAgentChat` Hook**

1.  **Action:** Create the directory `src/hooks/ai/` (if it doesn't exist).
2.  **Action:** Create the file `src/hooks/ai/useAgentChat.ts`.
3.  **Content:**
    ```typescript
    // src/hooks/ai/useAgentChat.ts
    import { useState, useCallback, useRef, useEffect } from 'react';
    import { Effect, Stream, Runtime, Context, Cause, Option } from 'effect';
    import { AgentLanguageModel, AiTextChunk, AiError, AgentChatMessage } from '@/services/ai/core';
    import { getMainRuntime } from '@/services/runtime';
    import { TelemetryService } from '@/services/telemetry'; // For logging

    interface UseAgentChatOptions {
      initialSystemMessage?: string;
      // Provider and model selection will be handled here or passed in
      // For now, assume it uses the AgentLanguageModel available in the runtime
    }

    export function useAgentChat(options: UseAgentChatOptions = {}) {
      const { initialSystemMessage = "You are a helpful AI assistant." } = options;

      const [messages, setMessages] = useState<AgentChatMessage[]>([{ role: "system", content: initialSystemMessage }]);
      const [currentInput, setCurrentInput] = useState<string>("");
      const [isLoading, setIsLoading] = useState<boolean>(false);
      const [error, setError] = useState<AiError | null>(null);

      const runtimeRef = useRef(getMainRuntime()); // Get the main app runtime
      const streamAbortControllerRef = useRef<AbortController | null>(null);

      // Helper to run telemetry effects
      const runTelemetry = (event: Parameters<TelemetryService["trackEvent"]>[0]) => {
        Effect.runFork(
          Effect.provideService(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent(event)),
            TelemetryService,
            runtimeRef.current.context.get(TelemetryService) // Get TelemetryService from runtime
          )
        );
      };

      const sendMessage = useCallback(async (promptText: string) => {
        if (!promptText.trim()) return;

        const userMessage: AgentChatMessage = { role: "user", content: promptText.trim() };
        setMessages(prev => [...prev, userMessage]);
        setCurrentInput(""); // Clear input after sending
        setIsLoading(true);
        setError(null);
        runTelemetry({ category: "agent_chat", action: "send_message_start", label: promptText.substring(0, 30) });

        // Prepare conversation history for the LLM
        // Ensure system message is first if not already included in messages state handling
        const conversationHistory: AgentChatMessage[] = [
          { role: "system", content: initialSystemMessage }, // Ensure system prompt is included
          ...messages.filter(m => m.role !== "system"), // Filter out previous system messages if any
          userMessage
        ];

        // Abort previous stream if any
        if (streamAbortControllerRef.current) {
          streamAbortControllerRef.current.abort();
        }
        streamAbortControllerRef.current = new AbortController();
        const signal = streamAbortControllerRef.current.signal;

        const assistantMessageId = `assistant-${Date.now()}`;
        // Add a placeholder for the assistant's response
        setMessages(prev => [...prev, { role: "assistant", content: "", _updateId: Date.now(), id: assistantMessageId, isStreaming: true }]);

        const program = Effect.gen(function*(_) {
          const agentLM = yield* _(AgentLanguageModel.Tag);
          const textStream = agentLM.streamText({
            prompt: { messages: conversationHistory } // Pass the full message history
          });

          // Handle the stream
          yield* _(Stream.runForEach(
            textStream,
            (chunk: AiTextChunk) => Effect.sync(() => {
              if (signal.aborted) {
                // If aborted, stop processing chunks. The stream should be ended by the AbortSignal.
                runTelemetry({ category: "agent_chat", action: "stream_aborted_client_side", label: assistantMessageId });
                return;
              }
              setMessages(prevMsgs =>
                prevMsgs.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: (msg.content || "") + chunk.text, _updateId: Date.now() }
                    : msg
                )
              );
            }),
            { signal } // Pass the AbortSignal to Effect's stream processing
          ));
        }).pipe(
          Effect.provideService(AgentLanguageModel.Tag, runtimeRef.current.context.get(AgentLanguageModel.Tag)),
          Effect.tapErrorCause((cause) => Effect.sync(() => {
            if (Cause.isInterruptedOnly(cause)) {
              runTelemetry({ category: "agent_chat", action: "stream_interrupted", label: assistantMessageId });
              console.log("Agent chat stream was interrupted/cancelled.");
            } else {
              const squashedError = Cause.squash(cause);
              setError(squashedError as AiError); // Assuming errors from stream are AiError compatible
              runTelemetry({ category: "agent_chat", action: "send_message_failure", label: (squashedError as Error).message });
            }
          })),
          Effect.ensuring(Effect.sync(() => {
             setMessages(prevMsgs =>
                prevMsgs.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, isStreaming: false, _updateId: Date.now() } : msg
                )
              );
            setIsLoading(false);
            if (streamAbortControllerRef.current?.signal === signal) { // Clean up only if this is the current controller
                streamAbortControllerRef.current = null;
            }
          }))
        );

        Effect.runFork(program);

      }, [messages, initialSystemMessage, runtimeRef]);

      // Cleanup stream on unmount
      useEffect(() => {
        return () => {
          if (streamAbortControllerRef.current) {
            streamAbortControllerRef.current.abort();
            runTelemetry({ category: "agent_chat", action: "hook_unmount_stream_cancel" });
          }
        };
      }, []);

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
    *   **Note on `streamText` prompt:** The `@effect/ai` `streamText` (and `generateText`) methods expect a `prompt` which can be a simple string or a structured object like `{ messages: ChatMessage[] }` (for OpenAI-compatible providers). Adjust the `conversationHistory` preparation accordingly.
    *   **Error Handling:** Map errors from `agentLM.streamText` to a user-friendly format or use the `AIProviderError`.
    *   **Streaming Updates:** To update the streaming message content in React, you must ensure a new object reference is created for the message or its parent array to trigger a re-render. A common pattern is `setMessages(prev => prev.map(m => m.id === streamingMsgId ? {...m, content: m.content + chunk} : m))` or adding an `_updateId: Date.now()` to the streaming message.

**Task 3.3: Create `AgentChatPane` UI Component**

1.  **Action:** Create the directory `src/components/ai/` (if it doesn't exist).
2.  **Action:** Create the file `src/components/ai/AgentChatPane.tsx`.
3.  **Content:**
    ```typescript
    // src/components/ai/AgentChatPane.tsx
    import React, { useEffect } from 'react';
    import { ChatContainer } from '@/components/chat'; // Re-use existing ChatContainer/ChatWindow
    import { useAgentChat } from '@/hooks/ai/useAgentChat';
    import { Button } from '@/components/ui/button';
    import { AlertTriangle } from 'lucide-react';
    import { Effect } from 'effect';
    import { TelemetryService } from '@/services/telemetry';
    import { getMainRuntime } from '@/services/runtime';

    // Placeholder for provider/model selection UI
    // In a real app, these would come from ConfigurationService and user selection
    const currentProvider = "OpenAI"; // Hardcoded for now
    const currentModel = "gpt-4o";    // Hardcoded for now

    const AgentChatPane: React.FC = () => {
      const {
        messages,
        currentInput,
        setCurrentInput,
        isLoading,
        error,
        sendMessage,
      } = useAgentChat({
        // Pass initial system message or other configurations if needed
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
          {/* Placeholder for Provider/Model selection UI */}
          <div className="flex-shrink-0 p-1 text-xs text-muted-foreground text-center border-b border-border mb-1">
            Provider: {currentProvider} | Model: {currentModel}
          </div>

          {error && (
            <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md mb-1 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Error: {error.message || "An unknown AI error occurred."}
            </div>
          )}

          <div className="flex-grow min-h-0">
            <ChatContainer
              className="!border-0 !shadow-none !bg-transparent"
              messages={messages.map(m => ({ // Adapt AgentChatMessage to ChatMessageProps
                id: m.id || `msg-${Math.random()}`,
                role: m.role,
                content: m.content || "", // Ensure content is always string
                isStreaming: m.isStreaming,
                author: m.role === 'user' ? 'You' : 'Agent', // Simple author mapping
                timestamp: m.timestamp || Date.now(),
                // Add any other required props for ChatMessageProps
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

1.  **Action:** Modify `src/panes/PaneManager.tsx`.
    *   Import `AgentChatPane` from `../components/ai/AgentChatPane`.
    *   Add a case to render `<AgentChatPane />` when `pane.type === 'agent_chat'`.
    *   Update the final fallback condition to include `'agent_chat'`.
2.  **Action:** Modify `src/components/hud/Hotbar.tsx`.
    *   Import `usePaneStore` and `AGENT_CHAT_PANE_ID`.
    *   Add a new `HotbarItem` (e.g., using a "brain" or "bot" icon from `lucide-react`) that calls `usePaneStore.getState().openAgentChatPane()`. Ensure its `isActive` prop is correctly set.
    *   Adjust empty slots calculation.

**Task 3.5: Runtime Integration (Verify `FullAppLayer`)**

1.  **Action:** Review `src/services/runtime.ts`.
2.  **Details:**
    *   Confirm that `OpenAIAgentLanguageModelLive` (which provides `AgentLanguageModel.Tag`) is correctly composed into `FullAppLayer`.
    *   Ensure all its dependencies (`OpenAIClientLive`, `ConfigurationService`, `HttpClient.Tag`) are also correctly provided within `FullAppLayer`.
    *   The `getMainRuntime().context.get(AgentLanguageModel.Tag)` call in `useAgentChat` should now resolve to the `OpenAIAgentLanguageModelLive` implementation.

---

**Verification for Phase 3:**

1.  **Type Checking:** Run `pnpm t`.
2.  **UI Functionality (Manual Testing):**
    *   Open the "Agent Chat" pane from the Hotbar.
    *   Verify the pane opens with the initial system message.
    *   Send a message. Observe:
        *   User message appears.
        *   `isLoading` state activates (e.g., "Send" button disabled, loading indicator).
        *   A streaming response from the assistant appears and updates incrementally.
        *   `isLoading` state deactivates on completion.
    *   Test error handling by, for example, temporarily making the OpenAI API key invalid in your configuration and sending a message. Verify an error message is displayed in the chat pane.
    *   Verify stream cancellation on hook unmount or new message (if `AbortController` logic is correctly implemented).
3.  **Console Logs:** Check for any Effect-related errors or unexpected logs.
4.  **Unit Tests (Conceptual for now):**
    *   `useAgentChat.test.ts`: Mock `AgentLanguageModel.Tag` to return controlled streams (success, error, empty). Test message state updates, loading states, error handling, and stream accumulation.
    *   `AgentChatPane.test.tsx`: Mock `useAgentChat` hook. Test rendering of messages, input handling, and button interactions.

Upon completion of these tasks, the `AgentChat` pane should be functional, allowing users to chat with an AI agent via the OpenAI-compatible backend, with responses streamed to the UI. This provides the first end-to-end integration of the new Effect AI backend.
