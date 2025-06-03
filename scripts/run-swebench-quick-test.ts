#!/usr/bin/env tsx
/**
 * Quick test with first 10 SWE-bench Lite instances
 * This is a faster way to verify the system works before full run
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import * as fs from "fs/promises";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

// Test instances from SWE-bench Lite - 20 instances with single worker
const TEST_INSTANCES = [
  // Django instances
  "django__django-11001",
  "django__django-11019", 
  "django__django-11039",
  "django__django-11049",
  "django__django-11099",
  "django__django-11133",
  "django__django-11179",
  "django__django-11283",
  "django__django-11422",
  "django__django-11583",
  // Matplotlib instances
  "matplotlib__matplotlib-18869",
  "matplotlib__matplotlib-19743",
  "matplotlib__matplotlib-20676",
  "matplotlib__matplotlib-20859",
  "matplotlib__matplotlib-21042",
  // Sympy instances  
  "sympy__sympy-11870",
  "sympy__sympy-12236",
  "sympy__sympy-12419",
  "sympy__sympy-12454",
  "sympy__sympy-12481"
];

async function runQuickTest() {
  console.log("🧪 SWE-bench Lite Quick Test (SAFE MODE)");
  console.log("===========================================");
  console.log(`Instances: ${TEST_INSTANCES.length}`);
  console.log(`Max Workers: 1`);  // SINGLE WORKER
  console.log("");
  
  const startTime = Date.now();
  let evaluated = 0;
  let resolved = 0;
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Create predictions with empty patches (testing infrastructure)
    const predictions: SWEBenchPrediction[] = TEST_INSTANCES.map(id => ({
      instance_id: id,
      model_name_or_path: "infrastructure-test",
      model_patch: ""  // Empty patch to test evaluation flow
    }));
    
    console.log(`📋 Testing with ${predictions.length} instances:\n`);
    predictions.forEach(p => console.log(`  - ${p.instance_id}`));
    console.log("");
    
    // Run evaluation
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: "princeton-nlp/SWE-bench_Lite",
      max_workers: 1,  // SINGLE WORKER to avoid memory issues
      timeout: 600,  // 10 minutes per instance
      instance_ids: TEST_INSTANCES,
      namespace: "none"
    });
    
    // Process results
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        switch (msg.type) {
          case "progress":
            const progress = msg.data.percentage || 0;
            const completed = msg.data.completed || 0;
            console.log(`📊 Progress: ${progress.toFixed(1)}% (${completed}/${TEST_INSTANCES.length})`);
            evaluated = completed;
            break;
            
          case "status":
            if (!msg.data.message?.includes("Configuration received")) {
              console.log(`[Status] ${msg.data.message}`);
            }
            break;
            
          case "error":
            console.error(`❌ Error: ${msg.data.message}`);
            break;
        }
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Final results
    const completeMsg = results.find(m => m.type === "complete");
    if (completeMsg) {
      resolved = completeMsg.data.summary.resolved || 0;
      const duration = (Date.now() - startTime) / 1000 / 60;
      
      // Save results
      const resultsDir = "./swebench-results";
      yield* Effect.promise(() => fs.mkdir(resultsDir, { recursive: true }));
      const resultsFile = `${resultsDir}/quick-test-${Date.now()}.json`;
      yield* Effect.promise(() => fs.writeFile(resultsFile, JSON.stringify(completeMsg.data, null, 2)));
      
      console.log("\n" + "=".repeat(60));
      console.log("📊 QUICK TEST SUMMARY");
      console.log("=".repeat(60));
      console.log(`Evaluated: ${evaluated}/${TEST_INSTANCES.length}`);
      console.log(`Resolved: ${resolved}`);
      console.log(`Success Rate: ${(resolved / evaluated * 100).toFixed(2)}%`);
      console.log(`Duration: ${duration.toFixed(2)} minutes`);
      console.log(`Results: ${resultsFile}`);
      console.log("=".repeat(60));
      
      // Show individual results
      if (completeMsg.data.results) {
        console.log("\n📋 Individual Results:");
        for (const [id, result] of Object.entries(completeMsg.data.results)) {
          const r = result as any;
          const status = r[id]?.resolved ? "✅" : "❌";
          console.log(`${status} ${id}`);
        }
      }
    }
  });
  
  // Create layer
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
runQuickTest().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});