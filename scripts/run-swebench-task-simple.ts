#!/usr/bin/env tsx

/**
 * Simplified SWE-bench task runner for demonstration purposes.
 * This version shows the basic workflow without full service dependencies.
 */

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(spawn);

// Command line interface
const program = new Command();

program
  .name("run-swebench-task-simple")
  .description("Run SWE-bench evaluation tasks (simplified version)")
  .version("1.0.0")
  .requiredOption("-t, --task <path>", "Path to the task JSON file")
  .option("-p, --patch <path>", "Path to patch file to apply")
  .option("-c, --patch-content <content>", "Inline patch content")
  .option("--no-patch", "Run without applying any patch")
  .option("-o, --output <path>", "Output directory for results", "./swebench-results")
  .option("-v, --verbose", "Enable verbose logging")
  .parse(process.argv);

const options = program.opts();

// Validation
if (!options.patch && !options.patchContent && options.patch !== false) {
  console.error("Error: Must specify either --patch, --patch-content, or --no-patch");
  process.exit(1);
}

if (options.patch && options.patchContent) {
  console.error("Error: Cannot specify both --patch and --patch-content");
  process.exit(1);
}

interface SWEBenchTask {
  instance_id: string;
  repo: string;
  base_commit: string;
  problem_statement: string;
  hints_text?: string;
  test_patch: string;
  version: string;
  FAIL_TO_PASS: string[];
  PASS_TO_PASS: string[];
  patch?: string;
}

// Load task data
async function loadTaskData(taskPath: string): Promise<SWEBenchTask> {
  try {
    const content = await fs.readFile(taskPath, "utf-8");
    return JSON.parse(content) as SWEBenchTask;
  } catch (error) {
    throw new Error(`Failed to load task data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Load patch content
async function loadPatchContent(options: any): Promise<string | undefined> {
  if (options.patch === false) {
    return undefined;
  }
  
  if (options.patchContent) {
    return options.patchContent;
  }
  
  if (options.patch) {
    try {
      return await fs.readFile(options.patch, "utf-8");
    } catch (error) {
      throw new Error(`Failed to load patch file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return undefined;
}

// Create a basic Dockerfile
function createDockerfile(task: SWEBenchTask): string {
  const [owner, repo] = task.repo.split('/');
  
  return `FROM python:3.8-slim

# Install git and basic build tools
RUN apt-get update && apt-get install -y \\
    git \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Clone the repository
WORKDIR /workspace
RUN git clone https://github.com/${task.repo}.git ${repo}
WORKDIR /workspace/${repo}

# Checkout the specific commit
RUN git checkout ${task.base_commit}

# Install dependencies based on repository type
${task.repo.includes('django') ? `
RUN pip install -e .
RUN pip install pytest pytest-django
` : task.repo.includes('sympy') ? `
RUN pip install -e .
RUN pip install pytest
` : task.repo.includes('numpy') ? `
RUN pip install -e .
RUN pip install pytest hypothesis
` : `
# Generic Python project setup
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
RUN if [ -f setup.py ]; then pip install -e .; fi
RUN pip install pytest
`}

# Set up working directory
WORKDIR /workspace/${repo}
`;
}

// Create evaluation script
function createEvaluationScript(task: SWEBenchTask, hasPatch: boolean): string {
  const tests = task.FAIL_TO_PASS.concat(task.PASS_TO_PASS);
  
  return `#!/bin/bash
set -e

echo "=== SWE-bench Evaluation Script ==="
echo "Task: ${task.instance_id}"
echo "Repository: ${task.repo}"
echo ""

# Apply the test patch
echo "Applying test patch..."
cat > /tmp/test.patch << 'EOF'
${task.test_patch}
EOF
git apply /tmp/test.patch || { echo "Failed to apply test patch"; exit 1; }

${hasPatch ? `
# Apply the solution patch
echo "Applying solution patch..."
cat > /tmp/solution.patch << 'EOF'
$(cat /workspace/patch.diff)
EOF
git apply /tmp/solution.patch || { echo "Failed to apply solution patch"; exit 1; }
` : ''}

# Run the tests
echo ""
echo "Running tests..."
pytest -xvs ${tests.join(' ')} > /workspace/test_output.log 2>&1 || true

# Check results
echo ""
echo "=== Test Results ==="
FAIL_TO_PASS=(${task.FAIL_TO_PASS.map(t => `"${t}"`).join(' ')})
PASS_TO_PASS=(${task.PASS_TO_PASS.map(t => `"${t}"`).join(' ')})

all_passed=true

for test in "\${FAIL_TO_PASS[@]}"; do
  if grep -q "PASSED.*\$test" /workspace/test_output.log; then
    echo "✓ \$test - PASSED (should pass after fix)"
  else
    echo "✗ \$test - FAILED (should pass after fix)"
    all_passed=false
  fi
done

for test in "\${PASS_TO_PASS[@]}"; do
  if grep -q "PASSED.*\$test" /workspace/test_output.log; then
    echo "✓ \$test - PASSED (should always pass)"
  else
    echo "✗ \$test - FAILED (should always pass)"
    all_passed=false
  fi
done

# Create result file
cat > /workspace/evaluation_result.json << EOF
{
  "instance_id": "${task.instance_id}",
  "patch_applied_successfully": ${hasPatch ? 'true' : 'false'},
  "tests_passed": \$all_passed,
  "resolved": \$all_passed
}
EOF

if [ "\$all_passed" = true ]; then
  echo ""
  echo "✓ Task RESOLVED - All tests passed!"
  exit 0
else
  echo ""
  echo "✗ Task NOT RESOLVED - Some tests failed"
  exit 1
fi
`;
}

// Save results
async function saveResults(outputDir: string, task: SWEBenchTask, success: boolean, logs: string, patchContent?: string) {
  const taskDir = path.join(outputDir, task.instance_id);
  await fs.mkdir(taskDir, { recursive: true });
  
  // Save evaluation report
  const report = {
    instance_id: task.instance_id,
    patch_applied_successfully: !!patchContent,
    tests_passed: success,
    resolved: success,
    timestamp: new Date().toISOString()
  };
  
  await fs.writeFile(
    path.join(taskDir, "evaluation_report.json"),
    JSON.stringify(report, null, 2)
  );
  
  // Save applied patch if provided
  if (patchContent) {
    await fs.writeFile(
      path.join(taskDir, "patch_applied.diff"),
      patchContent
    );
  }
  
  // Save execution logs
  await fs.writeFile(
    path.join(taskDir, "execution.log"),
    logs
  );
  
  console.log(`\nResults saved to: ${taskDir}`);
}

// Main function
async function main() {
  console.log("SWE-bench Task Runner (Simplified) v1.0.0");
  console.log("==========================================");
  
  try {
    // Load task
    const task = await loadTaskData(options.task);
    console.log(`\nLoaded task: ${task.instance_id}`);
    console.log(`Repository: ${task.repo}`);
    console.log(`Base commit: ${task.base_commit}`);
    console.log(`Tests to fix: ${task.FAIL_TO_PASS.join(", ")}`);
    
    // Load patch
    const patchContent = await loadPatchContent(options);
    if (patchContent) {
      console.log(`\nPatch loaded (${patchContent.split('\\n').length} lines)`);
    } else {
      console.log("\nNo patch provided - running baseline evaluation");
    }
    
    // Create working directory
    const workDir = path.join("/tmp", `swebench-${task.instance_id}-${Date.now()}`);
    await fs.mkdir(workDir, { recursive: true });
    
    // Create Dockerfile
    const dockerfile = createDockerfile(task);
    await fs.writeFile(path.join(workDir, "Dockerfile"), dockerfile);
    
    // Create evaluation script
    const evalScript = createEvaluationScript(task, !!patchContent);
    await fs.writeFile(path.join(workDir, "eval.sh"), evalScript);
    await fs.chmod(path.join(workDir, "eval.sh"), 0o755);
    
    // Save patch if provided
    if (patchContent) {
      await fs.writeFile(path.join(workDir, "patch.diff"), patchContent);
    }
    
    console.log("\n=== Running Evaluation ===");
    console.log("NOTE: This is a simplified demonstration.");
    console.log("For production use, please use the full harness service implementation.");
    console.log("\nTo run with Docker manually:");
    console.log(`1. cd ${workDir}`);
    console.log(`2. docker build -t swebench-${task.instance_id} .`);
    console.log(`3. docker run -v ${workDir}:/workspace swebench-${task.instance_id} /workspace/eval.sh`);
    
    // Simulate results
    const success = false; // In real implementation, this would come from Docker execution
    const logs = `Simplified runner - manual Docker execution required.
    
See the working directory for Docker files:
${workDir}

The full harness service implementation provides:
- Automatic Docker image building
- Container lifecycle management
- Test execution and result collection
- Proper error handling and cleanup`;
    
    await saveResults(options.output, task, success, logs, patchContent);
    
    console.log("\n=== EVALUATION RESULTS ===");
    console.log(`Instance ID: ${task.instance_id}`);
    console.log(`Patch Applied: ${patchContent ? "✓" : "✗"}`);
    console.log(`Tests Passed: ✗ (manual execution required)`);
    console.log(`Task Resolved: ✗ (manual execution required)`);
    
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error && error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the main function
main();