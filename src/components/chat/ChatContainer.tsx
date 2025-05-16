import React, { useEffect } from "react";
import { useChat } from "./useChat";
import { ChatWindow } from "./ChatWindow";

interface ChatContainerProps {
  systemMessage?: string;
  model?: string;
  className?: string;
}

export function ChatContainer({ 
  systemMessage,
  model = "gemma3:1b",
  className = ""
}: ChatContainerProps) {
  const {
    messages,
    isLoading,
    userInput,
    setUserInput,
    sendMessage,
    cleanup
  } = useChat({
    initialSystemMessage: systemMessage,
    model
  });

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className={`w-[32rem] ${className}`}>
      <ChatWindow
        messages={messages}
        userInput={userInput}
        onUserInputChange={setUserInput}
        onSendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}