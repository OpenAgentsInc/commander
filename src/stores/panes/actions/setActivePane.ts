import { PaneStoreType, SetPaneStore } from '../types';

export function setActivePaneAction(set: SetPaneStore, id: string | null) {
  set((state: PaneStoreType) => ({
    panes: state.panes.map(pane => ({
      ...pane,
      isActive: pane.id === id,
    })),
    activePaneId: id,
  }));
}