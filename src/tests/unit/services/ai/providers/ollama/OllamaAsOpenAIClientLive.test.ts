import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, pipe } from "effect";
import { TelemetryService } from "@/services/telemetry";
import {
  OllamaAsOpenAIClientLive,
  OllamaOpenAIClientTag,
} from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
import * as HttpClientError from "@effect/platform/HttpClientError";

// Import types for CreateChatCompletionRequest and CreateChatCompletionResponse
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse
} from "@effect/ai-openai/Generated";

// Mock imports
vi.mock("@effect/ai-openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@effect/ai-openai")>();
  return {
    ...(actual || {}),
  };
});

// Mock window.electronAPI.ollama
const mockGenerateChatCompletion = vi.fn();
const mockGenerateChatCompletionStream = vi.fn();

// Mock TelemetryService
const mockTelemetryTrackEvent = vi
  .fn()
  .mockImplementation(() => Effect.succeed(undefined));
const mockTelemetryServiceImpl = {
  trackEvent: mockTelemetryTrackEvent,
  isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
  setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
};
const MockTelemetryService = Layer.succeed(TelemetryService, mockTelemetryServiceImpl);

// Define test layer with mocked dependencies
const TestOllamaClientLayer = OllamaAsOpenAIClientLive.pipe(
  Layer.provide(MockTelemetryService)
);

describe("OllamaAsOpenAIClientLive", () => {
  beforeEach(() => {
    // Setup window.electronAPI mock
    (globalThis as any).window = {
      ...(globalThis as any).window,
      electronAPI: {
        ...((globalThis as any).window?.electronAPI || {}),
        ollama: {
          checkStatus: vi.fn(),
          generateChatCompletion: mockGenerateChatCompletion,
          generateChatCompletionStream: mockGenerateChatCompletionStream,
        },
      },
    };

    // Reset mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully build the layer when IPC functions are available", async () => {
    const program = Effect.gen(function* (_) {
      const resolvedClient = yield* _(OllamaOpenAIClientTag);
      expect(resolvedClient).toBeDefined();

      // Check client structure according to the flat OpenAiClient.Service interface
      expect(resolvedClient).toHaveProperty("client");
      
      // Assert direct methods on client (flat structure)
      expect(resolvedClient.client).toHaveProperty("createChatCompletion");
      expect(typeof resolvedClient.client.createChatCompletion).toBe("function");
      
      // Assert other methods expected by the Generated.Client interface
      expect(resolvedClient.client).toHaveProperty("createEmbedding");
      expect(typeof resolvedClient.client.createEmbedding).toBe("function");
      expect(resolvedClient.client).toHaveProperty("listModels");
      expect(typeof resolvedClient.client.listModels).toBe("function");
      
      // Check some of the assistants methods
      expect(resolvedClient.client).toHaveProperty("listAssistants");
      expect(resolvedClient.client).toHaveProperty("createAssistant");
      
      // Check the top-level stream method
      expect(resolvedClient).toHaveProperty("stream");
      expect(typeof resolvedClient.stream).toBe("function");

      // Check the streamRequest method
      expect(resolvedClient).toHaveProperty("streamRequest");
      expect(typeof resolvedClient.streamRequest).toBe("function");

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(TestOllamaClientLayer),
      ),
    );

    expect(result).toBe(true);
  });

  it("should fail if IPC bridge is not available", async () => {
    // Temporarily remove the ollama property
    const originalElectronAPI = (globalThis as any).window.electronAPI;
    (globalThis as any).window.electronAPI = {
      ...((globalThis as any).window.electronAPI || {}),
    };
    delete ((globalThis as any).window.electronAPI as any).ollama;

    const program = Effect.gen(function* (_) {
      const client = yield* _(OllamaOpenAIClientTag);
      return client;
    });

    await expect(
      Effect.runPromise(
        program.pipe(
          Effect.provide(TestOllamaClientLayer),
        ),
      ),
    ).rejects.toThrow();

    // Restore electronAPI
    (globalThis as any).window.electronAPI = originalElectronAPI;
  });

  it("should call IPC generateChatCompletion for non-streaming requests", async () => {
    // Setup mock response
    // Setup a mock response that matches the shape expected by CreateChatCompletionResponse
    // but doesn't need to match the exact type - it's just a test value that
    // matches what our adapter implementation returns
    const mockResponse = {
      id: "test-id",
      object: "chat.completion",
      created: Date.now(),
      model: "test-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Test response",
          },
          finish_reason: "stop",
          // Add logprobs (missing field) required by the type definition
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    } as unknown as typeof CreateChatCompletionResponse.Type;

    mockGenerateChatCompletion.mockResolvedValue(mockResponse);

    const program = Effect.gen(function* (_) {
      const resolvedClient = yield* _(OllamaOpenAIClientTag);
      // Access the createChatCompletion method directly on the client object
      const result = yield* _(
        resolvedClient.client.createChatCompletion({
          model: "test-model",
          messages: [{ role: "user", content: "Test prompt" }],
          stream: false,
        } as typeof CreateChatCompletionRequest.Encoded),
      );
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(TestOllamaClientLayer),
      ),
    );

    expect(mockGenerateChatCompletion).toHaveBeenCalledWith({
      model: "test-model",
      messages: [{ role: "user", content: "Test prompt" }],
      stream: false,
    });
    expect(result).toEqual(mockResponse);
    expect(mockTelemetryTrackEvent).toHaveBeenCalled();
  });

  // Additional tests would include:
  // - Testing error handling for non-streaming requests
  // - Testing streaming requests
  // - Testing stream cancellation
});
