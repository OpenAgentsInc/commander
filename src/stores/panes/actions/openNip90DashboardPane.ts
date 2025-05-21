// src/stores/panes/actions/openNip90DashboardPane.ts
import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";

export const NIP90_DASHBOARD_PANE_ID = "nip90-dashboard";

/**
 * Opens the NIP-90 DVM dashboard pane.
 * If the pane already exists, it brings it to the front and activates it.
 * If the pane doesn't exist, it creates a new one.
 */
export function openNip90DashboardPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(
      (p) => p.id === NIP90_DASHBOARD_PANE_ID,
    );
    if (existingPane) {
      // Bring to front and activate if already exists
      const newPanes = state.panes
        .map((p) => ({ ...p, isActive: p.id === NIP90_DASHBOARD_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1)); // Active last for z-index

      return {
        ...state,
        panes: newPanes,
        activePaneId: NIP90_DASHBOARD_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height,
        },
      };
    }

    // Add new pane
    const newPaneInput: PaneInput = {
      id: NIP90_DASHBOARD_PANE_ID,
      type: "nip90_dashboard",
      title: "NIP-90 DVM Dashboard",
      dismissable: true, // Allow closing
      // Default position/size will be calculated by addPaneActionLogic
    };

    const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling
    return { ...state, ...changes };
  });
}
