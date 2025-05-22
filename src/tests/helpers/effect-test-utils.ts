import { Effect, Layer, Context } from "effect";

/**
 * Helper for providing layers in tests - replaces Effect.provideLayer
 */
export const runTest = <A, E, ROut, E2>(
  effect: Effect.Effect<A, E, ROut>,
  layer: Layer.Layer<ROut, E2, never>
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