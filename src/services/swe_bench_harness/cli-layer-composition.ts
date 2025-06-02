// src/services/swe_bench_harness/cli-layer-composition.ts
/**
 * CLI-specific layer composition for SWE-Bench harness.
 * This avoids browser-specific imports and provides appropriate implementations for CLI context.
 */

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { SWEBenchHarnessService } from "./SWEBenchHarnessService";
import { SWEBenchCliLayer } from "./layers/SWEBenchCliLayer";

/**
 * Complete CLI layer for SWE-bench evaluation
 * Re-exported from the centralized layer definition
 */
export const CLISWEBenchHarnessLayer = SWEBenchCliLayer as Layer.Layer<SWEBenchHarnessService, never, never>;

/**
 * Helper function to run effects with the CLI layer
 */
export const runWithCLILayer = <A, E>(effect: Effect.Effect<A, E, SWEBenchHarnessService>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(CLISWEBenchHarnessLayer)
    )
  );