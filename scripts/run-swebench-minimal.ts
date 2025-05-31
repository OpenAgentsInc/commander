#!/usr/bin/env tsx
/**
 * Minimal SWE-bench task runner for demonstration
 */

import { Effect, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { NodeRuntime } from "@effect/platform-node";
import * as fs from "fs";
import * as path from "path";
import { 
  SWEBenchLifecycleService, 
  SWEBenchLifecycleServiceLive,
  SWEBenchEvaluationScriptService,
  SWEBenchEvaluationScriptServiceLive,
  DockerBuildManagerServiceLive,
  type SWEBenchTask 
} from "@/services/swe_bench_harness";
import { DockerUtilsServiceLive } from "@/services/docker";
import { ConfigurationServiceLive } from "@/services/configuration";
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

// Parse command line arguments
const args = process.argv.slice(2);
const taskFile = args[0];

if (!taskFile) {
  console.error("Usage: pnpm tsx scripts/run-swebench-minimal.ts <task.json>");
  process.exit(1);
}

// Load task
const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
const task: SWEBenchTask = taskData;

console.log(`\n🔧 Running SWE-bench task: ${task.instance_id}`);
console.log(`📦 Repository: ${task.repo}`);
console.log(`🔖 Base commit: ${task.base_commit}`);
console.log(`🧪 Tests to fix: ${task.FAIL_TO_PASS.join(', ')}\n`);

// Create the runtime layer
const RuntimeLayer = Layer.mergeAll(
  DockerUtilsServiceLive,
  ConfigurationServiceLive,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  DockerBuildManagerServiceLive,
  SWEBenchLifecycleServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  NodeFileSystem.layer
);

// Main program
const runTask = Effect.gen(function* () {
  const lifecycle = yield* SWEBenchLifecycleService;
  const evalScriptService = yield* SWEBenchEvaluationScriptService;
  
  try {
    // Step 1: Setup container
    console.log("🐳 Setting up Docker container...");
    const context = yield* lifecycle.setupContainerForTask(task);
    console.log("✅ Container ready!");
    console.log(`   Container ID: ${context.containerId}`);
    console.log(`   Image: ${context.imageName}`);
    
    // Step 2: Build evaluation script
    console.log("\n📝 Building evaluation script...");
    const evalScript = yield* evalScriptService.buildEvalScript(
      task,
      context.containerRepoPath,
      "/tmp/patch.diff"
    );
    
    // Step 3: Run evaluation (without patch for baseline)
    console.log("\n🧪 Running baseline evaluation (no patch)...");
    const emptyPatch = "";
    const report = yield* lifecycle.runEvaluationInContainer(
      context,
      evalScript,
      emptyPatch
    );
    
    console.log("\n📊 Evaluation Results:");
    console.log(`   Instance ID: ${report.instance_id}`);
    console.log(`   Patch Applied: ${report.patch_applied_successfully ? '✅' : '❌'}`);
    console.log(`   Tests Passed: ${report.tests_passed ? '✅' : '❌'}`);
    console.log(`   Resolved: ${report.resolved ? '✅' : '❌'}`);
    
    if (report.test_output) {
      console.log("\n📋 Test Output:");
      console.log(report.test_output.substring(0, 500) + "...");
    }
    
    // Step 4: Cleanup
    console.log("\n🧹 Cleaning up...");
    yield* lifecycle.cleanupContainerResources(context);
    console.log("✅ Cleanup complete!");
    
    return report;
    
  } catch (error) {
    console.error("❌ Error during evaluation:", error);
    throw error;
  }
});

// Run the task
console.log("Starting SWE-bench evaluation...\n");

NodeRuntime.runMain(
  runTask.pipe(
    Effect.provide(RuntimeLayer),
    Effect.tapError(error => 
      Effect.sync(() => {
        console.error("\n❌ Task failed:", error);
        if (error.message) {
          console.error("Message:", error.message);
        }
        if (error.cause) {
          console.error("Cause:", error.cause);
        }
      })
    )
  )
);