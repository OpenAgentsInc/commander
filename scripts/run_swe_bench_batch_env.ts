#!/usr/bin/env tsx
/**
 * Batch runner for SWE-Bench task evaluation (Environment Variable Version).
 * 
 * This version uses environment variables for configuration to avoid layer composition issues.
 * Set SWE_BENCH_DATASET_PATH environment variable to the task directory.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Exit, Cause, Console, pipe, NodeRuntime } from 'effect';

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
  .description('Run SWE-Bench tasks in batch mode (env var version)')
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

async function ensureOutputDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = options.output_dir || path.join(process.cwd(), 'swebench-results', `run-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

async function listTaskIds(tasksDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(tasksDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    console.error(`Failed to read tasks directory: ${error}`);
    return [];
  }
}

async function loadTask(tasksDir: string, instanceId: string): Promise<any> {
  const filePath = path.join(tasksDir, `${instanceId}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function runBatch() {
  const outputDir = await ensureOutputDir();
  console.log(`Results will be saved to: ${outputDir}`);
  console.log(`Loading tasks from: ${options.tasks_dir}`);
  
  // Get all available task IDs
  let allTaskIds = await listTaskIds(options.tasks_dir);

  // Filter by instance_ids if provided
  if (options.instance_ids) {
    const specifiedIds = options.instance_ids.split(',').map(id => id.trim());
    allTaskIds = allTaskIds.filter(id => specifiedIds.includes(id));
    
    if (allTaskIds.length === 0) {
      console.error('No matching instance IDs found!');
      return;
    }
  }

  // Limit tasks if max_tasks is specified
  let tasksToRun = allTaskIds;
  if (options.max_tasks !== undefined && options.max_tasks < tasksToRun.length) {
    tasksToRun = tasksToRun.slice(0, options.max_tasks);
  }

  console.log(`Found ${allTaskIds.length} tasks. Will attempt to run ${tasksToRun.length} tasks.`);

  // Initialize counters and results
  const results: Array<{ instanceId: string; result: any }> = [];
  let tasksSucceeded = 0;
  let tasksFailed = 0;
  let tasksSkipped = 0;

  // Import the harness dynamically to ensure env vars are set
  const { FullSWEBenchHarnessLayer } = await import('../src/services/swe_bench_harness/example-layer-composition');
  const { SWEBenchHarnessService } = await import('../src/services/swe_bench_harness');

  // Process each task
  for (const instanceId of tasksToRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Evaluating task: ${instanceId}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // Load task details
      const task = await loadTask(options.tasks_dir, instanceId);

      // Parse patch source
      let patchSource: any;
      if (options.patch_source === "gold") {
        patchSource = { type: "gold" };
        console.log("✓ Using gold patch from task data");
      } else if (options.patch_source === "empty") {
        patchSource = { type: "empty" };
        console.log("ℹ️  Using empty patch");
      } else if (options.patch_source.startsWith("agent:")) {
        const providerKey = options.patch_source.substring(6);
        patchSource = { type: "agent_generated", providerKey };
        console.log(`🤖 Using agent-generated patch from provider: ${providerKey}`);
      } else {
        console.error(`❌ Invalid patch source: ${options.patch_source}`);
        tasksFailed++;
        continue;
      }

      // Create evaluation program
      const evaluationProgram = Effect.gen(function* (_) {
        const harness = yield* _(SWEBenchHarnessService);
        return yield* _(harness.evaluateTask(instanceId, patchSource));
      });

      // Run evaluation
      const result = await Effect.runPromiseExit(
        evaluationProgram.pipe(Effect.provide(FullSWEBenchHarnessLayer))
      );

      if (Exit.isSuccess(result)) {
        const evalResult = result.value;
        const resolved = evalResult.report.resolved;
        
        console.log(`\n📊 Task Results:`);
        console.log(`   Resolved: ${resolved ? '✅ YES' : '❌ NO'}`);
        console.log(`   Patch Source: ${evalResult.patch_source_type}`);
        
        results.push({ instanceId, result: evalResult });
        
        if (resolved) {
          tasksSucceeded++;
        } else {
          tasksFailed++;
        }
      } else {
        const error = Cause.squash(result.cause);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error(`\n❌ Task failed with error: ${errorMessage}`);
        results.push({ 
          instanceId, 
          result: { error: errorMessage } 
        });
        tasksFailed++;
        
        if (options.stop_on_failure) {
          console.log("\n🛑 Stopping due to --stop_on_failure");
          break;
        }
      }

      // Save individual result
      const resultFilePath = path.join(outputDir, `${instanceId.replace(/[/:]/g, '__')}_eval_result.json`);
      await fs.writeFile(resultFilePath, JSON.stringify(results[results.length - 1], null, 2));

    } catch (error) {
      console.error(`\n❌ Unexpected error processing task ${instanceId}:`, error);
      tasksFailed++;
      
      if (options.stop_on_failure) {
        console.log("\n🛑 Stopping due to --stop_on_failure");
        break;
      }
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 Batch Evaluation Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total tasks attempted: ${tasksToRun.length}`);
  console.log(`✅ Succeeded (resolved): ${tasksSucceeded}`);
  console.log(`❌ Failed (not resolved or error): ${tasksFailed}`);
  console.log(`⏭️  Skipped: ${tasksSkipped}`);
  console.log(`\n📁 Full results saved in: ${outputDir}`);

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
  
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

// Note: This script has been refactored to use Effect for better telemetry
// The original implementation is preserved here for compatibility
// For the new Effect-based version with telemetry, use run_swe_bench_batch_env_effect.ts

// Run the batch processor
runBatch().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error('\n💡 Consider using run_swe_bench_batch_env_effect.ts for better telemetry and logging');
  process.exit(1);
});