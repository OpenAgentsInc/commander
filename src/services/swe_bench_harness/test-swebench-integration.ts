#!/usr/bin/env tsx
/**
 * SWE-Bench Task Service Integration Test
 * 
 * Run with: pnpm tsx src/services/swe_bench_harness/test-swebench-integration.ts
 */

import { Effect, Exit, Layer, Console } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { SWEBenchTaskService } from "./SWEBenchTaskService";
import { SWEBenchTaskServiceLive } from "./SWEBenchTaskServiceImpl";
import { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

const testProgram = Effect.gen(function* (_) {
  const taskService = yield* _(SWEBenchTaskService);
  
  yield* _(Console.log("📋 SWE-Bench Task Service Integration Test\n"));
  
  // Test 1: List available tasks
  yield* _(Console.log("Test 1: Listing available tasks..."));
  const taskIds = yield* _(taskService.listAvailableTaskIds());
  yield* _(Console.log(`Found ${taskIds.length} tasks:`));
  taskIds.forEach(id => console.log(`  - ${id}`));
  
  // Test 2: Load a specific task
  if (taskIds.length > 0) {
    const taskId = taskIds[0];
    yield* _(Console.log(`\nTest 2: Loading task '${taskId}'...`));
    const task = yield* _(taskService.getTask(taskId));
    yield* _(Console.log("Task loaded successfully:"));
    console.log(`  Instance ID: ${task.instance_id}`);
    console.log(`  Repository: ${task.repo}`);
    console.log(`  Base Commit: ${task.base_commit}`);
    console.log(`  Problem Statement: ${task.problem_statement.substring(0, 100)}...`);
    console.log(`  Tests to fix: ${task.FAIL_TO_PASS.join(", ")}`);
    
    // Test 3: Verify caching works
    yield* _(Console.log(`\nTest 3: Loading same task again (should use cache)...`));
    const taskAgain = yield* _(taskService.getTask(taskId));
    yield* _(Console.log("Task loaded from cache successfully"));
    console.log(`  Same instance? ${task === taskAgain}`);
  }
  
  // Test 4: Try to load non-existent task
  yield* _(Console.log("\nTest 4: Attempting to load non-existent task..."));
  yield* _(
    taskService.getTask("non-existent-task").pipe(
      Effect.catchAll(error => 
        Console.log(`  ✓ Got expected error: ${error.message}`)
      )
    )
  );
  
  yield* _(Console.log("\n✅ All tests completed!"));
});

const runTests = async () => {
  // Build the complete layer stack
  const configLayer = DefaultDevConfigLayer.pipe(
    Layer.provide(ConfigurationServiceLive)
  );
  
  const telemetryLayer = TelemetryServiceLive.pipe(
    Layer.provide(DefaultTelemetryConfigLayer),
    Layer.provide(configLayer)
  );
  
  const layer = SWEBenchTaskServiceLive.pipe(
    Layer.provide(NodeFileSystem.layer),
    Layer.provide(configLayer),
    Layer.provide(telemetryLayer)
  );
  
  const result = await Effect.runPromiseExit(
    testProgram.pipe(Effect.provide(layer))
  );
  
  if (Exit.isFailure(result)) {
    console.error("\n❌ Tests failed!");
    console.error("Error:", result.cause);
    process.exit(1);
  } else {
    console.log("\n🎉 Integration tests passed!");
    process.exit(0);
  }
};

runTests().catch(console.error);