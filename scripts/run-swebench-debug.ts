#!/usr/bin/env tsx
/**
 * Debug runner for SWE-bench with extensive logging
 * Use this to debug issues with the evaluation pipeline
 */

import { Effect, Console, pipe } from "effect";
import { runWithCLILayer } from "../src/services/swe_bench_harness/cli-layer-composition";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness";
import * as fs from "fs/promises";
import * as path from "path";

// Get task ID from command line
const taskId = process.argv[2] || "simple-python-fix";
const outputDir = process.argv[3] || `./swebench-results/debug-${Date.now()}`;

console.log("🔍 SWE-bench Debug Runner");
console.log(`📋 Task ID: ${taskId}`);
console.log(`📂 Output Directory: ${outputDir}`);
console.log("");

const debugProgram = Effect.gen(function* () {
  const harness = yield* SWEBenchHarnessService;
  
  // Create output directory
  yield* Effect.tryPromise(() => fs.mkdir(outputDir, { recursive: true }));
  
  // Step 1: Load task
  yield* Console.log("Step 1: Loading task...");
  const task = yield* harness.getTask(taskId);
  yield* Console.log(`✓ Task loaded: ${task.repo} - ${task.instance_id}`);
  yield* Console.log(`  Problem: ${task.problem_statement.substring(0, 100)}...`);
  
  // Save task details
  yield* Effect.tryPromise(() => 
    fs.writeFile(
      path.join(outputDir, "task.json"),
      JSON.stringify(task, null, 2)
    )
  );
  
  // Step 2: Generate patch
  yield* Console.log("\nStep 2: Generating patch with Claude...");
  const startTime = Date.now();
  
  const patch = yield* harness.generatePatch(
    task,
    path.join(outputDir, "repo"),
    "claude_code"
  );
  
  const genTime = Date.now() - startTime;
  yield* Console.log(`✓ Patch generated in ${genTime}ms`);
  yield* Console.log(`  Patch length: ${patch.length} characters`);
  
  // Save patch
  yield* Effect.tryPromise(() => 
    fs.writeFile(
      path.join(outputDir, "generated.patch"),
      patch
    )
  );
  
  // Show patch preview
  yield* Console.log("\n📝 Generated Patch Preview:");
  yield* Console.log("─".repeat(60));
  const lines = patch.split('\n');
  const preview = lines.slice(0, 20).join('\n');
  yield* Console.log(preview);
  if (lines.length > 20) {
    yield* Console.log(`... (${lines.length - 20} more lines)`);
  }
  yield* Console.log("─".repeat(60));
  
  // Step 3: Run evaluation (if full harness is available)
  yield* Console.log("\nStep 3: Running evaluation...");
  try {
    const result = yield* harness.runTask(
      task,
      { 
        type: "agent",
        providerKey: "claude_code"
      },
      {
        hostWorkspaceRoot: outputDir,
        maxIterations: 1,
        continueOnError: true
      }
    );
    
    yield* Console.log(`✓ Evaluation complete`);
    yield* Console.log(`  Success: ${result.success}`);
    yield* Console.log(`  Tests passed: ${result.testsPassedAfter}/${result.totalTests}`);
    
    // Save results
    yield* Effect.tryPromise(() => 
      fs.writeFile(
        path.join(outputDir, "results.json"),
        JSON.stringify(result, null, 2)
      )
    );
    
  } catch (error) {
    yield* Console.log(`⚠️  Evaluation not available in current setup`);
    yield* Console.log(`   Would need full Docker integration to run tests`);
  }
  
  yield* Console.log("\n✅ Debug run complete!");
  yield* Console.log(`📂 All artifacts saved to: ${outputDir}`);
  
  return { task, patch, outputDir };
});

// Run the debug program
runWithCLILayer(debugProgram)
  .then(({ outputDir }) => {
    console.log("\n🎉 Success! Check the output directory for details.");
    console.log(`\nNext steps:`);
    console.log(`1. Examine the generated patch: cat ${outputDir}/generated.patch`);
    console.log(`2. Review task details: cat ${outputDir}/task.json`);
    console.log(`3. If evaluation ran, check results: cat ${outputDir}/results.json`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Debug run failed:", error);
    console.error("\nTroubleshooting:");
    console.error("1. Check ANTHROPIC_API_KEY is set");
    console.error("2. Ensure Claude CLI is authenticated: claude auth");
    console.error("3. Check SWE_BENCH_DATASET_PATH environment variable");
    process.exit(1);
  });