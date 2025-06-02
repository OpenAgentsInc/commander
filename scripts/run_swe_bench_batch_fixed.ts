#!/usr/bin/env tsx
/**
 * Fixed batch runner for SWE-Bench task evaluation.
 * 
 * This script runs multiple SWE-Bench tasks in sequence using the Effect-TS harness.
 * It loads tasks from JSON files downloaded by download_swe_bench_tasks.py and
 * evaluates them using the configured Docker environment.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Exit, Cause, Console, pipe, Layer, Config } from 'effect';
import { NodeRuntime, NodeFileSystem, NodeHttpClient } from '@effect/platform-node';

interface BatchOptions {
  tasks_dir: string;
  instance_ids?: string;
  max_tasks?: number;
  output_dir?: string;
  use_gold_patch: boolean;
  skip_if_no_patch: boolean;
  stop_on_failure: boolean;
}

const program = new Command();
program
  .name('run_swe_bench_batch')
  .description('Run SWE-Bench tasks in batch mode')
  .option('--tasks_dir <path>', 'Directory containing task JSON files', 'assets/swe_bench_data')
  .option('--instance_ids <ids>', 'Comma-separated list of instance IDs to run')
  .option('--max_tasks <N>', 'Maximum number of tasks to run', (val) => parseInt(val, 10))
  .option('--output_dir <path>', 'Directory to save evaluation results')
  .option('--use_gold_patch', 'Use the gold patch from the task data', true)
  .option('--no-use_gold_patch', 'Do not use the gold patch (run with empty patch)')
  .option('--skip_if_no_patch', 'Skip tasks if no gold patch is available and --use_gold_patch is true', false)
  .option('--stop_on_failure', 'Stop batch execution on the first task failure', false);

program.parse(process.argv);
const options = program.opts() as BatchOptions;

async function ensureOutputDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = options.output_dir || path.join(process.cwd(), 'swebench-results', `run-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

// Set environment variables BEFORE any imports that might use them
process.env.SWE_BENCH_DATASET_PATH = path.resolve(options.tasks_dir);
process.env.TELEMETRY_ENABLED = 'false';
process.env.NODE_ENV = 'production';

const mainProgram = Effect.gen(function* (_) {
  const outputDir = yield* _(Effect.promise(() => ensureOutputDir()));
  yield* _(Console.log(`Results will be saved to: ${outputDir}`));

  // Dynamically import services after env vars are set
  const { 
    SWEBenchTaskService,
    SWEBenchHarnessService,
    SWEBenchTaskServiceLive,
    SWEBenchEvaluationScriptServiceLive,
    SWEBenchLifecycleServiceLive,
    SWEBenchHarnessServiceLive,
    DockerBuildManagerServiceLive,
    SWEBenchEnvironmentSetupServiceLive,
    AgentPatchGeneratorServiceLive
  } = yield* _(Effect.promise(() => import('../src/services/swe_bench_harness')));

  const { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } = yield* _(
    Effect.promise(() => import('../src/services/configuration'))
  );
  
  const { TelemetryService, TelemetryServiceLive, TelemetryServiceConfigTag } = yield* _(
    Effect.promise(() => import('../src/services/telemetry'))
  );
  
  const { DockerUtilsServiceLive } = yield* _(
    Effect.promise(() => import('../src/services/docker'))
  );

  const taskService = yield* _(SWEBenchTaskService);
  const harnessService = yield* _(SWEBenchHarnessService);

  yield* _(Console.log(`Loading tasks from: ${options.tasks_dir}`));
  
  // Get all available task IDs
  let allTaskIds = yield* _(taskService.listAvailableTaskIds());

  // Filter by instance_ids if provided
  if (options.instance_ids) {
    const specifiedIds = options.instance_ids.split(',').map(id => id.trim());
    allTaskIds = allTaskIds.filter(id => specifiedIds.includes(id));
    
    if (allTaskIds.length === 0) {
      yield* _(Console.error('No matching instance IDs found!'));
      return;
    }
  }

  // Limit tasks if max_tasks is specified
  let tasksToRun = allTaskIds;
  if (options.max_tasks !== undefined && options.max_tasks < tasksToRun.length) {
    tasksToRun = tasksToRun.slice(0, options.max_tasks);
  }

  yield* _(Console.log(`Found ${allTaskIds.length} tasks. Will attempt to run ${tasksToRun.length} tasks.`));

  // Initialize counters and results
  const results: Array<{ instanceId: string; result: any }> = [];
  let tasksSucceeded = 0;
  let tasksFailed = 0;
  let tasksSkipped = 0;

  // Process each task
  for (const instanceId of tasksToRun) {
    yield* _(Console.log(`\n${'='.repeat(60)}`));
    yield* _(Console.log(`Evaluating task: ${instanceId}`));
    yield* _(Console.log(`${'='.repeat(60)}`));

    try {
      // Load task details
      const task = yield* _(taskService.getTask(instanceId));

      // Determine patch content
      let patchContent = "";
      if (options.use_gold_patch) {
        if (task.patch) {
          patchContent = task.patch;
          yield* _(Console.log("✓ Using gold patch from task data"));
        } else {
          if (options.skip_if_no_patch) {
            yield* _(Console.log("⚠️  Skipping task: No gold patch available and --skip_if_no_patch is set"));
            tasksSkipped++;
            results.push({ 
              instanceId, 
              result: { error: "Skipped: No gold patch available" } 
            });
            continue;
          }
          yield* _(Console.log("⚠️  Warning: No gold patch available, using empty patch"));
        }
      } else {
        yield* _(Console.log("ℹ️  Using empty patch as per --no-use_gold_patch"));
      }

      // Evaluate the task
      const evaluationResult = yield* _(
        pipe(
          harnessService.evaluateTask(instanceId, patchContent),
          Effect.either
        )
      );

      if (Exit.isSuccess(evaluationResult)) {
        const evalResult = evaluationResult.right;
        const resolved = evalResult.report.resolved;
        
        yield* _(Console.log(`\n📊 Task Results:`));
        yield* _(Console.log(`   Resolved: ${resolved ? '✅ YES' : '❌ NO'}`));
        yield* _(Console.log(`   Tests Run: ${evalResult.report.tests_run}`));
        
        results.push({ instanceId, result: evalResult });
        
        if (resolved) {
          tasksSucceeded++;
        } else {
          tasksFailed++;
        }
      } else {
        const error = Cause.squash(evaluationResult.left);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        yield* _(Console.error(`\n❌ Task failed with error: ${errorMessage}`));
        results.push({ 
          instanceId, 
          result: { error: errorMessage } 
        });
        tasksFailed++;
        
        if (options.stop_on_failure) {
          yield* _(Console.log("\n🛑 Stopping due to --stop_on_failure"));
          break;
        }
      }

      // Save individual result
      const resultFilePath = path.join(outputDir, `${instanceId.replace(/[/:]/g, '__')}_eval_result.json`);
      yield* _(
        Effect.tryPromise(() => 
          fs.writeFile(
            resultFilePath, 
            JSON.stringify(results[results.length - 1], null, 2)
          )
        ).pipe(
          Effect.catchAll(error => 
            Console.error(`Failed to save result file: ${error}`)
          )
        )
      );

    } catch (error) {
      yield* _(Console.error(`\n❌ Unexpected error processing task ${instanceId}: ${error}`));
      tasksFailed++;
      
      if (options.stop_on_failure) {
        yield* _(Console.log("\n🛑 Stopping due to --stop_on_failure"));
        break;
      }
    }
  }

  // Print summary
  yield* _(Console.log(`\n${'='.repeat(60)}`));
  yield* _(Console.log('📈 Batch Evaluation Summary'));
  yield* _(Console.log(`${'='.repeat(60)}`));
  yield* _(Console.log(`Total tasks attempted: ${tasksToRun.length}`));
  yield* _(Console.log(`✅ Succeeded (resolved): ${tasksSucceeded}`));
  yield* _(Console.log(`❌ Failed (not resolved or error): ${tasksFailed}`));
  yield* _(Console.log(`⏭️  Skipped: ${tasksSkipped}`));
  yield* _(Console.log(`\n📁 Full results saved in: ${outputDir}`));

  // Save summary file
  const summaryPath = path.join(outputDir, 'summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    tasks_attempted: tasksToRun.length,
    tasks_succeeded: tasksSucceeded,
    tasks_failed: tasksFailed,
    tasks_skipped: tasksSkipped,
    options: options,
    results: results
  };
  
  yield* _(
    Effect.tryPromise(() => 
      fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))
    ).pipe(
      Effect.catchAll(error => 
        Console.error(`Failed to save summary file: ${error}`)
      )
    )
  );
});

async function runBatch() {
  try {
    // Import all required modules dynamically
    const { 
      SWEBenchTaskServiceLive,
      SWEBenchEvaluationScriptServiceLive,
      SWEBenchLifecycleServiceLive,
      SWEBenchHarnessServiceLive,
      DockerBuildManagerServiceLive,
      SWEBenchEnvironmentSetupServiceLive,
      AgentPatchGeneratorServiceLive
    } = await import('../src/services/swe_bench_harness');

    const { ConfigurationServiceLive, DefaultDevConfigLayer } = await import('../src/services/configuration');
    const { TelemetryServiceLive, TelemetryServiceConfigTag } = await import('../src/services/telemetry');
    const { DockerUtilsServiceLive } = await import('../src/services/docker');
    const { ChatOrchestratorServiceLive } = await import('../src/services/ai/orchestration');
    const { AIModelService, AIModelServiceLive } = await import('../src/services/ai');

    // Create minimal telemetry config for CLI
    const MinimalTelemetryConfig = Layer.succeed(TelemetryServiceConfigTag, {
      telemetryEnabled: false,
      recordingsPath: "./telemetry",
      maxRetentionDays: 7,
      enableTelemetryService: false
    });

    // Create configuration layer
    const ConfigLayer = DefaultDevConfigLayer.pipe(
      Layer.provide(ConfigurationServiceLive)
    );

    // Create telemetry layer with minimal config
    const TelemetryLayer = TelemetryServiceLive.pipe(
      Layer.provide(Layer.merge(MinimalTelemetryConfig, NodeFileSystem.layer))
    );

    // Base services
    const BaseServicesLayer = Layer.mergeAll(
      ConfigLayer,
      TelemetryLayer,
      NodeFileSystem.layer,
      NodeHttpClient.layerUndici,
      DockerUtilsServiceLive.pipe(Layer.provide(TelemetryLayer))
    );

    // AI services layer - create a minimal one for CLI
    const AIServicesLayer = Layer.mergeAll(
      AIModelServiceLive,
      ChatOrchestratorServiceLive
    ).pipe(
      Layer.provide(BaseServicesLayer)
    );

    // Build the complete SWE-bench layer
    const CLISWEBenchLayer = Layer.mergeAll(
      SWEBenchTaskServiceLive,
      SWEBenchEvaluationScriptServiceLive,
      DockerBuildManagerServiceLive,
      SWEBenchEnvironmentSetupServiceLive,
      AgentPatchGeneratorServiceLive,
      SWEBenchLifecycleServiceLive,
      SWEBenchHarnessServiceLive
    ).pipe(
      Layer.provide(Layer.merge(BaseServicesLayer, AIServicesLayer))
    );

    // Run the program
    await NodeRuntime.runMain(
      mainProgram.pipe(
        Effect.provide(CLISWEBenchLayer),
        Effect.tapError(error => 
          Effect.sync(() => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
          })
        )
      )
    );
  } catch (error) {
    console.error('Failed to initialize batch runner:', error);
    process.exit(1);
  }
}

// Execute the batch runner
runBatch().catch(error => {
  console.error('Failed to start batch runner:', error);
  process.exit(1);
});