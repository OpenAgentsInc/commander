import React from "react";
import { cn } from "@/utils/tailwind";
import { HotbarItem } from "./HotbarItem";
import { Store, History, Hand, Wallet, Bot } from "lucide-react";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from "zustand/react/shallow";
import {
  SELL_COMPUTE_PANE_ID_CONST,
  WALLET_PANE_ID,
  AGENT_CHAT_PANE_ID,
} from "@/stores/panes/constants";
import { DVM_JOB_HISTORY_PANE_ID } from "@/stores/panes/actions/openDvmJobHistoryPane";

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onToggleSellComputePane: () => void;
  onToggleWalletPane: () => void;
  onToggleDvmJobHistoryPane: () => void;
  onToggleAgentChatPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  className,
  isHandTrackingActive,
  onToggleHandTracking,
  onToggleSellComputePane,
  onToggleWalletPane,
  onToggleDvmJobHistoryPane,
  onToggleAgentChatPane,
}) => {
  const { activePaneId } = usePaneStore(
    useShallow((state) => ({
      activePaneId: state.activePaneId,
    })),
  );

  return (
    <div
      className={cn(
        "bg-background/50 border-border/30 fixed bottom-4 left-1/2 z-[10000] flex -translate-x-1/2 transform space-x-1 rounded-md border p-1 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      <HotbarItem
        slotNumber={1}
        onClick={onToggleSellComputePane}
        title="Sell Compute"
        isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}
      >
        <Store className="text-muted-foreground h-5 w-5" />
      </HotbarItem>
      <HotbarItem
        slotNumber={2}
        onClick={onToggleWalletPane}
        title="Wallet"
        isActive={activePaneId === WALLET_PANE_ID}
      >
        <Wallet className="text-muted-foreground h-5 w-5" />
      </HotbarItem>
      {/* Hand tracking button intentionally commented out
      <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      */}
      <HotbarItem
        slotNumber={3}
        onClick={onToggleDvmJobHistoryPane}
        title="DVM Job History"
        isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}
      >
        <History className="text-muted-foreground h-5 w-5" />
      </HotbarItem>
      <HotbarItem
        slotNumber={4}
        onClick={onToggleAgentChatPane}
        title="Agent Chat"
        isActive={activePaneId === AGENT_CHAT_PANE_ID}
      >
        <Bot className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Fill the remaining slots with empty HotbarItems */}
      {Array.from({ length: 4 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 5} isGhost>
          <span className="h-5 w-5" />
        </HotbarItem>
      ))}

      <HotbarItem
        slotNumber={9}
        onClick={onToggleHandTracking}
        title={
          isHandTrackingActive
            ? "Disable Hand Tracking"
            : "Enable Hand Tracking"
        }
        isActive={isHandTrackingActive}
      >
        <Hand className="text-muted-foreground h-5 w-5" />
      </HotbarItem>
    </div>
  );
};
