// src/services/ai/providers/claude_code/claudeFormatters.ts
import type { AgentChatMessage } from "@/services/ai/core";

// Extended type to handle messages with parts array from UI
interface MessageWithParts extends AgentChatMessage {
  parts?: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
    | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean }
  >;
}

/**
 * Formats messages for Claude CLI prompt format.
 * - Filters out system messages.
 * - Maps 'user' role to 'Human:' and 'assistant' role to 'Assistant:'.
 * - Handles tool calls and results from parts array.
 * - Joins messages with '\n\n'.
 * - Appends '\n\nAssistant:' if the last message was from a Human.
 */
export function formatMessagesForClaudeCli(messages: AgentChatMessage[]): string {
  const relevantMessages = (messages as MessageWithParts[]).filter(
    (msg) => msg.role === "user" || msg.role === "assistant",
  );

  if (relevantMessages.length === 0) {
    return ""; // Return empty string if no user/assistant messages
  }

  let promptParts: string[] = [];

  for (const message of relevantMessages) {
    const rolePrefix = message.role === "user" ? "Human: " : "Assistant: ";
    let turnContent = "";

    // Handle messages with parts array (from UI)
    if (message.parts && message.parts.length > 0) {
      const contentParts: string[] = [];
      
      for (const part of message.parts) {
        if (part.type === 'text') {
          contentParts.push(part.text);
        } else if (part.type === 'tool_call') {
          // Format tool calls as JSON objects that Claude CLI expects
          // The CLI expects tool_use blocks in the assistant's message
          const toolUseBlock = {
            type: 'tool_use',
            id: part.id,
            name: part.name,
            input: part.input
          };
          contentParts.push(JSON.stringify(toolUseBlock));
        } else if (part.type === 'tool_result') {
          // Format tool results as JSON objects
          // The CLI expects tool_result blocks in the user's message
          const toolResultBlock = {
            type: 'tool_result',
            tool_use_id: part.tool_use_id,
            content: typeof part.content === 'string' ? part.content : JSON.stringify(part.content),
            is_error: part.isError === true
          };
          contentParts.push(JSON.stringify(toolResultBlock));
        }
      }
      
      turnContent = contentParts.join('\n');
    } 
    // Handle legacy format with tool_calls array (from AgentChatMessage)
    else if (message.role === "assistant" && message.tool_calls && message.tool_calls.length > 0) {
      const contentParts: string[] = [];
      
      // Add text content if present
      if (message.content) {
        contentParts.push(message.content);
      }
      
      // Add tool calls
      for (const toolCall of message.tool_calls) {
        const toolUseBlock = {
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments)
        };
        contentParts.push(JSON.stringify(toolUseBlock));
      }
      
      turnContent = contentParts.join('\n');
    }
    // Handle tool responses (role="tool" messages)
    else if ((message as any).role === "tool" && message.tool_call_id) {
      // Convert tool response to user message with tool_result
      const toolResultBlock = {
        type: 'tool_result',
        tool_use_id: message.tool_call_id,
        content: message.content || "",
        is_error: false
      };
      promptParts.push(`Human: ${JSON.stringify(toolResultBlock)}`);
      continue; // Skip the regular role prefix handling
    }
    // Fallback to simple content
    else if (message.content) {
      turnContent = message.content;
    }

    // Add the formatted message
    if (turnContent || message.role === "assistant") {
      promptParts.push(`${rolePrefix}${turnContent}`);
    }
  }

  let prompt = promptParts.join("\n\n");

  // Determine if we need to add "Assistant:" suffix
  const lastMessage = relevantMessages[relevantMessages.length - 1];
  if (lastMessage) {
    // Add Assistant: if last message was from user
    if (lastMessage.role === "user") {
      prompt += "\n\nAssistant:";
    }
    // Also add Assistant: if last message was an assistant message with tool calls
    // (because the next turn would be tool results from user, then assistant needs to respond)
    else if (lastMessage.role === "assistant" && 
             ((lastMessage.parts && lastMessage.parts.some(p => p.type === 'tool_call')) ||
              (lastMessage.tool_calls && lastMessage.tool_calls.length > 0))) {
      // Don't add Assistant: here - wait for tool results first
    }
  }

  return prompt;
}