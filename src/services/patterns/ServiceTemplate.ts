/**
 * Effect Service Template
 * 
 * This template demonstrates the correct patterns for creating Effect services
 * based on issues identified in docs/fixes/
 * 
 * Copy this file and replace "Example" with your service name.
 */

import { Context, Effect, Layer, pipe } from 'effect'
import type { ConfigError } from 'effect/ConfigError'
import { type UnknownException } from 'effect/Cause'

/**
 * Step 1: Define your service errors
 * Always create specific error types for your service
 */
export class ExampleServiceError extends Error {
  readonly _tag = 'ExampleServiceError'
  
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ExampleServiceError'
  }
}

/**
 * Step 2: Define your service interface
 * This is what consumers will interact with
 */
export interface ExampleService {
  readonly doSomething: (input: string) => Effect.Effect<string, ExampleServiceError>
  readonly doSomethingAsync: (input: number) => Effect.Effect<number, ExampleServiceError>
}

/**
 * Step 3: Create the service Tag
 * IMPORTANT: Use Context.GenericTag, not Context.Tag (fixes type inference issues)
 */
export const ExampleService = Context.GenericTag<ExampleService>('ExampleService')

/**
 * Step 4: Define configuration interface if needed
 */
export interface ExampleServiceConfig {
  readonly apiUrl: string
  readonly timeout: number
  readonly enableDebug?: boolean
}

/**
 * Step 5: Create configuration service tag
 */
export const ExampleServiceConfig = Context.GenericTag<ExampleServiceConfig>('ExampleServiceConfig')

/**
 * Step 6: Implement the service
 * Use a class for complex services, object literal for simple ones
 */
export class ExampleServiceImpl implements ExampleService {
  constructor(
    private readonly config: ExampleServiceConfig
  ) {}

  readonly doSomething = (input: string) => {
    const config = this.config
    return Effect.gen(function* () {
      try {
        // Your implementation here
        if (input.length === 0) {
          return yield* Effect.fail(
            new ExampleServiceError('Input cannot be empty')
          )
        }
        
        if (config.enableDebug) {
          yield* Effect.log(`Processing: ${input}`)
        }
        
        return `Processed: ${input}`
      } catch (error) {
        return yield* Effect.fail(
          new ExampleServiceError('Failed to process input', error)
        )
      }
    })
  }

  readonly doSomethingAsync = (input: number) => {
    const config = this.config
    return Effect.gen(function* () {
      try {
        // Simulate async operation
        yield* Effect.sleep(100)
        
        if (input < 0) {
          return yield* Effect.fail(
            new ExampleServiceError('Input must be positive')
          )
        }
        
        // Example of calling external API with timeout
        const result = yield* pipe(
          Effect.promise(() => 
            fetch(`${config.apiUrl}/data/${input}`)
              .then(res => res.json())
              .then(data => data.value as number)
          ),
          Effect.timeout(config.timeout),
          Effect.catchAll((error) => 
            Effect.fail(new ExampleServiceError('API call failed', error))
          )
        )
        
        return result
      } catch (error) {
        return yield* Effect.fail(
          new ExampleServiceError('Async operation failed', error)
        )
      }
    })
  }
}

/**
 * Step 7: Create the service Layer
 * This is how the service is provided to the application
 */
export const ExampleServiceLive = Layer.effect(
  ExampleService,
  Effect.gen(function* () {
    const config = yield* ExampleServiceConfig
    return new ExampleServiceImpl(config)
  })
)

/**
 * Step 8: Create a test/mock implementation
 */
export const ExampleServiceTest = Layer.succeed(
  ExampleService,
  {
    doSomething: (input: string) => Effect.succeed(`Test: ${input}`),
    doSomethingAsync: (input: number) => Effect.succeed(input * 2)
  }
)

/**
 * Step 9: Create configuration layers
 */
export const ExampleServiceConfigLive = (config: ExampleServiceConfig) =>
  Layer.succeed(ExampleServiceConfig, config)

export const ExampleServiceConfigDefault = Layer.succeed(
  ExampleServiceConfig,
  {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    enableDebug: false
  }
)

/**
 * Step 10: Compose layers for easy consumption
 */
export const ExampleServiceDefault = ExampleServiceConfigDefault.pipe(
  Layer.provide(ExampleServiceLive)
)

/**
 * Step 11: Export type helpers
 */
export type ExampleServiceShape = Context.Tag.Service<typeof ExampleService>