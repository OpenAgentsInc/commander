import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, SetPaneStore } from "../types";
import { calculateNewPanePosition } from "../utils/calculatePanePosition";
import { ensurePaneIsVisible } from "../utils/ensurePaneIsVisible";
import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "../constants";

let paneIdCounter = 2;

// Extract logic for reuse by other actions
export function addPaneActionLogic(
  state: PaneStoreType,
  newPaneInput: PaneInput,
  shouldTile: boolean = false,
): Partial<PaneStoreType> {
  if (newPaneInput.id && state.panes.find((p) => p.id === newPaneInput.id)) {
    const paneToActivate = state.panes.find((p) => p.id === newPaneInput.id)!;
    return {
      panes: state.panes
        .map((p) => ({
          ...p,
          isActive: p.id === newPaneInput.id,
        }))
        .sort(
          (a, b) =>
            (a.id === newPaneInput.id ? 1 : 0) -
            (b.id === newPaneInput.id ? 1 : 0),
        ),
      activePaneId: newPaneInput.id,
      lastPanePosition: {
        x: paneToActivate.x,
        y: paneToActivate.y,
        width: paneToActivate.width,
        height: paneToActivate.height,
      },
    };
  }

  const basePosition = calculateNewPanePosition(
    state.panes,
    state.lastPanePosition,
  );

  const paneBeforeEnsure = {
    id: newPaneInput.id || `pane-${paneIdCounter++}`,
    type: newPaneInput.type,
    title: newPaneInput.title || `Pane ${paneIdCounter - 1}`,
    x: newPaneInput.x ?? basePosition.x,
    y: newPaneInput.y ?? basePosition.y,
    width: newPaneInput.width ?? DEFAULT_PANE_WIDTH,
    height: newPaneInput.height ?? DEFAULT_PANE_HEIGHT,
    isActive: true,
    dismissable:
      newPaneInput.dismissable !== undefined ? newPaneInput.dismissable : true,
    content: newPaneInput.content,
    headerMenus: newPaneInput.headerMenus || [], // Default to empty array
  };
  
  console.log('[addPaneActionLogic] Creating pane with position:', {
    id: paneBeforeEnsure.id,
    x: paneBeforeEnsure.x,
    y: paneBeforeEnsure.y,
    inputX: newPaneInput.x,
    inputY: newPaneInput.y,
    baseX: basePosition.x,
    baseY: basePosition.y,
  });

  const newPane: Pane = ensurePaneIsVisible(paneBeforeEnsure);
  
  if (newPane.x !== paneBeforeEnsure.x || newPane.y !== paneBeforeEnsure.y) {
    console.log('[addPaneActionLogic] Position was adjusted by ensurePaneIsVisible:', {
      before: { x: paneBeforeEnsure.x, y: paneBeforeEnsure.y },
      after: { x: newPane.x, y: newPane.y }
    });
  }

  const updatedPanes = state.panes.map((p) => ({ ...p, isActive: false }));

  const result = {
    panes: [...updatedPanes, newPane],
    activePaneId: newPane.id,
    lastPanePosition: {
      x: newPane.x,
      y: newPane.y,
      width: newPane.width,
      height: newPane.height,
    },
  };
  
  console.log('[addPaneActionLogic] Final pane in result:', {
    id: newPane.id,
    x: newPane.x,
    y: newPane.y,
    width: newPane.width,
    height: newPane.height,
  });
  
  return result;
}

export function addPaneAction(
  set: SetPaneStore,
  newPaneInput: PaneInput,
  shouldTile: boolean = false,
) {
  set((state: PaneStoreType) =>
    addPaneActionLogic(state, newPaneInput, shouldTile),
  );
}
