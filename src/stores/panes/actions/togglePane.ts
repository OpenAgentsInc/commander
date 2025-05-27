import type { PaneInput } from "@/types/pane";
import type { SetPaneStore, GetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";

/**
 * Generic toggle pane action that handles the common logic for all toggle operations
 * 
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param paneId - ID of the pane to toggle
 * @param createPaneInput - Function that creates the PaneInput for new panes
 */
export const togglePaneGeneric = (
  set: SetPaneStore,
  get: GetPaneStore,
  paneId: string,
  createPaneInput: () => PaneInput
) => {
  set((state) => {
    const existingPane = state.panes.find((p) => p.id === paneId);

    // If the pane exists
    if (existingPane) {
      // If it's already the active pane, close it
      if (state.activePaneId === paneId) {
        const remainingPanes = state.panes.filter(
          (pane) => pane.id !== paneId
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
          (p) => p.id !== paneId
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
      const newPaneInput = createPaneInput();
      return addPaneActionLogic(state, newPaneInput, false);
    }
  });
};

/**
 * Helper function to get screen dimensions
 */
export const getScreenDimensions = () => {
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
  return { screenWidth, screenHeight };
};