#!/usr/bin/env tsx
/**
 * Debug script to understand layer composition issues
 */

import { Effect, Layer, Console } from "effect";
import { SWEBenchCliLayer, PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";

// First, let's see what services are in each layer
console.log("\n=== Analyzing Layer Composition ===\n");

console.log("1. PatchGenerationCliLayer contains:");
console.log("   - ConfigurationServiceEnvLive");
console.log("   - SWEBenchTaskServiceLive");
console.log("   - ClaudeCliExecutorServiceLive");
console.log("   - AgentPatchGeneratorServiceLive");

console.log("\n2. SWEBenchCliLayer should add:");
console.log("   - DockerUtilsServiceLive");
console.log("   - SWEBenchEnvironmentSetupServiceLive");
console.log("   - SWEBenchEvaluationScriptServiceLive");
console.log("   - SWEBenchHarnessServiceLive");
console.log("   - SWEBenchLifecycleServiceLive");
console.log("   - DockerBuildManagerServiceLive");

// Try to run a simple program with the full layer
const testProgram = Effect.gen(function* () {
  yield* Console.log("Testing layer composition...");
  return "success";
});

console.log("\n3. Testing PatchGenerationCliLayer:");
Effect.runPromise(
  testProgram.pipe(Effect.provide(PatchGenerationCliLayer))
)
  .then(() => console.log("   ✅ PatchGenerationCliLayer works!"))
  .catch((error) => console.log("   ❌ PatchGenerationCliLayer failed:", error));

console.log("\n4. Testing SWEBenchCliLayer:");
Effect.runPromise(
  testProgram.pipe(Effect.provide(SWEBenchCliLayer))
)
  .then(() => console.log("   ✅ SWEBenchCliLayer works!"))
  .catch((error) => {
    console.log("   ❌ SWEBenchCliLayer failed:", error);
    console.log("\n   Error details:", JSON.stringify(error, null, 2));
  });