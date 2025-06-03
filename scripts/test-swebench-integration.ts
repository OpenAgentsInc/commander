/**
 * Test full SWE-bench integration with Claude Code
 */

import { Effect, Stream, Chunk } from "effect";
import { SWEBenchHarnessService } from "../src/services/swe_bench_harness";
import { SWEBenchPythonBridgeCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchPythonBridgeCliLayer";

// Enable official SWE-bench
process.env.USE_OFFICIAL_SWEBENCH = "true";
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

async function testIntegration() {
  console.log("🧪 Testing full SWE-bench integration...\n");
  
  // First, let's test if we can even create the layer
  try {
    console.log("Creating layer...");
    const layer = SWEBenchPythonBridgeCliLayer;
    console.log("✅ Layer created successfully");
    
    // Try a minimal test
    const testProgram = Effect.gen(function* () {
      console.log("Inside Effect...");
      return "test";
    });
    
    const result = await Effect.runPromise(
      testProgram.pipe(Effect.provide(layer))
    );
    console.log("Minimal test result:", result);
    
  } catch (error) {
    console.error("Failed to create layer:", error);
    return;
  }
  
  const program = Effect.gen(function* () {
    const harness = yield* SWEBenchHarnessService;
    
    // Test with a simple instance from SWE-bench Lite
    console.log("Running evaluation for django__django-11099...");
    
    const stream = harness.runEvaluation(
      ["django__django-11099"],
      {
        datasetName: "princeton-nlp/SWE-bench_Lite",
        maxWorkers: 1,
        timeout: 300,
        namespace: "none"  // Use existing local images
      }
    );
    
    // Collect all updates
    const updates: any[] = [];
    yield* stream.pipe(
      Stream.tap(update => Effect.sync(() => {
        updates.push(update);
        console.log(`[${update.type}]`, 
          update.type === "instance_complete" ? {
            instance_id: update.instance_id,
            resolved: update.resolved,
            duration: update.duration
          } : update.type === "complete" ? {
            total: update.summary.total,
            resolved: update.summary.resolved,
            percentage: update.summary.percentage
          } : update
        );
      })),
      Stream.runDrain
    );
    
    // Find completion
    const completeUpdate = updates.find(u => u.type === "complete");
    if (completeUpdate) {
      console.log("\n✅ Evaluation complete!");
      console.log("Summary:", completeUpdate.summary);
    }
  });
  
  // Use the Python bridge specialized layer
  const layer = SWEBenchPythonBridgeCliLayer;
  
  await Effect.runPromise(
    program.pipe(Effect.provide(layer))
  );
}

// Run the test
testIntegration().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});