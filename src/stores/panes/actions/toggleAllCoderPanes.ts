import { type SetPaneStore, type GetPaneStore } from "../types";
import { openNewCoderPaneAction } from "./openNewCoderPane";
import { Pane } from "@/types/pane";
import { CODER_PANE_TITLE } from "../constants";

export const toggleAllCoderPanesAction = (set: SetPaneStore, get: GetPaneStore) => {
  const state = get();
  
  console.log('[coder_pa toggleAllCoderPanes] Current state:', {
    panesCount: state.panes.length,
    panes: state.panes.map(p => ({ id: p.id, type: p.type, content: p.content })),
    activePaneId: state.activePaneId,
    closedPanePositions: Object.keys(state.closedPanePositions)
  });
  
  // Find all coder panes
  const coderPanes = state.panes.filter(p => p.type === "coder");
  
  console.log('[coder_pa toggleAllCoderPanes] Found coder panes:', coderPanes.length, coderPanes.map(p => p.id));
  
  if (coderPanes.length === 0) {
    // No coder panes exist, create a new one
    console.log('[coder_pa toggleAllCoderPanes] No coder panes found, creating new one');
    openNewCoderPaneAction(set, get);
    return;
  }
  
  // Check if any coder pane is currently active/visible
  const hasActiveCoderPane = coderPanes.some(p => p.id === state.activePaneId);
  
  console.log('[coder_pa toggleAllCoderPanes] Has active coder pane:', hasActiveCoderPane);
  
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
      console.log(`[coder_pa toggleAllCoderPanes] Saving pane ${pane.id} to closedPanePositions with content:`, pane.content);
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
    console.log('[coder_pa toggleAllCoderPanes] Attempting to restore coder panes from closedPanePositions');
    const restoredPanes: Pane[] = [];
    
    for (const [paneId, storedData] of Object.entries(state.closedPanePositions)) {
      console.log(`[coder_pa toggleAllCoderPanes] Checking ${paneId}, starts with coder_pane_: ${paneId.startsWith('coder_pane_')}, shouldRestore: ${storedData.shouldRestore}`);
      // Check if this is a coder pane by ID pattern
      if (paneId.startsWith('coder_pane_') && storedData.shouldRestore) {
        console.log(`[coder_pa toggleAllCoderPanes] Restoring pane ${paneId} with content:`, storedData.content);
        restoredPanes.push({
          id: paneId,
          type: "coder",
          // Restore title from content if available, else use default.
          // The title should be part of storedData.content if saved correctly in Step 1.
          title: (storedData.content as any)?.title || CODER_PANE_TITLE,
          x: storedData.x,
          y: storedData.y,
          width: storedData.width,
          height: storedData.height,
          isActive: false,
          dismissable: true,
          content: storedData.content || { sessionId: `ui-coder-restored-${Date.now()}` }, // Restore full content
        });
      }
    }
    
    console.log(`[coder_pa toggleAllCoderPanes] Found ${restoredPanes.length} panes to restore`);
    
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
      
      console.log('[coder_pa toggleAllCoderPanes] Setting state with restored panes');
      set({
        panes: [...updatedExistingPanes, ...restoredPanes],
        activePaneId: lastRestoredPane.id,
        closedPanePositions: updatedClosedPanePositions,
      });
    } else {
      // No hidden coder panes to restore, create a new one
      console.log('[coder_pa toggleAllCoderPanes] No hidden coder panes to restore, creating new one');
      openNewCoderPaneAction(set, get);
    }
  }
};