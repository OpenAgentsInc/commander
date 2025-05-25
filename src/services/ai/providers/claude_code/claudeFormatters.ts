// src/services/ai/providers/claude_code/claudeFormatters.ts
import type { AgentChatMessage } from "@/services/ai/core";

/**
 * Formats messages for Claude CLI prompt format
 * Converts AgentChatMessage[] to CLI-expected prompt string
 */
export function formatMessagesForClaudeCli(messages: AgentChatMessage[]): string {
  return messages
    .map(message => {
      const role = message.role.toUpperCase();
      let content = message.content || "";
      
      // The CLI expects simple USER: / ASSISTANT: format
      return `${role}: ${content}`;
    })
    .join('\n\n');
}