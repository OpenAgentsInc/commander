import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  removePaneAction,
  updatePanePositionAction,
  updatePaneSizeAction,
  updatePaneContentAction,
  openChatPaneAction,
  bringPaneToFrontAction,
  setActivePaneAction,
  createNip28ChannelPaneAction,
  openNip90DashboardPaneAction,
  openSellComputePaneAction,
  openDvmJobHistoryPaneAction,
  openNip90DvmTestPaneAction,
  openNip90ConsumerChatPaneAction,
  openNip90GlobalFeedPaneAction,
  openWalletPaneAction,
  // New page pane actions
  openSecondPagePaneAction,
  openWalletSetupPaneAction,
  openSeedPhraseBackupPaneAction,
  openRestoreWalletPaneAction,
  // Agent chat pane actions
  openAgentChatPaneAction,
  // Previous chats pane actions
  openPreviousChatsPaneAction,
  // Common toggle action
  togglePaneAction,
  // Coder pane action
  toggleAllCoderPanesAction,
  openNewCoderPaneAction,
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
  HOTBAR_APPROX_HEIGHT,
  WALLET_PANE_ID,
  WALLET_PANE_TITLE,
  AGENT_CHAT_PANE_ID,
  AGENT_CHAT_PANE_TITLE,
  AGENT_CHAT_PANE_DEFAULT_WIDTH,
  AGENT_CHAT_PANE_DEFAULT_HEIGHT,
  CODER_PANE_ID,
  CODER_PANE_TITLE,
  PREVIOUS_CHATS_PANE_ID,
  PREVIOUS_CHATS_PANE_TITLE,
  PREVIOUS_CHATS_PANE_DEFAULT_WIDTH,
  PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT,
} from "./panes/constants";
import { DVM_JOB_HISTORY_PANE_ID } from "./panes/actions/openDvmJobHistoryPane";

// Function to get initial panes
const getInitialPanes = (): Pane[] => {
  // Start with no panes open
  return [];
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: null, // No active pane on startup
  lastPanePosition: null,
  closedPanePositions: {},
};

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) =>
        addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) =>
        updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) =>
        updatePaneSizeAction(set, id, width, height),
      updatePaneContent: (id: string, content: any) =>
        updatePaneContentAction(set, id, content),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) =>
        openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) =>
        createNip28ChannelPaneAction(set, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set),
      openSellComputePane: () => openSellComputePaneAction(set),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
      openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set),
      openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set),
      openNip90GlobalFeedPane: () => openNip90GlobalFeedPaneAction(set),
      openWalletPane: () => openWalletPaneAction(set),
      // New page pane actions
      openSecondPagePane: () => openSecondPagePaneAction(set),
      openWalletSetupPane: () => openWalletSetupPaneAction(set),
      openSeedPhraseBackupPane: (params) =>
        openSeedPhraseBackupPaneAction(set, params),
      openRestoreWalletPane: () => openRestoreWalletPaneAction(set),
      // Agent chat pane
      openAgentChatPane: () => openAgentChatPaneAction(set),
      toggleAgentChatPane: () =>
        togglePaneAction(set, get, {
            paneId: AGENT_CHAT_PANE_ID,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => {
              let x, y, width, height;
              
              if (storedPosition) {
                // Use the stored position
                ({ x, y, width, height } = storedPosition);
                
                // Ensure the pane is still visible on screen (in case window was resized)
                x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
                y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
                width = Math.min(width, screenWidth - x - PANE_MARGIN);
                height = Math.min(height, screenHeight - y - PANE_MARGIN);
              } else {
                // Calculate default position (centered)
                width = AGENT_CHAT_PANE_DEFAULT_WIDTH;
                height = AGENT_CHAT_PANE_DEFAULT_HEIGHT;
                x = Math.floor((screenWidth - width) / 2);
                y = Math.floor((screenHeight - height) / 2);
              }

              return {
                id: AGENT_CHAT_PANE_ID,
                type: "agent_chat",
                title: AGENT_CHAT_PANE_TITLE,
                x: x,
                y: y,
                width: width,
                height: height,
                dismissable: true,
                content: {},
              };
            },
          }),
      // Previous chats pane
      openPreviousChatsPane: () => openPreviousChatsPaneAction(set),
      togglePreviousChatsPane: () =>
        togglePaneAction(set, get, {
            paneId: PREVIOUS_CHATS_PANE_ID,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => {
              let x, y, width, height;
              
              if (storedPosition) {
                // Use the stored position
                ({ x, y, width, height } = storedPosition);
                
                // Ensure the pane is still visible on screen (in case window was resized)
                x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
                y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
                width = Math.min(width, screenWidth - x - PANE_MARGIN);
                height = Math.min(height, screenHeight - y - PANE_MARGIN);
              } else {
                // Calculate default position (left side with offset)
                width = PREVIOUS_CHATS_PANE_DEFAULT_WIDTH;
                height = PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT;
                x = PANE_MARGIN + 20;
                y = Math.floor((screenHeight - height) / 2);
              }

              return {
                id: PREVIOUS_CHATS_PANE_ID,
                type: "previous_chats_list",
                title: PREVIOUS_CHATS_PANE_TITLE,
                x: x,
                y: y,
                width: width,
                height: height,
                dismissable: true,
                content: {},
              };
            },
          }),
      // Coder pane - toggles all coder panes
      toggleCoderPane: () => toggleAllCoderPanesAction(set, get),
      resetHUDState: () => {
        // Force recreate initial panes with current screen dimensions
        const screenWidth =
          typeof window !== "undefined" ? window.innerWidth : 1920;
        const screenHeight =
          typeof window !== "undefined" ? window.innerHeight : 1080;

        // Create new sell compute pane at the center
        const newSellComputePane: Pane = {
          id: SELL_COMPUTE_PANE_ID_CONST,
          type: "sell_compute",
          title: "Sell Compute",
          x: Math.max(
            PANE_MARGIN,
            (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2,
          ),
          y: Math.max(
            PANE_MARGIN,
            (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3,
          ),
          width: SELL_COMPUTE_INITIAL_WIDTH,
          height: SELL_COMPUTE_INITIAL_HEIGHT,
          isActive: true,
          dismissable: true,
          content: {},
        };

        // Create clean state with just the sell compute pane
        const newInitialState: PaneState = {
          panes: [newSellComputePane],
          activePaneId: SELL_COMPUTE_PANE_ID_CONST,
          lastPanePosition: {
            x: newSellComputePane.x,
            y: newSellComputePane.y,
            width: newSellComputePane.width,
            height: newSellComputePane.height,
          },
          closedPanePositions: {},
        };

        // Apply the new state
        set(newInitialState);
      },

      // Toggle actions for keyboard shortcuts
      toggleSellComputePane: () =>
        togglePaneAction(set, get, {
            paneId: SELL_COMPUTE_PANE_ID_CONST,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => {
              let x, y, width, height;
              
              if (storedPosition) {
                // Use the stored position
                ({ x, y, width, height } = storedPosition);
                
                // Ensure the pane is still visible on screen (in case window was resized)
                x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
                y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
                width = Math.min(width, screenWidth - x - PANE_MARGIN);
                height = Math.min(height, screenHeight - y - PANE_MARGIN);
              } else {
                // Calculate default position
                x = Math.max(
                  PANE_MARGIN,
                  (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2,
                );
                y = Math.max(
                  PANE_MARGIN,
                  (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3,
                );
                width = SELL_COMPUTE_INITIAL_WIDTH;
                height = SELL_COMPUTE_INITIAL_HEIGHT;
              }

              return {
                id: SELL_COMPUTE_PANE_ID_CONST,
                type: "sell_compute",
                title: "Sell Compute",
                x: x,
                y: y,
                width: width,
                height: height,
                dismissable: true,
                content: {},
              };
            },
          }),

      toggleWalletPane: () =>
        togglePaneAction(set, get, {
            paneId: WALLET_PANE_ID,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => {
              let x, y, width, height;
              
              if (storedPosition) {
                // Use the stored position
                ({ x, y, width, height } = storedPosition);
                
                // Ensure the pane is still visible on screen (in case window was resized)
                x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
                y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
                width = Math.min(width, screenWidth - x - PANE_MARGIN);
                height = Math.min(height, screenHeight - y - PANE_MARGIN);
              } else {
                // Calculate default position
                x = Math.max(PANE_MARGIN, (screenWidth - 450) / 2 + 50);
                y = Math.max(PANE_MARGIN, (screenHeight - 550) / 3 + 50);
                width = 450;
                height = 550;
              }

              return {
                id: WALLET_PANE_ID,
                type: "wallet",
                title: WALLET_PANE_TITLE,
                x: x,
                y: y,
                width: width,
                height: height,
                dismissable: true,
                content: {},
              };
            },
          }),

      toggleDvmJobHistoryPane: () =>
        togglePaneAction(set, get, {
            paneId: DVM_JOB_HISTORY_PANE_ID,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => {
              let x, y, width, height;
              
              if (storedPosition) {
                // Use the stored position
                ({ x, y, width, height } = storedPosition);
                
                // Ensure the pane is still visible on screen (in case window was resized)
                x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
                y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
                width = Math.min(width, screenWidth - x - PANE_MARGIN);
                height = Math.min(height, screenHeight - y - PANE_MARGIN);
              } else {
                // Calculate default position
                x = Math.max(PANE_MARGIN, (screenWidth - 800) / 2 - 50);
                y = Math.max(PANE_MARGIN, (screenHeight - 600) / 3 - 50);
                width = 800;
                height = 600;
              }

              return {
                id: DVM_JOB_HISTORY_PANE_ID,
                type: "dvm_job_history",
                title: "DVM Job History & Stats",
                x: x,
                y: y,
                width: width,
                height: height,
                dismissable: true,
                content: {},
              };
            },
          }),
    }),
    {
      name: "commander-pane-storage-v5", // v5: Persist pane content including session IDs
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
        closedPanePositions: state.closedPanePositions,
      }),
      merge: (persistedState, currentState) => {
        // Restore persisted state while preserving all methods
        const merged = {
          ...currentState,
          ...(persistedState as Partial<PaneState>),
        };
        
        // Ensure we have valid arrays/objects even if persisted state is corrupted
        if (!Array.isArray(merged.panes)) {
          merged.panes = [];
        }
        if (!merged.closedPanePositions || typeof merged.closedPanePositions !== 'object') {
          merged.closedPanePositions = {};
        }
        
        return merged;
      },
    },
  ),
);
