#!/usr/bin/env tsx
/**
 * Test harness services step by step
 */

import { Effect, Console, Layer } from "effect";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness/SWEBenchHarnessService";
import { SWEBenchCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";

// First, let's try to just access the harness service
const program = Effect.gen(function* () {
  yield* Console.log("Attempting to access SWEBenchHarnessService...");
  
  try {
    const harness = yield* SWEBenchHarnessService;
    yield* Console.log("✅ Successfully accessed harness service!");
    
    // Try to list tasks
    const tasks = yield* harness.listAvailableTasks();
    yield* Console.log(`Found ${tasks.length} tasks`);
    
  } catch (error) {
    yield* Console.log("❌ Failed to access harness:", error);
  }
  
  return "done";
});

console.log("Testing with SWEBenchCliLayer...\n");

Effect.runPromise(
  program.pipe(
    Effect.provide(SWEBenchCliLayer),
    Effect.catchAllDefect((defect) => 
      Effect.succeed(`Defect caught: ${JSON.stringify(defect)}`)
    ),
    Effect.catchAll((error) => 
      Effect.succeed(`Error caught: ${error}`)
    )
  )
)
  .then((result) => {
    console.log("\nResult:", result);
  })
  .catch((error) => {
    console.error("\nUncaught error:", error);
  });