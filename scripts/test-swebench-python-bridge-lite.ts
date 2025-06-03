/**
 * Direct test of SWE-bench Python bridge with SWE-bench Lite
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
  console.log("🧪 Testing Python bridge with SWE-bench Lite...\n");
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize the bridge
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Test with a simple test patch on django from SWE-bench Lite
    console.log("Running evaluation for django__django-11099...");
    
    // Provide a minimal test patch
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
      model_name_or_path: "test-minimal",
      model_patch: testPatch
    }];
    
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: "princeton-nlp/SWE-bench_Lite",  // Use Lite dataset
      max_workers: 1,
      timeout: 300,  // Shorter timeout for testing
      instance_ids: ["django__django-11099"],
      namespace: "none"  // Use no namespace to match existing local images
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