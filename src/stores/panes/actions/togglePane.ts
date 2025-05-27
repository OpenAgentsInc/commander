import { type PaneStoreType, type SetPaneStore, type GetPaneStore } from "../types";
import { type PaneInput } from "@/types/pane";
import { addPaneActionLogic } from "./addPane";
import { PANE_MARGIN } from "../constants";

interface TogglePaneConfig {
  paneId: string;
  createPaneInput: (screenWidth: number, screenHeight: number, storedData?: { x: number; y: number; width: number; height: number; content?: any }) => PaneInput;
}

export function togglePaneAction(
  set: SetPaneStore,
  get: GetPaneStore,
  config: TogglePaneConfig
) {
  const state = get(); // Get current state
  const { paneId, createPaneInput } = config;
  const existingPane = state.panes.find((p) => p.id === paneId);

  // If the pane exists
  if (existingPane) {
    // If it's already the active pane, close it
    if (state.activePaneId === paneId) {
      const paneToClose = existingPane;
      const remainingPanes = state.panes.filter((pane) => pane.id !== paneId);
      let newActivePaneId: string | null = null;
      if (remainingPanes.length > 0) {
        newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
      }
      const updatedPanes = remainingPanes.map((p) => ({
        ...p,
        isActive: p.id === newActivePaneId,
      }));

      // Save the position and content before closing
      const updatedClosedPanePositions = { ...state.closedPanePositions };
      updatedClosedPanePositions[paneId] = {
        x: paneToClose.x,
        y: paneToClose.y,
        width: paneToClose.width,
        height: paneToClose.height,
        content: paneToClose.content, // Save content including sessionId
        shouldRestore: true, // Toggled closed, should restore on next toggle
      };

      set({
        panes: updatedPanes,
        activePaneId: newActivePaneId,
        closedPanePositions: updatedClosedPanePositions,
      });
    }
    // If it exists but isn't active, bring it to front
    else {
      // Move the pane to the end of the array to bring it to the front
      const panesWithoutTarget = state.panes.filter((p) => p.id !== paneId);
      const updatedTargetPane = { ...existingPane, isActive: true };
      const updatedOtherPanes = panesWithoutTarget.map((p) => ({
        ...p,
        isActive: false,
      }));

      set({
        panes: [...updatedOtherPanes, updatedTargetPane],
        activePaneId: paneId,
      });
    }
  } else {
    // Pane doesn't exist, create it
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

    // Check if we have a stored position for this pane
    const storedData = state.closedPanePositions[paneId];
    let paneInputParams: PaneInput;

    if (storedData && storedData.shouldRestore !== false) {
      // Use content from storedData when creating pane input
      console.log(`[TogglePane] Restoring pane ${paneId} with content:`, storedData.content);
      paneInputParams = createPaneInput(screenWidth, screenHeight, storedData);
    } else {
      paneInputParams = createPaneInput(screenWidth, screenHeight);
    }

    if (!paneInputParams.id) {
      paneInputParams.id = paneId;
    }

    // Create the pane using addPaneActionLogic
    const newStatePartial = addPaneActionLogic(state, paneInputParams, false);
    
    // Remove the stored position since we're using it now
    const updatedClosedPanePositions = { ...state.closedPanePositions };
    if (storedData && storedData.shouldRestore !== false) {
      delete updatedClosedPanePositions[paneId]; // Remove after restoring
    }
    
    set({
      ...newStatePartial,
      closedPanePositions: updatedClosedPanePositions,
    });
  }
}