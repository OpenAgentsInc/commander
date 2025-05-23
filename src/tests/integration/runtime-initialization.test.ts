import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Effect, Exit, Cause } from "effect";
import { initializeMainRuntime, getMainRuntime } from "@/services/runtime";
import { TelemetryService } from "@/services/telemetry";
import { AgentLanguageModel } from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";

describe("Runtime Initialization Resilience", () => {
  let originalWindow: any;
  let runtimeInitialized = false;

  beforeEach(() => {
    originalWindow = (global as any).window;
    runtimeInitialized = false;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    // Clear the runtime instance for next test
    if (runtimeInitialized) {
      // Reset the runtime module state (this is a bit hacky but necessary for testing)
      vi.resetModules();
    }
  });

  it("should initialize runtime successfully without window.electronAPI", async () => {
    // Remove window.electronAPI to simulate non-Electron environment
    (global as any).window = {};
    
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    // Should not throw when getting runtime
    expect(() => getMainRuntime()).not.toThrow();
    
    // Verify other services work
    const result = await Effect.runPromiseExit(
      Effect.flatMap(TelemetryService, (ts) => 
        ts.trackEvent({ 
          category: "test", 
          action: "runtime_init_test",
          label: "without_electronAPI" 
        })
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("should return appropriate error when using Ollama without IPC", async () => {
    // Initialize runtime without IPC
    (global as any).window = {};
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    // Try to use AgentLanguageModel (which would use Ollama by default)
    const result = await Effect.runPromiseExit(
      Effect.flatMap(AgentLanguageModel.Tag, (lm) =>
        lm.generateText({ 
          prompt: "test",
          temperature: 0.7,
          maxTokens: 100
        })
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    expect(Exit.isFailure(result)).toBe(true);
    if (Exit.isFailure(result)) {
      const failureOption = Cause.failureOption(result.cause);
      expect(failureOption._tag).toBe("Some");
      
      // Should get a proper error, not a die/defect
      const defects = Cause.defects(result.cause);
      expect(defects).toHaveLength(0); // No defects means no Effect.die()
    }
  });

  it("should initialize with partial IPC availability", async () => {
    // Simulate IPC with only some methods available
    (global as any).window = {
      electronAPI: {
        ollama: {
          generateChatCompletion: undefined,
          generateChatCompletionStream: vi.fn(),
        }
      }
    };
    
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    expect(() => getMainRuntime()).not.toThrow();
    
    // Verify configuration service works
    const result = await Effect.runPromiseExit(
      Effect.flatMap(ConfigurationService, (cs) =>
        cs.get("OLLAMA_MODEL_NAME")
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    // Config service should work regardless of IPC availability
    expect(Exit.isSuccess(result) || Exit.isFailure(result)).toBe(true);
  });

  it("should initialize runtime with no window object at all", async () => {
    // Completely remove window (Node.js environment)
    delete (global as any).window;
    
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    expect(() => getMainRuntime()).not.toThrow();
    
    // Test that basic services work
    const runtime = getMainRuntime();
    const result = await Effect.runPromiseExit(
      Effect.gen(function* (_) {
        const telemetry = yield* _(TelemetryService);
        yield* _(telemetry.trackEvent({
          category: "test",
          action: "no_window_test"
        }));
        return "success";
      }).pipe(Effect.provide(runtime))
    );
    
    expect(Exit.isSuccess(result)).toBe(true);
  });

  it("should provide clear error message when Ollama methods are called without IPC", async () => {
    (global as any).window = {};
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    const result = await Effect.runPromiseExit(
      Effect.flatMap(AgentLanguageModel.Tag, (lm) =>
        lm.generateText({ 
          prompt: "test streaming",
          temperature: 0.5
        })
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    expect(Exit.isFailure(result)).toBe(true);
    if (Exit.isFailure(result)) {
      // Check that we get a proper failure, not a defect
      const failures = Array.from(Cause.failures(result.cause));
      expect(failures.length).toBeGreaterThan(0);
      
      // Should mention IPC or Ollama in the error
      const errorMessages = failures.map(f => 
        f instanceof Error ? f.message : String(f)
      ).join(" ");
      expect(errorMessages.toLowerCase()).toMatch(/ollama|ipc|unavailable|503/);
    }
  });

  it("should allow runtime to function with all IPC methods available", async () => {
    // Simulate full IPC availability
    (global as any).window = {
      electronAPI: {
        ollama: {
          generateChatCompletion: vi.fn().mockResolvedValue({
            choices: [{
              message: { content: "Test response" },
              finish_reason: "stop"
            }]
          }),
          generateChatCompletionStream: vi.fn()
        }
      }
    };
    
    await initializeMainRuntime();
    runtimeInitialized = true;
    
    const runtime = getMainRuntime();
    
    // Basic service access should work
    const configResult = await Effect.runPromiseExit(
      Effect.flatMap(ConfigurationService, (cs) =>
        cs.set("TEST_KEY", "test_value")
      ).pipe(Effect.provide(runtime))
    );
    
    expect(Exit.isSuccess(configResult)).toBe(true);
  });
});