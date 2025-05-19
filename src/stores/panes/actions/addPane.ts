import { Pane, PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { calculateNewPanePosition } from '../utils/calculatePanePosition';
import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';
import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from '../constants';

let paneIdCounter = 2;

export function addPaneAction(
  set: SetPaneStore,
  newPaneInput: PaneInput,
  shouldTile: boolean = false
) {
  set((state: PaneStoreType) => {
    if (newPaneInput.id && state.panes.find(p => p.id === newPaneInput.id)) {
      const paneToActivate = state.panes.find(p => p.id === newPaneInput.id)!;
      return {
        panes: state.panes.map(p => ({
          ...p,
          isActive: p.id === newPaneInput.id,
        })).sort((a, b) => (a.id === newPaneInput.id ? 1 : 0) - (b.id === newPaneInput.id ? 1 : 0)),
        activePaneId: newPaneInput.id,
        lastPanePosition: { x: paneToActivate.x, y: paneToActivate.y, width: paneToActivate.width, height: paneToActivate.height }
      };
    }

    const basePosition = calculateNewPanePosition(state.panes, state.lastPanePosition);

    const newPane: Pane = ensurePaneIsVisible({
      id: newPaneInput.id || `pane-${paneIdCounter++}`,
      type: newPaneInput.type,
      title: newPaneInput.title || `Pane ${paneIdCounter-1}`,
      x: newPaneInput.x ?? basePosition.x,
      y: newPaneInput.y ?? basePosition.y,
      width: newPaneInput.width ?? DEFAULT_PANE_WIDTH,
      height: newPaneInput.height ?? DEFAULT_PANE_HEIGHT,
      isActive: true,
      dismissable: newPaneInput.dismissable !== undefined ? newPaneInput.dismissable : true,
      content: newPaneInput.content,
    });

    const updatedPanes = state.panes.map(p => ({ ...p, isActive: false }));

    return {
      panes: [...updatedPanes, newPane],
      activePaneId: newPane.id,
      lastPanePosition: { x: newPane.x, y: newPane.y, width: newPane.width, height: newPane.height },
    };
  });
}