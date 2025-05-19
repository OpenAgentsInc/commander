import { PaneStoreType, SetPaneStore } from '../types';

export function bringPaneToFrontAction(set: SetPaneStore, idToBringToFront: string) {
  set((state: PaneStoreType) => {
    const paneIndex = state.panes.findIndex(pane => pane.id === idToBringToFront);
    if (paneIndex === -1) return state; // Pane not found

    const paneToMove = state.panes[paneIndex];

    // Determine if any isActive flags need to change or if reordering is needed
    const needsActivation = !paneToMove.isActive || state.activePaneId !== idToBringToFront;
    const needsReordering = paneIndex !== state.panes.length - 1;

    if (!needsActivation && !needsReordering) {
      // Already frontmost and active, just update lastPanePosition for consistency
      return {
        ...state,
        lastPanePosition: { x: paneToMove.x, y: paneToMove.y, width: paneToMove.width, height: paneToMove.height }
      };
    }

    // Create new array, updating isActive flags minimally
    // Only create new objects for panes whose isActive status changes
    const newPanesArray = state.panes.map(pane => {
      const shouldBeActive = pane.id === idToBringToFront;
      if (pane.isActive !== shouldBeActive) {
        return { ...pane, isActive: shouldBeActive };
      }
      return pane; // Return original object reference
    });

    // The target pane instance in newPanesArray (might be new or old object)
    const targetPaneInstance = newPanesArray.find(p => p.id === idToBringToFront)!;
    // Filter out the target pane to re-insert it at the end
    const otherPanesInstances = newPanesArray.filter(p => p.id !== idToBringToFront);

    const finalOrderedPanes = [...otherPanesInstances, targetPaneInstance];

    return {
      panes: finalOrderedPanes,
      activePaneId: idToBringToFront,
      lastPanePosition: { x: targetPaneInstance.x, y: targetPaneInstance.y, width: targetPaneInstance.width, height: targetPaneInstance.height }
    };
  });
}