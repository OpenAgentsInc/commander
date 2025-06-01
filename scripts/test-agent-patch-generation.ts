#!/usr/bin/env tsx
/**
 * Test the agent patch generation with Claude Code
 */

import { Effect, Layer, Console, pipe } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { NodeFileSystem } from "@effect/platform-node";
import * as fs from "fs/promises";
import * as path from "path";

// Import services
import { 
  SWEBenchHarnessService,
  SWEBenchHarnessServiceLive,
  SWEBenchTaskService,
  SWEBenchTaskServiceLive,
  SWEBenchLifecycleServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  DockerBuildManagerServiceLive,
  SWEBenchEnvironmentSetupServiceLive,
  AgentPatchGeneratorServiceLive,
  type SWEBenchTask,
  type PatchSource
} from "@/services/swe_bench_harness";

import { DockerUtilsServiceLive } from "@/services/docker";
import { ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

// Import AI services we need
import { ChatOrchestratorServiceLive } from "@/services/ai/orchestration";
import { ClaudeCodeProvider } from "@/services/ai/providers/claude-code";

// HTTP client layer (minimal)
import { HttpClient } from "@effect/platform";
import { NodeHttpClient } from "@effect/platform-node";

async function main() {
  console.log("=== Testing Agent Patch Generation ===\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'swebench-results', `agent-test-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });

  // Build the layer with all dependencies
  const MainLayer = Layer.mergeAll(
    NodeFileSystem.layer,
    NodeHttpClient.layer,
    DefaultDevConfigLayer,
    ConfigurationServiceLive,
    DefaultTelemetryConfigLayer, 
    TelemetryServiceLive,
    DockerUtilsServiceLive,
    DockerBuildManagerServiceLive,
    SWEBenchTaskServiceLive,
    SWEBenchLifecycleServiceLive,
    SWEBenchEvaluationScriptServiceLive,
    SWEBenchEnvironmentSetupServiceLive,
    ClaudeCodeProvider.ClaudeCodeProviderLive,
    ChatOrchestratorServiceLive,
    AgentPatchGeneratorServiceLive,
    SWEBenchHarnessServiceLive
  );

  const program = Effect.gen(function* () {
    const taskService = yield* SWEBenchTaskService;
    const harnessService = yield* SWEBenchHarnessService;

    // Get available tasks
    const taskIds = yield* taskService.listTaskIds();
    console.log(`Found ${taskIds.length} tasks available`);
    
    // Take first 2 tasks for testing
    const testTaskIds = taskIds.slice(0, 2);
    console.log(`Testing with tasks: ${testTaskIds.join(', ')}\n`);

    const results = [];

    for (const taskId of testTaskIds) {
      yield* Console.log(`\n--- Processing ${taskId} ---`);
      
      try {
        // Load the task
        const task = yield* taskService.getTaskById(taskId);
        yield* Console.log(`Repository: ${task.repo}`);
        yield* Console.log(`Problem: ${task.problem_statement.substring(0, 150)}...`);

        // Run evaluation with agent-generated patch
        const patchSource: PatchSource = {
          type: "agent_generated",
          providerKey: "claude_code"
        };

        yield* Console.log("\n🤖 Requesting patch from Claude Code agent...");
        
        const result = yield* harnessService.evaluateTask(
          task,
          patchSource,
          outputDir
        );

        yield* Console.log(`\n📊 Results:`);
        yield* Console.log(`   Resolved: ${result.report.resolved ? '✅' : '❌'}`);
        yield* Console.log(`   Patch Applied: ${result.report.patch_applied_successfully ? '✅' : '❌'}`);
        yield* Console.log(`   Tests Passed: ${result.report.tests_passed ? '✅' : '❌'}`);

        results.push({
          instance_id: taskId,
          resolved: result.report.resolved,
          success: true
        });

        // Save individual result
        await fs.writeFile(
          path.join(outputDir, `${taskId}_eval_result.json`),
          JSON.stringify(result, null, 2)
        );

      } catch (error) {
        yield* Console.error(`❌ Error processing ${taskId}: ${error}`);
        results.push({
          instance_id: taskId,
          resolved: false,
          success: false,
          error: String(error)
        });
      }
    }

    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      total_tasks: results.length,
      successful: results.filter(r => r.success).length,
      resolved: results.filter(r => r.resolved).length,
      tasks: results
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    yield* Console.log("\n\n=== Summary ===");
    yield* Console.log(`Total tasks: ${summary.total_tasks}`);
    yield* Console.log(`Successful runs: ${summary.successful}`);
    yield* Console.log(`Resolved issues: ${summary.resolved}`);
    yield* Console.log(`\nResults saved to: ${outputDir}`);

    return results;
  });

  // Run the program
  await NodeRuntime.runPromise(
    pipe(
      program,
      Effect.provide(MainLayer),
      Effect.tapError(error => 
        Console.error(`Fatal error: ${error}`)
      )
    )
  );
}

main().catch(console.error);