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
  // Added properties for NIP28 channels and other custom usage
  author?: string;
  timestamp?: number;
  id?: string;
  [key: string]: any; // Allow any additional properties
}

export function ChatMessage({
  content,
  role,
  isStreaming,
  author,
  timestamp,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex",
        role === "user"
          ? "justify-end"
          : role === "system"
            ? "justify-center"
            : "justify-start",
      )}
    >
      <div
        className={cn(
          "mb-1 inline-block max-w-[85%] rounded-md px-2 py-1 text-xs",
          role === "user"
            ? "border-border bg-background text-foreground border text-right"
            : role === "assistant"
              ? isStreaming
                ? "border-border bg-background text-foreground border"
                : "border-border bg-background text-foreground border"
              : "border-border bg-background text-foreground border text-[10px] italic",
        )}
      >
        <div className="text-foreground mb-0.5 flex items-center text-[10px] font-semibold">
          <span>
            {author ||
              (role === "user"
                ? "Commander"
                : role === "assistant"
                  ? "Agent"
                  : "System")}
          </span>
          {isStreaming && (
            <span className="ml-1 inline-flex items-center">
              <Loader2 className="text-foreground h-3 w-3 animate-spin" />
            </span>
          )}
        </div>
        <div className="text-foreground max-w-full whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="text-foreground ml-0.5 animate-pulse">▋</span>
          )}
        </div>
      </div>
    </div>
  );
}
