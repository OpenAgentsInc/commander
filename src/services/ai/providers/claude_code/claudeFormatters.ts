// src/services/ai/providers/claude_code/claudeFormatters.ts
import type { AgentChatMessage } from "@/services/ai/core";

/**
 * Formats messages for Claude CLI prompt format.
 * - Filters out system messages.
 * - Maps 'user' role to 'Human:' and 'assistant' role to 'Assistant:'.
 * - Joins messages with '\n\n'.
 * - Appends '\n\nAssistant:' if the last message was from a Human.
 */
export function formatMessagesForClaudeCli(messages: AgentChatMessage[]): string {
  const relevantMessages = messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant",
  );

  if (relevantMessages.length === 0) {
    return ""; // Return empty string if no user/assistant messages
  }

  let prompt = relevantMessages
    .map((message) => {
      const role = message.role === "user" ? "Human" : "Assistant";
      // Ensure content is a string, defaulting to empty if null/undefined
      const content = message.content || "";
      return `${role}: ${content}`;
    })
    .join("\n\n");

  // If the last message was from a user (Human), prompt the assistant for a response.
  const lastMessage = relevantMessages[relevantMessages.length - 1];
  if (lastMessage.role === "user") {
    prompt += "\n\nAssistant:"; // The CLI typically expects this to start generating
  }

  return prompt;
}