import React from "react";
import { cn } from "@/utils/tailwind";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessageProps {
  content: string;
  role: MessageRole;
  timestamp?: Date;
}

export function ChatMessage({ content, role, timestamp }: ChatMessageProps) {
  return (
    <div 
      className={cn(
        "py-2 px-3 rounded-md mb-2 max-w-[80%]",
        role === "user" 
          ? "bg-primary/10 ml-auto text-right" 
          : role === "assistant" 
            ? "bg-secondary/10 mr-auto" 
            : "bg-muted/50 w-full text-muted-foreground text-sm italic"
      )}
    >
      <div className="text-xs font-semibold mb-1">
        {role === "user" ? "You" : role === "assistant" ? "Commander" : "System"}
        {timestamp && (
          <span className="text-muted-foreground text-xs ml-2">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="whitespace-pre-wrap">{content}</div>
    </div>
  );
}