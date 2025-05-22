import { PaneStoreType } from "../types";

// Use any to bypass strict type checking for this function
export function removePaneAction(set: any, id: string) {
  set((state: PaneStoreType) => {
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

    return {
      panes: finalPanes,
      activePaneId: newActivePaneId,
    };
  });
}
