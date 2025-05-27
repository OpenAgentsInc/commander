This system is responsible for the draggable, resizable, and content-hosting windows within the Commander application's Heads-Up Display (HUD).

# Pane Management System Architecture

## Table of Contents
1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component & Module Breakdown](#component--module-breakdown)
    3.1. [Data Structures (`src/types/pane.ts`)](#data-structures-srctypespanets)
    3.2. [Zustand Store (`src/stores/pane.ts` & `src/stores/panes/*`)](#zustand-store-srcstorespanets--srcstorespanes)
    3.3. [Pane Component (`src/panes/Pane.tsx`)](#pane-component-srcpanespanetsx)
    3.4. [Pane Manager (`src/panes/PaneManager.tsx`)](#pane-manager-srcpanespanemanagertsx)
    3.5. [Interaction Triggers (e.g., `HomePage.tsx`, `Hotbar.tsx`)](#interaction-triggers-eg-homepagehotbar)
4. [State Management & Data Flow](#state-management--data-flow)
    4.1. [Initial State & Persistence](#initial-state--persistence)
    4.2. [Pane Creation Flow](#pane-creation-flow)
    4.3. [Pane Interaction Flow (Drag, Resize, Activate, Close)](#pane-interaction-flow-drag-resize-activate-close)
5. [Pane Lifecycle & Interactions](#pane-lifecycle--interactions)
    5.1. [Adding Panes](#adding-panes)
    5.2. [Removing Panes](#removing-panes)
    5.3. [Activating Panes & Z-Index Management](#activating-panes--z-index-management)
    5.4. [Dragging Panes](#dragging-panes)
        5.4.1. [Mouse Drag](#mouse-drag)
        5.4.2. [Hand Tracking Drag](#hand-tracking-drag)
    5.5. [Resizing Panes](#resizing-panes)
    5.6. [Content Rendering](#content-rendering)
6. [Styling and Appearance](#styling-and-appearance)
7. [Error Handling & Edge Cases](#error-handling--edge-cases)
8. [Performance Considerations](#performance-considerations)
9. [Testing & Debugging](#testing--debugging)
10. [Future Considerations](#future-considerations)

## 1. Overview

The Pane Management System is a cornerstone of the OpenAgents Commander's user interface, providing a dynamic and customizable workspace. It allows users to interact with multiple independent "panes" – window-like containers that can display diverse content such as chat interfaces, dashboards, lists, or forms. These panes can be freely moved, resized, opened, and closed within the main application HUD, enabling users to tailor their information layout to their needs.

**Key Design Goals & Features:**

-   **Flexibility:** Users can arrange their workspace by dragging and resizing panes.
-   **Modularity:** Each pane displays content based on its `type`, allowing for easy addition of new content views.
-   **Interactivity:** Panes respond to mouse and (for dragging) hand-tracking inputs.
-   **State Persistence:** The layout (positions, sizes, active panes) is persisted across sessions.
-   **Centralized State:** A Zustand store manages the state of all panes, ensuring consistency.
-   **HUD Integration:** Designed to operate within a full-screen Heads-Up Display environment.

## 2. Architecture Diagram

```
+--------------------------------+      +--------------------------------+      +-----------------------------+
| User Interactions              |----->| HomePage.tsx / Hotbar.tsx      |----->| usePaneStore (Actions)      |
| (Mouse Click, Drag,            |      | (Pane Creation Triggers,       |      | (e.g., openAgentChatPane,   |
| Hand Gesture, Keyboard Shortcut)|      | Hand Drag Logic for Panes)     |      | toggleSellComputePane)      |
+--------------------------------+      +--------------------------------+      +-------------+---------------+
                                                                                              |
                                                                                              | Modifies
                                                                                              v
                                          +-----------------------------------------------------+
                                          |                   usePaneStore (State)                |
                                          | - panes: Pane[]                                     |
                                          | - activePaneId: string | null                       |
                                          | - lastPanePosition: {x,y,w,h} | null              |
                                          | - Persistence (localStorage via Zustand middleware) |
                                          +--------------------------+--------------------------+
                                                                     | Reads State
                                                                     v
+--------------------------------+      +--------------------------+--------------------------+
| @use-gesture/react             |<-----| Pane.tsx                 |<----| PaneManager.tsx           |
| (Drag/Resize Handlers)         |      | (Individual Pane UI,     |      | (Renders all visible panes|
+--------------------------------+      |  Drag/Resize Logic,      |      |  based on store state,    |
                                        |  Content Children)       |      |  Handles Z-indexing)      |
                                        |  - Updates store on drag/ |      |  - Passes content based   |
                                        |    resize end            |      |    on pane.type           |
                                        |  - Activates on click    |      |                           |
                                        +--------------------------+      +---------------------------+
                                                                                       |
                                                                                       | Renders specific
                                                                                       v
                                          +-----------------------------------------------------+
                                          |            Pane Content Components                    |
                                          | (e.g., AgentChatPane, Nip28ChannelChat, WalletPane) |
                                          +-----------------------------------------------------+
```

## 3. Component & Module Breakdown

### 3.1. Data Structures (`src/types/pane.ts` & `src/types/paneMenu.ts`)

The core data structures representing a pane and its menu system.

```typescript
// src/types/pane.ts
export type Pane = {
  id: string;
  type:
    | "default" | "chat" | "chats" | "user" | "diff" | "changelog"
    | "nip28_channel" | "nip90_dashboard" | "sell_compute" | "dvm_job_history"
    | "nip90_dvm_test" | "nip90_consumer_chat" | "nip90_global_feed" | "wallet"
    | "second_page_content" | "wallet_setup_content" | "seed_phrase_backup_content"
    | "restore_wallet_content" | "agent_chat" | "previous_chats_list" | "coder"
    | string; // Allows for custom pane types
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  headerMenus?: PaneHeaderMenu[]; // Optional dropdown menus for the title bar
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    seedPhrase?: string;
    sessionId?: string; // For AgentChatPane to load specific chat history
    sessionTitle?: string; // For AgentChatPane title
    data?: Record<string, any>;
    [key: string]: unknown;
  };
};

export type PaneInput = Omit<
  Pane,
  "x" | "y" | "width" | "height" | "id" | "isActive"
> & {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

**Menu Type Definitions (`src/types/paneMenu.ts`):**
```typescript
// Menu item types
export interface PaneDropdownItemAction {
  label: string;
  action: (event?: React.MouseEvent) => void;  // Optional event parameter for modifier key detection
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface PaneDropdownItemSeparator {
  type: 'separator';
}

export interface PaneDropdownItemLabel {
  type: 'label';
  label: string;
}

export interface PaneDropdownItemGroup {
  type: 'group';
  label?: string;
  items: PaneDropdownItem[];
}

export interface PaneDropdownItemSub {
  type: 'submenu';
  label: string;
  icon?: React.ReactNode;
  items: PaneDropdownItem[];
}

export type PaneDropdownItem = 
  | PaneDropdownItemAction
  | PaneDropdownItemSeparator
  | PaneDropdownItemLabel
  | PaneDropdownItemGroup
  | PaneDropdownItemSub;

// Top-level menu structure
export interface PaneHeaderMenu {
  id: string;
  triggerLabel: string;
  items: PaneDropdownItem[];
}
```

- **`Pane`**: Defines all properties of a pane, including its ID, content type, title, position, dimensions, active state, dismissibility, and optional header menus. The `content` field is a flexible object for passing type-specific data.
- **`PaneInput`**: A partial type used when creating new panes, where ID, position, and size might be optional or calculated.
- **`PaneHeaderMenu`**: Defines the structure for dropdown menus in the pane's title bar, with a trigger label and menu items.
- **`PaneDropdownItem`**: Union type supporting various menu item types including actions, separators, labels, groups, and submenus.

### 3.2. Zustand Store (`src/stores/pane.ts` & `src/stores/panes/*`)

A centralized Zustand store manages the entire state of the pane system.

**Key State Properties (`src/stores/panes/types.ts` -> `PaneState`):**
- `panes: Pane[]`: An array of all current pane objects. The order in this array is used to determine z-index (last element is topmost).
- `activePaneId: string | null`: The ID of the currently active/focused pane.
- `lastPanePosition: { x, y, width, height } | null`: Stores the properties of the last interacted-with or newly created pane, used for tiling new panes.
- `closedPanePositions: Record<string, { x, y, width, height }>`: Stores the last known positions and sizes of closed panes by their ID, allowing panes to reopen at their previous location.

**Store Structure (`src/stores/pane.ts`):**
```typescript
// src/stores/pane.ts (Simplified structure)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// ... imports for actions, constants, types ...

const getInitialPanes = (): Pane[] => { /* ... returns default panes ... */ };

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST, // Example default
  lastPanePosition: { /* ... based on initial active pane ... */ },
  closedPanePositions: {}, // Will populate as panes are closed
};

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      // Core Actions
      addPane: (newPaneInput, shouldTile) => addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id) => removePaneAction(set, id),
      updatePanePosition: (id, x, y) => updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id, width, height) => updatePaneSizeAction(set, id, width, height),
      bringPaneToFront: (id) => bringPaneToFrontAction(set, id), // Also sets active
      setActivePane: (id) => setActivePaneAction(set, id),      // Sets active without changing order
      resetHUDState: () => { /* ... resets to initial state ... */ },

      // Specialized Pane Creation/Toggle Actions
      openWalletSetupPane: () => openWalletSetupPaneAction(set),
      toggleAgentChatPane: () => toggleAgentChatPaneAction(set, get),
      // ... many other actions for specific panes ...
    }),
    {
      name: "commander-pane-storage-v3", // Storage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ /* ... fields to persist ... */ }),
      merge: (persistedState, currentState) => { /* ... logic to handle persisted state and ensure defaults ... */ },
    }
  )
);
```
- **Actions (`src/stores/panes/actions/*`)**: Functions that modify the store's state (e.g., `addPaneAction`, `removePaneAction`). These are designed to be reusable and often call `addPaneActionLogic` for common pane creation tasks.
  - **`togglePaneAction`**: Common implementation for all toggle functions that:
    - Handles close/open/bring-to-front logic consistently
    - Saves position when closing panes
    - Restores position when reopening panes
    - Includes console logging for debugging
    - Eliminates code duplication across toggle functions
- **Constants (`src/stores/panes/constants.ts`)**: Defines IDs, default dimensions, and titles for standard panes.
- **Utilities (`src/stores/panes/utils/*`)**: Helper functions like `calculateNewPanePosition` for tiling new panes and `ensurePaneIsVisible` for boundary checks.
- **Persistence**: Uses `zustand/middleware/persist` to save pane state (positions, sizes, types) to `localStorage`, allowing the layout to be restored across sessions. The `merge` function ensures that default essential panes (like "Sell Compute") are present even if the persisted state is corrupted or empty.

### 3.3. Pane Component (`src/panes/Pane.tsx`)

The `Pane` component is the visual representation of an individual pane.

**Key Responsibilities:**
-   Renders the pane's frame (background, border, title bar).
-   Displays the `title` (in bold), `headerMenus` (dropdown menus on the left), and `titleBarButtons` (on the right).
-   Hosts the `children` (actual content based on `pane.type`).
-   Handles drag-to-move functionality for the title bar using `useDrag` from `@use-gesture/react`.
-   Implements resize handles (8 of them) around its borders, also using `useDrag` for each.
-   Manages its local `position` and `size` state during interactions, updating the global store on interaction end (`last` event from `useDrag`).
-   Communicates with `usePaneStore` to update its global state and to bring itself to the front when clicked/dragged.
-   Ensures it stays within viewport bounds (via `ensurePaneIsVisible` and `bounds` in `useDrag`).
-   Styling is done via Tailwind CSS classes and inline styles for dynamic properties.

**Title Bar Layout:**
- **Title** (left side): Displayed in bold font using `font-bold` class
- **Header Menus** (left side, after title): Optional dropdown menus with non-bold triggers (`text-gray-300`)
- **Title Bar Buttons** (right side): Optional custom buttons or controls
- **Close Button** (far right): Dismissable panes show an 'X' button

**Dropdown Menu System:**
- Uses Shadcn UI's `DropdownMenu` components
- Menu structure defined by `PaneHeaderMenu` type with:
  - `id`: Unique identifier for the menu
  - `triggerLabel`: Text shown on the menu trigger button
  - `items`: Array of `PaneDropdownItem` (actions, separators, labels, groups, submenus)
- Menu triggers have `cursor-pointer` and hover states
- Supports controlled open/close state for dynamic menus
- Helper function `renderDropdownItems` recursively builds menu structure
- **Modifier Key Support**: Menu actions receive mouse events to detect Cmd/Ctrl clicks:
  - Normal click: Performs default action (e.g., load content in current pane)
  - Cmd/Ctrl+click: Can perform alternate action (e.g., open in new pane)
  - Example: CoderPane history menu opens sessions in new pane when Cmd/Ctrl is held

**Internal Hook: `useResizeHandlers`**
- Encapsulates the complex logic for all eight resize handles.
- Each handle is bound to a `useDrag` instance.
- Calculates new position and size based on drag movement, respecting minimum dimensions (`minWidth`, `minHeight`).
- Updates local state (`position`, `size`) during drag and global store on drag end.

### 3.4. Pane Manager (`src/panes/PaneManager.tsx`)

This component is responsible for rendering all panes defined in the `usePaneStore`.

```typescript
// src/panes/PaneManager.tsx (Simplified Structure)
import { usePaneStore } from '@/stores/pane';
import { Pane as PaneComponent } from '@/panes/Pane';
// ... imports for various content components (AgentChatPane, WalletPane, etc.) ...

export const PaneManager = () => {
  const { panes, activePaneId } = usePaneStore(/* ... */);

  // The order of panes in the `panes` array (after bringPaneToFront)
  // determines the stacking order. The last pane in the array is the active one.
  return (
    <>
      {panes.map((pane, index) => (
        <PaneComponent
          key={pane.id}
          {...pane} // Pass all pane props
          style={{ zIndex: 10 + index }} // Dynamic z-index based on array order
          isActive={pane.id === activePaneId} // Explicitly pass isActive
        >
          {/* Conditional rendering of content based on pane.type */}
          {pane.type === "agent_chat" && <AgentChatPane sessionId={pane.content?.sessionId} sessionTitle={pane.content?.sessionTitle} />}
          {pane.type === "wallet" && <WalletPane />}
          {/* ... other pane types ... */}
          {pane.type === "default" && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```
-   Fetches the `panes` array and `activePaneId` from `usePaneStore`.
-   Iterates over the `panes` array. The order of panes in this array (managed by `bringPaneToFrontAction` in the store) determines their stacking order.
-   For each `Pane` object, it renders a `PaneComponent`.
-   It dynamically renders the content of each pane by selecting the appropriate child component based on `pane.type`.
-   Assigns a `zIndex` style to each `PaneComponent` based on its index in the `panes` array, ensuring the active pane (last in the array) is visually on top.

**Dynamic Menu Support:**
For panes that need dynamic menus (e.g., CoderPane with its history menu), PaneManager supports:
- Using refs to pass menu configuration from content components to PaneComponent
- Dynamic menu items that can be updated based on component state
- Controlled open/close state for menus
- Per-pane ref isolation to ensure menu state is independent between multiple instances
- Example: CoderPane creates its own history menu that fetches recent chat sessions and updates when opened

**Independent Pane State:**
- Each pane instance maintains its own state, even for panes of the same type
- CoderPane uses local React state instead of global stores to ensure multiple coder panes are independent
- PaneManager uses per-pane refs (e.g., `coderTitleBarRefs[pane.id]`) to isolate dynamic UI elements
- Content is passed via `pane.content` to initialize panes with specific data (e.g., `sessionId` for loading chat history)

### 3.5. Interaction Triggers (e.g., `HomePage.tsx`, `Hotbar.tsx`)

Components like `HomePage.tsx` and `Hotbar.tsx` contain UI elements (buttons) that trigger actions in `usePaneStore` to create or toggle panes.

-   **`HomePage.tsx`**:
    -   Renders `PaneManager`, `SimpleGrid` (background), `BitcoinBalanceDisplay`, and `Hotbar`.
    -   Handles global keyboard shortcuts for Hotbar items (e.g., Ctrl+1 for slot 1).
    -   Integrates hand tracking:
        -   The `HandTracking` component provides `activeHandPose` and `pinchMidpoint`.
        -   `HomePage` contains the logic to detect a `PINCH_CLOSED` gesture over a pane's title bar to initiate a drag, updating the pane's position in the store.
-   **`Hotbar.tsx`**:
    -   Displays a row of `HotbarItem` components.
    -   Each `HotbarItem` can be configured to call a specific `usePaneStore` action (e.g., `toggleSellComputePane`, `toggleAgentChatPane`) on click or via keyboard shortcut.

## 4. State Management & Data Flow

### 4.1. Initial State & Persistence
-   **`getInitialPanes()`**: Called by `usePaneStore` to define the default set of panes when the app first starts or when state is reset. For the "Compute Market" launch, this is focused on the "Sell Compute" pane.
-   **Zustand `persist` Middleware**:
    -   Saves `panes`, `activePaneId`, and `lastPanePosition` to `localStorage`.
    -   **`merge` function**: Handles rehydration. It's crucial for ensuring that essential default panes are present if the persisted state is missing them or is corrupted. For the "Compute Market" launch, it forces the "Sell Compute" pane to be the primary initial view, overriding any persisted layout to ensure focus.
-   **`ResetHUDButton.tsx`**: Calls `usePaneStore.getState().resetHUDState()` to revert to the `initialState` defined by `getInitialPanes`.

### 4.2. Pane Creation Flow
1.  User clicks a button (e.g., in `Hotbar` or `NewChannelButton.tsx`).
2.  The button's `onClick` handler calls a specific action from `usePaneStore` (e.g., `openAgentChatPane()`).
3.  The store action (e.g., `openAgentChatPaneAction`) is executed:
    *   It checks if a pane with the target ID already exists.
        *   If yes, it calls `bringPaneToFrontAction` to activate it.
        *   If no, it constructs a `PaneInput` object with type, title, default dimensions, etc.
    *   It calls `addPaneActionLogic`.
4.  `addPaneActionLogic`:
    *   Calculates initial position using `calculateNewPanePosition` (which considers `lastPanePosition` for tiling).
    *   Creates a full `Pane` object, ensuring visibility with `ensurePaneIsVisible`.
    *   Sets the new pane as `isActive: true` and deactivates others.
    *   Adds the new pane to the `panes` array (typically at the end for top z-index).
    *   Updates `activePaneId` and `lastPanePosition`.
5.  `PaneManager` re-renders due to store update, displaying the new pane.

### 4.3. Pane Interaction Flow (Drag, Resize, Activate, Close)

-   **Activation**:
    1.  User clicks on a `PaneComponent` (not on a button or resize handle within it).
    2.  The `PaneComponent`'s `onMouseDownCapture` handler calls `usePaneStore.getState().bringPaneToFront(pane.id)`.
    3.  `bringPaneToFrontAction` updates the `panes` array (moves the target pane to the end), sets its `isActive` flag to true, deactivates others, and updates `activePaneId`.
    4.  `PaneManager` re-renders, and the active pane gets a higher `zIndex` and distinct styling.

-   **Drag**:
    1.  User presses mouse on a `PaneComponent`'s title bar (or performs pinch gesture over title bar).
    2.  `useDrag` (in `Pane.tsx`) or hand tracking logic (in `HomePage.tsx`) initiates.
    3.  `bringPaneToFront(id)` is called if not already active.
    4.  During drag, local `position` state in `Pane.tsx` (or directly in `HomePage.tsx` for hand drag) is updated frequently, causing the pane to re-render its position.
    5.  On drag end (`last` event), `updatePanePosition(id, newX, newY)` is called in the store.
    6.  `updatePanePositionAction` updates the specific pane's `x`, `y` in the `panes` array and `lastPanePosition`.

-   **Resize**:
    1.  User presses mouse on one of the 8 resize handles of a `PaneComponent`.
    2.  The corresponding `useDrag` handler in `useResizeHandlers` (within `Pane.tsx`) activates.
    3.  During resize, local `position` and `size` state in `Pane.tsx` are updated.
    4.  On resize end, `updatePanePosition` and `updatePaneSize` are called in the store.
    5.  The store actions update the specific pane's properties.

-   **Close**:
    1.  User clicks the 'X' button on a dismissable `PaneComponent`.
    2.  The button's `onClick` calls `usePaneStore.getState().removePane(pane.id)`.
    3.  `removePaneAction`:
        - Saves the pane's current position and size to `closedPanePositions[id]`.
        - Filters out the pane from the `panes` array.
        - Potentially activates another pane.
    4.  `PaneManager` re-renders without the removed pane.

### 4.4. Position Persistence for Toggle-able Panes

When a pane is closed and later reopened (common with toggle-able panes like Coder, Wallet, etc.):

1. **On Close**: Toggle actions save the pane's current position/size to `closedPanePositions[paneId]` when closing.
2. **On Reopen**: Toggle actions check for a stored position:
   - If found: Restore the pane at its previous location (with bounds checking) and remove the stored position.
   - If not found: Create the pane at the default position.
3. **One-time Use**: Stored positions are removed after being used to prevent stale data.
4. **Common Implementation**: All toggle functions use `togglePaneAction` for consistent behavior:
   - Reduces code duplication
   - Ensures all panes handle position persistence the same way
   - Includes console logging for debugging position save/restore operations
5. **Critical Drag Handler Fix**: The drag handler must check `(active || last)` not just `active` because:
   - When drag ends, the gesture library sets `active: false` and `last: true`
   - Position updates must run when `last: true` to save the final position
   - Without this, dragged positions are never saved to the store
6. This ensures panes remember their last position across close/open cycles while always using the most recent position.

## 5. Pane Lifecycle & Interactions

Detailed flow covered in 4.2 and 4.3. Key points:
- Panes are added to the `panes` array in the store.
- Their properties (position, size, active state) are updated via store actions.
- Z-index is managed by array order (active pane at the end) and the `isActive` prop driving CSS in `Pane.tsx`.

### 5.4.2. Hand Tracking Drag
-   Implemented in `HomePage.tsx`.
-   `useHandTracking` hook provides `activeHandPose` and `pinchMidpoint` (screen coordinates).
-   If `activeHandPose === HandPose.PINCH_CLOSED` and `pinchMidpoint` is within a pane's title bar:
    -   The pane is marked as `draggingPaneId`.
    -   Initial pinch position and pane position are recorded.
    -   `bringPaneToFront` is called.
-   While pinch is maintained, deltas from initial pinch position are used to calculate new pane coordinates, and `updatePanePosition` is called on the store.
-   Releasing the pinch ends the drag.

## 6. Styling and Appearance

-   **Dark Theme:** The system operates within a forced dark theme (`:root` and `.dark` variables in `src/styles/global.css`).
-   **Pane Styling (`Pane.tsx` & `global.css`):**
    -   `bg-black/90 backdrop-blur-sm`: Semi-transparent, blurred background.
    -   `border rounded-lg shadow-lg`: Standard frame.
    -   Active pane: `border-primary ring-1 ring-primary`.
    -   Title bar: `bg-black/80`, specific height (h-8), padding, font-mono.
      - Title text: `font-bold text-xs` (bold, small size)
      - Menu triggers: `text-gray-300 text-xs` (non-bold, same size as title)
      - Hover states: `hover:bg-white/10` for interactive elements
      - All clickable elements have `cursor-pointer`
    -   Content area: `bg-black/60` (slightly more transparent than title bar), `overflow-auto`, padding.
-   **Custom Scrollbars (`global.css`):** `-webkit-scrollbar` styles for a thin, dark-themed scrollbar within pane content areas.
-   **HUD Background (`SimpleGrid.tsx`):** A subtle, static SVG grid pattern rendered as the rearmost layer, styled with `rgba(255, 255, 255, 0.15)` lines on a black background. `pointer-events-none` ensures it doesn't interfere with interactions.

## 7. Common Issues & Solutions

### 7.1. Pane Position Not Saving After Drag

**Issue**: Panes reopen at default position instead of where they were dragged to.

**Root Cause**: The `@use-gesture/react` library sets `active: false` when `last: true` on drag end.

**Solution**: The drag handler must check `if (memo && (active || last))` instead of just `if (active && memo)` to ensure the final position is saved when the drag completes.

### 7.2. Duplicate Toggle Function Logic

**Issue**: Each toggle function had hundreds of lines of duplicate code.

**Solution**: Created `togglePaneAction` that handles:
- Checking if pane exists
- Closing if active
- Bringing to front if inactive
- Creating with stored position if doesn't exist
- Saving/restoring positions from `closedPanePositions`

## 8. Error Handling & Edge Cases

-   **Persisted State Corruption:** The `merge` function in `usePaneStore`'s `persist` middleware attempts to gracefully handle malformed or empty persisted state by ensuring default essential panes are always present.
-   **Off-Screen Panes:**
    -   `calculateNewPanePosition` attempts to place new panes visibly.
    -   `ensurePaneIsVisible` utility is used by `updatePanePositionAction` and `updatePaneSizeAction` to correct pane coordinates if they would go out of bounds.
    -   `Pane.tsx` drag logic also uses `bounds` to keep a portion of the pane (title bar or resize handle) accessible.
-   **Invalid Pane IDs:** Actions generally check if a pane ID exists before attempting to modify it.
-   **No Active Pane:** `activePaneId` can be `null`. UI elements relying on an active pane should handle this.

## 8. Performance Considerations

-   **`useShallow`**: Used in `HomePage.tsx` and `PaneManager.tsx` when selecting multiple values from `usePaneStore` to prevent unnecessary re-renders if unselected parts of the state change.
-   **`@use-gesture/react`**: Optimized for performance in drag/resize interactions.
-   **Local State for Interactions**: `Pane.tsx` uses local React state for `position` and `size` during active drag/resize operations, only updating the global Zustand store on interaction end (`last` event). This minimizes frequent global state updates.
-   **Memoization**: `React.memo` can be used for pane content components if they are complex and prone to re-rendering.
-   **Throttling/Debouncing Updates**: For hand-tracking drag, updates to the store could be throttled if extremely rapid hand movements cause performance issues, though current implementation updates on significant pixel changes.

## 9. Testing & Debugging

-   **Zustand Store Actions:** Can be unit-tested by creating a store instance and calling actions directly, then asserting state changes.
-   **`Pane.tsx` Component:** Test with `@testing-library/react` for rendering, and potentially simulate drag/resize events if feasible, or test `useResizeHandlers` hook in isolation.
-   **`PaneManager.tsx` Component:** Test rendering of different pane types and correct child component selection.
-   **E2E Tests (Playwright):** Crucial for verifying drag, resize, open, close, and pane activation behaviors in a live Electron environment. `electron-playwright-helpers` can assist with Electron-specific interactions.
-   **Debugging:**
    -   React DevTools for inspecting component state and props.
    -   Zustand DevTools (if integrated) for inspecting pane store state.
    -   Console logs for tracking interaction flow, especially for hand-tracking or complex state updates.

## 10. Future Considerations

-   **Snapping Panes:** Allow panes to snap to grid lines or other panes.
-   **Tabbed Panes:** Combine multiple content views into a single tabbed pane.
-   **Saving/Loading Layouts:** Allow users to save and load different pane arrangements.
-   **Advanced Z-Index Management:** If many panes are open, a more sophisticated z-index system than array order might be needed, potentially involving explicit z-index values in the `Pane` state.
-   **Hand Gesture Resizing:** Currently, only hand-tracking drag is implemented. Resizing via hand gestures (e.g., two-hand pinch/spread) could be added.
-   **Accessibility:** Ensure keyboard navigation and control for all pane interactions.

This Pane Management System provides a robust foundation for the Commander application's unique HUD-based user experience, allowing for flexible and interactive content display.
