#!/usr/bin/env tsx
/**
 * Monitor SWE-bench evaluation progress
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function findLatestRun(): Promise<string | null> {
  try {
    const resultsDir = './swebench-results';
    const dirs = await fs.readdir(resultsDir);
    const evalDirs = dirs.filter(d => d.startsWith('eval-'));
    if (evalDirs.length === 0) return null;
    
    // Sort by timestamp to get latest
    evalDirs.sort((a, b) => b.localeCompare(a));
    return path.join(resultsDir, evalDirs[0]);
  } catch {
    return null;
  }
}

async function monitorProgress() {
  const latestDir = await findLatestRun();
  if (!latestDir) {
    console.log("No evaluation runs found");
    return;
  }
  
  const progressFile = path.join(latestDir, 'progress.json');
  
  console.log(`Monitoring: ${latestDir}`);
  console.log('Press Ctrl+C to stop\n');
  
  let lastCompleted = 0;
  
  while (true) {
    try {
      const content = await fs.readFile(progressFile, 'utf-8');
      const progress = JSON.parse(content);
      
      if (progress.completed !== lastCompleted) {
        lastCompleted = progress.completed;
        
        console.clear();
        console.log(`📊 SWE-bench Evaluation Progress`);
        console.log(`${"=".repeat(60)}`);
        console.log(`Directory: ${latestDir}`);
        console.log(`Timestamp: ${progress.timestamp}`);
        console.log('');
        console.log(`Progress: ${progress.completed}/${progress.total} (${(progress.completed/progress.total*100).toFixed(1)}%)`);
        console.log(`Success rate: ${progress.currentSuccessRate}`);
        console.log('');
        
        // Show recent tasks
        const recentTasks = progress.results.slice(-5);
        console.log('Recent tasks:');
        recentTasks.forEach((task: any) => {
          const status = task.success ? '✅' : '❌';
          const time = (task.duration / 1000).toFixed(1);
          console.log(`  ${status} ${task.instanceId} (${time}s)`);
        });
        
        // Estimate time remaining
        const avgTime = progress.results.reduce((sum: number, r: any) => sum + r.duration, 0) / progress.results.length;
        const remaining = progress.total - progress.completed;
        const etaMs = avgTime * remaining;
        const etaMin = Math.ceil(etaMs / 60000);
        console.log(`\nEstimated time remaining: ${etaMin} minutes`);
      }
      
    } catch (error) {
      // File might not exist yet or be temporarily unavailable
    }
    
    // Check every 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the monitor
monitorProgress().catch(console.error);