The problem is that `command+1` currently opens a new coder pane instead of toggling all existing coder panes closed. This is because the `toggleCoderPane` action in the `usePaneStore` is incorrectly wired to `openNewCoderPaneAction` which always creates a new pane.

We need to change it to use `toggleAllCoderPanesAction`, which has the desired behavior of closing all coder panes if any are open, or restoring/opening coder panes if none are open.

Here are the specific instructions to fix this:

1.  **Locate the main pane store file:**
    *   Open `src/stores/pane.ts`.

2.  **Modify the `toggleCoderPane` action definition:**
    *   Inside the `create<PaneStoreType>()(persist((set, get) => ({ ... })))` block, find the line defining `toggleCoderPane`.
    *   It currently looks like this:
        ```typescript
        toggleCoderPane: () => openNewCoderPaneAction(set, get),
        ```
    *   Change it to call `toggleAllCoderPanesAction` instead:
        ```typescript
        toggleCoderPane: () => toggleAllCoderPanesAction(set, get),
        ```

3.  **Ensure correct imports:**
    *   Make sure that `toggleAllCoderPanesAction` is imported from `./panes/actions`.
    *   The imports at the top of `src/stores/pane.ts` should include:
        ```typescript
        import {
          // ... other actions ...
          toggleAllCoderPanesAction, // Ensure this is imported
          // openNewCoderPaneAction, // This might still be needed if other parts of the code use it directly,
                                  // but it's not needed for toggleCoderPane anymore.
        } from "./panes/actions";
        ```
        If `openNewCoderPaneAction` is no longer used anywhere else directly by `usePaneStore` actions, you can remove its import here. However, keeping it won't harm if other parts of the code (not part of this fix) might still rely on it. The key is that `toggleCoderPane` now points to `toggleAllCoderPanesAction`.

**Summary of Changes in `src/stores/pane.ts`:**

**Before:**
```typescript
// src/stores/pane.ts
// ... other imports ...
import {
  // ...
  openNewCoderPaneAction, // Current import
} from "./panes/actions";
// ...

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      // ...
      toggleCoderPane: () => openNewCoderPaneAction(set, get), // <<< This line
      // ...
    }),
    // ...
  ),
);
```

**After:**
```typescript
// src/stores/pane.ts
// ... other imports ...
import {
  // ...
  toggleAllCoderPanesAction, // Import the correct action
  // openNewCoderPaneAction, // This can be removed if no longer used directly by other store actions
} from "./panes/actions";
// ...

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      // ...
      toggleCoderPane: () => toggleAllCoderPanesAction(set, get), // <<< Changed to use toggleAllCoderPanesAction
      // ...
    }),
    // ...
  ),
);
```

**Reasoning:**
The `HomePage.tsx` component maps the `Cmd+1`/`Ctrl+1` keyboard shortcut to the `toggleCoderPane` action from `usePaneStore`. The `openNewCoderPaneAction` was designed to always open a new pane, which is not the desired toggle behavior. The `toggleAllCoderPanesAction` correctly implements the logic to close all coder panes if any are open, and to restore/open them if none are open. By redirecting `toggleCoderPane` to use `toggleAllCoderPanesAction`, we align the `Cmd+1` shortcut with the intended "toggle all" functionality for coder panes. This change will also affect the "Coder Mode" button in the Hotbar (slot 1) if it's also wired to the same `toggleCoderPane` store action, ensuring consistent behavior.
