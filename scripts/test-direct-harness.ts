#!/usr/bin/env tsx
/**
 * Test direct harness service access
 */

import { Effect, Console } from "effect";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness/SWEBenchHarnessService";
import { SWEBenchHarnessServiceLive } from "../src/services/swe_bench_harness/SWEBenchHarnessServiceImpl";
import { SWEBenchCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";

const program = Effect.gen(function* () {
  yield* Console.log("Testing harness service...");
  
  const harness = yield* SWEBenchHarnessService;
  yield* Console.log("✅ Got harness service!");
  
  // Try to list tasks
  const tasks = yield* harness.listAvailableTasks();
  yield* Console.log(`Found ${tasks.length} tasks`);
  
  return tasks;
});

// Test 1: With just the implementation layer
console.log("\n1. Testing with SWEBenchHarnessServiceLive:");
Effect.runPromise(
  program.pipe(Effect.provide(SWEBenchHarnessServiceLive))
)
  .then((tasks) => console.log("   ✅ Success! Tasks:", tasks.length))
  .catch((error) => console.log("   ❌ Failed:", error.message || error));

// Test 2: With the full CLI layer
setTimeout(() => {
  console.log("\n2. Testing with SWEBenchCliLayer:");
  Effect.runPromise(
    program.pipe(Effect.provide(SWEBenchCliLayer))
  )
    .then((tasks) => console.log("   ✅ Success! Tasks:", tasks.length))
    .catch((error) => console.log("   ❌ Failed:", error.message || error));
}, 100);