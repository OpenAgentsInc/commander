import { PaneStoreType, SetPaneStore } from '../types';

export function bringPaneToFrontAction(set: SetPaneStore, id: string) {
  set((state: PaneStoreType) => {
    const paneToMove = state.panes.find(pane => pane.id === id);
    if (!paneToMove) return state;

    const otherPanes = state.panes.filter(pane => pane.id !== id);
    return {
      panes: [
        ...otherPanes.map(p => ({ ...p, isActive: false })),
        { ...paneToMove, isActive: true }
      ].sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)),
      activePaneId: id,
      lastPanePosition: { x: paneToMove.x, y: paneToMove.y, width: paneToMove.width, height: paneToMove.height }
    };
  });
}