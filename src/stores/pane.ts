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
  openNip90DvmTestPaneAction,
  openNip90ConsumerChatPaneAction,
} from "./panes/actions";
import { 
  DEFAULT_NIP28_PANE_ID,
  DEFAULT_NIP28_CHANNEL_ID,
  DEFAULT_NIP28_CHANNEL_TITLE,
  PANE_MARGIN,
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
      openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set),
      openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set),
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