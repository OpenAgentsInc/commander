/**
 * Test Service Mocks Template
 * 
 * Patterns for creating test mocks that satisfy Effect's type system
 * Addresses issues from docs/fixes/012-strategic-test-type-casting.md
 */

import { Context, Effect, Layer, pipe } from 'effect'
import type { ConfigError } from 'effect/ConfigError'

/**
 * Pattern 1: Simple mock with static values
 */
export const createSimpleMock = <T>(
  tag: Context.Tag<T, T>,
  implementation: T
): Layer.Layer<T> => {
  return Layer.succeed(tag, implementation)
}

/**
 * Pattern 2: Mock with configurable behavior
 */
export interface MockConfig<T> {
  implementation: Partial<T>
  delays?: Record<string, number>
  errors?: Record<string, Error>
}

export const createConfigurableMock = <T extends Record<string, any>>(
  tag: Context.Tag<T, T>,
  config: MockConfig<T>
): Layer.Layer<T> => {
  const implementation = {} as T
  
  for (const key in config.implementation) {
    const method = config.implementation[key]
    if (typeof method === 'function') {
      implementation[key] = ((...args: any[]) => {
        // Add configured delay
        const delay = config.delays?.[key] || 0
        
        // Check for configured error
        const error = config.errors?.[key]
        
        return pipe(
          Effect.sleep(delay),
          Effect.flatMap(() => 
            error 
              ? Effect.fail(error)
              : Effect.succeed(method(...args))
          )
        )
      }) as any
    } else {
      implementation[key] = method as any
    }
  }
  
  return Layer.succeed(tag, implementation)
}

/**
 * Pattern 3: Spy mock that records calls
 */
export interface SpyMock<T> {
  implementation: T
  calls: Record<string, any[][]>
  resetCalls: () => void
}

export const createSpyMock = <T extends Record<string, any>>(
  tag: Context.Tag<T, T>,
  baseImplementation: T
): Layer.Layer<T> & { spy: SpyMock<T> } => {
  const calls: Record<string, any[][]> = {}
  
  const implementation = {} as T
  
  for (const key in baseImplementation) {
    const method = baseImplementation[key]
    if (typeof method === 'function') {
      calls[key] = []
      implementation[key] = ((...args: any[]) => {
        calls[key].push(args)
        return method(...args)
      }) as any
    } else {
      implementation[key] = method
    }
  }
  
  const spy: SpyMock<T> = {
    implementation,
    calls,
    resetCalls: () => {
      for (const key in calls) {
        calls[key] = []
      }
    }
  }
  
  const layer = Layer.succeed(tag, implementation) as Layer.Layer<T> & { spy: SpyMock<T> }
  layer.spy = spy
  
  return layer
}

/**
 * Pattern 4: State-based mock
 */
export interface StatefulMock<T, S> {
  implementation: T
  getState: () => S
  setState: (state: S) => void
  resetState: () => void
}

export const createStatefulMock = <T extends Record<string, any>, S>(
  tag: Context.Tag<T, T>,
  initialState: S,
  implementationFactory: (
    getState: () => S,
    setState: (state: S) => void
  ) => T
): Layer.Layer<T> & { mock: StatefulMock<T, S> } => {
  let state = initialState
  
  const getState = () => state
  const setState = (newState: S) => { state = newState }
  const resetState = () => { state = initialState }
  
  const implementation = implementationFactory(getState, setState)
  
  const mock: StatefulMock<T, S> = {
    implementation,
    getState,
    setState,
    resetState
  }
  
  const layer = Layer.succeed(tag, implementation) as Layer.Layer<T> & { mock: StatefulMock<T, S> }
  layer.mock = mock
  
  return layer
}

/**
 * Pattern 5: Async mock with promise resolution control
 */
export interface AsyncMock<T> {
  implementation: T
  resolvers: Record<string, {
    resolve: (value: any) => void
    reject: (error: any) => void
  }[]>
  waitForCall: (method: string, callIndex?: number) => Promise<void>
}

export const createAsyncMock = <T extends Record<string, any>>(
  tag: Context.Tag<T, T>,
  methods: (keyof T)[]
): Layer.Layer<T> & { async: AsyncMock<T> } => {
  const resolvers: Record<string, any[]> = {}
  const pendingCalls: Record<string, Promise<void>[]> = {}
  
  const implementation: any = {}
  
  methods.forEach((method) => {
    const methodName = String(method)
    resolvers[methodName] = []
    pendingCalls[methodName] = []
    
    implementation[methodName] = () => {
      return Effect.async<any, any>((resume) => {
        const promise = new Promise<void>((resolve) => {
          const resolverObj = {
            resolve: (value: any) => {
              resume(Effect.succeed(value))
              resolve()
            },
            reject: (error: any) => {
              resume(Effect.fail(error))
              resolve()
            }
          }
          resolvers[methodName].push(resolverObj)
        })
        pendingCalls[methodName].push(promise)
      })
    }
  })
  
  const asyncMock: AsyncMock<T> = {
    implementation,
    resolvers: resolvers as any,
    waitForCall: async (method: string, callIndex = 0) => {
      const calls = pendingCalls[method]
      if (calls && calls[callIndex] !== undefined) {
        await calls[callIndex]
      }
    }
  }
  
  const layer = Layer.succeed(tag, implementation) as Layer.Layer<T> & { async: AsyncMock<T> }
  layer.async = asyncMock
  
  return layer
}

/**
 * Example usage with a hypothetical UserService
 */
export interface UserService {
  getUser: (id: string) => Effect.Effect<{ id: string; name: string }, Error>
  updateUser: (id: string, name: string) => Effect.Effect<void, Error>
}

export const UserService = Context.GenericTag<UserService>('UserService')

// Example 1: Simple mock
export const UserServiceSimpleMock = createSimpleMock(UserService, {
  getUser: (id: string) => Effect.succeed({ id, name: 'Test User' }),
  updateUser: () => Effect.succeed(undefined)
})

// Example 2: Spy mock
export const UserServiceSpyMock = createSpyMock(UserService, {
  getUser: (id: string) => Effect.succeed({ id, name: 'Test User' }),
  updateUser: () => Effect.succeed(undefined)
})

// Example 3: Stateful mock
export const UserServiceStatefulMock = createStatefulMock(
  UserService,
  { users: new Map<string, string>() },
  (getState, setState) => ({
    getUser: (id: string) =>
      Effect.gen(function* () {
        const state = getState()
        const name = state.users.get(id)
        if (!name) {
          return yield* Effect.fail(new Error('User not found'))
        }
        return { id, name }
      }),
    updateUser: (id: string, name: string) =>
      Effect.sync(() => {
        const state = getState()
        state.users.set(id, name)
        setState(state)
      })
  })
)

// Test helpers
export const runEffectTest = async <A, E>(
  effect: Effect.Effect<A, E, any>,
  layer: Layer.Layer<any>
): Promise<A> => {
  return Effect.runPromise(pipe(effect, Effect.provide(layer)))
}

export const runEffectTestExpectError = async <A, E>(
  effect: Effect.Effect<A, E, any>,
  layer: Layer.Layer<any>
): Promise<E> => {
  try {
    await Effect.runPromise(pipe(effect, Effect.provide(layer)))
    throw new Error('Expected effect to fail')
  } catch (error) {
    return error as E
  }
}