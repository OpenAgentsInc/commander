#!/usr/bin/env tsx
/**
 * CLI runner for SWE-Bench evaluation
 * Compatible with the UI's IPC handler expectations
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Effect, Console } from 'effect';
import { PatchGenerationCliLayer } from '../src/services/swe_bench_harness/layers/SWEBenchCliLayer';
import { 
  AgentPatchGeneratorService, 
  SWEBenchTaskService,
  type SWEBenchTask 
} from '../src/services/swe_bench_harness';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  .name('run-swebench-cli')
  .description('Run SWE-Bench evaluation')
  .option('--tasks_dir <path>', 'Directory containing task JSON files', 'assets/swe_bench_data')
  .option('--instance_ids <ids>', 'Comma-separated list of instance IDs to run')
  .option('--max_tasks <N>', 'Maximum number of tasks to run', (val) => parseInt(val, 10))
  .option('--output_dir <path>', 'Directory to save evaluation results')
  .option('--patch_source <type>', 'Patch source type: gold, empty, or agent:<provider_key>', 'agent:claude_code')
  .option('--stop_on_failure', 'Stop batch execution on the first task failure', false);

program.parse(process.argv);
const options = program.opts() as BatchOptions;

// Set environment variables
process.env.SWE_BENCH_DATASET_PATH = path.resolve(options.tasks_dir);

// Output directory
const outputDir = options.output_dir || `./swebench-results/cli-${Date.now()}`;

interface TaskResult {
  instanceId: string;
  success: boolean;
  patchGenerated: boolean;
  error?: string;
  duration: number;
}

async function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function evaluateTask(
  task: SWEBenchTask,
  patchSource: string,
  patchGenerator: any
): Promise<{ success: boolean; patch?: string }> {
  try {
    // Handle different patch sources
    if (patchSource === "gold") {
      // Use the gold patch from the task
      return { success: true, patch: task.patch };
    } else if (patchSource === "empty") {
      // Use empty patch
      return { success: true, patch: "" };
    } else if (patchSource.startsWith("agent:")) {
      // Generate patch using agent
      const providerKey = patchSource.substring(6);
      await log(`Generating patch with ${providerKey}...`);
      
      const patch = await Effect.runPromise(
        patchGenerator.generatePatch(task, outputDir, providerKey)
      );
      
      return { success: true, patch };
    } else {
      throw new Error(`Unknown patch source: ${patchSource}`);
    }
  } catch (error) {
    return { success: false };
  }
}

const mainProgram = Effect.gen(function* () {
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  yield* Console.log(`Starting SWE-bench evaluation`);
  yield* Console.log(`Output directory: ${outputDir}`);
  
  // Create output directory
  yield* Effect.tryPromise(() => fs.mkdir(outputDir, { recursive: true }));
  
  // Get task IDs
  let taskIds: string[];
  if (options.instance_ids) {
    taskIds = options.instance_ids.split(',').map(id => id.trim());
    yield* Console.log(`Running specific tasks: ${taskIds.join(', ')}`);
  } else {
    taskIds = yield* taskService.listAvailableTaskIds();
    yield* Console.log(`Found ${taskIds.length} tasks`);
    
    if (options.max_tasks && options.max_tasks < taskIds.length) {
      taskIds = taskIds.slice(0, options.max_tasks);
      yield* Console.log(`Limited to ${options.max_tasks} tasks`);
    }
  }
  
  const results: TaskResult[] = [];
  let successCount = 0;
  
  // Process each task
  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const startTime = Date.now();
    
    yield* Console.log(`\n${"=".repeat(60)}`);
    yield* Console.log(`[${i + 1}/${taskIds.length}] Evaluating: ${taskId}`);
    
    const result: TaskResult = {
      instanceId: taskId,
      success: false,
      patchGenerated: false,
      duration: 0
    };
    
    try {
      // Load task
      const task = yield* taskService.getTask(taskId);
      yield* Console.log(`Repo: ${task.repo}`);
      
      // Get patch based on source
      const evalResult = yield* Effect.tryPromise(() => 
        evaluateTask(task, options.patch_source, patchGenerator)
      );
      
      if (evalResult.success && evalResult.patch) {
        result.patchGenerated = true;
        
        // Save patch
        const patchFile = path.join(outputDir, `${taskId}.patch`);
        yield* Effect.tryPromise(() => 
          fs.writeFile(patchFile, evalResult.patch!)
        );
        
        // For now, we consider patch generation as success
        // Real Docker evaluation would go here
        result.success = true;
        successCount++;
        
        yield* Console.log(`✅ Success`);
      } else {
        yield* Console.log(`❌ Failed`);
      }
      
    } catch (error) {
      result.error = String(error);
      yield* Console.log(`❌ Error: ${result.error}`);
      
      if (options.stop_on_failure) {
        yield* Console.log("Stopping due to --stop_on_failure");
        break;
      }
    }
    
    result.duration = Date.now() - startTime;
    results.push(result);
    
    // Save progress
    yield* Effect.tryPromise(() =>
      fs.writeFile(
        path.join(outputDir, 'progress.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          completed: i + 1,
          total: taskIds.length,
          passed: successCount,
          results
        }, null, 2)
      )
    );
  }
  
  // Final summary
  const summary = {
    timestamp: new Date().toISOString(),
    tasks_attempted: results.length,
    tasks_succeeded: successCount,
    tasks_failed: results.length - successCount,
    success_rate: (successCount / results.length * 100).toFixed(1) + '%',
    results
  };
  
  yield* Effect.tryPromise(() =>
    fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    )
  );
  
  yield* Console.log(`\n${"=".repeat(60)}`);
  yield* Console.log("📊 Evaluation Summary");
  yield* Console.log(`${"=".repeat(60)}`);
  yield* Console.log(`Total tasks: ${results.length}`);
  yield* Console.log(`Succeeded: ${successCount}`);
  yield* Console.log(`Failed: ${results.length - successCount}`);
  yield* Console.log(`Success rate: ${summary.success_rate}`);
  yield* Console.log(`\nResults saved to: ${outputDir}`);
  
  return summary;
});

// Run the evaluation
Effect.runPromise(
  mainProgram.pipe(Effect.provide(PatchGenerationCliLayer))
)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });