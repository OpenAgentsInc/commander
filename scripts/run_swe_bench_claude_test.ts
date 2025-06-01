#!/usr/bin/env tsx
/**
 * Simplified SWE-bench test runner for Claude Code agent
 * This version runs evaluations in separate processes to avoid runtime initialization issues
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TaskResult {
  instance_id: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}

async function listTaskIds(tasksDir: string): Promise<string[]> {
  const files = await fs.readdir(tasksDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

async function runSingleTask(instanceId: string, outputDir: string): Promise<TaskResult> {
  console.log(`\n📋 Running task: ${instanceId}`);
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const child = spawn('tsx', [
      path.join(__dirname, 'run-swebench-task-simple.ts'),
      instanceId,
      '--patch_source', 'agent:claude_code',
      '--output_dir', outputDir
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        CLAUDE_CODE_PROVIDER_ENABLED: 'true',
        SWE_BENCH_DATASET_PATH: path.join(process.cwd(), 'assets/swe_bench_data'),
        SWE_BENCH_USE_ENHANCED_DOCKERFILE: 'true'
      }
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        console.log(`✅ Task ${instanceId} completed successfully (${Math.round(duration/1000)}s)`);
        resolve({ instance_id: instanceId, success: true, duration_ms: duration });
      } else {
        console.log(`❌ Task ${instanceId} failed with code ${code} (${Math.round(duration/1000)}s)`);
        resolve({ 
          instance_id: instanceId, 
          success: false, 
          error: `Process exited with code ${code}`,
          duration_ms: duration 
        });
      }
    });

    child.on('error', (err) => {
      const duration = Date.now() - startTime;
      console.error(`❌ Task ${instanceId} failed with error: ${err.message}`);
      resolve({ 
        instance_id: instanceId, 
        success: false, 
        error: err.message,
        duration_ms: duration 
      });
    });
  });
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'swebench-results', `claude-code-test-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });

  console.log('=== SWE-bench Claude Code Agent Test Run ===');
  console.log(`Output Directory: ${outputDir}`);
  console.log('');

  const tasksDir = path.join(process.cwd(), 'assets/swe_bench_data');
  const allTasks = await listTaskIds(tasksDir);
  const tasksToRun = allTasks.slice(0, 5); // Take first 5 tasks

  console.log(`Found ${allTasks.length} tasks total, running ${tasksToRun.length} for test`);
  console.log(`Tasks: ${tasksToRun.join(', ')}`);
  console.log('');

  const results: TaskResult[] = [];
  
  for (const taskId of tasksToRun) {
    const result = await runSingleTask(taskId, outputDir);
    results.push(result);
  }

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_tasks: tasksToRun.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    tasks: results,
    total_duration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0)
  };

  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n=== Test Run Summary ===');
  console.log(`Total tasks: ${summary.total_tasks}`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total duration: ${Math.round(summary.total_duration_ms / 1000)}s`);
  console.log(`\nResults saved to: ${outputDir}`);
}

main().catch(console.error);