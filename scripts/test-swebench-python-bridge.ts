/**
 * Direct test of SWE-bench Python bridge
 */

import { Effect, Stream, Chunk } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { SWEBenchPythonBridgeService } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

async function testPythonBridge() {
  console.log("🧪 Testing Python bridge directly...\n");
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize the bridge
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Test with a simple test patch
    console.log("Running evaluation for sympy__sympy-20590...");
    
    // Provide a minimal test patch - this won't solve the issue but will test the pipeline
    const testPatch = `diff --git a/sympy/simplify/simplify.py b/sympy/simplify/simplify.py
index abc123..def456 100644
--- a/sympy/simplify/simplify.py
+++ b/sympy/simplify/simplify.py
@@ -1,5 +1,6 @@
 from __future__ import print_function, division
 
+# Test patch for SWE-bench evaluation
 from collections import defaultdict
 from functools import reduce
`;
    
    const predictions = [{
      instance_id: "sympy__sympy-20590",
      model_name_or_path: "test-minimal",
      model_patch: testPatch
    }];
    
    const stream = bridge.runEvaluation(predictions, {
      max_workers: 1,
      timeout: 1800,
      instance_ids: ["sympy__sympy-20590"]
    });
    
    // Collect all messages
    const messages = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        console.log(`[${msg.type}]`, msg.data);
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Find completion
    const completeMsg = messages.find(m => m.type === "complete");
    if (completeMsg) {
      console.log("\n✅ Evaluation complete!");
      console.log("Summary:", completeMsg.data.summary);
    } else {
      console.log("\n❌ Evaluation did not complete");
    }
  });
  
  // Create the layer - use a simpler composition
  const telemetryWithConfig = TelemetryServiceLive.pipe(
    Layer.provide(TelemetryServiceCliConfigLayer)
  );
  
  const layer = SWEBenchPythonBridgeServiceLive.pipe(
    Layer.provide(Layer.mergeAll(
      telemetryWithConfig,
      NodeFileSystem.layer
    ))
  );
  
  await Effect.runPromise(
    program.pipe(Effect.provide(layer))
  );
}

// Run the test
testPythonBridge().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});