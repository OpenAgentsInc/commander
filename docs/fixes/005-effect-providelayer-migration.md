# Fix: Effect.provideLayer Migration to Effect.provide

## Problem

When upgrading Effect to newer versions, `Effect.provideLayer` is deprecated and causes type errors:

```typescript
// Old pattern that no longer works:
Effect.runPromise(
  program.pipe(Effect.provideLayer(TestLayers))
);
```

### Error Message
```
Property 'provideLayer' does not exist on type 'typeof import("effect/Effect")'
```

## Root Cause

In newer versions of Effect, the layer providing API was simplified:
- **Old API**: `Effect.provideLayer(layer)` 
- **New API**: `Effect.provide(layer)`

The `provideLayer` method was removed to reduce API surface area and improve consistency, as `provide` can handle both individual services and layers.

## Solution

Replace all `Effect.provideLayer` calls with `Effect.provide`:

```typescript
// ✅ New pattern:
Effect.runPromise(
  program.pipe(Effect.provide(TestLayers))
);
```

### Batch Migration Pattern

This is typically a mechanical find-and-replace operation:

```typescript
// Before:
Effect.provideLayer(layer)

// After:  
Effect.provide(layer)
```

## Complete Examples

### Test Files
```typescript
// Before:
describe("AI Provider Tests", () => {
  it("should generate text", async () => {
    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel.Tag);
      return yield* _(model.generateText({ prompt: "test" }));
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provideLayer(TestLayers)) // ❌ Old
    );
    
    expect(result.text).toBe("Generated text");
  });
});

// After:
describe("AI Provider Tests", () => {
  it("should generate text", async () => {
    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel.Tag);
      return yield* _(model.generateText({ prompt: "test" }));
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayers)) // ✅ New
    );
    
    expect(result.text).toBe("Generated text");
  });
});
```

### Integration Tests
```typescript
// Before:
const testProgram = Effect.gen(function* (_) {
  const nip90Service = yield* _(NIP90Service.Tag);
  const result = yield* _(nip90Service.createJobRequest({
    kind: 5050,
    content: "test",
    // ...
  }));
  return result;
});

await Effect.runPromise(
  testProgram.pipe(Effect.provideLayer(testLayer)) // ❌ Old
);

// After:
const testProgram = Effect.gen(function* (_) {
  const nip90Service = yield* _(NIP90Service.Tag);
  const result = yield* _(nip90Service.createJobRequest({
    kind: 5050,
    content: "test",
    // ...
  }));
  return result;
});

await Effect.runPromise(
  testProgram.pipe(Effect.provide(testLayer)) // ✅ New
);
```

### Application Bootstrap
```typescript
// Before:
const main = Effect.gen(function* (_) {
  const app = yield* _(AppService.Tag);
  yield* _(app.start());
});

Effect.runPromise(
  main.pipe(Effect.provideLayer(AppLive)) // ❌ Old
);

// After:
const main = Effect.gen(function* (_) {
  const app = yield* _(AppService.Tag);
  yield* _(app.start());
});

Effect.runPromise(
  main.pipe(Effect.provide(AppLive)) // ✅ New
);
```

## Layer Composition Still Works

The migration only affects the final `provide` call. Layer composition patterns remain the same:

```typescript
// Layer composition unchanged:
const AppLive = Layer.mergeAll(
  ConfigurationServiceLive,
  TelemetryServiceLive,
  AgentLanguageModelLive
);

// Only the final provide call changes:
Effect.runPromise(
  program.pipe(Effect.provide(AppLive)) // ✅ Use provide, not provideLayer
);
```

## Automated Migration

### Using sed/grep
```bash
# Find all files with the old pattern:
grep -r "Effect.provideLayer" src/

# Replace in all TypeScript files:
sed -i 's/Effect\.provideLayer/Effect.provide/g' src/**/*.ts
```

### Using IDE Find/Replace
1. **Find**: `Effect.provideLayer`
2. **Replace**: `Effect.provide`
3. **Scope**: All project files
4. **File types**: `*.ts`, `*.tsx`

## Test Helper Utilities

You can create helpers to reduce boilerplate:

```typescript
// src/tests/helpers/effect-test-utils.ts
import { Effect, Layer } from "effect";

/**
 * Helper for running tests with layers
 */
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, any>,
  layer: Layer.Layer<any, any, any>
) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

// Usage in tests:
import { runTest } from "@/tests/helpers/effect-test-utils";

it("should work", async () => {
  const program = Effect.gen(function* (_) {
    // ... test logic
  });
  
  const result = await runTest(program, TestLayers);
  expect(result).toBe(expected);
});
```

## When to Apply This Fix

Apply this migration when:
1. Upgrading Effect to newer versions (v3.0+)
2. Seeing `provideLayer does not exist` errors
3. Modernizing test suites that use old Effect APIs
4. Setting up new projects with current Effect best practices

## Verification Steps

After migration:
1. **Type Check**: `pnpm tsc --noEmit` should pass
2. **Test Suite**: All tests should still pass
3. **Runtime**: Application should start and function normally
4. **No Regressions**: Layer composition and dependency injection still work

## Related Issues

- High-impact batch fix: can eliminate dozens of errors at once
- Essential for Effect version upgrades
- Often appears alongside [003-service-tag-access-patterns.md](./003-service-tag-access-patterns.md) during migrations
- May require updating test utilities and helper functions
- Affects all files that bootstrap Effect applications or run tests