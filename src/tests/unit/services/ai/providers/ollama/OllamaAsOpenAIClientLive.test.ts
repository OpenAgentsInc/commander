import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, pipe } from "effect";
import { TelemetryService } from "@/services/telemetry";
import {
  OllamaAsOpenAIClientLive,
  OllamaOpenAIClientTag,
} from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
import * as HttpClientError from "@effect/platform/HttpClientError";

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
const MockTelemetryService = Layer.succeed(TelemetryService, {
  trackEvent: mockTelemetryTrackEvent,
  isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
  setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
});

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

      // Use runtime type checking instead of static typing
      // Check client structure according to OpenAiClient.Service interface
      expect(resolvedClient).toHaveProperty("client");
      expect(resolvedClient.client).toHaveProperty("chat");
      expect(resolvedClient.client.chat).toHaveProperty("completions");
      expect(resolvedClient.client.chat.completions).toHaveProperty("create");
      expect(typeof resolvedClient.client.chat.completions.create).toBe("function");

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
        Effect.provide(
          OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService)),
        ),
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
          Effect.provide(
            OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService)),
          ),
        ),
      ),
    ).rejects.toThrow();

    // Restore electronAPI
    (globalThis as any).window.electronAPI = originalElectronAPI;
  });

  it("should call IPC generateChatCompletion for non-streaming requests", async () => {
    // Setup mock response
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
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    mockGenerateChatCompletion.mockResolvedValue(mockResponse);

    const program = Effect.gen(function* (_) {
      const resolvedClient = yield* _(OllamaOpenAIClientTag);
      // Access the create method via the client.client.chat.completions path
      const result = yield* _(
        resolvedClient.client.chat.completions.create({
          model: "test-model",
          messages: [{ role: "user", content: "Test prompt" }],
          stream: false,
        }),
      );
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService)),
        ),
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
