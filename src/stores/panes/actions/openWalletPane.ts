import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import { WALLET_PANE_ID, WALLET_PANE_TITLE } from "../constants";

export function openWalletPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find((p) => p.id === WALLET_PANE_ID);
    if (existingPane) {
      const newPanes = state.panes
        .map((p) => ({ ...p, isActive: p.id === WALLET_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Active last for z-index
      return {
        ...state,
        panes: newPanes,
        activePaneId: WALLET_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height,
        },
      };
    }

    const newPaneInput: PaneInput = {
      id: WALLET_PANE_ID,
      type: "wallet",
      title: WALLET_PANE_TITLE,
      dismissable: true,
      width: 450, // Default width for wallet pane
      height: 550, // Default height for wallet pane
    };
    const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling
    return { ...state, ...changes };
  });
}
