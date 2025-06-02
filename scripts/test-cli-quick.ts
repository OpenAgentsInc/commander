#!/usr/bin/env tsx
/**
 * Quick test of CLI functionality
 */

import { Effect, Console } from "effect";
import { PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { SWEBenchTaskService } from "../src/services/swe_bench_harness";

const program = Effect.gen(function* () {
  const taskService = yield* SWEBenchTaskService;
  
  yield* Console.log("Testing SWE-bench CLI...");
  
  // List tasks
  const tasks = yield* taskService.listAvailableTaskIds();
  yield* Console.log(`Found ${tasks.length} tasks: ${tasks.join(", ")}`);
  
  // Load first task
  if (tasks.length > 0) {
    const task = yield* taskService.getTask(tasks[0]);
    yield* Console.log(`First task: ${task.instance_id}`);
    yield* Console.log(`Repo: ${task.repo}`);
  }
  
  return "success";
});

// Set required env var
process.env.SWE_BENCH_DATASET_PATH = "./assets/swebench-tasks";

Effect.runPromise(
  program.pipe(Effect.provide(PatchGenerationCliLayer))
)
  .then((result) => {
    console.log("Result:", result);
  })
  .catch((error) => {
    console.error("Error:", error);
  });