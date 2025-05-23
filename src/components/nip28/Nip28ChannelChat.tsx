import React, { useEffect } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useNostrChannelChat } from "@/hooks/useNostrChannelChat";

interface Nip28ChannelChatProps {
  channelId: string;
  channelName?: string;
  className?: string;
}

export function Nip28ChannelChat({
  channelId,
  channelName,
  className,
}: Nip28ChannelChatProps) {
  const { messages, isLoading, userInput, setUserInput, sendMessage } =
    useNostrChannelChat({
      channelId,
    });

  // Log when the channelId changes (for debugging)
  useEffect(() => {
    console.log(`[Nip28ChannelChat] Initialized for channel: ${channelId}`);

    return () => {
      console.log(`[Nip28ChannelChat] Cleaning up for channel: ${channelId}`);
    };
  }, [channelId]);

  return (
    <div className={`flex h-full flex-col ${className || ""}`}>
      {channelName && (
        <div className="text-muted-foreground border-border flex-shrink-0 border-b p-1.5 text-center text-xs">
          <span className="font-medium">{channelName}</span>
          <span className="ml-1 text-[10px] opacity-70">
            (Channel ID: {channelId.substring(0, 6)}...)
          </span>
        </div>
      )}

      <div className="min-h-0 flex-grow overflow-hidden">
        <ChatWindow
          messages={messages}
          userInput={userInput}
          onUserInputChange={setUserInput}
          onSendMessage={sendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
