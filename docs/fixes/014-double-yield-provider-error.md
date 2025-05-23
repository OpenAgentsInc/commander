# Fix: Double Yield Provider Error in Effect Generators

## Problem

Runtime error occurs when trying to yield a provider instance as an Effect in generator functions:

```
TypeError: yield* (intermediate value)(intermediate value)(intermediate value) is not iterable
```

### Error Context
This error typically appears during application startup when initializing AI providers that use the @effect/ai library.

## Root Cause

The issue occurs when code attempts to yield a provider instance twice in an Effect generator:

1. **First yield**: Gets the provider from an Effect that returns it
2. **Second yield**: Incorrectly treats the provider as an Effect and tries to yield it again

```typescript
// BROKEN PATTERN
const aiModel = yield* _(configuredAiModelEffect);  // This returns a provider
const provider = yield* _(                          // This tries to yield a provider as Effect
  (aiModel as unknown) as Effect.Effect<...>
);
```

The provider returned from step 1 is **not an Effect** - it's already the final provider instance. Attempting to yield it again causes the "not iterable" error.

## Solution

Eliminate the double yield by getting the provider directly from the original Effect:

```typescript
// CORRECT PATTERN
const provider = yield* _(configuredAiModelEffect);  // Get provider directly
```

### Complete Fix Example

**Before (Broken)**:
```typescript
export const ProviderAgentLanguageModelLive = Effect.gen(function* (_) {
  // ... service setup ...
  
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    client
  );

  // PROBLEM: Double yield
  const aiModel = yield* _(configuredAiModelEffect);    // First yield - gets provider
  const provider = yield* _(                            // Second yield - ERROR!
    (aiModel as unknown) as Effect.Effect<
      Provider<AiLanguageModel | Tokenizer>,
      never,
      never
    >
  );

  // ... rest of implementation
});
```

**After (Fixed)**:
```typescript
export const ProviderAgentLanguageModelLive = Effect.gen(function* (_) {
  // ... service setup ...
  
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    client
  );

  // SOLUTION: Single yield to get provider directly
  const provider = yield* _(configuredAiModelEffect);

  // ... rest of implementation
});
```

## Why This Fix Works

1. **Eliminates Double Yielding**: Only yields the Effect once to get the provider
2. **Correct Type Flow**: The provider is the direct result of the configured Effect
3. **Removes Unnecessary Casting**: No need for complex type assertions
4. **Clearer Intent**: Code directly expresses what it's doing

## When to Apply This Fix

Apply this fix when you see:

1. **Runtime Error**: "yield* (intermediate value) is not iterable"
2. **Pattern Recognition**: Two consecutive yields where second uses type casting
3. **Provider Libraries**: Code using @effect/ai or similar provider-pattern libraries
4. **Effect Generators**: Complex Effect.gen functions with provider setup

## Common Locations

This pattern commonly appears in:

- **AI Provider Implementations**: Ollama, OpenAI, Anthropic providers
- **Service Layer Setup**: Any code that configures and provides services
- **Effect Composition**: Complex Effect.gen functions with multiple steps
- **Library Integration**: Code that wraps external libraries in Effect providers

## Related Patterns

### Similar Issues
- [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md): Related type casting issues
- [002 - Provider Service Access Pattern](./002-provider-service-access-pattern.md): How to use providers correctly
- [013 - Runtime Error Detection Testing](./013-runtime-error-detection-testing.md): Testing to catch these errors

### Prevention
```typescript
// GOOD: Direct provider extraction
const provider = yield* _(providerEffect);

// BAD: Double yield pattern
const intermediate = yield* _(providerEffect);
const provider = yield* _(intermediate as Effect);  // This will fail
```

## Testing Strategy

Add runtime tests to catch this pattern:

```typescript
describe("Provider Double Yield Detection", () => {
  it("should not attempt to yield providers as Effects", async () => {
    const testEffect = Effect.gen(function* (_) {
      // Test the actual provider setup pattern
      const provider = yield* _(configuredProviderEffect);
      return provider;
    });

    const exit = await Effect.runPromise(Effect.exit(testEffect));
    
    if (Exit.isFailure(exit)) {
      const errorMessage = String(exit.cause);
      expect(errorMessage).not.toContain("yield* (intermediate value)");
      expect(errorMessage).not.toContain("is not iterable");
    }
  });
});
```

## High-Impact Prevention

This fix prevents:
1. **Application Startup Failures**: Critical runtime errors during initialization
2. **Provider Integration Issues**: Incorrect Effect generator patterns
3. **Type Casting Complexity**: Eliminates unnecessary type assertions
4. **Developer Confusion**: Clearer, more direct code patterns

## Implementation Checklist

When implementing provider patterns:

- [ ] Single yield to get provider from configured Effect
- [ ] No type casting of provider instances to Effects
- [ ] Include model options in provider configuration calls
- [ ] Add runtime tests to verify Effect generator execution
- [ ] Verify similar patterns across all provider implementations

This pattern ensures clean, working Effect generator code when integrating provider-based libraries.