import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Store, History, Hand, Wallet } from 'lucide-react';
import { usePaneStore } from '@/stores/pane';
import { useShallow } from 'zustand/react/shallow';
import {
  SELL_COMPUTE_PANE_ID_CONST,
  WALLET_PANE_ID,
} from '@/stores/panes/constants';
import { DVM_JOB_HISTORY_PANE_ID } from '@/stores/panes/actions/openDvmJobHistoryPane';

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onToggleSellComputePane: () => void;
  onToggleWalletPane: () => void;
  onToggleDvmJobHistoryPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ 
  className, 
  isHandTrackingActive, 
  onToggleHandTracking, 
  onToggleSellComputePane,
  onToggleWalletPane,
  onToggleDvmJobHistoryPane 
}) => {
  const { resetHUDState, activePaneId } = usePaneStore(
    useShallow(state => ({
      resetHUDState: state.resetHUDState,
      activePaneId: state.activePaneId
    }))
  );

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
        <Wallet className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Hand tracking button intentionally commented out
      <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      */}
      <HotbarItem slotNumber={3} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
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