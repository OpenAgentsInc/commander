#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const resultsDir = path.join(process.cwd(), 'swebench-results');

// Find all evaluation result files
function findAllEvalResults(dir: string): string[] {
  const results: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('_eval_result.json')) {
        results.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return results;
}

console.log('🔍 Finding all evaluation results...');
const evalFiles = findAllEvalResults(resultsDir);
console.log(`📊 Found ${evalFiles.length} evaluation results\n`);

// Load and process all results
const allResults: any[] = [];
const duplicates = new Map<string, number>();

for (const file of evalFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8').trim();
    if (!content) {
      console.warn(`⚠️  Skipping empty file: ${file}`);
      continue;
    }
    
    const data = JSON.parse(content);
    const taskId = data.instanceId;
    
    if (!taskId) {
      console.warn(`⚠️  Skipping file without instanceId: ${file}`);
      continue;
    }
    
    // Track duplicates
    const count = duplicates.get(taskId) || 0;
    duplicates.set(taskId, count + 1);
    
    allResults.push({
      taskId,
      resolved: data.result?.report?.resolved || false,
      duration: data.result?.report?.duration || 0,
      testsRun: data.result?.report?.tests_run || 0,
      exitCode: data.result?.report?.exit_code,
      patchApplied: data.result?.patch_applied,
      dockerImage: data.result?.docker_image,
      filePath: file
    });
  } catch (error) {
    console.error(`❌ Failed to read ${file}:`, error);
  }
}

// Remove duplicates, keeping the most recent result
const uniqueResults = new Map<string, any>();
for (const result of allResults) {
  const existing = uniqueResults.get(result.taskId);
  if (!existing || result.duration > 0) { // Prefer results with actual duration
    uniqueResults.set(result.taskId, result);
  }
}

const finalResults = Array.from(uniqueResults.values());
console.log(`📋 Unique tasks evaluated: ${finalResults.length}`);

// Calculate statistics
const resolved = finalResults.filter(r => r.resolved).length;
const byRepo: Record<string, any> = {};

finalResults.forEach(r => {
  const repo = r.taskId.split('__')[0];
  if (!byRepo[repo]) {
    byRepo[repo] = { total: 0, resolved: 0, tasks: [], avgDuration: 0 };
  }
  byRepo[repo].total++;
  if (r.resolved) byRepo[repo].resolved++;
  byRepo[repo].tasks.push({
    taskId: r.taskId,
    resolved: r.resolved,
    duration: r.duration
  });
});

// Calculate averages and percentages
Object.entries(byRepo).forEach(([repo, stats]) => {
  stats.percentage = ((stats.resolved / stats.total) * 100).toFixed(1);
  const durations = stats.tasks.map((t: any) => t.duration).filter((d: number) => d > 0);
  stats.avgDuration = durations.length > 0 
    ? (durations.reduce((a: number, b: number) => a + b, 0) / durations.length).toFixed(2)
    : 0;
});

// Sort repositories by number of tasks
const sortedRepos = Object.entries(byRepo)
  .sort(([, a]: any, [, b]: any) => b.total - a.total)
  .map(([repo, stats]: [string, any]) => ({
    repository: repo,
    total: stats.total,
    resolved: stats.resolved,
    percentage: stats.percentage,
    avgDuration: stats.avgDuration
  }));

// Calculate overall statistics
const totalDuration = finalResults.reduce((sum, r) => sum + (r.duration || 0), 0);
const avgDuration = finalResults.length > 0 ? totalDuration / finalResults.length : 0;
const percentComplete = finalResults.length > 0 ? ((resolved / finalResults.length) * 100).toFixed(2) : 0;

// Create comprehensive summary
const comprehensiveSummary = {
  summary: "Comprehensive SWE-bench Evaluation Results - ALL RUNS",
  timestamp: new Date().toISOString(),
  overallStats: {
    totalTasksEvaluated: finalResults.length,
    totalTasksInDataset: 2298,
    coveragePercentage: ((finalResults.length / 2298) * 100).toFixed(2),
    resolved: resolved,
    failed: finalResults.length - resolved,
    successRate: percentComplete + '%'
  },
  byRepository: sortedRepos,
  performance: {
    totalDuration: (totalDuration / 60).toFixed(2) + ' minutes',
    averageTaskDuration: avgDuration.toFixed(2) + ' seconds',
    fastestTask: finalResults.reduce((min, r) => 
      r.duration > 0 && r.duration < min.duration ? r : min, 
      { duration: Infinity }
    ),
    slowestTask: finalResults.reduce((max, r) => 
      r.duration > max.duration ? r : max, 
      { duration: 0 }
    )
  },
  duplicatesFound: Array.from(duplicates.entries())
    .filter(([, count]) => count > 1)
    .map(([taskId, count]) => ({ taskId, count })),
  detailedResults: finalResults.sort((a, b) => {
    const repoA = a.taskId.split('__')[0];
    const repoB = b.taskId.split('__')[0];
    if (repoA !== repoB) return repoA.localeCompare(repoB);
    return a.taskId.localeCompare(b.taskId);
  }),
  conclusion: `Across all evaluation runs, ${resolved} out of ${finalResults.length} tasks were successfully resolved (${percentComplete}% success rate). This represents ${((finalResults.length / 2298) * 100).toFixed(2)}% coverage of the full SWE-bench dataset.`
};

// Save the comprehensive summary
const outputPath = path.join(resultsDir, 'COMPREHENSIVE-ALL-RESULTS-SUMMARY.json');
fs.writeFileSync(outputPath, JSON.stringify(comprehensiveSummary, null, 2));

// Also create a simplified summary for quick viewing
const simplifiedSummary = {
  "🎯 FINAL RESULTS": {
    "Tasks Evaluated": finalResults.length,
    "Tasks Resolved": resolved,
    "Success Rate": percentComplete + '%',
    "Dataset Coverage": ((finalResults.length / 2298) * 100).toFixed(2) + '%'
  },
  "📊 By Repository": sortedRepos.slice(0, 10).map(r => ({
    [r.repository]: `${r.resolved}/${r.total} (${r.percentage}%)`
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  "⏱️ Performance": {
    "Total Time": (totalDuration / 60).toFixed(2) + ' minutes',
    "Average per Task": avgDuration.toFixed(2) + ' seconds'
  }
};

const simplePath = path.join(resultsDir, 'FINAL-SUMMARY-SIMPLE.json');
fs.writeFileSync(simplePath, JSON.stringify(simplifiedSummary, null, 2));

// Print summary to console
console.log('\n' + '='.repeat(60));
console.log('🎯 COMPREHENSIVE SWE-BENCH EVALUATION RESULTS');
console.log('='.repeat(60));
console.log(`📊 Tasks Evaluated: ${finalResults.length} / 2298 (${((finalResults.length / 2298) * 100).toFixed(2)}% coverage)`);
console.log(`✅ Tasks Resolved: ${resolved}`);
console.log(`❌ Tasks Failed: ${finalResults.length - resolved}`);
console.log(`📈 Success Rate: ${percentComplete}%`);
console.log('\n🏆 Top Repositories by Success:');

sortedRepos.slice(0, 10).forEach(repo => {
  console.log(`   ${repo.repository}: ${repo.resolved}/${repo.total} (${repo.percentage}%)`);
});

console.log(`\n📁 Full results saved to: ${outputPath}`);
console.log(`📄 Simple summary saved to: ${simplePath}`);