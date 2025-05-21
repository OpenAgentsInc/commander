import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context, Stream } from "effect";
import {
  AgentLanguageModel,
  type AiTextChunk,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions
} from "@/services/ai/core/AgentLanguageModel";

// We're mocking the AiError since we're just importing the type in the actual implementation
import type { AiError } from "@effect/ai/AiError";
import type { AiResponse } from "@effect/ai/AiResponse";

// Mocked classes and types for testing
const mockAiError: AiError = {
  _tag: "AiProviderError",
  message: "Mock AI Error",
  name: "AiProviderError",
  provider: "MockProvider"
};

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
  it("AgentLanguageModel.Tag should be a valid Context.Tag", () => {
    expect(AgentLanguageModel.Tag).toBeInstanceOf(Context.Tag);
  });

  it("should resolve a mock implementation via Effect context", async () => {
    const mockService = new MockAgentLanguageModel();
    const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
    
    const program = Effect.flatMap(
      AgentLanguageModel.Tag,
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
      const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
      const params: GenerateTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel.Tag,
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
      mockService.generateText.mockReturnValueOnce(Effect.fail(mockAiError));
      
      const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
      const params: GenerateTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel.Tag,
        (service) => service.generateText(params)
      );

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(result._tag).toBe("Failure");
      expect(Effect.isFailure(result)).toBe(true);
      
      if (Effect.isFailure(result)) {
        expect(result.cause.toString()).toContain("Mock AI Error");
      }
    });

    it("streamText should be callable and provide stream", async () => {
      const mockService = new MockAgentLanguageModel();
      const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
      const params: StreamTextOptions = { prompt: "Test prompt" };

      const program = Effect.flatMap(
        AgentLanguageModel.Tag,
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
      const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
      const params: GenerateStructuredOptions = { 
        prompt: "Test prompt",
        schema: { type: "object", properties: { name: { type: "string" } } }
      };

      const program = Effect.flatMap(
        AgentLanguageModel.Tag,
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