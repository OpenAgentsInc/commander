import { describe, it, expect } from "vitest";
import { Schema } from "effect";
import { 
  AgentChatMessageSchema, 
  ToolCallSchema,
  createUserMessage, 
  createAssistantMessage, 
  createSystemMessage,
  createToolResponseMessage
} from "@/services/ai/core/AgentChatMessage";

describe("AgentChatMessage", () => {
  describe("Schema validation", () => {
    it("should validate a valid user message", () => {
      const userMessage = {
        role: "user",
        content: "Hello, AI!",
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(userMessage);
      expect(result).toEqual({
        _tag: "Right",
        right: userMessage
      });
    });

    it("should validate a valid assistant message", () => {
      const assistantMessage = {
        role: "assistant",
        content: "Hello, human! How can I help you?",
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(assistantMessage);
      expect(result).toEqual({
        _tag: "Right",
        right: assistantMessage
      });
    });

    it("should validate a valid system message", () => {
      const systemMessage = {
        role: "system",
        content: "You are a helpful AI assistant.",
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(systemMessage);
      expect(result).toEqual({
        _tag: "Right",
        right: systemMessage
      });
    });

    it("should validate a valid tool message", () => {
      const toolMessage = {
        role: "tool",
        content: "42",
        name: "calculator",
        tool_call_id: "call_123",
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(toolMessage);
      expect(result).toEqual({
        _tag: "Right",
        right: toolMessage
      });
    });

    it("should validate a message with tool calls", () => {
      const toolCallMessage = {
        role: "assistant",
        content: "I'll help you calculate that.",
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: {
              name: "calculate",
              arguments: '{"expression": "2+2"}'
            }
          }
        ],
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(toolCallMessage);
      expect(result).toEqual({
        _tag: "Right",
        right: toolCallMessage
      });
    });

    it("should fail to validate an invalid message with incorrect role", () => {
      const invalidMessage = {
        role: "invalid_role", // Invalid role
        content: "Hello, AI!",
        timestamp: Date.now()
      };
      
      const result = Schema.decode(AgentChatMessageSchema)(invalidMessage);
      expect(result._tag).toBe("Left");
    });

    it("should fail to validate an invalid tool call", () => {
      const invalidToolCall = {
        id: "call_123",
        // Missing type field
        function: {
          name: "calculate",
          arguments: '{"expression": "2+2"}'
        }
      };
      
      const result = Schema.decode(ToolCallSchema)(invalidToolCall);
      expect(result._tag).toBe("Left");
    });
  });

  describe("Helper functions", () => {
    it("should create a proper user message", () => {
      const content = "Hello, AI!";
      const message = createUserMessage(content);
      
      expect(message.role).toBe("user");
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeTypeOf("number");
    });

    it("should create a proper assistant message", () => {
      const content = "Hello, human!";
      const message = createAssistantMessage(content);
      
      expect(message.role).toBe("assistant");
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeTypeOf("number");
      expect(message.isStreaming).toBe(false);
    });

    it("should create a proper streaming assistant message", () => {
      const content = "Hello";
      const message = createAssistantMessage(content, true);
      
      expect(message.role).toBe("assistant");
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeTypeOf("number");
      expect(message.isStreaming).toBe(true);
    });

    it("should create a proper system message", () => {
      const content = "You are a helpful AI assistant.";
      const message = createSystemMessage(content);
      
      expect(message.role).toBe("system");
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeTypeOf("number");
    });

    it("should create a proper tool response message", () => {
      const toolCallId = "call_123";
      const toolName = "calculator";
      const content = "4";
      const message = createToolResponseMessage(toolCallId, toolName, content);
      
      expect(message.role).toBe("tool");
      expect(message.content).toBe(content);
      expect(message.tool_call_id).toBe(toolCallId);
      expect(message.name).toBe(toolName);
      expect(message.timestamp).toBeTypeOf("number");
    });
  });
});