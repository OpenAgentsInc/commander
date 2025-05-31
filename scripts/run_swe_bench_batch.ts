#!/usr/bin/env tsx
/**
 * Batch runner for SWE-Bench task evaluation.
 * 
 * This script runs multiple SWE-Bench tasks in sequence using the Effect-TS harness.
 * It loads tasks from JSON files downloaded by download_swe_bench_tasks.py and
 * evaluates them using the configured Docker environment.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Exit, Cause, Console, pipe, Layer, Config } from 'effect';
import { NodeRuntime, NodeFileSystem } from '@effect/platform-node';
import {
  SWEBenchTaskService,
  SWEBenchHarnessService,
  type EvaluationResult,
  SWEBenchTaskServiceLive,
  SWEBenchEvaluationScriptServiceLive,
  SWEBenchLifecycleServiceLive,
  SWEBenchHarnessServiceLive,
  DockerBuildManagerServiceLive
} from '../src/services/swe_bench_harness';
import { ConfigurationServiceLive, ConfigurationService } from '../src/services/configuration';
import { TelemetryServiceLive, TelemetryServiceConfigTag } from '../src/services/telemetry';
import { DockerUtilsServiceLive } from '../src/services/docker';

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

const mainProgram = Effect.gen(function* (_) {
  const outputDir = yield* _(Effect.promise(() => ensureOutputDir()));
  yield* _(Console.log(`Results will be saved to: ${outputDir}`));

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
  const results: Array<{ instanceId: string; result: EvaluationResult | { error: string } }> = [];
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

// Create custom configuration that includes the dataset path
const customConfig = Layer.succeed(ConfigurationService, ConfigurationService.of({
  get: (key: string) => {
    if (key === 'SWE_BENCH_DATASET_PATH') {
      return Effect.succeed(path.resolve(options.tasks_dir));
    }
    // Provide defaults for other required configs
    if (key === 'OLLAMA_EMBEDDING_SERVICE_URL') {
      return Effect.succeed('http://localhost:11434');
    }
    if (key === 'TELEMETRY_ENABLED') {
      return Effect.succeed('false');
    }
    // For anything else, try environment variables
    return Config.string(key).pipe(
      Effect.orElse(() => Effect.succeed('')),
      Effect.mapError(() => ({
        _tag: 'ConfigError' as const,
        message: `Configuration key not found: ${key}`,
        key
      }))
    );
  }
}));

// Create telemetry config layer
const telemetryConfig = Layer.succeed(TelemetryServiceConfigTag, {
  enabled: false,
  logToConsole: false,
  logLevel: "error" as const
});

// Build the application layer
const BaseServicesLayer = Layer.mergeAll(
  customConfig,
  telemetryConfig,
  TelemetryServiceLive,
  NodeFileSystem.layer,
  DockerUtilsServiceLive
);

const AppLayer = SWEBenchHarnessServiceLive.pipe(
  Layer.provide(SWEBenchLifecycleServiceLive),
  Layer.provide(SWEBenchEvaluationScriptServiceLive),
  Layer.provide(SWEBenchTaskServiceLive),
  Layer.provide(DockerBuildManagerServiceLive),
  Layer.provide(BaseServicesLayer)
);

// Run the program with proper error handling
NodeRuntime.runMain(
  mainProgram.pipe(
    Effect.provide(AppLayer),
    Effect.tapError(error => 
      Effect.sync(() => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
      })
    )
  )
);