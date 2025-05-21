import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Stream } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { ConfigurationService } from '@/services/configuration';
import { AgentLanguageModel } from '@/services/ai/core';
import { AIProviderError } from '@/services/ai/core/AIError';
import { OllamaAgentLanguageModelLive } from '@/services/ai/providers/ollama/OllamaAgentLanguageModelLive';
import { OllamaOpenAIClientTag } from '@/services/ai/providers/ollama/OllamaAsOpenAIClientLive';

// Mock the OpenAI client
const mockChatCompletionsCreate = vi.fn();
const MockOllamaOpenAIClient = Layer.succeed(OllamaOpenAIClientTag, {
  'chat.completions.create': mockChatCompletionsCreate,
  'embeddings.create': vi.fn(),
  'models.list': vi.fn()
});

// Mock TelemetryService
const mockTelemetryTrackEvent = vi.fn().mockImplementation(() => Effect.succeed(undefined));
const MockTelemetryService = Layer.succeed(TelemetryService, {
  trackEvent: mockTelemetryTrackEvent,
  trackError: vi.fn().mockImplementation(() => Effect.succeed(undefined))
});

// Mock ConfigurationService
const mockConfigGet = vi.fn();
const MockConfigurationService = Layer.succeed(ConfigurationService, {
  get: mockConfigGet,
  getSecret: vi.fn(),
  set: vi.fn(),
  delete: vi.fn()
});

describe('OllamaAgentLanguageModelLive', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mocks
    mockConfigGet.mockImplementation((key) => {
      if (key === 'OLLAMA_MODEL_NAME') {
        return Effect.succeed('gemma3:1b');
      }
      return Effect.fail({ message: `Key not found: ${key}` });
    });

    // Mock successful response from Ollama
    mockChatCompletionsCreate.mockImplementation((params) => {
      if (params.stream) {
        // Return a Stream for streaming requests
        return Stream.fromIterable([
          {
            id: 'test-id',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: params.model,
            choices: [
              {
                index: 0,
                delta: { content: 'Test response' },
                finish_reason: null
              }
            ]
          }
        ]);
      } else {
        // Return an Effect for non-streaming requests
        return Effect.succeed({
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: params.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        });
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully build the layer and provide AgentLanguageModel', async () => {
    const program = Effect.gen(function*(_) {
      const agentLM = yield* _(AgentLanguageModel.Tag);
      expect(agentLM).toBeDefined();
      expect(agentLM._tag).toBe('AgentLanguageModel');
      expect(typeof agentLM.generateText).toBe('function');
      expect(typeof agentLM.streamText).toBe('function');
      expect(typeof agentLM.generateStructured).toBe('function');
      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService
              )
            )
          )
        )
      )
    );

    expect(result).toBe(true);
    expect(mockConfigGet).toHaveBeenCalledWith('OLLAMA_MODEL_NAME');
    expect(mockTelemetryTrackEvent).toHaveBeenCalled();
  });

  it('should use default model name if config value is not found', async () => {
    // Override mock to simulate missing config
    mockConfigGet.mockImplementation(() => 
      Effect.fail({ message: 'Key not found: OLLAMA_MODEL_NAME' })
    );

    const program = Effect.gen(function*(_) {
      const agentLM = yield* _(AgentLanguageModel.Tag);
      const result = yield* _(agentLM.generateText({ prompt: 'test' }));
      return result;
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService
              )
            )
          )
        )
      )
    );

    // Verify the default model was used
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemma3:1b', // This is the default in OllamaAgentLanguageModelLive
      })
    );
  });

  it('should properly call generateText with correct parameters', async () => {
    const program = Effect.gen(function*(_) {
      const agentLM = yield* _(AgentLanguageModel.Tag);
      const result = yield* _(agentLM.generateText({
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 100
      }));
      return result;
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService
              )
            )
          )
        )
      )
    );

    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemma3:1b',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test prompt'
          })
        ]),
        temperature: 0.7,
        max_tokens: 100,
        stream: false
      })
    );
  });

  it('should properly map errors from the client to AIProviderError', async () => {
    // Mock an error response
    mockChatCompletionsCreate.mockImplementation(() => 
      Effect.fail({ message: 'Test error' })
    );

    const program = Effect.gen(function*(_) {
      const agentLM = yield* _(AgentLanguageModel.Tag);
      return yield* _(agentLM.generateText({
        prompt: 'Test prompt'
      }));
    });

    await expect(
      Effect.runPromise(
        program.pipe(
          Effect.provide(
            OllamaAgentLanguageModelLive.pipe(
              Layer.provide(
                Layer.mergeAll(
                  MockOllamaOpenAIClient,
                  MockConfigurationService,
                  MockTelemetryService
                )
              )
            )
          )
        )
      )
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  // Additional tests would include:
  // - Testing streamText method
  // - Testing generateStructured method
  // - Testing error handling for each method
});