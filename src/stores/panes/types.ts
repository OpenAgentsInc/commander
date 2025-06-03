import { Pane, PaneInput } from "@/types/pane";
import type { StoreApi } from "zustand";
import type { OpenSeedPhraseBackupPaneParams } from "./actions/openSeedPhraseBackupPane";

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null; // Tracks the ID of the currently active pane
  lastPanePosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  // Store last known positions and content of closed panes by pane ID
  closedPanePositions: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    content?: any; // Store pane content like sessionId
    shouldRestore?: boolean; // Whether this pane should be restored on toggle
  }>;
}

export interface PaneStoreType extends PaneState {
  addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
  removePane: (id: string) => void;
  updatePanePosition: (id: string, x: number, y: number) => void;
  updatePaneSize: (id: string, width: number, height: number) => void;
  updatePaneContent: (id: string, content: any) => void;
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
  openPreviousChatsPane: () => void; // Open Previous Chats List pane
  togglePreviousChatsPane: () => void; // Toggle Previous Chats List pane (open if closed, close if open)
  toggleCoderPane: () => void; // Toggle Coder pane (open if closed, close if open)
  openNewCoderPane: () => void; // Open a new Coder pane instance
  
  // SWE-Bench MVP UI pane actions
  openTaskBrowserPane: () => void;
  openEvaluationLauncherPane: (content: { taskInstanceIds: string[], tasksDir: string }) => void;
  openEvaluationMonitorPane: (content: { runId: string, outputDir: string, totalTasks: number }) => void;
  openResultsViewerPane: () => void;
  openSweBenchSimpleLauncherPane: () => void;
  
  // Telemetry pane actions
  openTelemetryStreamPane: (runId?: string) => void;
  toggleTelemetryStreamPane: () => void;
}

export type SetPaneStore = StoreApi<PaneStoreType>["setState"];

// Add GetPaneStore type for completeness
export type GetPaneStore = () => PaneStoreType;
