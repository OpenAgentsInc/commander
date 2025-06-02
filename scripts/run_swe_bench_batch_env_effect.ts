#!/usr/bin/env tsx
/**
 * Batch runner for SWE-Bench task evaluation (Effect Version).
 * 
 * This version uses Effect for structured error handling and telemetry.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Exit, Cause, Console, pipe, Layer, Context, Runtime } from 'effect';
import { NodeRuntime } from '@effect/platform-node';
import { TelemetryService } from '../src/services/telemetry';
import { SWEBenchHarnessService } from '../src/services/swe_bench_harness';

interface BatchOptions {
  tasks_dir: string;
  instance_ids?: string;
  max_tasks?: number;
  output_dir?: string;
  patch_source: string;
  stop_on_failure: boolean;
}

const program = new Command();
program
  .name('run_swe_bench_batch_env')
  .description('Run SWE-Bench tasks in batch mode (Effect version)')
  .option('--tasks_dir <path>', 'Directory containing task JSON files', 'assets/swe_bench_data')
  .option('--instance_ids <ids>', 'Comma-separated list of instance IDs to run')
  .option('--max_tasks <N>', 'Maximum number of tasks to run', (val) => parseInt(val, 10))
  .option('--output_dir <path>', 'Directory to save evaluation results')
  .option('--patch_source <type>', 'Patch source type: gold, empty, or agent:<provider_key> (e.g., agent:claude_code)', 'gold')
  .option('--stop_on_failure', 'Stop batch execution on the first task failure', false);

program.parse(process.argv);
const options = program.opts() as BatchOptions;

// Set environment variables for the harness
process.env.SWE_BENCH_DATASET_PATH = path.resolve(options.tasks_dir);
process.env.SWE_BENCH_USE_ENHANCED_DOCKERFILE = 'true';

const ensureOutputDir = Effect.gen(function* (_) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = options.output_dir || path.join(process.cwd(), 'swebench-results', `run-${timestamp}`);
  yield* _(Effect.tryPromise(() => fs.mkdir(outputDir, { recursive: true })));
  return outputDir;
});

const listTaskIds = (tasksDir: string) => Effect.gen(function* (_) {
  const files = yield* _(Effect.tryPromise(() => fs.readdir(tasksDir)));
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
});

const loadTask = (tasksDir: string, instanceId: string) => Effect.gen(function* (_) {
  const filePath = path.join(tasksDir, `${instanceId}.json`);
  const content = yield* _(Effect.tryPromise(() => fs.readFile(filePath, 'utf-8')));
  return JSON.parse(content);
});

const runBatch = Effect.gen(function* (_) {
  const telemetry = yield* _(TelemetryService);
  const harness = yield* _(SWEBenchHarnessService);
  
  // Log batch start
  yield* _(telemetry.trackEvent({
    category: "swe_bench:batch",
    action: "batch_start",
    label: "batch_runner",
    context: { options },
    level: "info"
  }).pipe(Effect.catchAll(() => Effect.void)));
  
  const outputDir = yield* _(ensureOutputDir);
  yield* _(Console.log(`Results will be saved to: ${outputDir}`));
  yield* _(Console.log(`Loading tasks from: ${options.tasks_dir}`));
  
  // Get all available task IDs
  let allTaskIds = yield* _(listTaskIds(options.tasks_dir));

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
  for (const [index, instanceId] of tasksToRun.entries()) {
    yield* _(Console.log(`\n🔄 [${index + 1}/${tasksToRun.length}] Processing task: ${instanceId}`));
    
    // Log task start
    yield* _(telemetry.trackEvent({
      category: "swe_bench:batch",
      action: "task_start",
      label: instanceId,
      context: { index, total: tasksToRun.length },
      level: "info"
    }).pipe(Effect.catchAll(() => Effect.void)));

    try {
      const task = yield* _(loadTask(options.tasks_dir, instanceId));
      
      // Run the task evaluation
      const result = yield* _(harness.evaluateTask(instanceId, options.patch_source).pipe(
        Effect.map(evaluationResult => {
          // Save individual result
          const resultPath = path.join(outputDir, `${instanceId}_eval_result.json`);
          fs.writeFileSync(resultPath, JSON.stringify(evaluationResult, null, 2));
          
          return evaluationResult;
        }),
        Effect.tap(evaluationResult => Effect.gen(function* (_) {
          if (evaluationResult.report.resolved) {
            yield* _(Console.log(`✅ ${instanceId}: RESOLVED`));
            tasksSucceeded++;
          } else {
            yield* _(Console.log(`❌ ${instanceId}: NOT RESOLVED`));
            tasksFailed++;
          }
          
          // Log task result
          yield* _(telemetry.trackEvent({
            category: "swe_bench:batch",
            action: "task_complete",
            label: instanceId,
            context: { 
              resolved: evaluationResult.report.resolved,
              patch_source: options.patch_source
            },
            level: "info"
          }).pipe(Effect.catchAll(() => Effect.void)));
        })),
        Effect.catchAll(error => Effect.gen(function* (_) {
          yield* _(Console.error(`❌ ${instanceId}: Evaluation failed: ${error}`));
          tasksFailed++;
          
          // Log task failure
          yield* _(telemetry.trackEvent({
            category: "swe_bench:batch",
            action: "task_failed",
            label: instanceId,
            value: String(error),
            level: "error"
          }).pipe(Effect.catchAll(() => Effect.void)));
          
          if (options.stop_on_failure) {
            return Effect.fail(error);
          }
          return Effect.succeed({ report: { resolved: false }, error: String(error) });
        }))
      ));
      
      results.push({ instanceId, result });
      
    } catch (error) {
      yield* _(Console.error(`❌ ${instanceId}: Failed to load task: ${error}`));
      tasksSkipped++;
      
      yield* _(telemetry.trackEvent({
        category: "swe_bench:batch",
        action: "task_skipped",
        label: instanceId,
        value: String(error),
        level: "error"
      }).pipe(Effect.catchAll(() => Effect.void)));
    }
  }

  // Print summary
  yield* _(Console.log('\n' + '='.repeat(60)));
  yield* _(Console.log('📊 BATCH RUN SUMMARY'));
  yield* _(Console.log('='.repeat(60)));
  yield* _(Console.log(`Total tasks attempted: ${tasksToRun.length}`));
  yield* _(Console.log(`✅ Succeeded (resolved): ${tasksSucceeded}`));
  yield* _(Console.log(`❌ Failed (not resolved): ${tasksFailed}`));
  yield* _(Console.log(`⏭️  Skipped (load error): ${tasksSkipped}`));
  yield* _(Console.log(`📁 Results saved to: ${outputDir}`));
  yield* _(Console.log('='.repeat(60)));

  // Save summary to file
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
  
  yield* _(Effect.tryPromise(() => fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))));
  
  // Log batch complete
  yield* _(telemetry.trackEvent({
    category: "swe_bench:batch",
    action: "batch_complete",
    label: "batch_runner",
    context: { 
      tasks_attempted: tasksToRun.length,
      tasks_succeeded: tasksSucceeded,
      tasks_failed: tasksFailed,
      tasks_skipped: tasksSkipped
    },
    level: "info"
  }).pipe(Effect.catchAll(() => Effect.void)));
});

// Import the CLI-specific harness layer
import('../src/services/swe_bench_harness/cli-layer-composition').then(({ CLISWEBenchHarnessLayer }) => {
  // Run the batch processor with the CLI-specific layer
  NodeRuntime.runMain(
    runBatch.pipe(Effect.provide(CLISWEBenchHarnessLayer))
  );
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});