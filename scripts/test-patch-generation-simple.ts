#!/usr/bin/env tsx
/**
 * Simple test of patch generation without full harness
 */

import { Effect, Layer } from "effect";
import { PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { AgentPatchGeneratorService, SWEBenchTaskService } from "../src/services/swe_bench_harness";
import * as fs from "fs/promises";
import * as path from "path";

const taskId = process.argv[2] || "simple-python-fix";

console.log("🧪 Testing patch generation for:", taskId);

const program = Effect.gen(function* () {
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  // Load task
  console.log("\n📋 Loading task...");
  const task = yield* taskService.getTask(taskId);
  console.log("✓ Task loaded:", task.instance_id);
  console.log("  Repo:", task.repo);
  console.log("  Problem:", task.problem_statement.substring(0, 100) + "...");
  
  // Generate patch
  console.log("\n🤖 Generating patch with Claude Code...");
  const startTime = Date.now();
  
  const patch = yield* patchGenerator.generatePatch(
    task,
    "/tmp/dummy-repo", // Dummy path since we're just generating
    "claude_code"
  );
  
  const elapsed = Date.now() - startTime;
  console.log(`✓ Patch generated in ${elapsed}ms`);
  
  // Display patch
  console.log("\n📝 Generated Patch:");
  console.log("─".repeat(60));
  console.log(patch);
  console.log("─".repeat(60));
  
  // Save to file
  const outputFile = `./swebench-results/${taskId}-patch.diff`;
  yield* Effect.tryPromise(() => 
    fs.mkdir(path.dirname(outputFile), { recursive: true })
  );
  yield* Effect.tryPromise(() => 
    fs.writeFile(outputFile, patch)
  );
  console.log(`\n💾 Patch saved to: ${outputFile}`);
  
  return patch;
});

// Run with minimal layer
Effect.runPromise(
  program.pipe(
    Effect.provide(PatchGenerationCliLayer)
  )
)
  .then(() => {
    console.log("\n✅ Success!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });