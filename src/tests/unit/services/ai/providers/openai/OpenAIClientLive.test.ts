// src/tests/unit/services/ai/providers/openai/OpenAIClientLive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Context, Option } from 'effect';
import * as HttpClient from '@effect/platform/HttpClient';
import { OpenAiClient } from '@effect/ai-openai';
import { OpenAIClientLive } from '@/services/ai/providers/openai';
import { ConfigurationService } from '@/services/configuration';
import { AIConfigurationError } from '@/services/ai/core/AIError';
import { TelemetryService } from '@/services/telemetry';

// Helper for type issues in tests
const runPromiseAny = (effect: any) => Effect.runPromise(effect);

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

    const result = await runPromiseAny(program.pipe(Effect.provide(testLayer)));

    // Verify mock calls
    expect(mockConfigService.getSecret).toHaveBeenCalledWith('OPENAI_API_KEY');
    expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_BASE_URL');
    
    // Verify the client was successfully created
    expect(result).toBeDefined();
    
    // Verify telemetry events
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_api_key_loaded"
    }));
    
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_base_url_loaded"
    }));
    
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_client_created"
    }));
  });

  it('should throw AIConfigurationError when API key is not found', async () => {
    // Mock failed API key response
    mockConfigService.getSecret.mockImplementation((key) => {
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    mockConfigService.get.mockImplementation((key) => {
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
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(AIConfigurationError);
      expect(error.message).toContain('OpenAI API Key not found');
      expect(error.context).toHaveProperty('keyName', 'OPENAI_API_KEY');
      
      // Verify telemetry error event
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: "ai:config:error",
        action: "openai_api_key_fetch_failed"
      }));
    }
  });

  it('should throw AIConfigurationError when API key is empty', async () => {
    // Mock empty API key response
    mockConfigService.getSecret.mockImplementation((key) => {
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
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeInstanceOf(AIConfigurationError);
      expect(error.message).toBe('OpenAI API Key cannot be empty.');
      
      // Verify telemetry events
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: "ai:config",
        action: "openai_api_key_loaded"
      }));
    }
  });

  it('should support optional base URL (none provided)', async () => {
    // Mock successful API key response but no base URL
    mockConfigService.getSecret.mockImplementation((key) => {
      if (key === 'OPENAI_API_KEY') return Effect.succeed('mock-api-key');
      return Effect.fail({ _tag: 'ConfigError', message: `Key not found: ${key}` });
    });

    mockConfigService.get.mockImplementation((key) => {
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

    const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

    // Verify mock calls
    expect(mockConfigService.getSecret).toHaveBeenCalledWith('OPENAI_API_KEY');
    expect(mockConfigService.get).toHaveBeenCalledWith('OPENAI_BASE_URL');
    
    // Verify the client was successfully created
    expect(result).toBeDefined();
    
    // Verify telemetry events
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_api_key_loaded"
    }));
    
    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: "ai:config",
      action: "openai_base_url_not_configured"
    }));
  });
});