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
import { CHATS_PANE_ID, CHANGELOG_PANE_ID, PANE_MARGIN, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "./panes/constants";

const getInitialPanes = (): Pane[] => {
  let initialPanesSetup: Pane[] = [];
  initialPanesSetup.push({
    id: CHATS_PANE_ID,
    type: 'chats',
    title: 'Chats',
    x: PANE_MARGIN,
    y: PANE_MARGIN,
    width: 300,
    height: 500,
    isActive: true,
    dismissable: false,
  });
  initialPanesSetup.push({
    id: CHANGELOG_PANE_ID,
    type: 'changelog',
    title: 'Changelog',
    x: PANE_MARGIN + 300 + PANE_MARGIN,
    y: PANE_MARGIN,
    width: 350,
    height: 250,
    isActive: false,
    dismissable: true,
  });
  return initialPanesSetup;
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: CHATS_PANE_ID,
  lastPanePosition: null,
};

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set, channelName),
      resetHUDState: () => set(initialState),
    }),
    {
      name: 'commander-pane-storage', // Changed name to avoid conflicts
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };
        if (!merged.panes || merged.panes.length === 0) {
          merged.panes = getInitialPanes();
          merged.activePaneId = CHATS_PANE_ID;
        } else {
          const hasChats = merged.panes.some(p => p.id === CHATS_PANE_ID);
          const hasChangelog = merged.panes.some(p => p.id === CHANGELOG_PANE_ID);
          const defaultPanes = getInitialPanes();

          if (!hasChats) {
            const chatsPane = defaultPanes.find(p => p.id === CHATS_PANE_ID);
            if (chatsPane) merged.panes.unshift(chatsPane);
          }
          if (!hasChangelog) {
            const changelogPane = defaultPanes.find(p => p.id === CHANGELOG_PANE_ID);
            if (changelogPane) {
                const chatsIndex = merged.panes.findIndex(p => p.id === CHATS_PANE_ID);
                if (chatsIndex !== -1) {
                  merged.panes.splice(chatsIndex + 1, 0, changelogPane);
                } else {
                  merged.panes.push(changelogPane);
                }
            }
          }
        }
        return merged;
      },
    }
  )
);