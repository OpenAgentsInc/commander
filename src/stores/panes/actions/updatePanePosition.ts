import { PaneStoreType } from "../types";
import { ensurePaneIsVisible } from "../utils/ensurePaneIsVisible";

// Use any to bypass strict type checking for this function
export function updatePanePositionAction(
  set: any,
  id: string,
  x: number,
  y: number,
) {
  set((state: PaneStoreType) => {
    let updatedPaneRef: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    const newPanes = state.panes.map((pane) => {
      if (pane.id === id) {
        const updated = ensurePaneIsVisible({ ...pane, x, y });
        updatedPaneRef = {
          x: updated.x,
          y: updated.y,
          width: updated.width,
          height: updated.height,
        };
        return updated;
      }
      return pane;
    });
    return {
      panes: newPanes,
      lastPanePosition: updatedPaneRef || state.lastPanePosition,
    };
  });
}
