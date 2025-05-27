Okay, Agent, we're having trouble with chat messages in panes. They're disappearing when the pane is refreshed or toggled closed/opened. This indicates issues with state persistence and rehydration.

Here are the specific instructions to fix this:

**I. Strengthen Pane Content Persistence in `usePaneStore`**

**Goal:** Ensure that when a pane is closed (especially toggled), its essential content (like `sessionId`) is reliably saved and restored.

1.  **File:** `src/stores/panes/actions/removePane.ts`
    *   **Modify:** When saving to `updatedClosedPanePositions`, ensure `paneToRemove.content` is saved. Remove the `shouldRestore: false` line, as the `togglePaneAction` should decide if a pane is restored based on its own logic (e.g., if it was a toggle).
    *   **Code:**
        ```typescript
        // Inside removePaneAction, when updating closedPanePositions:
        if (paneToRemove) {
          updatedClosedPanePositions[id] = {
            x: paneToRemove.x,
            y: paneToRemove.y,
            width: paneToRemove.width,
            height: paneToRemove.height,
            content: paneToRemove.content, // Ensure content is saved
            // shouldRestore: false, // Let togglePaneAction handle this logic
          };
        }
        ```
    *   **Rationale:** `removePaneAction` is called by explicit close ('X' button) and also by `togglePaneAction` when closing. Saving content here is crucial. The `shouldRestore` flag is better managed by the toggling action.

2.  **File:** `src/stores/panes/actions/togglePane.ts`
    *   **Modify:** When closing a pane (pane exists and is active):
        *   Set `shouldRestore: true` in `updatedClosedPanePositions` for the pane being closed.
    *   **Modify:** When opening a pane (pane doesn't exist):
        *   If `storedData` (from `closedPanePositions`) is found AND `storedData.shouldRestore !== false`, then its `content` must be used when calling `createPaneInput`.
        *   After successfully restoring from `storedData`, delete that entry from `closedPanePositions` to prevent it from being restored again incorrectly if another pane with the same default ID is created.
    *   **Code:**
        ```typescript
        // src/stores/panes/actions/togglePane.ts
        // ... (imports)

        export function togglePaneAction(
          set: any, // Consider using SetState<PaneStoreType>
          state: PaneStoreType,
          config: TogglePaneConfig
        ) {
          const { paneId, createPaneInput } = config;
          const existingPane = state.panes.find((p) => p.id === paneId);

          if (existingPane) {
            if (state.activePaneId === paneId) { // Closing the active pane
              const paneToClose = existingPane;
              // ... (logic to find newActivePaneId and updatedPanes) ...
              const remainingPanes = state.panes.filter((pane) => pane.id !== paneId);
              let newActivePaneId: string | null = null;
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
              const updatedPanes = remainingPanes.map((p) => ({
                ...p,
                isActive: p.id === newActivePaneId,
              }));

              const updatedClosedPanePositions = { ...state.closedPanePositions };
              updatedClosedPanePositions[paneId] = {
                x: paneToClose.x,
                y: paneToClose.y,
                width: paneToClose.width,
                height: paneToClose.height,
                content: paneToClose.content,
                shouldRestore: true, // This pane was toggled off, should restore on next toggle
              };

              return {
                ...state,
                panes: updatedPanes,
                activePaneId: newActivePaneId,
                closedPanePositions: updatedClosedPanePositions,
              };
            } else { // Bringing an existing, non-active pane to front
              // ... (existing logic to bring to front) ...
              const panesWithoutTarget = state.panes.filter((p) => p.id !== paneId);
              const updatedTargetPane = { ...existingPane, isActive: true };
              const updatedOtherPanes = panesWithoutTarget.map((p) => ({
                ...p,
                isActive: false,
              }));

              return {
                ...state,
                panes: [...updatedOtherPanes, updatedTargetPane],
                activePaneId: paneId,
              };
            }
          } else { // Pane doesn't exist, create it
            const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
            const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

            const storedData = state.closedPanePositions[paneId];
            let paneInputParams: PaneInput;

            if (storedData && storedData.shouldRestore !== false) {
              // Use content from storedData when creating pane input
              paneInputParams = createPaneInput(screenWidth, screenHeight, storedData);
            } else {
              paneInputParams = createPaneInput(screenWidth, screenHeight);
            }

            if (!paneInputParams.id) {
                paneInputParams.id = paneId;
            }

            const newStatePartial = addPaneActionLogic(state, paneInputParams, false);

            const updatedClosedPanePositions = { ...state.closedPanePositions };
            if (storedData && storedData.shouldRestore !== false) {
              delete updatedClosedPanePositions[paneId]; // Remove after restoring
            }

            return {
              ...state,
              ...newStatePartial,
              closedPanePositions: updatedClosedPanePositions,
            };
          }
        }
        ```
    *   **Rationale:** This ensures that `content` (containing `sessionId`) is explicitly saved when a pane is toggled closed and restored when it's toggled open. The `shouldRestore` flag helps differentiate between a deliberate "X" close and a toggle.

**II. Refine `CoderPane.tsx` Session and Message Loading Logic**

**Goal:** Make `CoderPane` reliably load messages based on its `sessionId` (whether new, restored from toggle, or from history) and persist its current `sessionId` to the `pane.content` in the store.

1.  **File:** `src/components/coder/CoderPane.tsx`
    *   **Modify the main `useEffect` for session loading:**
        *   It should primarily react to `initialSessionId` (from props).
        *   If `initialSessionId` is present and different from `lastLoadedSessionIdRef.current`, then it's either a fresh pane being restored with a session or a session loaded from history. Load messages for this `initialSessionId`.
        *   If `initialSessionId` is *not* present (e.g., new Coder pane opened from Hotbar) AND `sessionIdRef.current` is also not set (truly new instance), generate a new `sessionId`, store it in `sessionIdRef.current` and `lastLoadedSessionIdRef.current`, and update the pane's content in the store.
        *   If `initialSessionId` is present and *is the same* as `lastLoadedSessionIdRef.current`, but the `messages` array (excluding system message) is empty, it might indicate a failed load on a previous render or a refresh scenario. Attempt to reload messages for `initialSessionId`.
        *   Ensure `setIsLoading(false)` is called in all paths where loading doesn't occur.
    *   **Code (useEffect for session loading):**
        ```typescript
        // src/components/coder/CoderPane.tsx
        // ... imports and other hooks ...
        const lastLoadedSessionIdRef = useRef<string | null>(null);

        useEffect(() => {
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
          console.log(`${componentName} Effect for session loading. initialSessionId: ${initialSessionId}, current sessionIdRef: ${sessionIdRef.current}, lastLoaded: ${lastLoadedSessionIdRef.current}`);

          const loadMessagesForSessionInternal = async (sessionIdToLoad: string) => {
            console.log(`${componentName} Attempting to load messages for session: ${sessionIdToLoad}`);
            setIsLoading(true);
            clearMessages();

            try {
              const runtime = getMainRuntime();
              const dbProgram = Effect.flatMap(DatabaseService, (db) =>
                db.getMessagesForSession(sessionIdToLoad, 500)
              );
              const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));

              if (Exit.isSuccess(exitResult)) {
                const dbMessages = exitResult.value;
                console.log(`${componentName} Loaded ${dbMessages.length} messages from DB for session ${sessionIdToLoad}`);

                const newMessagesState: ChatMessage[] = [{ /* system message */ }];
                dbMessages.forEach(dbMsg => {
                  let parts;
                  try {
                    if (dbMsg.content && dbMsg.content.startsWith('{"parts":')) {
                      const contentData = JSON.parse(dbMsg.content);
                      if (contentData.parts) parts = contentData.parts;
                    }
                  } catch (e) { /* content is plain text */ }
                  newMessagesState.push({
                    id: dbMsg.id,
                    role: dbMsg.role as ChatMessage['role'],
                    content: parts ? '' : (dbMsg.content || ''),
                    parts: parts,
                    timestamp: dbMsg.timestamp * 1000,
                  });
                });

                setMessages(newMessagesState);
                lastLoadedSessionIdRef.current = sessionIdToLoad;
                sessionIdRef.current = sessionIdToLoad; // Ensure current session ID is also set
                updatePaneContent(paneId, { sessionId: sessionIdToLoad });
                console.log(`${componentName} Session ${sessionIdToLoad} loaded and pane content updated.`);
              } else {
                console.error(`${componentName} Failed to load messages for ${sessionIdToLoad}:`, Cause.pretty(exitResult.cause));
                addMessage({ id: `error-load-${Date.now()}`, role: 'system', content: `Error loading session ${sessionIdToLoad.substring(0,8)}...`, timestamp: Date.now() });
              }
            } catch (error) {
              console.error(`${componentName} Exception loading session ${sessionIdToLoad}:`, error);
              addMessage({ id: `error-load-exc-${Date.now()}`, role: 'system', content: `Critical error loading session.`, timestamp: Date.now() });
            } finally {
              setIsLoading(false);
              setFocusKey(prev => prev + 1);
            }
          };

          if (initialSessionId && initialSessionId !== lastLoadedSessionIdRef.current) {
            loadMessagesForSessionInternal(initialSessionId);
          } else if (!initialSessionId && !sessionIdRef.current) {
            const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            console.log(`${componentName} No initial session, generated new: ${newSessionId}`);
            sessionIdRef.current = newSessionId;
            lastLoadedSessionIdRef.current = newSessionId;
            clearMessages();
            updatePaneContent(paneId, { sessionId: newSessionId });
            setIsLoading(false);
          } else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0) {
             console.log(`${componentName} initialSessionId matches lastLoaded, but UI messages are empty. Forcing reload for ${initialSessionId}.`);
             loadMessagesForSessionInternal(initialSessionId);
          } else {
             console.log(`${componentName} No session load required by this effect run.`);
             setIsLoading(false); // Ensure loading is false if no load occurs
          }
        }, [initialSessionId, paneId, clearMessages, updatePaneContent, addMessage, messages.length]); // Use messages.length to detect if messages array was cleared
        ```
    *   **Modify `historyMenuItems` action:** When loading a session from history:
        *   Set `sessionIdRef.current` to the `session.id`.
        *   **Crucially, set `lastLoadedSessionIdRef.current = null;`** This will ensure the `useEffect` for loading messages re-triggers with the new `sessionIdRef.current` if the `initialSessionId` prop happens to be the same as the one selected from history (which can occur if the pane was closed and reopened with that session).
        *   Then call the `loadMessagesForSessionInternal` function (which you'll need to extract from the `useEffect`).
    *   **Code (historyMenuItems action):**
        ```typescript
        // src/components/coder/CoderPane.tsx
        // ...
        // Extract the loading logic into a callable function
        const loadMessagesForSessionInternal = useCallback(async (sessionIdToLoad: string) => {
            // ... (The exact database loading logic from the useEffect above) ...
            // On success:
            // setMessages(newMessagesState);
            // lastLoadedSessionIdRef.current = sessionIdToLoad;
            // sessionIdRef.current = sessionIdToLoad;
            // updatePaneContent(paneId, { sessionId: sessionIdToLoad });
            // setIsLoading(false);
            // setFocusKey(prev => prev + 1);
            // On error:
            // setIsLoading(false);
            // addMessage(...);
        }, [paneId, clearMessages, updatePaneContent, addMessage, setMessages, setIsLoading, setFocusKey]);


        // ... inside historyMenuItems useMemo ...
        action: async (event) => {
          // ... (telemetry and modifier key logic) ...
          if (isModifierHeld) { /* ... open in new pane ... */ }
          else {
            const newSessionId = session.id;
            const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'HIST'}]`;
            console.log(`${componentName} History item clicked, preparing to load session: ${newSessionId}`);

            sessionIdRef.current = newSessionId; // Update current session ID
            lastLoadedSessionIdRef.current = null; // Reset last loaded to force reload by useEffect OR call directly

            // Call the extracted loading function
            await loadMessagesForSessionInternal(newSessionId);

            setHistoryMenuOpen(false);
          }
        },
        // ...
        ```
    *   **Rationale:** This ensures `CoderPane` correctly initializes with a new session ID if none is provided, loads messages if an `initialSessionId` is provided (e.g., from `closedPanePositions` or a link), and correctly reloads messages when a session is chosen from its history menu. Persisting `sessionId` via `updatePaneContent` is key for toggles/refreshes.

**III. `useAgentChat` Hook Message Persistence**

**Goal:** Ensure user and assistant messages in `AgentChatPane` are saved to the database correctly and that the pane's `sessionId` is persisted.

1.  **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Saving User Message:**
        *   Inside `sendMessage`, after `addUserMessage(...)`, ensure `dbService.saveMessage(...)` and `dbService.updateSession(...)` (for `last_updated_at`) are called for the `userMessage` using the current `sessionId`.
    *   **Saving Assistant Message:**
        *   The most reliable place to save the *complete* assistant message (after all streaming chunks are processed) is in the `onDone` callback of the stream, or in an `Effect.ensuring` block that wraps the stream processing.
        *   The `finalAssistantMessage` needs to be correctly constructed from all streamed parts.
    *   **Instruction:**
        ```typescript
        // src/hooks/ai/useAgentChat.ts
        // ...
        const { updatePaneContent } = usePaneStore.getState(); // Get from store

        // ... inside sendMessage function ...
        // After adding userMessage to local state and before calling orchestrator:
        if (sessionId) { // Ensure sessionId is valid
          const dbUserMessage: DBMessage = {
            id: userMessage.id, // Use the UI-generated ID
            session_id: sessionId,
            role: "user",
            content: userMessage.content,
            timestamp: Math.floor(userMessage.timestamp / 1000), // DB expects seconds
          };
          Effect.runFork(
            dbService.saveMessage(dbUserMessage).pipe(
              Effect.andThen(dbService.updateSession(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
              Effect.provide(currentRuntime)
            )
          );
          // Ensure pane content (which might store sessionId if this is a new session) is updated
          updatePaneContent(`agent_chat_session_${sessionId}`, { sessionId });
        }

        // ... (orchestrator call and stream processing) ...

        // Modify the Effect.ensuring block or add an onDone handler for the stream
        // This block runs when the stream completes successfully or errors out
        Effect.ensuring(
          Effect.sync(() => {
            console.log(`[useAgentChat] Ensuring block for ${assistantMsgId}. Signal aborted: ${signal.aborted}`);
            // Finalize UI state
            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, isStreaming: false, _updateId: Date.now() }
                  : msg,
              ),
            );
            setIsLoading(false);

            // Save the final assistant message to DB IF stream was not aborted
            if (!signal.aborted) {
              const finalAssistantMessage = get().messages.find(m => m.id === assistantMsgId); // `get()` from Zustand
              if (finalAssistantMessage && sessionId) {
                const dbAssistantMessage: DBMessage = {
                  id: finalAssistantMessage.id,
                  session_id: sessionId,
                  role: "assistant",
                  content: finalAssistantMessage.content,
                  tool_calls_json: finalAssistantMessage.tool_calls ? JSON.stringify(finalAssistantMessage.tool_calls) : undefined,
                  timestamp: Math.floor(finalAssistantMessage.timestamp / 1000),
                };
                Effect.runFork(
                  dbService.saveMessage(dbAssistantMessage).pipe(
                    Effect.andThen(dbService.updateSession(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
                    Effect.provide(currentRuntime)
                  )
                );
                runTelemetry({ /* ... assistant_message_saved ... */ });
              }
            }

            // Cleanup refs
            if (streamAbortControllerRef.current?.signal === signal) {
              streamAbortControllerRef.current = null;
            }
            if (currentAssistantMessageIdRef.current === assistantMsgId) {
              currentAssistantMessageIdRef.current = null;
            }
          })
        )
        // ...
        ```
    *   **Ensure `useEffect` for history loading also calls `updatePaneContent`:**
        ```typescript
        // src/hooks/ai/useAgentChat.ts - in the history loading useEffect
        // ...
        if (Exit.isSuccess(exitResult)) {
          // ...
          if (historicalMessages.length > 0) {
            setMessages([systemMessageInstance, ...historicalMessages]);
          }
          // Update the pane's content in the global store to persist this sessionId
          updatePaneContent(`agent_chat_session_${currentSessionId}`, { sessionId: currentSessionId, sessionTitle: session?.title });
          // ...
        }
        // ...
        ```
    *   **Rationale:** This ensures that both user and complete assistant messages are saved to the database under the correct `sessionId`, and this `sessionId` is persisted with the pane's state.

**IV. Verify Pane Content in `PaneManager.tsx`**

1.  **File:** `src/panes/PaneManager.tsx`
    *   **Ensure `pane.content.sessionId` is passed correctly as `sessionId` prop to `AgentChatPane` and `CoderPane`.**
        ```typescript
        // Inside PaneManager, when rendering panes:
        {pane.type === "agent_chat" && (
          <AgentChatPane
            sessionId={pane.content?.sessionId as string | undefined}
            sessionTitle={pane.content?.sessionTitle as string | undefined}
          />
        )}
        {pane.type === "coder" && (
          <CoderPane
            paneId={pane.id}
            sessionId={pane.content?.sessionId as string | undefined}
            // ... titleBarButtonsRef logic ...
          />
        )}
        ```
    *   **Rationale:** This confirms that the `sessionId` restored from `usePaneStore` (originating from `closedPanePositions` or a new pane action) is correctly passed down to the chat components.

After applying these instructions, test thoroughly:
1.  Open Coder pane, send messages, close with Cmd+1, reopen with Cmd+1. Messages should persist.
2.  Open Agent Chat pane, send messages, close with its 'X' button, reopen from Hotbar. Messages should persist.
3.  Repeat above, but refresh the app (Ctrl+R/Cmd+R) while panes are open. Panes and their messages should restore.
4.  Load a chat from CoderPane's history, interact, close, reopen. The loaded history session should persist.
5.  Check `localStorage` (key `commander-pane-storage-v5`) to see if `panes[].content.sessionId` and `closedPanePositions[id].content.sessionId` are being saved correctly.
6.  Check `claude-bridge-service.log` for any database errors.

These changes should address the core issues of message persistence. The key is consistent handling of `sessionId` through `pane.content` and ensuring that chat components load and save messages based on this `sessionId`.

```typescript
// src/stores/panes/actions/togglePane.ts
import { PaneStoreType, type SetPaneStore, type GetPaneStore } from "../types"; // Added GetPaneStore
import { PaneInput } from "@/types/pane";
import { addPaneActionLogic } from "./addPane";
import { PANE_MARGIN } from "../constants";

interface TogglePaneConfig {
  paneId: string;
  createPaneInput: (screenWidth: number, screenHeight: number, storedData?: { x: number; y: number; width: number; height: number; content?: any }) => PaneInput;
}

export function togglePaneAction(
  set: SetPaneStore, // Changed type from any to SetPaneStore
  get: GetPaneStore, // Added get to access current state
  config: TogglePaneConfig // Changed from state to get for current state
) {
  const state = get(); // Get current state
  const { paneId, createPaneInput } = config;
  const existingPane = state.panes.find((p) => p.id === paneId);

  if (existingPane) {
    if (state.activePaneId === paneId) {
      const paneToClose = existingPane;
      const remainingPanes = state.panes.filter((pane) => pane.id !== paneId);
      let newActivePaneId: string | null = null;
      if (remainingPanes.length > 0) {
        newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
      }
      const updatedPanes = remainingPanes.map((p) => ({
        ...p,
        isActive: p.id === newActivePaneId,
      }));

      const updatedClosedPanePositions = { ...state.closedPanePositions };
      updatedClosedPanePositions[paneId] = {
        x: paneToClose.x,
        y: paneToClose.y,
        width: paneToClose.width,
        height: paneToClose.height,
        content: paneToClose.content,
        shouldRestore: true,
      };

      set({ // Use set directly
        panes: updatedPanes,
        activePaneId: newActivePaneId,
        closedPanePositions: updatedClosedPanePositions,
      });
    } else {
      const panesWithoutTarget = state.panes.filter((p) => p.id !== paneId);
      const updatedTargetPane = { ...existingPane, isActive: true };
      const updatedOtherPanes = panesWithoutTarget.map((p) => ({
        ...p,
        isActive: false,
      }));

      set({ // Use set directly
        panes: [...updatedOtherPanes, updatedTargetPane],
        activePaneId: paneId,
      });
    }
  } else {
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

    const storedData = state.closedPanePositions[paneId];
    let paneInputParams: PaneInput;

    if (storedData && storedData.shouldRestore !== false) {
      paneInputParams = createPaneInput(screenWidth, screenHeight, storedData);
    } else {
      paneInputParams = createPaneInput(screenWidth, screenHeight);
    }

    if (!paneInputParams.id) {
        paneInputParams.id = paneId;
    }

    const newStatePartial = addPaneActionLogic(state, paneInputParams, false);

    const updatedClosedPanePositions = { ...state.closedPanePositions };
    if (storedData && storedData.shouldRestore !== false) {
      delete updatedClosedPanePositions[paneId];
    }

    set({ // Use set directly
      ...newStatePartial, // This applies the changes from addPaneActionLogic
      closedPanePositions: updatedClosedPanePositions,
    });
  }
}
```

```typescript
// src/components/coder/CoderPane.tsx

// ... other imports
import { DatabaseService, type DBMessage } from '@/services/db'; // Ensure DBMessage is imported

// ...

const CoderPane: React.FC<CoderPaneProps> = ({ paneId, sessionId: initialSessionId, titleBarButtonsRef }) => {
  // ... existing state and refs ...
  const runtime = getMainRuntime();
  const { addMessage: uiAddMessage, updateMessage: uiUpdateMessage, clearMessages: uiClearMessages, setMessages: uiSetMessages } = useCoderChatStore.getState(); // Get actions if needed, or pass them down if store is per-instance


  // Use local state for messages FOR THIS PANE INSTANCE
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system',
      role: 'system',
      content: 'You are Claude Code, a helpful AI coding assistant.',
      timestamp: Date.now(),
    }
  ]);
  const addMessageToLocalState = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);
  const updateMessageInLocalState = useCallback((id: string, updates: Partial<ChatMessage> | ((prevMessage: ChatMessage) => Partial<ChatMessage>)) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        const newUpdates = typeof updates === 'function' ? updates(msg) : updates;
        return { ...msg, ...newUpdates };
      }
      return msg;
    }));
  }, []);
  const clearMessagesInLocalState = useCallback(() => {
    setMessages([{
      id: 'system',
      role: 'system',
      content: 'You are Claude Code, a helpful AI coding assistant.',
      timestamp: Date.now(),
    }]);
  }, []);


  const lastLoadedSessionIdRef = useRef<string | null>(null);

  // Extracted message loading logic
  const loadMessagesForSessionInternal = useCallback(async (sessionIdToLoad: string) => {
    const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
    console.log(`${componentName} Attempting to load messages for session: ${sessionIdToLoad}`);
    setIsLoading(true);
    clearMessagesInLocalState();

    try {
      const dbProgram = Effect.flatMap(DatabaseService, (db) =>
        db.getMessagesForSession(sessionIdToLoad, 500)
      );
      const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));

      if (Exit.isSuccess(exitResult)) {
        const dbMessages = exitResult.value;
        console.log(`${componentName} Loaded ${dbMessages.length} messages from DB for session ${sessionIdToLoad}`);

        const newMessagesState: ChatMessage[] = [{
          id: 'system',
          role: 'system',
          content: 'You are Claude Code, a helpful AI coding assistant.',
          timestamp: Date.now(),
        }];

        dbMessages.forEach(dbMsg => {
          let parts;
          try {
            if (dbMsg.content && (dbMsg.content.startsWith('{"parts":') || (dbMsg.tool_calls_json && dbMsg.role === 'assistant'))) {
              // If content contains parts, or if it's an assistant message with tool_calls_json, parse parts.
              // Assistant messages from Claude Bridge store main text in content, and tool calls in tool_calls_json.
              // We need to reconstruct parts array for UI.
              if (dbMsg.role === 'assistant' && dbMsg.tool_calls_json) {
                parts = [];
                if (dbMsg.content) parts.push({type: 'text', text: dbMsg.content});
                const toolCalls = JSON.parse(dbMsg.tool_calls_json);
                toolCalls.forEach((tc: any) => parts.push({ type: 'tool_call', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments)}));
              } else if (dbMsg.content) {
                 const contentData = JSON.parse(dbMsg.content);
                 if (contentData.parts) parts = contentData.parts;
              }
            }
          } catch (e) { /* content is plain text or not parsable as parts */ }

          newMessagesState.push({
            id: dbMsg.id,
            role: dbMsg.role as ChatMessage['role'],
            content: parts ? '' : (dbMsg.content || ''), // UI content is from parts if they exist
            parts: parts,
            timestamp: dbMsg.timestamp * 1000,
          });
        });

        setMessages(newMessagesState);
        lastLoadedSessionIdRef.current = sessionIdToLoad;
        sessionIdRef.current = sessionIdToLoad;
        updatePaneContent(paneId, { sessionId: sessionIdToLoad }); // Update pane store
        console.log(`${componentName} Session ${sessionIdToLoad} loaded and pane content updated.`);
      } else {
        console.error(`${componentName} Failed to load messages for ${sessionIdToLoad}:`, Cause.pretty(exitResult.cause));
        addMessageToLocalState({ id: `error-load-${Date.now()}`, role: 'system', content: `Error loading session ${sessionIdToLoad.substring(0,8)}...`, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`${componentName} Exception loading session ${sessionIdToLoad}:`, error);
      addMessageToLocalState({ id: `error-load-exc-${Date.now()}`, role: 'system', content: `Critical error loading session.`, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
      setFocusKey(prev => prev + 1);
    }
  }, [paneId, clearMessagesInLocalState, updatePaneContent, runtime, addMessageToLocalState, setMessages, setIsLoading, setFocusKey]);


  useEffect(() => {
    const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
    // console.log(`${componentName} Effect for session loading. initialSessionId: ${initialSessionId}, current sessionIdRef: ${sessionIdRef.current}, lastLoaded: ${lastLoadedSessionIdRef.current}, messages.length: ${messages.length}`);

    if (initialSessionId && initialSessionId !== lastLoadedSessionIdRef.current) {
      sessionIdRef.current = initialSessionId; // Ensure sessionIdRef is updated
      const timer = setTimeout(() => loadMessagesForSessionInternal(initialSessionId), 50); // Short delay for prop changes to settle
      return () => clearTimeout(timer);
    } else if (!initialSessionId && !sessionIdRef.current) {
      const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      console.log(`${componentName} No initial session, generated new: ${newSessionId}`);
      sessionIdRef.current = newSessionId;
      lastLoadedSessionIdRef.current = newSessionId;
      clearMessagesInLocalState();
      updatePaneContent(paneId, { sessionId: newSessionId });
      setIsLoading(false);
    } else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0) {
       console.log(`${componentName} initialSessionId matches lastLoaded, but UI messages are empty. Forcing reload for ${initialSessionId}.`);
       const timer = setTimeout(() => loadMessagesForSessionInternal(initialSessionId), 50);
       return () => clearTimeout(timer);
    } else if (initialSessionId && !lastLoadedSessionIdRef.current && sessionIdRef.current === initialSessionId) {
      // This case handles refresh: initialSessionId is set from prop, sessionIdRef might already have it from previous render,
      // but lastLoadedSessionIdRef is null (reset on mount). We need to load.
      console.log(`${componentName} Refresh detected or initial load for already set session. Loading ${initialSessionId}`);
      const timer = setTimeout(() => loadMessagesForSessionInternal(initialSessionId), 50);
      return () => clearTimeout(timer);
    }
    else {
      console.log(`${componentName} No session load required by this effect run.`);
      setIsLoading(false);
    }
  }, [initialSessionId, paneId, updatePaneContent, loadMessagesForSessionInternal, clearMessagesInLocalState, messages.length]);


  const historyMenuItems: PaneDropdownItem[] = useMemo(() => {
    if (!chatHistorySessions || chatHistorySessions.length === 0) {
      return [{ label: "No recent chats", action: () => { }, disabled: true }];
    }
    return chatHistorySessions.map(session => ({
      label: formatSessionForMenu(session),
      action: (event) => { // Removed async from here
        const isModifierHeld = event && (event.metaKey || event.ctrlKey);
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: 'coder_mode',
              action: isModifierHeld ? 'history_menu_item_cmd_click' : 'history_menu_item_click',
              label: session.id,
            }),
          ).pipe(Effect.provide(runtime)),
        );

        if (isModifierHeld) {
            // ... (open in new pane logic - ensure new pane gets session.id in content) ...
            const newPaneId = `coder_pane_${Date.now()}`;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const currentPanes = usePaneStore.getState().panes;
            const currentCoderPane = currentPanes.find(p => p.id === paneId); // Use current paneId
            const offsetX = 50;
            const offsetY = 50;

            usePaneStore.getState().addPane({
              id: newPaneId,
              type: "coder",
              title: `Coder (${session.id.substring(0,6)})`, // Title reflects session
              x: currentCoderPane ? Math.min(currentCoderPane.x + offsetX, screenWidth - 600) : Math.floor((screenWidth - 569) / 2),
              y: currentCoderPane ? Math.min(currentCoderPane.y + offsetY, screenHeight - 400) : 30,
              width: 569,
              height: Math.floor(screenHeight * 0.85),
              dismissable: true,
              content: { sessionId: session.id }, // Pass the existing session ID
            });
        } else {
          const newSessionId = session.id;
          console.log(`[CoderPane ${paneId}] History item clicked, setting session ID to: ${newSessionId}`);
          // Update refs to trigger reload via useEffect
          sessionIdRef.current = newSessionId;
          lastLoadedSessionIdRef.current = null; // This will make the main useEffect reload the session.

          // Manually call loadMessagesForSessionInternal to ensure it runs immediately
          // The useEffect might run too, but this ensures it if props don't change.
          loadMessagesForSessionInternal(newSessionId);

          setHistoryMenuOpen(false);
        }
      },
    }));
  }, [chatHistorySessions, runtime, paneId, loadMessagesForSessionInternal]); // Added loadMessagesForSessionInternal

  // ... (sendMessage using addMessageToLocalState and updateMessageInLocalState)
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: content.trim(), // Store user's raw text in content
      parts: [{type: 'text', text: content.trim()}], // Also in parts for UI
      timestamp: Date.now(),
    };
    addMessageToLocalState(userMessage); // Update local state
    setIsLoading(true);

    const assistantMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    addMessageToLocalState({ // Add placeholder to local state
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      parts: [{type: 'text', text: ''}],
      timestamp: Date.now(),
      isStreaming: true,
    });

    // ... (rest of the sendMessage logic using addMessageToLocalState and updateMessageInLocalState) ...
    // Ensure the apiMessages for Claude CLI are built from the current local `messages` state
    const currentMessagesForApi = messages.filter(m => m.role !== 'system').concat([userMessage]);
    const apiMessages = currentMessagesForApi.map(m => ({ role: m.role, content: m.content || m.parts?.find(p=>p.type==='text')?.text || "" }));


    // ... (IPC call logic) ...
    // In onChunk for IPC:
    // updateMessageInLocalState(assistantMessageId, (prevMessage) => { ... build new parts and new content for DB ... });
    // In onDone for IPC:
    // updateMessageInLocalState(assistantMessageId, { isStreaming: false });

  }, [isLoading, messages, addMessageToLocalState, updateMessageInLocalState]);

  // ...
};

// ...
export default React.memo(CoderPane); // Use React.memo for CoderPane
```

```typescript
// src/hooks/ai/useAgentChat.ts

// ... (other imports)
import { DatabaseService, type DBMessage } from "@/services/db"; // Ensure DBMessage is imported
import { usePaneStore } // Import the hook itself
// const { updatePaneContent } = usePaneStore.getState(); // Remove this line, call hook instead

// ...

export function useAgentChat(options: UseAgentChatOptions = {}) {
  // ... (existing state and refs) ...
  const updatePaneContent = usePaneStore((state) => state.updatePaneContent); // Get action from store hook

  // ... (useEffect for history loading) ...
  useEffect(() => {
    const hookId = `useAgentChat-${currentSessionId || 'new'}`;
    console.log(`[${hookId}] Effect for history loading. currentSessionId: ${currentSessionId}`);
    if (!currentSessionId) {
      // Generate a new session ID if one isn't provided and messages array is just the system message
      if (messages.length === 1 && messages[0].role === 'system') {
        const newSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        console.log(`[${hookId}] No currentSessionId, generated new: ${newSessionId}`);
        setCurrentSessionId(newSessionId); // This will re-trigger the effect
        // Persist this new session ID to the pane's content
        if (options.sessionId !== newSessionId) { // Avoid loop if options.sessionId was initially null
          updatePaneContent(`agent_chat_session_${newSessionId}`, { sessionId: newSessionId, sessionTitle: `Agent Chat (${newSessionId.substring(0,6)}...)` });
        }
      }
      return;
    }

    const loadHistory = async () => {
      // ... (existing DB loading logic) ...
      // Inside the successful DB load:
      if (Exit.isSuccess(exitResult)) {
        const { session: dbSessionInfo, messages: historicalMessages } = exitResult.value;
        if (dbSessionInfo?.provider_key) {
          setSelectedProviderKey(dbSessionInfo.provider_key);
        }
        if (historicalMessages.length > 0) {
          setMessages([systemMessageInstance, ...historicalMessages]);
        } else {
          // If no messages but session exists, still set system message
          setMessages([systemMessageInstance]);
        }
        // Update pane content in the store AFTER loading history
        updatePaneContent(`agent_chat_session_${currentSessionId}`, {
          sessionId: currentSessionId,
          sessionTitle: dbSessionInfo?.title || `Agent Chat (${currentSessionId.substring(0,6)}...)`
        });
        // ... (telemetry) ...
      }
      // ...
    };
    loadHistory();
  }, [currentSessionId, systemMessageInstance, runTelemetry, setSelectedProviderKey, updatePaneContent, options.sessionId, messages.length]);


  const sendMessage = useCallback(
    async (promptText: string) => {
      // ... (existing user message creation and UI update) ...
      let effectiveSessionId = currentSessionId;
      if (!effectiveSessionId) {
        effectiveSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        setCurrentSessionId(effectiveSessionId);
        // Persist this new session ID to the pane's content immediately
        updatePaneContent(`agent_chat_session_${effectiveSessionId}`, {
          sessionId: effectiveSessionId,
          sessionTitle: `Agent Chat (${effectiveSessionId.substring(0,6)}...)`
        });
      }
      const finalSessionId = effectiveSessionId; // Use a const for closure


      // Inside sendMessage, after adding userMessage to local state:
      const currentRuntimeForUserMsg = getMainRuntime();
      const dbServiceForUserMsg = Context.get(currentRuntimeForUserMsg.context, DatabaseService);
      const userDbMessage: DBMessage = { /* ... */ session_id: finalSessionId, /* ... */ };
      Effect.runFork(
        dbServiceForUserMsg.saveMessage(userDbMessage).pipe(
          Effect.andThen(dbServiceForUserMsg.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
          Effect.provide(currentRuntimeForUserMsg)
        )
      );

      // ... (rest of sendMessage, including orchestrator call) ...

      // Inside the Effect.ensuring block for stream completion/error:
      Effect.ensuring(
        Effect.sync(() => {
          // ... (UI updates for isLoading, isStreaming) ...
          const finalMessagesFromState = get().messages; // Assuming get() from Zustand or similar
          const finalAssistantMessage = finalMessagesFromState.find(m => m.id === assistantMsgId);

          if (finalAssistantMessage && finalSessionId && !signal.aborted) {
            const currentRuntimeForAssistantMsg = getMainRuntime();
            const dbServiceForAssistantMsg = Context.get(currentRuntimeForAssistantMsg.context, DatabaseService);
            const dbAssistantMessage: DBMessage = {
              id: finalAssistantMessage.id,
              session_id: finalSessionId,
              role: "assistant",
              content: finalAssistantMessage.content,
              tool_calls_json: finalAssistantMessage.tool_calls ? JSON.stringify(finalAssistantMessage.tool_calls) : undefined,
              timestamp: Math.floor(finalAssistantMessage.timestamp / 1000),
            };
            Effect.runFork(
              dbServiceForAssistantMsg.saveMessage(dbAssistantMessage).pipe(
                Effect.andThen(dbServiceForAssistantMsg.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
                Effect.provide(currentRuntimeForAssistantMsg)
              )
            );
            runTelemetry({ /* ... assistant_message_saved ... */ });
          }
          // ... (rest of cleanup) ...
        })
      )
      // ...
    },
    [messages, currentInput, isLoading, currentSessionId, /*...other deps...*/ updatePaneContent]
  );

  // ...
}
```

```typescript
// src/stores/pane.ts
// In usePaneStore, ensure togglePaneAction uses `get`
// toggleAgentChatPane: () => togglePaneAction(set, get, { /* ... */ }),
// togglePreviousChatsPane: () => togglePaneAction(set, get, { /* ... */ }),
// toggleSellComputePane: () => togglePaneAction(set, get, { /* ... */ }),
// toggleWalletPane: () => togglePaneAction(set, get, { /* ... */ }),
// toggleDvmJobHistoryPane: () => togglePaneAction(set, get, { /* ... */ }),
// toggleCoderPane: () => toggleAllCoderPanesAction(set, get), // Note: toggleAllCoderPanesAction takes `get`

// If toggleAllCoderPanesAction wasn't taking `get` already:
// src/stores/panes/actions/toggleAllCoderPanes.ts
// export const toggleAllCoderPanesAction = (set: SetPaneStore, get: GetPaneStore) => { ... }
```The problem is that chat messages in panes are not persisting correctly when panes are refreshed or toggled closed/opened. This points to issues with how pane content, specifically chat `sessionId`s and the messages themselves, are being managed by `usePaneStore` and the individual chat components like `CoderPane` and `AgentChatPane`.

Here's a plan to address these issues:

**I. Ensure Reliable `sessionId` Persistence and Restoration for Panes**

The `usePaneStore` has a `closedPanePositions` map that stores `content` (including `sessionId`) for closed panes. We need to ensure this is correctly used.

1.  **Modify `src/stores/panes/actions/removePane.ts`**:
    *   When a pane is removed (e.g., by clicking its 'X' button), its content (including `sessionId`) should be saved to `closedPanePositions`.
    *   The `shouldRestore` flag for these explicitly closed panes should generally be `false` to differentiate them from panes that are merely toggled off. However, `togglePaneAction` will set `shouldRestore: true` for its own closes.
    *   **Instruction:**
        ```typescript
        // src/stores/panes/actions/removePane.ts
        // ... (other imports)

        export function removePaneAction(set: any, id: string) {
          set((state: PaneStoreType) => {
            const paneToRemove = state.panes.find((pane) => pane.id === id);

            const remainingPanes = state.panes.filter((pane) => pane.id !== id);
            let newActivePaneId: string | null = null;

            if (state.activePaneId === id) {
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
            } else {
              newActivePaneId = state.activePaneId;
            }

            const finalPanes = remainingPanes.map((p) => ({
              ...p,
              isActive: p.id === newActivePaneId,
            }));

            const updatedClosedPanePositions = { ...state.closedPanePositions };
            if (paneToRemove) {
              updatedClosedPanePositions[id] = {
                x: paneToRemove.x,
                y: paneToRemove.y,
                width: paneToRemove.width,
                height: paneToRemove.height,
                content: paneToRemove.content,
                // shouldRestore: false, // Let the action that calls removePane decide this.
                                         // For direct 'X' close, it implies not to restore on simple toggle.
                                         // Toggle actions will set shouldRestore: true before calling this.
              };
            }

            return {
              panes: finalPanes,
              activePaneId: newActivePaneId,
              closedPanePositions: updatedClosedPanePositions,
            };
          });
        }
        ```

2.  **Modify `src/stores/panes/actions/togglePane.ts`**:
    *   **When Closing**: If the pane is active and being closed by the toggle, save its `content` (including `sessionId`) to `closedPanePositions` and mark `shouldRestore: true`.
    *   **When Opening**: If the pane doesn't exist, check `closedPanePositions`. If an entry exists for `paneId` and `shouldRestore !== false`, use its `content` (including `sessionId`) to initialize the new pane via `createPaneInput`. After restoring, remove the entry from `closedPanePositions` to prevent reuse.
    *   **Instruction:**
        ```typescript
        // src/stores/panes/actions/togglePane.ts
        import { type PaneStoreType, type SetPaneStore, type GetPaneStore } from "../types"; // Ensure GetPaneStore is imported
        import { type PaneInput } from "@/types/pane";
        import { addPaneActionLogic } from "./addPane";
        // ...

        interface TogglePaneConfig {
          paneId: string;
          createPaneInput: (screenWidth: number, screenHeight: number, storedData?: { x: number; y: number; width: number; height: number; content?: any }) => PaneInput;
        }

        export function togglePaneAction(
          set: SetPaneStore,
          get: GetPaneStore, // Add get
          config: TogglePaneConfig
        ) {
          const state = get(); // Get current state
          const { paneId, createPaneInput } = config;
          const existingPane = state.panes.find((p) => p.id === paneId);

          if (existingPane) {
            if (state.activePaneId === paneId) { // Closing the active pane
              const paneToClose = existingPane;
              const remainingPanes = state.panes.filter((pane) => pane.id !== paneId);
              let newActivePaneId: string | null = null;
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
              const updatedPanes = remainingPanes.map((p) => ({
                ...p,
                isActive: p.id === newActivePaneId,
              }));

              const updatedClosedPanePositions = { ...state.closedPanePositions };
              updatedClosedPanePositions[paneId] = {
                x: paneToClose.x,
                y: paneToClose.y,
                width: paneToClose.width,
                height: paneToClose.height,
                content: paneToClose.content,
                shouldRestore: true, // Mark as toggle-closed
              };

              set({
                panes: updatedPanes,
                activePaneId: newActivePaneId,
                closedPanePositions: updatedClosedPanePositions,
              });
            } else { // Bringing an existing, non-active pane to front
              const panesWithoutTarget = state.panes.filter((p) => p.id !== paneId);
              const updatedTargetPane = { ...existingPane, isActive: true };
              const updatedOtherPanes = panesWithoutTarget.map((p) => ({
                ...p,
                isActive: false,
              }));

              set({
                panes: [...updatedOtherPanes, updatedTargetPane],
                activePaneId: paneId,
              });
            }
          } else { // Pane doesn't exist, create it
            const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
            const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

            const storedData = state.closedPanePositions[paneId];
            let paneInputParams: PaneInput;

            if (storedData && storedData.shouldRestore !== false) {
              // Use content from storedData when creating pane input
              console.log(`[TogglePane] Restoring pane ${paneId} with content:`, storedData.content);
              paneInputParams = createPaneInput(screenWidth, screenHeight, storedData);
            } else {
              paneInputParams = createPaneInput(screenWidth, screenHeight);
            }

            if (!paneInputParams.id) {
                paneInputParams.id = paneId;
            }

            // addPaneActionLogic needs the full current state to work with `set`
            const updatedStateAfterAdd = addPaneActionLogic(state, paneInputParams, false);

            const finalClosedPanePositions = { ...state.closedPanePositions };
            if (storedData && storedData.shouldRestore !== false) {
              delete finalClosedPanePositions[paneId]; // Remove after restoring
            }

            set({
              ...updatedStateAfterAdd,
              closedPanePositions: finalClosedPanePositions,
            });
          }
        }
        ```

3.  **Update `usePaneStore` calls for toggle actions (`src/stores/pane.ts`):**
    *   Ensure all `toggle...Action` calls in `usePaneStore` are correctly passing `get` as the second argument to `togglePaneAction`.
    *   **Instruction:**
        ```typescript
        // src/stores/pane.ts
        // Example for toggleAgentChatPane:
        toggleAgentChatPane: () => set((state) => togglePaneAction(set, get, { /* config */ })), // Pass set and get
        // Apply this pattern to all toggle actions (togglePreviousChatsPane, toggleSellComputePane, etc.)
        // For toggleAllCoderPanesAction, it already takes `get` correctly.
        ```

**II. Refine `CoderPane.tsx` Session and Message Loading**

**Goal:** Ensure `CoderPane` correctly loads messages based on `initialSessionId` (from `pane.content.sessionId`) and updates this `sessionId` in the store if it changes (e.g., new chat, history load).

1.  **File:** `src/components/coder/CoderPane.tsx`
    *   **Centralize Session ID Logic:**
        *   Use `sessionIdRef.current` as the primary source of truth for the current session within the component.
        *   The `initialSessionId` prop should only be used to *initialize* `sessionIdRef.current` or trigger a load if it changes.
    *   **Refine `useEffect` for Session Loading:**
        *   This effect should now primarily react to changes in the `initialSessionId` prop.
        *   If `initialSessionId` changes and is different from `lastLoadedSessionIdRef.current`, then load messages for `initialSessionId`.
        *   If `initialSessionId` is initially undefined and `sessionIdRef.current` is also undefined (new pane), generate a new session ID.
    *   **Refine History Menu Item Action:**
        *   When a history item is clicked to load a session in the *current* pane:
            1.  Update `sessionIdRef.current` to the selected `session.id`.
            2.  **Crucially, set `lastLoadedSessionIdRef.current = null;`**. This ensures the main `useEffect` (listening to `initialSessionId`) will perform a load if the `initialSessionId` prop *doesn't* change but we want to load a new session into the same pane instance.
            3.  Alternatively, and more directly, call `loadMessagesForSessionInternal(newSessionId)` right after updating `sessionIdRef.current`.
            4.  Call `updatePaneContent(paneId, { sessionId: newSessionId })` to persist the new `sessionId` to the store.
    *   **Saving Messages:** The `sendMessage` function already passes `sessionIdRef.current` to the IPC call, and `main-claude-websocket.ts` saves messages using this ID. This part should be okay if `sessionIdRef.current` is managed correctly.
    *   **Instruction (Conceptual structure for `useEffect` and history action):**
        ```typescript
        // src/components/coder/CoderPane.tsx
        // ... imports, other hooks ...
        const { updatePaneContent } = usePaneStore.getState(); // Ensure this is accessible

        const lastLoadedSessionIdRef = useRef<string | null>(null); // Tracks what's actually loaded

        const loadMessagesForSessionInternal = useCallback(async (sessionIdToLoad: string) => {
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'LOAD'}]`;
          console.log(`${componentName} Explicitly loading messages for session: ${sessionIdToLoad}`);
          setIsLoading(true);
          clearMessagesInLocalState();

          try {
            const runtime = getMainRuntime();
            const dbProgram = Effect.flatMap(DatabaseService, (db) =>
              db.getMessagesForSession(sessionIdToLoad, 500)
            );
            const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));

            if (Exit.isSuccess(exitResult)) {
              const dbMessages = exitResult.value;
              // ... (populate newMessagesState from dbMessages as before) ...
              const systemMsg = { id: 'system', role: 'system', content: 'You are Claude Code...', timestamp: Date.now() };
              const newMessagesStateFromDb: ChatMessage[] = [systemMsg];
              dbMessages.forEach(dbMsg => { /* ... map dbMsg to ChatMessage ... */ newMessagesStateFromDb.push(mappedDbMsg); });

              setMessages(newMessagesStateFromDb);
              lastLoadedSessionIdRef.current = sessionIdToLoad; // Mark this session ID as loaded
              // sessionIdRef.current is already set by the caller of this function or by the useEffect
              updatePaneContent(paneId, { sessionId: sessionIdToLoad });
              console.log(`${componentName} Session ${sessionIdToLoad} loaded. UI messages: ${newMessagesStateFromDb.length}`);
            } else { /* ... error handling ... */ }
          } catch (error) { /* ... error handling ... */ }
          finally { setIsLoading(false); setFocusKey(prev => prev + 1); }
        }, [paneId, clearMessagesInLocalState, updatePaneContent, runtime, addMessageToLocalState, setMessages, setIsLoading, setFocusKey]); // addMessageToLocalState if used in error handling

        useEffect(() => {
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'EFFECT'}]`;
          console.log(`${componentName} Effect for session. initialSessionId: ${initialSessionId}, current sessionIdRef: ${sessionIdRef.current}, lastLoaded: ${lastLoadedSessionIdRef.current}`);

          if (initialSessionId) {
            if (initialSessionId !== sessionIdRef.current) {
              console.log(`${componentName} initialSessionId prop changed to ${initialSessionId}. Updating sessionIdRef.`);
              sessionIdRef.current = initialSessionId;
              // Force reload because the session this pane *should* display has changed
              lastLoadedSessionIdRef.current = null;
            }

            if (initialSessionId !== lastLoadedSessionIdRef.current) {
              // Load if initialSessionId is new or different from last loaded
              const timer = setTimeout(() => loadMessagesForSessionInternal(initialSessionId), 50);
              return () => clearTimeout(timer);
            } else {
               console.log(`${componentName} Session ${initialSessionId} already loaded or no change needed from prop.`);
               setIsLoading(false);
            }
          } else if (!sessionIdRef.current) {
            // No initialSessionId from prop AND no current session in ref (truly new pane)
            const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            console.log(`${componentName} No initial session, generated new: ${newSessionId}`);
            sessionIdRef.current = newSessionId;
            lastLoadedSessionIdRef.current = newSessionId;
            clearMessagesInLocalState();
            updatePaneContent(paneId, { sessionId: newSessionId });
            setIsLoading(false);
          } else {
            // No initialSessionId prop, but sessionIdRef.current exists (pane might have been re-rendered)
            // Ensure messages for sessionIdRef.current are loaded if not already
            if (sessionIdRef.current !== lastLoadedSessionIdRef.current) {
                console.log(`${componentName} No initialSessionId prop, but sessionIdRef.current (${sessionIdRef.current}) differs from lastLoaded (${lastLoadedSessionIdRef.current}). Loading.`);
                const timer = setTimeout(() => loadMessagesForSessionInternal(sessionIdRef.current!), 50);
                return () => clearTimeout(timer);
            } else {
                console.log(`${componentName} No session load action required by this effect run.`);
                setIsLoading(false);
            }
          }
        }, [initialSessionId, paneId, updatePaneContent, loadMessagesForSessionInternal, clearMessagesInLocalState]);


        // Inside historyMenuItems action:
        action: (event) => { // Removed async, loadMessagesForSessionInternal is async
          // ... (telemetry and modifier key logic) ...
          if (isModifierHeld) { /* ... open in new pane logic ... */ }
          else {
            const newSessionId = session.id;
            const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'HIST'}]`;
            console.log(`${componentName} History item clicked, setting session ID to: ${newSessionId}`);

            sessionIdRef.current = newSessionId;
            // Crucially, ensure lastLoadedSessionIdRef is different from newSessionId to trigger reload via useEffect,
            // OR call loadMessagesForSessionInternal directly if the initialSessionId prop won't change.
            // Direct call is more robust here.
            loadMessagesForSessionInternal(newSessionId);

            setHistoryMenuOpen(false);
          }
        },
        // ...
        ```

**III. `useAgentChat` Hook Message and Session ID Persistence**

**Goal:** Ensure messages are saved to DB with the correct `sessionId`, and this `sessionId` is persisted to the pane's state.

1.  **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Session ID Handling:**
        *   When `sendMessage` is called, if `currentSessionId` is null, generate a new one.
        *   Immediately after generating or confirming a `sessionId` (at the start of `sendMessage` or in the history loading `useEffect`), call `updatePaneContent` to persist this `sessionId` to the `pane.content` in the global store. The pane ID for `AgentChatPane` instances is typically `agent_chat_session_${sessionId}`.
    *   **Saving Messages:**
        *   User messages should be saved to DB immediately after being added to local state in `sendMessage`.
        *   Assistant messages should be saved to DB in the `Effect.ensuring` block (or equivalent stream completion handler) after all chunks are received and the message is complete.
    *   **Instruction:**
        ```typescript
        // src/hooks/ai/useAgentChat.ts
        // ...
        const updatePaneContent = usePaneStore((state) => state.updatePaneContent); // Get action from store hook

        useEffect(() => {
          const hookId = `useAgentChat-${currentSessionId || initialSystemMessage.substring(0,10) ||'new'}`;
          // console.log(`[${hookId}] Effect for history loading. currentSessionId: ${currentSessionId}`);

          let effectiveSessionId = currentSessionId;
          if (!effectiveSessionId) {
            effectiveSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            console.log(`[${hookId}] No currentSessionId on mount, generated new: ${effectiveSessionId}`);
            setCurrentSessionId(effectiveSessionId);
            // Persist this new session ID to the pane's content.
            // The pane ID for AgentChatPane is dynamic: agent_chat_session_${sessionId}
            updatePaneContent(`agent_chat_session_${effectiveSessionId}`, {
              sessionId: effectiveSessionId,
              sessionTitle: `Agent Chat (${effectiveSessionId.substring(0,6)}...)`
            });
            // Set initial messages for a new session
            setMessages([systemMessageInstance]);
            return; // End effect here, next render will have currentSessionId
          }

          // If currentSessionId is already set, proceed to load history
          const loadHistory = async () => {
            // ... (existing DB loading logic) ...
            if (Exit.isSuccess(exitResult)) {
              // ... (message processing) ...
              updatePaneContent(`agent_chat_session_${effectiveSessionId}`, { // Use effectiveSessionId
                sessionId: effectiveSessionId,
                sessionTitle: dbSessionInfo?.title || `Agent Chat (${effectiveSessionId.substring(0,6)}...)`
              });
            }
          };
          loadHistory();
        }, [currentSessionId, systemMessageInstance, runTelemetry, setSelectedProviderKey, updatePaneContent, initialSystemMessage]);


        const sendMessage = useCallback(async (promptText: string) => {
          // ...
          let finalSessionId = currentSessionId;
          if (!finalSessionId) {
            finalSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            setCurrentSessionId(finalSessionId);
            updatePaneContent(`agent_chat_session_${finalSessionId}`, {
              sessionId: finalSessionId,
              sessionTitle: `Agent Chat (${finalSessionId.substring(0,6)}...)`
            });
          }
          // ... (add userMessage to local state) ...

          // Save user message to DB
          const currentRuntimeForUserMsg = getMainRuntime();
          const dbService = Context.get(currentRuntimeForUserMsg.context, DatabaseService);
          const userDbMessage: DBMessage = {
            id: userMessage.id,
            session_id: finalSessionId, // Use finalSessionId
            role: "user",
            content: userMessage.content,
            timestamp: Math.floor(userMessage.timestamp / 1000),
          };
          Effect.runFork(
            dbService.saveMessage(userDbMessage).pipe(
              Effect.andThen(dbService.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
              Effect.provide(currentRuntimeForUserMsg)
            )
          );

          // ... (rest of orchestrator call and stream processing) ...

          // Inside Effect.ensuring block:
          Effect.ensuring(
            Effect.sync(() => {
              // ... (UI updates) ...
              const finalMessagesFromState = get().messages; // Zustand's get()
              const finalAssistantMessage = finalMessagesFromState.find(m => m.id === assistantMsgId);

              if (finalAssistantMessage && finalSessionId && !signal.aborted) {
                const currentRuntimeForAssistantMsg = getMainRuntime();
                const dbServiceForAssistant = Context.get(currentRuntimeForAssistantMsg.context, DatabaseService);
                const dbAssistantMessage: DBMessage = { /* ... map from finalAssistantMessage ... */ session_id: finalSessionId, /* ... */ };
                Effect.runFork(
                  dbServiceForAssistant.saveMessage(dbAssistantMessage).pipe(
                    Effect.andThen(dbServiceForAssistant.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
                    Effect.provide(currentRuntimeForAssistantMsg)
                  )
                );
                // ... (telemetry) ...
              }
              // ... (cleanup refs) ...
            })
          )
          // ...
        }, [/* ... existing dependencies ... */ currentSessionId, updatePaneContent]); // Add updatePaneContent and currentSessionId
        ```

By ensuring `sessionId` is consistently managed in `pane.content` and used by chat components to load/save from the database, the message persistence issues should be resolved.

**IV. Verify `PaneManager.tsx` Prop Passing**

This was already marked as correct in the thought process. Double-check that `pane.content.sessionId` is correctly passed to `AgentChatPane` and `CoderPane` as `sessionId` prop.

This completes the instructions. Test these changes rigorously.

```typescript
// src/stores/pane.ts
// In usePaneStore, ensure togglePaneAction uses `get`
// Corrected example:
// toggleAgentChatPane: () => set((state) => togglePaneAction(set, get, { /* config for AgentChatPane */ })),
// Replace all similar toggle actions to correctly pass `get` as the second argument to `togglePaneAction`.
// toggleCoderPane calls toggleAllCoderPanesAction which already has `get`.
```

```typescript
// src/components/coder/CoderPane.tsx

// In historyMenuItems action:
action: (event) => { // Removed async
  const isModifierHeld = event && (event.metaKey || event.ctrlKey);
  // ... (telemetry logic) ...
  if (isModifierHeld) { /* ... open in new pane ... */ }
  else {
    const newSessionId = session.id;
    const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'HIST'}]`;
    console.log(`${componentName} History item clicked, setting session ID to: ${newSessionId}`);

    // Update sessionIdRef.current immediately.
    // This ensures that if loadMessagesForSessionInternal itself causes a re-render
    // before the state update from setMessages is processed, subsequent logic
    // (like sendMessage) uses the correct newSessionId.
    sessionIdRef.current = newSessionId;

    // Directly call the loading function.
    // This also updates lastLoadedSessionIdRef and pane content in the store.
    loadMessagesForSessionInternal(newSessionId);

    setHistoryMenuOpen(false);
  }
},
```
