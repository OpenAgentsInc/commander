import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Store, History, Hand, Wallet } from 'lucide-react';
import { usePaneStore } from '@/stores/pane';

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onOpenSellComputePane: () => void;
  onOpenDvmJobHistoryPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ 
  className, 
  isHandTrackingActive, 
  onToggleHandTracking, 
  onOpenSellComputePane,
  onOpenDvmJobHistoryPane 
}) => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const openWalletPane = usePaneStore((state) => state.openWalletPane);
  const removePane = usePaneStore((state) => state.removePane);
  const panes = usePaneStore((state) => state.panes);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  
  const SELL_COMPUTE_PANE_ID = 'sell_compute';
  const DVM_JOB_HISTORY_PANE_ID = 'dvm_job_history';
  const WALLET_PANE_ID = 'wallet_pane';

  // Toggle functions for panes
  const toggleSellComputePane = () => {
    const paneExists = panes.some(pane => pane.id === SELL_COMPUTE_PANE_ID);
    if (paneExists && activePaneId === SELL_COMPUTE_PANE_ID) {
      removePane(SELL_COMPUTE_PANE_ID);
    } else {
      onOpenSellComputePane();
    }
  };

  const toggleDvmJobHistoryPane = () => {
    const paneExists = panes.some(pane => pane.id === DVM_JOB_HISTORY_PANE_ID);
    if (paneExists && activePaneId === DVM_JOB_HISTORY_PANE_ID) {
      removePane(DVM_JOB_HISTORY_PANE_ID);
    } else {
      onOpenDvmJobHistoryPane();
    }
  };

  const toggleWalletPane = () => {
    const paneExists = panes.some(pane => pane.id === WALLET_PANE_ID);
    if (paneExists && activePaneId === WALLET_PANE_ID) {
      removePane(WALLET_PANE_ID);
    } else {
      openWalletPane();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={toggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={toggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
        <Wallet className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Commented out hand tracking button
      <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      */}
      <HotbarItem slotNumber={3} onClick={toggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
        <History className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      
      {/* Fill the middle slots with empty HotbarItems */}
      {Array.from({ length: 5 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 4} isGhost>
          <span className="w-5 h-5" />
        </HotbarItem>
      ))}
      
      {/* Reset HUD button in slot 9 */}
      <HotbarItem slotNumber={9} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
    </div>
  );
};