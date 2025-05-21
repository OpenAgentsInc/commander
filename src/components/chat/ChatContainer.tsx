import React, { useEffect } from "react";
import { useChat as useLocalOllamaChat } from "./useChat"; // Keep original for other uses
import { ChatWindow } from "./ChatWindow";
import type { ChatMessageProps } from "./ChatMessage";

interface ChatContainerProps {
  systemMessage?: string;
  model?: string; // Still useful if the container is used for local Ollama
  className?: string;
  // Props to allow external control
  messages?: ChatMessageProps[];
  isLoading?: boolean;
  userInput?: string;
  onUserInputChange?: (input: string) => void;
  onSendMessage?: () => void;
}

export function ChatContainer({
  systemMessage,
  model = "gemma3:1b",
  className = "",
  messages: externalMessages,
  isLoading: externalIsLoading,
  userInput: externalUserInput,
  onUserInputChange: externalOnUserInputChange,
  onSendMessage: externalOnSendMessage
}: ChatContainerProps) {
  // Use local chat hook IF external controls are NOT provided
  const localChatHook = useLocalOllamaChat({
    initialSystemMessage: systemMessage,
    model
  });

  // Determine which values to use based on whether external props are provided
  const messages = externalMessages !== undefined ? externalMessages : localChatHook.messages;
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : localChatHook.isLoading;
  const userInput = externalUserInput !== undefined ? externalUserInput : localChatHook.userInput;
  const setUserInput = externalOnUserInputChange !== undefined ? externalOnUserInputChange : localChatHook.setUserInput;
  const sendMessage = externalOnSendMessage !== undefined ? externalOnSendMessage : localChatHook.sendMessage;

  // Cleanup local chat hook only if it was used (i.e., external props were not provided)
  useEffect(() => {
    if (externalMessages === undefined) { // Check if external control is active
      return localChatHook.cleanup;
    }
  }, [localChatHook.cleanup, externalMessages]);

  return (
    <div className={`h-full ${className}`}>
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