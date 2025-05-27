import React from "react";
import { cn } from "@/utils/tailwind";
import { HotbarItem } from "./HotbarItem";
import { Store, History, Hand, Wallet, Bot, MessageSquare, CodeXml } from "lucide-react";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from "zustand/react/shallow";
import {
  SELL_COMPUTE_PANE_ID_CONST,
  WALLET_PANE_ID,
  AGENT_CHAT_PANE_ID,
  PREVIOUS_CHATS_PANE_ID,
  CODER_PANE_ID,
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
  onTogglePreviousChatsPane?: () => void;
  onToggleCoderPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  className,
  isHandTrackingActive,
  onToggleHandTracking,
  onToggleSellComputePane,
  onToggleWalletPane,
  onToggleDvmJobHistoryPane,
  onToggleAgentChatPane,
  onTogglePreviousChatsPane,
  onToggleCoderPane,
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
      {/* Slot 1: Coder Mode */}
      <HotbarItem
        slotNumber={1}
        onClick={onToggleCoderPane}
        title="Coder Mode"
        isActive={activePaneId === CODER_PANE_ID}
      >
        <CodeXml className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 2: Sell Compute (was 1) */}
      <HotbarItem
        slotNumber={2}
        onClick={onToggleSellComputePane}
        title="Sell Compute"
        isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}
      >
        <Store className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 3: Wallet (was 2) */}
      <HotbarItem
        slotNumber={3}
        onClick={onToggleWalletPane}
        title="Wallet"
        isActive={activePaneId === WALLET_PANE_ID}
      >
        <Wallet className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 4: DVM Job History (was 3) */}
      <HotbarItem
        slotNumber={4}
        onClick={onToggleDvmJobHistoryPane}
        title="DVM Job History"
        isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}
      >
        <History className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 5: Agent Chat (was 4) */}
      <HotbarItem
        slotNumber={5}
        onClick={onToggleAgentChatPane}
        title="Agent Chat"
        isActive={activePaneId === AGENT_CHAT_PANE_ID}
      >
        <Bot className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 6: Previous Chats (was 5, conditional) */}
      {onTogglePreviousChatsPane && (
        <HotbarItem
          slotNumber={6}
          onClick={onTogglePreviousChatsPane}
          title="Chat History"
          isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}
        >
          <MessageSquare className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Fill remaining slots with empty HotbarItems up to slot 8 */}
      {/* Max 3 empty slots if previous chats is present, max 4 if not */}
      {Array.from({ length: onTogglePreviousChatsPane ? 2 : 3 }).map((_, i) => (
         <HotbarItem key={`empty-slot-${i}`} slotNumber={i + (onTogglePreviousChatsPane ? 7 : 6)} isGhost>
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
