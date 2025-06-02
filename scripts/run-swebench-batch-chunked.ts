#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Selected diverse task set from different repositories
const allTasks = [
  // Django tasks
  'django__django-11001',
  'django__django-11095',
  'django__django-11179',
  'django__django-11422',
  'django__django-11564',
  
  // SymPy tasks  
  'sympy__sympy-11818',
  'sympy__sympy-12171',
  'sympy__sympy-12236',
  'sympy__sympy-12419',
  'sympy__sympy-12454',
  
  // Scikit-learn tasks
  'scikit-learn__scikit-learn-10297',
  'scikit-learn__scikit-learn-10459',
  
  // Matplotlib tasks
  'matplotlib__matplotlib-18669',
  'matplotlib__matplotlib-18869',
  
  // Pytest-dev tasks
  'pytest-dev__pytest-5103',
  'pytest-dev__pytest-5221',
  
  // Astropy tasks
  'astropy__astropy-6938',
  'astropy__astropy-7746',
  'astropy__astropy-12907'
];

const CHUNK_SIZE = 5; // Process 5 tasks at a time
const chunks = [];
for (let i = 0; i < allTasks.length; i += CHUNK_SIZE) {
  chunks.push(allTasks.slice(i, i + CHUNK_SIZE));
}

const runId = `chunked-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = path.join(process.cwd(), 'swebench-results', runId);
fs.mkdirSync(outputDir, { recursive: true });

console.log(`🚀 Starting chunked SWE-bench evaluation`);
console.log(`📊 Evaluating ${allTasks.length} tasks in ${chunks.length} chunks of ${CHUNK_SIZE}`);
console.log(`📁 Output directory: ${outputDir}`);
console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

const allResults: any[] = [];
const startTime = Date.now();

// Process each chunk
for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
  const chunk = chunks[chunkIdx];
  console.log(`\n📦 Processing chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length} tasks)`);
  
  for (let taskIdx = 0; taskIdx < chunk.length; taskIdx++) {
    const task = chunk[taskIdx];
    const globalIdx = chunkIdx * CHUNK_SIZE + taskIdx + 1;
    console.log(`\n[${globalIdx}/${allTasks.length}] Evaluating ${task}...`);
    
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
        allResults.push({
          taskId: task,
          resolved: evalResult.result?.report?.resolved || false,
          duration: taskDuration,
          details: evalResult.result?.report
        });
        
        console.log(`✅ ${task}: ${evalResult.result?.report?.resolved ? 'RESOLVED' : 'FAILED'} (${taskDuration.toFixed(2)}s)`);
      }
    } catch (error) {
      console.error(`❌ Failed to evaluate ${task}:`, error);
      allResults.push({
        taskId: task,
        resolved: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Save intermediate results after each chunk
  const intermediateResults = generateSummary(allResults, chunkIdx + 1, chunks.length, startTime);
  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(intermediateResults, null, 2)
  );
  
  console.log(`\n✅ Chunk ${chunkIdx + 1}/${chunks.length} complete. Progress: ${allResults.length}/${allTasks.length} tasks`);
}

// Generate final comprehensive summary
const finalSummary = generateSummary(allResults, chunks.length, chunks.length, startTime);
fs.writeFileSync(
  path.join(outputDir, 'summary.json'),
  JSON.stringify(finalSummary, null, 2)
);

// Merge with previous results
mergeSummaries(finalSummary);

console.log('\n📊 Chunked Evaluation Complete!');
console.log(`✅ Resolved: ${finalSummary.stats.resolved}/${finalSummary.stats.total} (${finalSummary.stats.percentComplete}%)`);
console.log(`⏱️  Total time: ${finalSummary.performance.totalDuration} minutes`);

function generateSummary(results: any[], completedChunks: number, totalChunks: number, startTime: number) {
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
    summary: "Chunked SWE-bench Evaluation Results",
    timestamp: new Date().toISOString(),
    runId,
    progress: {
      completedChunks,
      totalChunks,
      completedTasks: results.length,
      totalTasks: allTasks.length,
      percentageEvaluated: ((results.length / allTasks.length) * 100).toFixed(1)
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

function mergeSummaries(newSummary: any) {
  // Load previous comprehensive summary
  const comprehensivePath = path.join(process.cwd(), 'swebench-results', 'final-swebench-summary.json');
  let previousData: any = {
    evaluations: {
      fullBatch: { completed: 0, results: [] },
      quickSample: { completed: 0, results: [] },
      comprehensive: { completed: 0, results: [] }
    }
  };
  
  if (fs.existsSync(comprehensivePath)) {
    previousData = JSON.parse(fs.readFileSync(comprehensivePath, 'utf-8'));
  }
  
  // Add new results to comprehensive section
  previousData.evaluations.comprehensive = {
    completed: newSummary.stats.total,
    results: newSummary.results
  };
  
  // Calculate combined totals
  const allResults = [
    ...previousData.evaluations.fullBatch.results,
    ...previousData.evaluations.quickSample.results,
    ...previousData.evaluations.comprehensive.results
  ];
  
  const uniqueTasks = new Map();
  allResults.forEach(r => uniqueTasks.set(r.taskId, r));
  const finalResults = Array.from(uniqueTasks.values());
  
  const totalResolved = finalResults.filter(r => r.resolved).length;
  const byRepo: Record<string, any> = {};
  
  finalResults.forEach(r => {
    const repo = r.taskId.split('__')[0];
    if (!byRepo[repo]) {
      byRepo[repo] = { total: 0, resolved: 0 };
    }
    byRepo[repo].total++;
    if (r.resolved) byRepo[repo].resolved++;
  });
  
  const repoBreakdown = Object.entries(byRepo).map(([repo, stats]: [string, any]) => ({
    [repo]: {
      total: stats.total,
      resolved: stats.resolved,
      percentage: ((stats.resolved / stats.total) * 100).toFixed(1)
    }
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
  
  const avgDuration = finalResults.reduce((sum, r) => sum + (r.duration || 0), 0) / finalResults.length;
  
  const finalSummary = {
    summary: "Comprehensive SWE-bench Evaluation Results",
    timestamp: new Date().toISOString(),
    evaluations: previousData.evaluations,
    totalResults: {
      totalTasks: finalResults.length,
      resolved: totalResolved,
      failed: finalResults.length - totalResolved,
      percentComplete: ((totalResolved / finalResults.length) * 100).toFixed(2),
      breakdown: repoBreakdown
    },
    performance: {
      averageDuration: avgDuration.toFixed(2),
      fastestTask: finalResults.reduce((min, r) => r.duration < min.duration ? r : min),
      slowestTask: finalResults.reduce((max, r) => r.duration > max.duration ? r : max)
    },
    conclusion: `With gold patches, the SWE-bench evaluation pipeline achieved ${((totalResolved / finalResults.length) * 100).toFixed(2)}% success rate (${totalResolved}/${finalResults.length} tasks resolved).`
  };
  
  fs.writeFileSync(comprehensivePath, JSON.stringify(finalSummary, null, 2));
  console.log(`\n📄 Updated comprehensive summary: ${comprehensivePath}`);
}