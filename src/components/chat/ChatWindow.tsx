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
  isLoading = false,
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

  // Add a more aggressive focus management strategy
  // This will run on every render to ensure focus is maintained
  useEffect(() => {
    // Store the active element before focus attempt
    const activeElement = document.activeElement;

    // Only refocus if we've lost focus to the body or the window
    if (activeElement === document.body || activeElement === null) {
      inputRef.current?.focus();
    }

    // Set up an interval to check and restore focus
    const focusInterval = setInterval(() => {
      if (
        document.activeElement === document.body ||
        document.activeElement === null
      ) {
        inputRef.current?.focus();
      }
    }, 200); // Check every 200ms

    return () => clearInterval(focusInterval);
  }, []);

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
    <div className="border-border bg-background text-foreground flex h-full flex-col overflow-hidden rounded-md border text-xs">
      {/* Chat messages area with scrolling */}
      <div className="min-h-0 flex-1">
        {" "}
        {/* min-h-0 is critical for flexbox children to scroll properly */}
        <ScrollArea className="h-full w-full">
          <div className="space-y-1 p-1.5">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                content={message.content}
                role={message.role}
                timestamp={message.timestamp}
                isStreaming={message.isStreaming}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="border-border flex-shrink-0 border-t p-1.5">
        <div className="flex gap-1">
          <Textarea
            ref={inputRef}
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-background text-foreground border-border focus:ring-ring focus:border-border focus:bg-background !bg-background max-h-[60px] min-h-[24px] resize-none px-2 py-1 text-xs !opacity-100"
            style={{
              backgroundColor: "var(--background)",
              // Add higher specificity to prevent style overrides during re-renders
              zIndex: 20,
            }}
            onFocus={(e) => {
              // Prevent focus from being stolen
              e.currentTarget.setAttribute("data-focused", "true");
            }}
            onBlur={(e) => {
              // Only allow intentional blur
              if (document.activeElement === document.body) {
                // If focus is going to the body, it's probably being stolen
                // Re-focus immediately
                setTimeout(() => {
                  // Check if the element is still in the DOM before accessing properties
                  if (
                    e.currentTarget &&
                    e.currentTarget.getAttribute("data-focused") === "true"
                  ) {
                    e.currentTarget.focus();
                  }
                }, 0);
              } else {
                // Safely set attribute only if the element is still in the DOM
                if (e.currentTarget) {
                  e.currentTarget.setAttribute("data-focused", "false");
                }
              }
            }}
            disabled={isLoading}
            autoFocus
          />
          <Button
            onClick={onSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/80 h-8 self-end px-2 text-xs"
            size="sm"
          >
            {isLoading ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
