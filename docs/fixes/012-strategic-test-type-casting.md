# Fix 012: Strategic Test Type Casting for Effect Testing

## Problem
When testing complex Effect/Stream types with mocks, TypeScript's strict type checking creates "test type hell" where test execution becomes impossible due to deep generic type mismatches that have no runtime impact.

### Error Messages
```typescript
Argument of type 'Effect<AiResponse, unknown, unknown>' is not assignable to parameter 
of type 'Effect<AiResponse, unknown, never>'.
Type 'unknown' is not assignable to type 'never'.

'result' is of type 'unknown'.
Type 'Error' is not assignable to type 'never'.
```

## Root Cause
**Complex Effect Type Inference in Tests**: When mocking services with complex Effect/Stream return types:

1. **Mock Type Complexity**: Mocked functions return simplified types that don't perfectly match complex generics
2. **Deep Generic Inference**: TypeScript cannot infer through multiple layers of Effect/Stream/Provider composition 
3. **Test vs Runtime Context**: Tests need type safety but shouldn't be blocked by inference limitations
4. **Mock Return Type Alignment**: Effect failures using different error types than expected channels

## Solution
**Apply strategic type casting to bypass test-specific type inference issues while maintaining runtime safety:**

### Pattern 1: Effect.runPromise Casting
```typescript
// ❌ Type inference hell
const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestLayers))  // TS error: unknown ≠ never
);

// ✅ Strategic cast at execution boundary
const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestLayers)) as any
);
```

### Pattern 2: Result Type Restoration
```typescript
// After casting Effect.runPromise, restore specific types for assertions
const result = await Effect.runPromise(
  program.pipe(Effect.provide(TestLayers)) as any
);

// ✅ Re-cast results for meaningful assertions
expect((result as AiResponse).text).toBe("expected");
expect((result as AiResponse).metadata?.usage?.totalTokens).toBe(100);
```

### Pattern 3: Either Type Handling
```typescript
const result = await Effect.runPromise(
  program.pipe(
    Effect.either,
    Effect.provide(TestLayers)
  ) as any
);

// ✅ Cast Either types for proper Left/Right access
expect(Either.isLeft(result as any)).toBe(true);
if (Either.isLeft(result as any)) {
  const error = (result as any).left;
  expect((error as AiProviderError).message).toContain("expected");
}
```

### Pattern 4: Mock Failure Type Alignment
```typescript
// ❌ Wrong error type in mock
mockService.generateText.mockImplementation(() =>
  Effect.fail(new Error("API Error"))  // Generic Error ≠ AiProviderError channel
);

// ✅ Correct error type with cast for complex generics
mockService.generateText.mockImplementation(() =>
  Effect.fail(new AiProviderError({
    message: "API Error",
    provider: "TestProvider",
    isRetryable: false
  })) as any  // Cast to bypass complex Effect generic inference
);
```

## Complete Example

### Test with Strategic Casting
```typescript
describe("Complex Effect Service", () => {
  it("should handle complex Effect patterns", async () => {
    // Mock with domain-specific error types
    mockProvider.generateText.mockImplementationOnce(() =>
      Effect.fail(new AiProviderError({
        message: "Test error",
        provider: "TestProvider", 
        isRetryable: false
      })) as any  // Cast mock return type
    );

    const program = Effect.gen(function* (_) {
      const service = yield* _(ServiceTag);
      return yield* _(service.generateText({ prompt: "test" }));
    });

    // Cast at execution boundary
    const result = await Effect.runPromise(
      program.pipe(
        Effect.either,
        Effect.provide(TestLayer)
      ) as any
    );

    // Restore types for assertions
    expect(Either.isLeft(result as any)).toBe(true);
    if (Either.isLeft(result as any)) {
      const error = (result as any).left;
      expect(error).toBeInstanceOf(AiProviderError);
      expect((error as AiProviderError).message).toBe("Test error");
    }
  });
});
```

### Why This Pattern is Safe

1. **Runtime Behavior Unchanged**: Type casts don't affect JavaScript execution
2. **Test-Specific**: Only applied in test contexts, not production code
3. **Boundary Casting**: Applied at execution boundaries (Effect.runPromise), not throughout logic
4. **Type Restoration**: Specific types restored for meaningful assertions
5. **Domain Error Types**: Mock failures use correct domain-specific error types

## When to Apply This Fix

### Apply Strategic Casting When:
- Complex Effect/Stream/Provider type inference blocks test execution
- Mock implementations have correct behavior but type mismatches
- Test assertions need specific types but Effect.runPromise returns `unknown`
- R=never requirements can't be satisfied despite correct layer composition

### DO NOT Apply When:
- Production code has type issues (fix the actual types)
- Simple type mismatches can be resolved with proper imports
- Layer composition issues (use proper Layer imports instead)
- Mock implementations are fundamentally wrong

## Testing Best Practices

### 1. Cast at Boundaries, Not Throughout
```typescript
// ✅ Good - cast at execution boundary
const result = await Effect.runPromise(program as any);
expect((result as ExpectedType).property).toBe(value);

// ❌ Bad - casting throughout logic  
const service = (yield* _(ServiceTag)) as any;
const result = service.method() as any;
```

### 2. Use Domain-Specific Error Types
```typescript
// ✅ Good - proper error type with cast for generics
Effect.fail(new AiProviderError({...})) as any

// ❌ Bad - generic error type
Effect.fail(new Error("...")) as any
```

### 3. Restore Types for Assertions
```typescript
// ✅ Good - meaningful typed assertions
expect((result as AiResponse).text).toBe("expected");

// ❌ Bad - untyped assertions
expect(result.text).toBe("expected");  // result is unknown
```

## Related Issues
- [011 - Test Layer Composition Pattern](./011-test-layer-composition-pattern.md) - Proper layer usage reduces need for casting
- [009 - Test Type Import Conflicts](./009-test-type-import-conflicts.md) - Import aliasing prevents some type issues
- [006 - Error Constructor Migration](./006-error-constructor-migration.md) - Proper error types reduce mock type mismatches
- Critical for testing complex Effect-based architectures with deep generic types