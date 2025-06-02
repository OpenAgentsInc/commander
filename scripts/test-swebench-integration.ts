/**
 * Test script for SWE-bench Python bridge integration
 */

import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness";
import { CLISWEBenchHarnessLayer } from "../src/services/swe_bench_harness/cli-layer-composition";

// Set feature flag to use official SWE-bench
process.env.USE_OFFICIAL_SWEBENCH = "true";

// Also set to use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

async function testIntegration() {
  console.log("🧪 Testing SWE-bench Python bridge integration...\n");
  
  const program = Effect.gen(function* () {
    const harness = yield* SWEBenchHarnessService;
    
    // Test 1: Single task with gold patch
    console.log("Test 1: Gold patch evaluation for sympy__sympy-20590");
    console.log("=" + "=".repeat(50));
    
    try {
      const result1 = yield* harness.evaluateTask("sympy__sympy-20590", { type: "gold" });
      console.log("✅ Result:", {
        instance_id: result1.instance_id,
        resolved: result1.report.resolved,
        duration_ms: result1.duration_ms,
        patch_source: result1.patch_source_type
      });
    } catch (error) {
      console.error("❌ Test 1 failed:", error);
    }
    
    console.log("\n");
    
    // Test 2: Empty patch (should fail)
    console.log("Test 2: Empty patch evaluation for django__django-11099");
    console.log("=" + "=".repeat(50));
    
    try {
      const result2 = yield* harness.evaluateTask("django__django-11099", { type: "empty" });
      console.log("✅ Result:", {
        instance_id: result2.instance_id,
        resolved: result2.report.resolved,
        duration_ms: result2.duration_ms,
        patch_source: result2.patch_source_type
      });
    } catch (error) {
      console.error("❌ Test 2 failed:", error);
    }
    
    console.log("\n");
    
    // Test 3: Generate patch with Claude
    if (process.env.CLAUDE_CODE_PROVIDER_ENABLED === "true") {
      console.log("Test 3: Claude-generated patch for simple task");
      console.log("=" + "=".repeat(50));
      
      try {
        const result3 = yield* harness.evaluateTask("django__django-11099", {
          type: "agent_generated",
          providerKey: "claude_code"
        });
        console.log("✅ Result:", {
          instance_id: result3.instance_id,
          resolved: result3.report.resolved,
          duration_ms: result3.duration_ms,
          patch_source: result3.patch_source_type,
          patch_length: result3.generated_patch_content?.length
        });
      } catch (error) {
        console.error("❌ Test 3 failed:", error);
      }
    } else {
      console.log("⚠️  Skipping Test 3: Claude Code provider not enabled");
      console.log("   Set CLAUDE_CODE_PROVIDER_ENABLED=true to test AI patch generation");
    }
    
    console.log("\n✨ Integration tests complete!");
  });
  
  await Effect.runPromise(
    program.pipe(
      Effect.provide(CLISWEBenchHarnessLayer)
    )
  );
}

// Run the tests
testIntegration().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});