import { Pane } from "@/types/pane";
import { type SetPaneStore, type GetPaneStore } from "../types";
import { 
  CODER_PANE_ID,
  CODER_PANE_TITLE,
  PANE_MARGIN 
} from "../constants";

export const openNewCoderPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
  const state = get();
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
  
  // Find existing coder panes to offset the new one
  const existingCoderPanes = state.panes.filter(p => p.type === "coder");
  const offset = existingCoderPanes.length * 30;
  
  const width = Math.floor(screenWidth * 0.45);
  const height = Math.floor(screenHeight * 0.85);
  const x = Math.floor((screenWidth - width) / 2) + offset;
  const y = PANE_MARGIN + 10 + offset;
  
  // Generate a unique ID and session ID for this new coder pane
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const paneId = `coder_pane_${timestamp}`;
  const sessionId = `ui-coder-${timestamp}-${random}`;
  
  const newPane: Pane = {
    id: paneId,
    type: "coder",
    title: CODER_PANE_TITLE,
    x: Math.min(x, screenWidth - width - PANE_MARGIN), // Ensure it stays on screen
    y: Math.min(y, screenHeight - height - PANE_MARGIN),
    width: width,
    height: height,
    isActive: true,
    dismissable: true,
    content: { sessionId },
  };
  
  // Deactivate all other panes
  const updatedPanes = state.panes.map(p => ({ ...p, isActive: false }));
  
  set({
    panes: [...updatedPanes, newPane],
    activePaneId: newPane.id,
    lastPanePosition: {
      x: newPane.x,
      y: newPane.y,
      width: newPane.width,
      height: newPane.height,
    },
  });
};