#!/usr/bin/env tsx
/**
 * Run FULL SWE-bench Lite evaluation (300 instances)
 * This will take several hours to complete
 */

import { Effect, Stream, Chunk, Layer } from "effect";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import * as path from "path";
import * as fs from "fs/promises";

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

// Configuration for full run
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";  // 300 instances
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || "4");  // Parallel execution
const TIMEOUT = 1800;  // 30 minutes per instance
const RUN_ID = `full-lite-${Date.now()}`;

interface EvaluationStats {
  totalInstances: number;
  evaluated: number;
  resolved: number;
  failed: number;
  startTime: number;
  currentInstance?: string;
  progressPercentage: number;
}

async function generateSimplePatch(instanceId: string): Promise<string> {
  // For this full run, we'll use empty patches to test the infrastructure
  // In a real run, this would use Claude Code or another patch generator
  return "";
}

async function runFullEvaluation() {
  console.log("🚀 SWE-bench Lite FULL Evaluation");
  console.log("=====================================");
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Max Workers: ${MAX_WORKERS}`);
  console.log(`Timeout: ${TIMEOUT}s per instance`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");
  console.log("⚠️  This will evaluate ALL 300 instances and may take several hours!");
  console.log("");
  
  const stats: EvaluationStats = {
    totalInstances: 300,
    evaluated: 0,
    resolved: 0,
    failed: 0,
    startTime: Date.now(),
    progressPercentage: 0
  };
  
  // Create results directory
  const resultsDir = `./swebench-results/${RUN_ID}`;
  await fs.mkdir(resultsDir, { recursive: true });
  
  // Log file for progress
  const logFile = path.join(resultsDir, "evaluation.log");
  const logStream = await fs.open(logFile, 'w');
  
  const log = async (message: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(message);
    await logStream.write(logLine);
  };
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize the bridge
    await log("Initializing Python bridge...");
    yield* bridge.initialize();
    await log("✅ Python bridge initialized");
    
    // Generate predictions for ALL instances
    // We'll use empty patches for this infrastructure test
    const predictions: SWEBenchPrediction[] = [];
    
    // In a real run, we would load the actual instance list from the dataset
    // For now, we'll let SWE-bench handle that by not specifying instance_ids
    await log("Preparing to evaluate all SWE-bench Lite instances...");
    
    // Run evaluation on the entire dataset
    const stream = bridge.runEvaluation([], {  // Empty predictions = evaluate all
      dataset_name: DATASET_NAME,
      max_workers: MAX_WORKERS,
      timeout: TIMEOUT,
      namespace: "none",  // Use local images if available
      run_id: RUN_ID
    });
    
    // Process results with detailed logging
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.promise(async () => {
        switch (msg.type) {
          case "progress":
            stats.evaluated = msg.data.completed || 0;
            stats.progressPercentage = msg.data.percentage || 0;
            await log(`📊 Progress: ${stats.progressPercentage.toFixed(1)}% (${stats.evaluated}/${stats.totalInstances})`);
            
            // Save intermediate progress
            const progressFile = path.join(resultsDir, "progress.json");
            await fs.writeFile(progressFile, JSON.stringify({
              ...stats,
              lastUpdate: new Date().toISOString()
            }, null, 2));
            break;
            
          case "status":
            await log(`[Status] ${msg.data.message}`);
            if (msg.data.predictions) {
              stats.totalInstances = msg.data.predictions.length;
            }
            break;
            
          case "error":
            stats.failed++;
            await log(`❌ Error: ${msg.data.message}`);
            break;
            
          case "complete":
            // Save final results
            const resultsFile = path.join(resultsDir, "final-results.json");
            await fs.writeFile(resultsFile, JSON.stringify(msg.data, null, 2));
            break;
        }
      })),
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    // Find completion
    const completeMsg = results.find(m => m.type === "complete");
    if (completeMsg) {
      stats.evaluated = completeMsg.data.summary.evaluated;
      stats.resolved = completeMsg.data.summary.resolved;
      const duration = (Date.now() - stats.startTime) / 1000 / 60;
      
      await log("\n" + "=".repeat(60));
      await log("🎉 FULL EVALUATION COMPLETE!");
      await log("=".repeat(60));
      await log(`Total Instances: ${stats.totalInstances}`);
      await log(`Evaluated: ${stats.evaluated}`);
      await log(`Resolved: ${stats.resolved}`);
      await log(`Failed: ${stats.failed}`);
      await log(`Success Rate: ${(stats.resolved / stats.evaluated * 100).toFixed(2)}%`);
      await log(`Total Duration: ${duration.toFixed(2)} minutes`);
      await log("=".repeat(60));
      await log(`\n✨ PERCENTAGE COMPLETE: ${(stats.resolved / stats.totalInstances * 100).toFixed(2)}%`);
      await log("=".repeat(60));
      await log(`\n📁 Results saved to: ${resultsDir}`);
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

// Run the full evaluation
console.log("Starting full SWE-bench Lite evaluation...\n");
runFullEvaluation().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});