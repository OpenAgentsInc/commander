import { PaneStoreType } from "../types";
import { PaneInput } from "@/types/pane";
import { addPaneActionLogic } from "./addPane";
import { PANE_MARGIN } from "../constants";

interface TogglePaneConfig {
  paneId: string;
  createPaneInput: (screenWidth: number, screenHeight: number, storedPosition?: { x: number; y: number; width: number; height: number; content?: any }) => PaneInput;
}

export function togglePaneAction(
  set: any,
  state: PaneStoreType,
  config: TogglePaneConfig
) {
  const { paneId, createPaneInput } = config;
  const existingPane = state.panes.find((p) => p.id === paneId);

  // If the pane exists
  if (existingPane) {
    // If it's already the active pane, close it
    if (state.activePaneId === paneId) {
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
        x: existingPane.x,
        y: existingPane.y,
        width: existingPane.width,
        height: existingPane.height,
        content: existingPane.content, // Save content including sessionId
        shouldRestore: true, // Toggled closed, should restore on next toggle
      };

      return {
        ...state,
        panes: updatedPanes,
        activePaneId: newActivePaneId,
        closedPanePositions: updatedClosedPanePositions,
      };
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

      return {
        ...state,
        panes: [...updatedOtherPanes, updatedTargetPane],
        activePaneId: paneId,
      };
    }
  } else {
    // Pane doesn't exist, create it
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

    // Check if we have a stored position for this pane
    const storedPosition = state.closedPanePositions[paneId];

    const newPaneInput = createPaneInput(screenWidth, screenHeight, storedPosition);

    // Create the pane
    const newState = addPaneActionLogic(state, newPaneInput, false);
    
    // Remove the stored position since we're using it now
    if (storedPosition) {
      const { [paneId]: _, ...remainingPositions } = state.closedPanePositions;
      return {
        ...newState,
        closedPanePositions: remainingPositions,
      };
    }
    
    return newState;
  }
}