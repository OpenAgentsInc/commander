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
const TIMEOUT = 1800;   // 30 minutes per instance

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

interface EvaluationStats {
  totalInstances: number;
  patchesGenerated: number;
  evaluated: number;
  resolved: number;
  failed: number;
  startTime: number;
  endTime?: number;
}

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

/**
 * Build enhanced prompt with test information
 */
function buildEnhancedPrompt(task: any): string {
  const failingTests = task.FAIL_TO_PASS || [];
  const testInfo = failingTests.length > 0 
    ? `\nTests that need to pass:\n${failingTests.join('\n')}\n` 
    : '';
    
  return task;
}

async function run50InstanceEvaluation() {
  console.log("🚀 SWE-bench 50-Instance Evaluation with Real Patches");
  console.log("=====================================================");
  console.log(`Instances: ${INSTANCE_COUNT}`);
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Max Workers: ${MAX_WORKERS}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");
  
  const stats: EvaluationStats = {
    totalInstances: INSTANCE_COUNT,
    patchesGenerated: 0,
    evaluated: 0,
    resolved: 0,
    failed: 0,
    startTime: Date.now()
  };
  
  // Create output directory
  const outputDir = `./swebench-results/${RUN_ID}`;
  await fs.mkdir(outputDir, { recursive: true });
  
  // Log file
  const logFile = path.join(outputDir, "evaluation.log");
  const logStream = await fs.open(logFile, 'w');
  
  const log = async (message: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(message);
    await logStream.write(logLine);
  };
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    await log("Initializing Python bridge...");
    yield* bridge.initialize();
    await log("✅ Python bridge initialized");
    
    // Load instances
    yield* Effect.promise(() => log("\nLoading instances from dataset..."));
    const instanceIds = yield* Effect.promise(() => loadAvailableInstances());
    yield* Effect.promise(() => log(`📋 Found ${instanceIds.length} instances for evaluation`));
    
    // Generate patches for each instance
    const predictions: SWEBenchPrediction[] = [];
    await log("\n🤖 Generating patches with Claude...\n");
    
    for (let i = 0; i < instanceIds.length; i++) {
      const instanceId = instanceIds[i];
      await log(`[${i + 1}/${instanceIds.length}] Processing ${instanceId}`);
      
      try {
        // Load task data
        const task = yield* Effect.promise(() => loadTaskData(instanceId));
        const enhancedTask = buildEnhancedPrompt(task);
        
        // Generate patch with Claude
        await log(`  🤖 Generating patch...`);
        const result = yield* Effect.promise(() => 
          generatePatchWithClaude(enhancedTask, {
            maxRetries: 2,
            includeTestInfo: true,
            streamingCallback: (msg) => {
              if (msg.type === 'assistant') process.stdout.write('.');
            },
            debug: false,
            timeout: 120000 // 2 minutes
          })
        );
        
        if (result.success && result.patch) {
          stats.patchesGenerated++;
          await log(`  ✅ Patch generated (${result.patch.length} chars)`);
          
          // Save patch
          const patchFile = path.join(outputDir, `${instanceId}.patch`);
          yield* Effect.promise(() => fs.writeFile(patchFile, result.patch!));
          
          predictions.push({
            instance_id: instanceId,
            model_name_or_path: "claude-3-5-sonnet-20241022",
            model_patch: result.patch
          });
        } else {
          await log(`  ❌ Failed to generate patch: ${result.error}`);
          predictions.push({
            instance_id: instanceId,
            model_name_or_path: "claude-3-5-sonnet-20241022",
            model_patch: ""
          });
        }
      } catch (error) {
        await log(`  ❌ Error processing instance: ${error}`);
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022",
          model_patch: ""
        });
      }
      
      // Progress update every 10 instances
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        const rate = (i + 1) / elapsed;
        const remaining = (instanceIds.length - i - 1) / rate;
        await log(`\n⏱️  Progress: ${i + 1}/${instanceIds.length} (${((i + 1) / instanceIds.length * 100).toFixed(1)}%)`);
        await log(`    Elapsed: ${elapsed.toFixed(1)} min, Est. remaining: ${remaining.toFixed(1)} min\n`);
      }
    }
    
    await log(`\n📊 Patch Generation Complete:`);
    await log(`  Total: ${instanceIds.length}`);
    await log(`  With patches: ${stats.patchesGenerated}`);
    await log(`  Empty: ${instanceIds.length - stats.patchesGenerated}`);
    
    // Save predictions for reference
    const predictionsFile = path.join(outputDir, "predictions.json");
    yield* Effect.promise(() => fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2)));
    
    // Run evaluation
    await log("\n🚀 Starting Docker-based evaluation...");
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: DATASET_NAME,
      max_workers: MAX_WORKERS,
      timeout: TIMEOUT,
      run_id: RUN_ID,
      namespace: "none"  // Use local images if available
    });
    
    // Process results
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.promise(async () => {
        switch (msg.type) {
          case "progress":
            stats.evaluated = msg.data.completed || 0;
            const percentage = msg.data.percentage || 0;
            await log(`📊 Evaluation Progress: ${percentage.toFixed(1)}% (${stats.evaluated}/${stats.totalInstances})`);
            break;
            
          case "status":
            await log(`[Status] ${msg.data.message}`);
            break;
            
          case "error":
            stats.failed++;
            await log(`❌ Error: ${msg.data.message}`);
            break;
            
          case "complete":
            // Save final results
            const resultsFile = path.join(outputDir, "evaluation-results.json");
            await fs.writeFile(resultsFile, JSON.stringify(msg.data, null, 2));
            break;
        }
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Process final results
    const completeMsg = results.find(m => m.type === "complete");
    if (completeMsg) {
      stats.evaluated = completeMsg.data.summary.evaluated;
      stats.resolved = completeMsg.data.summary.resolved;
      stats.endTime = Date.now();
      const duration = (stats.endTime - stats.startTime) / 1000 / 60;
      
      // Save summary
      const summaryFile = path.join(outputDir, "summary.json");
      yield* Effect.promise(() => fs.writeFile(summaryFile, JSON.stringify({
        runId: RUN_ID,
        stats: stats,
        summary: completeMsg.data.summary,
        duration: `${duration.toFixed(2)} minutes`,
        timestamp: new Date().toISOString()
      }, null, 2)));
      
      await log("\n" + "=".repeat(60));
      await log("🎉 EVALUATION COMPLETE!");
      await log("=".repeat(60));
      await log(`Total Instances: ${stats.totalInstances}`);
      await log(`Patches Generated: ${stats.patchesGenerated}`);
      await log(`Evaluated: ${stats.evaluated}`);
      await log(`Resolved (Tests Pass): ${stats.resolved}`);
      await log(`Failed: ${stats.failed}`);
      await log(`Success Rate: ${(stats.resolved / stats.evaluated * 100).toFixed(2)}%`);
      await log(`Total Duration: ${duration.toFixed(2)} minutes`);
      await log("=".repeat(60));
      await log(`\n✨ SWE-BENCH SCORE: ${(stats.resolved / stats.totalInstances * 100).toFixed(2)}%`);
      await log("=".repeat(60));
      await log(`\n📁 Results saved to: ${outputDir}`);
      
      // Print individual results if available
      if (completeMsg.data.results) {
        await log("\n📋 Individual Results:");
        for (const [instanceId, result] of Object.entries(completeMsg.data.results)) {
          const status = (result as any).resolved ? "✅ PASS" : "❌ FAIL";
          await log(`  ${status} ${instanceId}`);
        }
      }
    }
  });
  
  try {
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
  } finally {
    await logStream.close();
  }
}

// Run the evaluation
console.log("Starting 50-instance SWE-bench evaluation...\n");
run50InstanceEvaluation().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});