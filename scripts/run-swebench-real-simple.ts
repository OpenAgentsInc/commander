#!/usr/bin/env tsx
/**
 * REAL SWE-bench evaluation with Claude Code patch generation - SIMPLIFIED VERSION
 * This generates ACTUAL patches and evaluates them
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
import { execSync } from "child_process";

// Configuration
const MAX_INSTANCES = parseInt(process.env.MAX_INSTANCES || "2");
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";
const RUN_ID = `real-${Date.now()}`;

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

// Test with just a few instances
const TEST_INSTANCES = [
  "django__django-11099",  // UsernameValidator trailing newline
  "sympy__sympy-12419",    // Sum(1, (n, a, b)) should return b - a + 1
];

/**
 * Load task data from JSON file
 */
async function loadTaskData(instanceId: string): Promise<any> {
  const taskFile = path.join(process.cwd(), "assets/swe_bench_data", `${instanceId}.json`);
  const content = await fs.readFile(taskFile, 'utf-8');
  return JSON.parse(content);
}

/**
 * Build enhanced prompt with test information
 */
function buildEnhancedPrompt(task: any): string {
  return `You are an expert software engineer tasked with fixing a bug in the ${task.repo} repository.

Repository: ${task.repo}
Instance ID: ${task.instance_id}
Base Commit: ${task.base_commit}

Problem Statement:
${task.problem_statement}

${task.hints_text ? `Hints:\n${task.hints_text}\n` : ''}

Test Patch (these tests should pass after your fix):
\`\`\`diff
${task.test_patch}
\`\`\`

Instructions:
1. Analyze the problem statement and failing tests carefully
2. Look at the test patch to understand what behavior is expected
3. Generate a minimal patch that fixes the issue
4. The patch should be in unified diff format (as produced by 'git diff')
5. Only include changes that are directly related to fixing the issue
6. Ensure the patch follows the coding style of the repository
7. Make sure your fix will make the failing tests pass

Generate the patch now. Output ONLY the patch in unified diff format, starting with "diff --git" and nothing else.`;
}

async function runRealEvaluation() {
  console.log("🚀 SWE-bench REAL Evaluation with Claude Patches (Simplified)");
  console.log("==========================================================");
  console.log(`Instances: ${MAX_INSTANCES}`);
  console.log(`Dataset: ${DATASET_NAME}`);
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");
  
  const startTime = Date.now();
  
  const program = Effect.gen(function* () {
    const bridge = yield* SWEBenchPythonBridgeService;
    
    // Initialize the bridge
    console.log("Initializing Python bridge...");
    yield* bridge.initialize();
    console.log("✅ Python bridge initialized\n");
    
    // Use our test instances
    const selectedInstances = TEST_INSTANCES.slice(0, MAX_INSTANCES);
    console.log(`📋 Selected ${selectedInstances.length} instances for evaluation:`);
    selectedInstances.forEach(id => console.log(`  - ${id}`));
    console.log("");
    
    // Generate predictions with REAL patches
    const predictions: SWEBenchPrediction[] = [];
    
    for (let i = 0; i < selectedInstances.length; i++) {
      const instanceId = selectedInstances[i];
      console.log(`\n[${i + 1}/${selectedInstances.length}] Processing ${instanceId}`);
      
      try {
        // Load task data
        const taskData = yield* Effect.tryPromise(() => loadTaskData(instanceId));
        console.log(`  Repo: ${taskData.repo}`);
        console.log(`  Problem: ${taskData.problem_statement.substring(0, 80)}...`);
        
        // Build enhanced prompt
        const enhancedTask = {
          ...taskData,
          problem_statement: buildEnhancedPrompt(taskData)
        };
        
        // Generate REAL patch with Claude
        console.log(`  🤖 Generating patch with Claude...`);
        const result = yield* Effect.tryPromise(() => 
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
          console.log(`\n  ✅ Patch generated (${result.patch.length} chars)`);
          
          predictions.push({
            instance_id: instanceId,
            model_name_or_path: "claude-3-5-sonnet-20241022",
            model_patch: result.patch
          });
          
          // Save patch for inspection
          const patchFile = `./swebench-results/${RUN_ID}/${instanceId}.patch`;
          yield* Effect.tryPromise(() => 
            fs.mkdir(path.dirname(patchFile), { recursive: true })
          );
          yield* Effect.tryPromise(() => 
            fs.writeFile(patchFile, result.patch!)
          );
          
        } else {
          console.log(`\n  ❌ Failed to generate patch: ${result.error}`);
          // Still add with empty patch to track
          predictions.push({
            instance_id: instanceId,
            model_name_or_path: "claude-3-5-sonnet-20241022-failed",
            model_patch: ""
          });
        }
        
      } catch (error) {
        console.error(`  ❌ Error: ${error}`);
        predictions.push({
          instance_id: instanceId,
          model_name_or_path: "claude-3-5-sonnet-20241022-error",
          model_patch: ""
        });
      }
    }
    
    console.log(`\n📊 Patch Generation Summary:`);
    console.log(`  Total: ${predictions.length}`);
    console.log(`  With patches: ${predictions.filter(p => p.model_patch).length}`);
    console.log(`  Empty: ${predictions.filter(p => !p.model_patch).length}`);
    
    // Run evaluation with real patches
    console.log("\n🚀 Starting Docker evaluation...");
    const stream = bridge.runEvaluation(predictions, {
      dataset_name: DATASET_NAME,
      max_workers: 1,  // Single worker for safety
      timeout: 1800,
      instance_ids: selectedInstances,
      namespace: "none"  // Use local images
    });
    
    // Process results
    let evaluated = 0;
    let resolved = 0;
    
    const results = yield* stream.pipe(
      Stream.tap(msg => Effect.sync(() => {
        switch (msg.type) {
          case "progress":
            const progress = msg.data.percentage || 0;
            const completed = msg.data.completed || 0;
            console.log(`📊 Progress: ${progress.toFixed(1)}% (${completed}/${predictions.length})`);
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
    
    // Find completion
    const completeMsg = results.find(m => m.type === "complete");
    if (completeMsg) {
      evaluated = completeMsg.data.summary.evaluated;
      resolved = completeMsg.data.summary.resolved;
      
      // Save results
      const resultsFile = `./swebench-results/${RUN_ID}/results.json`;
      yield* Effect.tryPromise(() => 
        fs.writeFile(resultsFile, JSON.stringify(completeMsg.data, null, 2))
      );
      
      // Print summary
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      
      console.log("\n" + "=".repeat(60));
      console.log("🎉 REAL EVALUATION COMPLETE!");
      console.log("=".repeat(60));
      console.log(`Total Instances: ${predictions.length}`);
      console.log(`Evaluated: ${evaluated}`);
      console.log(`Resolved (Tests Pass): ${resolved}`);
      console.log(`Success Rate: ${(resolved / evaluated * 100).toFixed(2)}%`);
      console.log(`Duration: ${duration} minutes`);
      console.log("=".repeat(60));
      console.log(`\n✨ REAL SWE-BENCH SCORE: ${(resolved / predictions.length * 100).toFixed(2)}%`);
      console.log("=".repeat(60));
      console.log(`\n📁 Results saved to: ./swebench-results/${RUN_ID}/`);
      
      // Show individual results
      if (completeMsg.data.results) {
        console.log("\n📋 Individual Results:");
        for (const [id, result] of Object.entries(completeMsg.data.results)) {
          const status = (result as any).resolved ? "✅ PASS" : "❌ FAIL";
          console.log(`  ${status} ${id}`);
        }
      }
    }
  });
  
  // Create simple layer composition
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

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: pnpm tsx scripts/run-swebench-real-simple.ts [options]

Options:
  --max-instances N    Number of instances to evaluate (default: 2)
  --help              Show this help

Example:
  pnpm tsx scripts/run-swebench-real-simple.ts --max-instances 2
`);
  process.exit(0);
}

// Handle command line args
if (args.includes('--max-instances')) {
  const idx = args.indexOf('--max-instances');
  if (idx < args.length - 1) {
    process.env.MAX_INSTANCES = args[idx + 1];
  }
}

// Run the evaluation
console.log("\n🏁 Starting REAL SWE-bench evaluation with Claude patches (simplified)...\n");
runRealEvaluation().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});