import { PaneInput } from "@/types/pane";
import { PaneStoreType, SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  DEFAULT_PANE_WIDTH,
  DEFAULT_PANE_HEIGHT,
  PANE_MARGIN,
} from "../constants";

export const SELL_COMPUTE_PANE_ID = "sell_compute";

export function openSellComputePaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find((p) => p.id === SELL_COMPUTE_PANE_ID);
    if (existingPane) {
      // Bring to front and activate if already exists
      const newPanes = state.panes
        .map((p) => ({ ...p, isActive: p.id === SELL_COMPUTE_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Sort to bring active pane to end of array (higher z-index)

      return {
        ...state,
        panes: newPanes,
        activePaneId: SELL_COMPUTE_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height,
        },
      };
    }

    // Calculate centered position for the new pane
    const paneWidth = Math.max(DEFAULT_PANE_WIDTH, 500); // Larger default
    const paneHeight = Math.max(DEFAULT_PANE_HEIGHT, 400); // Larger default
    const screenWidth =
      typeof window !== "undefined" ? window.innerWidth : 1920;
    const screenHeight =
      typeof window !== "undefined" ? window.innerHeight : 1080;

    const initialX = Math.max(PANE_MARGIN, (screenWidth - paneWidth) / 2);
    const initialY = Math.max(PANE_MARGIN, (screenHeight - paneHeight) / 3); // A bit higher than center

    const newPaneInput: PaneInput = {
      id: SELL_COMPUTE_PANE_ID,
      type: "sell_compute",
      title: "Sell Compute",
      dismissable: true,
      x: initialX,
      y: initialY,
      width: paneWidth,
      height: paneHeight,
    };

    // Pass false for shouldTile to use the specific x,y provided
    const changes = addPaneActionLogic(state, newPaneInput, false);

    if (changes.panes && changes.activePaneId) {
      changes.panes = changes.panes.map((p) => ({
        ...p,
        isActive: p.id === changes.activePaneId,
      }));
    }

    return { ...state, ...changes };
  });
}
