import { type SetPaneStore, type GetPaneStore } from "../types";
import { openNewCoderPaneAction } from "./openNewCoderPane";
import { Pane } from "@/types/pane";

export const toggleAllCoderPanesAction = (set: SetPaneStore, get: GetPaneStore) => {
  const state = get();
  
  // Find all coder panes
  const coderPanes = state.panes.filter(p => p.type === "coder");
  
  if (coderPanes.length === 0) {
    // No coder panes exist, create a new one
    openNewCoderPaneAction(set, get);
    return;
  }
  
  // Check if any coder pane is currently active/visible
  const hasActiveCoderPane = coderPanes.some(p => p.id === state.activePaneId);
  
  if (hasActiveCoderPane) {
    // Hide all coder panes
    const coderPaneIds = new Set(coderPanes.map(p => p.id));
    const remainingPanes = state.panes.filter(p => !coderPaneIds.has(p.id));
    
    // Find new active pane (last non-coder pane)
    let newActivePaneId: string | null = null;
    if (remainingPanes.length > 0) {
      newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
    }
    
    // Save positions of all coder panes before removing them
    const updatedClosedPanePositions = { ...state.closedPanePositions };
    coderPanes.forEach(pane => {
      updatedClosedPanePositions[pane.id] = {
        x: pane.x,
        y: pane.y,
        width: pane.width,
        height: pane.height,
        content: pane.content,
        shouldRestore: true,
      };
    });
    
    // Update panes
    const updatedPanes = remainingPanes.map(p => ({
      ...p,
      isActive: p.id === newActivePaneId,
    }));
    
    set({
      panes: updatedPanes,
      activePaneId: newActivePaneId,
      closedPanePositions: updatedClosedPanePositions,
    });
  } else {
    // Show all previously hidden coder panes
    const restoredPanes: Pane[] = [];
    
    for (const [paneId, storedData] of Object.entries(state.closedPanePositions)) {
      // Check if this is a coder pane by ID pattern
      if (paneId.startsWith('coder_pane_') && storedData.shouldRestore) {
        restoredPanes.push({
          id: paneId,
          type: "coder",
          title: "Claude Code",
          x: storedData.x,
          y: storedData.y,
          width: storedData.width,
          height: storedData.height,
          isActive: false,
          dismissable: true,
          content: storedData.content || {},
        });
      }
    }
    
    if (restoredPanes.length > 0) {
      // Remove restored panes from closedPanePositions
      const updatedClosedPanePositions = { ...state.closedPanePositions };
      restoredPanes.forEach(pane => {
        delete updatedClosedPanePositions[pane.id];
      });
      
      // Make the last restored pane active
      const lastRestoredPane = restoredPanes[restoredPanes.length - 1];
      lastRestoredPane.isActive = true;
      
      // Deactivate current panes
      const updatedExistingPanes = state.panes.map(p => ({ ...p, isActive: false }));
      
      set({
        panes: [...updatedExistingPanes, ...restoredPanes],
        activePaneId: lastRestoredPane.id,
        closedPanePositions: updatedClosedPanePositions,
      });
    } else {
      // No hidden coder panes to restore, create a new one
      openNewCoderPaneAction(set, get);
    }
  }
};