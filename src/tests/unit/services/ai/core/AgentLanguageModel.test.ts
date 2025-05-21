import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context, Stream } from "effect";
import {
  AgentLanguageModel, 
  type AiTextChunk,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions
} from "@/services/ai/core/AgentLanguageModel";
import { AIGenericError } from "@/services/ai/core/AIError";

// Mock AiResponse since we're not importing from @effect/ai
type AiResponse = {
  text: string;
};

// Create a mock error for testing
class MockAiError extends AIGenericError {
  provider: string;
  
  constructor() {
    super({
      message: "Mock AI Error",
    });
    this._tag = "AiProviderError";
    this.provider = "MockProvider";
  }
}

class MockAgentLanguageModel implements AgentLanguageModel {
  readonly _tag = "AgentLanguageModel";

  generateText = vi.fn((params: GenerateTextOptions) => 
    Effect.succeed({ text: "Mock generated text response" } as AiResponse)
  );

  streamText = vi.fn((params: StreamTextOptions) => 
    Stream.fromIterable([
      { text: "Mock " },
      { text: "stream " },
      { text: "response" }
    ] as AiTextChunk[])
  );

  generateStructured = vi.fn((params: GenerateStructuredOptions) => 
    Effect.succeed({ text: "Mock structured response" } as AiResponse)
  );
}

describe("AgentLanguageModel Service", () => {
  it("AgentLanguageModel should have a valid Context tag", () => {
    expect(AgentLanguageModel).toBeDefined();
    expect(typeof AgentLanguageModel).toBe("object");
  });

  it("should resolve a mock implementation via Effect context", async () => {
    const mockService = new MockAgentLanguageModel();
    const testLayer = Layer.succeed(AgentLanguageModel, mockService);
    
    const program = Effect.flatMap(
      AgentLanguageModel,
      (service) => Effect.succeed(service)
    );

    const resolvedService = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    
    expect(resolvedService).toBe(mockService);
  });

  describe("Service methods", () => {
    it("generateText should be callable and return mock response", async () => {
      const mockService = new MockAgentLanguageModel();
      const testLayer = Layer.succeed(AgentLanguageModel, mockService);
      const params: GenerateTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel,
        (service) => service.generateText(params)
      );

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.generateText).toHaveBeenCalledWith(params);
      expect(result).toEqual({ text: "Mock generated text response" });
    });

    it("generateText should properly propagate errors", async () => {
      const mockService = new MockAgentLanguageModel();
      const mockError = new MockAiError();
      mockService.generateText.mockReturnValueOnce(Effect.fail(mockError));
      
      const testLayer = Layer.succeed(AgentLanguageModel, mockService);
      const params: GenerateTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel,
        (service) => service.generateText(params)
      );

      try {
        await Effect.runPromise(
          program.pipe(Effect.provide(testLayer))
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe("Mock AI Error");
      }
    });

    it("streamText should be callable and provide stream", async () => {
      const mockService = new MockAgentLanguageModel();
      const testLayer = Layer.succeed(AgentLanguageModel, mockService);
      const params: StreamTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel,
        (service) => Effect.succeed(service.streamText(params))
      );

      const streamProvider = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );
      
      expect(mockService.streamText).toHaveBeenCalledWith(params);
      
      // Test the stream chunking
      const chunks: AiTextChunk[] = [];
      await Stream.runForEach(
        (chunk) => Effect.sync(() => chunks.push(chunk))
      )(streamProvider);
      
      expect(chunks).toEqual([
        { text: "Mock " },
        { text: "stream " },
        { text: "response" }
      ]);
    });

    it("generateStructured should be callable and return mock response", async () => {
      const mockService = new MockAgentLanguageModel();
      const testLayer = Layer.succeed(AgentLanguageModel, mockService);
      const params: GenerateStructuredOptions = { 
        prompt: "Test prompt",
        schema: { type: "object", properties: { name: { type: "string" } } }
      };

      const program = Effect.flatMap(
        AgentLanguageModel,
        (service) => service.generateStructured(params)
      );

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.generateStructured).toHaveBeenCalledWith(params);
      expect(result).toEqual({ text: "Mock structured response" });
    });
  });
});