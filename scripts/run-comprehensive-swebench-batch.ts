#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Selected diverse task set from different repositories
const tasks = [
  // Django tasks (add to our existing 3)
  'django__django-11001',
  'django__django-11095',
  'django__django-11179',
  'django__django-11422',
  'django__django-11564',
  
  // SymPy tasks (add to our existing 2)
  'sympy__sympy-11818',
  'sympy__sympy-12171',
  'sympy__sympy-12236',
  'sympy__sympy-12419',
  'sympy__sympy-12454',
  
  // Scikit-learn tasks
  'scikit-learn__scikit-learn-10297',
  'scikit-learn__scikit-learn-10459',
  'scikit-learn__scikit-learn-10508',
  'scikit-learn__scikit-learn-10949',
  
  // Matplotlib tasks (add to our existing 1)
  'matplotlib__matplotlib-18669',
  'matplotlib__matplotlib-18869',
  'matplotlib__matplotlib-19743',
  
  // Pytest-dev tasks
  'pytest-dev__pytest-5103',
  'pytest-dev__pytest-5221',
  'pytest-dev__pytest-5227',
  
  // Astropy tasks (we have some patches)
  'astropy__astropy-6938',
  'astropy__astropy-7746',
  'astropy__astropy-12907'
];

const runId = `comprehensive-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = path.join(process.cwd(), 'swebench-results', runId);
fs.mkdirSync(outputDir, { recursive: true });

console.log(`🚀 Starting comprehensive SWE-bench evaluation`);
console.log(`📊 Evaluating ${tasks.length} tasks`);
console.log(`📁 Output directory: ${outputDir}`);
console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

const results: any[] = [];
const startTime = Date.now();

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  console.log(`\n[${ i + 1}/${tasks.length}] Evaluating ${task}...`);
  
  const taskOutputDir = path.join(outputDir, task);
  fs.mkdirSync(taskOutputDir, { recursive: true });
  
  try {
    const taskStartTime = Date.now();
    
    // Run the Docker evaluation
    execSync(`npx tsx scripts/run_swe_bench_docker.ts --instance_ids ${task} --patch_source gold --output_dir ${taskOutputDir}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const taskDuration = (Date.now() - taskStartTime) / 1000;
    
    // Read the evaluation result
    const evalResultPath = path.join(taskOutputDir, `${task}_eval_result.json`);
    if (fs.existsSync(evalResultPath)) {
      const evalResult = JSON.parse(fs.readFileSync(evalResultPath, 'utf-8'));
      results.push({
        taskId: task,
        resolved: evalResult.result?.report?.resolved || false,
        duration: taskDuration,
        details: evalResult.result?.report
      });
      
      console.log(`✅ ${task}: ${evalResult.result?.report?.resolved ? 'RESOLVED' : 'FAILED'} (${taskDuration.toFixed(2)}s)`);
    }
  } catch (error) {
    console.error(`❌ Failed to evaluate ${task}:`, error);
    results.push({
      taskId: task,
      resolved: false,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Save intermediate results
  const summary = generateSummary(results, i + 1, tasks.length, startTime);
  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
}

// Generate final comprehensive summary
const finalSummary = generateSummary(results, tasks.length, tasks.length, startTime);
fs.writeFileSync(
  path.join(outputDir, 'summary.json'),
  JSON.stringify(finalSummary, null, 2)
);

// Also update the main summary file
fs.writeFileSync(
  path.join(process.cwd(), 'swebench-results', 'comprehensive-evaluation-summary.json'),
  JSON.stringify(finalSummary, null, 2)
);

console.log('\n📊 Comprehensive Evaluation Complete!');
console.log(`✅ Resolved: ${finalSummary.stats.resolved}/${finalSummary.stats.total} (${finalSummary.stats.percentComplete}%)`);
console.log(`⏱️  Total time: ${finalSummary.performance.totalDuration} minutes`);

function generateSummary(results: any[], completed: number, total: number, startTime: number) {
  const resolved = results.filter(r => r.resolved).length;
  const byRepo: Record<string, any> = {};
  
  results.forEach(r => {
    const repo = r.taskId.split('__')[0];
    if (!byRepo[repo]) {
      byRepo[repo] = { total: 0, resolved: 0, tasks: [] };
    }
    byRepo[repo].total++;
    if (r.resolved) byRepo[repo].resolved++;
    byRepo[repo].tasks.push(r);
  });
  
  const repoStats = Object.entries(byRepo).map(([repo, stats]: [string, any]) => ({
    repository: repo,
    total: stats.total,
    resolved: stats.resolved,
    percentage: ((stats.resolved / stats.total) * 100).toFixed(1),
    tasks: stats.tasks
  }));
  
  const totalDuration = (Date.now() - startTime) / 1000 / 60; // minutes
  const avgDuration = results.length > 0 
    ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length 
    : 0;
  
  return {
    summary: "Comprehensive SWE-bench Evaluation Results",
    timestamp: new Date().toISOString(),
    runId,
    progress: {
      completed,
      total,
      percentageEvaluated: ((completed / total) * 100).toFixed(1)
    },
    stats: {
      total: results.length,
      resolved,
      failed: results.length - resolved,
      percentComplete: results.length > 0 ? ((resolved / results.length) * 100).toFixed(1) : 0
    },
    byRepository: repoStats,
    performance: {
      totalDuration: totalDuration.toFixed(2),
      averageTaskDuration: avgDuration.toFixed(2),
      tasksPerMinute: (results.length / totalDuration).toFixed(2)
    },
    results
  };
}