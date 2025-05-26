import { type WritableDraft } from "immer";
import { type PaneInput, type PaneStoreType } from "@/types/pane";
import { SetPaneStore } from "../types";
import { 
  CODER_PANE_ID, 
  CODER_PANE_TITLE,
  PANE_MARGIN
} from "../constants";

export const openCoderPaneAction = (
  set: SetPaneStore,
) => {
  set((draft: WritableDraft<PaneStoreType>) => {
    const existingPane = draft.panes.find((p) => p.id === CODER_PANE_ID);
    
    if (existingPane) {
      // If pane exists, bring it to front and make it active
      const index = draft.panes.findIndex((p) => p.id === CODER_PANE_ID);
      if (index !== -1) {
        draft.panes.push(draft.panes.splice(index, 1)[0]);
        draft.activePaneId = CODER_PANE_ID;
      }
    } else {
      // Get screen dimensions
      const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
      const screenHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
      
      // Calculate fullscreen-ish dimensions (leave some margin for the window chrome)
      const width = screenWidth - (PANE_MARGIN * 2);
      const height = screenHeight - (PANE_MARGIN * 2) - 100; // Extra space for title bar and hotbar
      
      // Create new coder pane
      const newPane: PaneInput = {
        id: CODER_PANE_ID,
        type: "coder",
        title: CODER_PANE_TITLE,
        x: PANE_MARGIN,
        y: PANE_MARGIN,
        width: width,
        height: height,
        isActive: true,
        dismissable: true,
        content: {},
      };
      
      draft.panes.push(newPane);
      draft.activePaneId = CODER_PANE_ID;
    }
  });
};

export const toggleCoderPaneAction = (
  set: SetPaneStore,
  get: () => PaneStoreType,
) => {
  const state = get();
  const existingPane = state.panes.find((p) => p.id === CODER_PANE_ID);
  
  if (existingPane) {
    // If pane exists, remove it
    set((draft: WritableDraft<PaneStoreType>) => {
      draft.panes = draft.panes.filter((p) => p.id !== CODER_PANE_ID);
      if (draft.activePaneId === CODER_PANE_ID) {
        draft.activePaneId = draft.panes.length > 0 ? draft.panes[draft.panes.length - 1].id : null;
      }
    });
  } else {
    // If pane doesn't exist, open it
    openCoderPaneAction(set);
  }
};