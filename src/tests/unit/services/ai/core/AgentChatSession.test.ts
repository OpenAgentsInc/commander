import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context } from "effect";
import { 
  AgentChatSession 
} from "@/services/ai/core/AgentChatSession";
import { 
  AIContextWindowError 
} from "@/services/ai/core/AIError";
import type { 
  AgentChatMessage 
} from "@/services/ai/core/AgentChatMessage";

// Mock chat message for testing
const mockUserMessage: AgentChatMessage = {
  role: "user",
  content: "Hello AI",
  timestamp: Date.now()
};

const mockAssistantMessage: AgentChatMessage = {
  role: "assistant",
  content: "Hello human",
  timestamp: Date.now()
};

const mockSystemMessage: AgentChatMessage = {
  role: "system",
  content: "You are a helpful AI assistant",
  timestamp: Date.now()
};

// Mock implementation of AgentChatSession
class MockAgentChatSession implements AgentChatSession {
  readonly _tag = "AgentChatSession";
  private messages: AgentChatMessage[] = [];

  addMessage = vi.fn((message: AgentChatMessage) => {
    // For testing token limit errors
    if (message.content && message.content.includes("TOKEN_LIMIT_TEST")) {
      return Effect.fail(new AIContextWindowError({
        message: "Context window exceeded",
        limit: 4000,
        current: 4100
      }));
    }
    
    this.messages.push(message);
    return Effect.succeed(void 0);
  });

  getHistory = vi.fn((options?: { limit?: number }) => {
    let result = [...this.messages];
    
    if (options?.limit) {
      result = result.slice(-options.limit);
    }
    
    return Effect.succeed(result);
  });

  clearHistory = vi.fn(() => {
    this.messages = [];
    return Effect.succeed(void 0);
  });

  prepareMessagesForModel = vi.fn((options?: { 
    maxTokens?: number,
    includeSystemMessage?: boolean,
    systemMessage?: string
  }) => {
    // For testing token limit errors
    if (options?.maxTokens === 1) {
      return Effect.fail(new AIContextWindowError({
        message: "Cannot prepare messages: token limit too small",
        limit: options.maxTokens,
        current: this.messages.length * 10 // Simplified token estimation
      }));
    }
    
    let result = [...this.messages];
    
    // Add system message if requested
    if (options?.includeSystemMessage && options?.systemMessage) {
      result.unshift({
        role: "system",
        content: options.systemMessage,
        timestamp: Date.now()
      });
    }
    
    return Effect.succeed(result);
  });

  getEstimatedTokenCount = vi.fn(() => {
    // Very simplified token estimation for testing
    const tokenCount = this.messages.reduce((sum, msg) => {
      return sum + (msg.content ? msg.content.length : 0);
    }, 0);
    
    return Effect.succeed(tokenCount);
  });
}

describe("AgentChatSession Service", () => {
  it("AgentChatSession.Tag should be a valid Context.Tag", () => {
    expect(AgentChatSession.Tag).toBeInstanceOf(Context.Tag);
  });

  it("should resolve a mock implementation via Effect context", async () => {
    const mockService = new MockAgentChatSession();
    const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);
    
    const program = Effect.flatMap(
      AgentChatSession.Tag,
      (service) => Effect.succeed(service)
    );

    const resolvedService = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    
    expect(resolvedService).toBe(mockService);
  });

  describe("Service methods", () => {
    it("addMessage should add a message to history", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => Effect.flatMap(
          service.addMessage(mockUserMessage),
          () => service.getHistory()
        )
      );

      const history = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.addMessage).toHaveBeenCalledWith(mockUserMessage);
      expect(history).toContainEqual(mockUserMessage);
    });

    it("addMessage should fail with AIContextWindowError when limit exceeded", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);
      
      const tokenLimitMessage: AgentChatMessage = {
        role: "user",
        content: "TOKEN_LIMIT_TEST message",
        timestamp: Date.now()
      };

      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.addMessage(tokenLimitMessage)
      );

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(Effect.isFailure(result)).toBe(true);
      
      if (Effect.isFailure(result)) {
        expect(result.cause.toString()).toContain("Context window exceeded");
      }
    });

    it("getHistory should return all messages by default", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add some test messages
      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(mockSystemMessage),
            service.addMessage(mockUserMessage),
            service.addMessage(mockAssistantMessage)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test getHistory
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.getHistory()
      );

      const history = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(history).toHaveLength(3);
      expect(history).toContainEqual(mockSystemMessage);
      expect(history).toContainEqual(mockUserMessage);
      expect(history).toContainEqual(mockAssistantMessage);
    });

    it("getHistory should respect the limit option", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add some test messages
      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(mockSystemMessage),
            service.addMessage(mockUserMessage),
            service.addMessage(mockAssistantMessage)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test getHistory with limit
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.getHistory({ limit: 2 })
      );

      const history = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(history).toHaveLength(2);
      // Should contain the last two messages based on our mock implementation
      expect(history).toContainEqual(mockUserMessage);
      expect(history).toContainEqual(mockAssistantMessage);
    });

    it("clearHistory should remove all messages", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add some test messages
      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(mockUserMessage),
            service.addMessage(mockAssistantMessage)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test clearHistory
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => Effect.flatMap(
          service.clearHistory(),
          () => service.getHistory()
        )
      );

      const history = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.clearHistory).toHaveBeenCalled();
      expect(history).toHaveLength(0);
    });

    it("prepareMessagesForModel should prepare messages with options", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add test messages
      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(mockUserMessage),
            service.addMessage(mockAssistantMessage)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test prepareMessagesForModel with system message
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.prepareMessagesForModel({
          includeSystemMessage: true,
          systemMessage: "Custom system message",
        })
      );

      const preparedMessages = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.prepareMessagesForModel).toHaveBeenCalledWith({
        includeSystemMessage: true,
        systemMessage: "Custom system message",
      });
      
      // Our mock adds the system message as first message
      expect(preparedMessages[0].role).toBe("system");
      expect(preparedMessages[0].content).toBe("Custom system message");
      expect(preparedMessages).toHaveLength(3); // Original 2 + system message
    });

    it("prepareMessagesForModel should fail when token limit is too small", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add test messages
      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(mockUserMessage),
            service.addMessage(mockAssistantMessage)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test with a tiny token limit
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.prepareMessagesForModel({ maxTokens: 1 })
      );

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(Effect.isFailure(result)).toBe(true);
      
      if (Effect.isFailure(result)) {
        expect(result.cause.toString()).toContain("Cannot prepare messages: token limit too small");
      }
    });

    it("getEstimatedTokenCount should return an estimated token count", async () => {
      const mockService = new MockAgentChatSession();
      const testLayer = Layer.succeed(AgentChatSession.Tag, mockService);

      // Add test messages with known content length
      const message1: AgentChatMessage = {
        role: "user",
        content: "1234567890", // 10 characters
        timestamp: Date.now()
      };
      
      const message2: AgentChatMessage = {
        role: "assistant",
        content: "12345", // 5 characters
        timestamp: Date.now()
      };

      await Effect.runPromise(
        Effect.flatMap(
          AgentChatSession.Tag,
          (service) => Effect.all([
            service.addMessage(message1),
            service.addMessage(message2)
          ], { concurrency: 1 })
        ).pipe(Effect.provide(testLayer))
      );

      // Test getEstimatedTokenCount
      const program = Effect.flatMap(
        AgentChatSession.Tag,
        (service) => service.getEstimatedTokenCount()
      );

      const tokenCount = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.getEstimatedTokenCount).toHaveBeenCalled();
      // Since our mock adds the character lengths:
      // message1.content (10) + message2.content (5) = 15
      expect(tokenCount).toBe(15);
    });
  });
});