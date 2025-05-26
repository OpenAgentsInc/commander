import { type PaneStoreType, type SetPaneStore, type GetPaneStore } from "../types";
import { openCodingCommandPaneAction } from "./openCodingCommandPane";
import { CODING_COMMAND_PANE_ID } from "../constants";

export function toggleCodingCommandPaneAction(
  set: SetPaneStore,
  get: GetPaneStore,
) {
  const state = get();
  const existingPane = state.panes.find((p) => p.id === CODING_COMMAND_PANE_ID);

  if (existingPane) {
    // If it's already the active pane, close it
    if (state.activePaneId === CODING_COMMAND_PANE_ID) {
      set((state: PaneStoreType) => {
        const remainingPanes = state.panes.filter((pane) => pane.id !== CODING_COMMAND_PANE_ID);
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
      });
    } else {
      // If it exists but isn't active, bring it to front
      set((state: PaneStoreType) => {
        const paneIndex = state.panes.findIndex((p) => p.id === CODING_COMMAND_PANE_ID);
        if (paneIndex === -1) return state;
        
        const newPanes = [...state.panes];
        const [targetPane] = newPanes.splice(paneIndex, 1);
        newPanes.push(targetPane);
        
        const updatedPanes = newPanes.map((p) => ({
          ...p,
          isActive: p.id === CODING_COMMAND_PANE_ID,
        }));
        
        return {
          ...state,
          panes: updatedPanes,
          activePaneId: CODING_COMMAND_PANE_ID,
        };
      });
    }
  } else {
    // If it doesn't exist, open it
    openCodingCommandPaneAction(set);
  }
}