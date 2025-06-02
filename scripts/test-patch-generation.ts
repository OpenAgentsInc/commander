#!/usr/bin/env tsx
/**
 * Test script to verify AI patch generation works with the new Effect-based infrastructure
 */

import { Effect, pipe } from "effect";
import { AgentPatchGeneratorService } from "@/services/swe_bench_harness/AgentPatchGeneratorService";
import { SWEBenchTaskService } from "@/services/swe_bench_harness/SWEBenchTaskService";
import { PatchGenerationCliLayer } from "@/services/swe_bench_harness/layers/SWEBenchCliLayer";
import type { SWEBenchTask } from "@/services/swe_bench_harness/types";

// Simple test task
const createTestTask = (): SWEBenchTask => ({
  instance_id: "test-simple-python-fix",
  repo: "test/simple-repo",
  problem_statement: `There is a bug in the function calculate_sum in the file math_utils.py.

The function is supposed to calculate the sum of two numbers, but it's currently returning their difference.

Current implementation:
def calculate_sum(a, b):
    return a - b

The function should return a + b instead.`,
  base_commit: "abc123",
  test_patch: "",
  created_at: new Date().toISOString(),
  version: "1.0",
  FAIL_TO_PASS: "",
  PASS_TO_PASS: "",
  environment_image: "python:3.9",
  eval_commands: ["python -m pytest tests/test_math_utils.py::test_calculate_sum"],
  failed_test_identifiers: ["tests/test_math_utils.py::test_calculate_sum"]
});

const main = Effect.gen(function* () {
  console.log("🧪 Testing AI Patch Generation with Effect Infrastructure\n");
  
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  // Create test task
  const testTask = createTestTask();
  console.log("📋 Test Task:", testTask.instance_id);
  console.log("📝 Problem:", testTask.problem_statement.substring(0, 100) + "...\n");
  
  try {
    console.log("🤖 Generating patch with Claude Code...");
    const startTime = Date.now();
    
    const patch = yield* patchGenerator.generatePatch(
      testTask,
      "/tmp/test-repo", // Mock repo path
      "claude_code"
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Patch generated in ${duration}s\n`);
    
    console.log("📄 Generated Patch:");
    console.log("```diff");
    console.log(patch);
    console.log("```\n");
    
    // Verify patch format
    if (patch.includes("diff --git") || patch.includes("---") || patch.includes("+++")) {
      console.log("✅ Patch appears to be in correct diff format");
    } else {
      console.log("⚠️  Patch may not be in standard diff format");
    }
    
    return { success: true, patch };
  } catch (error) {
    console.error("❌ Error generating patch:", error);
    return { success: false, error };
  }
});

// Run the test with better error handling
pipe(
  main,
  Effect.provide(PatchGenerationCliLayer),
  Effect.tapErrorCause(cause => 
    Effect.sync(() => {
      console.error("\n💥 Error Cause Analysis:");
      console.error(cause.toString());
    })
  ),
  Effect.runPromise
).then(result => {
  if (result.success) {
    console.log("\n🎉 Test completed successfully!");
    process.exit(0);
  } else {
    console.error("\n💥 Test failed!");
    process.exit(1);
  }
}).catch(error => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});