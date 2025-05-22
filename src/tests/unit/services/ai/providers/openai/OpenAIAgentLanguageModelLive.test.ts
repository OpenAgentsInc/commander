// src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts
import { Effect, Stream, Layer, Either } from "effect";
import { describe, it, expect, vi } from "vitest";
import { OpenAIAgentLanguageModelLive } from "@/services/ai/providers/openai/OpenAIAgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AiError";
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

describe("OpenAIAgentLanguageModelLive", () => {
  // Mock dependencies
  const mockOpenAiClient = {
    _tag: "OpenAiClient",
  };

  const mockConfigService = {
    get: vi.fn((key: string) => Effect.succeed("gpt-4")),
  };

  const mockTelemetry = {
    trackEvent: vi.fn(() => Effect.succeed(undefined)),
    isEnabled: vi.fn(() => Effect.succeed(true)),
  };

  // Mock OpenAI model responses
  const mockOpenAiModel = {
    generateText: vi.fn((options: any) =>
      Effect.succeed({
        text: "Generated text",
        usage: { total_tokens: 100 },
      })
    ),
    streamText: vi.fn((options: any) =>
      Stream.fromIterable([
        { text: "Chunk 1" },
        { text: "Chunk 2" },
      ])
    ),
  };

  // Mock the OpenAiLanguageModel.make function
  vi.spyOn(OpenAiLanguageModel, "make").mockImplementation(() =>
    Effect.succeed(mockOpenAiModel)
  );

  // Create test layers
  const TestOpenAiClientLayer = Layer.succeed(
    OpenAiClient.OpenAiClient,
    mockOpenAiClient
  );

  const TestConfigServiceLayer = Layer.succeed(
    ConfigurationService,
    mockConfigService
  );

  const TestTelemetryLayer = Layer.succeed(
    TelemetryService,
    mockTelemetry
  );

  const TestLayers = TestOpenAiClientLayer.pipe(
    Layer.provide(TestConfigServiceLayer),
    Layer.provide(TestTelemetryLayer)
  );

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(
          model.generateText({
            prompt: "Test prompt",
            temperature: 0.7,
            maxTokens: 100,
          })
        );
        return response;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provideLayer(TestLayers))
      );

      expect(result).toBeInstanceOf(AiResponse);
      expect(result.text).toBe("Generated text");
      expect(result.metadata?.usage?.total_tokens).toBe(100);
    });

    it("should handle errors properly", async () => {
      // Mock error case
      mockOpenAiModel.generateText.mockImplementationOnce(() =>
        Effect.fail(new Error("API Error"))
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(
          model.generateText({
            prompt: "Test prompt",
          })
        );
        return response;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.either,
          Effect.provideLayer(TestLayers)
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(error).toBeInstanceOf(AiProviderError);
        expect(error.message).toContain("API Error");
      }
    });
  });

  describe("streamText", () => {
    it("should stream text chunks successfully", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const chunks: AiTextChunk[] = [];

        yield* _(
          model
            .streamText({
              prompt: "Test prompt",
              temperature: 0.7,
              maxTokens: 100,
            })
            .pipe(
              Stream.tap((chunk) => Effect.sync(() => chunks.push(chunk))),
              Stream.runDrain
            )
        );

        return chunks;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provideLayer(TestLayers))
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(AiTextChunk);
      expect(result[0].text).toBe("Chunk 1");
      expect(result[1].text).toBe("Chunk 2");
    });

    it("should handle stream errors properly", async () => {
      // Mock stream error
      mockOpenAiModel.streamText.mockImplementationOnce(() =>
        Stream.fail(new Error("Stream Error"))
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        yield* _(
          model
            .streamText({
              prompt: "Test prompt",
            })
            .pipe(Stream.runDrain)
        );
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.either,
          Effect.provideLayer(TestLayers)
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(error).toBeInstanceOf(AiProviderError);
        expect(error.message).toContain("Stream Error");
      }
    });
  });
});
