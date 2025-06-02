#!/usr/bin/env tsx
/**
 * Direct Docker implementation of SWE-Bench evaluation.
 * This bypasses ALL application services and uses Docker directly.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, execSync } from 'child_process';

interface BatchOptions {
  tasks_dir: string;
  instance_ids?: string;
  max_tasks?: number;
  output_dir?: string;
  patch_source: string;
  stop_on_failure: boolean;
}

interface TaskData {
  instance_id: string;
  repo: string;
  base_commit: string;
  problem_statement: string;
  test_patch: string;
  patch?: string;
  FAIL_TO_PASS?: string[];
  PASS_TO_PASS?: string[];
  version?: string;
}

const program = new Command();
program
  .name('run_swe_bench_docker_direct')
  .description('Run SWE-Bench tasks using Docker directly')
  .option('--tasks_dir <path>', 'Directory containing task JSON files', 'assets/swe_bench_data')
  .option('--instance_ids <ids>', 'Comma-separated list of instance IDs to run')
  .option('--max_tasks <N>', 'Maximum number of tasks to run', (val) => parseInt(val, 10))
  .option('--output_dir <path>', 'Directory to save evaluation results')
  .option('--patch_source <type>', 'Patch source: gold, empty, or agent', 'gold')
  .option('--stop_on_failure', 'Stop batch execution on first failure', false);

program.parse(process.argv);
const options = program.opts() as BatchOptions;

async function ensureOutputDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = options.output_dir || path.join(process.cwd(), 'swebench-results', `docker-${timestamp}`);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

async function loadTask(tasksDir: string, instanceId: string): Promise<TaskData | null> {
  try {
    const filePath = path.join(tasksDir, `${instanceId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load task ${instanceId}:`, error);
    return null;
  }
}

async function listTasks(tasksDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(tasksDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (error) {
    console.error('Failed to list tasks:', error);
    return [];
  }
}

function dockerImageExists(imageName: string): boolean {
  try {
    execSync(`docker inspect ${imageName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function buildDockerImage(task: TaskData): Promise<boolean> {
  const imageName = `swebench/${task.instance_id.toLowerCase()}`;
  
  // Check if image already exists
  if (dockerImageExists(imageName)) {
    console.log(`Docker image ${imageName} already exists, skipping build`);
    return true;
  }

  console.log(`Building Docker image for ${task.instance_id}...`);
  
  // Create a temporary directory for the build context
  const tempDir = path.join(process.cwd(), 'temp', `build-${task.instance_id}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    // Create Dockerfile
    const dockerfile = `
FROM python:${task.version || '3.9'}-slim

# Install git and other dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Clone the repository
WORKDIR /workspace
RUN git clone https://github.com/${task.repo}.git repo
WORKDIR /workspace/repo

# Checkout the base commit
RUN git checkout ${task.base_commit}

# Create test patch file
RUN echo '${task.test_patch.replace(/'/g, "'\\''")}' > /workspace/test.patch

# Apply test patch
RUN git apply /workspace/test.patch || true

# Install dependencies (adjust based on repo)
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
RUN if [ -f setup.py ]; then pip install -e .; fi

WORKDIR /workspace/repo
`;

    await fs.writeFile(path.join(tempDir, 'Dockerfile'), dockerfile);
    
    // Build the image
    return await new Promise((resolve) => {
      const buildProcess = spawn('docker', ['build', '-t', imageName, '.'], {
        cwd: tempDir,
        stdio: 'inherit'
      });
      
      buildProcess.on('close', (code) => {
        resolve(code === 0);
      });
    });
  } finally {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function evaluateTaskWithDocker(task: TaskData, patchContent: string): Promise<any> {
  const imageName = `swebench/${task.instance_id.toLowerCase()}`;
  
  // Build Docker image if needed
  const buildSuccess = await buildDockerImage(task);
  if (!buildSuccess) {
    throw new Error('Failed to build Docker image');
  }
  
  console.log(`Running evaluation in Docker container...`);
  
  // Create patch file content
  const patchScript = patchContent ? `
echo '${patchContent.replace(/'/g, "'\\''")}' > /workspace/patch.diff
git apply /workspace/patch.diff || echo "Failed to apply patch"
` : '';
  
  // Create evaluation script
  const evalScript = `
#!/bin/bash
set -e

# Apply patch if provided
${patchScript}

# Run tests
cd /workspace/repo

# Extract test commands from FAIL_TO_PASS
${task.FAIL_TO_PASS?.map(test => `
echo "Running test: ${test}"
python -m pytest ${test} -xvs || echo "Test failed: ${test}"
`).join('\n') || 'echo "No tests specified"'}
`;
  
  return new Promise((resolve, reject) => {
    const containerName = `swebench-${task.instance_id}-${Date.now()}`;
    
    // Run Docker container
    const dockerProcess = spawn('docker', [
      'run',
      '--rm',
      '--name', containerName,
      imageName,
      'bash', '-c', evalScript
    ], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    dockerProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    dockerProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    dockerProcess.on('close', (code) => {
      const success = code === 0;
      const resolved = stdout.includes('passed') && !stdout.includes('FAILED');
      
      resolve({
        instanceId: task.instance_id,
        result: {
          report: {
            resolved: resolved,
            tests_run: task.FAIL_TO_PASS?.length || 0,
            exit_code: code
          },
          docker_image: imageName,
          patch_applied: !!patchContent,
          stdout: stdout.slice(-1000), // Last 1000 chars
          stderr: stderr.slice(-1000)
        }
      });
    });
    
    dockerProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const outputDir = await ensureOutputDir();
  console.log(`Results will be saved to: ${outputDir}`);
  
  // Check Docker is available
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    console.error('Docker is not available. Please install Docker.');
    process.exit(1);
  }
  
  // List all available tasks
  const allTaskIds = await listTasks(options.tasks_dir);
  console.log(`Found ${allTaskIds.length} tasks in ${options.tasks_dir}`);
  
  // Filter by instance_ids if provided
  let tasksToRun = allTaskIds;
  if (options.instance_ids) {
    const specifiedIds = options.instance_ids.split(',').map(id => id.trim());
    tasksToRun = allTaskIds.filter(id => specifiedIds.includes(id));
    
    if (tasksToRun.length === 0) {
      console.error('No matching instance IDs found!');
      process.exit(1);
    }
  }
  
  // Limit tasks if max_tasks is specified
  if (options.max_tasks && options.max_tasks < tasksToRun.length) {
    tasksToRun = tasksToRun.slice(0, options.max_tasks);
  }
  
  console.log(`Will evaluate ${tasksToRun.length} tasks`);
  
  // Initialize counters and results
  const results: any[] = [];
  let tasksSucceeded = 0;
  let tasksFailed = 0;
  let tasksSkipped = 0;
  
  // Process each task
  for (const instanceId of tasksToRun) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Evaluating task: ${instanceId}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Load task details
      const task = await loadTask(options.tasks_dir, instanceId);
      if (!task) {
        console.error(`Failed to load task ${instanceId}`);
        tasksSkipped++;
        continue;
      }
      
      // Determine patch content
      let patchContent = "";
      if (options.patch_source === 'gold') {
        if (task.patch) {
          patchContent = task.patch;
          console.log("✓ Using gold patch from task data");
        } else {
          console.log("⚠️  Warning: No gold patch available, using empty patch");
        }
      } else if (options.patch_source === 'empty') {
        console.log("ℹ️  Using empty patch");
      }
      
      // Evaluate the task
      try {
        const evalResult = await evaluateTaskWithDocker(task, patchContent);
        const resolved = evalResult.result.report.resolved;
        
        console.log(`\n📊 Task Results:`);
        console.log(`   Resolved: ${resolved ? '✅ YES' : '❌ NO'}`);
        console.log(`   Tests Run: ${evalResult.result.report.tests_run}`);
        console.log(`   Exit Code: ${evalResult.result.report.exit_code}`);
        
        results.push(evalResult);
        
        if (resolved) {
          tasksSucceeded++;
        } else {
          tasksFailed++;
        }
        
        // Save individual result
        const resultFilePath = path.join(outputDir, `${instanceId.replace(/[/:]/g, '__')}_eval_result.json`);
        await fs.writeFile(resultFilePath, JSON.stringify(evalResult, null, 2));
      } catch (error) {
        console.error(`\n❌ Task failed with error:`, error);
        results.push({ 
          instanceId, 
          result: { error: error instanceof Error ? error.message : String(error) } 
        });
        tasksFailed++;
        
        if (options.stop_on_failure) {
          console.log("\n🛑 Stopping due to --stop_on_failure");
          break;
        }
      }
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
  console.log(`📋 Summary saved to: ${summaryPath}`);
}

// Execute the batch runner
main().catch(error => {
  console.error('Failed to run batch evaluation:', error);
  process.exit(1);
});