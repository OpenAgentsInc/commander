// src/services/ai/core/AgentChatMessage.ts
import { Schema } from "@effect/schema";

/**
 * Schema for tool calls in chat messages
 * This aligns with the OpenAI API format for tool calls
 */
export const ToolCallSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("function"),
  function: Schema.Struct({
    name: Schema.String,
    arguments: Schema.String, // JSON string of arguments
  }),
});

export type ToolCall = Schema.Schema.Type<typeof ToolCallSchema>;

/**
 * Schema for chat messages that can be exchanged with AI models
 * Follows standard chat message format used by LLM providers
 */
export const AgentChatMessageSchema = Schema.Struct({
  role: Schema.Union(
    Schema.Literal("user"),
    Schema.Literal("assistant"),
    Schema.Literal("system"),
    Schema.Literal("tool") // Added for tool responses
  ),
  content: Schema.NullishOr(Schema.String), // Content can be null for assistant messages with tool_calls
  name: Schema.optional(Schema.String), // For tool role, name of the tool
  tool_calls: Schema.optional(Schema.Array(ToolCallSchema)), // For messages that include tool calls
  tool_call_id: Schema.optional(Schema.String), // For tool responses, indicating which tool call it's responding to
  // UI-specific fields, not sent to the AI model
  isStreaming: Schema.optional(Schema.Boolean), // Whether this message is currently being streamed
  timestamp: Schema.optional(Schema.Number), // When the message was created
});

export type AgentChatMessage = Schema.Schema.Type<typeof AgentChatMessageSchema>;

/**
 * Represents a chunk of text received during streaming
 */
export const AgentChatMessageChunkSchema = Schema.Struct({
  messageId: Schema.String, // ID of the message being streamed
  text: Schema.String, // The new text chunk
  index: Schema.Number, // Position of the chunk in the sequence
});

export type AgentChatMessageChunk = Schema.Schema.Type<typeof AgentChatMessageChunkSchema>;

/**
 * Creates a basic user message
 * @param content The user message content
 * @returns A properly formatted user chat message
 */
export const createUserMessage = (content: string): AgentChatMessage => ({
  role: "user",
  content,
  timestamp: Date.now(),
});

/**
 * Creates a basic assistant message
 * @param content The assistant message content
 * @param isStreaming Whether the message is being streamed
 * @returns A properly formatted assistant chat message
 */
export const createAssistantMessage = (
  content: string | null = "", 
  isStreaming = false
): AgentChatMessage => ({
  role: "assistant",
  content,
  isStreaming,
  timestamp: Date.now(),
});

/**
 * Creates a system message
 * @param content The system message content
 * @returns A properly formatted system chat message
 */
export const createSystemMessage = (content: string): AgentChatMessage => ({
  role: "system",
  content,
  timestamp: Date.now(),
});

/**
 * Creates a tool response message
 * @param toolCallId ID of the tool call this message responds to
 * @param toolName Name of the tool
 * @param content The result of the tool execution
 * @returns A properly formatted tool response message
 */
export const createToolResponseMessage = (
  toolCallId: string,
  toolName: string,
  content: string
): AgentChatMessage => ({
  role: "tool",
  tool_call_id: toolCallId,
  name: toolName,
  content,
  timestamp: Date.now(),
});