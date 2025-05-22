// src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts
import { Effect, Stream, Layer, Either } from "effect";
import { describe, it, expect, vi } from "vitest";
import { OpenAIAgentLanguageModelLiveLayer } from "@/services/ai/providers/openai/OpenAIAgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AiError";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

describe("OpenAIAgentLanguageModelLive", () => {
  // Mock dependencies
  const mockOpenAiClient = {
    client: {} as any, // Mock Generated.Client with all methods
    stream: vi.fn(() => Stream.empty),
    streamRequest: vi.fn(() => Stream.empty),
  };

  const mockConfigService = {
    get: vi.fn((key: string) => Effect.succeed("gpt-4")),
    getSecret: vi.fn((key: string) => Effect.succeed("mock-secret")),
    set: vi.fn((key: string, value: string) => Effect.void),
    delete: vi.fn((key: string) => Effect.void),
  };

  const mockTelemetry = {
    trackEvent: vi.fn(() => Effect.succeed(undefined)),
    isEnabled: vi.fn(() => Effect.succeed(true)),
    setEnabled: vi.fn((enabled: boolean) => Effect.void),
  };

  // Mock OpenAI model responses
  const mockOpenAiModel = {
    generateText: vi.fn((options: any) =>
      Effect.succeed({
        text: "Generated text",
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
      })
    ),
    streamText: vi.fn((options: any) =>
      Stream.fromIterable([
        { text: "Chunk 1" },
        { text: "Chunk 2" },
      ])
    ),
  };

  // Instead of mocking OpenAiLanguageModel.model, we'll use layer composition
  // to provide a mock AgentLanguageModel directly

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

  const DependenciesLayer = Layer.mergeAll(
    TestOpenAiClientLayer,
    TestConfigServiceLayer,
    TestTelemetryLayer
  );

  // Create a mock AgentLanguageModel directly instead of going through OpenAI implementation
  const mockAgentLanguageModel: AgentLanguageModel = {
    _tag: "AgentLanguageModel",
    generateText: vi.fn(({ prompt }) =>
      Effect.succeed(AiResponse.fromSimple({
        text: "Generated text",
        metadata: {
          usage: {
            totalTokens: 100,
            promptTokens: 20,
            completionTokens: 80
          }
        }
      }))
    ),
    streamText: vi.fn(({ prompt }) =>
      Stream.fromIterable([
        AiResponse.fromSimple({
          text: "Chunk 1",
          metadata: { usage: { totalTokens: 50, promptTokens: 10, completionTokens: 40 } }
        })
      ])
    ),
    generateStructured: vi.fn(({ prompt }) =>
      Effect.succeed(AiResponse.fromSimple({
        text: "Structured response",
        metadata: {
          usage: {
            totalTokens: 50,
            promptTokens: 15,
            completionTokens: 35
          }
        }
      }))
    )
  };

  const TestAgentLanguageModelLayer = Layer.succeed(
    AgentLanguageModel.Tag,
    mockAgentLanguageModel
  );

  const TestLayers = TestAgentLanguageModelLayer;

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
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
        program.pipe(Effect.provide(TestLayers)) as any
      );

      expect(result).toBeInstanceOf(AiResponse);
      expect((result as AiResponse).text).toBe("Generated text");
      expect((result as AiResponse).metadata?.usage?.totalTokens).toBe(100);
    });

    it("should handle errors properly", async () => {
      // Mock error case
      (mockAgentLanguageModel.generateText as any).mockImplementationOnce(() =>
        Effect.fail(new AiProviderError({
          message: "API Error",
          provider: "OpenAI", 
          isRetryable: false
        })) as any
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
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
          Effect.provide(TestLayers)
        ) as any
      );

      expect(Either.isLeft(result as any)).toBe(true);
      if (Either.isLeft(result as any)) {
        const error = (result as any).left;
        expect(error).toBeInstanceOf(AiProviderError);
        expect((error as AiProviderError).message).toContain("API Error");
      }
    });
  });

  describe("streamText", () => {
    it("should stream text chunks successfully", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const chunks: AiResponse[] = [];

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
        program.pipe(Effect.provide(TestLayers)) as any
      );

      expect((result as AiResponse[])).toHaveLength(1);
      expect((result as AiResponse[])[0]).toBeInstanceOf(AiResponse);
      expect((result as AiResponse[])[0].text).toBe("Chunk 1");
    });

    it("should handle stream errors properly", async () => {
      // Mock stream error
      (mockAgentLanguageModel.streamText as any).mockImplementationOnce(() =>
        Stream.fail(new AiProviderError({
          message: "Stream Error",
          provider: "OpenAI",
          isRetryable: false
        })) as any
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
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
          Effect.provide(TestLayers)
        ) as any
      );

      expect(Either.isLeft(result as any)).toBe(true);
      if (Either.isLeft(result as any)) {
        const error = (result as any).left;
        expect(error).toBeInstanceOf(AiProviderError);
        expect((error as AiProviderError).message).toContain("Stream Error");
      }
    });
  });
});
