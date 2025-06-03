#!/usr/bin/env tsx
/**
 * SWE-bench evaluation with full telemetry integration
 * This script provides complete visibility into the evaluation process
 */

import { Effect, Stream, Chunk, Layer, pipe } from "effect";
import { Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceTelemetryLive } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceTelemetry";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryService, TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import { generatePatchWithClaudeTelemetry } from "./utils/claude-patch-generator-telemetry";
import * as path from "path";
import * as fs from "fs/promises";

// Parse command line arguments
const args = process.argv.slice(2);
const instanceCount = args.includes('--instances') 
  ? parseInt(args[args.indexOf('--instances') + 1]) 
  : 50;
const maxWorkers = args.includes('--workers')
  ? parseInt(args[args.indexOf('--workers') + 1])
  : 4;

// Configuration
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";
const RUN_ID = `telemetry-${instanceCount}-${Date.now()}`;
const TIMEOUT = 1800; // 30 minutes per instance

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

interface EvaluationStats {
  totalInstances: number;
  patchesGenerated: number;
  patchGenerationErrors: number;
  evaluated: number;
  resolved: number;
  failed: number;
  startTime: number;
  endTime?: number;
  instanceDetails: Map<string, InstanceDetails>;
}

interface InstanceDetails {
  instanceId: string;
  repo: string;
  patchGenerated: boolean;
  patchSize?: number;
  patchGenerationTime?: number;
  evaluationStatus?: 'pending' | 'running' | 'completed' | 'failed';
  resolved?: boolean;
  testsRun?: number;
  testsPassed?: number;
  error?: string;
}

/**
 * Load available instances from the dataset directory
 */
async function loadAvailableInstances(count: number): Promise<string[]> {
  const dataDir = path.join(process.cwd(), "assets/swe_bench_data");
  const files = await fs.readdir(dataDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .slice(0, count);
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

const program = Effect.gen(function* () {
  const telemetry = yield* TelemetryService;
  const bridge = yield* SWEBenchPythonBridgeService;
  
  const stats: EvaluationStats = {
    totalInstances: instanceCount,
    patchesGenerated: 0,
    patchGenerationErrors: 0,
    evaluated: 0,
    resolved: 0,
    failed: 0,
    startTime: Date.now(),
    instanceDetails: new Map()
  };

  // Create output directory
  const outputDir = `./swebench-results/${RUN_ID}`;
  yield* Effect.promise(() => fs.mkdir(outputDir, { recursive: true }));

  console.log("🚀 SWE-bench Evaluation with Full Telemetry");
  console.log("==========================================");
  console.log(`Instances: ${instanceCount}`);
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Max Workers: ${maxWorkers}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");

  // Track evaluation start
  yield* telemetry.trackEvent({
    category: "swebench",
    action: "evaluation_start",
    label: RUN_ID,
    context: {
      instanceCount,
      maxWorkers,
      dataset: DATASET_NAME,
      runId: RUN_ID
    },
    level: "info"
  });

  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");

  // Load instances
  console.log("Loading instances from dataset...");
  const instanceIds = yield* Effect.promise(() => loadAvailableInstances(instanceCount));
  console.log(`📋 Loaded ${instanceIds.length} instances for evaluation\n`);

  // Generate patches for each instance
  const predictions: SWEBenchPrediction[] = [];
  console.log("🤖 Generating patches with Claude (with telemetry)...\n");

  for (let i = 0; i < instanceIds.length; i++) {
    const instanceId = instanceIds[i];
    const instanceStartTime = Date.now();
    
    // Initialize instance details
    stats.instanceDetails.set(instanceId, {
      instanceId,
      repo: '',
      patchGenerated: false,
      evaluationStatus: 'pending'
    });

    console.log(`[${i + 1}/${instanceIds.length}] Processing ${instanceId}`);
    
    yield* telemetry.trackEvent({
      category: "swebench",
      action: "instance_start", 
      label: instanceId,
      context: {
        index: i + 1,
        total: instanceIds.length,
        progress: ((i + 1) / instanceIds.length * 100).toFixed(1)
      },
      level: "info"
    });

    try {
      // Load task data
      const task = yield* Effect.promise(() => loadTaskData(instanceId));
      const details = stats.instanceDetails.get(instanceId)!;
      details.repo = task.repo;
      
      console.log(`  Repo: ${task.repo}`);
      console.log(`  Problem: ${task.problem_statement.substring(0, 100)}...`);

      // Generate patch with telemetry
      console.log(`  🤖 Generating patch...`);
      const result = yield* generatePatchWithClaudeTelemetry(task, {
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
        stats.patchesGenerated++;
        details.patchGenerated = true;
        details.patchSize = result.patch.length;
        details.patchGenerationTime = Date.now() - instanceStartTime;
        
        console.log(`  ✅ Patch generated (${result.patch.length} chars) in ${(details.patchGenerationTime / 1000).toFixed(1)}s`);
        
        // Save patch
        const patchFile = path.join(outputDir, `${instanceId}.patch`);
        yield* Effect.promise(() => fs.writeFile(patchFile, result.patch!));
        
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022-telemetry",
          model_patch: result.patch
        });
      } else {
        stats.patchGenerationErrors++;
        details.error = result.error;
        
        console.log(`  ❌ Failed to generate patch: ${result.error}`);
        
        // Still add to predictions with empty patch
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022-telemetry",
          model_patch: ""
        });
      }
    } catch (error) {
      stats.patchGenerationErrors++;
      const details = stats.instanceDetails.get(instanceId)!;
      details.error = String(error);
      
      console.log(`  ❌ Error processing instance: ${error}`);
      
      yield* telemetry.trackEvent({
        category: "swebench",
        action: "instance_error",
        label: instanceId,
        context: {
          error: String(error),
          phase: "patch_generation"
        },
        level: "error"
      });
      
      predictions.push({
        instance_id: instanceId,
        model_name_or_path: "claude-3-5-sonnet-20241022-telemetry",
        model_patch: ""
      });
    }

    // Progress update every 10 instances
    if ((i + 1) % 10 === 0 || i === instanceIds.length - 1) {
      const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
      const rate = (i + 1) / elapsed;
      const remaining = (instanceIds.length - i - 1) / rate;
      
      console.log(`\n⏱️  Progress: ${i + 1}/${instanceIds.length} (${((i + 1) / instanceIds.length * 100).toFixed(1)}%)`);
      console.log(`    Patches: ${stats.patchesGenerated} generated, ${stats.patchGenerationErrors} errors`);
      console.log(`    Elapsed: ${elapsed.toFixed(1)} min, Est. remaining: ${remaining.toFixed(1)} min\n`);
      
      yield* telemetry.trackEvent({
        category: "swebench",
        action: "progress_update",
        label: RUN_ID,
        context: {
          completed: i + 1,
          total: instanceIds.length,
          patchesGenerated: stats.patchesGenerated,
          errors: stats.patchGenerationErrors,
          elapsedMinutes: elapsed,
          remainingMinutes: remaining
        },
        level: "info"
      });
    }
  }

  console.log(`\n📊 Patch Generation Complete:`);
  console.log(`  Total: ${instanceIds.length}`);
  console.log(`  Successful: ${stats.patchesGenerated}`);
  console.log(`  Failed: ${stats.patchGenerationErrors}`);
  console.log(`  Success Rate: ${(stats.patchesGenerated / instanceIds.length * 100).toFixed(1)}%`);

  // Save predictions for reference
  const predictionsFile = path.join(outputDir, "predictions.json");
  yield* Effect.promise(() => fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2)));

  // Save intermediate stats
  const intermediateStatsFile = path.join(outputDir, "patch-generation-stats.json");
  yield* Effect.promise(() => fs.writeFile(intermediateStatsFile, JSON.stringify({
    runId: RUN_ID,
    patchGenerationPhase: {
      total: instanceIds.length,
      successful: stats.patchesGenerated,
      failed: stats.patchGenerationErrors,
      successRate: (stats.patchesGenerated / instanceIds.length * 100).toFixed(1) + '%',
      duration: ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2) + ' minutes'
    },
    instances: Array.from(stats.instanceDetails.values())
  }, null, 2)));

  // Run evaluation with all predictions (not filtered)
  console.log("\n🚀 Starting Docker-based evaluation...");
  console.log(`   Evaluating ALL ${predictions.length} instances\n`);
  
  yield* telemetry.trackEvent({
    category: "swebench",
    action: "docker_evaluation_start",
    label: RUN_ID,
    context: {
      predictions: predictions.length,
      withPatches: stats.patchesGenerated,
      withoutPatches: predictions.length - stats.patchesGenerated
    },
    level: "info"
  });

  const stream = bridge.runEvaluation(predictions, {
    dataset_name: DATASET_NAME,
    max_workers: maxWorkers,
    timeout: TIMEOUT,
    run_id: RUN_ID,
    namespace: "none"  // Use local images if available
  });

  // Process results with detailed telemetry
  const results = yield* stream.pipe(
    Stream.tap(msg => Effect.gen(function* () {
      switch (msg.type) {
        case "progress":
          stats.evaluated = msg.data.completed || 0;
          const percentage = msg.data.percentage || 0;
          console.log(`📊 Docker Evaluation Progress: ${percentage.toFixed(1)}% (${stats.evaluated}/${predictions.length})`);
          
          // Update instance statuses
          if (msg.data.instance_id) {
            const details = stats.instanceDetails.get(msg.data.instance_id);
            if (details) {
              details.evaluationStatus = 'running';
            }
          }
          
          yield* telemetry.trackEvent({
            category: "swebench",
            action: "docker_progress",
            label: RUN_ID,
            value: percentage,
            context: {
              evaluated: stats.evaluated,
              total: predictions.length,
              percentage
            },
            level: "info"
          });
          break;
          
        case "status":
          console.log(`[Docker] ${msg.data.message}`);
          
          // Parse structured status messages
          if (msg.data.message?.includes("Running tests for")) {
            const match = msg.data.message.match(/Running tests for ([^\s]+)/);
            if (match) {
              yield* telemetry.trackEvent({
                category: "swebench",
                action: "test_execution_start",
                label: match[1],
                context: msg.data,
                level: "info"
              });
            }
          }
          break;
          
        case "error":
          stats.failed++;
          console.error(`❌ Docker Error: ${msg.data.message}`);
          
          yield* telemetry.trackEvent({
            category: "swebench",
            action: "docker_error",
            label: msg.data.instance_id || 'unknown',
            context: msg.data,
            level: "error"
          });
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
    
    // Update instance details with results
    if (completeMsg.data.results) {
      for (const [instanceId, result] of Object.entries(completeMsg.data.results)) {
        const details = stats.instanceDetails.get(instanceId);
        if (details) {
          details.evaluationStatus = 'completed';
          details.resolved = (result as any).resolved;
          details.testsRun = (result as any).tests_run;
          details.testsPassed = (result as any).tests_passed;
        }
      }
    }
    
    // Save final results
    const resultsFile = path.join(outputDir, "evaluation-results.json");
    yield* Effect.promise(() => fs.writeFile(resultsFile, JSON.stringify(completeMsg.data, null, 2)));
    
    // Save comprehensive summary
    const summaryFile = path.join(outputDir, "summary.json");
    const summary = {
      runId: RUN_ID,
      configuration: {
        instances: instanceCount,
        dataset: DATASET_NAME,
        maxWorkers,
        timeout: TIMEOUT
      },
      results: {
        totalInstances: stats.totalInstances,
        patchesGenerated: stats.patchesGenerated,
        patchGenerationErrors: stats.patchGenerationErrors,
        evaluated: stats.evaluated,
        resolved: stats.resolved,
        failed: stats.failed,
        successRate: (stats.resolved / stats.evaluated * 100).toFixed(2) + '%',
        swebenchScore: (stats.resolved / stats.totalInstances * 100).toFixed(2) + '%'
      },
      timing: {
        totalDuration: duration.toFixed(2) + ' minutes',
        patchGenerationTime: ((stats.instanceDetails.size > 0 
          ? Array.from(stats.instanceDetails.values())
              .filter(d => d.patchGenerationTime)
              .reduce((sum, d) => sum + d.patchGenerationTime!, 0) / 1000 / 60
          : 0)).toFixed(2) + ' minutes',
        evaluationTime: (duration - ((stats.instanceDetails.size > 0 
          ? Array.from(stats.instanceDetails.values())
              .filter(d => d.patchGenerationTime)
              .reduce((sum, d) => sum + d.patchGenerationTime!, 0) / 1000 / 60
          : 0))).toFixed(2) + ' minutes'
      },
      timestamp: new Date().toISOString(),
      instances: Array.from(stats.instanceDetails.values())
    };
    
    yield* Effect.promise(() => fs.writeFile(summaryFile, JSON.stringify(summary, null, 2)));
    
    // Track evaluation complete
    yield* telemetry.trackEvent({
      category: "swebench",
      action: "evaluation_complete",
      label: RUN_ID,
      context: summary,
      level: "info"
    });
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 EVALUATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`Total Instances: ${stats.totalInstances}`);
    console.log(`Patches Generated: ${stats.patchesGenerated}`);
    console.log(`Patch Generation Errors: ${stats.patchGenerationErrors}`);
    console.log(`Evaluated: ${stats.evaluated}`);
    console.log(`Resolved (Tests Pass): ${stats.resolved}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Success Rate: ${(stats.resolved / stats.evaluated * 100).toFixed(2)}%`);
    console.log(`Total Duration: ${duration.toFixed(2)} minutes`);
    console.log("=".repeat(60));
    console.log(`\n✨ SWE-BENCH SCORE: ${(stats.resolved / stats.totalInstances * 100).toFixed(2)}%`);
    console.log("=".repeat(60));
    console.log(`\n📁 Results saved to: ${outputDir}`);
    
    // Print individual results summary
    if (completeMsg.data.results && Object.keys(completeMsg.data.results).length <= 20) {
      console.log("\n📋 Individual Results:");
      for (const [instanceId, result] of Object.entries(completeMsg.data.results)) {
        const status = (result as any).resolved ? "✅ PASS" : "❌ FAIL";
        const details = stats.instanceDetails.get(instanceId);
        const patchInfo = details?.patchGenerated 
          ? `(${details.patchSize} chars)` 
          : '(no patch)';
        console.log(`  ${status} ${instanceId} ${patchInfo}`);
      }
    } else if (completeMsg.data.results) {
      const resolved = Object.values(completeMsg.data.results)
        .filter((r: any) => r.resolved).length;
      console.log(`\n📋 Results Summary: ${resolved} resolved out of ${Object.keys(completeMsg.data.results).length} evaluated`);
    }
  }
});

// Create layer with telemetry
const telemetryWithConfig = TelemetryServiceLive.pipe(
  Layer.provide(TelemetryServiceCliConfigLayer)
);

const layer = SWEBenchPythonBridgeServiceTelemetryLive.pipe(
  Layer.provide(Layer.mergeAll(
    telemetryWithConfig,
    NodeFileSystem.layer
  ))
);

// Run the evaluation
console.log(`Starting ${instanceCount}-instance SWE-bench evaluation with full telemetry...\n`);
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});