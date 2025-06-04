#!/usr/bin/env tsx
/**
 * Test evaluation with a single Django instance (ARM64 compatible)
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceTargeted } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceTargeted";
import { NodeFileSystem } from "@effect/platform-node";
import * as fs from "fs/promises";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

const program = Effect.gen(function* () {
  const bridge = yield* SWEBenchPythonBridgeService;
  
  console.log("🧪 Testing Single Django Instance Evaluation");
  console.log("==========================================");
  
  // Load just one Django prediction
  const allPredictionsPath = "./swebench-results/direct-50-1748985899981/predictions.json";
  const allPredictionsContent = yield* Effect.promise(() => fs.readFile(allPredictionsPath, 'utf-8'));
  const allPredictions: SWEBenchPrediction[] = JSON.parse(allPredictionsContent);
  
  // Find django__django-11099 which should be ARM64 compatible
  const djangoPrediction = allPredictions.find(p => p.instance_id === "django__django-11099");
  if (!djangoPrediction) {
    throw new Error("Could not find django__django-11099 in predictions");
  }
  
  const predictions = [djangoPrediction];
  
  console.log(`📋 Testing with single instance: ${djangoPrediction.instance_id}`);
  console.log(`   Model: ${djangoPrediction.model_name_or_path}`);
  console.log(`   Patch length: ${djangoPrediction.model_patch?.length || 0} characters\n`);
  
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
    run_id: `single-django-${Date.now()}`,
    namespace: "none",
    instance_ids: [djangoPrediction.instance_id]
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
    console.log(`Instance: ${djangoPrediction.instance_id}`);
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
const layer = SWEBenchPythonBridgeServiceTargeted.pipe(
  Layer.provide(NodeFileSystem.layer)
);

// Run the test
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});