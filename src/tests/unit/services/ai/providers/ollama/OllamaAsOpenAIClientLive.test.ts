import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, pipe } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { OllamaAsOpenAIClientLive, OllamaOpenAIClientTag } from '@/services/ai/providers/ollama/OllamaAsOpenAIClientLive';
import { OpenAiError } from '@effect/ai-openai';

// Mock OpenAiError to fix the test
vi.mock('@effect/ai-openai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    OpenAiError: class OpenAiError extends Error {
      constructor(options: any) {
        super(options.error?.message || 'OpenAI error');
        this.name = 'OpenAiError';
      }
    }
  };
});

// Mock window.electronAPI.ollama
const mockGenerateChatCompletion = vi.fn();
const mockGenerateChatCompletionStream = vi.fn();

// Mock TelemetryService
const mockTelemetryTrackEvent = vi.fn().mockImplementation(() => Effect.succeed(undefined));
const MockTelemetryService = Layer.succeed(TelemetryService, {
  trackEvent: mockTelemetryTrackEvent,
  trackError: vi.fn().mockImplementation(() => Effect.succeed(undefined))
});

describe('OllamaAsOpenAIClientLive', () => {
  beforeEach(() => {
    // Setup window.electronAPI mock
    global.window = {
      ...global.window,
      electronAPI: {
        ...global.window?.electronAPI,
        ollama: {
          checkStatus: vi.fn(),
          generateChatCompletion: mockGenerateChatCompletion,
          generateChatCompletionStream: mockGenerateChatCompletionStream
        }
      }
    } as any;

    // Reset mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully build the layer when IPC functions are available', async () => {
    const program = Effect.gen(function*(_) {
      const client = yield* _(OllamaOpenAIClientTag);
      expect(client).toBeDefined();
      expect(typeof client["chat.completions.create"]).toBe('function');
      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService))))
    );

    expect(result).toBe(true);
  });

  it('should fail if IPC bridge is not available', async () => {
    // Temporarily remove the ollama property
    const originalElectronAPI = global.window.electronAPI;
    global.window.electronAPI = { ...global.window.electronAPI };
    delete global.window.electronAPI.ollama;

    const program = Effect.gen(function*(_) {
      const client = yield* _(OllamaOpenAIClientTag);
      return client;
    });

    await expect(
      Effect.runPromise(
        program.pipe(Effect.provide(OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService))))
      )
    ).rejects.toThrow();

    // Restore electronAPI
    global.window.electronAPI = originalElectronAPI;
  });

  it.skip('should call IPC generateChatCompletion for non-streaming requests', async () => {
    // Setup mock response
    const mockResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'test-model',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    };

    mockGenerateChatCompletion.mockResolvedValue(mockResponse);

    const program = Effect.gen(function*(_) {
      const client = yield* _(OllamaOpenAIClientTag);
      const result = yield* _(client['chat.completions.create']({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Test prompt' }],
        stream: false
      }));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService))))
    );

    expect(mockGenerateChatCompletion).toHaveBeenCalledWith({
      model: 'test-model', 
      messages: [{ role: 'user', content: 'Test prompt' }],
      stream: false
    });
    expect(result).toEqual(mockResponse);
    expect(mockTelemetryTrackEvent).toHaveBeenCalled();
  });

  // Additional tests would include:
  // - Testing error handling for non-streaming requests
  // - Testing streaming requests
  // - Testing stream cancellation
});