Okay, Agent. The `src/components/coder/CoderPane.tsx` component has grown too large and needs to be broken down into smaller, more manageable subcomponents and a custom hook for its core chat logic.

Follow these instructions carefully:

**Overall Goal:**
Refactor `CoderPane.tsx` by extracting its chat logic into a custom hook `useCoderChat`, and its UI elements into distinct subcomponents: `CoderMessageList.tsx`, `CoderMessage.tsx`, and `CoderProseMirrorInput.tsx`.

---

**Step 1: Create the `useCoderChat` Hook**

1.  **Create a new file:** `src/hooks/coder/useCoderChat.ts`
2.  **Define `ChatMessage` Interface:**
    Move the local `ChatMessage` interface from `CoderPane.tsx` into this new file. This interface defines the structure for messages within the coder pane chat.
    ```typescript
    // src/hooks/coder/useCoderChat.ts
    export interface ChatMessage {
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string; // Holds full textual content for DB
      parts?: Array< // For UI rendering
        | { type: 'text'; text: string }
        | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
        | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
      >;
      timestamp: number;
      isStreaming?: boolean;
    }
    ```
3.  **Implement `useCoderChat` Hook:**
    *   **Imports:** Import necessary Effect modules, services (`TelemetryService`, `DatabaseService`), `getMainRuntime`, `usePaneStore`, and the `ChatMessage` interface.
    *   **Hook Signature:**
        ```typescript
        interface UseCoderChatProps {
          paneId: string;
          initialSessionId?: string;
        }

        export function useCoderChat(props: UseCoderChatProps) {
          // ... hook logic ...
        }
        ```
    *   **State Management:**
        *   Move `messages`, `isLoading`, `focusKey` state variables from `CoderPane.tsx` into this hook.
        *   Initialize `messages` with the default system message.
    *   **Refs:**
        *   Move `sessionIdRef`, `lastLoadedSessionIdRef`, `streamCancelRef`, `isLoadingRef` from `CoderPane.tsx` into this hook.
    *   **Message Handling Callbacks:**
        *   Move `addMessage`, `updateMessage`, `clearMessages` functions into this hook. Adapt them to use the local `setMessages` from `useState`.
    *   **`loadMessagesForSessionInternal` Function:**
        *   Move this function from `CoderPane.tsx` into the hook.
        *   It should depend on `DatabaseService` (obtained from `runtime`) and `TelemetryService`.
        *   Adapt it to use the hook's `setMessages`, `setIsLoading`, `setFocusKey`, `sessionIdRef`, and `lastLoadedSessionIdRef`.
    *   **`sendMessage` Function:**
        *   Move this function from `CoderPane.tsx`.
        *   It will use `window.electronAPI.claudeCode.streamChat` and the hook's internal state/callbacks (`addMessage`, `updateMessage`, `setIsLoading`, `streamCancelRef`, `sessionIdRef`).
        *   Ensure it correctly saves user messages and final assistant messages (including structured content and tool calls) to the database via `DatabaseService`.
    *   **Effect for Initial Session Loading:**
        *   Move the `useEffect` block responsible for loading `initialSessionId` from `CoderPane.tsx` into this hook. It should depend on `props.initialSessionId`, `props.paneId`, `loadMessagesForSessionInternal`, `clearMessages`, and `updatePaneContent` from `usePaneStore`.
    *   **Effect for Stream Cleanup:**
        *   Move the `useEffect` for `streamCancelRef.current()` on unmount into this hook.
    *   **Return Value:** The hook should return an object containing:
        ```typescript
        return {
          messages,
          isLoading,
          focusKey,
          sendMessage,
          loadMessagesForSession: loadMessagesForSessionInternal, // Expose for direct loading
          clearMessagesAndSession: () => { // For the "New Chat" button
            if (streamCancelRef.current) streamCancelRef.current();
            const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            sessionIdRef.current = newSessionId;
            lastLoadedSessionIdRef.current = newSessionId;
            clearMessages();
            setIsLoading(false);
            setFocusKey(prev => prev + 1);
            return newSessionId; // Return new session ID for pane content update
          },
          // Potentially other state/callbacks if needed by CoderPane
        };
        ```

---

**Step 2: Create `CoderProseMirrorInput.tsx` Subcomponent**

1.  **Create a new file:** `src/components/coder/CoderProseMirrorInput.tsx`
2.  **Move ProseMirror Logic:**
    *   Move the `ProseMirrorEditor` and `AutoFocusEditor` components from `CoderPane.tsx` into this new file.
    *   Include all necessary ProseMirror-related imports (`EditorState`, `schema`, `history`, `keymap`, `baseKeymap`, `@handlewithcare/react-prosemirror` components).
3.  **Define Props:**
    ```typescript
    interface CoderProseMirrorInputProps {
      onSubmit: (text: string) => void;
      disabled?: boolean;
      focusKey?: number; // To trigger re-focus
    }

    const CoderProseMirrorInput: React.FC<CoderProseMirrorInputProps> = ({ onSubmit, disabled, focusKey }) => {
      // ... ProseMirrorEditor and AutoFocusEditor logic ...
      // Make sure to pass onSubmit, disabled, focusKey down to AutoFocusEditor
    };
    export default CoderProseMirrorInput;
    ```
4.  Ensure the `serializeDocToText` function is correctly defined and used within `AutoFocusEditor`.

---

**Step 3: Create `CoderMessage.tsx` Subcomponent**

1.  **Create a new file:** `src/components/coder/CoderMessage.tsx`
2.  **Move Message Rendering Logic:**
    *   Move the `CoderChatMessage` internal component from `CoderPane.tsx` into this new file. Rename it to `CoderMessage`.
    *   Import the `ChatMessage` interface from `src/hooks/coder/useCoderChat.ts`.
    *   Import `ToolCallDisplay`, `ToolResultDisplay`, `UIChatMessage`, `Loader2`, `CopyButton`.
3.  **Define Props:**
    ```typescript
    import { ChatMessage } from '@/hooks/coder/useCoderChat'; // Adjust import path

    interface CoderMessageProps {
      message: ChatMessage;
      index: number; // For React key
    }

    const CoderMessage: React.FC<CoderMessageProps> = ({ message, index }) => {
      // ... CoderChatMessage logic ...
    };
    export default CoderMessage;
    ```
4.  Ensure all styling and logic for displaying text parts, tool calls, tool results, streaming indicators, and the copy button are contained within this component.

---

**Step 4: Create `CoderMessageList.tsx` Subcomponent**

1.  **Create a new file:** `src/components/coder/CoderMessageList.tsx`
2.  **Move Message List Rendering Logic:**
    *   This component will be responsible for rendering the scrollable list of messages.
    *   Import `ScrollArea` and `CoderMessage`.
    *   Import the `ChatMessage` interface.
3.  **Define Props:**
    ```typescript
    import { ChatMessage } from '@/hooks/coder/useCoderChat'; // Adjust import path
    import CoderMessage from './CoderMessage'; // Adjust import path

    interface CoderMessageListProps {
      messages: ChatMessage[];
      containerRef: React.RefObject<HTMLDivElement>;
      handleScroll: () => void;
      handleTouchStart: () => void;
      isStreamingLastMessage: boolean; // To potentially show a global streaming indicator at the bottom
    }

    const CoderMessageList: React.FC<CoderMessageListProps> = ({
      messages,
      containerRef,
      handleScroll,
      handleTouchStart,
      isStreamingLastMessage
    }) => {
      return (
        <ScrollArea className="flex-1 min-h-0">
          <div
            ref={containerRef}
            className="p-4"
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
          >
            <div className="max-w-[750px] mx-auto w-full">
              <div className="flex flex-col gap-4">
                {messages
                  .filter(msg => msg.role !== 'system') // Don't show system messages
                  .map((message, idx) => (
                    <CoderMessage key={message.id || idx} message={message} index={idx} />
                  ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      );
    };
    export default CoderMessageList;
    ```

---

**Step 5: Refactor `CoderPane.tsx`**

1.  **Remove Extracted Logic:** Delete the `ChatMessage` interface, the `ProseMirrorEditor`, `AutoFocusEditor`, and `CoderChatMessage` internal components. Remove the state variables, refs, and functions that were moved to `useCoderChat`.
2.  **Use the Hook:**
    *   Import and call `useCoderChat`, passing `paneId` and `sessionId` (from props).
    *   Destructure the returned state and functions (`messages`, `isLoading`, `focusKey`, `sendMessage`, `loadMessagesForSession`, `clearMessagesAndSession`).
3.  **Import Subcomponents:** Import `CoderMessageList` and `CoderProseMirrorInput`.
4.  **Update JSX:**
    *   Render `<CoderMessageList ... />` passing the `messages` from the hook and the refs/handlers from `useAutoScroll`.
    *   Render `<CoderProseMirrorInput ... />` passing `sendMessage` (from the hook) as `onSubmit`, and `isLoading`, `focusKey` as props.
5.  **`handleNewChat` Logic:**
    *   Keep the `handleNewChat` function.
    *   It should call `clearMessagesAndSession()` from the hook to reset chat state and get a `newSessionId`.
    *   Then, it should call `updatePaneContent(paneId, { sessionId: newSessionId })` to update the pane's state.
    *   Retain the logic for opening a new pane if Cmd/Ctrl is pressed.
6.  **Title Bar Logic:**
    *   Keep the logic for fetching chat history for the "History" menu (`useQuery`, `formatSessionForMenu`, `historyMenuItems`).
    *   Ensure `historyMenuItems` correctly calls `loadMessagesForSession(session.id)` from the hook or updates `initialSessionId` to trigger reload.
    *   Keep the `useEffect` that updates `titleBarButtonsRef` with the "New Chat" button and "History" menu.
7.  **Remaining Effects:** Keep the `useEffect` for Escape key handling (ensure it calls `handleExitCoderMode`) and the initial telemetry event for `coder_mode_opened`.
8.  **`useAutoScroll`:** Keep the `useAutoScroll` hook usage, passing `containerRef`, `handleScroll`, and `handleTouchStart` to `CoderMessageList`.
9.  **Memoization:** The `MemoizedCoderPane` can remain, but ensure its comparison function `(prevProps, nextProps)` is still relevant.

---

**Final Checks:**

*   Ensure all imports are correct in all files.
*   Verify prop types and pass props correctly between parent and child components.
*   Test all functionalities: sending messages, streaming, tool calls, history loading, new chat (normal and Cmd/Ctrl-click), Escape key to close, copy buttons.
*   Make sure telemetry events are still being fired correctly.
*   The CSS-in-JS block (`<style>{`...`}</style>`) in `CoderPane.tsx` should remain there as it styles the content rendered by `CoderMessage` and `ToolCallDisplay`/`ToolResultDisplay`.

This refactoring will significantly improve the organization and maintainability of the Coder feature. Good luck!
