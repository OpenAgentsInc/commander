#!/usr/bin/env tsx
/**
 * Test minimal harness setup
 */

import { Effect, Console } from "effect";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness";
import { SWEBenchCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";

const program = Effect.gen(function* () {
  yield* Console.log("Starting SWE-bench harness test...");
  
  const harness = yield* SWEBenchHarnessService;
  
  // List available tasks
  const tasks = yield* harness.listAvailableTasks();
  yield* Console.log(`Found ${tasks.length} tasks`);
  
  // Try to run evaluation on the simplest task
  if (tasks.length > 0) {
    const taskId = tasks[0];
    yield* Console.log(`Testing with task: ${taskId}`);
    
    const result = yield* harness.runEvaluation(
      taskId,
      "claude_code",
      { maxRetries: 1 }
    );
    
    yield* Console.log(`Result: ${result.success ? 'Success' : 'Failed'}`);
  }
  
  return "complete";
});

Effect.runPromise(
  program.pipe(Effect.provide(SWEBenchCliLayer))
)
  .then((result) => {
    console.log("✅ Test completed:", result);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });