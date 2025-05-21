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

// Mock the OpenAI provider module
vi.mock('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive', async () => {
  // This will replace the OpenAiLanguageModel in the implementation file
  const mockGenerateText = vi.fn().mockReturnValue(Effect.succeed({ text: "Mock response" }));
  const mockStreamText = vi.fn().mockReturnValue(Stream.succeed({ text: "Streaming mock response" }));
  const mockGenerateStructured = vi.fn().mockReturnValue(Effect.succeed({ 
    text: "Structured mock response",
    parsed: { property: "value" }
  }));
  
  const mockProvider = {
    generateText: mockGenerateText,
    streamText: mockStreamText,
    generateStructured: mockGenerateStructured
  };
  
  const OpenAiLanguageModel = {
    model: vi.fn().mockReturnValue(Effect.succeed(mockProvider))
  };
  
  // Import the actual module
  const actual = await vi.importActual('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
  
  // Return a modified version
  return {
    ...actual,
    OpenAiLanguageModel, // Replace with our mock
    // Expose setter functions for tests
    setMockGenerateTextResponse: (value) => mockGenerateText.mockReturnValue(value),
    setMockStreamTextResponse: (value) => mockStreamText.mockReturnValue(value),
    setMockGenerateStructuredResponse: (value) => mockGenerateStructured.mockReturnValue(value),
  };
});

describe('OpenAIAgentLanguageModelLive', () => {
  let openAIClientLayer: Layer.Layer<any>;
  let configLayer: Layer.Layer<ConfigurationService>;
  let telemetryLayer: Layer.Layer<TelemetryService>;

  beforeEach(async () => {
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

    // Reset mock responses to default values
    const module = await import('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
    module.setMockGenerateTextResponse(Effect.succeed({ text: "Mock response" }));
    module.setMockStreamTextResponse(Stream.succeed({ text: "Streaming mock response" }));
    module.setMockGenerateStructuredResponse(Effect.succeed({ 
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

    const result = await Effect.runPromise(Effect.provide(program, testLayer));
    
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
    // Import the original module and mock it before the test
    const modulePath = '@/services/ai/providers/openai/OpenAIAgentLanguageModelLive';
    const { OpenAiLanguageModel } = await import(modulePath);
    
    // Ensure the model function is a spy
    vi.spyOn(OpenAiLanguageModel, 'model').mockReturnValue(Effect.succeed({
      generateText: vi.fn().mockReturnValue(Effect.succeed({ text: "Mocked test response" })),
      streamText: vi.fn().mockReturnValue(Stream.succeed({ text: "Mocked streaming response" })),
      generateStructured: vi.fn().mockReturnValue(Effect.succeed({ text: "Mocked structured response" }))
    }));
    
    // Test with explicitly configured model
    (MockConfigurationService.get as any).mockImplementation((key) => {
      if (key === 'OPENAI_MODEL_NAME') return Effect.succeed('gpt-4-turbo');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    await Effect.runPromise(
      Effect.provide(
        Effect.flatMap(
          AgentLanguageModel,
          model => Effect.succeed(model)
        ),
        testLayer
      )
    );
    
    // Verify the OpenAI model was created with the correct model name
    expect(OpenAiLanguageModel.model).toHaveBeenCalledWith('gpt-4-turbo');
  });

  it('should properly map errors in generateText', async () => {
    // Setup mock to throw an error
    const mockError = new Error('Provider test error');
    
    // Configure the mock to return an error for generateText
    const { setMockGenerateTextResponse } = await import('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
    setMockGenerateTextResponse(Effect.fail(mockError));

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
      await Effect.runPromise(Effect.provide(program, testLayer));
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
    
    // Configure the mock to return an error for streamText
    const { setMockStreamTextResponse } = await import('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
    setMockStreamTextResponse(Stream.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer, telemetryLayer)
    );

    // Test the streamText method through the service
    const program = Effect.flatMap(
      AgentLanguageModel,
      model => model.streamText({ prompt: 'Test prompt' })
    );

    const stream = await Effect.runPromise(
      Effect.provide(program, testLayer)
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
    
    // Configure the mock to return an error for generateStructured
    const { setMockGenerateStructuredResponse } = await import('@/services/ai/providers/openai/OpenAIAgentLanguageModelLive');
    setMockGenerateStructuredResponse(Effect.fail(mockError));

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
      await Effect.runPromise(Effect.provide(program, testLayer));
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