Okay, Agent, we need to implement a new feature: a pane for displaying and opening previous chat threads.

**Overall Goal:**

Create a new pane type, let's call it `"previous_chats"`, that lists all prior chat sessions. Clicking on a session in this list should open (or focus) an `"agent_chat"` pane, loading all messages and tool call information for that specific thread.

Here are the detailed instructions:

---

## **Phase: Previous Chat Threads**

**Preamble:**

*   **UI Components:** Utilize existing Shadcn UI components (`Card`, `ScrollArea`, `Button`, `Badge`, etc.) for consistency.
*   **State Management:** Use the existing `usePaneStore` for managing the new "previous\_chats" pane and for opening/focusing "agent\_chat" panes.
*   **Data Persistence:** Leverage the existing `DatabaseService` and PGlite setup (`docs/pglite.md`). Chat sessions are stored as `DBSession`, messages as `DBMessage`, and tool executions as `DBToolExecution`. You will need to ensure the `DatabaseService` supports fetching all sessions.
*   **Error Handling:** UI should gracefully display errors from data fetching or service calls.
*   **Logging:** Use the `TelemetryService` for all significant actions and events.

---

**Task 1: Define New Pane Type and Store Logic for "Previous Chats List"**

1.  **Update `src/types/pane.ts`:**
    *   Add `"previous_chats"` to the `Pane['type']` union.
    *   The `PaneInput` type should be compatible.

2.  **Update `src/stores/panes/constants.ts`:**
    *   Define constants for the new pane:
        ```typescript
        export const PREVIOUS_CHATS_PANE_ID = "previous_chats_list";
        export const PREVIOUS_CHATS_PANE_TITLE = "Chat History";
        export const PREVIOUS_CHATS_PANE_DEFAULT_WIDTH = 350;
        export const PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT = 500;
        ```

3.  **Create `src/stores/panes/actions/openPreviousChatsPane.ts`:**
    *   Implement `openPreviousChatsPaneAction(set: SetPaneStore)`:
        *   This action should use `addPaneActionLogic` (from `./addPane.ts`) to open a new pane or focus an existing one.
        *   Pane details: `id: PREVIOUS_CHATS_PANE_ID`, `type: "previous_chats"`, `title: PREVIOUS_CHATS_PANE_TITLE`, `dismissable: true`, use default width/height constants.
        *   Ensure it's tiled (pass `true` for `shouldTile` to `addPaneActionLogic`).

4.  **Update `src/stores/panes/actions/index.ts`:**
    *   Export `openPreviousChatsPaneAction`.

5.  **Update `src/stores/panes/types.ts`:**
    *   Add `openPreviousChatsPane: () => void;` to `PaneStoreType`.

6.  **Update `src/stores/pane.ts`:**
    *   Import and integrate `openPreviousChatsPaneAction`.

**Task 2: Implement `DatabaseService.getAllSessions()`**

1.  **Modify `src/services/db/DatabaseService.ts`:**
    *   Add a new method to the `DatabaseService` interface:
        ```typescript
        getAllSessions(options?: { limit?: number, offset?: number, sortBy?: 'created_at' | 'last_updated_at', sortOrder?: 'ASC' | 'DESC' }): Effect.Effect<DBSession[], DatabaseError>;
        ```

2.  **Modify `src/services/db/DatabaseServiceImpl.ts` (Main Process PGlite implementation):**
    *   Implement `getAllSessions`:
        *   Construct a SQL query: `SELECT * FROM sessions ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2;`
        *   Use the `runQuery` helper to execute it.
        *   Map the result rows to `DBSession[]`.
        *   Default to sorting by `last_updated_at DESC`.

3.  **Modify `src/services/db/DatabaseServiceWebSocketProxy.ts` (Renderer Process WebSocket Proxy):**
    *   Implement `getAllSessions` by calling `sendDatabaseRequest('getAllSessions', options)`.
    *   Ensure the bridge service (`src/main-claude-websocket.js`) handles the `'getAllSessions'` operation and calls the main process `DatabaseService` implementation.

4.  **Modify `src/helpers/ipc/db/db-channels.ts` and `db-context.ts` (if using IPC proxy instead of WebSocket):**
    *   Add a new channel for `getAllSessions`.
    *   Expose `getAllSessions` in `db-context.ts`.
    *   Implement the handler in `db-listeners.ts` to call the main process `DatabaseService`.

**Task 3: Implement `PreviousChatsPane` UI Component**

1.  **Create Directory:** `src/components/previous_chats/`
2.  **Create File:** `src/components/previous_chats/PreviousChatsPane.tsx`
3.  **Content:**

    ```typescript
    // src/components/previous_chats/PreviousChatsPane.tsx
    import React from "react";
    import { useQuery } from "@tanstack/react-query";
    import { Effect, Exit, Cause } from "effect";
    import { DatabaseService, type DBSession } from "@/services/db";
    import { getMainRuntime } from "@/services/runtime";
    import { usePaneStore } from "@/stores/pane";
    import { ScrollArea } from "@/components/ui/scroll-area";
    import { Button } from "@/components/ui/button";
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
    import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
    import { TelemetryService } from "@/services/telemetry";
    import { AGENT_CHAT_PANE_TITLE } from "@/stores/panes/constants"; // For default title

    const PreviousChatsPane: React.FC = () => {
      const runtime = getMainRuntime();
      const { openAgentChatPane } = usePaneStore();

      const {
        data: sessions,
        isLoading,
        error,
        refetch,
      } = useQuery<DBSession[], Error>({
        queryKey: ["previousChatSessions"],
        queryFn: async () => {
          const program = Effect.flatMap(DatabaseService, (db) =>
            db.getAllSessions({ sortBy: "last_updated_at", sortOrder: "DESC", limit: 100 }),
          );
          const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
          if (Exit.isSuccess(exitResult)) return exitResult.value;
          throw Cause.squash(exitResult.cause);
        },
      });

      React.useEffect(() => {
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "ui:pane",
              action: "open_previous_chats_pane",
            }),
          ).pipe(Effect.provide(runtime)),
        );
      }, [runtime]);

      const handleThreadClick = (session: DBSession) => {
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "ui:previous_chats",
              action: "open_thread",
              label: session.id,
              value: session.title,
            }),
          ).pipe(Effect.provide(runtime)),
        );
        openAgentChatPane({
          id: `agent_chat_session_${session.id}`, // Ensure unique pane ID for each session
          type: "agent_chat",
          title: session.title || `${AGENT_CHAT_PANE_TITLE} (${session.id.substring(0,6)}...)`,
          content: { sessionId: session.id, sessionTitle: session.title }, // Pass sessionId and title
          dismissable: true,
        });
      };

      return (
        <div className="flex h-full flex-col p-1">
          {isLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading chat history...</span>
            </div>
          )}
          {error && (
            <div className="m-4 flex flex-col items-center justify-center text-center text-destructive">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p className="font-semibold">Error loading chat history:</p>
              <p className="text-xs">{error.message}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3">
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !error && sessions && sessions.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="mb-2 h-10 w-10" />
              <p>No chat history found.</p>
              <p className="text-xs">Start a new chat in the Agent Chat pane.</p>
            </div>
          )}
          {!isLoading && !error && sessions && sessions.length > 0 && (
            <ScrollArea className="h-full">
              <div className="space-y-2 p-1">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleThreadClick(session)}
                  >
                    <CardHeader className="p-2">
                      <CardTitle className="truncate text-sm">
                        {session.title || "Untitled Chat"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Provider: {session.provider_key || "N/A"} | Model: {session.model_name || "N/A"}
                        <br />
                        Last active: {new Date(session.last_updated_at * 1000).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    };

    export default PreviousChatsPane;
    ```

4.  **Create `src/components/previous_chats/index.ts`:**
    *   Export `PreviousChatsPane`.

**Task 4: Enhance `useAgentChat` Hook and `AgentChatPane` for History Loading**

1.  **Modify `src/hooks/ai/useAgentChat.ts`:**
    *   Update `UseAgentChatOptions` to include `sessionId?: string`.
    *   Inside the hook, add a `useEffect` that listens for changes to `options.sessionId`.
    *   If `sessionId` is provided:
        *   Set a local state `currentSessionId` (or use a ref). This ID will be used when saving new messages.
        *   Fetch messages for this session using `DatabaseService.getMessagesForSession(sessionId, 100)`. (Load a reasonable limit, e.g., last 100 messages. Consider pagination for very long chats later).
        *   For each `DBMessage` that might have tool calls (e.g., assistant messages where `tool_calls_json` is not null), fetch associated `DBToolExecution` records using `DatabaseService.getToolCallsForMessage(dbMessage.id)`.
        *   **Map `DBMessage` and `DBToolExecution[]` to `UIAgentChatMessage[]`:**
            *   `dbMessage.id` -> `uiMsg.id`
            *   `dbMessage.role` -> `uiMsg.role` (ensure role compatibility)
            *   `dbMessage.content` -> `uiMsg.content`
            *   `dbMessage.timestamp` (seconds) -> `uiMsg.timestamp` (milliseconds)
            *   Parse `dbMessage.tool_calls_json` into `AgentChatMessage['tool_calls']` structure.
            *   If tool executions are fetched, they should be associated with the assistant message that made the call, or represented as separate "tool" role messages containing the result. The `AgentChatMessageSchema` already supports `tool_calls` on assistant messages and `tool_call_id` on tool responses.
            *   Parse `dbMessage.metadata_json` into `uiMsg.providerInfo` if applicable.
        *   Set the `messages` state with `[systemMessageInstance, ...loadedMessages]`.
        *   **Fetch Session Details:** Load `DBSession` for the `sessionId` using `DatabaseService.getSession(sessionId)`. Use `provider_key` and `model_name` from session to set the `selectedProviderKey` in `useAgentChatStore`.
    *   **Message Saving:**
        *   When `sendMessage` is called and a user message is created:
            *   If `currentSessionId` is null (new chat), generate a new `sessionId` (e.g., UUID). Call `DatabaseService.saveSession` with the new session details. Store this new `sessionId` locally.
            *   Save the `userMessage` (as `DBMessage`) using `DatabaseService.saveMessage(dbUserMessage)`.
        *   When an assistant response (or tool call sequence) completes:
            *   Save the assistant's final message(s) and any tool request/result messages to the DB using `DatabaseService.saveMessage()`.
            *   Ensure `DBMessage.tool_calls_json` is populated correctly for assistant messages that initiate tool calls.
            *   Save tool executions using `DatabaseService.saveToolCall()` and `DatabaseService.updateToolCallResult()`.
            *   Update the `DBSession.last_updated_at` (and `title` if it's dynamic) for the `currentSessionId` using `DatabaseService.updateSession()`.
    *   **Clear History:** The `clearHistory` function should now, if a `currentSessionId` exists, also clear messages for that session from the database or mark the session as cleared/archived. For now, just clear the local state and set `currentSessionId` to null.

2.  **Modify `src/components/ai/AgentChatPane.tsx`:**
    *   This component will now receive `sessionId` and `sessionTitle` from `pane.content` if an existing thread is opened.
    *   Pass `sessionId` to `useAgentChat` hook.
    *   If `sessionTitle` is provided in `pane.content`, use it as the initial title. The `AgentChatPane`'s title could be updated if the session title changes (e.g., after the first few messages).

**Task 5: Update `PaneManager` and Hotbar Integration**

1.  **Modify `src/panes/PaneManager.tsx`:**
    *   Import `PreviousChatsPane` from `../components/previous_chats`.
    *   Add a case to render `<PreviousChatsPane />` when `pane.type === 'previous_chats'`.
    *   Ensure the fallback condition for pane types is updated to include `'previous_chats'`.

2.  **Modify `src/components/hud/Hotbar.tsx` (or add a new button elsewhere):**
    *   Add a new `HotbarItem` or `Button` to open the "Previous Chats" pane.
    *   `onClick`: `usePaneStore.getState().openPreviousChatsPane()`.
    *   `title`: "Chat History".
    *   `isActive`: Check if `activePaneId === PREVIOUS_CHATS_PANE_ID`.
    *   Choose an appropriate icon (e.g., `History` or `Archive` from `lucide-react`).

**Task 6: Testing (Conceptual - full test files not required here)**

1.  **`PreviousChatsPane.test.tsx`:**
    *   Mock `DatabaseService.getAllSessions` to return sample sessions.
    *   Test rendering of the session list.
    *   Test that clicking a session calls `usePaneStore.openAgentChatPane` with correct parameters.
2.  **`useAgentChat.test.ts` (Enhance):**
    *   Mock `DatabaseService` methods (`getSession`, `getMessagesForSession`, `getToolCallsForMessage`, `saveSession`, `saveMessage`, `updateSession`).
    *   Test history loading when `sessionId` is provided.
    *   Test that new messages are saved to the DB with the correct `sessionId`.
    *   Test generation of a new `sessionId` for new chats.
3.  **`DatabaseService` Tests (Enhance in `src/tests/unit/services/db/`):**
    *   Add tests for `getAllSessions`. Ensure sorting and pagination work.
    *   Verify existing tests for message/tool call saving and retrieval are robust.

---

This set of instructions should guide the agent in implementing the previous chat threads feature. The primary challenges will be managing the state between the new listing pane and the existing agent chat pane, and ensuring the `useAgentChat` hook correctly handles both new chats and loading/continuing existing ones from the database.Okay, I will create the instructions for the coding agent to implement the "previous chat threads" pane.

## **Instructions for Coding Agent: Implement Previous Chat Threads Pane**

**Objective:**

Create a new user interface pane that lists previously saved chat threads. Clicking on a thread in this list will open it in an `AgentChatPane`, loading all its messages and tool call history from the PGlite database.

**Preamble & Context:**

*   The application uses Electron, React 19, TypeScript, Effect-TS for services, Zustand for UI state (panes), and PGlite for local database persistence via a `DatabaseService`.
*   The existing `AgentChatPane` (powered by `useAgentChat` hook) is used for live AI interactions.
*   Chat sessions, messages, and tool executions are stored in the database using schemas defined in `src/services/db/DatabaseSchemas.ts` (`DBSession`, `DBMessage`, `DBToolExecution`).
*   All UI components should utilize Shadcn UI and Tailwind CSS for styling.
*   All new code should adhere to the project's existing patterns for services, hooks, components, and state management, including telemetry.

---

### **Phase: Previous Chat Threads UI & Logic**

**Task 1: Database Service Enhancement - Fetch All Chat Sessions**

1.  **Modify `src/services/db/DatabaseService.ts`:**
    *   Add a new method signature to the `DatabaseService` interface:
        ```typescript
        getAllSessions(options?: {
          limit?: number;
          offset?: number;
          sortBy?: "created_at" | "last_updated_at";
          sortOrder?: "ASC" | "DESC";
        }): Effect.Effect<DBSession[], DatabaseError>;
        ```

2.  **Modify `src/services/db/DatabaseServiceImpl.ts` (Main Process - PGlite Direct):**
    *   Implement the `getAllSessions` method:
        *   Use a SQL query like: `SELECT * FROM sessions ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2;`
        *   Default `sortBy` to `"last_updated_at"` and `sortOrder` to `"DESC"`.
        *   Default `limit` to `100` and `offset` to `0`.
        *   Use the existing `runQuery` helper. Map the raw rows to `DBSession[]`.
        *   Track this operation with `TelemetryService`.

3.  **Modify `src/services/db/DatabaseServiceWebSocketProxy.ts` (Renderer Process - WebSocket Proxy):**
    *   Implement the `getAllSessions` method to call the main process via WebSocket:
        ```typescript
        getAllSessions: (options) => Effect.tryPromise({
          try: () => sendDatabaseRequest('getAllSessions', options), // Ensure 'sendDatabaseRequest' handles options
          catch: (e) => new DatabaseError({ message: `WebSocket getAllSessions failed: ${e}`, cause: e })
        }),
        ```
    *   Ensure the `claude-bridge-service.js` (or equivalent WebSocket server in `main-claude-websocket.ts`) has a handler for the `'getAllSessions'` operation that calls the main process `DatabaseService.getAllSessions`.

4.  **Modify `src/helpers/ipc/db/db-context.ts` and `db-listeners.ts` (if still using direct IPC in addition to WebSocket):**
    *   Add a new channel `dbChannels.getAllSessions`.
    *   Expose `getAllSessions` in `db-context.ts`.
    *   Implement the handler in `db-listeners.ts` using `runDbEffect`.

**Task 2: Pane Store - Add "Previous Chats List" Pane Functionality**

1.  **Update `src/types/pane.ts`:**
    *   Add `"previous_chats_list"` to the `Pane['type']` union.

2.  **Update `src/stores/panes/constants.ts`:**
    *   Define constants for the new pane:
        ```typescript
        export const PREVIOUS_CHATS_PANE_ID = "previous_chats_list_pane";
        export const PREVIOUS_CHATS_PANE_TITLE = "Chat History";
        export const PREVIOUS_CHATS_PANE_DEFAULT_WIDTH = 300;
        export const PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT = 450;
        ```

3.  **Create `src/stores/panes/actions/openPreviousChatsPane.ts`:**
    *   Implement `openPreviousChatsPaneAction(set: SetPaneStore)`:
        *   Use `addPaneActionLogic` to open a new pane or focus an existing one.
        *   Pane details: `id: PREVIOUS_CHATS_PANE_ID`, `type: "previous_chats_list"`, `title: PREVIOUS_CHATS_PANE_TITLE`, `dismissable: true`. Use the defined width/height constants.
        *   Ensure it's tiled (pass `true` for `shouldTile` to `addPaneActionLogic`).

4.  **Update `src/stores/panes/actions/index.ts`:** Export `openPreviousChatsPaneAction`.
5.  **Update `src/stores/panes/types.ts`:** Add `openPreviousChatsPane: () => void;` to `PaneStoreType`.
6.  **Update `src/stores/pane.ts`:** Import and integrate `openPreviousChatsPaneAction`.

**Task 3: Create `PreviousChatsPane` UI Component**

1.  **Create Directory:** `src/components/previous_chats/`
2.  **Create File:** `src/components/previous_chats/PreviousChatsPane.tsx`
3.  **Implement the component:**
    *   Use `React Query` (`useQuery`) to fetch chat sessions from `DatabaseService.getAllSessions()`.
        *   Query key: `["allChatSessions"]`.
        *   `queryFn` should use `Effect.runPromise` with the `DatabaseService` from `getMainRuntime()`.
    *   Display a loading state while fetching.
    *   Display an error message if fetching fails, with a retry button (`refetch()`).
    *   If no sessions are found, display a "No chat history found." message.
    *   Render a list of sessions using `ScrollArea` and `Card` components.
        *   For each session, display:
            *   `session.title` (or a default like "Chat from [date]" if title is null/empty).
            *   `session.last_updated_at` (formatted nicely, e.g., "2 minutes ago", "Yesterday", "May 26, 2025").
            *   Optionally, `session.provider_key` or `session.model_name`.
    *   **Interaction:** When a session card is clicked:
        *   Call `usePaneStore.getState().openAgentChatPane()` with the following `PaneInput`:
            *   `id: \`agent_chat_session_${session.id}\`` (to make pane IDs unique per session).
            *   `type: "agent_chat"`.
            *   `title: session.title || \`Chat - ${session.id.substring(0, 6)}...\``.
            *   `content: { sessionId: session.id, sessionTitle: session.title }`.
            *   `dismissable: true`.
        *   Track this action with `TelemetryService`.
    *   Include telemetry for pane open.

**Task 4: Enhance `useAgentChat` Hook for Loading Chat History**

1.  **Modify `src/hooks/ai/useAgentChat.ts`:**
    *   Update `UseAgentChatOptions` to accept an optional `sessionId?: string`.
    *   Add a state variable `currentSessionId: string | null` and initialize it from `options.sessionId` or generate a new one for new chats.
    *   **`useEffect` for History Loading:**
        *   When `options.sessionId` is provided and changes (or on initial mount with `sessionId`):
            *   Set `isLoading(true)`.
            *   Fetch the `DBSession` using `DatabaseService.getSession(sessionId)`.
            *   Fetch all `DBMessage`s for this `sessionId` using `DatabaseService.getMessagesForSession(sessionId, limit: 500)`. // Consider a reasonable limit
            *   For each `DBMessage`:
                *   If `message.tool_calls_json` exists, fetch corresponding `DBToolExecution[]` using `DatabaseService.getToolCallsForMessage(message.id)`.
            *   **Map to `UIAgentChatMessage[]`:**
                *   `dbMsg.id` -> `uiMsg.id`
                *   `dbMsg.role` -> `uiMsg.role`
                *   `dbMsg.content` -> `uiMsg.content`
                *   `dbMsg.timestamp` (seconds from DB) -> `uiMsg.timestamp` (milliseconds for UI)
                *   Parse `dbMsg.tool_calls_json` into `uiMsg.tool_calls` (array of `ToolCall` from `src/services/ai/core/AgentChatMessage.ts`).
                *   If `DBToolExecution` records were fetched for a message, format their `result_json` and `status` to potentially augment the assistant message's content or create separate "tool" role messages for results. (The `ChatOrchestratorService` tool loop handles this for live calls; ensure consistency or decide how to best represent stored tool results).
                *   Parse `dbMsg.metadata_json` into `uiMsg.providerInfo` and `uiMsg.nip90EventData` if applicable.
            *   Prepend `systemMessageInstance` to the loaded messages.
            *   Update the `messages` state with the loaded history.
            *   Use `DBSession.provider_key` and `DBSession.model_name` to set the initial provider/model in `useAgentChatStore.setSelectedProviderKey()`.
            *   Set `isLoading(false)`.
            *   Handle errors and log with `TelemetryService`.
    *   **Saving New Messages:**
        *   In `sendMessage` function:
            *   If `currentSessionId` is `null` (a new chat):
                *   Generate a new `sessionId` (e.g., `generateId()` from `useAgentChat`).
                *   Call `DatabaseService.saveSession()` to create a new session entry in the DB. The session title can be derived from the first user message or set later.
                *   Set the local `currentSessionId` state.
            *   After a user message is added to UI state, save it to DB using `DatabaseService.saveMessage({ ..., session_id: currentSessionId, ... })`.
            *   After an assistant response (including any tool calls and results) is fully received and added to UI state:
                *   Save all new assistant and tool messages to DB using `DatabaseService.saveMessage()`.
                *   Ensure `tool_calls_json` is populated for assistant messages that requested tool calls.
                *   Save tool execution details using `DatabaseService.saveToolCall()` and `updateToolCallResult()`.
                *   Update the `DBSession.last_updated_at` for `currentSessionId` using `DatabaseService.updateSession()`.
    *   **`clearHistory` Function:**
        *   If `currentSessionId` exists, this function should now primarily clear the local `messages` state and set `currentSessionId` to `null` to start a fresh, unsaved chat. Deleting from DB should be a separate, explicit user action (not part of this hook's clear).

**Task 5: Update `AgentChatPane.tsx` to Use `sessionId`**

1.  **Modify `src/components/ai/AgentChatPane.tsx`:**
    *   Retrieve `sessionId` and `sessionTitle` from `pane.content` (passed by `PreviousChatsPane` when opening a thread).
    *   Pass the `sessionId` to the `useAgentChat` hook: `useAgentChat({ initialSystemMessage: "...", sessionId: pane.content?.sessionId })`.
    *   If `pane.content?.sessionTitle` is available, use it as the initial title for the pane (this might already be handled by `PaneManager` setting `pane.title`).
    *   The `AgentChatPane`'s `currentProviderKey` and `currentModelName` should reflect the loaded session's settings (which `useAgentChat` now handles by updating `useAgentChatStore`).

**Task 6: Pane Manager and UI Integration**

1.  **Modify `src/panes/PaneManager.tsx`:**
    *   Import `PreviousChatsPane` from `../components/previous_chats`.
    *   Add a new case to render `<PreviousChatsPane />` when `pane.type === 'previous_chats_list'`.
    *   Update the final fallback condition to include `'previous_chats_list'`.

2.  **Modify `src/components/hud/Hotbar.tsx`:**
    *   Add a new `HotbarItem` for "Chat History".
    *   Assign an available `slotNumber`.
    *   `onClick`: `usePaneStore.getState().openPreviousChatsPane()`.
    *   `title`: "Chat History".
    *   `isActive`: Check if `activePaneId === PREVIOUS_CHATS_PANE_ID`.
    *   Use an icon like `History` or `Archive` from `lucide-react`.

**Task 7: Testing**

1.  **Unit Tests for `DatabaseService.getAllSessions()`:**
    *   Verify it fetches and returns sessions correctly.
    *   Test sorting and pagination options.
2.  **Unit Tests for `PreviousChatsPane.tsx`:**
    *   Mock `DatabaseService.getAllSessions()` and `usePaneStore`.
    *   Test rendering of session list, loading state, error state.
    *   Verify `openAgentChatPane` is called with correct parameters on click.
3.  **Enhance Unit Tests for `useAgentChat.ts`:**
    *   Mock `DatabaseService` and `useAgentChatStore`.
    *   Test history loading logic:
        *   When `sessionId` is provided, verify messages are fetched and set.
        *   Verify tool calls are fetched and mapped.
        *   Verify provider/model from session is set in the store.
    *   Test message saving logic:
        *   For new chats, verify `saveSession` is called.
        *   Verify all new messages (user, assistant, tool) and tool executions are saved with the correct `sessionId`.
        *   Verify `updateSession` is called to update `last_updated_at`.
4.  **E2E Tests (Conceptual):**
    *   Create a few chat sessions.
    *   Open the "Chat History" pane.
    *   Verify sessions are listed.
    *   Click a session and verify the `AgentChatPane` opens with the correct messages and tool history.
    *   Send a new message in the loaded thread and verify it's added to the history (implicitly tests saving).

---

**Final Review Points for the Agent:**

*   **Data Mapping:** Pay close attention to mapping between `DBMessage`/`DBToolExecution` and `UIAgentChatMessage` (especially `timestamp` units and `tool_calls` structure).
*   **Error Handling:** Ensure robust error handling in all Effect-based operations and UI display of errors.
*   **State Consistency:** Confirm that the `useAgentChat` hook manages its internal state correctly whether starting a new chat or loading an existing one.
*   **Performance:** For `getAllSessions` and `getMessagesForSession`, consider default limits and potential for future pagination if performance becomes an issue with many threads/messages.
*   **Telemetry:** Add telemetry events for key actions (loading history, opening thread, saving messages, errors).

This implementation will allow users to access and continue their previous conversations seamlessly.
