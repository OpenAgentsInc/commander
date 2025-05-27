import React from "react";
import { cn } from "@/utils/tailwind";
import { HotbarItem } from "./HotbarItem";
import { Store, History, Hand, Wallet, Bot, MessageSquare, CodeXml } from "lucide-react";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from "zustand/react/shallow";
import { Feature } from '@/services/featureflags/FeatureFlag';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
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

  // Feature flag hooks
  const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);
  const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);
  const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);
  const [isDvmHistoryEnabled] = useFeatureFlag(Feature.DVM_JOB_HISTORY_PANE);
  const [isAgentChatEnabled] = useFeatureFlag(Feature.AGENT_CHAT_PANE);
  const [isPreviousChatsEnabled] = useFeatureFlag(Feature.PREVIOUS_CHATS_PANE);
  const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

  return (
    <div
      className={cn(
        "bg-background/50 border-border/30 fixed bottom-4 left-1/2 z-[10000] flex -translate-x-1/2 transform space-x-1 rounded-md border p-1 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      {/* Slot 1: Coder Mode */}
      {isCoderPaneEnabled ? (
        <HotbarItem
          slotNumber={1}
          onClick={onToggleCoderPane}
          title="Coder Mode"
          isActive={activePaneId === CODER_PANE_ID}
        >
          <CodeXml className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 2: Sell Compute */}
      {isSellComputeEnabled ? (
        <HotbarItem
          slotNumber={2}
          onClick={onToggleSellComputePane}
          title="Sell Compute"
          isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}
        >
          <Store className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={2} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 3: Wallet */}
      {isWalletEnabled ? (
        <HotbarItem
          slotNumber={3}
          onClick={onToggleWalletPane}
          title="Wallet"
          isActive={activePaneId === WALLET_PANE_ID}
        >
          <Wallet className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={3} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 4: DVM Job History */}
      {isDvmHistoryEnabled ? (
        <HotbarItem
          slotNumber={4}
          onClick={onToggleDvmJobHistoryPane}
          title="DVM Job History"
          isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}
        >
          <History className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={4} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 5: Agent Chat */}
      {isAgentChatEnabled ? (
        <HotbarItem
          slotNumber={5}
          onClick={onToggleAgentChatPane}
          title="Agent Chat"
          isActive={activePaneId === AGENT_CHAT_PANE_ID}
        >
          <Bot className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={5} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 6: Previous Chats */}
      {onTogglePreviousChatsPane && isPreviousChatsEnabled ? (
        <HotbarItem
          slotNumber={6}
          onClick={onTogglePreviousChatsPane}
          title="Chat History"
          isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}
        >
          <MessageSquare className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      ) : <HotbarItem slotNumber={6} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slot 7 & 8: Always Ghost/Empty by current design */}
      <HotbarItem slotNumber={7} isGhost><span className="h-5 w-5"/></HotbarItem>
      <HotbarItem slotNumber={8} isGhost><span className="h-5 w-5"/></HotbarItem>

      {/* Slot 9: Hand Tracking */}
      {isHandTrackingEnabled ? (
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
      ) : <HotbarItem slotNumber={9} isGhost><span className="h-5 w-5"/></HotbarItem>}
    </div>
  );
};
