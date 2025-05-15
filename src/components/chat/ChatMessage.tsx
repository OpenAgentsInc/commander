import React from "react";
import { cn } from "@/utils/tailwind";
import { Loader2 } from "lucide-react";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessageProps {
  content: string;
  role: MessageRole;
  isStreaming?: boolean;
  // Allow dynamic update properties for streaming implementation
  _updateId?: number;
  [key: string]: any; // Allow any additional properties
}

export function ChatMessage({ content, role, isStreaming }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex",
      role === "user" ? "justify-end" : role === "system" ? "justify-center" : "justify-start"
    )}>
      <div 
        className={cn(
          "py-1 px-2 rounded-md mb-1 text-xs inline-block max-w-[85%]",
          role === "user" 
            ? "border border-border bg-background text-foreground text-right" 
            : role === "assistant" 
              ? isStreaming ? "border border-border bg-background text-foreground" : "border border-border bg-background text-foreground"
              : "border border-border bg-background text-foreground text-[10px] italic"
        )}
      >
        <div className="text-[10px] font-semibold mb-0.5 text-foreground flex items-center">
          <span>{role === "user" ? "Commander" : role === "assistant" ? "Agent" : "System"}</span>
          {isStreaming && (
            <span className="ml-1 inline-flex items-center">
              <Loader2 className="h-3 w-3 animate-spin text-foreground" />
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap max-w-full text-foreground">
          {content}
          {isStreaming && <span className="ml-0.5 text-foreground animate-pulse">▋</span>}
        </div>
      </div>
    </div>
  );
}