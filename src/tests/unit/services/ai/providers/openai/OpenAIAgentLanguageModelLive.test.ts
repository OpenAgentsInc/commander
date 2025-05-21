// src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Stream } from 'effect';
import { OpenAiClient } from '@effect/ai-openai';
import { AgentLanguageModel } from '@/services/ai/core';
import { ConfigurationService } from '@/services/configuration';
import { AIProviderError } from '@/services/ai/core/AIError';
import { TelemetryService } from '@/services/telemetry';

// Create mock for OpenAIAgentLanguageModelLive
// Create mock provider with methods - create this before the mock
const mockProvider = {
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateStructured: vi.fn()
};

// Create mock OpenAIAgentLanguageModelLive module
vi.mock('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive', () => {
  // Mock the OpenAiLanguageModel
  const mockOpenAiLanguageModel = {
    model: vi.fn().mockReturnValue(Effect.succeed(mockProvider))
  };
  
  return {
    // We use the actual layer but mock its internal behavior
    OpenAIAgentLanguageModelLive: vi.fn(), // Mock this as a function for now
    OpenAiLanguageModel: mockOpenAiLanguageModel
  };
});

// Import the module but note that mockProvider is defined outside, not imported
import { OpenAIAgentLanguageModelLive } from '@/services/ai/providers/openai';

// Helper for type issues in tests
// @ts-ignore - intentionally ignoring type mismatches for Effect parameters
const runEffect = async <T>(effect: Effect.Effect<T, any, any>): Promise<T> => {
  return Effect.runPromise(effect as any);
};

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

    // Default success implementations
    mockProvider.generateText.mockReturnValue(Effect.succeed({ text: "Mock response" }));
    mockProvider.streamText.mockReturnValue(Stream.succeed({ text: "Streaming mock response" }));
    mockProvider.generateStructured.mockReturnValue(Effect.succeed({ 
      text: "Structured mock response",
      parsed: { property: "value" }
    }));
  });

  it('should successfully create an AgentLanguageModel implementation', async () => {
    // Test accessing the service
    const program = Effect.flatMap(
      AgentLanguageModel,
      model => Effect.succeed(model)
    );

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    const result = await runEffect(Effect.provide(program, testLayer));
    
    // Verify the model was successfully created
    expect(result).toBeDefined();
    expect(result._tag).toBe('AgentLanguageModel');
    expect(typeof result.generateText).toBe('function');
    expect(typeof result.streamText).toBe('function');
    expect(typeof result.generateStructured).toBe('function');
    
    // Verify telemetry events
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config", 
      action: "openai_model_name_resolved", 
      value: "gpt-4o"
    }));
    
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config", 
      action: "openai_language_model_provider_created", 
      value: "gpt-4o"
    }));
  });

  it('should use the configured model name or default to gpt-4o', async () => {
    // Test with explicitly configured model
    (MockConfigurationService.get as any).mockImplementation((key) => {
      if (key === 'OPENAI_MODEL_NAME') return Effect.succeed('gpt-4-turbo');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    await runEffect(
      Effect.provide(
        Effect.flatMap(AgentLanguageModel, model => Effect.succeed(model)),
        testLayer
      )
    );
    
    // Get the imported mock from the vi.fn() we created earlier
    const { OpenAiLanguageModel } = await vi.importMock('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
    
    // Verify the OpenAI model was created with the correct model name
    expect(OpenAiLanguageModel.model).toHaveBeenCalledWith('gpt-4-turbo');
  });

  it('should properly map errors in generateText', async () => {
    // Setup mock to throw an error
    const mockError = new Error('Provider test error');
    mockProvider.generateText.mockReturnValue(Effect.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the generateText method through the service
    const program = Effect.flatMap(
      AgentLanguageModel,
      model => model.generateText({ prompt: 'Test prompt' })
    );

    try {
      await runEffect(Effect.provide(program, testLayer));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // First unwrap the FiberFailure if needed
      const actualError = error._id === 'FiberFailure' ? error.cause.defect : error;
      
      expect(actualError).toBeInstanceOf(AIProviderError);
      expect(actualError.message).toContain('OpenAI generateText error');
      expect(actualError.provider).toBe('OpenAI');
      expect(actualError.cause).toBe(mockError);
      expect(actualError.context).toHaveProperty('model', 'gpt-4o');
      expect(actualError.context).toHaveProperty('params.prompt', 'Test prompt');
    }
  });

  it('should properly map errors in streamText', async () => {
    // Setup mock to throw an error in the stream
    const mockError = new Error('Stream test error');
    mockProvider.streamText.mockReturnValue(Stream.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Use a different approach for testing streams
    const program = Effect.gen(function*($) {
      // Access the AgentLanguageModel service
      const model = yield* $(AgentLanguageModel);
      
      // Get the stream from the model
      const stream = model.streamText({ prompt: 'Test prompt' });
      
      // Convert Stream to Effect<Array> to collect all chunks
      const chunks = yield* $(Stream.runCollect(stream));
      
      return chunks;
    });

    try {
      await runEffect(Effect.provide(program, testLayer));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // First unwrap the FiberFailure if needed
      const actualError = error._id === 'FiberFailure' ? error.cause.defect : error;
      
      expect(actualError).toBeInstanceOf(AIProviderError);
      expect(actualError.message).toContain('OpenAI streamText error');
      expect(actualError.provider).toBe('OpenAI');
      expect(actualError.cause).toBe(mockError);
    }
  });

  it('should properly map errors in generateStructured', async () => {
    // Setup mock to throw an error
    const mockError = new Error('Structured test error');
    mockProvider.generateStructured.mockReturnValue(Effect.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the generateStructured method through the service
    const program = Effect.flatMap(
      AgentLanguageModel,
      model => model.generateStructured({ 
        prompt: 'Test prompt',
        schema: { type: 'object', properties: { name: { type: 'string' } } }
      })
    );

    try {
      await runEffect(Effect.provide(program, testLayer));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // First unwrap the FiberFailure if needed
      const actualError = error._id === 'FiberFailure' ? error.cause.defect : error;
      
      expect(actualError).toBeInstanceOf(AIProviderError);
      expect(actualError.message).toContain('OpenAI generateStructured error');
      expect(actualError.provider).toBe('OpenAI');
      expect(actualError.cause).toBe(mockError);
      expect(actualError.context).toHaveProperty('model', 'gpt-4o');
      expect(actualError.context).toHaveProperty('params.prompt', 'Test prompt');
      expect(actualError.context).toHaveProperty('params.schema');
    }
  });
});