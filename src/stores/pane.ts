import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  addPaneActionLogic,
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
  openNip90GlobalFeedPaneAction,
  openWalletPaneAction,
  // New page pane actions
  openSecondPagePaneAction,
  openWalletSetupPaneAction,
  openSeedPhraseBackupPaneAction,
  openRestoreWalletPaneAction,
  // Agent chat pane actions
  openAgentChatPaneAction,
  toggleAgentChatPaneAction,
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
} from "./panes/constants";
import { DVM_JOB_HISTORY_PANE_ID } from "./panes/actions/openDvmJobHistoryPane";

// Function to get initial panes
const getInitialPanes = (): Pane[] => {
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const screenHeight =
    typeof window !== "undefined" ? window.innerHeight : 1080;

  // Only return the Sell Compute pane for focused "Compute Market" launch
  return [
    {
      id: SELL_COMPUTE_PANE_ID_CONST,
      type: "sell_compute",
      title: "Sell Compute",
      x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
      y: Math.max(
        PANE_MARGIN,
        (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3,
      ),
      width: SELL_COMPUTE_INITIAL_WIDTH,
      height: SELL_COMPUTE_INITIAL_HEIGHT,
      isActive: true,
      dismissable: true,
      content: {},
    },
  ];
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST,
  lastPanePosition: null, // Will be set below
};

const sellComputePaneInitial = initialState.panes.find(
  (p) => p.id === SELL_COMPUTE_PANE_ID_CONST,
);
if (sellComputePaneInitial) {
  initialState.lastPanePosition = {
    x: sellComputePaneInitial.x,
    y: sellComputePaneInitial.y,
    width: sellComputePaneInitial.width,
    height: sellComputePaneInitial.height,
  };
}

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
      toggleAgentChatPane: () => toggleAgentChatPaneAction(set, get),
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
        };

        // Apply the new state
        console.log("Resetting HUD to initial state", newInitialState);
        set(newInitialState);
      },

      // Toggle actions for keyboard shortcuts
      toggleSellComputePane: () =>
        set((state) => {
          const paneId = SELL_COMPUTE_PANE_ID_CONST;
          const existingPane = state.panes.find((p) => p.id === paneId);

          // If the pane exists
          if (existingPane) {
            // If it's already the active pane, close it
            if (state.activePaneId === paneId) {
              const remainingPanes = state.panes.filter(
                (pane) => pane.id !== paneId,
              );
              let newActivePaneId: string | null = null;
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
              const updatedPanes = remainingPanes.map((p) => ({
                ...p,
                isActive: p.id === newActivePaneId,
              }));

              return {
                ...state,
                panes: updatedPanes,
                activePaneId: newActivePaneId,
              };
            }
            // If it exists but isn't active, bring it to front
            else {
              // Move the pane to the end of the array to bring it to the front
              const panesWithoutTarget = state.panes.filter(
                (p) => p.id !== paneId,
              );
              const updatedTargetPane = { ...existingPane, isActive: true };
              const updatedOtherPanes = panesWithoutTarget.map((p) => ({
                ...p,
                isActive: false,
              }));

              return {
                ...state,
                panes: [...updatedOtherPanes, updatedTargetPane],
                activePaneId: paneId,
              };
            }
          } else {
            // Pane doesn't exist, create it
            const screenWidth =
              typeof window !== "undefined" ? window.innerWidth : 1920;
            const screenHeight =
              typeof window !== "undefined" ? window.innerHeight : 1080;

            const newPaneInput: PaneInput = {
              id: paneId,
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
              dismissable: true,
              content: {},
            };

            return addPaneActionLogic(state, newPaneInput, false);
          }
        }),

      toggleWalletPane: () =>
        set((state) => {
          const paneId = WALLET_PANE_ID;
          const existingPane = state.panes.find((p) => p.id === paneId);

          // If the pane exists
          if (existingPane) {
            // If it's already the active pane, close it
            if (state.activePaneId === paneId) {
              const remainingPanes = state.panes.filter(
                (pane) => pane.id !== paneId,
              );
              let newActivePaneId: string | null = null;
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
              const updatedPanes = remainingPanes.map((p) => ({
                ...p,
                isActive: p.id === newActivePaneId,
              }));

              return {
                ...state,
                panes: updatedPanes,
                activePaneId: newActivePaneId,
              };
            }
            // If it exists but isn't active, bring it to front
            else {
              // Move the pane to the end of the array to bring it to the front
              const panesWithoutTarget = state.panes.filter(
                (p) => p.id !== paneId,
              );
              const updatedTargetPane = { ...existingPane, isActive: true };
              const updatedOtherPanes = panesWithoutTarget.map((p) => ({
                ...p,
                isActive: false,
              }));

              return {
                ...state,
                panes: [...updatedOtherPanes, updatedTargetPane],
                activePaneId: paneId,
              };
            }
          } else {
            // Pane doesn't exist, create it
            const screenWidth =
              typeof window !== "undefined" ? window.innerWidth : 1920;
            const screenHeight =
              typeof window !== "undefined" ? window.innerHeight : 1080;

            const newPaneInput: PaneInput = {
              id: paneId,
              type: "wallet",
              title: WALLET_PANE_TITLE,
              x: Math.max(PANE_MARGIN, (screenWidth - 450) / 2 + 50),
              y: Math.max(PANE_MARGIN, (screenHeight - 550) / 3 + 50),
              width: 450,
              height: 550,
              dismissable: true,
              content: {},
            };

            return addPaneActionLogic(state, newPaneInput, false);
          }
        }),

      toggleDvmJobHistoryPane: () =>
        set((state) => {
          const paneId = DVM_JOB_HISTORY_PANE_ID;
          const existingPane = state.panes.find((p) => p.id === paneId);

          // If the pane exists
          if (existingPane) {
            // If it's already the active pane, close it
            if (state.activePaneId === paneId) {
              const remainingPanes = state.panes.filter(
                (pane) => pane.id !== paneId,
              );
              let newActivePaneId: string | null = null;
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
              const updatedPanes = remainingPanes.map((p) => ({
                ...p,
                isActive: p.id === newActivePaneId,
              }));

              return {
                ...state,
                panes: updatedPanes,
                activePaneId: newActivePaneId,
              };
            }
            // If it exists but isn't active, bring it to front
            else {
              // Move the pane to the end of the array to bring it to the front
              const panesWithoutTarget = state.panes.filter(
                (p) => p.id !== paneId,
              );
              const updatedTargetPane = { ...existingPane, isActive: true };
              const updatedOtherPanes = panesWithoutTarget.map((p) => ({
                ...p,
                isActive: false,
              }));

              return {
                ...state,
                panes: [...updatedOtherPanes, updatedTargetPane],
                activePaneId: paneId,
              };
            }
          } else {
            // Pane doesn't exist, create it
            const screenWidth =
              typeof window !== "undefined" ? window.innerWidth : 1920;
            const screenHeight =
              typeof window !== "undefined" ? window.innerHeight : 1080;

            const newPaneInput: PaneInput = {
              id: paneId,
              type: "dvm_job_history",
              title: "DVM Job History & Stats",
              x: Math.max(PANE_MARGIN, (screenWidth - 800) / 2 - 50),
              y: Math.max(PANE_MARGIN, (screenHeight - 600) / 3 - 50),
              width: 800,
              height: 600,
              dismissable: true,
              content: {},
            };

            return addPaneActionLogic(state, newPaneInput, false);
          }
        }),
    }),
    {
      name: "commander-pane-storage-v3", // v3: Reset to remove wallet setup panes
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        // For the focused "Compute Market" launch, we'll force the initial state
        // to have just the Sell Compute pane
        const defaultInitialPanes = getInitialPanes();
        const defaultActiveId = SELL_COMPUTE_PANE_ID_CONST;
        const defaultSellComputePane = defaultInitialPanes.find(
          (p) => p.id === SELL_COMPUTE_PANE_ID_CONST,
        );

        // Start with a clean initial state (ignoring persisted state)
        // This ensures we only have Sell Compute pane visible on startup
        return {
          ...currentState,
          panes: defaultInitialPanes,
          activePaneId: defaultActiveId,
          lastPanePosition: defaultSellComputePane
            ? {
              x: defaultSellComputePane.x,
              y: defaultSellComputePane.y,
              width: defaultSellComputePane.width,
              height: defaultSellComputePane.height,
            }
            : null,
        };
      },
    },
  ),
);
