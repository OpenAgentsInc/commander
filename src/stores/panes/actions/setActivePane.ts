import { PaneStoreType, SetPaneStore } from '../types';

export function setActivePaneAction(set: SetPaneStore, paneIdToActivate: string | null) {
  set((state: PaneStoreType) => {
    // If the active pane ID is already the one we want to activate,
    // check if any pane's isActive flag is inconsistent.
    // If not, no state change is needed.
    if (state.activePaneId === paneIdToActivate) {
      let flagsConsistent = true;
      for (const pane of state.panes) {
        if (pane.isActive !== (pane.id === paneIdToActivate)) {
          flagsConsistent = false;
          break;
        }
      }
      if (flagsConsistent) return state; // No change needed
    }

    let panesChanged = false;
    const newPanes = state.panes.map(pane => {
      const shouldBeActive = pane.id === paneIdToActivate;
      if (pane.isActive !== shouldBeActive) {
        panesChanged = true;
        return { ...pane, isActive: shouldBeActive };
      }
      return pane; // Return original object reference if isActive state doesn't change
    });

    // If no pane's isActive status changed and activePaneId is already correct, no actual update needed.
    if (!panesChanged && state.activePaneId === paneIdToActivate) {
      return state;
    }

    return {
      ...state, // Preserve other state properties like lastPanePosition
      panes: newPanes,
      activePaneId: paneIdToActivate,
    };
  });
}