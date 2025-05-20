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
  createNip28ChannelPane: (channelName?: string) => void; // Add a NIP28 channel pane
  openNip90DashboardPane: () => void; // Open NIP-90 DVM dashboard pane
  openSellComputePane: () => void; // Open Sell Compute pane
  resetHUDState: () => void;
}

// Use Zustand's own type for better compatibility
import type { StoreApi } from 'zustand';

export type SetPaneStore = StoreApi<PaneStoreType>['setState'];

// Add GetPaneStore type for completeness
export type GetPaneStore = () => PaneStoreType;