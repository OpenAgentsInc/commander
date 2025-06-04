#!/usr/bin/env tsx
/**
 * Run SWE-bench evaluation using existing patches
 * This bypasses patch generation and goes straight to Docker evaluation
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceSimple } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceSimple";
import { NodeFileSystem } from "@effect/platform-node";
import * as fs from "fs/promises";
import * as path from "path";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

// Use ARM64 architecture
process.env.DOCKER_DEFAULT_PLATFORM = "linux/arm64";

const program = Effect.gen(function* () {
  const bridge = yield* SWEBenchPythonBridgeService;
  
  console.log("🚀 SWE-bench Evaluation Using Existing Patches");
  console.log("=============================================");
  
  // Load existing predictions
  const predictionsPath = "./swebench-results/direct-50-1748985899981/predictions.json";
  const predictionsContent = yield* Effect.promise(() => fs.readFile(predictionsPath, 'utf-8'));
  const predictions: SWEBenchPrediction[] = JSON.parse(predictionsContent);
  
  console.log(`📋 Loaded ${predictions.length} predictions`);
  console.log("");
  
  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");
  
  // Run evaluation with ARM64 architecture
  console.log("🐳 Starting Docker-based evaluation (ARM64)...");
  console.log("   This will build/use ARM64 Docker images\n");
  
  const stream = bridge.runEvaluation(predictions, {
    dataset_name: "princeton-nlp/SWE-bench_Lite",
    max_workers: 4,
    timeout: 1800,
    run_id: `arm64-eval-${Date.now()}`,
    namespace: "none"  // Build local images
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
    
    const score = (resolved / predictions.length * 100).toFixed(2);
    
    // Save results
    const outputDir = "./swebench-results/direct-50-1748985899981";
    yield* Effect.promise(() => fs.writeFile(
      path.join(outputDir, "evaluation-results.json"),
      JSON.stringify(completeMsg.data, null, 2)
    ));
    
    yield* Effect.promise(() => fs.writeFile(
      path.join(outputDir, "final-score.json"),
      JSON.stringify({
        total_instances: predictions.length,
        evaluated: evaluated,
        resolved: resolved,
        failed: evaluated - resolved,
        swe_bench_score: score + "%",
        timestamp: new Date().toISOString()
      }, null, 2)
    ));
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 EVALUATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`Total Instances: ${predictions.length}`);
    console.log(`Evaluated: ${evaluated}`);
    console.log(`Resolved (Tests Pass): ${resolved}`);
    console.log(`Failed: ${evaluated - resolved}`);
    console.log("=".repeat(60));
    console.log(`\n✨ SWE-BENCH SCORE: ${score}%`);
    console.log("=".repeat(60));
    console.log(`\n📁 Results saved to: ${outputDir}`);
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