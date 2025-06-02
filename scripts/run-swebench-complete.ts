#!/usr/bin/env tsx
/**
 * Complete SWE-bench runner with Docker evaluation
 * This generates patches and evaluates them in Docker containers
 */

import { Effect, Console } from "effect";
import * as fs from "fs/promises";
import * as path from "path";
import { PatchGenerationCliLayer } from "../src/services/swe_bench_harness/layers/SWEBenchCliLayer";
import { 
  AgentPatchGeneratorService, 
  SWEBenchTaskService,
  type SWEBenchTask 
} from "../src/services/swe_bench_harness";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Configuration
const outputDir = `./swebench-results/complete-${Date.now()}`;
const dockerWorkDir = "/tmp/swebench-docker";

interface TaskResult {
  taskId: string;
  repo: string;
  patchGenerated: boolean;
  dockerRun: boolean;
  testsPass: boolean;
  error?: string;
  duration: number;
  patch?: string;
}

/**
 * Build and run a Docker container to evaluate a patch
 */
async function evaluateInDocker(
  task: SWEBenchTask,
  patch: string
): Promise<{ success: boolean; output: string }> {
  const taskDir = path.join(dockerWorkDir, task.instance_id.replace(/[/:]/g, "_"));
  await fs.mkdir(taskDir, { recursive: true });
  
  // Save the patch
  const patchPath = path.join(taskDir, "fix.patch");
  await fs.writeFile(patchPath, patch);
  
  // Create evaluation script
  const evalScript = `#!/bin/bash
set -eo pipefail

echo "=== SWE-bench Evaluation: ${task.instance_id} ==="
cd /workspace

# Clone the repository
echo "Cloning ${task.repo}..."
git clone --depth 1 https://github.com/${task.repo}.git repo
cd repo

# Checkout the base commit
echo "Checking out ${task.base_commit}..."
git fetch --depth 1 origin ${task.base_commit}
git checkout ${task.base_commit}

# Apply the generated patch
echo "Applying patch..."
if ! git apply --check /workspace/fix.patch; then
  echo "ERROR: Patch does not apply cleanly"
  exit 1
fi
git apply /workspace/fix.patch

# Apply the test patch to get the tests
echo "Applying test patch..."
cat > /workspace/test.patch << 'EOF'
${task.test_patch}
EOF
git apply /workspace/test.patch

# Install dependencies based on repo
echo "Installing dependencies..."
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
elif [ -f setup.py ]; then
  pip install -e .
fi

# Run tests
echo "Running tests..."
if [[ "${task.repo}" == "django/django" ]]; then
  cd tests
  python runtests.py -v 2 auth_tests.test_validators
elif [[ "${task.repo}" == "sympy/sympy" ]]; then
  python -m pytest sympy/concrete/tests/test_sums_products.py -xvs
else
  python -m pytest -xvs
fi
`;

  await fs.writeFile(path.join(taskDir, "evaluate.sh"), evalScript);
  await fs.chmod(path.join(taskDir, "evaluate.sh"), 0o755);
  
  // Create Dockerfile
  const dockerfile = `FROM python:3.8

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY fix.patch evaluate.sh ./

RUN pip install pytest

ENTRYPOINT ["/bin/bash", "/workspace/evaluate.sh"]
`;

  await fs.writeFile(path.join(taskDir, "Dockerfile"), dockerfile);
  
  try {
    // Build image
    const imageName = `swebench-${task.instance_id}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    console.log(`  Building Docker image ${imageName}...`);
    
    const buildResult = await execAsync(
      `cd ${taskDir} && docker build -t ${imageName} .`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    // Run container
    console.log(`  Running evaluation...`);
    const runResult = await execAsync(
      `docker run --rm ${imageName}`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    const output = runResult.stdout + runResult.stderr;
    
    // Clean up
    await execAsync(`docker rmi ${imageName}`).catch(() => {});
    
    // Check if tests passed
    const success = output.includes("passed") && !output.includes("failed");
    
    return { success, output };
    
  } catch (error: any) {
    return { 
      success: false, 
      output: error.message || String(error) 
    };
  }
}

/**
 * Main evaluation program
 */
const program = Effect.gen(function* () {
  const patchGenerator = yield* AgentPatchGeneratorService;
  const taskService = yield* SWEBenchTaskService;
  
  yield* Console.log("🚀 SWE-bench Complete Evaluation");
  yield* Console.log(`📂 Output: ${outputDir}`);
  yield* Console.log(`🐳 Docker work dir: ${dockerWorkDir}`);
  
  // Setup directories
  yield* Effect.tryPromise(() => fs.mkdir(outputDir, { recursive: true }));
  yield* Effect.tryPromise(() => fs.mkdir(dockerWorkDir, { recursive: true }));
  
  // Get all tasks
  const taskIds = yield* taskService.listAvailableTaskIds();
  yield* Console.log(`\n📋 Found ${taskIds.length} tasks to evaluate`);
  
  const results: TaskResult[] = [];
  let passCount = 0;
  
  // Process each task
  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    yield* Console.log(`\n${"=".repeat(60)}`);
    yield* Console.log(`[${i + 1}/${taskIds.length}] ${taskId}`);
    
    const startTime = Date.now();
    const result: TaskResult = {
      taskId,
      repo: "",
      patchGenerated: false,
      dockerRun: false,
      testsPass: false,
      duration: 0
    };
    
    try {
      // Load task
      const task = yield* taskService.getTask(taskId);
      result.repo = task.repo;
      
      yield* Console.log(`  Repo: ${task.repo}`);
      yield* Console.log(`  Commit: ${task.base_commit}`);
      
      // Generate patch
      yield* Console.log(`  🤖 Generating patch with Claude...`);
      const patch = yield* patchGenerator.generatePatch(
        task,
        dockerWorkDir,
        "claude_code"
      );
      
      result.patchGenerated = true;
      result.patch = patch;
      
      // Save patch
      const patchFile = path.join(outputDir, `${taskId}.patch`);
      yield* Effect.tryPromise(() => fs.writeFile(patchFile, patch));
      
      yield* Console.log(`  ✅ Patch generated (${patch.length} chars)`);
      
      // Evaluate in Docker
      yield* Console.log(`  🐳 Evaluating in Docker...`);
      const evalResult = yield* Effect.tryPromise(() => 
        evaluateInDocker(task, patch)
      );
      
      result.dockerRun = true;
      result.testsPass = evalResult.success;
      
      if (evalResult.success) {
        yield* Console.log(`  ✅ Tests PASSED!`);
        passCount++;
      } else {
        yield* Console.log(`  ❌ Tests failed`);
        // Save failure log
        const logFile = path.join(outputDir, `${taskId}.log`);
        yield* Effect.tryPromise(() => 
          fs.writeFile(logFile, evalResult.output)
        );
      }
      
    } catch (error) {
      result.error = String(error);
      yield* Console.log(`  ❌ Error: ${result.error}`);
    }
    
    result.duration = Date.now() - startTime;
    results.push(result);
    
    // Update progress
    const progress = {
      timestamp: new Date().toISOString(),
      completed: i + 1,
      total: taskIds.length,
      passed: passCount,
      currentPassRate: (passCount / (i + 1) * 100).toFixed(1) + "%",
      results
    };
    
    yield* Effect.tryPromise(() =>
      fs.writeFile(
        path.join(outputDir, "progress.json"),
        JSON.stringify(progress, null, 2)
      )
    );
  }
  
  // Final summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalTasks: taskIds.length,
    patchesGenerated: results.filter(r => r.patchGenerated).length,
    dockerRuns: results.filter(r => r.dockerRun).length,
    testsPassed: passCount,
    passRate: (passCount / taskIds.length * 100).toFixed(1) + "%",
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    results
  };
  
  yield* Effect.tryPromise(() =>
    fs.writeFile(
      path.join(outputDir, "summary.json"),
      JSON.stringify(summary, null, 2)
    )
  );
  
  // Print summary
  yield* Console.log(`\n${"=".repeat(60)}`);
  yield* Console.log("📊 FINAL RESULTS");
  yield* Console.log(`${"=".repeat(60)}`);
  yield* Console.log(`Total tasks: ${taskIds.length}`);
  yield* Console.log(`Patches generated: ${summary.patchesGenerated}`);
  yield* Console.log(`Docker evaluations: ${summary.dockerRuns}`);
  yield* Console.log(`Tests passed: ${summary.testsPassed}`);
  yield* Console.log(`\n🎯 PASS RATE: ${summary.passRate}`);
  yield* Console.log(`\n📁 Results saved to: ${outputDir}`);
  
  return summary;
});

// Run the evaluation
console.log("\n🏁 Starting SWE-bench evaluation...\n");

Effect.runPromise(
  program.pipe(Effect.provide(PatchGenerationCliLayer))
)
  .then((summary) => {
    console.log("\n✨ Evaluation complete!");
    console.log(`\n📈 SWE-bench Score: ${summary.passRate}`);
    
    // Clean up Docker work directory
    fs.rm(dockerWorkDir, { recursive: true, force: true }).catch(() => {});
    
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Evaluation failed:", error);
    process.exit(1);
  });