import { Pane } from "@/types/pane";
import { type SetPaneStore, type GetPaneStore } from "../types";
import { 
  CODER_PANE_ID,
  CODER_PANE_TITLE,
  PANE_MARGIN 
} from "../constants";

export const toggleAllCoderPanesAction = (set: SetPaneStore, get: GetPaneStore) => {
  const state = get();
    // Check if ANY coder panes exist
    const coderPanes = state.panes.filter(p => p.type === "coder");
    
    if (coderPanes.length > 0) {
      // Close ALL coder panes
      const remainingPanes = state.panes.filter(p => p.type !== "coder");
      
      // Save positions AND content (including sessionId) of all coder panes being closed
      const newClosedPositions = { ...state.closedPanePositions };
      coderPanes.forEach(pane => {
        newClosedPositions[pane.id] = {
          x: pane.x,
          y: pane.y,
          width: pane.width,
          height: pane.height,
          content: pane.content, // Save the session ID and any other content
          shouldRestore: true, // Toggled closed, should restore on next toggle
        };
      });
      
      // Determine new active pane
      let newActivePaneId = state.activePaneId;
      if (coderPanes.some(p => p.id === state.activePaneId)) {
        // If active pane is a coder pane, activate the last remaining pane
        newActivePaneId = remainingPanes.length > 0 
          ? remainingPanes[remainingPanes.length - 1].id 
          : null;
      }
      
      // Also mark remaining panes' active state correctly
      const finalPanes = remainingPanes.map(p => ({
        ...p,
        isActive: p.id === newActivePaneId
      }));
      
      set({
        panes: finalPanes,
        activePaneId: newActivePaneId,
        closedPanePositions: newClosedPositions,
      });
    } else {
      // No coder panes exist, restore ALL previously closed coder panes
      const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
      
      // Find all closed coder panes that should be restored
      const closedCoderPaneIds = Object.keys(state.closedPanePositions).filter(id => {
        const paneData = state.closedPanePositions[id];
        return (id === CODER_PANE_ID || id.startsWith('coder_pane_')) && 
               paneData.shouldRestore !== false; // Only restore if shouldRestore is true or undefined (for backwards compatibility)
      });
      
      // Deactivate all existing panes
      const updatedPanes = state.panes.map(p => ({ ...p, isActive: false }));
      const newClosedPositions = { ...state.closedPanePositions };
      const restoredPanes: Pane[] = [];
      
      if (closedCoderPaneIds.length > 0) {
        // Restore all closed coder panes
        closedCoderPaneIds.forEach((paneId, index) => {
          const storedData = state.closedPanePositions[paneId];
          let { x, y, width, height } = storedData;
          
          // Ensure the pane is still visible on screen (in case window was resized)
          x = Math.max(PANE_MARGIN, Math.min(x, screenWidth - 100));
          y = Math.max(PANE_MARGIN, Math.min(y, screenHeight - 100));
          width = Math.min(width, screenWidth - x - PANE_MARGIN);
          height = Math.min(height, screenHeight - y - PANE_MARGIN);
          
          // Offset each pane slightly so they don't all stack on top of each other
          x = x + (index * 30);
          y = y + (index * 30);
          
          const restoredContent = storedData.content || { sessionId: `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` };
          
          const restoredPane: Pane = {
            id: paneId,
            type: "coder",
            title: CODER_PANE_TITLE,
            x: x,
            y: y,
            width: width,
            height: height,
            isActive: index === closedCoderPaneIds.length - 1, // Make the last one active
            dismissable: true,
            content: restoredContent,
          };
          
          restoredPanes.push(restoredPane);
          
          // Remove from closed positions
          delete newClosedPositions[paneId];
        });
      } else {
        // No closed coder panes, create a new one with default position
        const width = Math.floor(screenWidth * 0.45);
        const height = Math.floor(screenHeight * 0.85);
        const x = Math.floor((screenWidth - width) / 2);
        const y = PANE_MARGIN + 10;
        
        // Generate a unique UI session ID for this coder pane instance
        const sessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        const newPane: Pane = {
          id: CODER_PANE_ID,
          type: "coder",
          title: CODER_PANE_TITLE,
          x: x,
          y: y,
          width: width,
          height: height,
          isActive: true,
          dismissable: true,
          content: { sessionId },
        };
        
        restoredPanes.push(newPane);
      }
      
      const lastPane = restoredPanes[restoredPanes.length - 1];
      
      set({
        panes: [...updatedPanes, ...restoredPanes],
        activePaneId: lastPane.id,
        lastPanePosition: {
          x: lastPane.x,
          y: lastPane.y,
          width: lastPane.width,
          height: lastPane.height,
        },
        closedPanePositions: newClosedPositions,
      });
    }
};