#!/usr/bin/env tsx
/**
 * Run evaluation only using existing patches from the 50-instance run
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceSimple } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceSimple";
import { NodeFileSystem } from "@effect/platform-node";
import * as fs from "fs/promises";
import * as path from "path";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

const program = Effect.gen(function* () {
  const bridge = yield* SWEBenchPythonBridgeService;
  
  console.log("🚀 Running Docker Evaluation Only");
  console.log("================================");
  
  // Load the first 2 predictions from our successful 50-instance run
  const allPredictionsPath = "./swebench-results/direct-50-1748985899981/predictions.json";
  const allPredictionsContent = yield* Effect.promise(() => fs.readFile(allPredictionsPath, 'utf-8'));
  const allPredictions: SWEBenchPrediction[] = JSON.parse(allPredictionsContent);
  
  // Take just 2 for testing
  const predictions = allPredictions.slice(0, 2);
  
  console.log(`📋 Testing with ${predictions.length} predictions:`);
  predictions.forEach(p => console.log(`  - ${p.instance_id}`));
  console.log("");
  
  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");
  
  // Run evaluation
  console.log("🐳 Starting Docker-based evaluation (ARM64 patched)...\n");
  
  const stream = bridge.runEvaluation(predictions, {
    dataset_name: "princeton-nlp/SWE-bench_Lite",
    max_workers: 1,
    timeout: 1800,
    run_id: `eval-only-${Date.now()}`,
    namespace: "none"
  });
  
  let evaluated = 0;
  let resolved = 0;
  
  // Process results
  const results = yield* stream.pipe(
    Stream.tap(msg => Effect.gen(function* () {
      switch (msg.type) {
        case "progress":
          evaluated = msg.data.completed || 0;
          const percentage = msg.data.percentage || 0;
          console.log(`📊 Progress: ${percentage.toFixed(1)}% (${evaluated}/${predictions.length})`);
          break;
          
        case "status":
          console.log(`[Docker] ${msg.data.message}`);
          break;
          
        case "error":
          console.error(`❌ Error: ${msg.data.message}`);
          break;
      }
    })),
    Stream.runCollect,
    Effect.map(Chunk.toArray)
  );
  
  // Process final results
  const completeMsg = results.find(m => m.type === "complete");
  if (completeMsg) {
    const summary = completeMsg.data.summary;
    resolved = summary.resolved;
    evaluated = summary.evaluated;
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 EVALUATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`Evaluated: ${evaluated}`);
    console.log(`Resolved (Tests Pass): ${resolved}`);
    console.log(`Failed: ${evaluated - resolved}`);
    console.log("=".repeat(60));
    
    if (evaluated > 0) {
      const score = (resolved / evaluated * 100).toFixed(2);
      console.log(`\n✨ SCORE: ${score}% (${resolved}/${evaluated})`);
      
      // Extrapolate to 50 instances
      const projected50 = Math.round((resolved / evaluated) * 50);
      const projected50Score = (projected50 / 50 * 100).toFixed(2);
      console.log(`\n📊 Projected for 50 instances: ${projected50Score}% (${projected50}/50)`);
    }
    
    console.log("=".repeat(60));
  } else {
    console.log("❌ No completion message received");
  }
});

// Create layer
const layer = SWEBenchPythonBridgeServiceSimple.pipe(
  Layer.provide(NodeFileSystem.layer)
);

// Run the evaluation
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});