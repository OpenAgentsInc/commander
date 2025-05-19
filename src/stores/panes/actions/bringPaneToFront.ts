import { PaneStoreType, SetPaneStore } from '../types';

export function bringPaneToFrontAction(set: SetPaneStore, idToBringToFront: string) {
  set((state: PaneStoreType) => {
    const paneIndex = state.panes.findIndex(pane => pane.id === idToBringToFront);
    if (paneIndex === -1) return state; // Pane not found

    const paneToMove = state.panes[paneIndex];

    const needsActivationChange = !paneToMove.isActive || state.activePaneId !== idToBringToFront;
    const needsReordering = paneIndex !== state.panes.length - 1;

    if (!needsActivationChange && !needsReordering) {
      // Check if lastPanePosition actually needs an update
      if (state.lastPanePosition?.x !== paneToMove.x || 
          state.lastPanePosition?.y !== paneToMove.y ||
          state.lastPanePosition?.width !== paneToMove.width || 
          state.lastPanePosition?.height !== paneToMove.height) {
        return {
          ...state,
          lastPanePosition: { 
            x: paneToMove.x, 
            y: paneToMove.y, 
            width: paneToMove.width, 
            height: paneToMove.height 
          }
        };
      }
      return state; // Absolutely no change needed
    }

    let panesArrayIdentityChanged = false;
    const newPanesArrayWithActivation = state.panes.map(pane => {
      const shouldBeActive = pane.id === idToBringToFront;
      if (pane.isActive !== shouldBeActive) {
        panesArrayIdentityChanged = true;
        return { ...pane, isActive: shouldBeActive };
      }
      return pane;
    });

    const targetPaneInstanceInNewArray = newPanesArrayWithActivation.find(p => p.id === idToBringToFront)!;

    // If only activation changed but not order, and it's already the last element (frontmost).
    // This means newPanesArrayWithActivation is the final state for panes array.
    if (panesArrayIdentityChanged && !needsReordering) {
       return {
          panes: newPanesArrayWithActivation,
          activePaneId: idToBringToFront,
          lastPanePosition: { 
            x: targetPaneInstanceInNewArray.x, 
            y: targetPaneInstanceInNewArray.y, 
            width: targetPaneInstanceInNewArray.width, 
            height: targetPaneInstanceInNewArray.height 
          }
       };
    }

    // If reordering is needed (or if activation changed and it wasn't already last):
    const otherPanesInstances = newPanesArrayWithActivation.filter(p => p.id !== idToBringToFront);
    const finalOrderedPanes = [...otherPanesInstances, targetPaneInstanceInNewArray];

    return {
      panes: finalOrderedPanes,
      activePaneId: idToBringToFront,
      lastPanePosition: { 
        x: targetPaneInstanceInNewArray.x, 
        y: targetPaneInstanceInNewArray.y, 
        width: targetPaneInstanceInNewArray.width, 
        height: targetPaneInstanceInNewArray.height 
      }
    };
  });
}