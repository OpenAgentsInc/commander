#!/usr/bin/env tsx
/**
 * Test the fixed layer composition
 */

import { Effect, Console } from "effect";
import { SWEBenchCliLayerFixed } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayerFixed";

const program = Effect.gen(function* () {
  yield* Console.log("Testing fixed layer composition...");
  return "success";
});

Effect.runPromise(
  program.pipe(Effect.provide(SWEBenchCliLayerFixed))
)
  .then(() => console.log("✅ Fixed layer works!"))
  .catch((error) => {
    console.error("❌ Fixed layer failed:", error);
    console.error("Details:", JSON.stringify(error, null, 2));
  });