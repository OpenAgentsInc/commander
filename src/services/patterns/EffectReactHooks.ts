/**
 * Effect React Hooks
 * 
 * Safe patterns for using Effect services in React components
 * Addresses issues from docs/fixes/023-effect-runtime-stale-references.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Effect, Exit, Runtime, pipe, Context, Layer, Stream, Fiber } from 'effect'

/**
 * Hook for using Effect services in React components
 * Prevents stale reference issues by properly managing the runtime lifecycle
 */
export function useEffectService<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtime: Runtime.Runtime<R>,
  deps: React.DependencyList = []
): {
  data: A | null
  error: E | null
  loading: boolean
  execute: () => void
} {
  const [data, setData] = useState<A | null>(null)
  const [error, setError] = useState<E | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Use ref to store the latest runtime to prevent stale closures
  const runtimeRef = useRef(runtime)
  useEffect(() => {
    runtimeRef.current = runtime
  }, [runtime])
  
  // Store abort controller to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const execute = useCallback(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setLoading(true)
    setError(null)
    
    const fiber = Runtime.runFork(
      runtimeRef.current,
      effect
    )
    
    // Use Fiber.await to observe the result
    Runtime.runFork(
      runtimeRef.current,
      Fiber.await(fiber).pipe(
        Effect.tap((exit) => 
          Effect.sync(() => {
            if (!abortController.signal.aborted) {
              if (Exit.isSuccess(exit)) {
                setData(exit.value as A)
                setError(null)
              } else {
                setData(null)
                setError(exit.cause as unknown as E)
              }
              setLoading(false)
            }
          })
        )
      )
    )
    
    // Store cleanup function
    const cleanup = () => {
      abortController.abort()
      // Interrupt the fiber
      Runtime.runFork(runtimeRef.current, Fiber.interrupt(fiber))
    }
    
    return cleanup
  }, [...deps, effect])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  return { data, error, loading, execute }
}

/**
 * Hook for using Effect services with automatic execution
 */
export function useEffectServiceAuto<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtime: Runtime.Runtime<R>,
  deps: React.DependencyList = []
) {
  const result = useEffectService(effect, runtime, deps)
  
  useEffect(() => {
    result.execute()
  }, [result.execute])
  
  return result
}

/**
 * Hook for creating a stable Effect runtime in React
 * Prevents recreation on every render
 */
export function useEffectRuntime<R>(
  layer: Layer.Layer<R, never, never>,
  deps: React.DependencyList = []
): Runtime.Runtime<R> | null {
  const [runtime, setRuntime] = useState<Runtime.Runtime<R> | null>(null)
  
  useEffect(() => {
    let canceled = false
    
    Effect.runPromise(
      pipe(
        Effect.runtime<R>(),
        Effect.provide(layer)
      )
    ).then((rt) => {
      if (!canceled) {
        setRuntime(rt)
      }
    })
    
    return () => {
      canceled = true
    }
  }, deps)
  
  return runtime
}

/**
 * Hook for accessing a specific service from the runtime
 */
export function useService<T>(
  tag: Context.Tag<T, T>,
  runtime: Runtime.Runtime<any> | null
): T | null {
  const [service, setService] = useState<T | null>(null)
  
  useEffect(() => {
    if (runtime) {
      const context = runtime.context
      if (Context.isContext(context)) {
        const serviceInstance = Context.getOption(context, tag)
        if (serviceInstance._tag === 'Some') {
          setService(serviceInstance.value)
        }
      }
    }
  }, [runtime, tag])
  
  return service
}

/**
 * Hook for streaming Effect values
 * Useful for real-time updates, progress tracking, etc.
 */
export function useEffectStream<A, E, R>(
  stream: Stream.Stream<A, E, R>,
  runtime: Runtime.Runtime<R>,
  onValue: (value: A) => void,
  onError?: (error: E) => void,
  deps: React.DependencyList = []
) {
  const runtimeRef = useRef(runtime)
  useEffect(() => {
    runtimeRef.current = runtime
  }, [runtime])
  
  useEffect(() => {
    const fiber = Runtime.runFork(
      runtimeRef.current,
      Stream.runForEach(stream, (value) =>
        Effect.sync(() => onValue(value))
      ).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            if (onError) onError(error as E)
          })
        )
      )
    )
    
    return () => {
      Runtime.runFork(runtimeRef.current, Fiber.interrupt(fiber))
    }
  }, deps)
}

/**
 * Error boundary component for Effect services
 */
export class EffectErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallback: (error: unknown) => React.ReactNode
  },
  { hasError: boolean; error: unknown }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Effect service error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error)
    }
    
    return this.props.children
  }
}