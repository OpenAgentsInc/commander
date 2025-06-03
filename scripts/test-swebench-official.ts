/**
 * Test official SWE-bench integration via Python bridge directly
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

async function testOfficialSWEBench() {
  console.log("🧪 Testing official SWE-bench with Python bridge...\n");
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize the bridge
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Test with a simple instance from SWE-bench
    console.log("Running evaluation for django__django-11099...");
    
    // Use a simple test patch
    const testPatch = `diff --git a/django/contrib/auth/forms.py b/django/contrib/auth/forms.py
index abc123..def456 100644
--- a/django/contrib/auth/forms.py
+++ b/django/contrib/auth/forms.py
@@ -1,5 +1,6 @@
 from __future__ import unicode_literals
 
+# Test patch for SWE-bench evaluation
 from django import forms
 from django.contrib.auth import authenticate
`;
    
    const predictions = [{
      instance_id: "django__django-11099",
      model_name_or_path: "commander-test",
      model_patch: testPatch
    }];
    
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: "princeton-nlp/SWE-bench_Lite",
      max_workers: 1,
      timeout: 600,
      instance_ids: ["django__django-11099"],
      namespace: "none"  // Use existing local images
    });
    
    // Collect progress
    let lastProgress = 0;
    const messages = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        if (msg.type === "progress") {
          const progress = msg.data.percentage;
          if (progress > lastProgress) {
            lastProgress = progress;
            console.log(`Progress: ${progress}%`);
          }
        } else if (msg.type === "status") {
          console.log(`[${msg.type}]`, msg.data.message);
        } else if (msg.type === "error") {
          console.error(`[ERROR]`, msg.data);
        }
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Find completion
    const completeMsg = messages.find(m => m.type === "complete");
    if (completeMsg) {
      console.log("\n✅ Evaluation complete!");
      console.log("Results:", JSON.stringify(completeMsg.data, null, 2));
      
      // Calculate percentage
      const summary = completeMsg.data.summary;
      const percentage = (summary.resolved / summary.total_instances) * 100;
      console.log(`\n📊 PERCENTAGE COMPLETE: ${percentage.toFixed(2)}% (${summary.resolved}/${summary.total_instances} resolved)`);
    } else {
      console.log("\n❌ Evaluation did not complete");
    }
  });
  
  // Create minimal layer for Python bridge
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
testOfficialSWEBench().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});