import { Pane, PaneInput } from '@/types/pane';
import type { StoreApi } from 'zustand';
import type { OpenSeedPhraseBackupPaneParams } from './actions/openSeedPhraseBackupPane';

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
  openDvmJobHistoryPane: () => void; // Open DVM Job History pane
  openNip90DvmTestPane: () => void; // Open NIP-90 DVM Test pane
  openNip90ConsumerChatPane: () => void; // Open NIP-90 Consumer Chat pane
  openNip90GlobalFeedPane: () => void; // Open NIP-90 Global Feed pane
  openWalletPane: () => void; // Open Wallet pane
  resetHUDState: () => void;
  
  // New page pane actions
  openSecondPagePane: () => void;
  openWalletSetupPane: () => void;
  openSeedPhraseBackupPane: (params: OpenSeedPhraseBackupPaneParams) => void;
  openRestoreWalletPane: () => void;
  
  // Toggle actions for keyboard shortcuts
  toggleSellComputePane: () => void; // Toggle Sell Compute pane (open if closed, close if open)
  toggleWalletPane: () => void; // Toggle Wallet pane (open if closed, close if open)
  toggleDvmJobHistoryPane: () => void; // Toggle DVM Job History pane (open if closed, close if open)
  toggleAgentChatPane: () => void; // Toggle Agent Chat pane (open if closed, close if open)
  openAgentChatPane: () => void; // Open Agent Chat pane
}

export type SetPaneStore = StoreApi<PaneStoreType>['setState'];

// Add GetPaneStore type for completeness
export type GetPaneStore = () => PaneStoreType;