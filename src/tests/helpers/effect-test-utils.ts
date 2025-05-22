import { Effect, Layer, Context } from "effect";

/**
 * Helper for providing layers in tests - replaces Effect.provideLayer
 */
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, any>,
  layer: Layer.Layer<any, any, any>
) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

/**
 * Mock service creator helper
 */
export const mockService = <I, S>(
  tag: Context.Tag<I, S>,
  implementation: S
): Layer.Layer<I, never, never> => 
  Layer.succeed(tag, implementation);

/**
 * Helper for service access in tests
 */
export const getService = <I, S>(tag: Context.Tag<I, S>) =>
  Effect.service(tag);