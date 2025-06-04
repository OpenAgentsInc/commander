#!/usr/bin/env tsx
/**
 * Minimal evaluation script that bypasses dataset-wide image building
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
  
  console.log("🚀 Running Minimal Docker Evaluation");
  console.log("===================================");
  
  // Load predictions
  const allPredictionsPath = "./swebench-results/direct-50-1748985899981/predictions.json";
  const allPredictionsContent = yield* Effect.promise(() => fs.readFile(allPredictionsPath, 'utf-8'));
  const allPredictions: SWEBenchPrediction[] = JSON.parse(allPredictionsContent);
  
  // Filter to only ARM64-compatible instances
  // These are instances that don't require x86_64 base images
  const arm64CompatibleInstances = [
    "django__django-11099",
    "django__django-11133", 
    "django__django-11179",
    "django__django-11620",
    "django__django-11630",
    "django__django-11848",
    "django__django-11905",
    "django__django-11910",
    "django__django-11964",
    "django__django-11999"
  ];
  
  const predictions = allPredictions.filter(p => 
    arm64CompatibleInstances.includes(p.instance_id)
  ).slice(0, 5); // Take first 5 ARM64-compatible instances
  
  console.log(`📋 Testing with ${predictions.length} ARM64-compatible predictions:`);
  predictions.forEach(p => console.log(`  - ${p.instance_id}`));
  console.log("");
  
  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");
  
  // Run evaluation with minimal dataset
  console.log("🐳 Starting Docker-based evaluation (ARM64 only)...\n");
  
  const stream = bridge.runEvaluation(predictions, {
    dataset_name: "princeton-nlp/SWE-bench_Lite",
    max_workers: 1,
    timeout: 1800,
    run_id: `minimal-${Date.now()}`,
    namespace: "none",
    instance_ids: predictions.map(p => p.instance_id) // Only load these specific instances
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
          console.log(`[Status] ${msg.data.message}`);
          break;
          
        case "error":
          console.error(`❌ Error: ${msg.data.message}`);
          if (msg.data.traceback) {
            console.error("Traceback:", msg.data.traceback);
          }
          break;
          
        case "warning":
          console.warn(`⚠️  Warning: ${msg.data.message}`);
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
    console.log(`Total Instances: ${predictions.length}`);
    console.log(`Successfully Evaluated: ${evaluated}`);
    console.log(`Resolved (Tests Pass): ${resolved}`);
    console.log(`Failed: ${evaluated - resolved}`);
    console.log("=".repeat(60));
    
    if (evaluated > 0) {
      const score = (resolved / evaluated * 100).toFixed(2);
      console.log(`\n✨ SCORE: ${score}% (${resolved}/${evaluated})`);
      
      // Extrapolate to full 50 instances
      const projected50 = Math.round((resolved / evaluated) * 50);
      const projected50Score = (projected50 / 50 * 100).toFixed(2);
      console.log(`\n📊 Projected for 50 instances: ${projected50Score}% (${projected50}/50)`);
      
      // Claude Code v4 models typically score 30-45% on SWE-bench
      console.log(`\n📈 Reference: Claude Code v4 models typically score 30-45% on SWE-bench`);
    }
    
    console.log("=".repeat(60));
    
    // Save results
    const resultsDir = `./swebench-results/minimal-${Date.now()}`;
    yield* Effect.promise(() => fs.mkdir(resultsDir, { recursive: true }));
    yield* Effect.promise(() => 
      fs.writeFile(
        path.join(resultsDir, "results.json"),
        JSON.stringify({
          evaluated: evaluated,
          resolved: resolved,
          score: evaluated > 0 ? (resolved / evaluated * 100).toFixed(2) : "0",
          predictions: predictions.length,
          instances: predictions.map(p => p.instance_id),
          timestamp: new Date().toISOString()
        }, null, 2)
      )
    );
    console.log(`\n💾 Results saved to ${resultsDir}`);
  } else {
    console.log("❌ No completion message received");
  }
});

// Create layer with targeted service
const layer = SWEBenchPythonBridgeServiceSimple.pipe(
  Layer.provide(NodeFileSystem.layer)
);

// Run the evaluation
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});