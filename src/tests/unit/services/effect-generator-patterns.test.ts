import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Stream, Exit, Context } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";

/**
 * Comprehensive tests for Effect generator patterns to catch runtime errors
 * that TypeScript compilation might miss.
 * 
 * This test suite specifically targets the class of errors like:
 * "TypeError: yield* (intermediate value)(intermediate value)(intermediate value) is not iterable"
 * 
 * These errors typically occur when:
 * 1. Using service classes directly instead of Context.Tag
 * 2. Incorrect yield* syntax with non-Effect values
 * 3. Provider.use() pattern mistakes
 * 4. Generator function composition errors
 */

describe("Effect Generator Pattern Runtime Error Detection", () => {
  // Test service for validating Context.Tag patterns
  interface TestService {
    getValue: () => Effect.Effect<string, never, never>;
  }

  const TestService = Context.GenericTag<TestService>("TestService");

  const mockTestService: TestService = {
    getValue: () => Effect.succeed("test-value")
  };

  const mockTelemetryService = {
    trackEvent: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
    isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
    setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
  };

  const mockConfigService = {
    get: vi.fn().mockImplementation((key: string) => Effect.succeed(`config-${key}`)),
    set: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
    getSecret: vi.fn().mockImplementation(() => Effect.succeed("secret")),
    delete: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
  };

  const testLayer = Layer.mergeAll(
    Layer.succeed(TestService, mockTestService),
    Layer.succeed(TelemetryService, mockTelemetryService),
    Layer.succeed(ConfigurationService, mockConfigService)
  );

  it("should detect incorrect service access patterns", async () => {
    // This tests the common mistake of using service classes directly instead of Context.Tag

    const correctServiceAccess = Effect.gen(function* (_) {
      // ✅ Correct: Using Context.GenericTag directly
      const testService = yield* _(TestService);
      const telemetry = yield* _(TelemetryService);
      const config = yield* _(ConfigurationService);
      
      return { testService, telemetry, config };
    });

    const exit = await Effect.runPromise(
      Effect.exit(correctServiceAccess.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      const services = exit.value;
      expect(services.testService).toBeDefined();
      expect(services.telemetry).toBeDefined();
      expect(services.config).toBeDefined();
    }
  });

  it("should catch nested Effect.gen composition errors", async () => {
    // Test complex nested Effect.gen patterns that might cause yield* errors

    const nestedEffectComposition = Effect.gen(function* (_) {
      const config = yield* _(ConfigurationService);

      // Nested Effect.gen - this pattern can cause yield* errors if misused
      const innerResult = yield* _(Effect.gen(function* (_) {
        const value = yield* _(config.get("test-key"));
        
        // Another level of nesting
        const deeperResult = yield* _(Effect.gen(function* (_) {
          const telemetry = yield* _(TelemetryService);
          yield* _(telemetry.trackEvent({
            category: "test",
            action: "nested-effect",
            value: value
          }));
          return `processed-${value}`;
        }));

        return deeperResult;
      }));

      return innerResult;
    });

    const exit = await Effect.runPromise(
      Effect.exit(nestedEffectComposition.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("processed-config-test-key");
    }
  });

  it("should validate Effect composition with error handling", async () => {
    // Test Effect patterns with error handling that might cause generator issues

    const effectWithErrorHandling = Effect.gen(function* (_) {
      const config = yield* _(ConfigurationService);

      // Test error handling patterns
      const resultWithFallback = yield* _(
        config.get("non-existent-key").pipe(
          Effect.orElseSucceed(() => "fallback-value")
        )
      );

      // Test Effect.all pattern
      const parallelResults = yield* _(Effect.all([
        config.get("key1"),
        config.get("key2"),
        config.get("key3")
      ]));

      return { resultWithFallback, parallelResults };
    });

    const exit = await Effect.runPromise(
      Effect.exit(effectWithErrorHandling.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = exit.value;
      expect(result.resultWithFallback).toBe("config-non-existent-key");
      expect(result.parallelResults).toEqual([
        "config-key1",
        "config-key2", 
        "config-key3"
      ]);
    }
  });

  it("should detect Stream integration issues", async () => {
    // Test Effect.gen patterns that integrate with Streams

    const streamIntegration = Effect.gen(function* (_) {
      const testService = yield* _(TestService);

      // Create a stream that yields effects
      const stream = Stream.fromIterable([1, 2, 3]).pipe(
        Stream.mapEffect((n) => Effect.gen(function* (_) {
          const value = yield* _(testService.getValue());
          return `${value}-${n}`;
        }))
      );

      // Consume the stream and convert to array
      const results = yield* _(Stream.runCollect(stream));
      return Array.from(results);
    });

    const exit = await Effect.runPromise(
      Effect.exit(streamIntegration.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toEqual(["test-value-1", "test-value-2", "test-value-3"]);
    }
  });

  it("should validate Layer composition patterns", async () => {
    // Test Layer patterns that might cause Effect generator issues

    const layerBasedEffect = Effect.gen(function* (_) {
      // Access services provided by layers
      const testService = yield* _(TestService);
      const telemetry = yield* _(TelemetryService);
      
      const value = yield* _(testService.getValue());
      yield* _(telemetry.trackEvent({
        category: "layer-test",
        action: "value-retrieved",
        value: value
      }));

      return value;
    });

    // Test layer composition
    const composedLayer = Layer.mergeAll(
      Layer.succeed(TestService, mockTestService),
      Layer.succeed(TelemetryService, mockTelemetryService)
    );

    const exit = await Effect.runPromise(
      Effect.exit(layerBasedEffect.pipe(Effect.provide(composedLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("test-value");
    }
  });

  it("should catch Provider.use() pattern errors", async () => {
    // Simulate the Provider.use() pattern that was causing issues in OllamaAgentLanguageModelLive

    // Mock a provider-like object
    const mockProvider = {
      use: <A, E, R>(effect: Effect.Effect<A, E, R>) => 
        Effect.gen(function* (_) {
          // This simulates how a provider wraps and executes effects
          const result = yield* _(effect);
          return result;
        })
    };

    const providerPatternTest = Effect.gen(function* (_) {
      // This simulates the provider.use(Effect.gen(...)) pattern
      const result = yield* _(
        mockProvider.use(
          Effect.gen(function* (_) {
            const testService = yield* _(TestService);
            const value = yield* _(testService.getValue());
            return `provider-wrapped-${value}`;
          })
        )
      );

      return result;
    });

    const exit = await Effect.runPromise(
      Effect.exit(providerPatternTest.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("provider-wrapped-test-value");
    }
  });
});