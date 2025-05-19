import { PaneStoreType, SetPaneStore } from '../types';

// Use any to bypass strict type checking for this function
export function setActivePaneAction(set: any, paneIdToActivate: string | null) {
  set((state: PaneStoreType) => {
    // If null, deactivate all panes
    if (paneIdToActivate === null) {
      if (state.activePaneId === null) {
        // Check if all panes are already inactive
        const allInactive = state.panes.every(pane => !pane.isActive);
        if (allInactive) return state; // No change needed
      }
      
      // Set all panes to inactive
      return {
        ...state,
        panes: state.panes.map(pane => pane.isActive ? { ...pane, isActive: false } : pane),
        activePaneId: null
      };
    }

    // Check if the pane exists
    const paneIndex = state.panes.findIndex(pane => pane.id === paneIdToActivate);
    if (paneIndex === -1) return state; // Pane not found
    
    // If already active, no change needed
    if (state.activePaneId === paneIdToActivate) {
      // Check if the isActive flags are consistent
      const flagsConsistent = state.panes.every(pane => 
        pane.isActive === (pane.id === paneIdToActivate)
      );
      if (flagsConsistent) return state;
    }

    // Update isActive flags for all panes
    const newPanes = state.panes.map(pane => {
      const shouldBeActive = pane.id === paneIdToActivate;
      if (pane.isActive !== shouldBeActive) {
        return { ...pane, isActive: shouldBeActive };
      }
      return pane;
    });

    return {
      ...state,
      panes: newPanes,
      activePaneId: paneIdToActivate
    };
  });
}