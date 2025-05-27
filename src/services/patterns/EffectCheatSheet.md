# Effect-TS Cheat Sheet for OpenAgents Commander

This cheat sheet covers common Effect patterns and solutions to issues found in docs/fixes/.

## Table of Contents
1. [Service Creation Patterns](#service-creation-patterns)
2. [Error Handling](#error-handling)  
3. [Configuration Management](#configuration-management)
4. [Testing Patterns](#testing-patterns)
5. [React Integration](#react-integration)
6. [Common Gotchas](#common-gotchas)

## Service Creation Patterns

### ✅ DO: Use Context.GenericTag
```typescript
// Correct - provides better type inference
export const MyService = Context.GenericTag<MyService>('MyService')
```

### ❌ DON'T: Use Context.Tag
```typescript
// Incorrect - can cause type inference issues
export const MyService = Context.Tag<MyService>('MyService')
```

### ✅ DO: Create specific error types
```typescript
export class MyServiceError extends Error {
  readonly _tag = 'MyServiceError'
  constructor(message: string, readonly cause?: unknown) {
    super(message)
  }
}
```

### ✅ DO: Use Layer.effect for complex services
```typescript
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const config = yield* ConfigService
    const database = yield* DatabaseService
    return new MyServiceImpl(config, database)
  })
)
```

## Error Handling

### Handle different error types
```typescript
Effect.catchTags({
  ConfigError: (error) => Effect.fail(new MyServiceError('Invalid config', error)),
  NetworkError: (error) => Effect.fail(new MyServiceError('Network failed', error)),
  // Catch-all for unexpected errors
  UnknownException: (error) => Effect.fail(new MyServiceError('Unknown error', error))
})
```

### Convert Promise errors safely
```typescript
// ✅ DO: Wrap promises properly
Effect.tryPromise({
  try: () => fetch(url),
  catch: (error) => new MyServiceError('Fetch failed', error)
})

// ❌ DON'T: Use Effect.promise directly
Effect.promise(() => fetch(url)) // Loses error context
```

## Configuration Management

### ✅ DO: Forbid fallbacks for sensitive data (Fix #022)
```typescript
export const ApiKeyConfig = Config.string('API_KEY').pipe(
  Config.validate({
    message: 'API_KEY is required',
    validation: (key) => key.length > 0
  })
)

// ❌ DON'T: Use withDefault for secrets
Config.string('API_KEY').pipe(Config.withDefault('test-key'))
```

### ✅ DO: Create typed configuration services
```typescript
export interface MyServiceConfig {
  readonly apiUrl: string
  readonly timeout: number
}

export const MyServiceConfig = Context.GenericTag<MyServiceConfig>('MyServiceConfig')
```

## Testing Patterns

### Use test layers properly
```typescript
describe('MyService', () => {
  const testLayer = Layer.mergeAll(
    DatabaseServiceTest,
    ConfigServiceTest,
    MyServiceLive
  )
  
  it('should work', async () => {
    const result = await Effect.runPromise(
      myServiceMethod.pipe(Effect.provide(testLayer))
    )
    expect(result).toBe(expected)
  })
})
```

### Mock with spy capabilities
```typescript
const mockLayer = createSpyMock(MyService, {
  doSomething: () => Effect.succeed('mocked')
})

// After test
expect(mockLayer.spy.calls.doSomething).toHaveLength(1)
```

## React Integration

### ✅ DO: Use refs to prevent stale closures (Fix #023)
```typescript
const runtimeRef = useRef(runtime)
useEffect(() => {
  runtimeRef.current = runtime
}, [runtime])
```

### ✅ DO: Cleanup Effect fibers
```typescript
useEffect(() => {
  const fiber = Effect.runFork(myEffect)(runtime)
  return () => {
    fiber.interrupt
  }
}, [deps])
```

### ❌ DON'T: Create runtime in render
```typescript
// Bad - creates new runtime every render
const runtime = Runtime.make(layer)

// Good - use useEffectRuntime hook
const runtime = useEffectRuntime(layer)
```

## Common Gotchas

### 1. Double-yield in Layer.effect (Fix #014)
```typescript
// ❌ Wrong - double yield
Layer.effect(
  MyService,
  Effect.gen(function* () {
    return yield* Effect.succeed(new MyServiceImpl())
  })
)

// ✅ Correct - single yield or direct return
Layer.effect(
  MyService,
  Effect.gen(function* () {
    const config = yield* ConfigService
    return new MyServiceImpl(config)
  })
)
```

### 2. Service dependency cycles
```typescript
// ❌ Circular dependency
const ServiceA = Layer.effect(ServiceATag, 
  Effect.gen(function* () {
    const b = yield* ServiceB // ServiceB depends on ServiceA!
  })
)

// ✅ Use factory pattern or restructure
const ServiceAFactory = (serviceB: ServiceB) => 
  Layer.succeed(ServiceATag, new ServiceAImpl(serviceB))
```

### 3. Effect vs Promise in APIs
```typescript
// When exposing to non-Effect code
export class MyServiceBridge {
  async doSomething(input: string): Promise<Result> {
    return Effect.runPromise(
      this.service.doSomething(input).pipe(
        Effect.provide(this.runtime)
      )
    )
  }
}
```

### 4. Type inference with pipe
```typescript
// Help TypeScript with explicit types when needed
pipe(
  myEffect,
  Effect.map((value): ProcessedType => processValue(value)),
  Effect.catchAll((error): Effect.Effect<Fallback, never> => 
    Effect.succeed(fallbackValue)
  )
)
```

### 5. Testing async Effects
```typescript
// Use Effect.runPromise in tests
it('should handle async operations', async () => {
  const result = await Effect.runPromise(
    myAsyncEffect.pipe(Effect.provide(testLayer))
  )
  expect(result).toBe(expected)
})
```

## Quick Reference

### Essential imports
```typescript
import { Context, Effect, Layer, pipe, Stream } from 'effect'
import * as Config from 'effect/Config'
import * as Runtime from 'effect/Runtime'
import * as Exit from 'effect/Exit'
```

### Service lifecycle
1. Define interface → 2. Create Tag → 3. Implement → 4. Create Layer → 5. Compose

### Effect operators by use case
- **Transform**: `map`, `flatMap`, `tap`
- **Error handling**: `catchAll`, `catchTags`, `orElse`
- **Resource management**: `acquireRelease`, `scoped`
- **Concurrency**: `all`, `race`, `forEach`
- **Retry**: `retry`, `retryOrElse`
- **Timeout**: `timeout`, `timeoutFail`

### Debug helpers
```typescript
// Log intermediate values
Effect.tap(value => Effect.log('Value:', value))

// Log and pass through
Effect.tapBoth({
  onFailure: (error) => Effect.log('Error:', error),
  onSuccess: (value) => Effect.log('Success:', value)
})
```