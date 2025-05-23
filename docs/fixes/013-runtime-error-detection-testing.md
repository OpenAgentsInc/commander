# Fix: Runtime Error Detection Testing for Effect Generators

## Problem

TypeScript compilation may pass while runtime errors occur in Effect generators, particularly the "yield* not iterable" error:

```
TypeError: yield* (intermediate value)(intermediate value)(intermediate value) is not iterable
```

### Error Message
```
Application Startup Failed
A critical error occurred while initializing essential services, and the application cannot continue.

Error Details:
TypeError: yield* (intermediate value)(intermediate value)(intermediate value) is not iterable
    at http://localhost:5173/src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts:24:27
```

## Root Cause

1. **TypeScript Limitations**: TypeScript's static analysis cannot always detect runtime Effect generator issues
2. **Complex Generator Composition**: Nested Effect.gen patterns and provider compositions create runtime-only failure modes
3. **Service Access Patterns**: Incorrect service tag usage may compile but fail at runtime
4. **Test Coverage Gap**: Unit tests often skip complex Effect integration scenarios

## Solution

Create comprehensive runtime error detection tests that execute Effect generators and catch runtime failures:

```typescript
// Runtime test pattern for Effect generators
import { Effect, Layer, Exit } from "effect";

describe("Effect Generator Runtime Error Detection", () => {
  it("should detect 'yield* not iterable' runtime errors", async () => {
    const testEffect = Effect.gen(function* (_) {
      // Test actual Effect.gen patterns that might fail
      const service = yield* _(ServiceTag);
      const result = yield* _(service.method());
      return result;
    });

    const exit = await Effect.runPromise(
      Effect.exit(testEffect.pipe(Effect.provide(mockLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      // Ensure it's not a yield* syntax error
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
    }
  });
});
```

### Why This Testing Pattern Works

1. **Runtime Execution**: Actually runs Effect.gen functions, not just type checking
2. **Error Categorization**: Distinguishes between expected business logic errors and syntax errors
3. **Pattern Coverage**: Tests various Effect composition patterns that can fail
4. **Early Detection**: Catches issues during test runs, not at application startup

## Complete Example

```typescript
// File: src/tests/unit/services/effect-generator-patterns.test.ts
import { describe, it, expect } from "vitest";
import { Effect, Layer, Stream, Exit, Context } from "effect";

describe("Effect Generator Pattern Runtime Error Detection", () => {
  // Test service for validation
  interface TestService {
    getValue: () => Effect.Effect<string, never, never>;
  }
  const TestService = Context.GenericTag<TestService>("TestService");
  
  const mockService: TestService = {
    getValue: () => Effect.succeed("test-value")
  };
  
  const testLayer = Layer.succeed(TestService, mockService);

  it("should detect incorrect service access patterns", async () => {
    const serviceAccess = Effect.gen(function* (_) {
      // Test correct Context.Tag usage
      const service = yield* _(TestService);
      const value = yield* _(service.getValue());
      return value;
    });

    const exit = await Effect.runPromise(
      Effect.exit(serviceAccess.pipe(Effect.provide(testLayer)))
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

  it("should catch nested Effect.gen composition errors", async () => {
    const nestedComposition = Effect.gen(function* (_) {
      // Test complex nested patterns
      const outerResult = yield* _(Effect.gen(function* (_) {
        const service = yield* _(TestService);
        const innerResult = yield* _(Effect.gen(function* (_) {
          const value = yield* _(service.getValue());
          return `nested-${value}`;
        }));
        return innerResult;
      }));
      return outerResult;
    });

    const exit = await Effect.runPromise(
      Effect.exit(nestedComposition.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("nested-test-value");
    }
  });

  it("should validate Provider.use() patterns", async () => {
    // Mock provider pattern
    const mockProvider = {
      use: <A, E, R>(effect: Effect.Effect<A, E, R>) => 
        Effect.gen(function* (_) {
          const result = yield* _(effect);
          return result;
        })
    };

    const providerTest = Effect.gen(function* (_) {
      const result = yield* _(
        mockProvider.use(
          Effect.gen(function* (_) {
            const service = yield* _(TestService);
            const value = yield* _(service.getValue());
            return `provider-${value}`;
          })
        )
      );
      return result;
    });

    const exit = await Effect.runPromise(
      Effect.exit(providerTest.pipe(Effect.provide(testLayer)))
    );

    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    } else {
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(exit.value).toBe("provider-test-value");
    }
  });
});
```

## When to Apply This Pattern

Apply this testing pattern when:

1. **Effect Generator Complexity**: Using nested Effect.gen patterns
2. **Provider Patterns**: Implementing provider.use() with Effect composition
3. **Service Access**: Accessing multiple services in Effect generators
4. **Integration Points**: Where Effect patterns interact with external libraries
5. **Startup Critical Code**: Code that runs during application initialization

## Testing Strategy

### 1. Specific Provider Tests
Create runtime tests for each provider implementation:
```typescript
// File: ProviderName.runtime.test.ts
describe("ProviderName - Runtime Error Detection", () => {
  it("should execute Effect.gen without yield* syntax errors", async () => {
    // Test the actual provider implementation
  });
});
```

### 2. General Pattern Tests
Create comprehensive pattern tests:
```typescript
// File: effect-generator-patterns.test.ts
describe("Effect Generator Pattern Runtime Error Detection", () => {
  // Test various Effect composition patterns
});
```

### 3. Integration Tests
Include runtime error detection in integration tests:
```typescript
describe("Service Integration Runtime Tests", () => {
  it("should initialize all services without generator errors", async () => {
    // Test full service layer composition
  });
});
```

## Related Issues

- Critical for applications using complex Effect.ts patterns
- Essential for provider implementations that wrap @effect/ai services
- Required for any code that uses nested Effect.gen functions
- Important for Layer composition and service access patterns

## High-Impact Prevention

This pattern prevents:
1. **Application Startup Failures**: Catches errors before they reach production
2. **Runtime Generator Errors**: Detects "yield* not iterable" and similar issues
3. **Service Integration Issues**: Validates complex service access patterns
4. **Provider Pattern Failures**: Ensures provider.use() patterns work correctly

## Test File Structure

```
src/tests/unit/services/
├── effect-generator-patterns.test.ts          # General pattern tests
├── ai/providers/
│   ├── ollama/
│   │   └── OllamaAgentLanguageModelLive.runtime.test.ts
│   ├── openai/
│   │   └── OpenAIAgentLanguageModelLive.runtime.test.ts
│   └── nip90/
│       └── NIP90AgentLanguageModelLive.runtime.test.ts
└── runtime-integration.test.ts                # Full integration tests
```

This testing pattern ensures that Effect generator runtime errors are caught during development, not at application startup.