import { PaneStoreType, SetPaneStore } from "../types";

// Use any to bypass strict type checking for this function
export function bringPaneToFrontAction(set: any, idToBringToFront: string) {
  set((state: PaneStoreType) => {
    const paneIndex = state.panes.findIndex(
      (pane) => pane.id === idToBringToFront,
    );
    if (paneIndex === -1) return state; // Pane not found

    // If already active and in the correct z-index position (last in array), no change needed
    if (
      state.activePaneId === idToBringToFront &&
      paneIndex === state.panes.length - 1
    ) {
      return state;
    }

    // Create a new array with the target pane moved to the end (highest z-index)
    const paneToActivate = state.panes[paneIndex];
    const otherPanes = state.panes.filter((p) => p.id !== idToBringToFront);

    // Update isActive flags: false for all other panes, true for the active one
    const updatedPanes = otherPanes.map((p) =>
      p.isActive ? { ...p, isActive: false } : p,
    );

    // Add the active pane at the end with isActive=true
    const newPanes = [...updatedPanes, { ...paneToActivate, isActive: true }];

    return {
      ...state,
      panes: newPanes,
      activePaneId: idToBringToFront,
    };
  });
}
