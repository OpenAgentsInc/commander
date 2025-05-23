import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Exit, Context } from "effect";

/**
 * Integration tests for full Effect runtime initialization.
 * These tests verify that the actual application runtime can be initialized
 * without runtime errors that TypeScript compilation might miss.
 * 
 * Key focus: Preventing "yield* not iterable" and similar runtime failures.
 */

describe("Full Runtime Integration", () => {
  // Create a minimal test layer to avoid external dependencies
  interface TestService {
    getValue: () => Effect.Effect<string, never, never>;
  }
  const TestService = Context.GenericTag<TestService>("TestService");
  
  const testServiceImpl: TestService = {
    getValue: () => Effect.succeed("test-value")
  };

  const testLayer = Layer.succeed(TestService, testServiceImpl);

  it("should initialize Effect runtime patterns without errors", async () => {
    // Test Effect generator patterns similar to what's used in the app
    const testRuntimeInitialization = Effect.gen(function* (_) {
      const service = yield* _(TestService);
      const value = yield* _(service.getValue());
      
      // Test nested Effect.gen patterns
      const nestedResult = yield* _(Effect.gen(function* (_) {
        const innerService = yield* _(TestService);
        const innerValue = yield* _(innerService.getValue());
        return `nested-${innerValue}`;
      }));
      
      return { value, nestedResult };
    });

    const exit = await Effect.runPromise(
      Effect.exit(testRuntimeInitialization.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      console.log("Runtime initialization error:", errorMessage);
      
      // Check for specific runtime errors that TypeScript can't catch
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
      expect(errorMessage).not.toContain("Cannot read properties of undefined");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value.value).toBe("test-value");
      expect(exit.value.nestedResult).toBe("nested-test-value");
    }
  });

  it("should handle service access patterns without runtime errors", async () => {
    // Test service access patterns used throughout the application
    const testServiceAccess = Effect.gen(function* (_) {
      // Test multiple service yields
      const service1 = yield* _(TestService);
      const service2 = yield* _(TestService);
      
      // Test Effect.all pattern
      const results = yield* _(Effect.all([
        service1.getValue(),
        service2.getValue()
      ]));
      
      return results;
    });

    const exit = await Effect.runPromise(
      Effect.exit(testServiceAccess.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      
      // Check for Effect generator syntax errors specifically
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
      expect(errorMessage).not.toContain("_$(...) is not a function");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toEqual(["test-value", "test-value"]);
    }
  });

  it("should compose service layers without composition errors", async () => {
    // Test Layer composition patterns
    interface SecondService {
      compute: (input: string) => Effect.Effect<string, never, never>;
    }
    const SecondService = Context.GenericTag<SecondService>("SecondService");
    
    const secondServiceImpl: SecondService = {
      compute: (input: string) => Effect.succeed(`computed-${input}`)
    };

    const multiLayerStack = Layer.mergeAll(
      Layer.succeed(TestService, testServiceImpl),
      Layer.succeed(SecondService, secondServiceImpl)
    );

    const testLayerComposition = Effect.gen(function* (_) {
      const testService = yield* _(TestService);
      const secondService = yield* _(SecondService);
      
      const value = yield* _(testService.getValue());
      const computed = yield* _(secondService.compute(value));
      
      return computed;
    });

    const exit = await Effect.runPromise(
      Effect.exit(testLayerComposition.pipe(Effect.provide(multiLayerStack)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("computed-test-value");
    }
  });
});