import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Using a slight delay to ensure scroll happens after DOM updates
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 10);
  }, [messages]);
  
  // Re-focus the input after sending a message or when loading state changes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

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
    <div className="flex flex-col h-full border rounded-md bg-background/70 backdrop-blur-sm text-xs overflow-hidden">
      {/* Chat messages area with scrolling */}
      <div className="flex-1 min-h-0"> {/* min-h-0 is critical for flexbox children to scroll properly */}
        <ScrollArea className="h-full w-full">
          <div className="p-1.5 space-y-1">
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
        </ScrollArea>
      </div>
      
      {/* Input area */}
      <div className="border-t p-1.5 flex-shrink-0">
        <div className="flex gap-1">
          <Textarea
            ref={inputRef}
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[24px] max-h-[60px] resize-none text-xs py-1 px-2"
            disabled={isLoading}
            autoFocus
          />
          <Button 
            onClick={onSendMessage}
            disabled={isLoading || !userInput.trim()} 
            className="self-end text-xs h-8 px-2"
            size="sm"
          >
            {isLoading ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}