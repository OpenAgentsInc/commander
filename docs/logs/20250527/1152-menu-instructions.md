I want you to add a dropdown menu to panes, starting with the coder window.

Panes must have an optional menu.

The name of the pane must be in bold. To the right, non-bold, are text (no border, same fontsize) is any toplevel menu, and they expand like this:

https://ui.shadcn.com/docs/components/dropdown-menu

Do this: pnpm dlx shadcn@latest add dropdown-menu

The first menu for the coder window should be history. The list of chats that's currently in the chat history pane, I want the timestamps and first few letters of session id in one line each in the history menu, most recent at the top, max of 5.

Ensure all typechecks pass with "pnpm run t" and "pnpm test".

---

Here are the instructions for the agent to complete the dropdown menu feature:

**I. Finalize `Pane.tsx` Dropdown Menu Integration**

1.  **Locate `src/panes/Pane.tsx`.**
2.  **Define `renderDropdownItems` Helper:**
    *   Inside `Pane.tsx`, before the `Pane` component definition, (or in a separate utils file if preferred and imported), implement the `renderDropdownItems` helper function as shown in the previous (aborted) attempt. This function recursively builds `DropdownMenuItem`, `DropdownMenuSub`, `DropdownMenuSeparator`, `DropdownMenuLabel`, and `DropdownMenuGroup` components.
    *   Ensure `onClick` handlers for `DropdownMenuItem` call `e.stopPropagation()` to prevent pane drag/activation when a menu item is clicked. Also, use `onSelect={(e) => e.preventDefault()}` to prevent the menu from closing on item click if certain actions shouldn't close it (though for simple actions, `onClick` is usually fine and the menu will close by default).
    *   Wrap the content of `DropdownMenuContent` and `DropdownMenuSubContent` in a `<ScrollArea className="max-h-72">` (or a suitable max height) to handle potentially long menus.
3.  **Integrate Menus into Title Bar:**
    *   In the `Pane` component's JSX, locate the title bar `div` (the one with `className="pane-title-bar ..."`).
    *   Modify the structure to accommodate the title and the new menus. The layout should be: **Pane Title (bold)** then `headerMenus` (non-bold).
        ```jsx
        {/* Title Bar */}
        <div
          {...bindDrag()}
          className="pane-title-bar border-border/20 flex h-8 cursor-grab touch-none items-center justify-between border-b bg-black/80 px-3 py-1.5 font-mono text-white/90 select-none active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          {/* Container for title and menus */}
          <div className="flex items-center gap-x-2 overflow-hidden"> {/* Use gap-x-2 for spacing */}
            <span className="text-xs truncate font-bold">{title}</span> {/* Title is bold */}
            {/* Render Dropdown Menus */}
            {headerMenus && headerMenus.map(menu => (
              <DropdownMenu key={menu.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-xs px-1.5 py-0.5 hover:bg-white/10 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary text-gray-300" // Non-bold, same font size as title
                    onMouseDown={(e) => e.stopPropagation()} // Prevent pane drag when clicking menu trigger
                  >
                    {menu.triggerLabel}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 text-xs" onMouseDown={(e) => e.stopPropagation()}> {/* Adjust width as needed */}
                  <ScrollArea className="max-h-72">
                    {renderDropdownItems(menu.items, menu.id)}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
          {/* Existing close button and titleBarButtons */}
          <div className="title-bar-button-container flex items-center space-x-1">
            {titleBarButtons}
            {dismissable && (
              <button
                onClick={handleClose}
                onMouseDown={(e) => e.stopPropagation()}
                className="hover:text-destructive ml-1 rounded p-0.5 text-white/70 hover:bg-white/10 focus:outline-none"
                aria-label="Close pane"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>
        ```
    *   **Styling Notes:**
        *   The pane `title` should be `font-bold`.
        *   The `DropdownMenuTrigger` (displaying `menu.triggerLabel`) should be non-bold, same font size (ensure `text-xs`).
        *   Apply `px-1.5 py-0.5` or similar padding to the menu trigger buttons for a compact look.
        *   Add `onMouseDown={(e) => e.stopPropagation()}` to `DropdownMenuTrigger`'s button and `DropdownMenuContent` to prevent pane dragging or activation when interacting with the menu.

**II. Implement History Menu for `CoderPane`**

1.  **Locate `src/components/coder/CoderPane.tsx`.**
2.  **Import Necessary Components & Hooks:**
    *   Import `DropdownMenu` and related components from `@/components/ui/dropdown-menu`.
    *   Import `PaneHeaderMenu`, `PaneDropdownItem`, `PaneDropdownItemAction` from `@/types/paneMenu`.
    *   Import `DatabaseService`, `DBSession` from `@/services/db`.
    *   Import `useQuery` from `@tanstack/react-query`.
    *   Import `ScrollArea` from `@/components/ui/scroll-area`.
    *   Import `getMainRuntime` and `TelemetryService`.
    *   Import `Effect`, `Exit`, `Cause`.
3.  **Refactor `CoderPane`'s Title Bar:**
    *   The `CoderPane` currently has a simple top bar for an "Edit" button. This needs to be replaced with a structure similar to `Pane.tsx`'s title bar to consistently display the **Pane Title (bold)** and then the menu triggers (non-bold).
    *   The "New Chat" button should be moved to this new title bar, likely to the right side, similar to where the close button is in `Pane.tsx`.
4.  **Fetch Chat History for Menu:**
    *   Inside the `CoderPane` component, use `useQuery` to fetch the last 5 chat sessions.
        ```typescript
        const runtime = getMainRuntime(); // Ensure runtime is available

        const { data: chatHistorySessions, refetch: refetchHistory } = useQuery<DBSession[], Error>({
          queryKey: ["allChatSessionsForCoderMenu"], // Unique query key
          queryFn: async () => {
            const dbProgram = Effect.flatMap(DatabaseService, (db) =>
              db.getAllSessions({ sortBy: "last_updated_at", sortOrder: "DESC", limit: 5 }),
            );
            const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));
            if (Exit.isSuccess(exitResult)) return exitResult.value;
            console.error("Failed to fetch chat history for menu:", Cause.pretty(exitResult.cause));
            throw Cause.squash(exitResult.cause);
          },
          staleTime: 1000 * 60, // Cache for 1 minute to avoid excessive fetching
        });
        ```
5.  **Manage Menu Open State for Refetching:**
    *   Add a local state variable: `const [historyMenuOpen, setHistoryMenuOpen] = useState(false);`
    *   Use an `useEffect` to call `refetchHistory()` when `historyMenuOpen` becomes true.
6.  **Format History Data & Define Menu Structure:**
    *   Use `React.useMemo` to create the `historyMenuItems` array.
    *   Format each session: Display timestamp (e.g., `YYYY-MM-DD HH:MM`) and the first few characters of the session ID.
    *   Each menu item should be a `PaneDropdownItemAction`. For now, the `action` can simply log to the console.
        ```typescript
        const formatSessionForMenu = (session: DBSession): string => {
          const date = new Date(session.last_updated_at * 1000); // Assuming timestamp is in seconds
          const dateStr = date.toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' });
          const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const idPrefix = session.id.substring(0, 8); // Show first 8 chars of session ID
          return `${dateStr} ${timeStr} | ${idPrefix}...`;
        };

        const historyMenuItems: PaneDropdownItem[] = useMemo(() => {
          if (!chatHistorySessions || chatHistorySessions.length === 0) {
            return [{ label: "No recent chats", action: () => {}, disabled: true }];
          }
          return chatHistorySessions.map(session => ({
            label: formatSessionForMenu(session),
            action: () => {
              console.log("Load chat session:", session.id);
              // TODO: Implement logic to load this session into CoderPane
              // This might involve updating sessionIdRef.current and clearing/refetching messages.
              Effect.runFork(
                Effect.flatMap(TelemetryService, (ts) =>
                  ts.trackEvent({
                    category: 'coder_mode',
                    action: 'history_menu_item_click',
                    label: session.id,
                  }),
                ).pipe(Effect.provide(runtime)),
              );
            },
          }));
        }, [chatHistorySessions, runtime /*, other deps like clearMessages */]);
        ```
    *   Define the `coderHeaderMenus` array:
        ```typescript
        const coderHeaderMenus: PaneHeaderMenu[] = [
          {
            id: "coderHistoryMenu",
            triggerLabel: "History",
            items: historyMenuItems,
          },
          // Future menus can be added here
        ];
        ```
7.  **Render the Dropdown Menu in `CoderPane`'s Title Bar:**
    *   Similar to `Pane.tsx`, iterate over `coderHeaderMenus` and render `DropdownMenu` components.
    *   Use the `renderDropdownItems` helper (can be a simplified version local to `CoderPane` or imported if made generic enough).
    *   Pass `onOpenChange={(open) => { if (menu.id === 'coderHistoryMenu') setHistoryMenuOpen(open); }}` to the `DropdownMenu` component for the "History" menu to trigger refetch.
    *   The `CoderPane`'s title should be "Coder" (bold). The menu trigger "History" should be non-bold.

**III. Update `PaneManager.tsx`**

1.  **Locate `src/panes/PaneManager.tsx`.**
2.  **Pass `headerMenus` Prop:**
    *   When mapping over `panes` and rendering `PaneComponent`, ensure the `headerMenus` property from the `pane` object is passed to the `PaneComponent`.
        ```jsx
        // Inside PaneManager's map function
        <PaneComponent
          key={pane.id}
          // ... other props
          headerMenus={pane.headerMenus} // Pass this through
          // ... rest of props and children
        >
          {/* ... content rendering ... */}
        </PaneComponent>
        ```

**IV. Update Pane Store Logic**

1.  **Locate `src/stores/panes/actions/addPane.ts` (and `addPaneActionLogic` helper).**
    *   Modify `addPaneActionLogic` to include `headerMenus` in the `newPane` object being created. It should take `headerMenus` from `newPaneInput` or default to `undefined` or an empty array.
        ```typescript
        // Inside addPaneActionLogic in addPane.ts
        const newPane: Pane = ensurePaneIsVisible({
          // ... other properties ...
          headerMenus: newPaneInput.headerMenus || [], // Default to empty array
        });
        ```
2.  **Locate Coder Pane Creation/Toggle Logic:**
    *   This is likely in `src/stores/pane.ts` within the `toggleCoderPane` action, or if `CoderPane` is opened via a generic `addPane` call, the logic would be where `PaneInput` for the coder pane is defined.
    *   When the `coder` pane is created, its `PaneInput` should include the `headerMenus` property.
    *   **Example (if `toggleCoderPane` creates the pane):**
        ```typescript
        // Inside toggleCoderPane in src/stores/pane.ts
        // ...
        const newPaneInput: PaneInput = {
          id: paneId,
          type: "coder",
          title: CODER_PANE_TITLE,
          // ... other properties like x, y, width, height ...
          headerMenus: [], // Initially empty, CoderPane itself will populate it dynamically for now
          content: { sessionId },
        };
        // ...
        ```
        *Self-correction for CoderPane*: The `CoderPane` itself will define and manage its `coderHeaderMenus` internally based on its own state/data (like chat history). The store only needs to know that a `Pane` *can* have `headerMenus`. The `PaneComponent` will render whatever `headerMenus` are passed to it. So, for `CoderPane`, we might not pass `headerMenus` from the store action. The menus will be part of `CoderPane`'s internal JSX structure that's passed as `children` to a generic `PaneComponent`, or `CoderPane` itself will *be* the top-level pane component that includes a `<PaneComponent>` internally.

        Revisiting `CoderPane.tsx`: `CoderPane` is the top-level component for its content. It should use the `Pane` component as its wrapper if we want the standard pane chrome (drag, resize, standard title bar layout).
        Alternatively, if `CoderPane` *is* the pane itself (meaning it directly implements the draggable/resizable frame), then it would directly use the `DropdownMenu` components in its custom title bar.

        Given the request "add a dropdown menu to panes, *starting with the coder window*", it's more consistent if `CoderPane`'s content is wrapped by the generic `Pane` component, and `PaneManager` passes `headerMenus` to it.

        So, the `PaneInput` for `CoderPane` in the store action (`toggleCoderPaneAction`) should define its `headerMenus`.
        ```typescript
        // In src/stores/pane.ts, within toggleCoderPaneAction, when creating a new Coder pane:
        const newPaneInput: PaneInput = {
          id: paneId,
          type: "coder", // This type will be used by PaneManager to render CoderPane as children
          title: CODER_PANE_TITLE,
          // ... position/size ...
          headerMenus: [ // Define the top-level menus for CoderPane here
            // The actual items for "History" will be dynamically generated by CoderPane itself.
            // This is a slight architectural challenge: Pane.tsx expects static menu definitions.
            // For dynamic menus like history, CoderPane itself will render the DropdownMenu.
            // So, Pane.tsx's headerMenus might be for static menus,
            // and CoderPane will add its own dynamic ones in its title bar area.
            //
            // Let's adjust: Pane.tsx will render menus passed via `headerMenus`.
            // CoderPane will have its own title bar section where it can render *additional* dynamic menus.
            // This means the "Pane Title (bold)" and "menu triggers (non-bold)" styling applies to BOTH.
            // For this iteration, CoderPane will manage its own menus in its title bar.
            // The generic `Pane` component will have `titleBarButtons` for additional controls,
            // and a separate `headerMenus` for static menus defined at pane creation.
            //
            // **Revised approach for CoderPane specific menu:**
            // CoderPane will NOT use the generic `headerMenus` prop of `PaneComponent`.
            // Instead, it will render its own DropdownMenu components within its *own* title bar area.
            // The generic `PaneComponent` will be adjusted to allow content to be passed into its title bar.

            // Let's make `titleBarButtons` in `Pane.tsx` more flexible to accept menus.
            // The `Pane` component's title bar can have a structure:
            // [ Draggable Title (Bold) ] [ Static Menus (from headerMenus prop) ] [ Custom Buttons (from titleBarButtons prop) ] [ Close Button ]

            // For CoderPane's specific history menu, it will be rendered by CoderPane itself.
            // This means CoderPane needs its *own* title bar logic if it's not using PaneComponent's title bar.
            // The request implies the CoderPane *is* a pane, so it should use PaneComponent.
            //
            // Okay, the most straightforward way:
            // 1. PaneManager passes `pane.headerMenus` to `PaneComponent`.
            // 2. If `CoderPane` itself needs dynamic menus, it should manage that within its own content,
            //    or we pass a function to `PaneComponent` that renders the menu content dynamically.
            //
            // Let's stick to the first approach: The `CoderPane` component itself, when rendered by `PaneManager`,
            // will be responsible for constructing its `PaneHeaderMenu[]` structure and passing it up
            // or the `PaneManager` will construct it based on `pane.type === 'coder'`.
            // The latter is cleaner for `PaneManager`.
            //
            // For now, CoderPane will implement its own title bar and menu logic directly, as it's a special full-pane UI.
            // The instructions for `Pane.tsx` are for generic panes.
            // CoderPane is a *pane type*, its content is `CoderPane.tsx`.
            // The request is to add a menu to CoderPane.
            // CoderPane *is* the pane.
          ],
          content: { sessionId },
        };
        ```
        **Correction based on thinking:** `CoderPane.tsx` itself is the content of a generic pane of `type: "coder"`. The menus should be part of the generic `Pane` component's title bar. So, `PaneManager` should construct the `headerMenus` for the "coder" type pane.

        Modify `src/stores/panes/actions/addPane.ts` (`addPaneActionLogic`):
        If `newPaneInput.type === 'coder'`, then dynamically add the history menu structure to `newPane.headerMenus`.
        This is not ideal as actions should be simple. It's better if `CoderPane` component provides its menu configuration.

        **Alternative: CoderPane as a special case (Not using generic `Pane` wrapper)**
        The previous log `0047-coder-setup-log.md` implies `CoderView.tsx` (now `CoderPane.tsx`) is a top-level view for the `/coder` route, replacing `HomePage`. If this is the case, it doesn't use the generic `Pane.tsx` wrapper. My implementation for `CoderPane` will directly include the title bar and menu.

        **Reconciliation:** The prompt implies `CoderPane` is a "pane" like others, and that *panes* (generic) get optional menus. The current `CoderPane` uses `Pane.tsx` as a wrapper.
        So, the `PaneInput` in `toggleCoderPane` in `pane.ts` should define the `headerMenus`.

        Update `src/stores/pane.ts` for `toggleCoderPaneAction`:
        ```typescript
        // In src/stores/pane.ts -> toggleCoderPane function (when creating a new pane)
        // ...
        const newPaneInput: PaneInput = {
          id: paneId,
          type: "coder",
          title: CODER_PANE_TITLE, // This will be bold
          headerMenus: [ // These will be non-bold triggers
            {
              id: "coderHistoryMenu",
              triggerLabel: "History",
              items: [] // CoderPane component will populate this dynamically via a callback or context
            }
          ],
          // ... other properties ...
          content: { sessionId },
        };
        // ...
        ```
        This means `PaneComponent` needs a way to allow its children (like `CoderPane`) to provide the *items* for a pre-defined menu trigger. This is getting complex.

        **Simpler approach for dynamic menu items:**
        The menu *items* are defined by the component that *knows* about the data (e.g., `CoderPane` knows about chat history).
        `PaneManager.tsx` will be responsible for constructing the `headerMenus` array for each pane based on its type.

**V. Update `PaneManager.tsx` to Construct Menus**

1.  **Locate `src/panes/PaneManager.tsx`.**
2.  **Import `useQuery`, `DatabaseService`, etc. for history fetching.** (Or, preferably, `CoderPane` fetches its own history and the menu simply triggers an action in `CoderPane`).

    Let's assume `CoderPane` will handle its own history logic and menu item actions. The `PaneManager` just needs to know to *show* a "History" menu trigger for coder panes. The *action* of the menu items will be handled within `CoderPane`.

    This requires a way for `PaneComponent` to delegate menu item actions. This is best done by passing callbacks from `PaneManager` (or the content component) into `PaneComponent`.

    Revised strategy:
    -   `PaneHeaderMenu.items` can contain `PaneDropdownItemAction` where `action` is a function.
    -   `PaneManager` will be responsible for defining the static structure of menus for each pane type, including `triggerLabel` and the `label` for action items.
    -   The actual `action` function for dynamic items like history will be wired up in `PaneManager` by calling a method exposed by the specific content component (e.g., `CoderPane`). This is complex due to component boundaries.

    **Simplest for now:** `CoderPane` will render its own dropdown menu in its title bar area, if `Pane.tsx` provides a slot for such custom title bar content.

    **Revised `Pane.tsx` for title bar flexibility:**
    - Add a new prop to `PaneProps`: `renderCustomTitleContent?: () => React.ReactNode;`
    - In `Pane.tsx`'s title bar JSX:
      ```jsx
      <div className="flex items-center gap-x-2 overflow-hidden">
        <span className="text-xs truncate font-bold">{title}</span>
        {/* Render static menus from headerMenus prop */}
        {headerMenus && headerMenus.map(menu => ( /* ... as before ... */ ))}
        {/* Slot for custom content rendered by the pane's main child */}
        {renderCustomTitleContent && renderCustomTitleContent()}
      </div>
      ```

    **Update `PaneManager.tsx`:**
    - For `type: "coder"`, pass a `renderCustomTitleContent` prop to `PaneComponent`.
      ```jsx
      // Inside PaneManager, when rendering CoderPane
      {pane.type === "coder" && (
        <PaneComponent /* ... other props ... */
          renderCustomTitleContent={() => {
            // This function will be called by PaneComponent.
            // It needs access to CoderPane's state/logic for history.
            // This implies CoderPane needs to be instantiated here to get its historyMenu.
            // This is not ideal.
            //
            // Alternative: CoderPane provides its menu configuration as a prop to Pane,
            // and PaneManager merges it or Pane passes it down.
            // Let's assume CoderPane provides its menu structure directly.
            // For this pass, `CoderPane` will render its title bar content itself, including menus.
            // So, the `Pane` component's title bar will not be used by `CoderPane`.
            // `CoderPane` will just be a child that fills the `Pane` content area.
            //
            // For the initial request: "add a dropdown menu to panes, starting with the coder window."
            // The CoderPane needs to be *a pane* and have a menu.
            // The most direct way is for `CoderPane` to *use* `Pane` component and pass its `headerMenus`.
            // This means `CoderPane.tsx` itself will define its history menu structure and pass it to `Pane` wrapper.

            // Let's simplify: PaneManager will define the menus for each pane type.
            // CoderPane will receive actions as props for its menu items.

            // In PaneManager.tsx
            let dynamicHeaderMenus: PaneHeaderMenu[] | undefined = pane.headerMenus;
            if (pane.type === 'coder') {
              // Here we'd fetch history or get it from a store accessible by PaneManager
              // and construct the historyMenuItems.
              // This is not ideal as PaneManager shouldn't know CoderPane's specifics.
              //
              // Decision: CoderPane *is* the full component, it does not get wrapped by generic Pane.
              // It will implement its own title bar.
              // NO, this contradicts "Panes must have an optional menu".
              // CoderPane is content for a generic Pane.
              //
              // Correct Approach:
              // PaneManager will define the *structure* of the menu for 'coder' pane.
              // CoderPane will provide the *dynamic items* and *actions* for that menu structure.
              // This requires callback props.
            }
            // ... pass dynamicHeaderMenus to PaneComponent ...
          }}
        >
          <CoderPane sessionId={pane.content?.sessionId as string | undefined} />
        </PaneComponent>
      )}
      ```
    This coupling in `PaneManager` is not ideal.

    **Final simpler approach for dynamic items (as done in the full `CoderPane.tsx` example I generated before you stopped me):**
    1.  `CoderPane.tsx` (the content component) fetches its own data (e.g., history).
    2.  `CoderPane.tsx` renders its own `DropdownMenu` components in its layout, typically in a header/toolbar section it defines itself.
    3.  The generic `Pane.tsx` component, when used to wrap `CoderPane`, will simply provide the frame, drag/resize, and its *own* optional static `headerMenus` if defined for that pane instance.
    4.  The `title` prop of `Pane` will be bold. Any menu triggers rendered *by `CoderPane` itself* within its own header area will be non-bold.

    This means the original `CoderPane.tsx` I was generating was on the right track, where it defines its own header area with the "Coder" title and "History" dropdown.

    Let's proceed with instructions for `CoderPane.tsx` to manage its own history menu in its own header.

**VI. Implement History Menu Directly in `CoderPane.tsx`**

1.  **Locate `src/components/coder/CoderPane.tsx`.**
2.  **Add Imports:**
    *   `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `ScrollArea`.
    *   `DatabaseService`, `DBSession`, `useQuery`, `Effect`, `Exit`, `Cause`, `getMainRuntime`, `TelemetryService`.
3.  **Fetch History Data:**
    *   Use `useQuery` as shown in step II.4 to fetch `chatHistorySessions`.
    *   Manage `historyMenuOpen` state and refetch as in step II.5.
4.  **Format History Items:**
    *   Implement `formatSessionForMenu` as in step II.6.
    *   Create `historyMenuItems` using `useMemo` as in step II.6. The `action` for each item should:
        *   Set `sessionIdRef.current` to the selected session's ID.
        *   Call `clearMessages()` from `useCoderChatStore`.
        *   Add a system message like "Switched to session... (History loading not implemented for CoderPane)".
        *   Log telemetry.
5.  **Render `CoderPane` Title Bar with Menu:**
    *   Modify the `CoderPane`'s top-level JSX. It should have a title bar div.
        ```jsx
        <div className="h-full w-full flex flex-col bg-black relative">
          {/* Title Bar for Coder Pane */}
          <div className="flex-shrink-0 h-10 px-3 bg-black border-b border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-x-2"> {/* Container for title and menus */}
              <span className="text-sm font-bold text-white">Coder</span> {/* Bold Title */}
              {/* History Dropdown Menu */}
              <DropdownMenu onOpenChange={setHistoryMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-sm px-2 py-1 hover:bg-gray-700 rounded-sm focus:outline-none text-gray-300"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    History {/* Non-bold menu trigger */}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 text-xs" onMouseDown={(e) => e.stopPropagation()}>
                  <ScrollArea className="max-h-72">
                    {historyMenuItems.length > 0 ? (
                      historyMenuItems.map((item, index) => (
                        <DropdownMenuItem
                          key={`${(item as PaneDropdownItemAction).label}-${index}`}
                          onClick={(e) => { e.stopPropagation(); (item as PaneDropdownItemAction).action(); }}
                          disabled={(item as PaneDropdownItemAction).disabled}
                          className="text-xs"
                          onSelect={(e) => e.preventDefault()}
                        >
                          {(item as PaneDropdownItemAction).label}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="text-xs">No recent chats</DropdownMenuItem>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* New Chat Button */}
            <div className="flex items-center gap-x-2">
              <Button
                onClick={handleNewChat}
                variant="outline"
                size="sm"
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors h-7 px-2 text-xs"
                title="Start new chat session"
              >
                <MessageSquarePlus className="h-3 w-3 mr-1.5" />
                New Chat
              </Button>
            </div>
          </div>
          {/* ... rest of CoderPane (chat messages, ProseMirror editor) ... */}
        </div>
        ```
    *   Ensure the "Coder" title is bold.
    *   The "History" menu trigger should be non-bold and visually distinct but integrated.

**VII. Update `PaneManager.tsx` to Pass `headerMenus` (for other panes in the future)**

1.  **Locate `src/panes/PaneManager.tsx`.**
2.  When rendering `PaneComponent`, ensure you pass `pane.headerMenus` if that pane object has them defined in the store.
    ```jsx
    // Example within PaneManager's map:
    <PaneComponent
      key={pane.id}
      // ... other props ...
      headerMenus={pane.headerMenus} // Pass this through
    >
      {/* ... content ... */}
    </PaneComponent>
    ```
    *Note: For `CoderPane` specifically, if its `headerMenus` are defined in the `usePaneStore` action for `toggleCoderPane`, this will make them available to the generic `PaneComponent` wrapper. If `CoderPane` renders its own title bar and menus (as per instruction VI), this specific part for `CoderPane` might not be strictly necessary for its *own* menus, but is good for generic pane menu support.*

**VIII. Testing and Verification**

1.  Run `pnpm run t` to ensure all type checks pass.
2.  Run `pnpm test` to ensure existing tests pass.
3.  **Manually verify:**
    *   Open the Coder Pane.
    *   The title "Coder" should be bold.
    *   To its right, "History" should appear as a non-bold, clickable menu trigger.
    *   Clicking "History" should open a dropdown.
    *   The dropdown should list up to 5 recent chat sessions, formatted as "YY-MM-DD HH:MM | sess_id...".
    *   The most recent session should be at the top.
    *   Clicking a history item should log to the console and update the `CoderPane`'s current session (for now, by clearing messages and showing a system message).
    *   Ensure the menu trigger and items do not cause the pane to drag or lose focus unexpectedly.
    *   If the menu is long, it should be scrollable.

This set of instructions focuses on adding the menu directly within `CoderPane` for its specific history feature, and ensures the generic `Pane` component can support `headerMenus` passed from the store for other pane types in the future. This avoids overly complex prop-drilling or context for dynamic menu item generation within the generic `Pane` component.
