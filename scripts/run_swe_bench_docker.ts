#!/usr/bin/env tsx
/**
 * Docker-based SWE-Bench batch runner for CLI usage.
 * This script runs actual Docker evaluations without the complex service layers.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, execSync } from 'child_process';
import crypto from 'crypto';

interface BatchOptions {
  tasks_dir: string;
  instance_ids?: string;
  max_tasks?: number;
  output_dir?: string;
  patch_source: string;
  patch_content?: string;
  stop_on_failure: boolean;
}

interface TaskData {
  instance_id: string;
  repo: string;
  base_commit: string;
  problem_statement: string;
  test_patch: string;
  patch?: string;
  FAIL_TO_PASS?: string | string[];
  PASS_TO_PASS?: string | string[];
  version?: string;
}

const program = new Command();
program
  .name('run_swe_bench_docker')
  .description('Run SWE-Bench tasks with Docker')
  .option('--tasks_dir <path>', 'Directory containing task JSON files', 'assets/swe_bench_data')
  .option('--instance_ids <ids>', 'Comma-separated list of instance IDs to run')
  .option('--max_tasks <N>', 'Maximum number of tasks to run', (val) => parseInt(val, 10))
  .option('--output_dir <path>', 'Directory to save evaluation results')
  .option('--patch_source <type>', 'Patch source: gold, empty, or agent', 'gold')
  .option('--patch_content <content>', 'Patch content to use directly (overrides patch_source)')
  .option('--stop_on_failure', 'Stop batch execution on first failure', false);

program.parse(process.argv);
const options = program.opts() as BatchOptions;

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
    outputDir = path.join(process.cwd(), 'swebench-results', `docker-${timestamp}`);
  }
  
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

async function runDockerEvaluation(task: TaskData, patchContent: string, outputDir: string): Promise<any> {
  const instanceId = task.instance_id;
  const imageName = `swebench_eval_${instanceId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const containerName = `${imageName}_${Date.now()}`;
  
  console.log(`Building Docker image ${imageName}...`);
  
  try {
    // Create a temporary directory for the evaluation
    const tempDir = path.join(outputDir, 'temp', instanceId);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Write the patch to a file
    const patchFile = path.join(tempDir, 'patch.diff');
    await fs.writeFile(patchFile, patchContent || '');
    
    // Create evaluation script
    const evalScript = `#!/bin/bash
set -e

echo "=== SWE-Bench Evaluation for ${instanceId} ==="
echo "Repository: ${task.repo}"
echo "Base commit: ${task.base_commit}"

# Clone repository
cd /workspace
git clone https://github.com/${task.repo}.git repo
cd repo
git checkout ${task.base_commit}

# Apply test patch
echo "Applying test patch..."
cat > test.patch << 'EOF'
${task.test_patch}
EOF
git apply test.patch || echo "Warning: Test patch failed to apply cleanly"

# Apply solution patch if provided
if [ -s /workspace/patch.diff ]; then
  echo "Applying solution patch..."
  git apply /workspace/patch.diff || echo "Warning: Solution patch failed to apply cleanly"
fi

# Install dependencies
echo "Installing dependencies..."

# Handle repo-specific dependency issues
${(() => {
  if (task.repo.includes('astropy/astropy')) {
    return `# Fix astropy setuptools compatibility issue
pip install 'setuptools<60'`;
  } else if (task.repo.includes('pydata/xarray')) {
    return `# Pin numpy version for compatibility
pip install 'numpy<2.0'`;
  }
  return '';
})()}

if [ -f requirements.txt ]; then
  pip install -r requirements.txt
elif [ -f setup.py ]; then
  pip install -e .
fi

# Install pytest for running tests
echo "Installing pytest..."
pip install pytest pytest-xdist

# Run tests
echo "Running tests..."
FAILED_TESTS=""
PASSED_TESTS=""

${(() => {
  // Parse FAIL_TO_PASS which can be a JSON string array
  let tests: string[] = [];
  if (task.FAIL_TO_PASS) {
    try {
      tests = JSON.parse(task.FAIL_TO_PASS);
    } catch {
      // If not JSON, treat as single test
      tests = [task.FAIL_TO_PASS];
    }
  }
  
  if (tests.length === 0) {
    return 'echo "No FAIL_TO_PASS tests specified"';
  }
  
  return tests.map((test: string) => {
    // Handle different test formats
    if (task.repo.includes('django/django')) {
      // Django uses unittest notation: "test_name (module.tests.TestClass)"
      // Use Django's test runner with proper test discovery
      const match = test.match(/^([\w_]+)\s*\(([\w.]+)\)$/);
      if (match) {
        const [, testMethod, testPath] = match;
        return `
echo "Testing: ${test}"
cd /workspace/repo

# Set up proper PYTHONPATH
export PYTHONPATH="/workspace/repo:\${PYTHONPATH}"

# Check if tests directory exists and set it up
if [ -d "tests" ]; then
  export PYTHONPATH="/workspace/repo/tests:\${PYTHONPATH}"
  
  # Try using Django's runtests.py if it exists
  if [ -f "tests/runtests.py" ]; then
    echo "Using Django's runtests.py"
    cd tests
    if python runtests.py ${testPath}.${testMethod} --verbosity=2 2>&1; then
      PASSED_TESTS="$PASSED_TESTS ${test}"
    else
      # Try with just the test path
      if python runtests.py ${testPath} -k ${testMethod} --verbosity=2 2>&1; then
        PASSED_TESTS="$PASSED_TESTS ${test}"
      else
        FAILED_TESTS="$FAILED_TESTS ${test}"
      fi
    fi
  else
    # No runtests.py, use django test command
    echo "Using django test command"
    if python -m django test ${testPath}.${testMethod} --settings=tests.test_sqlite --verbosity=2 2>&1; then
      PASSED_TESTS="$PASSED_TESTS ${test}"
    else
      # Try alternative test discovery methods
      cd tests
      if python -m django test ${testPath}.${testMethod} --settings=test_sqlite --verbosity=2 2>&1; then
        PASSED_TESTS="$PASSED_TESTS ${test}"
      else
        FAILED_TESTS="$FAILED_TESTS ${test}"
      fi
    fi
  fi
else
  # No tests directory, try from repo root
  echo "No tests directory found, trying from repo root"
  if python -m django test ${testPath}.${testMethod} --verbosity=2 2>&1; then
    PASSED_TESTS="$PASSED_TESTS ${test}"
  else
    FAILED_TESTS="$FAILED_TESTS ${test}"
  fi
fi
`;
      } else {
        // Handle non-standard test names
        return `
echo "Testing: ${test}"
cd /workspace/repo

# Set up proper PYTHONPATH
export PYTHONPATH="/workspace/repo:\${PYTHONPATH}"

# Check if tests directory exists
if [ -d "tests" ]; then
  export PYTHONPATH="/workspace/repo/tests:\${PYTHONPATH}"
  
  # Try using Django's runtests.py if it exists
  if [ -f "tests/runtests.py" ]; then
    echo "Using Django's runtests.py for non-standard test"
    cd tests
    if python runtests.py "${test}" --verbosity=2 2>&1; then
      PASSED_TESTS="$PASSED_TESTS ${test}"
    else
      FAILED_TESTS="$FAILED_TESTS ${test}"
    fi
  else
    # Try django test command with various approaches
    echo "Using django test command for non-standard test"
    if python -m django test "${test}" --settings=tests.test_sqlite --verbosity=2 2>&1; then
      PASSED_TESTS="$PASSED_TESTS ${test}"
    else
      cd tests
      if python -m django test "${test}" --settings=test_sqlite --verbosity=2 2>&1; then
        PASSED_TESTS="$PASSED_TESTS ${test}"
      else
        # Last resort: try pytest
        cd /workspace/repo
        if python -m pytest -k "${test}" -xvs 2>&1; then
          PASSED_TESTS="$PASSED_TESTS ${test}"
        else
          FAILED_TESTS="$FAILED_TESTS ${test}"
        fi
      fi
    fi
  fi
else
  # No tests directory, try from repo root
  echo "No tests directory found, trying alternative methods"
  if python -m django test "${test}" --verbosity=2 2>&1; then
    PASSED_TESTS="$PASSED_TESTS ${test}"
  else
    # Try pytest as fallback
    if python -m pytest -k "${test}" -xvs 2>&1; then
      PASSED_TESTS="$PASSED_TESTS ${test}"
    else
      FAILED_TESTS="$FAILED_TESTS ${test}"
    fi
  fi
fi
`;
      }
    } else if (task.repo.includes('sympy/sympy')) {
      // SymPy uses pytest
      return `
echo "Testing: ${test}"
cd /workspace/repo
# Try to find and run the test
if python -m pytest -k "${test}" -xvs 2>&1; then
  PASSED_TESTS="$PASSED_TESTS ${test}"
else
  FAILED_TESTS="$FAILED_TESTS ${test}"
fi
`;
    } else if (task.repo.includes('pydata/xarray') || task.repo.includes('astropy/astropy')) {
      // These repos use pytest with module::test format
      return `
echo "Testing: ${test}"
cd /workspace/repo
# Convert module::test format to pytest path
TEST_PATH="${test.replace('::', '/')}"
if python -m pytest "${TEST_PATH}" -xvs 2>&1; then
  PASSED_TESTS="$PASSED_TESTS ${test}"
else
  # Try with -k flag as fallback
  if python -m pytest -k "${test}" -xvs 2>&1; then
    PASSED_TESTS="$PASSED_TESTS ${test}"
  else
    FAILED_TESTS="$FAILED_TESTS ${test}"
  fi
fi
`;
    }
    
    // Default: assume it's a file path or pytest format
    return `
echo "Testing: ${test}"
if python -m pytest "${test}" -xvs 2>&1; then
  PASSED_TESTS="$PASSED_TESTS ${test}"
else
  FAILED_TESTS="$FAILED_TESTS ${test}"
fi
`;
  }).join('\n');
})()}

# Report results
echo "=== Test Results ==="
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ -z "$FAILED_TESTS" ] && [ -n "$PASSED_TESTS" ]; then
  echo "EVALUATION_RESULT: RESOLVED"
  exit 0
else
  echo "EVALUATION_RESULT: NOT_RESOLVED"
  exit 1
fi
`;

    await fs.writeFile(path.join(tempDir, 'eval.sh'), evalScript);
    
    // Create Dockerfile
    const dockerfile = `
FROM python:${(() => {
  const version = task.version;
  if (!version) return '3.9';
  const versionNum = parseFloat(version);
  // Use non-slim images for older or non-standard versions
  if (versionNum < 3.6 || versionNum >= 4.0) {
    return '3.9';
  }
  return version;
})()}-slim

RUN apt-get update && apt-get install -y \\
    git \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Pre-install numpy for packages that need it during setup
RUN pip install numpy

# Update pip and setuptools to avoid compatibility issues
RUN pip install --upgrade pip setuptools wheel

WORKDIR /workspace
COPY patch.diff /workspace/
COPY eval.sh /workspace/
RUN chmod +x /workspace/eval.sh

CMD ["/workspace/eval.sh"]
`;
    
    await fs.writeFile(path.join(tempDir, 'Dockerfile'), dockerfile);
    
    // Build Docker image
    console.log('Building Docker image...');
    execSync(`docker build -t ${imageName} .`, {
      cwd: tempDir,
      stdio: 'inherit'
    });
    
    // Run Docker container
    console.log('Running evaluation...');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const dockerProcess = spawn('docker', [
        'run',
        '--rm',
        '--name', containerName,
        imageName
      ], {
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      dockerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });
      
      dockerProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });
      
      dockerProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        const resolved = stdout.includes('EVALUATION_RESULT: RESOLVED');
        
        // Count tests
        let testsRun = 0;
        if (task.FAIL_TO_PASS) {
          try {
            const tests = JSON.parse(task.FAIL_TO_PASS as string);
            testsRun = Array.isArray(tests) ? tests.length : 1;
          } catch {
            testsRun = 1;
          }
        }
        
        resolve({
          instanceId: task.instance_id,
          result: {
            report: {
              resolved: resolved,
              tests_run: testsRun,
              duration: duration,
              exit_code: code
            },
            docker_image: imageName,
            patch_applied: !!patchContent,
            logs: {
              stdout: stdout.slice(-5000), // Last 5000 chars
              stderr: stderr.slice(-5000)
            }
          }
        });
      });
      
      dockerProcess.on('error', (error) => {
        resolve({
          instanceId: task.instance_id,
          result: {
            error: error.message
          }
        });
      });
      
      // Timeout after 10 minutes
      setTimeout(() => {
        try {
          execSync(`docker kill ${containerName}`, { stdio: 'ignore' });
        } catch {}
        resolve({
          instanceId: task.instance_id,
          result: {
            error: 'Evaluation timed out after 10 minutes'
          }
        });
      }, 600000);
    });
    
  } catch (error) {
    return {
      instanceId: task.instance_id,
      result: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

async function main() {
  const outputDir = await ensureOutputDir();
  console.log(`Results will be saved to: ${outputDir}`);
  
  // Check Docker is available
  try {
    execSync('docker --version', { stdio: 'inherit' });
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
      if (options.patch_content) {
        // Use patch content provided via command line
        patchContent = options.patch_content;
        console.log("✓ Using patch content from command line");
      } else if (options.patch_source === 'gold') {
        if (task.patch) {
          patchContent = task.patch;
          console.log("✓ Using gold patch from task data");
        } else {
          console.log("⚠️  Warning: No gold patch available, using empty patch");
        }
      } else if (options.patch_source === 'empty') {
        console.log("ℹ️  Using empty patch");
      }
      
      // Run Docker evaluation
      const evalResult = await runDockerEvaluation(task, patchContent, outputDir);
      
      if (evalResult.result.error) {
        console.error(`\n❌ Task failed with error: ${evalResult.result.error}`);
        results.push(evalResult);
        tasksFailed++;
      } else {
        const resolved = evalResult.result.report.resolved;
        console.log(`\n📊 Task Results:`);
        console.log(`   Resolved: ${resolved ? '✅ YES' : '❌ NO'}`);
        console.log(`   Tests Run: ${evalResult.result.report.tests_run}`);
        console.log(`   Duration: ${evalResult.result.report.duration}s`);
        
        results.push(evalResult);
        
        if (resolved) {
          tasksSucceeded++;
        } else {
          tasksFailed++;
        }
      }
      
      // Save individual result
      const resultFilePath = path.join(outputDir, `${instanceId.replace(/[/:]/g, '__')}_eval_result.json`);
      await fs.writeFile(resultFilePath, JSON.stringify(evalResult, null, 2));
      
      if (options.stop_on_failure && evalResult.result.error) {
        console.log("\n🛑 Stopping due to --stop_on_failure");
        break;
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