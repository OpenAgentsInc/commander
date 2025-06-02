#!/usr/bin/env tsx
/**
 * Docker-based evaluation for SWE-bench patches
 */

import { Effect, Console, Layer } from "effect";
import * as fs from "fs/promises";
import * as path from "path";
import { DockerUtilsService, DockerUtilsServiceLive } from "../src/services/docker";
import { ConfigurationServiceEnvLive } from "../src/services/configuration/ConfigurationServiceEnv";
import { NodeFileSystem } from "@effect/platform-node";
import type { SWEBenchTask } from "../src/services/swe_bench_harness/types";
import { spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(require("child_process").exec);

// Layer with just what we need for Docker
const DockerEvalLayer = Layer.mergeAll(
  ConfigurationServiceEnvLive,
  NodeFileSystem.layer,
  DockerUtilsServiceLive
);

interface DockerEvalResult {
  success: boolean;
  output: string;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

/**
 * Evaluates a patch in a Docker container
 */
export async function evaluatePatchInDocker(
  task: SWEBenchTask,
  patch: string,
  workDir: string = "/tmp/swebench"
): Promise<DockerEvalResult> {
  console.log(`\n🐳 Docker evaluation for ${task.instance_id}`);
  
  // Create work directory
  const taskWorkDir = path.join(workDir, task.instance_id);
  await fs.mkdir(taskWorkDir, { recursive: true });
  
  // Save patch to file
  const patchFile = path.join(taskWorkDir, "generated.patch");
  await fs.writeFile(patchFile, patch);
  
  // Create evaluation script
  const evalScript = `#!/bin/bash
set -e

echo "=== SWE-bench Docker Evaluation ==="
echo "Task: ${task.instance_id}"
echo "Repo: ${task.repo}"
echo "Commit: ${task.base_commit}"

# Clone repository
cd /workspace
git clone https://github.com/${task.repo}.git repo
cd repo
git checkout ${task.base_commit}

# Apply patch
echo "Applying patch..."
git apply /workspace/generated.patch

# Run tests
echo "Running tests..."
# This is where we'd run the actual test command
# For now, we'll simulate based on the task
if [[ "${task.instance_id}" == *"django"* ]]; then
  # Django tests
  python -m pytest tests/ -xvs || true
elif [[ "${task.instance_id}" == *"sympy"* ]]; then
  # SymPy tests
  python -m pytest sympy/ -xvs || true
else
  # Generic Python test
  python -m pytest -xvs || true
fi

echo "=== Evaluation Complete ==="
`;

  const evalScriptFile = path.join(taskWorkDir, "evaluate.sh");
  await fs.writeFile(evalScriptFile, evalScript);
  await fs.chmod(evalScriptFile, 0o755);
  
  // Create Dockerfile
  const dockerfile = `FROM python:3.8-slim

RUN apt-get update && apt-get install -y \\
    git \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy files
COPY generated.patch /workspace/
COPY evaluate.sh /workspace/

# Install pytest
RUN pip install pytest

# Run evaluation
CMD ["/workspace/evaluate.sh"]
`;

  const dockerfilePath = path.join(taskWorkDir, "Dockerfile");
  await fs.writeFile(dockerfilePath, dockerfile);
  
  try {
    // Build Docker image
    console.log("  Building Docker image...");
    const imageName = `swebench-eval-${task.instance_id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await execAsync(`docker build -t ${imageName} ${taskWorkDir}`);
    
    // Run container
    console.log("  Running evaluation container...");
    const { stdout, stderr } = await execAsync(
      `docker run --rm ${imageName}`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );
    
    const output = stdout + stderr;
    console.log("  Container output:", output.substring(0, 500) + "...");
    
    // Parse results (simplified for now)
    const testsRun = (output.match(/\d+ passed/g) || []).length;
    const testsPassed = testsRun; // Simplified
    const testsFailed = (output.match(/\d+ failed/g) || []).length;
    const success = testsFailed === 0 && testsRun > 0;
    
    // Clean up
    await execAsync(`docker rmi ${imageName}`);
    
    return {
      success,
      output,
      testsRun,
      testsPassed,
      testsFailed
    };
    
  } catch (error) {
    console.error("  Docker evaluation failed:", error);
    return {
      success: false,
      output: String(error),
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0
    };
  }
}

// Test function
export async function testDockerEval() {
  const testTask: SWEBenchTask = {
    instance_id: "test-task",
    repo: "python/cpython",
    base_commit: "abc123",
    problem_statement: "Test problem",
    patch: "",
    test_patch: "",
    version: "3.8"
  };
  
  const testPatch = `--- a/test.py
+++ b/test.py
@@ -1,3 +1,3 @@
 def hello():
-    return "world"
+    return "hello world"
`;

  const result = await evaluatePatchInDocker(testTask, testPatch);
  console.log("Test result:", result);
}

// Run test if called directly
if (require.main === module) {
  testDockerEval().catch(console.error);
}