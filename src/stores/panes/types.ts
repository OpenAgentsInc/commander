import { Pane, PaneInput } from '@/types/pane';

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null; // Tracks the ID of the currently active pane
  lastPanePosition: { x: number; y: number; width: number; height: number } | null;
  // Add any other global state related to panes if needed
}

export interface PaneStoreType extends PaneState {
  addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
  removePane: (id: string) => void;
  updatePanePosition: (id: string, x: number, y: number) => void;
  updatePaneSize: (id: string, width: number, height: number) => void;
  openChatPane: (newPane: PaneInput, isCommandKeyHeld?: boolean) => void; // Specific action for chat panes
  bringPaneToFront: (id: string) => void;
  setActivePane: (id: string | null) => void;
  resetHUDState: () => void;
}

// Make it more permissive to accommodate the actual Zustand's set function 
export type SetPaneStore = {
  (partial: PaneStoreType | Partial<PaneStoreType> | ((state: PaneStoreType) => PaneStoreType | Partial<PaneStoreType>), replace?: boolean): void;
  (state: PaneStoreType | ((state: PaneStoreType) => PaneStoreType), replace: true): void;
};