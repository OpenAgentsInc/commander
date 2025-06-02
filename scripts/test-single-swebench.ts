#!/usr/bin/env tsx
/**
 * Test SWE-bench on a single task
 */

import { Effect, Console } from "effect";
import * as fs from "fs/promises";
import * as path from "path";
import { PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { 
  AgentPatchGeneratorService, 
  SWEBenchTaskService,
} from "../src/services/swe_bench_harness";

const program = Effect.gen(function* () {
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  // Test with just one task
  const taskId = "simple-python-fix";
  
  yield* Console.log(`Testing SWE-bench with task: ${taskId}`);
  
  try {
    // Load task
    const task = yield* taskService.getTask(taskId);
    yield* Console.log(`Loaded task: ${task.repo}`);
    
    // Generate patch
    yield* Console.log("Generating patch...");
    const patch = yield* patchGenerator.generatePatch(
      task,
      "/tmp/test",
      "claude_code"
    );
    
    yield* Console.log(`Generated patch (${patch.length} chars):`);
    yield* Console.log(patch);
    
    // For now, just test patch generation
    // Docker evaluation would go here
    
    return { success: true, patch };
    
  } catch (error) {
    yield* Console.log(`Error: ${error}`);
    return { success: false, error: String(error) };
  }
});

Effect.runPromise(
  program.pipe(Effect.provide(PatchGenerationCliLayer))
)
  .then((result) => {
    console.log("\nTest completed:", result.success ? "SUCCESS" : "FAILED");
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("\nFatal error:", error);
    process.exit(1);
  });