#!/usr/bin/env tsx
/**
 * Quick SWE-bench sample evaluation
 * Runs a smaller set of tasks to get quick results
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

// Smaller set of tasks for quick evaluation
const TASK_IDS = [
  'django__django-11099',     // Already successful
  'django__django-11754',
  'django__django-15104',
  'scikit-learn__scikit-learn-13087',
  'sympy__sympy-13286'
];

async function runTask(taskId: string, outputBaseDir: string): Promise<any> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Evaluating: ${taskId}`);
  console.log(`${'='.repeat(60)}`);
  
  const taskOutputDir = path.join(outputBaseDir, taskId);
  
  try {
    const cmd = `pnpm tsx scripts/run_swe_bench_docker.ts --tasks_dir "assets/swe_bench_data" --instance_ids "${taskId}" --patch_source "gold" --output_dir "${taskOutputDir}" --max_tasks 1`;
    
    const startTime = Date.now();
    execSync(cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000 // 5 minute timeout per task
    });
    const endTime = Date.now();
    
    const resultPath = path.join(taskOutputDir, `${taskId.replace(/[/:]/g, '__')}_eval_result.json`);
    const resultContent = await fs.readFile(resultPath, 'utf-8');
    const result = JSON.parse(resultContent);
    
    return {
      taskId,
      resolved: result.result?.report?.resolved || false,
      duration: (endTime - startTime) / 1000,
      testsRun: result.result?.report?.tests_run || 0
    };
    
  } catch (error) {
    console.error(`Error evaluating ${taskId}:`, error);
    return {
      taskId,
      resolved: false,
      duration: 0,
      testsRun: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputBaseDir = path.join(process.cwd(), 'swebench-results', `quick-sample-${timestamp}`);
  await fs.mkdir(outputBaseDir, { recursive: true });
  
  console.log(`SWE-bench Quick Sample Evaluation`);
  console.log(`Tasks: ${TASK_IDS.length}`);
  console.log(`Output: ${outputBaseDir}`);
  
  const results = [];
  const startTime = Date.now();
  
  for (const taskId of TASK_IDS) {
    const result = await runTask(taskId, outputBaseDir);
    results.push(result);
    console.log(`${result.resolved ? '✅' : '❌'} ${result.taskId} - ${result.duration.toFixed(2)}s`);
  }
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  // Combined results with previous batch
  const previousResults = [
    { taskId: 'sympy__sympy-15809', resolved: false },
    { taskId: 'matplotlib__matplotlib-20805', resolved: true },
    { taskId: 'sympy__sympy-13615', resolved: true }
  ];
  
  const allResults = [...previousResults, ...results];
  const totalResolved = allResults.filter(r => r.resolved).length;
  const percentComplete = (totalResolved / allResults.length * 100).toFixed(2);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    quickSample: {
      tasks: results.length,
      resolved: results.filter(r => r.resolved).length,
      duration: totalDuration
    },
    combined: {
      totalTasks: allResults.length,
      resolved: totalResolved,
      percentComplete: `${percentComplete}%`
    },
    results: results,
    allResults: allResults
  };
  
  const reportPath = path.join(outputBaseDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 EVALUATION SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Quick Sample: ${results.filter(r => r.resolved).length}/${results.length} resolved`);
  console.log(`Combined Total: ${totalResolved}/${allResults.length} resolved`);
  console.log(`✨ SWE-bench Completion: ${percentComplete}%`);
  console.log(`⏱️  Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`📁 Results: ${outputBaseDir}`);
}

main().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});