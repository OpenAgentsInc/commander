#!/usr/bin/env tsx
/**
 * CLI runner for SWE-Bench task evaluation using proper service layers.
 * This uses a CLI-specific layer composition to avoid browser dependencies.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Exit, Cause, Console, pipe } from 'effect';

// Import the CLI-specific layer and harness service
import { CLISWEBenchHarnessLayer } from '../src/services/swe_bench_harness/cli-layer-composition';
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
  .name('run_swe_bench_cli')
  .description('Run SWE-Bench tasks using CLI service layers')
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

// Global telemetry logger
let logStream: fs.FileHandle | null = null;
let telemetryPath: string = '';

async function log(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);
  
  if (logStream) {
    await logStream.write(`${logLine}\n`);
  }
}

async function ensureOutputDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let outputDir: string;
  
  if (options.output_dir) {
    // If output_dir is provided and doesn't start with swebench-results/, prepend it
    if (!options.output_dir.startsWith('swebench-results/') && !path.isAbsolute(options.output_dir)) {
      outputDir = path.join(process.cwd(), 'swebench-results', options.output_dir);
    } else {
      outputDir = path.isAbsolute(options.output_dir) ? options.output_dir : path.join(process.cwd(), options.output_dir);
    }
  } else {
    outputDir = path.join(process.cwd(), 'swebench-results', `cli-run-${timestamp}`);
  }
  
  await fs.mkdir(outputDir, { recursive: true });
  
  // Initialize telemetry logging
  telemetryPath = path.join(outputDir, 'telemetry.log');
  logStream = await fs.open(telemetryPath, 'w');
  
  return outputDir;
}

async function listTaskIds(tasksDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(tasksDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
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
  
  await log(`=== SWE-Bench CLI Batch Evaluation Run ===`);
  await log(`Run ID: ${path.basename(outputDir)}`);
  await log(`Results directory: ${outputDir}`);
  await log(`Telemetry log: ${telemetryPath}`);
  await log(`Tasks directory: ${path.resolve(options.tasks_dir)}`);
  await log(`Patch source: ${options.patch_source}`);
  
  // Get all available task IDs
  let allTaskIds = await listTaskIds(path.resolve(options.tasks_dir));
  await log(`Found ${allTaskIds.length} total tasks in directory`);
  
  if (allTaskIds.length > 0) {
    await log(`Available tasks: ${allTaskIds.join(', ')}`);
  }

  // Filter by instance_ids if provided
  if (options.instance_ids) {
    const specifiedIds = options.instance_ids.split(',').map(id => id.trim());
    await log(`Filtering by specified IDs: ${specifiedIds.join(', ')}`);
    
    const originalCount = allTaskIds.length;
    allTaskIds = allTaskIds.filter(id => specifiedIds.includes(id));
    
    if (allTaskIds.length === 0) {
      await log(`ERROR: No matching instance IDs found!`);
      await log(`Requested ${specifiedIds.length} IDs: ${specifiedIds.join(', ')}`);
      await log(`Available ${originalCount} IDs in directory`);
      await log(`Check that your task IDs match exactly (case-sensitive)`);
      
      if (logStream) {
        await logStream.close();
      }
      return;
    }
    
    await log(`Matched ${allTaskIds.length} tasks: ${allTaskIds.join(', ')}`);
  }

  // Limit tasks if max_tasks is specified
  let tasksToRun = allTaskIds;
  if (options.max_tasks !== undefined && options.max_tasks < tasksToRun.length) {
    tasksToRun = tasksToRun.slice(0, options.max_tasks);
    await log(`Limited to first ${options.max_tasks} tasks`);
  }

  await log(`Will evaluate ${tasksToRun.length} tasks: ${tasksToRun.join(', ')}`);

  // Initialize counters and results
  const results: Array<{ instanceId: string; result: any }> = [];
  let tasksSucceeded = 0;
  let tasksFailed = 0;
  let tasksSkipped = 0;

  // Process each task
  for (const instanceId of tasksToRun) {
    await log(`\n${'='.repeat(60)}`);
    await log(`Evaluating task: ${instanceId}`);
    await log(`${'='.repeat(60)}`);

    try {
      // Load task details
      const task = await loadTask(path.resolve(options.tasks_dir), instanceId);

      // Parse patch source
      let patchSource: any;
      if (options.patch_source === "gold") {
        patchSource = { type: "gold" };
        await log("✓ Using gold patch from task data");
      } else if (options.patch_source === "empty") {
        patchSource = { type: "empty" };
        await log("ℹ️  Using empty patch");
      } else if (options.patch_source.startsWith("agent:")) {
        const providerKey = options.patch_source.substring(6);
        patchSource = { type: "agent_generated", providerKey };
        await log(`🤖 Using agent-generated patch from provider: ${providerKey}`);
      } else {
        await log(`❌ Invalid patch source: ${options.patch_source}`);
        tasksFailed++;
        continue;
      }

      // Create evaluation program
      const evaluationProgram = Effect.gen(function* (_) {
        const harness = yield* _(SWEBenchHarnessService);
        return yield* _(harness.evaluateTask(instanceId, patchSource));
      });

      // Run evaluation with CLI-specific layer
      await log(`Starting Docker container for ${instanceId}...`);
      const result = await Effect.runPromiseExit(
        evaluationProgram.pipe(Effect.provide(CLISWEBenchHarnessLayer))
      );

      if (Exit.isSuccess(result)) {
        const evalResult = result.value;
        const resolved = evalResult.report.resolved;
        
        await log(`\n📊 Task Results:`);
        await log(`   Instance ID: ${instanceId}`);
        await log(`   Resolved: ${resolved ? '✅ YES' : '❌ NO'}`);
        await log(`   Patch Source: ${evalResult.patch_source_type}`);
        
        results.push({ instanceId, result: evalResult });
        
        if (resolved) {
          tasksSucceeded++;
        } else {
          tasksFailed++;
        }
      } else {
        const error = Cause.squash(result.cause);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        await log(`\n❌ Task failed with error: ${errorMessage}`);
        results.push({ 
          instanceId, 
          result: { error: errorMessage } 
        });
        tasksFailed++;
        
        if (options.stop_on_failure) {
          await log("\n🛑 Stopping due to --stop_on_failure");
          break;
        }
      }

      // Save individual result
      const resultFilePath = path.join(outputDir, `${instanceId.replace(/[/:]/g, '__')}_eval_result.json`);
      await fs.writeFile(resultFilePath, JSON.stringify(results[results.length - 1], null, 2));

    } catch (error) {
      await log(`\n❌ Unexpected error processing task ${instanceId}: ${error}`);
      tasksFailed++;
      
      if (options.stop_on_failure) {
        await log("\n🛑 Stopping due to --stop_on_failure");
        break;
      }
    }
  }

  // Print summary
  await log(`\n${'='.repeat(60)}`);
  await log('📈 Batch Evaluation Summary');
  await log(`${'='.repeat(60)}`);
  await log(`Total tasks attempted: ${tasksToRun.length}`);
  await log(`✅ Succeeded (resolved): ${tasksSucceeded}`);
  await log(`❌ Failed (not resolved or error): ${tasksFailed}`);
  await log(`⏭️  Skipped: ${tasksSkipped}`);
  await log(`\n📁 Full results saved in: ${outputDir}`);
  await log(`📋 Telemetry log saved to: ${telemetryPath}`);

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
  
  // Close telemetry log
  if (logStream) {
    await log(`\n=== End of Evaluation Run ===`);
    await logStream.close();
  }
}

// Run the batch processor
runBatch().catch(async error => {
  await log(`\n❌ Fatal error: ${error}`);
  if (logStream) {
    await logStream.close();
  }
  process.exit(1);
});