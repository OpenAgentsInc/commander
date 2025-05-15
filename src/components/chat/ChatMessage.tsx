import React from "react";
import { cn } from "@/utils/tailwind";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessageProps {
  content: string;
  role: MessageRole;
  timestamp?: Date;
  isStreaming?: boolean;
  // Allow dynamic update properties for streaming implementation
  _updateId?: number;
  [key: string]: any; // Allow any additional properties
}

export function ChatMessage({ content, role, timestamp, isStreaming }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex",
      role === "user" ? "justify-end" : role === "system" ? "justify-center" : "justify-start"
    )}>
      <div 
        className={cn(
          "py-1 px-2 rounded-md mb-1 text-xs inline-block max-w-[85%]",
          role === "user" 
            ? "bg-primary/10 text-right" 
            : role === "assistant" 
              ? isStreaming ? "bg-secondary/5 border-secondary/20 border" : "bg-secondary/10"
              : "bg-muted/50 text-muted-foreground text-[10px] italic"
        )}
      >
        <div className="text-[10px] font-semibold mb-0.5">
          {role === "user" ? "Commander" : role === "assistant" ? "Agent" : "System"}
          {timestamp && (
            <span className="text-muted-foreground text-[10px] ml-1">
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {isStreaming && <span className="ml-1 animate-pulse">...</span>}
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap max-w-full">
          {content}
          {isStreaming && !content && <span className="animate-pulse">▋</span>}
        </div>
      </div>
    </div>
  );
}