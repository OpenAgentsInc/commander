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
} from "./panes/actions";
import { 
  DEFAULT_NIP28_PANE_ID,
  DEFAULT_NIP28_CHANNEL_ID,
  DEFAULT_NIP28_CHANNEL_TITLE,
  PANE_MARGIN, 
  DEFAULT_PANE_WIDTH, 
  DEFAULT_PANE_HEIGHT 
} from "./panes/constants";

// Function to get initial panes
const getInitialPanes = (): Pane[] => {
  const initialPanes: Pane[] = [];

  // Default NIP-28 Channel Pane
  initialPanes.push({
    id: DEFAULT_NIP28_PANE_ID,
    type: 'nip28_channel',
    title: DEFAULT_NIP28_CHANNEL_TITLE,
    x: PANE_MARGIN + 50, // Example central positioning
    y: PANE_MARGIN + 50,
    width: 800, // Larger default size
    height: 600,
    isActive: true,
    dismissable: false, // This main pane should not be dismissable
    content: {
      channelId: DEFAULT_NIP28_CHANNEL_ID,
      channelName: DEFAULT_NIP28_CHANNEL_TITLE,
    },
  });
  
  return initialPanes;
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: DEFAULT_NIP28_PANE_ID, // Default active pane is the NIP-28 channel
  lastPanePosition: null, // Can be set based on the default pane's initial position if needed
};

// Set lastPanePosition based on the default pane
if (initialState.panes.length > 0) {
    const defaultPane = initialState.panes[0];
    initialState.lastPanePosition = {
        x: defaultPane.x,
        y: defaultPane.y,
        width: defaultPane.width,
        height: defaultPane.height
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
      resetHUDState: () => {
        const newInitialState: PaneState = {
            panes: getInitialPanes(),
            activePaneId: DEFAULT_NIP28_PANE_ID,
            lastPanePosition: null,
        };
        
        // Only update lastPanePosition if we have panes
        if (newInitialState.panes.length > 0) {
            const defaultPane = newInitialState.panes[0];
            // Create a new object rather than modifying newInitialState directly
            set({
                ...newInitialState,
                lastPanePosition: {
                    x: defaultPane.x,
                    y: defaultPane.y,
                    width: defaultPane.width,
                    height: defaultPane.height
                }
            });
        } else {
            set(newInitialState);
        }
      },
    }),
    {
      name: 'commander-pane-storage-v2', // Changed name to ensure fresh state
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        let merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };
        
        // Ensure the default NIP-28 pane is always present if persisted state is empty or malformed
        if (!merged.panes || merged.panes.length === 0 || !merged.panes.some(p => p.id === DEFAULT_NIP28_PANE_ID)) {
          const newPanes = getInitialPanes();
          const newActivePaneId = DEFAULT_NIP28_PANE_ID;
          
          // Create a new merged object to avoid type errors
          if (newPanes.length > 0) {
            const defaultPane = newPanes[0];
            merged = {
              ...merged,
              panes: newPanes,
              activePaneId: newActivePaneId,
              lastPanePosition: {
                x: defaultPane.x,
                y: defaultPane.y,
                width: defaultPane.width,
                height: defaultPane.height
              }
            };
          } else {
            merged = {
              ...merged,
              panes: newPanes,
              activePaneId: newActivePaneId,
              lastPanePosition: null
            };
          }
        }
        return merged;
      },
    }
  )
);