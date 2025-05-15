import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage, ChatMessageProps } from "./ChatMessage";

export interface ChatWindowProps {
  messages: ChatMessageProps[];
  userInput: string;
  onUserInputChange: (input: string) => void;
  onSendMessage: () => void;
  isLoading?: boolean;
}

export function ChatWindow({
  messages,
  userInput,
  onUserInputChange,
  onSendMessage,
  isLoading = false
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Enter key to send message (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (userInput.trim() && !isLoading) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full border rounded-md bg-background/70 backdrop-blur-sm">
      {/* Chat messages area with scrolling */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            content={message.content} 
            role={message.role} 
            timestamp={message.timestamp} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={onSendMessage}
            disabled={isLoading || !userInput.trim()} 
            className="self-end"
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}