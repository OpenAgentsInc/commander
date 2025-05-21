Okay, Agent, let's adjust the homepage layout. We want the "Sell Compute" pane to be the main focus initially, with the "Welcome Chat" (our default NIP-28 channel pane) smaller, in the bottom-left, and visually "behind" the Sell Compute pane.

Here are the specific coding instructions:

**1. Update Pane Constants for Initial Layout**

*   **File:** `src/stores/panes/constants.ts`
*   **Action:** Add constants for the Welcome Chat's initial size and the Sell Compute pane's initial size. Adjust existing `PANE_MARGIN` if necessary.

```typescript
// src/stores/panes/constants.ts
export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20;
export const PANE_OFFSET = 45;

export const CHATS_PANE_ID = 'chats'; // This might be unused if we don't have a 'chats' list pane by default
export const CHANGELOG_PANE_ID = 'changelog';

// Constants for default NIP-28 "Welcome Chat" pane
export const DEFAULT_NIP28_CHANNEL_ID = 'ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978';
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = 'Welcome Chat';
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

// Constants for "Sell Compute" pane
// ID is already exported from openSellComputePaneAction.ts, but useful for consistency here
export const SELL_COMPUTE_PANE_ID_CONST = 'sell_compute'; // To avoid import cycle if actions file imports constants
export const SELL_COMPUTE_INITIAL_WIDTH = 550; // Slightly smaller than before to not overwhelm
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

// Approximate height of the Hotbar for positioning calculations
export const HOTBAR_APPROX_HEIGHT = 60; // pixels
```

**2. Modify Initial Pane Configuration in the Store**

*   **File:** `src/stores/pane.ts`
*   **Action:**
    *   Update `getInitialPanes()` to:
        *   Position the "Welcome Chat" pane (default NIP-28 channel) in the bottom-left corner, above the hotbar, with a smaller size. Make it inactive.
        *   Add the "Sell Compute" pane by default, positioned more centrally and larger. Make it active.
    *   Ensure `initialState` reflects that "Sell Compute" is the active pane and that its position is set for `lastPanePosition`.
    *   The order in the `panes` array matters: "Welcome Chat" first, "Sell Compute" second, so "Sell Compute" renders on top.

```typescript
// src/stores/pane.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  removePaneAction,
  updatePanePositionAction,
  updatePaneSizeAction,
  openChatPaneAction,
  bringPaneToFrontAction,
  setActivePaneAction,
  createNip28ChannelPaneAction,
  openNip90DashboardPaneAction,
  openSellComputePaneAction,
  openDvmJobHistoryPaneAction,
} from "./panes/actions";
import {
  PANE_MARGIN,
  DEFAULT_NIP28_PANE_ID,
  DEFAULT_NIP28_CHANNEL_ID,
  DEFAULT_NIP28_CHANNEL_TITLE,
  WELCOME_CHAT_INITIAL_WIDTH,
  WELCOME_CHAT_INITIAL_HEIGHT,
  SELL_COMPUTE_PANE_ID_CONST, // Use the constant from constants.ts
  SELL_COMPUTE_INITIAL_WIDTH,
  SELL_COMPUTE_INITIAL_HEIGHT,
  HOTBAR_APPROX_HEIGHT
} from "./panes/constants";

// Function to get initial panes
const getInitialPanes = (): Pane[] => {
  const initialPanes: Pane[] = [];
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // 1. Welcome Chat (NIP-28 Default) - Bottom-left, smaller, inactive
  initialPanes.push({
    id: DEFAULT_NIP28_PANE_ID,
    type: 'nip28_channel',
    title: DEFAULT_NIP28_CHANNEL_TITLE,
    x: PANE_MARGIN,
    y: screenHeight - WELCOME_CHAT_INITIAL_HEIGHT - PANE_MARGIN - HOTBAR_APPROX_HEIGHT,
    width: WELCOME_CHAT_INITIAL_WIDTH,
    height: WELCOME_CHAT_INITIAL_HEIGHT,
    isActive: false, // Inactive by default
    dismissable: true, // Allow user to close it
    content: {
      channelId: DEFAULT_NIP28_CHANNEL_ID,
      channelName: DEFAULT_NIP28_CHANNEL_TITLE,
    },
  });

  // 2. Sell Compute Pane - Central, larger, active
  initialPanes.push({
    id: SELL_COMPUTE_PANE_ID_CONST,
    type: 'sell_compute',
    title: 'Sell Compute Power',
    x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
    y: Math.max(PANE_MARGIN, (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3), // Positioned a bit higher than exact center
    width: SELL_COMPUTE_INITIAL_WIDTH,
    height: SELL_COMPUTE_INITIAL_HEIGHT,
    isActive: true, // Active by default
    dismissable: true,
    content: {}, // No specific content needed for this type at init
  });

  return initialPanes;
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST, // Sell Compute is active
  lastPanePosition: null,
};

// Set lastPanePosition based on the Sell Compute pane's initial position
const sellComputePaneInitial = initialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
if (sellComputePaneInitial) {
    initialState.lastPanePosition = {
        x: sellComputePaneInitial.x,
        y: sellComputePaneInitial.y,
        width: sellComputePaneInitial.width,
        height: sellComputePaneInitial.height
    };
}


export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set),
      openSellComputePane: () => openSellComputePaneAction(set),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
      resetHUDState: () => {
        const newInitialState: PaneState = {
            panes: getInitialPanes(),
            activePaneId: SELL_COMPUTE_PANE_ID_CONST, // Sell Compute active on reset
            lastPanePosition: null,
        };

        const newSellComputePane = newInitialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
        if (newSellComputePane) {
            set({
                ...newInitialState,
                lastPanePosition: {
                    x: newSellComputePane.x,
                    y: newSellComputePane.y,
                    width: newSellComputePane.width,
                    height: newSellComputePane.height
                }
            });
        } else {
            set(newInitialState);
        }
      },
    }),
    {
      name: 'commander-pane-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        let merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };

        const defaultInitialPanes = getInitialPanes();
        const defaultActiveId = SELL_COMPUTE_PANE_ID_CONST;
        const defaultSellComputePane = defaultInitialPanes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);

        // If panes are missing or Sell Compute is not primary, reset to defaults
        if (!merged.panes || merged.panes.length === 0 || !merged.panes.some(p => p.id === SELL_COMPUTE_PANE_ID_CONST) || merged.activePaneId !== SELL_COMPUTE_PANE_ID_CONST) {
          merged = {
            ...merged,
            panes: defaultInitialPanes,
            activePaneId: defaultActiveId,
            lastPanePosition: defaultSellComputePane ? {
              x: defaultSellComputePane.x, y: defaultSellComputePane.y,
              width: defaultSellComputePane.width, height: defaultSellComputePane.height
            } : null
          };
        } else {
          // Ensure the Welcome Chat (default NIP-28) exists with its bottom-left small config if not persisted correctly
          const welcomeChatPane = merged.panes.find(p => p.id === DEFAULT_NIP28_PANE_ID);
          const defaultWelcomeChat = defaultInitialPanes.find(p => p.id === DEFAULT_NIP28_PANE_ID)!;
          if (!welcomeChatPane) {
            merged.panes.unshift(defaultWelcomeChat); // Add to beginning (rendered first, lower z-index)
          } else {
            // If it exists, ensure it's not active if Sell Compute is active
            if (merged.activePaneId === SELL_COMPUTE_PANE_ID_CONST && welcomeChatPane.isActive) {
                const wcIndex = merged.panes.findIndex(p => p.id === DEFAULT_NIP28_PANE_ID);
                if (wcIndex > -1) {
                    merged.panes[wcIndex] = {...merged.panes[wcIndex], isActive: false};
                }
            }
          }
        }
        // Ensure Sell Compute pane is last in array if it's active, for z-index stacking
        if (merged.activePaneId === SELL_COMPUTE_PANE_ID_CONST) {
            const scPane = merged.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
            if (scPane) {
                merged.panes = merged.panes.filter(p => p.id !== SELL_COMPUTE_PANE_ID_CONST);
                merged.panes.push(scPane);
            }
        }

        return merged;
      },
    }
  )
);
```

**3. Remove Default Opening of Sell Compute Pane from HomePage**

*   **File:** `src/pages/HomePage.tsx`
*   **Action:** Remove the `useEffect` that automatically calls `openSellComputePane()`. The store's initial state now handles this.

```typescript
// src/pages/HomePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar";

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32;

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);

  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId, openSellComputePane, openDvmJobHistoryPane } = usePaneStore();

  const toggleHandTracking = () => { /* ... (as before) ... */ };
  const prevHandDataRef = useRef<HandDataContext | null>(null);
  const handleHandDataUpdate = (data: HandDataContext) => { /* ... (as before) ... */ };
  useEffect(() => { /* ... (pinch-to-drag logic as before) ... */ }, [isHandTrackingActive, handData, draggingPaneId]);

  // REMOVE THIS useEffect block:
  // useEffect(() => {
  //   const hasSellComputePane = panes.some(p => p.id === 'sell_compute');
  //   if (!hasSellComputePane) {
  //     openSellComputePane();
  //   }
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [panes]); // Run only when panes array reference changes

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />

      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />

      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={openSellComputePane}
        onOpenDvmJobHistoryPane={openDvmJobHistoryPane}
      />
    </div>
  );
}
```

**Explanation:**

1.  **Constants:** Added new constants to `src/stores/panes/constants.ts` for better management of default sizes and IDs.
2.  **Store (`pane.ts`):**
    *   `getInitialPanes()` now creates two panes by default:
        *   The "Welcome Chat" (NIP-28) is configured to be smaller, positioned in the bottom-left, and `isActive: false`. Its `y` coordinate accounts for `PANE_MARGIN` and `HOTBAR_APPROX_HEIGHT`.
        *   The "Sell Compute" pane is configured to be larger, more central, and `isActive: true`.
    *   The `panes` array in `initialState` is ordered with "Welcome Chat" first, then "Sell Compute". Since `PaneManager` uses the array index for `zIndex` (`baseZIndex + index`), the "Sell Compute" pane (at a higher index) will render on top.
    *   `activePaneId` is set to `SELL_COMPUTE_PANE_ID_CONST`.
    *   `lastPanePosition` is updated to reflect the "Sell Compute" pane's initial state.
    *   The `resetHUDState` function is updated to also set "Sell Compute" as the active pane upon reset.
    *   The `merge` function in `persist` is updated to ensure that if persisted state is invalid or doesn't have the "Sell Compute" pane as primary, it resets to the new default layout. It also ensures the "Welcome Chat" pane is present and generally inactive if "Sell Compute" is active.
3.  **HomePage (`HomePage.tsx`):**
    *   The `useEffect` hook that previously called `openSellComputePane()` has been removed because the initial pane setup (including the "Sell Compute" pane and its active state) is now handled by the `usePaneStore`'s `initialState` and `getInitialPanes` function. This makes the store the single source of truth for the initial layout.

With these changes, the "Sell Compute" pane should appear prominently on startup, with the "Welcome Chat" pane smaller and positioned in the bottom-left, appearing "behind" it.

```
File: src/stores/panes/constants.ts
```
```typescript
export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20;
export const PANE_OFFSET = 45;

export const CHATS_PANE_ID = 'chats'; // This might be unused if we don't have a 'chats' list pane by default
export const CHANGELOG_PANE_ID = 'changelog';

// Constants for default NIP-28 "Welcome Chat" pane
export const DEFAULT_NIP28_CHANNEL_ID = 'ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978';
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = 'Welcome Chat';
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

// Constants for "Sell Compute" pane
// ID is already exported from openSellComputePaneAction.ts, but useful for consistency here
export const SELL_COMPUTE_PANE_ID_CONST = 'sell_compute';
export const SELL_COMPUTE_INITIAL_WIDTH = 550;
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

// Approximate height of the Hotbar for positioning calculations
export const HOTBAR_APPROX_HEIGHT = 60; // pixels
```

```
File: src/stores/pane.ts
```
```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  removePaneAction,
  updatePanePositionAction,
  updatePaneSizeAction,
  openChatPaneAction,
  bringPaneToFrontAction,
  setActivePaneAction,
  createNip28ChannelPaneAction,
  openNip90DashboardPaneAction,
  openSellComputePaneAction,
  openDvmJobHistoryPaneAction,
} from "./panes/actions";
import {
  PANE_MARGIN,
  DEFAULT_NIP28_PANE_ID,
  DEFAULT_NIP28_CHANNEL_ID,
  DEFAULT_NIP28_CHANNEL_TITLE,
  WELCOME_CHAT_INITIAL_WIDTH,
  WELCOME_CHAT_INITIAL_HEIGHT,
  SELL_COMPUTE_PANE_ID_CONST,
  SELL_COMPUTE_INITIAL_WIDTH,
  SELL_COMPUTE_INITIAL_HEIGHT,
  HOTBAR_APPROX_HEIGHT
} from "./panes/constants";

// Function to get initial panes
const getInitialPanes = (): Pane[] => {
  const initialPanes: Pane[] = [];
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // 1. Welcome Chat (NIP-28 Default) - Bottom-left, smaller, inactive
  initialPanes.push({
    id: DEFAULT_NIP28_PANE_ID,
    type: 'nip28_channel',
    title: DEFAULT_NIP28_CHANNEL_TITLE,
    x: PANE_MARGIN,
    y: screenHeight - WELCOME_CHAT_INITIAL_HEIGHT - PANE_MARGIN - HOTBAR_APPROX_HEIGHT,
    width: WELCOME_CHAT_INITIAL_WIDTH,
    height: WELCOME_CHAT_INITIAL_HEIGHT,
    isActive: false, // Inactive by default
    dismissable: true, // Allow user to close it
    content: {
      channelId: DEFAULT_NIP28_CHANNEL_ID,
      channelName: DEFAULT_NIP28_CHANNEL_TITLE,
    },
  });

  // 2. Sell Compute Pane - Central, larger, active
  initialPanes.push({
    id: SELL_COMPUTE_PANE_ID_CONST,
    type: 'sell_compute',
    title: 'Sell Compute Power',
    x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
    y: Math.max(PANE_MARGIN, (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3),
    width: SELL_COMPUTE_INITIAL_WIDTH,
    height: SELL_COMPUTE_INITIAL_HEIGHT,
    isActive: true, // Active by default
    dismissable: true,
    content: {},
  });

  return initialPanes;
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST,
  lastPanePosition: null,
};

const sellComputePaneInitial = initialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
if (sellComputePaneInitial) {
    initialState.lastPanePosition = {
        x: sellComputePaneInitial.x,
        y: sellComputePaneInitial.y,
        width: sellComputePaneInitial.width,
        height: sellComputePaneInitial.height
    };
}


export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set),
      openSellComputePane: () => openSellComputePaneAction(set),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
      resetHUDState: () => {
        const newInitialState: PaneState = {
            panes: getInitialPanes(),
            activePaneId: SELL_COMPUTE_PANE_ID_CONST,
            lastPanePosition: null,
        };

        const newSellComputePane = newInitialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
        if (newSellComputePane) {
            set({
                ...newInitialState,
                lastPanePosition: {
                    x: newSellComputePane.x,
                    y: newSellComputePane.y,
                    width: newSellComputePane.width,
                    height: newSellComputePane.height
                }
            });
        } else {
            set(newInitialState);
        }
      },
    }),
    {
      name: 'commander-pane-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        let merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };

        const defaultInitialPanes = getInitialPanes();
        const defaultActiveId = SELL_COMPUTE_PANE_ID_CONST;
        const defaultSellComputePane = defaultInitialPanes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);

        if (!merged.panes || merged.panes.length === 0 || !merged.panes.some(p => p.id === SELL_COMPUTE_PANE_ID_CONST) || merged.activePaneId !== SELL_COMPUTE_PANE_ID_CONST) {
          merged = {
            ...merged,
            panes: defaultInitialPanes,
            activePaneId: defaultActiveId,
            lastPanePosition: defaultSellComputePane ? {
              x: defaultSellComputePane.x, y: defaultSellComputePane.y,
              width: defaultSellComputePane.width, height: defaultSellComputePane.height
            } : null
          };
        } else {
          const welcomeChatPane = merged.panes.find(p => p.id === DEFAULT_NIP28_PANE_ID);
          const defaultWelcomeChat = defaultInitialPanes.find(p => p.id === DEFAULT_NIP28_PANE_ID)!;
          if (!welcomeChatPane) {
            merged.panes.unshift(defaultWelcomeChat);
          } else {
            if (merged.activePaneId === SELL_COMPUTE_PANE_ID_CONST && welcomeChatPane.isActive) {
                const wcIndex = merged.panes.findIndex(p => p.id === DEFAULT_NIP28_PANE_ID);
                if (wcIndex > -1) {
                    merged.panes[wcIndex] = {...merged.panes[wcIndex], isActive: false};
                }
            }
          }
        }

        if (merged.activePaneId === SELL_COMPUTE_PANE_ID_CONST) {
            const scPane = merged.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
            if (scPane) {
                merged.panes = merged.panes.filter(p => p.id !== SELL_COMPUTE_PANE_ID_CONST);
                merged.panes.push(scPane);
            }
        }

        return merged;
      },
    }
  )
);
```

```
File: src/pages/HomePage.tsx
```
```typescript
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar";

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32;

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);

  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId, openSellComputePane, openDvmJobHistoryPane } = usePaneStore();

  const toggleHandTracking = () => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) {
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  };

  const prevHandDataRef = useRef<HandDataContext | null>(null);

  const handleHandDataUpdate = (data: HandDataContext) => {
    if (!prevHandDataRef.current ||
        data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
        data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
        JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)) {

      prevHandDataRef.current = data;
      setHandData(data);
    }
  };

  useEffect(() => {
    if (!isHandTrackingActive || !handData || !handData.pinchMidpoint || handData.trackedHandsCount === 0) {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
      return;
    }

    const { activeHandPose, pinchMidpoint } = handData;

    if (activeHandPose === HandPose.PINCH_CLOSED) {
      if (!draggingPaneId) {
        for (let i = panes.length - 1; i >= 0; i--) {
          const pane = panes[i];
          if (
            pinchMidpoint.x >= pane.x &&
            pinchMidpoint.x <= pane.x + pane.width &&
            pinchMidpoint.y >= pane.y &&
            pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
          ) {
            setDraggingPaneId(pane.id);
            paneStartPosRef.current = { x: pane.x, y: pane.y };
            initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
            if (pane.id !== currentActivePaneId) {
              bringPaneToFront(pane.id);
            }
            break;
          }
        }
      } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
        const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
        const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;

        if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
          const newX = paneStartPosRef.current.x + deltaX;
          const newY = paneStartPosRef.current.y + deltaY;

          initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
          paneStartPosRef.current = { x: newX, y: newY };

          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHandTrackingActive, handData, draggingPaneId, panes, bringPaneToFront, updatePanePosition, currentActivePaneId]); // Added panes, bringPaneToFront, updatePanePosition, currentActivePaneId to dependency array as they are used

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />

      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />

      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={openSellComputePane}
        onOpenDvmJobHistoryPane={openDvmJobHistoryPane}
      />
    </div>
  );
}
```
