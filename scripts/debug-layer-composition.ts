#!/usr/bin/env tsx
/**
 * Debug layer composition for SWE-bench
 */

import { Effect, Layer, Console } from "effect";

async function debugLayerComposition() {
  console.log("=== Starting layer composition debug ===\n");
  
  try {
    // Step 1: Import runtime and check buildFullAppLayer
    console.log("1. Importing runtime module...");
    const { buildFullAppLayer } = await import("../src/services/runtime");
    console.log("✓ Runtime module imported successfully");
    
    // Step 2: Try to build the full app layer
    console.log("\n2. Building full app layer...");
    const fullAppLayer = buildFullAppLayer();
    console.log("✓ Full app layer built successfully");
    
    // Step 3: Import SWE-bench services
    console.log("\n3. Importing SWE-bench services...");
    const {
      SWEBenchTaskServiceLive,
      SWEBenchEvaluationScriptServiceLive,
      DockerBuildManagerServiceLive,
      SWEBenchEnvironmentSetupServiceLive,
      AgentPatchGeneratorServiceLive,
      SWEBenchLifecycleServiceLive,
      SWEBenchHarnessServiceLive
    } = await import("../src/services/swe_bench_harness");
    console.log("✓ SWE-bench services imported successfully");
    
    // Step 4: Try to compose layers incrementally
    console.log("\n4. Composing layers incrementally...");
    
    // 4a. Core services (no AI dependencies)
    console.log("  4a. Creating core services layer...");
    const coreLayer = Layer.mergeAll(
      SWEBenchTaskServiceLive,
      SWEBenchEvaluationScriptServiceLive,
      DockerBuildManagerServiceLive,
      SWEBenchEnvironmentSetupServiceLive
    );
    console.log("  ✓ Core services layer created");
    
    // 4b. Agent patch generator with full app layer
    console.log("  4b. Creating agent patch generator layer...");
    const agentLayer = AgentPatchGeneratorServiceLive.pipe(
      Layer.provide(fullAppLayer)
    );
    console.log("  ✓ Agent patch generator layer created");
    
    // 4c. Lifecycle service
    console.log("  4c. Creating lifecycle service layer...");
    const lifecycleLayer = SWEBenchLifecycleServiceLive.pipe(
      Layer.provide(Layer.mergeAll(coreLayer, agentLayer, fullAppLayer))
    );
    console.log("  ✓ Lifecycle service layer created");
    
    // 4d. Harness service
    console.log("  4d. Creating harness service layer...");
    const harnessLayer = SWEBenchHarnessServiceLive.pipe(
      Layer.provide(Layer.mergeAll(lifecycleLayer, coreLayer, agentLayer, fullAppLayer))
    );
    console.log("  ✓ Harness service layer created");
    
    // Step 5: Test the layer with a simple program
    console.log("\n5. Testing the composed layer...");
    const testProgram = Effect.gen(function* () {
      yield* Console.log("Test program running successfully!");
      return "success";
    });
    
    const result = await Effect.runPromiseExit(
      testProgram.pipe(Effect.provide(harnessLayer))
    );
    
    if (result._tag === "Success") {
      console.log("✓ Layer composition test passed!");
      console.log("Result:", result.value);
    } else {
      console.error("✗ Layer composition test failed!");
      console.error("Error:", result.cause);
    }
    
  } catch (error) {
    console.error("\n❌ Error during layer composition:");
    console.error(error);
    
    if (error instanceof Error) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  }
  
  console.log("\n=== Layer composition debug complete ===");
}

debugLayerComposition().catch(console.error);