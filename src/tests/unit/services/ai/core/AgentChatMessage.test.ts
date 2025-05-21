import { describe, it, expect } from "vitest";
import { Schema, Effect } from "effect";
import { 
  AgentChatMessageSchema, 
  ToolCallSchema,
  createUserMessage, 
  createAssistantMessage, 
  createSystemMessage,
  createToolResponseMessage,
  type AgentChatMessage
} from "@/services/ai/core/AgentChatMessage";

describe("AgentChatMessage", () => {
  describe("Schema validation", () => {
    it("should validate a valid user message", async () => {
      const userMessage: AgentChatMessage = {
        role: "user" as const,
        content: "Hello, AI!",
        timestamp: Date.now()
      };
      
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AgentChatMessageSchema)(userMessage)
      );
      expect(result).toEqual(userMessage);
    });

    it("should validate a valid assistant message", async () => {
      const assistantMessage: AgentChatMessage = {
        role: "assistant" as const,
        content: "Hello, human! How can I help you?",
        timestamp: Date.now()
      };
      
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AgentChatMessageSchema)(assistantMessage)
      );
      expect(result).toEqual(assistantMessage);
    });

    it("should validate a valid system message", async () => {
      const systemMessage: AgentChatMessage = {
        role: "system" as const,
        content: "You are a helpful AI assistant.",
        timestamp: Date.now()
      };
      
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AgentChatMessageSchema)(systemMessage)
      );
      expect(result).toEqual(systemMessage);
    });

    it("should validate a valid tool message", async () => {
      const toolMessage: AgentChatMessage = {
        role: "tool" as const,
        content: "42",
        name: "calculator",
        tool_call_id: "call_123",
        timestamp: Date.now()
      };
      
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AgentChatMessageSchema)(toolMessage)
      );
      expect(result).toEqual(toolMessage);
    });

    it("should validate a message with tool calls", async () => {
      const toolCallMessage: AgentChatMessage = {
        role: "assistant" as const,
        content: "I'll help you calculate that.",
        tool_calls: [
          {
            id: "call_123",
            type: "function" as const,
            function: {
              name: "calculate",
              arguments: '{"expression": "2+2"}'
            }
          }
        ],
        timestamp: Date.now()
      };
      
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AgentChatMessageSchema)(toolCallMessage)
      );
      expect(result).toEqual(toolCallMessage);
    });

    it("should fail to validate an invalid message with incorrect role", async () => {
      const invalidMessage = {
        role: "invalid_role", // Invalid role
        content: "Hello, AI!",
        timestamp: Date.now()
      };
      
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(AgentChatMessageSchema)(invalidMessage)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should fail to validate an invalid tool call", async () => {
      const invalidToolCall = {
        id: "call_123",
        // Missing type field
        function: {
          name: "calculate",
          arguments: '{"expression": "2+2"}'
        }
      };
      
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(ToolCallSchema)(invalidToolCall)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
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