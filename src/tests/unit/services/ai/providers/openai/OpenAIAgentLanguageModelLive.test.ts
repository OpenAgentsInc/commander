// src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Stream } from 'effect';
import { OpenAiClient } from '@effect/ai-openai';
import { AgentLanguageModel } from '@/services/ai/core';
import { OpenAIAgentLanguageModelLive } from '@/services/ai/providers/openai';
import { ConfigurationService } from '@/services/configuration';
import { AIProviderError } from '@/services/ai/core/AIError';
import { TelemetryService } from '@/services/telemetry';

// Helper for type issues in tests
const runPromiseAny = (effect: any) => Effect.runPromise(effect);

// Create a mock OpenAI client
const MockOpenAIClient: any = {
  request: vi.fn()
};

// Create a mock ConfigurationService
const MockConfigurationService: ConfigurationService = {
  getSecret: vi.fn(),
  get: vi.fn(),
  set: vi.fn(() => Effect.succeed(void 0)),
  delete: vi.fn(() => Effect.succeed(void 0))
};

// Create a mock TelemetryService
const MockTelemetryService: TelemetryService = {
  trackEvent: vi.fn(() => Effect.succeed(void 0)),
  isEnabled: vi.fn(() => Effect.succeed(true)),
  setEnabled: vi.fn(() => Effect.succeed(void 0))
};

// Mock the OpenAiLanguageModel from the OpenAIAgentLanguageModelLive file
vi.mock('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive', async () => {
  const actual = await vi.importActual('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
  
  // Create a mock provider with methods
  const mockModelProvider = {
    generateText: vi.fn(),
    streamText: vi.fn(),
    generateStructured: vi.fn()
  };
  
  // Create a mock OpenAiLanguageModel with model function that returns our mockModelProvider
  const OpenAiLanguageModel = {
    model: vi.fn().mockReturnValue(Effect.succeed(mockModelProvider))
  };
  
  return {
    ...actual,
    OpenAiLanguageModel,
    mockModelProvider // Export for test access
  };
});

describe('OpenAIAgentLanguageModelLive', () => {
  let openAIClientLayer: Layer.Layer<any>;
  let configLayer: Layer.Layer<ConfigurationService>;
  let telemetryLayer: Layer.Layer<TelemetryService>;

  beforeEach(() => {
    // Reset the mocks
    vi.clearAllMocks();
    
    openAIClientLayer = Layer.succeed(OpenAiClient.OpenAiClient, MockOpenAIClient);
    configLayer = Layer.succeed(ConfigurationService, MockConfigurationService);
    telemetryLayer = Layer.succeed(TelemetryService, MockTelemetryService);

    // Set default behavior for mock config service
    (MockConfigurationService.get as any).mockImplementation((key: string) => {
      if (key === 'OPENAI_MODEL_NAME') return Effect.succeed('gpt-4o');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    // Reset mockModelProvider methods
    mockModelProvider.generateText.mockReset();
    mockModelProvider.streamText.mockReset();
    mockModelProvider.generateStructured.mockReset();
    
    // Default success implementations
    mockModelProvider.generateText.mockReturnValue(Effect.succeed({ text: "Mock response" }));
    mockModelProvider.streamText.mockReturnValue(Stream.succeed({ text: "Streaming mock response" }));
    mockModelProvider.generateStructured.mockReturnValue(Effect.succeed({ 
      text: "Structured mock response",
      parsed: { property: "value" }
    }));
  });

  it('should successfully create an AgentLanguageModel implementation', async () => {
    // Test accessing the service
    const program = Effect.flatMap(
      AgentLanguageModel.Tag,
      model => Effect.succeed(model)
    );

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    
    // Verify the model was successfully created
    expect(result).toBeDefined();
    expect(result._tag).toBe('AgentLanguageModel');
    expect(typeof result.generateText).toBe('function');
    expect(typeof result.streamText).toBe('function');
    expect(typeof result.generateStructured).toBe('function');
    
    // Verify telemetry events
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config", 
      action: "openai_model_name_resolved", 
      value: "gpt-4o"
    }));
    
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config", 
      action: "openai_language_model_provider_created", 
      value: "gpt-4o"
    }));
  });

  it('should use the configured model name or default to gpt-4o', async () => {
    // Test with explicitly configured model
    mockConfigService.get.mockImplementation((key) => {
      if (key === 'OPENAI_MODEL_NAME') return Effect.succeed('gpt-4-turbo');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    await Effect.runPromise(
      Effect.flatMap(
        AgentLanguageModel.Tag,
        model => Effect.succeed(model)
      ).pipe(Effect.provide(testLayer))
    );

    // Verify the OpenAI model was created with the correct model name
    expect(OpenAiLanguageModel.model).toHaveBeenCalledWith('gpt-4-turbo');
  });

  it('should properly map errors in generateText', async () => {
    // Setup mock to throw an error
    const mockError = new Error('Provider test error');
    mockModelProvider.generateText.mockReturnValue(Effect.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the generateText method through the service
    const program = Effect.flatMap(
      AgentLanguageModel.Tag,
      model => model.generateText({ prompt: 'Test prompt' })
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain('OpenAI generateText error');
      expect(error.provider).toBe('OpenAI');
      expect(error.cause).toBe(mockError);
      expect(error.context).toHaveProperty('model', 'gpt-4o');
      expect(error.context).toHaveProperty('params.prompt', 'Test prompt');
    }
  });

  it('should properly map errors in streamText', async () => {
    // Setup mock to throw an error in the stream
    const mockError = new Error('Stream test error');
    mockModelProvider.streamText.mockReturnValue(Stream.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the streamText method through the service
    const program = Effect.flatMap(
      AgentLanguageModel.Tag,
      model => model.streamText({ prompt: 'Test prompt' })
    );

    const stream = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    try {
      // Try to collect chunks from the stream - should fail
      await Effect.runPromise(Stream.runCollect(stream));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain('OpenAI streamText error');
      expect(error.provider).toBe('OpenAI');
      expect(error.cause).toBe(mockError);
    }
  });

  it('should properly map errors in generateStructured', async () => {
    // Setup mock to throw an error
    const mockError = new Error('Structured test error');
    mockModelProvider.generateStructured.mockReturnValue(Effect.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the generateStructured method through the service
    const program = Effect.flatMap(
      AgentLanguageModel.Tag,
      model => model.generateStructured({ 
        prompt: 'Test prompt',
        schema: { type: 'object', properties: { name: { type: 'string' } } }
      })
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain('OpenAI generateStructured error');
      expect(error.provider).toBe('OpenAI');
      expect(error.cause).toBe(mockError);
      expect(error.context).toHaveProperty('model', 'gpt-4o');
      expect(error.context).toHaveProperty('params.prompt', 'Test prompt');
      expect(error.context).toHaveProperty('params.schema');
    }
  });
});