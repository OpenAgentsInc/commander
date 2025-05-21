// src/tests/unit/services/ai/providers/openai/OpenAIClientLive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Context } from 'effect';
import * as HttpClient from '@effect/platform/HttpClient';
import { OpenAiClient } from '@effect/ai-openai';
import { OpenAIClientLive } from '@/services/ai/providers/openai';
import { ConfigurationService } from '@/services/configuration';
import { AIConfigurationError } from '@/services/ai/core/AIError';
import { TelemetryService } from '@/services/telemetry';

// Helper for type issues in tests
const runEffect = async (effect: Effect.Effect<any, any, any>) => {
  return Effect.runPromise(effect);
};

// Create a mock HttpClient
const MockHttpClient: any = {
  request: vi.fn(),
  fetch: vi.fn(() => Effect.succeed({ 
    json: () => Effect.succeed({ ok: true }) 
  })),
  execute: vi.fn(() => Effect.succeed({})),
  get: vi.fn(() => Effect.succeed({})),
  post: vi.fn(() => Effect.succeed({})),
  put: vi.fn(() => Effect.succeed({})),
  patch: vi.fn(() => Effect.succeed({})),
  delete: vi.fn(() => Effect.succeed({})),
  head: vi.fn(() => Effect.succeed({})),
  options: vi.fn(() => Effect.succeed({}))
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

describe('OpenAIClientLive', () => {
  let httpLayer: Layer.Layer<any>;
  let configLayer: Layer.Layer<ConfigurationService>;
  let telemetryLayer: Layer.Layer<TelemetryService>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    httpLayer = Layer.succeed(HttpClient.HttpClient, MockHttpClient);
    configLayer = Layer.succeed(ConfigurationService, MockConfigurationService);
    telemetryLayer = Layer.succeed(TelemetryService, MockTelemetryService);
  });

  it('should successfully create an OpenAI client with valid configuration', async () => {
    // Mock successful config responses
    (MockConfigurationService.getSecret as any).mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return Effect.succeed('mock-api-key');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    (MockConfigurationService.get as any).mockImplementation((key: string) => {
      if (key === 'OPENAI_BASE_URL') return Effect.succeed('https://api.openai.com/v1');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    // Try to build the OpenAI client
    const program = Effect.flatMap(
      OpenAiClient.OpenAiClient,
      client => Effect.succeed(client)
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer, telemetryLayer)
    );

    const result = await runEffect(Effect.provide(program, testLayer));

    // Verify mock calls
    expect(MockConfigurationService.getSecret).toHaveBeenCalledWith('OPENAI_API_KEY');
    expect(MockConfigurationService.get).toHaveBeenCalledWith('OPENAI_BASE_URL');
    
    // Verify the client was successfully created
    expect(result).toBeDefined();
    
    // Verify telemetry events
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_api_key_loaded"
    }));
    
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_base_url_loaded"
    }));
    
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_client_created"
    }));
  });

  it('should throw AIConfigurationError when API key is not found', async () => {
    // Mock failed API key response
    (MockConfigurationService.getSecret as any).mockImplementation((key) => {
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    (MockConfigurationService.get as any).mockImplementation((key) => {
      if (key === 'OPENAI_BASE_URL') return Effect.succeed('https://api.openai.com/v1');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    // Try to build the OpenAI client - should fail
    const program = Effect.flatMap(
      OpenAiClient.OpenAiClient,
      client => Effect.succeed(client)
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer, telemetryLayer)
    );

    try {
      await runEffect(Effect.provide(program, testLayer));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // First unwrap the FiberFailure if needed
      const actualError = error._id === 'FiberFailure' ? error.cause.defect : error;
      
      expect(actualError).toBeInstanceOf(AIConfigurationError);
      expect(actualError.message).toContain('OpenAI API Key not found');
      expect(actualError.context).toHaveProperty('keyName', 'OPENAI_API_KEY');
      
      // Verify telemetry error event
      expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: "ai:config:error",
        action: "openai_api_key_fetch_failed"
      }));
    }
  });

  it('should throw AIConfigurationError when API key is empty', async () => {
    // Mock empty API key response
    (MockConfigurationService.getSecret as any).mockImplementation((key) => {
      if (key === 'OPENAI_API_KEY') return Effect.succeed('   ');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    // Try to build the OpenAI client - should fail
    const program = Effect.flatMap(
      OpenAiClient.OpenAiClient,
      client => Effect.succeed(client)
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer, telemetryLayer)
    );

    try {
      await runEffect(Effect.provide(program, testLayer));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // First unwrap the FiberFailure if needed
      const actualError = error._id === 'FiberFailure' ? error.cause.defect : error;
      
      expect(actualError).toBeInstanceOf(AIConfigurationError);
      expect(actualError.message).toBe('OpenAI API Key cannot be empty.');
      
      // Verify telemetry events
      expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: "ai:config",
        action: "openai_api_key_loaded"
      }));
    }
  });

  it('should support optional base URL (none provided)', async () => {
    // Mock successful API key response but no base URL
    (MockConfigurationService.getSecret as any).mockImplementation((key) => {
      if (key === 'OPENAI_API_KEY') return Effect.succeed('mock-api-key');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    (MockConfigurationService.get as any).mockImplementation((key) => {
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    // Try to build the OpenAI client
    const program = Effect.flatMap(
      OpenAiClient.OpenAiClient,
      client => Effect.succeed(client)
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer, telemetryLayer)
    );

    const result = await runEffect(Effect.provide(program, testLayer));

    // Verify mock calls
    expect(MockConfigurationService.getSecret).toHaveBeenCalledWith('OPENAI_API_KEY');
    expect(MockConfigurationService.get).toHaveBeenCalledWith('OPENAI_BASE_URL');
    
    // Verify the client was successfully created
    expect(result).toBeDefined();
    
    // Verify telemetry events
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_api_key_loaded"
    }));
    
    expect(MockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_base_url_not_configured"
    }));
  });
});