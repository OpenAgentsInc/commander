import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context, Stream, Chunk } from "effect";
import type { AiError } from "@effect/ai/AiError";
import type { AiResponse } from "@effect/ai/AiResponse";
import {
  AgentLanguageModel, 
  type AiTextChunk,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions
} from "@/services/ai/core/AgentLanguageModel";
import { AIGenericError } from "@/services/ai/core/AIError";

// Create a type that mimics AiResponse but has only what we need for testing
interface MockAiResponse {
  text: string;
}

// Create a mock error for testing
class MockAiError extends AIGenericError implements AiError {
  name: string;
  provider: string;
  
  constructor() {
    super({
      message: "Mock AI Error",
    });
    this.name = "AiProviderError";
    this._tag = "AiProviderError";
    this.provider = "MockProvider";
  }
}

class MockAgentLanguageModel implements AgentLanguageModel {
  readonly _tag = "AgentLanguageModel";

  generateText = vi.fn((_params: GenerateTextOptions) => 
    Effect.succeed({ text: "Mock generated text response" } as MockAiResponse as AiResponse)
  );

  streamText = vi.fn((_params: StreamTextOptions) => 
    Stream.fromIterable([
      { text: "Mock " },
      { text: "stream " },
      { text: "response" }
    ] as AiTextChunk[])
  );

  generateStructured = vi.fn((_params: GenerateStructuredOptions) => 
    Effect.succeed({ text: "Mock structured response" } as MockAiResponse as AiResponse)
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
      // Cast the mockReturnValue to handle the AiError type
      mockService.generateText.mockReturnValueOnce(Effect.fail(mockError) as Effect.Effect<AiResponse, AiError>);
      
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
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBe("Mock AI Error");
      }
    });

    it("streamText should be callable and provide stream", async () => {
      const mockService = new MockAgentLanguageModel();
      
      // Create test data
      const testChunks = [
        { text: "Mock " },
        { text: "stream " },
        { text: "response" }
      ] as AiTextChunk[];
      
      // Use a simpler approach - directly mock the implementation
      mockService.streamText.mockImplementation(() => {
        return Stream.fromIterable(testChunks);
      });

      const testLayer = Layer.succeed(AgentLanguageModel, mockService);
      const params: StreamTextOptions = { prompt: "Test prompt" };

      // Use Effect.gen to get the stream and collect it
      const program = Effect.gen(function*($) {
        const model = yield* $(AgentLanguageModel);
        const stream = model.streamText(params);
        const chunks = yield* $(Stream.runCollect(stream));
        return chunks;
      });
      
      const collected = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );
      
      // Convert Chunk to array for comparison
      const result = Array.from(collected);
      
      expect(mockService.streamText).toHaveBeenCalledWith(params);
      expect(result).toEqual(testChunks);
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