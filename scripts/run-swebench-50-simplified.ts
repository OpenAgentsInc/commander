#!/usr/bin/env tsx
/**
 * Run SWE-bench evaluation on 50 instances with real patch generation
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import { generatePatchWithClaude } from "./utils/claude-patch-generator";
import * as path from "path";
import * as fs from "fs/promises";

// Configuration
const INSTANCE_COUNT = 50;
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";
const RUN_ID = `real-50-${Date.now()}`;
const MAX_WORKERS = 4;  // Parallel Docker execution

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

/**
 * Load all available instances from the dataset directory
 */
async function loadAvailableInstances(): Promise<string[]> {
  const dataDir = path.join(process.cwd(), "assets/swe_bench_data");
  const files = await fs.readdir(dataDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .slice(0, INSTANCE_COUNT);  // Take first 50
}

/**
 * Load task data from JSON file
 */
async function loadTaskData(instanceId: string): Promise<any> {
  const taskFile = path.join(process.cwd(), "assets/swe_bench_data", `${instanceId}.json`);
  const content = await fs.readFile(taskFile, 'utf-8');
  const data = JSON.parse(content);
  
  // Parse FAIL_TO_PASS and PASS_TO_PASS if they're strings
  if (typeof data.FAIL_TO_PASS === 'string') {
    data.FAIL_TO_PASS = JSON.parse(data.FAIL_TO_PASS);
  }
  if (typeof data.PASS_TO_PASS === 'string') {
    data.PASS_TO_PASS = JSON.parse(data.PASS_TO_PASS);
  }
  
  return data;
}

async function run50InstanceEvaluation() {
  console.log("🚀 SWE-bench 50-Instance Evaluation with Real Patches");
  console.log("=====================================================");
  console.log(`Instances: ${INSTANCE_COUNT}`);
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Max Workers: ${MAX_WORKERS}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");
  
  const startTime = Date.now();
  
  // Create output directory
  const outputDir = `./swebench-results/${RUN_ID}`;
  await fs.mkdir(outputDir, { recursive: true });
  
  // Load instances
  console.log("Loading instances from dataset...");
  const instanceIds = await loadAvailableInstances();
  console.log(`📋 Found ${instanceIds.length} instances for evaluation\n`);
  
  // Generate patches for each instance
  const predictions: SWEBenchPrediction[] = [];
  console.log("🤖 Generating patches with Claude...\n");
  
  let patchesGenerated = 0;
  
  for (let i = 0; i < instanceIds.length; i++) {
    const instanceId = instanceIds[i];
    console.log(`[${i + 1}/${instanceIds.length}] Processing ${instanceId}`);
    
    try {
      // Load task data
      const task = await loadTaskData(instanceId);
      console.log(`  Repo: ${task.repo}`);
      console.log(`  Problem: ${task.problem_statement.substring(0, 100)}...`);
      
      // Generate patch with Claude
      console.log(`  🤖 Generating patch...`);
      const result = await generatePatchWithClaude(task, {
        maxRetries: 2,
        includeTestInfo: true,
        streamingCallback: (msg) => {
          if (msg.type === 'assistant') process.stdout.write('.');
        },
        debug: false,
        timeout: 120000 // 2 minutes
      });
      
      console.log(); // New line after dots
      
      if (result.success && result.patch) {
        patchesGenerated++;
        console.log(`  ✅ Patch generated (${result.patch.length} chars)`);
        
        // Save patch
        const patchFile = path.join(outputDir, `${instanceId}.patch`);
        await fs.writeFile(patchFile, result.patch);
        
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022",
          model_patch: result.patch
        });
      } else {
        console.log(`  ❌ Failed to generate patch: ${result.error}`);
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022",
          model_patch: ""
        });
      }
    } catch (error) {
      console.log(`  ❌ Error processing instance: ${error}`);
      predictions.push({
        instance_id: instanceId,
        model_name_or_path: "claude-3-5-sonnet-20241022",
        model_patch: ""
      });
    }
    
    // Progress update every 10 instances
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const rate = (i + 1) / elapsed;
      const remaining = (instanceIds.length - i - 1) / rate;
      console.log(`\n⏱️  Progress: ${i + 1}/${instanceIds.length} (${((i + 1) / instanceIds.length * 100).toFixed(1)}%)`);
      console.log(`    Elapsed: ${elapsed.toFixed(1)} min, Est. remaining: ${remaining.toFixed(1)} min\n`);
    }
  }
  
  console.log(`\n📊 Patch Generation Complete:`);
  console.log(`  Total: ${instanceIds.length}`);
  console.log(`  With patches: ${patchesGenerated}`);
  console.log(`  Empty: ${instanceIds.length - patchesGenerated}`);
  
  // Save predictions for reference
  const predictionsFile = path.join(outputDir, "predictions.json");
  await fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2));
  
  // Now run the evaluation
  console.log("\n🚀 Starting Docker-based evaluation...");
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized");
    
    // Run evaluation
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: DATASET_NAME,
      max_workers: MAX_WORKERS,
      timeout: 1800,  // 30 minutes per instance
      run_id: RUN_ID,
      namespace: "none"  // Use local images if available
    });
    
    let evaluated = 0;
    let resolved = 0;
    
    // Process results
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        switch (msg.type) {
          case "progress":
            evaluated = msg.data.completed || 0;
            const percentage = msg.data.percentage || 0;
            console.log(`📊 Evaluation Progress: ${percentage.toFixed(1)}% (${evaluated}/${INSTANCE_COUNT})`);
            break;
            
          case "status":
            console.log(`[Status] ${msg.data.message}`);
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
      evaluated = completeMsg.data.summary.evaluated;
      resolved = completeMsg.data.summary.resolved;
      const duration = (Date.now() - startTime) / 1000 / 60;
      
      // Save final results
      const resultsFile = path.join(outputDir, "evaluation-results.json");
      yield* Effect.promise(() => fs.writeFile(resultsFile, JSON.stringify(completeMsg.data, null, 2)));
      
      // Save summary
      const summaryFile = path.join(outputDir, "summary.json");
      yield* Effect.promise(() => fs.writeFile(summaryFile, JSON.stringify({
        runId: RUN_ID,
        stats: {
          totalInstances: INSTANCE_COUNT,
          patchesGenerated,
          evaluated,
          resolved,
          successRate: `${(resolved / evaluated * 100).toFixed(2)}%`
        },
        duration: `${duration.toFixed(2)} minutes`,
        timestamp: new Date().toISOString()
      }, null, 2)));
      
      console.log("\n" + "=".repeat(60));
      console.log("🎉 EVALUATION COMPLETE!");
      console.log("=".repeat(60));
      console.log(`Total Instances: ${INSTANCE_COUNT}`);
      console.log(`Patches Generated: ${patchesGenerated}`);
      console.log(`Evaluated: ${evaluated}`);
      console.log(`Resolved (Tests Pass): ${resolved}`);
      console.log(`Success Rate: ${(resolved / evaluated * 100).toFixed(2)}%`);
      console.log(`Total Duration: ${duration.toFixed(2)} minutes`);
      console.log("=".repeat(60));
      console.log(`\n✨ SWE-BENCH SCORE: ${(resolved / INSTANCE_COUNT * 100).toFixed(2)}%`);
      console.log("=".repeat(60));
      console.log(`\n📁 Results saved to: ${outputDir}`);
      
      // Print individual results if available
      if (completeMsg.data.results) {
        console.log("\n📋 Individual Results (first 10):");
        const entries = Object.entries(completeMsg.data.results).slice(0, 10);
        for (const [instanceId, result] of entries) {
          const status = (result as any).resolved ? "✅ PASS" : "❌ FAIL";
          console.log(`  ${status} ${instanceId}`);
        }
        if (Object.keys(completeMsg.data.results).length > 10) {
          console.log(`  ... and ${Object.keys(completeMsg.data.results).length - 10} more`);
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

// Run the evaluation
console.log("Starting 50-instance SWE-bench evaluation...\n");
run50InstanceEvaluation().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});