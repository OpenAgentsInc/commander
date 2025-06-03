#!/usr/bin/env tsx
/**
 * Test the fixed telemetry evaluation with 1 instance
 */

import { Effect, Stream, Chunk, Layer, pipe } from "effect";
import { Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { SWEBenchPythonBridgeService, SWEBenchPrediction } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeService";
import { SWEBenchPythonBridgeServiceTelemetryFixed } from "../src/services/swe_bench_harness/SWEBenchPythonBridgeServiceTelemetryFixed";
import { NodeFileSystem } from "@effect/platform-node";
import { TelemetryService, TelemetryServiceLive } from "../src/services/telemetry";
import { TelemetryServiceCliConfigLayer } from "../src/services/telemetry/TelemetryServiceCliConfig";
import { generatePatchWithClaudeTelemetry } from "./utils/claude-patch-generator-telemetry";
import * as path from "path";
import * as fs from "fs/promises";

// Configuration
const DATASET_NAME = "princeton-nlp/SWE-bench_Lite";
const RUN_ID = `telemetry-test-${Date.now()}`;

// Use virtual environment Python
process.env.PYTHON_EXECUTABLE = ".venv/bin/python";

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
  
  console.log("🧪 Testing telemetry evaluation with 1 instance");
  console.log("==========================================");
  console.log(`Run ID: ${RUN_ID}`);
  console.log("");
  
  // Track evaluation start
  yield* telemetry.trackEvent({
    category: "swebench",
    action: "test_evaluation_start",
    label: RUN_ID,
    level: "info"
  });
  
  // Initialize Python bridge
  console.log("Initializing Python bridge...");
  yield* bridge.initialize();
  console.log("✅ Python bridge initialized\n");
  
  // Test with one instance
  const instanceId = "astropy__astropy-11693";
  console.log(`Processing ${instanceId}`);
  
  // Load task data
  const task = yield* Effect.promise(() => loadTaskData(instanceId));
  console.log(`  Repo: ${task.repo}`);
  console.log(`  Problem: ${task.problem_statement.substring(0, 100)}...`);
  
  // Generate patch with telemetry - WITHOUT the extra provideService
  console.log(`  🤖 Generating patch...`);
  const result = yield* generatePatchWithClaudeTelemetry(task, {
    maxRetries: 1,
    includeTestInfo: true,
    streamingCallback: (msg) => {
      if (msg.type === 'assistant') process.stdout.write('.');
    },
    debug: false,
    timeout: 60000 // 1 minute for test
  });
  
  console.log(); // New line after dots
  
  if (result.success && result.patch) {
    console.log(`  ✅ Patch generated (${result.patch.length} chars)`);
    console.log(`\nFirst 300 chars of patch:`);
    console.log(result.patch.substring(0, 300) + "...");
  } else {
    console.log(`  ❌ Failed to generate patch: ${result.error}`);
  }
  
  // Track complete
  yield* telemetry.trackEvent({
    category: "swebench",
    action: "test_evaluation_complete",
    label: RUN_ID,
    context: { success: result.success },
    level: "info"
  });
  
  console.log("\n✅ Telemetry test completed successfully!");
});

// Create layer with telemetry - provide FileSystem first
const telemetryWithConfig = TelemetryServiceLive.pipe(
  Layer.provide(Layer.mergeAll(
    TelemetryServiceCliConfigLayer,
    NodeFileSystem.layer
  ))
);

const layer = SWEBenchPythonBridgeServiceTelemetryFixed.pipe(
  Layer.provide(Layer.mergeAll(
    telemetryWithConfig,
    NodeFileSystem.layer
  ))
);

// Run the test
console.log(`Starting telemetry test...\n`);
Effect.runPromise(program.pipe(Effect.provide(layer))).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});