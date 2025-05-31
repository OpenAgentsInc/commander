Okay, I will provide instructions to modify `HomePage.tsx` to implement the "Escape to close active pane" functionality.

**Instructions for the Coding Agent:**

1.  **Modify `src/pages/HomePage.tsx`:**

    - Ensure necessary imports are present:
      ```typescript
      import { usePaneStore } from "@/stores/pane";
      import { Effect } from "effect"; // Add Effect import
      import { getMainRuntime } from "@/services/runtime"; // Add getMainRuntime import
      import { TelemetryService } from "@/services/telemetry"; // Add TelemetryService import
      // Potentially Pane type if needed for type checking activePane object
      // import { Pane } from "@/types/pane";
      ```
    - Locate the `useEffect` hook that sets up the `handleGlobalKeyDown` event listener.
    - Modify the `handleGlobalKeyDown` function within this `useEffect`.
    - Add a new condition to check for the "Escape" key.
    - Implement the logic to close the active, dismissable pane, ensuring to check for focused input fields or dialogs first.

    **Updated `useEffect` in `src/pages/HomePage.tsx`:**

    ```typescript
    // ... other imports in HomePage.tsx
    import { usePaneStore } from "@/stores/pane";
    import { Effect } from "effect";
    import { getMainRuntime } from "@/services/runtime";
    import { TelemetryService } from "@/services/telemetry";
    // import { Pane } from "@/types/pane"; // If you need to type `activePane` explicitly

    // ... inside HomePage component ...

    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          const activeElement = document.activeElement as HTMLElement;
          // Check if an input, textarea, or dialog element has focus.
          // If so, let them handle the Escape key.
          if (
            activeElement &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" ||
              activeElement.closest('[role="dialog"]')) // Check if active element is inside a dialog
          ) {
            // If a dialog or input is active, it should handle Escape.
            // We do nothing here to allow default behavior or component-specific Escape handling.
            return;
          }

          // If no specific input/dialog is focused, proceed to check for active pane.
          const { activePaneId, panes, removePane } = usePaneStore.getState();

          if (activePaneId) {
            const activePane = panes.find((p) => p.id === activePaneId);
            // Ensure the pane exists and is dismissable (default true if undefined)
            if (activePane && activePane.dismissable !== false) {
              event.preventDefault(); // We are handling this Escape press.
              removePane(activePaneId);

              // Log telemetry
              const runtime = getMainRuntime();
              Effect.runFork(
                Effect.flatMap(TelemetryService, (ts) =>
                  ts.trackEvent({
                    category: "ui:pane",
                    action: "close_active_pane_escape",
                    label: activePane.title || activePane.id,
                  }),
                ).pipe(Effect.provide(runtime)),
              );
            }
          }
          return; // Explicitly return after handling Escape for panes
        }

        // Existing hotbar shortcut logic (Ctrl/Cmd + Digit)
        const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
        if (!modifier) return;

        const digit = parseInt(event.key);
        if (isNaN(digit) || digit < 1 || digit > 9) return;

        event.preventDefault();

        switch (digit) {
          case 1:
            toggleSellComputePane();
            break;
          case 2:
            toggleWalletPane();
            break;
          case 3:
            toggleDvmJobHistoryPane();
            break;
          case 4:
            toggleAgentChatPane();
            break;
          case 5:
            if (togglePreviousChatsPane) {
              // Check if the function is provided
              togglePreviousChatsPane();
            }
            break;
          // Slots 6, 7, 8 are empty for now
          case 9:
            toggleHandTracking();
            break;
        }
      };

      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => {
        window.removeEventListener("keydown", handleGlobalKeyDown);
      };
    }, [
      // Ensure all dependencies used by the hotkey toggles are here
      toggleSellComputePane,
      toggleWalletPane,
      toggleHandTracking,
      toggleDvmJobHistoryPane,
      toggleAgentChatPane,
      togglePreviousChatsPane, // Added to dependency array
      // Note: `removePane` from usePaneStore.getState() doesn't need to be a dep
      // as getState() always returns the latest store.
    ]);

    // ... rest of HomePage component ...
    ```

**Explanation of Changes:**

- **Imports:** Added `Effect`, `getMainRuntime`, and `TelemetryService`.
- **Escape Key Handling:**
  - A new `if (event.key === "Escape")` block is added at the beginning of `handleGlobalKeyDown`.
  - **Active Element Check:** It first checks if the currently focused element is an `INPUT`, `TEXTAREA`, or is within an element with `role="dialog"`. If so, it `return`s, allowing the focused element or dialog to handle the Escape key (e.g., unfocusing input, closing dialog).
  - **Pane Closing Logic:**
    - If no specific input/dialog is focused, it retrieves the `activePaneId`, `panes` array, and `removePane` action from `usePaneStore.getState()`.
    - If an `activePaneId` exists, it finds the corresponding pane object.
    - It checks if the `activePane` is `dismissable` (true by default if the property is undefined, or explicitly true).
    - If the pane is active and dismissable, `event.preventDefault()` is called to stop any further default browser behavior for Escape, and then `removePane(activePaneId)` is dispatched.
    - A telemetry event is logged for this action.
- **Dependency Array for `useEffect`:**
  - The dependencies related to the hotbar toggle functions are maintained. `togglePreviousChatsPane` was added as it's now used.
  - The pane closing logic uses `usePaneStore.getState()` within the event handler, which means it always accesses the latest store state and actions without needing them as direct reactive dependencies in the `useEffect` array for the handler itself.

This implementation should allow users to close the active, dismissable pane by pressing the "Escape" key, while respecting focused inputs and dialogs that might also use the Escape key.Okay, the user wants "escape" to close the active/top pane.

**Mental Sandbox/Pre-computation:**

1.  **Identify "active/top pane":** The `usePaneStore` likely has a concept of an `activePaneId`. The pane that is visually on top usually has the highest z-index and is considered active.
2.  **"Close" action:** The `usePaneStore` should have an action like `removePane(paneId)`.
3.  **Keyboard event listener:** This needs to be a global listener, probably in a top-level component like `HomePage.tsx` where the `PaneManager` is rendered.
4.  **"Escape" key:** The listener should check `event.key === "Escape"`.
5.  **Preventing conflicts:**
    - If an input field (e.g., chat input, form field) has focus, Escape should typically blur that field or be handled by the component, not close the pane.
    - If a modal dialog is open, Escape should close the dialog, not the underlying pane.
    - The global listener needs to be smart enough not to interfere with these. A common way is to check `document.activeElement`.
6.  **Dismissable panes:** Not all panes might be closable. The `Pane` type has `dismissable?: boolean`. The logic should respect this. If `dismissable` is `undefined`, it's likely true by default. So, we should close if `pane.dismissable !== false`.
7.  **Pane Store Interaction:**
    - Get `activePaneId` from `usePaneStore.getState()`.
    - Get `panes` array from `usePaneStore.getState()` to find the `activePane` object and check its `dismissable` property.
    - Call `usePaneStore.getState().removePane(activePaneId)`.
8.  **Telemetry:** Log when a pane is closed via Escape.

**File to Modify:** `src/pages/HomePage.tsx` seems like the best candidate as it already handles other global interactions (hand tracking, hotbar shortcuts via a global keydown listener).

**Detailed Plan:**

1.  **Locate `HomePage.tsx`**.
2.  **Imports:**
    - Ensure `usePaneStore` is imported.
    - Import `Effect`, `getMainRuntime`, `TelemetryService` for logging.
3.  **Modify the global `useEffect` for `keydown` events:**

    - Inside `handleGlobalKeyDown`:

      - Add an `if (event.key === "Escape") { ... }` block. This should probably be checked _before_ the modifier key checks for hotbar shortcuts.
      - **Active Element Check:**
        ```typescript
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.closest('[role="dialog"]')) // Checks if active element is inside a dialog
        ) {
          return; // Let the focused element or dialog handle Escape
        }
        ```
      - **Get Pane State and Action:**
        ```typescript
        const { activePaneId, panes, removePane } = usePaneStore.getState();
        ```
      - **Close Logic:**

        ```typescript
        if (activePaneId) {
          const activePane = panes.find((p) => p.id === activePaneId);
          if (activePane && activePane.dismissable !== false) {
            // Default dismissable=true
            event.preventDefault(); // We're handling it
            removePane(activePaneId);

            // Telemetry
            const runtime = getMainRuntime();
            Effect.runFork(
              Effect.flatMap(TelemetryService, (ts) =>
                ts.trackEvent({
                  category: "ui:pane",
                  action: "close_active_pane_escape",
                  label: activePane.title || activePane.id,
                }),
              ).pipe(Effect.provide(runtime)),
            );
          }
        }
        return; // Ensure Escape doesn't fall through to other key handlers
        ```

      - The existing hotbar logic (Ctrl/Cmd + Digit) should remain.

This plan seems robust. The active element check is crucial. The `usePaneStore.getState()` approach within the event handler avoids needing to pass store state/actions into the `useEffect` dependency array for this specific part, making it cleaner.

The `dismissable !== false` check correctly handles `undefined` as true.
The `removePane` action in the store already handles activating the next suitable pane.

One small thought: `HomePage.tsx` uses `useCallback` for `toggleHandTracking`. The `handleGlobalKeyDown` itself isn't wrapped in `useCallback` in the provided `HomePage.tsx`, but it's defined within the `useEffect`. This is fine. The dependencies of the `useEffect` are for the toggle functions used by the hotbar. Adding the Escape logic won't change these dependencies because the store access is via `getState()`.

The `PaneManager`'s `zIndex` logic (`baseZIndex + index`) where `panes` array is sorted by `isActive` should work correctly with this. When a pane is closed, the `panes` array in the store is updated, a new pane becomes active (and thus last in the sorted array for `PaneManager`), and the re-render will assign correct z-indices.

It might be slightly cleaner to have the Escape key logic check _after_ the modifier+digit check, just in case a modifier key is also pressed with Escape for some other system-level shortcut, though `event.preventDefault()` would typically stop that. However, Escape is usually a standalone key. Checking it first is probably fine and more direct.

Consider a case where a pane is open, but no element _inside_ it has focus (e.g., user clicked the HUD background). `document.activeElement` might be `document.body`. In this scenario, Escape _should_ close the active pane. The proposed active element check handles this correctly because `document.body` is not an INPUT, TEXTAREA, and not within a dialog.```markdown

# Instructions for Coding Agent: Implement "Escape to Close Active Pane"

**Goal:** Modify the application so that pressing the "Escape" key closes the currently active (topmost) pane, provided it's dismissable and no input field or dialog has focus.

**File to Modify:** `src/pages/HomePage.tsx`

**Detailed Steps:**

1.  **Ensure Necessary Imports in `src/pages/HomePage.tsx`:**
    Make sure the following imports are present at the top of the file:

    ```typescript
    import { usePaneStore } from "@/stores/pane";
    import { Effect } from "effect";
    import { getMainRuntime } from "@/services/runtime";
    import { TelemetryService } from "@/services/telemetry";
    // If you need to type the activePane object explicitly, you might also need:
    // import { Pane } from "@/types/pane";
    ```

2.  **Modify the `handleGlobalKeyDown` function within the `useEffect` hook:**
    Locate the `useEffect` hook that sets up the `handleGlobalKeyDown` event listener. You will add logic to this function to handle the "Escape" key.

    The updated `useEffect` hook should look like this:

    ```typescript
    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        // --- START: Escape Key Logic ---
        if (event.key === "Escape") {
          const activeElement = document.activeElement as HTMLElement;

          // Check if an input, textarea, or an element within a dialog has focus.
          // If so, let that element handle the Escape key (e.g., blur input, close dialog).
          if (
            activeElement &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" ||
              activeElement.closest('[role="dialog"]')) // Standard attribute for dialogs
          ) {
            // Do nothing here; let the focused element or dialog manage Escape.
            return;
          }

          // If no specific input/dialog is focused, proceed to check for an active pane.
          const { activePaneId, panes, removePane } = usePaneStore.getState();

          if (activePaneId) {
            const activePane = panes.find((p) => p.id === activePaneId);

            // Ensure the pane exists and is dismissable.
            // A pane is dismissable if `dismissable` is true or undefined.
            if (activePane && activePane.dismissable !== false) {
              event.preventDefault(); // We are handling this Escape press.
              removePane(activePaneId);

              // Log this action to telemetry
              const runtime = getMainRuntime();
              Effect.runFork(
                Effect.flatMap(TelemetryService, (ts) =>
                  ts.trackEvent({
                    category: "ui:pane",
                    action: "close_active_pane_escape",
                    label: activePane.title || activePane.id, // Use pane title or ID as label
                  }),
                ).pipe(Effect.provide(runtime)),
              );
            }
          }
          // If Escape was pressed but no suitable pane action was taken,
          // allow default browser behavior or other global handlers if any.
          return; // Explicitly return after handling Escape for panes
        }
        // --- END: Escape Key Logic ---

        // Existing hotbar shortcut logic (Ctrl/Cmd + Digit)
        const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
        if (!modifier) return;

        const digit = parseInt(event.key);
        if (isNaN(digit) || digit < 1 || digit > 9) return;

        event.preventDefault(); // Prevent default browser shortcuts for Ctrl/Cmd + Digit

        switch (digit) {
          case 1:
            toggleSellComputePane();
            break;
          case 2:
            toggleWalletPane();
            break;
          case 3:
            toggleDvmJobHistoryPane();
            break;
          case 4:
            toggleAgentChatPane();
            break;
          case 5:
            if (togglePreviousChatsPane) {
              togglePreviousChatsPane();
            }
            break;
          // Slots 6, 7, 8 are intended to be empty for now
          case 9:
            toggleHandTracking();
            break;
        }
      };

      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => {
        window.removeEventListener("keydown", handleGlobalKeyDown);
      };
    }, [
      // Ensure all dependencies used by the hotkey toggles are here.
      // The Escape key logic uses usePaneStore.getState() and getMainRuntime()
      // which are stable and don't need to be listed as dependencies here.
      toggleSellComputePane,
      toggleWalletPane,
      toggleHandTracking,
      toggleDvmJobHistoryPane,
      toggleAgentChatPane,
      togglePreviousChatsPane, // Ensure this is included if the hotbar action uses it
    ]);
    ```

**Explanation of Changes:**

- **Escape Key Detection:** The `if (event.key === "Escape")` block is added to specifically handle the Escape key.
- **Active Element Check:**
  - `document.activeElement` is checked.
  - If the active element is an `<input>`, `<textarea>`, or is a descendant of an element with `role="dialog"`, the function returns early. This allows these elements or dialogs to handle the Escape key press themselves (e.g., for closing a dialog, unfocusing an input).
- **Pane Closing Logic:**
  - If no input/dialog is determined to be the primary target for the Escape key, the code proceeds to get the `activePaneId`, `panes` array, and `removePane` action from the `usePaneStore`.
  - If an `activePaneId` exists, it finds the `activePane` object.
  - It then checks if `activePane.dismissable` is not explicitly `false` (meaning `true` or `undefined` panes are considered dismissable).
  - If the conditions are met, `event.preventDefault()` is called to stop any other default actions for the Escape key, `removePane(activePaneId)` is called to close the pane, and a telemetry event is logged.
- **Return Statement:** After the Escape key logic, `return;` is added to ensure that if the Escape key was processed (or intentionally ignored due to a focused input/dialog), it doesn't fall through to the hotbar shortcut logic.
- **Dependency Array of `useEffect`:** The dependencies for the `useEffect` hook are primarily for the hotbar toggle functions. The Escape key logic accesses the pane store state and actions via `usePaneStore.getState()`, which always provides the current state and stable action references, so `removePane` and other store state elements do not need to be added as direct dependencies for this specific logic. `getMainRuntime()` is also a stable function.

This implementation ensures that "Escape" provides an intuitive way to close the topmost interactive pane while respecting standard UI behaviors for inputs and dialogs.

```

```
