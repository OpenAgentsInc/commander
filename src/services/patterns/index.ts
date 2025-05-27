/**
 * Effect Service Pattern Library
 * 
 * A collection of patterns and utilities for working with Effect-TS services
 * in the OpenAgents Commander codebase.
 */

// Service creation patterns
export * from './ServiceTemplate'

// React integration hooks
export * from './EffectReactHooks'

// Testing utilities
export * from './TestServiceMocks'

// Re-export commonly used Effect types for convenience
export { Context, Effect, Layer, pipe, Runtime } from 'effect'
export type { ConfigError } from 'effect/ConfigError'
export type { UnknownException } from 'effect/Cause'