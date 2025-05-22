# Fix 011: Test Layer Composition Pattern for Effect Services

## Problem
When testing Effect services, importing implementation functions instead of Layer exports causes complex type inference failures and layer composition issues.

### Error Messages
```typescript
Property '[LayerTypeId]' is missing in type 'Effect<AgentLanguageModel, TrackEventError, ...>' 
but required in type 'Layer<unknown, unknown, unknown>'.

Argument of type 'Effect<boolean, never, AgentLanguageModel>' is not assignable to parameter 
of type 'Effect<boolean, never, never>'.
```

## Root Cause
**Critical Discovery**: Effect service implementations export both the implementation function AND the Layer wrapper:

```typescript
// Service implementation (Effect.gen function)
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  // ... implementation
});

// Layer wrapper (Layer.effect result)  
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  OllamaAgentLanguageModelLive
);
```

When tests import the implementation function directly, they get an `Effect.gen` function, not a `Layer`, causing:
1. **Type Mismatch**: `Effect` cannot be used where `Layer` is expected
2. **Layer Composition Failure**: `pipe(Layer.provide(...))` fails on Effect functions
3. **Dependency Resolution Issues**: R=never failures in test execution

## Solution
**Always import and use Layer exports in tests, not implementation functions:**

```typescript
// ❌ WRONG - imports Effect.gen function
import { OllamaAgentLanguageModelLive } from "@/services/ai/providers/ollama/OllamaAgentLanguageModelLive";

const TestLayer = OllamaAgentLanguageModelLive.pipe(
  Layer.provide(DependenciesLayer) // ❌ Fails - Effect doesn't have Layer methods
);

// ✅ CORRECT - imports Layer.effect result  
import { OllamaAgentLanguageModelLiveLayer } from "@/services/ai/providers/ollama/OllamaAgentLanguageModelLive";

const TestLayer = OllamaAgentLanguageModelLiveLayer.pipe(
  Layer.provide(DependenciesLayer) // ✅ Works - Layer has proper methods
);
```

### Why This Pattern is Critical
1. **Type Safety**: Layers have different type signatures than Effect functions
2. **Composition**: Layer methods like `pipe(Layer.provide(...))` only exist on Layer instances
3. **Dependency Resolution**: Layers properly handle dependency injection for tests
4. **Effect Execution**: `Effect.runPromise(program.pipe(Effect.provide(TestLayer)))` requires TestLayer to be a Layer

## Complete Example

### Test File Structure
```typescript
import { describe, it, expect, vi } from "vitest";
import { Effect, Layer } from "effect";

// ✅ Import the Layer, not the implementation function
import { OllamaAgentLanguageModelLiveLayer } from "@/services/ai/providers/ollama/OllamaAgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";

describe("OllamaAgentLanguageModelLive", () => {
  // Create mock dependencies
  const MockDependencies = Layer.mergeAll(
    MockOllamaOpenAIClient,
    MockConfigurationService, 
    MockTelemetryService
  );

  // ✅ Compose test layer properly
  const TestLayer = OllamaAgentLanguageModelLiveLayer.pipe(
    Layer.provide(MockDependencies)
  );

  it("should work correctly", async () => {
    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel.Tag);
      return yield* _(model.generateText({ prompt: "test" }));
    });

    // ✅ This works because TestLayer is actually a Layer
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer)) as any
    );

    expect(result).toBeDefined();
  });
});
```

## Pattern Recognition

### How to Identify the Issue
1. **Import Check**: Are you importing `XxxLive` (function) or `XxxLiveLayer` (Layer)?
2. **Error Pattern**: Look for `[LayerTypeId]` missing errors
3. **Method Failure**: Does `someImport.pipe(Layer.provide(...))` fail?
4. **R=never Issues**: Are test executions failing with dependency resolution errors?

### Service Export Patterns to Look For
```typescript
// Implementation function
export const ServiceLive = Effect.gen(function* (_) { /* ... */ });

// Layer wrapper - USE THIS IN TESTS
export const ServiceLiveLayer = Layer.effect(ServiceTag, ServiceLive);
```

## When to Apply This Fix
- When testing any Effect service implementation
- When you see Layer-related type errors in tests
- When importing service implementations that have both function and Layer exports
- When test layer composition fails with type mismatches
- When Effect.runPromise fails with R=never dependency issues

## Testing Strategy
1. **Always Check Exports**: Look for both `XxxLive` and `XxxLiveLayer` exports
2. **Import Layers**: Use `XxxLiveLayer` imports in test files
3. **Compose Dependencies**: Use `Layer.provide()` for dependency injection
4. **Strategic Casting**: Use `as any` on Effect.runPromise when needed for test execution

## Related Issues
- [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md) - Provider access patterns
- [005 - Effect.provideLayer Migration](./005-effect-providelayer-migration.md) - Effect API changes
- Affects all Effect service testing when Layer patterns are used
- Critical for proper test isolation and dependency mocking