#!/usr/bin/env tsx
/**
 * Full SWE-bench batch evaluation runner
 * Runs multiple tasks and generates comprehensive reports
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// Task IDs to evaluate
const TASK_IDS = [
  'sympy__sympy-15809',
  'matplotlib__matplotlib-20805',
  'sympy__sympy-13615',
  'sympy__sympy-24152',
  'sympy__sympy-13286',
  'django__django-16920',
  'django__django-15104',
  'django__django-16801',
  'scikit-learn__scikit-learn-13087',
  'django__django-11754',
  'django__django-11099' // Include our successful test
];

async function runTask(taskId: string, outputBaseDir: string): Promise<any> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Starting evaluation for: ${taskId}`);
  console.log(`${'='.repeat(80)}`);
  
  const taskOutputDir = path.join(outputBaseDir, taskId);
  
  try {
    // Run the Docker evaluation with gold patch
    const cmd = `pnpm tsx scripts/run_swe_bench_docker.ts --tasks_dir "assets/swe_bench_data" --instance_ids "${taskId}" --patch_source "gold" --output_dir "${taskOutputDir}" --max_tasks 1`;
    
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Read the result
    const resultPath = path.join(taskOutputDir, `${taskId.replace(/[/:]/g, '__')}_eval_result.json`);
    const resultContent = await fs.readFile(resultPath, 'utf-8');
    const result = JSON.parse(resultContent);
    
    return {
      taskId,
      resolved: result.result?.report?.resolved || false,
      duration: result.result?.report?.duration || 0,
      error: result.result?.error || null
    };
    
  } catch (error) {
    console.error(`Error evaluating ${taskId}:`, error);
    return {
      taskId,
      resolved: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputBaseDir = path.join(process.cwd(), 'swebench-results', `full-batch-${timestamp}`);
  await fs.mkdir(outputBaseDir, { recursive: true });
  
  console.log(`Starting full SWE-bench batch evaluation`);
  console.log(`Tasks to evaluate: ${TASK_IDS.length}`);
  console.log(`Output directory: ${outputBaseDir}`);
  
  const results = [];
  const startTime = Date.now();
  
  // Run tasks sequentially to avoid resource contention
  for (const taskId of TASK_IDS) {
    const result = await runTask(taskId, outputBaseDir);
    results.push(result);
    
    // Save intermediate results
    const summaryPath = path.join(outputBaseDir, 'batch-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTasks: TASK_IDS.length,
      completedTasks: results.length,
      results: results
    }, null, 2));
  }
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  // Calculate statistics
  const resolved = results.filter(r => r.resolved).length;
  const failed = results.filter(r => !r.resolved).length;
  const percentComplete = (resolved / results.length * 100).toFixed(2);
  
  // Generate final report
  const finalReport = {
    timestamp: new Date().toISOString(),
    totalTasks: results.length,
    resolved: resolved,
    failed: failed,
    percentComplete: `${percentComplete}%`,
    totalDuration: totalDuration,
    averageDuration: totalDuration / results.length,
    results: results
  };
  
  const reportPath = path.join(outputBaseDir, 'final-report.json');
  await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
  
  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('🎉 FULL BATCH EVALUATION COMPLETE');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total tasks: ${results.length}`);
  console.log(`✅ Resolved: ${resolved} (${percentComplete}%)`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total duration: ${totalDuration.toFixed(2)}s`);
  console.log(`📊 Average per task: ${(totalDuration / results.length).toFixed(2)}s`);
  console.log(`\n📁 Full results saved to: ${outputBaseDir}`);
  console.log(`📋 Final report: ${reportPath}`);
  
  // List individual results
  console.log(`\nIndividual Results:`);
  results.forEach(r => {
    const status = r.resolved ? '✅' : '❌';
    const duration = r.duration ? `${r.duration.toFixed(2)}s` : 'N/A';
    console.log(`  ${status} ${r.taskId} - ${duration}`);
  });
}

// Run the batch evaluation
main().catch(error => {
  console.error('Batch evaluation failed:', error);
  process.exit(1);
});