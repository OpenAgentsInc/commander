# Fix: Service Tag Access Patterns in Effect

## Problem

When accessing services in Effect generators, using the service class directly instead of its Tag property causes type errors:

```typescript
// This doesn't work:
const model = yield* _(AgentLanguageModel); // Type error
```

### Error Message
```
Argument of type '{ Tag: Context.Tag<AgentLanguageModel, AgentLanguageModel>; }' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
Type '{ Tag: Tag<AgentLanguageModel, AgentLanguageModel>; }' is missing the following properties from type 'Effect<unknown, unknown, unknown>': [Symbol.iterator], [EffectTypeId], pipe, [SinkTypeId], and 2 more.
```

## Root Cause

In Effect, service classes are not directly usable in `yield* _()` expressions. Service classes have a `.Tag` property that contains the actual `Context.Tag` needed for dependency injection.

The confusion arises because:
1. Service classes look like they should be directly yieldable
2. The `.Tag` property is not immediately obvious
3. TypeScript shows complex error messages about missing symbols

## Solution

Always use the `.Tag` property when accessing services in Effect generators:

```typescript
// Correct pattern:
const model = yield* _(AgentLanguageModel.Tag);
const config = yield* _(ConfigurationService.Tag);  
const telemetry = yield* _(TelemetryService.Tag);
```

### Why This Pattern is Required

1. **Context.Tag**: Effect's dependency injection system uses `Context.Tag<Identifier, Service>`
2. **Service Classes**: Classes like `AgentLanguageModel` are wrappers that contain the Tag
3. **Generator Syntax**: `yield* _()` expects a Context.Tag or Effect, not a service class
4. **Type Safety**: Using `.Tag` ensures proper type inference and dependency tracking

## Complete Example

```typescript
// Service definition
export class MyService extends Context.Tag("MyService")<MyService, {
  doSomething: (input: string) => Effect.Effect<string, never, never>;
}> {}

// Correct usage in Effect generators
export const myProgram = Effect.gen(function* (_) {
  // ✅ Correct - use .Tag
  const myService = yield* _(MyService.Tag);
  const result = yield* _(myService.doSomething("input"));
  
  // ❌ Wrong - don't use service class directly
  // const myService = yield* _(MyService); // Type error!
  
  return result;
});

// In Layer definitions
export const MyServiceLive = Layer.succeed(
  MyService.Tag, // ✅ Use .Tag here too
  {
    doSomething: (input: string) => Effect.succeed(`processed: ${input}`)
  }
);
```

## Common Service Patterns

### Built-in Effect Services
```typescript
// These services follow the same pattern:
const logger = yield* _(Logger.Tag);
const console = yield* _(Console.Tag);
const clock = yield* _(Clock.Tag);
```

### Custom Application Services  
```typescript
// Your application services:
const agentLM = yield* _(AgentLanguageModel.Tag);
const config = yield* _(ConfigurationService.Tag);
const telemetry = yield* _(TelemetryService.Tag);
const nostr = yield* _(NostrService.Tag);
```

### Layer Composition
```typescript
// When providing services to layers:
export const AppLive = Layer.mergeAll(
  AgentLanguageModel.Tag.pipe(Layer.provide(OllamaAgentLanguageModelLive)),
  ConfigurationService.Tag.pipe(Layer.provide(ConfigurationServiceLive)),
  TelemetryService.Tag.pipe(Layer.provide(TelemetryServiceLive))
);
```

## Batch Fix Pattern

When refactoring codebases, this is often a batch-fixable pattern:

```bash
# Find all incorrect usages:
grep -r "yield\* _(.*Service)" src/ | grep -v "\.Tag"

# Replace pattern:
# yield* _(ServiceName) → yield* _(ServiceName.Tag)
```

In TypeScript files:
```typescript
// Before (incorrect):
const agentLM = yield* _(AgentLanguageModel);
const config = yield* _(ConfigurationService);
const telemetry = yield* _(TelemetryService);

// After (correct):  
const agentLM = yield* _(AgentLanguageModel.Tag);
const config = yield* _(ConfigurationService.Tag);
const telemetry = yield* _(TelemetryService.Tag);
```

## When to Apply This Fix

Apply this fix when you see:
1. Type errors mentioning missing `[EffectTypeId]` or `[Symbol.iterator]`
2. Errors about service classes not being assignable to Effect types
3. `Context.Tag` mentioned in error messages
4. Service access in Effect generators failing to compile

## Testing Implications

This pattern also applies in test files:

```typescript
// In test setup:
const program = Effect.gen(function* (_) {
  const service = yield* _(MyService.Tag); // ✅ Use .Tag in tests too
  const result = yield* _(service.method());
  return result;
});

// When providing test layers:
const testLayer = Layer.succeed(MyService.Tag, mockImplementation);
```

## Related Issues

- Common in large codebases during Effect migrations
- Often appears alongside [002-provider-service-access-pattern.md](./002-provider-service-access-pattern.md)
- High-impact fix: batch replacement can eliminate dozens of errors at once
- Essential for proper dependency injection in Effect applications