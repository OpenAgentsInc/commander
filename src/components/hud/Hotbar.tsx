import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Store, History } from 'lucide-react';
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
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const SELL_COMPUTE_PANE_ID = 'sell_compute';
  const DVM_JOB_HISTORY_PANE_ID = 'dvm_job_history';

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onOpenDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
        <History className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      
      {/* Fill the remaining 6 slots with empty HotbarItems */}
      {Array.from({ length: 6 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 4} isGhost>
          <span className="w-5 h-5" />
        </HotbarItem>
      ))}
    </div>
  );
};