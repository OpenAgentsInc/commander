import { PaneStoreType } from "../types";

// Use any to bypass strict type checking for this function
export function removePaneAction(set: any, id: string) {
  set((state: PaneStoreType) => {
    // Find the pane being removed to save its position
    const paneToRemove = state.panes.find((pane) => pane.id === id);
    
    const remainingPanes = state.panes.filter((pane) => pane.id !== id);
    let newActivePaneId: string | null = null;

    if (state.activePaneId === id) {
      if (remainingPanes.length > 0) {
        newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
      }
    } else {
      newActivePaneId = state.activePaneId;
    }

    const finalPanes = remainingPanes.map((p) => ({
      ...p,
      isActive: p.id === newActivePaneId,
    }));

    // Save the position and content of the removed pane if it exists
    const updatedClosedPanePositions = { ...state.closedPanePositions };
    if (paneToRemove) {
      updatedClosedPanePositions[id] = {
        x: paneToRemove.x,
        y: paneToRemove.y,
        width: paneToRemove.width,
        height: paneToRemove.height,
        content: paneToRemove.content, // Save content including sessionId
        shouldRestore: false, // Explicitly closed with X, don't restore on toggle
      };
    }

    return {
      panes: finalPanes,
      activePaneId: newActivePaneId,
      closedPanePositions: updatedClosedPanePositions,
    };
  });
}
