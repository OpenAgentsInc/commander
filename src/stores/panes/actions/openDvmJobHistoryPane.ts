// src/stores/panes/actions/openDvmJobHistoryPane.ts
import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";

export const DVM_JOB_HISTORY_PANE_ID = "dvm_job_history";

export function openDvmJobHistoryPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(
      (p) => p.id === DVM_JOB_HISTORY_PANE_ID,
    );
    if (existingPane) {
      const newPanes = state.panes
        .map((p) => ({ ...p, isActive: p.id === DVM_JOB_HISTORY_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1)); // Active last
      return {
        ...state,
        panes: newPanes,
        activePaneId: DVM_JOB_HISTORY_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height,
        },
      };
    }

    const newPaneInput: PaneInput = {
      id: DVM_JOB_HISTORY_PANE_ID,
      type: "dvm_job_history",
      title: "DVM Job History & Stats",
      dismissable: true,
      width: 800, // Larger default size
      height: 600,
    };
    const changes = addPaneActionLogic(state, newPaneInput, true);
    return { ...state, ...changes };
  });
}
