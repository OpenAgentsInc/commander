#!/usr/bin/env tsx
/**
 * Test evaluation with a single Astropy instance
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceSimple } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceSimple";
import { NodeFileSystem } from "@effect/platform-node";
import * as fs from "fs/promises";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

const program = Effect.gen(function* () {
  const bridge = yield* SWEBenchPythonBridgeService;
  
  console.log("🧪 Testing Single Astropy Instance Evaluation");
  console.log("===========================================");
  
  // Load predictions
  const allPredictionsPath = "./swebench-results/direct-50-1748985899981/predictions.json";
  const allPredictionsContent = yield* Effect.promise(() => fs.readFile(allPredictionsPath, 'utf-8'));
  const allPredictions: SWEBenchPrediction[] = JSON.parse(allPredictionsContent);
  
  // Take the first astropy instance
  const prediction = allPredictions[0];
  const predictions = [prediction];
  
  console.log(`📋 Testing with single instance: ${prediction.instance_id}`);
  console.log(`   Model: ${prediction.model_name_or_path}`);
  console.log(`   Patch length: ${prediction.model_patch?.length || 0} characters\n`);
  
  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");
  
  // Run evaluation
  console.log("🐳 Starting Docker-based evaluation...\n");
  
  const stream = bridge.runEvaluation(predictions, {
    dataset_name: "princeton-nlp/SWE-bench_Lite",
    max_workers: 1,
    timeout: 600, // 10 minutes for single instance
    run_id: `single-astropy-${Date.now()}`,
    namespace: "none",
    instance_ids: [prediction.instance_id]
  });
  
  // Process results
  const results = yield* stream.pipe(
    Stream.tap(msg => Effect.gen(function* () {
      const timestamp = new Date().toLocaleTimeString();
      switch (msg.type) {
        case "progress":
          console.log(`[${timestamp}] Progress: ${msg.data.percentage?.toFixed(1)}%`);
          break;
          
        case "status":
          console.log(`[${timestamp}] ${msg.data.message}`);
          break;
          
        case "error":
          console.error(`[${timestamp}] ❌ Error: ${msg.data.message}`);
          if (msg.data.traceback) {
            console.error("Traceback:", msg.data.traceback);
          }
          break;
          
        case "warning":
          console.warn(`[${timestamp}] ⚠️  ${msg.data.message}`);
          break;
      }
    })),
    Stream.runCollect,
    Effect.map(Chunk.toArray)
  );
  
  // Check results
  const completeMsg = results.find(m => m.type === "complete");
  if (completeMsg) {
    const summary = completeMsg.data.summary;
    console.log("\n" + "=".repeat(60));
    console.log("✅ EVALUATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`Instance: ${prediction.instance_id}`);
    console.log(`Result: ${summary.resolved ? "PASSED ✅" : "FAILED ❌"}`);
    console.log("=".repeat(60));
    
    if (summary.resolved) {
      console.log("\n🎉 The patch successfully fixed the issue!");
      console.log("\n📊 This validates our evaluation pipeline is working correctly.");
      console.log("We can now proceed with evaluating more instances.");
    }
  } else {
    console.log("\n❌ No completion message received");
  }
});

// Create layer
const layer = SWEBenchPythonBridgeServiceSimple.pipe(
  Layer.provide(NodeFileSystem.layer)
);

// Run the test
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});