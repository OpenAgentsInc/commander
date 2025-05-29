Okay, the issue is that the `closedPanePositions` in your Zustand store (`usePaneStore`) is accumulating entries without a proper eviction strategy, leading to an excessive number of keys being stored. We need to implement a Most Recently Used (MRU) or fixed-limit eviction for these stored pane positions.

Here are the instructions for the coding agent:

**Objective:**
Refactor the pane store to limit the number of closed pane positions it remembers, preventing unbounded growth of the `closedPanePositions` state. We'll implement a Most Recently Used (MRU) strategy with a fixed limit.

**Constants:**
- Define a new constant `MAX_CLOSED_PANES_TO_STORE` (e.g., 20) in `src/stores/panes/constants.ts`.

**Step 1: Update Store State Definition**

*   **File:** `src/stores/panes/types.ts`
*   **Action:** Modify the `PaneState` interface to include an ordered list of closed pane IDs.
    ```typescript
    // src/stores/panes/types.ts
    export interface PaneState {
      panes: Pane[];
      activePaneId: string | null;
      lastPanePosition: { /* ... */ } | null;
      closedPanePositions: Record<string, {
        x: number;
        y: number;
        width: number;
        height: number;
        content?: any;
        shouldRestore?: boolean; // This flag might be re-evaluated with MRU
      }>;
    + closedPaneOrder: string[]; // Array to store pane IDs in MRU order (most recent at the end)
    }

    // ... (PaneStoreType remains the same, but will now include closedPaneOrder via PaneState)
    ```

**Step 2: Update Initial State and Persistence in Main Store**

*   **File:** `src/stores/pane.ts`
*   **Action:**
    1.  Add `closedPaneOrder: []` to `initialState`.
    2.  Update the `persist` middleware's `partialize` function to include `closedPaneOrder`.
    3.  Update the `persist` middleware's `merge` function to correctly rehydrate `closedPaneOrder`, ensuring it's an array.

    ```typescript
    // src/stores/pane.ts
    // ...
    import { MAX_CLOSED_PANES_TO_STORE } from "./panes/constants"; // Import the new constant

    const initialState: PaneState = {
      panes: getInitialPanes(),
      activePaneId: null,
      lastPanePosition: null,
      closedPanePositions: {},
    + closedPaneOrder: [], // Initialize as empty array
    };

    export const usePaneStore = create<PaneStoreType>()(
      persist(
        (set, get) => ({
          // ... (existing actions and state) ...
          resetHUDState: () => {
            // ... (existing reset logic) ...
            set({
              // ...
              closedPanePositions: {}, // Also reset closed positions
            + closedPaneOrder: [],     // And the order
            });
          },
        }),
        {
          name: "commander-pane-storage-v5",
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            panes: state.panes,
            lastPanePosition: state.lastPanePosition,
            activePaneId: state.activePaneId,
            closedPanePositions: state.closedPanePositions,
          + closedPaneOrder: state.closedPaneOrder, // Persist the order
          }),
          merge: (persistedState, currentState) => {
            const merged = {
              ...currentState,
              ...(persistedState as Partial<PaneState>),
            };
            // ... (existing checks for panes, closedPanePositions) ...
          + if (!Array.isArray(merged.closedPaneOrder)) {
          +   merged.closedPaneOrder = [];
          + }
            // Ensure persisted closedPaneOrder and closedPanePositions are consistent
          + const validClosedPaneOrder: string[] = [];
          + const validClosedPanePositions: Record<string, any> = {};
          + merged.closedPaneOrder.forEach(paneId => {
          +   if (merged.closedPanePositions && merged.closedPanePositions[paneId]) {
          +     validClosedPaneOrder.push(paneId);
          +     validClosedPanePositions[paneId] = merged.closedPanePositions[paneId];
          +   }
          + });
          + merged.closedPaneOrder = validClosedPaneOrder.slice(-MAX_CLOSED_PANES_TO_STORE); // Apply limit on rehydrate
          + merged.closedPanePositions = validClosedPanePositions;

            return merged;
          },
        },
      ),
    );
    ```

**Step 3: Implement MRU Logic in `removePaneAction`**

*   **File:** `src/stores/panes/actions/removePane.ts`
*   **Rationale:** When a pane is removed (closed via 'X'), its position should be added to `closedPanePositions` and `closedPaneOrder` following MRU logic. If the store limit is exceeded, the least recently closed pane's data is evicted.
*   **Action:** Modify the action to update `closedPaneOrder` and manage the size of `closedPanePositions`.

    ```typescript
    // src/stores/panes/actions/removePane.ts
    import { PaneStoreType } from "../types";
    import { MAX_CLOSED_PANES_TO_STORE } from "../constants"; // Import the limit

    export function removePaneAction(set: any, id: string) {
      set((state: PaneStoreType) => {
        const paneToRemove = state.panes.find((pane) => pane.id === id);
        const remainingPanes = state.panes.filter((pane) => pane.id !== id);
        // ... (logic for newActivePaneId and finalPanes remains the same) ...
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
      + let updatedClosedPaneOrder = [...state.closedPaneOrder];

        if (paneToRemove) {
        + // Remove if already exists in order, to move it to the end (most recent)
        + updatedClosedPaneOrder = updatedClosedPaneOrder.filter(paneId => paneId !== id);
        + updatedClosedPaneOrder.push(id); // Add to end (most recent)

          updatedClosedPanePositions[id] = {
            x: paneToRemove.x,
            y: paneToRemove.y,
            width: paneToRemove.width,
            height: paneToRemove.height,
            content: paneToRemove.content,
          + shouldRestore: true, // Explicitly mark as restorable when closed by 'X'
          };

          // Enforce limit
        + if (updatedClosedPaneOrder.length > MAX_CLOSED_PANES_TO_STORE) {
        +   const paneIdToRemove = updatedClosedPaneOrder.shift(); // Remove oldest from start of array
        +   if (paneIdToRemove) {
        +     delete updatedClosedPanePositions[paneIdToRemove];
        +     console.log(`[PaneStore] Evicted ${paneIdToRemove} from closedPanePositions (limit: ${MAX_CLOSED_PANES_TO_STORE})`);
        +   }
        + }
        }

        return {
          panes: finalPanes,
          activePaneId: newActivePaneId,
          closedPanePositions: updatedClosedPanePositions,
        + closedPaneOrder: updatedClosedPaneOrder,
        };
      });
    }
    ```

**Step 4: Implement MRU Logic in `toggleAllCoderPanesAction` (Hiding Part)**

*   **File:** `src/stores/panes/actions/toggleAllCoderPanes.ts`
*   **Rationale:** Similar to `removePaneAction`, when coder panes are hidden by the toggle, their positions need to be managed with the MRU strategy.
*   **Action:** Update the hiding logic.

    ```typescript
    // src/stores/panes/actions/toggleAllCoderPanes.ts
    // ...
    import { MAX_CLOSED_PANES_TO_STORE } from "../constants"; // Import the limit

    // Inside the `if (visibleCoderPanes.length > 0)` block (hiding logic):
    const updatedClosedPanePositions = { ...state.closedPanePositions };
  + let updatedClosedPaneOrder = [...state.closedPaneOrder];

    visibleCoderPanes.forEach(pane => {
      console.log(`[coder_pa toggleAllCoderPanes] Saving pane ${pane.id} to closedPanePositions with content:`, pane.content);

    + // MRU logic: Remove if exists, then add to end
    + updatedClosedPaneOrder = updatedClosedPaneOrder.filter(paneId => paneId !== pane.id);
    + updatedClosedPaneOrder.push(pane.id);

      updatedClosedPanePositions[pane.id] = {
        x: pane.x,
        y: pane.y,
        width: pane.width,
        height: pane.height,
        content: pane.content,
        shouldRestore: true,
      };
    });

  + // Enforce limit after adding all visible coder panes
  + while (updatedClosedPaneOrder.length > MAX_CLOSED_PANES_TO_STORE) {
  +   const paneIdToRemove = updatedClosedPaneOrder.shift(); // Remove oldest
  +   if (paneIdToRemove) {
  +     delete updatedClosedPanePositions[paneIdToRemove];
  +     console.log(`[PaneStore] Evicted ${paneIdToRemove} from closedPanePositions during toggleAll (limit: ${MAX_CLOSED_PANES_TO_STORE})`);
  +   }
  + }

    set({
      panes: updatedPanes,
      activePaneId: newActivePaneId,
      closedPanePositions: updatedClosedPanePositions,
    + closedPaneOrder: updatedClosedPaneOrder,
    });
    ```

**Step 5: Update `togglePaneAction` (Restoring Part)**

*   **File:** `src/stores/panes/actions/togglePane.ts`
*   **Rationale:** When a pane is restored via `togglePaneAction`, it should be removed from `closedPanePositions` and `closedPaneOrder` as it's no longer "closed".
*   **Action:** Update the logic where a new pane is created using `storedData`.

    ```typescript
    // src/stores/panes/actions/togglePane.ts
    // ...
    // Inside the `else` block (pane doesn't exist, create it):
    const storedData = state.closedPanePositions[paneId];
    let paneInputParams: PaneInput;

    if (storedData && storedData.shouldRestore !== false) {
      // ... (paneInputParams creation remains the same)
    } else {
      // ... (paneInputParams creation remains the same)
    }

    // ... (creation of newPaneInput using addPaneActionLogic) ...
    const newStatePartial = addPaneActionLogic(state, paneInputParams, false);

    const updatedClosedPanePositions = { ...state.closedPanePositions };
  + let updatedClosedPaneOrder = [...state.closedPaneOrder];

    if (storedData && storedData.shouldRestore !== false) {
      delete updatedClosedPanePositions[paneId]; // Remove after restoring
    + updatedClosedPaneOrder = updatedClosedPaneOrder.filter(id => id !== paneId);
    }

    set({
      ...newStatePartial,
      closedPanePositions: updatedClosedPanePositions,
    + closedPaneOrder: updatedClosedPaneOrder,
    });
    ```
    *And also in `toggleAllCoderPanesAction` (showing part):*
    ```typescript
    // src/stores/panes/actions/toggleAllCoderPanes.ts
    // ...
    // Inside the `if (restoredPanes.length > 0)` block (showing logic):
    const updatedClosedPanePositions = { ...state.closedPanePositions };
  + let updatedClosedPaneOrder = [...state.closedPaneOrder];

    restoredPanes.forEach(pane => {
      delete updatedClosedPanePositions[pane.id];
    + updatedClosedPaneOrder = updatedClosedPaneOrder.filter(id => id !== pane.id);
    });
    // ...
    set({
      panes: [...updatedExistingPanes, ...restoredPanes],
      activePaneId: lastRestoredPane.id,
      closedPanePositions: updatedClosedPanePositions,
    + closedPaneOrder: updatedClosedPaneOrder,
    });
    ```

**Step 6: Add `MAX_CLOSED_PANES_TO_STORE` to Constants**

*   **File:** `src/stores/panes/constants.ts`
*   **Action:** Add the new constant.

    ```typescript
    // src/stores/panes/constants.ts
    // ... (existing constants) ...
  + export const MAX_CLOSED_PANES_TO_STORE = 20; // Or a preferred limit
    ```

**Explanation of Changes:**

-   `PaneState` now includes `closedPaneOrder`, an array of pane IDs. This array maintains the MRU order: the most recently closed pane's ID is at the end.
-   `src/stores/pane.ts` initializes `closedPaneOrder` and ensures it's persisted/rehydrated. The `merge` function now also ensures `closedPaneOrder` is consistent with `closedPanePositions` and applies the storage limit upon rehydration.
-   `removePaneAction` and `toggleAllCoderPanesAction` (when hiding panes) now:
    -   Update `closedPaneOrder` by moving the closed pane's ID to the end.
    -   If `closedPaneOrder` exceeds `MAX_CLOSED_PANES_TO_STORE`, they remove the oldest entry (from the beginning of `closedPaneOrder`) from both `closedPaneOrder` and `closedPanePositions`.
-   `togglePaneAction` and `toggleAllCoderPanesAction` (when restoring panes) now remove the restored pane's ID from `closedPaneOrder` in addition to `closedPanePositions`, as the pane is no longer "closed and stored".

This MRU-based eviction strategy with a fixed limit will prevent `closedPanePositions` from growing indefinitely, addressing the issue of storing too many keys while still allowing users to restore recently closed panes.Okay, the issue is that the `closedPanePositions` in your Zustand store (`usePaneStore`) is accumulating entries without a proper eviction strategy, leading to an excessive number of keys being stored. We need to implement a Most Recently Used (MRU) or fixed-limit eviction for these stored pane positions.
