# Testing Guidelines for Phase 2 (OpenAI-Compatible Provider Implementation)

This document outlines the testing approach for Phase 2 of the AI roadmap, focusing on the OpenAI-compatible provider implementation. These tests should be implemented alongside or after the implementation of Phase 2.

## 1. Directory and File Structure

The tests for Phase 2 should be located in:

- `src/tests/unit/services/ai/providers/openai/`

Create the following test files:

1. `OpenAIClientLive.test.ts`
2. `OpenAIAgentLanguageModelLive.test.ts`

## 2. OpenAIClientLive Tests

The `OpenAIClientLive.test.ts` file should test the creation and configuration of the OpenAI client.

```typescript
// src/tests/unit/services/ai/providers/openai/OpenAIClientLive.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Context, Option } from "effect";
import { HttpClient } from "@effect/platform";
import { OpenAiClient } from "@effect/ai-openai";
import { OpenAIClientLive } from "@/services/ai/providers/openai";
import { ConfigurationService } from "@/services/configuration";
import { AIConfigurationError } from "@/services/ai/core/AIError";

// Create a mock HttpClient
class MockHttpClient implements HttpClient.HttpClient {
  // Implement necessary methods for the test
  request: vi.Mock = vi.fn();
  fetch: vi.Mock = vi.fn(() =>
    Effect.succeed({
      json: () => Effect.succeed({ ok: true }),
    }),
  );
}

// Create a mock ConfigurationService
class MockConfigurationService implements ConfigurationService {
  getSecret: vi.Mock = vi.fn();
  get: vi.Mock = vi.fn();
  set: vi.Mock = vi.fn(() => Effect.succeed(void 0));
  delete: vi.Mock = vi.fn(() => Effect.succeed(void 0));
}

describe("OpenAIClientLive", () => {
  let mockHttpClient: MockHttpClient;
  let mockConfigService: MockConfigurationService;
  let httpLayer: Layer.Layer<HttpClient.HttpClient>;
  let configLayer: Layer.Layer<ConfigurationService>;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    mockConfigService = new MockConfigurationService();
    httpLayer = Layer.succeed(HttpClient.Tag, mockHttpClient);
    configLayer = Layer.succeed(ConfigurationService, mockConfigService);
  });

  it("should successfully create an OpenAI client with valid configuration", async () => {
    // Mock successful config responses
    mockConfigService.getSecret.mockImplementation((key) => {
      if (key === "OPENAI_API_KEY") return Effect.succeed("mock-api-key");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    mockConfigService.get.mockImplementation((key) => {
      if (key === "OPENAI_BASE_URL")
        return Effect.succeed("https://api.openai.com/v1");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    // Try to build the OpenAI client
    const program = Effect.flatMap(OpenAiClient.OpenAiClient, (client) =>
      Effect.succeed(client),
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer),
    );

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer)),
    );

    // Verify mock calls
    expect(mockConfigService.getSecret).toHaveBeenCalledWith("OPENAI_API_KEY");
    expect(mockConfigService.get).toHaveBeenCalledWith("OPENAI_BASE_URL");

    // Verify the client was successfully created
    expect(result).toBeDefined();
  });

  it("should throw AIConfigurationError when API key is not found", async () => {
    // Mock failed API key response
    mockConfigService.getSecret.mockImplementation((key) => {
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    mockConfigService.get.mockImplementation((key) => {
      if (key === "OPENAI_BASE_URL")
        return Effect.succeed("https://api.openai.com/v1");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    // Try to build the OpenAI client - should fail
    const program = Effect.flatMap(OpenAiClient.OpenAiClient, (client) =>
      Effect.succeed(client),
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer),
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AIConfigurationError);
      expect(error.message).toContain("OpenAI API Key not found");
      expect(error.context).toHaveProperty("keyName", "OPENAI_API_KEY");
    }
  });

  it("should throw AIConfigurationError when API key is empty", async () => {
    // Mock empty API key response
    mockConfigService.getSecret.mockImplementation((key) => {
      if (key === "OPENAI_API_KEY") return Effect.succeed("   ");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    // Try to build the OpenAI client - should fail
    const program = Effect.flatMap(OpenAiClient.OpenAiClient, (client) =>
      Effect.succeed(client),
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer),
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AIConfigurationError);
      expect(error.message).toBe("OpenAI API Key cannot be empty.");
    }
  });

  it("should support optional base URL (none provided)", async () => {
    // Mock successful API key response but no base URL
    mockConfigService.getSecret.mockImplementation((key) => {
      if (key === "OPENAI_API_KEY") return Effect.succeed("mock-api-key");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    mockConfigService.get.mockImplementation((key) => {
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    // Try to build the OpenAI client
    const program = Effect.flatMap(OpenAiClient.OpenAiClient, (client) =>
      Effect.succeed(client),
    );

    const testLayer = Layer.provide(
      OpenAIClientLive,
      Layer.mergeAll(httpLayer, configLayer),
    );

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer)),
    );

    // Verify mock calls
    expect(mockConfigService.getSecret).toHaveBeenCalledWith("OPENAI_API_KEY");
    expect(mockConfigService.get).toHaveBeenCalledWith("OPENAI_BASE_URL");

    // Verify the client was successfully created
    expect(result).toBeDefined();
  });
});
```

## 3. OpenAIAgentLanguageModelLive Tests

The `OpenAIAgentLanguageModelLive.test.ts` file should test the adapter layer that connects the OpenAI client to our AgentLanguageModel interface.

```typescript
// src/tests/unit/services/ai/providers/openai/OpenAIAgentLanguageModelLive.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AgentLanguageModel } from "@/services/ai/core";
import { OpenAIAgentLanguageModelLive } from "@/services/ai/providers/openai";
import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";

// Create a mock OpenAI client
class MockOpenAIClient implements OpenAiClient.OpenAiClient {
  request: vi.Mock = vi.fn();
  // Add other required properties/methods
}

// Create a mock ConfigurationService
class MockConfigurationService implements ConfigurationService {
  getSecret: vi.Mock = vi.fn();
  get: vi.Mock = vi.fn();
  set: vi.Mock = vi.fn(() => Effect.succeed(void 0));
  delete: vi.Mock = vi.fn(() => Effect.succeed(void 0));
}

// Create a mock LLM provider result for testing
const mockModelProvider = {
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateStructured: vi.fn(),
};

describe("OpenAIAgentLanguageModelLive", () => {
  let mockOpenAIClient: MockOpenAIClient;
  let mockConfigService: MockConfigurationService;
  let openAIClientLayer: Layer.Layer<OpenAiClient.OpenAiClient>;
  let configLayer: Layer.Layer<ConfigurationService>;

  beforeEach(() => {
    mockOpenAIClient = new MockOpenAIClient();
    mockConfigService = new MockConfigurationService();
    openAIClientLayer = Layer.succeed(
      OpenAiClient.OpenAiClient,
      mockOpenAIClient,
    );
    configLayer = Layer.succeed(ConfigurationService, mockConfigService);

    // Reset the mocks
    vi.restoreAllMocks();

    // Mock the OpenAiLanguageModel.model function
    vi.mock("@effect/ai-openai", async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        OpenAiLanguageModel: {
          ...original.OpenAiLanguageModel,
          model: vi.fn(() => Effect.succeed(mockModelProvider)),
        },
      };
    });

    // Set default behavior for mock config service
    mockConfigService.get.mockImplementation((key) => {
      if (key === "OPENAI_MODEL_NAME") return Effect.succeed("gpt-4o");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });
  });

  it("should successfully create an AgentLanguageModel implementation", async () => {
    // Test accessing the service
    const program = Effect.flatMap(AgentLanguageModel, (model) =>
      Effect.succeed(model),
    );

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer),
    );

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer)),
    );

    // Verify the model was successfully created
    expect(result).toBeDefined();
    expect(result._tag).toBe("AgentLanguageModel");
    expect(typeof result.generateText).toBe("function");
    expect(typeof result.streamText).toBe("function");
    expect(typeof result.generateStructured).toBe("function");
  });

  it("should use the configured model name or default to gpt-4o", async () => {
    // Test with explicitly configured model
    mockConfigService.get.mockImplementation((key) => {
      if (key === "OPENAI_MODEL_NAME") return Effect.succeed("gpt-4-turbo");
      return Effect.fail({
        _tag: "ConfigError",
        message: `Key not found: ${key}`,
      });
    });

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer),
    );

    await Effect.runPromise(
      Effect.flatMap(AgentLanguageModel, (model) => Effect.succeed(model)).pipe(
        Effect.provide(testLayer),
      ),
    );

    // Verify the OpenAI model was created with the correct model name
    expect(OpenAiLanguageModel.model).toHaveBeenCalledWith("gpt-4-turbo");
  });

  it("should properly map errors in generateText", async () => {
    // Setup mock to throw an error
    const mockError = new Error("Provider test error");
    mockModelProvider.generateText.mockReturnValue(Effect.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer),
    );

    // Test the generateText method through the service
    const program = Effect.flatMap(AgentLanguageModel, (model) =>
      model.generateText({ prompt: "Test prompt" }),
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain("OpenAI generateText error");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(mockError);
      expect(error.context).toHaveProperty("model", "gpt-4o");
      expect(error.context).toHaveProperty("params.prompt", "Test prompt");
    }
  });

  it("should properly map errors in streamText", async () => {
    // Setup mock to throw an error in the stream
    const mockError = new Error("Stream test error");
    mockModelProvider.streamText.mockReturnValue(Stream.fail(mockError));

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer),
    );

    // Test the streamText method through the service
    const program = Effect.flatMap(AgentLanguageModel, (model) =>
      model.streamText({ prompt: "Test prompt" }),
    );

    const stream = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer)),
    );

    try {
      // Try to collect chunks from the stream - should fail
      await Effect.runPromise(Stream.runCollect(stream));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain("OpenAI streamText error");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(mockError);
    }
  });

  it("should properly map errors in generateStructured", async () => {
    // Setup mock to throw an error
    const mockError = new Error("Structured test error");
    mockModelProvider.generateStructured.mockReturnValue(
      Effect.fail(mockError),
    );

    const testLayer = Layer.provide(
      OpenAIAgentLanguageModelLive,
      Layer.mergeAll(openAIClientLayer, configLayer),
    );

    // Test the generateStructured method through the service
    const program = Effect.flatMap(AgentLanguageModel, (model) =>
      model.generateStructured({
        prompt: "Test prompt",
        schema: { type: "object", properties: { name: { type: "string" } } },
      }),
    );

    try {
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toContain("OpenAI generateStructured error");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(mockError);
      expect(error.context).toHaveProperty("model", "gpt-4o");
      expect(error.context).toHaveProperty("params.prompt", "Test prompt");
      expect(error.context).toHaveProperty("params.schema");
    }
  });
});
```

## 4. Runtime Integration Tests

The runtime test should be updated to verify that the OpenAI provider services are correctly integrated into the FullAppLayer.

```typescript
// src/tests/unit/services/runtime.test.ts (existing file, add this test case)

// Add these imports to existing imports
import { AgentLanguageModel } from "@/services/ai/core";

// Add this test to the existing 'Effect Runtime Initialization' describe block
it("should successfully resolve AgentLanguageModel from FullAppLayer", async () => {
  // This program attempts to extract the AgentLanguageModel from the full runtime
  const program = Effect.flatMap(AgentLanguageModel, (service) =>
    Effect.succeed(service),
  );

  // Using the FullAppLayer, which should now include OpenAIAgentLanguageModelLive
  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(Layer.toRuntime(FullAppLayer).pipe(Effect.scoped)),
    ),
  );

  // Verify the service was resolved successfully
  expect(result).toBeDefined();
  expect(result._tag).toBe("AgentLanguageModel");
});
```

## 5. Integration Testing Tips

For integration tests that need to verify actual API calls to OpenAI:

1. **Environment Variables**: Create a separate test config for OpenAI credentials or use mock API responses.
2. **Test Config Layer**: When testing with real OpenAI API calls (in a separate test suite), use a special test config layer.
3. **Record/Replay Pattern**: Consider implementing test fixtures that can record real OpenAI responses and replay them for deterministic tests.

```typescript
// Example of a test config layer (conceptual)
const TestConfigServiceLayer = Layer.succeed(ConfigurationService, {
  getSecret: (key) => {
    if (key === "OPENAI_API_KEY")
      return Effect.succeed(process.env.TEST_OPENAI_API_KEY || "mock-key");
    return Effect.fail({
      _tag: "ConfigError",
      message: `Key not found: ${key}`,
    });
  },
  get: (key) => {
    const testConfig = {
      OPENAI_MODEL_NAME: "gpt-3.5-turbo", // Use cheaper model for tests
      OPENAI_BASE_URL: "https://api.openai.com/v1",
    };
    if (key in testConfig) return Effect.succeed(testConfig[key]);
    return Effect.fail({
      _tag: "ConfigError",
      message: `Key not found: ${key}`,
    });
  },
  set: () => Effect.succeed(void 0),
  delete: () => Effect.succeed(void 0),
});
```

## 6. Mock Testing Tips

When mocking the Effect AI packages:

1. **Prefer Dependency Injection**: Instead of mocking the OpenAI client directly, inject mock implementations through Effect layers.
2. **Wrap External Implementations**: Create thin wrappers around direct API calls that can be mocked more easily.
3. **Test Boundaries**: Focus tests on the boundaries between your code and the Effect AI packages.

## 7. Error Testing

For thorough error testing:

1. Test all error paths identified in the implementation:

   - Missing API key
   - Empty API key
   - Invalid model name
   - API request failures
   - Streaming failures
   - Structured generation failures

2. Verify error mapping:
   - Ensure provider-specific errors are properly wrapped in AIProviderError
   - Verify that AIConfigurationError is used for configuration issues
   - Check that error context contains useful debugging information

## 8. Configuration Testing

For configuration service testing:

1. Test default values behavior:
   - Missing base URL should use default endpoint
   - Missing model name should use "gpt-4o"
2. Test configuration error handling:
   - Distinguish between "not found" errors and other configuration errors
   - Verify appropriate error handling for each configuration key
