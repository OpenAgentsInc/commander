#!/usr/bin/env tsx
/**
 * Test SWE-bench with manual layer composition
 */

import { Effect, Layer, Exit, Console, pipe } from "effect";
import * as path from "path";

async function testManualLayerComposition() {
  console.log("=== Testing SWE-bench with manual layer composition ===\n");
  
  try {
    // Import all necessary services
    const { ConfigurationServiceLive, DefaultDevConfigLayer } = await import("../src/services/configuration");
    const { TelemetryServiceLive, TelemetryServiceConfigFromConfigurationLayer } = await import("../src/services/telemetry");
    const { NodeFileSystem, NodeHttpClient } = await import("@effect/platform-node");
    const { DockerUtilsServiceLive } = await import("../src/services/docker");
    
    // Build base layers first
    console.log("1. Building base layers...");
    const configLayer = DefaultDevConfigLayer.pipe(Layer.provide(ConfigurationServiceLive));
    const fileSystemLayer = NodeFileSystem.layer;
    const httpClientLayer = NodeHttpClient.layerUndici;
    
    const telemetryConfigLayer = TelemetryServiceConfigFromConfigurationLayer.pipe(
      Layer.provide(configLayer)
    );
    
    const telemetryLayer = TelemetryServiceLive.pipe(
      Layer.provide(Layer.merge(telemetryConfigLayer, fileSystemLayer))
    );
    
    const dockerLayer = DockerUtilsServiceLive.pipe(
      Layer.provide(telemetryLayer)
    );
    
    const baseLayer = Layer.mergeAll(
      configLayer,
      telemetryLayer,
      fileSystemLayer,
      httpClientLayer,
      dockerLayer
    );
    console.log("✓ Base layers built\n");
    
    // Import SWE-bench core services
    console.log("2. Building SWE-bench core services...");
    const {
      SWEBenchTaskServiceLive,
      SWEBenchEvaluationScriptServiceLive,
      DockerBuildManagerServiceLive,
      SWEBenchEnvironmentSetupServiceLive
    } = await import("../src/services/swe_bench_harness");
    
    const taskServiceLayer = SWEBenchTaskServiceLive.pipe(
      Layer.provide(baseLayer)
    );
    
    const evalScriptLayer = SWEBenchEvaluationScriptServiceLive.pipe(
      Layer.provide(baseLayer)
    );
    
    const dockerBuildLayer = DockerBuildManagerServiceLive.pipe(
      Layer.provide(baseLayer)
    );
    
    const envSetupLayer = SWEBenchEnvironmentSetupServiceLive.pipe(
      Layer.provide(baseLayer)
    );
    
    const coreServicesLayer = Layer.mergeAll(
      taskServiceLayer,
      evalScriptLayer,
      dockerBuildLayer,
      envSetupLayer
    );
    console.log("✓ SWE-bench core services built\n");
    
    // Now test with a simple gold patch
    console.log("3. Testing with gold patch (no AI needed)...");
    const { SWEBenchLifecycleServiceLive, SWEBenchLifecycleService } = await import("../src/services/swe_bench_harness");
    
    // Import the required services
    const { SWEBenchEnvironmentSetupService } = await import("../src/services/swe_bench_harness");
    
    const lifecycleLayer = SWEBenchLifecycleServiceLive.pipe(
      Layer.provide(Layer.mergeAll(baseLayer, coreServicesLayer, envSetupLayer))
    );
    
    // Test program
    const testProgram = Effect.gen(function* () {
      const lifecycle = yield* SWEBenchLifecycleService;
      
      // Load a task
      const instanceId = "sympy__sympy-12419";
      const tasksDir = path.join(process.cwd(), "assets/swe_bench_data");
      const taskPath = path.join(tasksDir, `${instanceId}.json`);
      const taskData = require(taskPath);
      
      console.log(`\nTesting with task: ${instanceId}`);
      console.log(`Problem: ${taskData.problem_statement.substring(0, 100)}...`);
      
      // Run lifecycle with gold patch
      const containerId = `test-${Date.now()}`;
      const result = yield* lifecycle.runLifecycle({
        containerId,
        task: taskData,
        patch: taskData.test_patch || taskData.patch || "",
        logCallback: (msg) => console.log(`[Docker] ${msg}`)
      });
      
      return result;
    });
    
    const result = await Effect.runPromiseExit(
      testProgram.pipe(Effect.provide(lifecycleLayer))
    );
    
    if (Exit.isSuccess(result)) {
      console.log("\n✅ Test passed!");
      console.log("Evaluation result:", JSON.stringify(result.value, null, 2));
    } else {
      console.error("\n❌ Test failed!");
      console.error("Error:", result.cause);
    }
    
  } catch (error) {
    console.error("\n❌ Error during test:");
    console.error(error);
  }
  
  console.log("\n=== Test complete ===");
}

testManualLayerComposition().catch(console.error);