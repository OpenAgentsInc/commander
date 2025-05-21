import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Hand, MessageSquarePlus, Cpu, Store, History } from 'lucide-react';
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
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);
  const openNip90Dashboard = usePaneStore((state) => state.openNip90DashboardPane);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const SELL_COMPUTE_PANE_ID = 'sell_compute';
  const DVM_JOB_HISTORY_PANE_ID = 'dvm_job_history';

  const handleCreateChannel = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
    const defaultName = `Channel ${timestamp}`;
    createNip28Channel(defaultName);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={handleCreateChannel} title="New NIP-28 Channel">
        <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={4} onClick={openNip90Dashboard} title="NIP-90 DVM Dashboard" isActive={activePaneId === 'nip90-dashboard'}>
        <Cpu className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={5} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={6} onClick={onOpenDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
        <History className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {Array.from({ length: 3 }).map((_, index) => (
        <HotbarItem key={`empty-${7 + index}`} slotNumber={7 + index} title={`Slot ${7 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
          <div className="w-5 h-5 text-muted-foreground/50"></div>
        </HotbarItem>
      ))}
    </div>
  );
};