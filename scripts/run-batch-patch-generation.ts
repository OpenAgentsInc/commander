#!/usr/bin/env tsx
/**
 * Batch patch generation runner - focuses only on generating patches
 * Does not run Docker evaluation
 */

import { Effect, Console, pipe } from "effect";
import { PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { AgentPatchGeneratorService, SWEBenchTaskService } from "../src/services/swe_bench_harness";
import * as fs from "fs/promises";
import * as path from "path";

const outputDir = `./swebench-results/batch-${Date.now()}`;

const program = Effect.gen(function* () {
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  yield* Console.log("🚀 SWE-bench Batch Patch Generation");
  yield* Console.log(`📂 Output directory: ${outputDir}`);
  
  // Create output directory
  yield* Effect.tryPromise(() => fs.mkdir(outputDir, { recursive: true }));
  
  // List all available tasks
  const taskIds = yield* taskService.listAvailableTaskIds();
  yield* Console.log(`\n📋 Found ${taskIds.length} tasks`);
  
  const results = [];
  let succeeded = 0;
  let failed = 0;
  
  // Process each task
  for (const taskId of taskIds) {
    yield* Console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    yield* Console.log(`Processing: ${taskId}`);
    
    try {
      // Load task
      const task = yield* taskService.getTask(taskId);
      yield* Console.log(`  Repo: ${task.repo}`);
      yield* Console.log(`  Problem: ${task.problem_statement.substring(0, 60)}...`);
      
      // Generate patch
      const startTime = Date.now();
      const patch = yield* patchGenerator.generatePatch(
        task,
        "/tmp/dummy-repo",
        "claude_code"
      );
      const elapsed = Date.now() - startTime;
      
      // Save patch
      const patchFile = path.join(outputDir, `${taskId}.patch`);
      yield* Effect.tryPromise(() => fs.writeFile(patchFile, patch));
      
      // Record result
      const result = {
        task_id: taskId,
        repo: task.repo,
        success: true,
        elapsed_ms: elapsed,
        patch_length: patch.length,
        patch_file: patchFile
      };
      results.push(result);
      succeeded++;
      
      yield* Console.log(`  ✅ Success! Generated ${patch.length} chars in ${elapsed}ms`);
      
    } catch (error) {
      // Record failure
      const result = {
        task_id: taskId,
        success: false,
        error: String(error)
      };
      results.push(result);
      failed++;
      
      yield* Console.log(`  ❌ Failed: ${error}`);
    }
  }
  
  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_tasks: taskIds.length,
    succeeded,
    failed,
    success_rate: (succeeded / taskIds.length * 100).toFixed(1) + '%',
    results
  };
  
  const summaryFile = path.join(outputDir, 'summary.json');
  yield* Effect.tryPromise(() => 
    fs.writeFile(summaryFile, JSON.stringify(summary, null, 2))
  );
  
  // Final report
  yield* Console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  yield* Console.log(`📊 Final Results:`);
  yield* Console.log(`   Total tasks: ${taskIds.length}`);
  yield* Console.log(`   Succeeded: ${succeeded}`);
  yield* Console.log(`   Failed: ${failed}`);
  yield* Console.log(`   Success rate: ${summary.success_rate}`);
  yield* Console.log(`\n📁 Results saved to: ${outputDir}`);
  
  return summary;
});

// Run with patch generation layer only
Effect.runPromise(
  program.pipe(
    Effect.provide(PatchGenerationCliLayer)
  )
)
  .then((summary) => {
    console.log("\n✨ Batch generation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Batch generation failed:", error);
    process.exit(1);
  });