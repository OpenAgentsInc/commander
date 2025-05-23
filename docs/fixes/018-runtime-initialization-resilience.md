# Fix: Runtime Initialization Resilience Pattern

## Problem

Effect runtime initialization fails completely when any service Layer uses `Effect.die()` during construction, preventing the entire application from starting. This commonly occurs with environment-specific dependencies like browser APIs.

### Error Messages
```
CRITICAL: Failed to create Effect runtime for renderer: (FiberFailure) ReferenceError: window is not defined
Service not found: [ServiceTag] (misleading - actually means runtime never initialized)
```

### Real Example
The Agent Chat "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" error was actually caused by `OllamaAsOpenAIClientLive` calling `Effect.die()` when `window.electronAPI` wasn't available, aborting the entire runtime initialization.

## Root Cause

Effect Layer composition creates all layers eagerly during runtime initialization. If any Layer construction fails with `Effect.die()`, it creates an unrecoverable defect that aborts the entire runtime initialization process.

```typescript
// WRONG: Dies during Layer construction
export const ServiceLive = Layer.effect(
  ServiceTag,
  Effect.gen(function* (_) {
    if (!window.someAPI) {
      return yield* _(Effect.die(new Error("API not available"))); // KILLS RUNTIME!
    }
    return implementation;
  })
);
```

## Solution: Deferred Initialization Pattern

Move environment checks from Layer construction time to method invocation time:

```typescript
// CORRECT: Defers checks to usage time
export const ServiceLive = Layer.succeed(
  ServiceTag,
  {
    someMethod: (params) => Effect.suspend(() => {
      if (!window.someAPI) {
        return Effect.fail(new ServiceUnavailableError());
      }
      return actualImplementation(params);
    }),
    
    someStream: (params) => Stream.suspend(() => {
      if (!window.someAPI) {
        return Stream.fail(new ServiceUnavailableError());
      }
      return actualStreamImplementation(params);
    })
  }
);
```

### Key Principles

1. **Never use Effect.die() in Layer construction** - It creates unrecoverable defects
2. **Use Layer.succeed for services with environment dependencies** - Guarantees construction succeeds
3. **Defer environment checks with Effect.suspend/Stream.suspend** - Check when methods are called
4. **Return proper errors, not defects** - Use Effect.fail with appropriate error types

## Complete Example: Browser API Service

```typescript
import { Layer, Effect, Stream, Context } from "effect";

// Service definition
export interface BrowserAPIService {
  readonly _tag: "BrowserAPIService";
  fetchData: (url: string) => Effect.Effect<string, BrowserAPIError>;
  streamData: (url: string) => Stream.Stream<Uint8Array, BrowserAPIError>;
}

export const BrowserAPIService = Context.GenericTag<BrowserAPIService>("BrowserAPIService");

// Error types
export class BrowserAPIError extends Data.TaggedError("BrowserAPIError")<{
  message: string;
  cause?: unknown;
}> {}

// Resilient implementation
export const BrowserAPIServiceLive = Layer.succeed(
  BrowserAPIService,
  {
    _tag: "BrowserAPIService" as const,
    
    fetchData: (url: string) => Effect.suspend(() => {
      // Check environment when method is called
      if (typeof window === 'undefined' || !window.fetch) {
        return Effect.fail(new BrowserAPIError({
          message: "Browser fetch API not available in current environment"
        }));
      }
      
      // Proceed with implementation
      return Effect.tryPromise({
        try: () => window.fetch(url).then(r => r.text()),
        catch: (error) => new BrowserAPIError({
          message: `Failed to fetch: ${error}`,
          cause: error
        })
      });
    }),
    
    streamData: (url: string) => Stream.suspend(() => {
      if (typeof window === 'undefined' || !window.fetch) {
        return Stream.fail(new BrowserAPIError({
          message: "Browser fetch API not available for streaming"
        }));
      }
      
      return Stream.unwrap(
        Effect.tryPromise({
          try: async () => {
            const response = await window.fetch(url);
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error("No response body");
            }
            
            return Stream.async<Uint8Array, BrowserAPIError>((emit) => {
              const read = async () => {
                try {
                  const { done, value } = await reader.read();
                  if (done) {
                    emit.end();
                  } else {
                    emit.single(value);
                    read();
                  }
                } catch (error) {
                  emit.fail(new BrowserAPIError({
                    message: "Stream read error",
                    cause: error
                  }));
                }
              };
              read();
              
              return Effect.sync(() => reader.cancel());
            });
          },
          catch: (error) => new BrowserAPIError({
            message: `Failed to start stream: ${error}`,
            cause: error
          })
        })
      );
    })
  }
);

// Usage in runtime - always succeeds
export const AppRuntime = Layer.mergeAll(
  BrowserAPIServiceLive,
  // Other services...
);

// Service usage - fails gracefully
const program = Effect.gen(function* (_) {
  const browserAPI = yield* _(BrowserAPIService);
  
  // This might fail if not in browser, but won't crash the runtime
  const data = yield* _(browserAPI.fetchData("https://api.example.com"));
  
  return data;
});
```

## Testing Strategy

### Runtime Initialization Tests

```typescript
describe("Runtime Initialization Resilience", () => {
  it("should initialize runtime in any environment", async () => {
    const environments = [
      { name: "browser", window: { fetch: globalThis.fetch } },
      { name: "node", window: undefined },
      { name: "partial", window: {} }
    ];
    
    for (const env of environments) {
      (global as any).window = env.window;
      
      const runtime = await initializeRuntime();
      expect(runtime).toBeDefined();
      
      // Other services should work regardless
      const result = await Effect.runPromise(
        Effect.flatMap(SomeOtherService, service => 
          service.doSomething()
        ).pipe(Effect.provide(runtime))
      );
      
      expect(result).toBeDefined();
    }
  });
});
```

### Service Degradation Tests

```typescript
describe("Service Degradation", () => {
  it("should provide clear errors when environment deps missing", async () => {
    delete (global as any).window;
    
    const runtime = await initializeRuntime();
    const result = await Effect.runPromiseExit(
      Effect.flatMap(BrowserAPIService, service =>
        service.fetchData("https://example.com")
      ).pipe(Effect.provide(runtime))
    );
    
    expect(result._tag).toBe("Failure");
    // Should get service error, not runtime crash
    const error = Cause.failureOption(result.cause);
    expect(error._tag).toBe("Some");
    expect(error.value).toBeInstanceOf(BrowserAPIError);
  });
});
```

## When to Apply This Pattern

Use deferred initialization when:

1. **Service depends on browser APIs**: window, document, navigator, etc.
2. **Service depends on Node.js APIs**: fs, crypto, process, etc.
3. **Service requires external resources**: Network APIs, native modules
4. **Service has platform-specific code**: Electron IPC, mobile APIs
5. **Service might not be available**: Optional features, paid features

## Related Patterns

- [017 - Effect Service Dependency Analysis](./017-effect-service-dependency-analysis.md): Understanding service dependencies
- [014 - Double Yield Provider Error](./014-double-yield-provider-error.md): Related runtime errors
- [Testing Expansion Roadmap](../testing-expansion-roadmap.md): Environment simulation testing

## Prevention Checklist

- [ ] No `Effect.die()` calls in Layer.effect constructors
- [ ] Environment checks use `Effect.suspend()` or `Stream.suspend()`
- [ ] Services with env dependencies use `Layer.succeed`
- [ ] Errors are proper failures, not defects
- [ ] Runtime initialization is tested without dependencies
- [ ] Service degradation paths are tested

## Key Lessons

1. **Runtime initialization must be infallible** - Design for success
2. **Defer environment checks to usage time** - Not construction time
3. **Graceful degradation over total failure** - Some features > no app
4. **Test in multiple environments** - Browser, Node, partial availability
5. **Clear errors help users understand** - Not "Service not found"

This pattern ensures your Effect application can start in any environment and provide appropriate errors when features aren't available, rather than failing to start entirely.