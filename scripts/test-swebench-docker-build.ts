#!/usr/bin/env tsx
/**
 * Manual test script for SWE-bench Docker image building
 * Usage: pnpm tsx scripts/test-swebench-docker-build.ts
 */

import { Effect, Layer, Exit } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { NodeRuntime } from "@effect/platform-node";
import { 
  SWEBenchLifecycleService, 
  SWEBenchLifecycleServiceLive,
  DockerBuildManagerServiceLive,
  type SWEBenchTask 
} from "@/services/swe_bench_harness";
import { DockerUtilsServiceLive } from "@/services/docker";
import { ConfigurationServiceLive } from "@/services/configuration";
import { TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

// Create a test task
const testTask: SWEBenchTask = {
  instance_id: "test-task-001",
  repo: "octocat/Hello-World", // Using a small public repo for testing
  base_commit: "553c2077ca0b125ec3dda96f8e9bb0438f00901e", // First commit in Hello-World
  problem_statement: "Test problem: Add a greeting function",
  test_patch: `
diff --git a/test_greeting.py b/test_greeting.py
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/test_greeting.py
@@ -0,0 +1,5 @@
+def test_greeting():
+    from greeting import say_hello
+    assert say_hello("World") == "Hello, World!"
+
+test_greeting()
`,
  version: "1.0",
  FAIL_TO_PASS: ["test_greeting"],
  PASS_TO_PASS: [],
  patch: `
diff --git a/greeting.py b/greeting.py
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/greeting.py
@@ -0,0 +1,2 @@
+def say_hello(name):
+    return f"Hello, {name}!"
`,
  hints_text: ""
};

// Create the runtime layer
const RuntimeLayer = Layer.mergeAll(
  DockerUtilsServiceLive,
  ConfigurationServiceLive,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  DockerBuildManagerServiceLive,
  SWEBenchLifecycleServiceLive,
  NodeFileSystem.layer
);

// Main test program
const testProgram = Effect.gen(function* () {
  const lifecycle = yield* SWEBenchLifecycleService;
  
  console.log("🚀 Starting SWE-bench Docker build test...\n");
  
  try {
    // Step 1: Setup container
    console.log("📦 Setting up container for task...");
    const context = yield* lifecycle.setupContainerForTask(testTask);
    console.log("✅ Container setup complete!");
    console.log("   Container ID:", context.containerId);
    console.log("   Image Name:", context.imageName);
    console.log("   Host Eval Dir:", context.hostEvalDir);
    console.log("   Build Context Dir:", context.hostBuildCtxDir);
    
    // Step 2: Run evaluation
    console.log("\n🧪 Running evaluation...");
    const evalScript = `#!/bin/bash
set -e
echo "Running evaluation script..."
cd ${context.containerRepoPath}

# Apply the patch
echo "Applying patch..."
patch -p1 < /swe_bench_workdir/patch.diff

# Run the test
echo "Running test..."
python -c "
def say_hello(name):
    return f'Hello, {name}!'

def test_greeting():
    assert say_hello('World') == 'Hello, World!'
    print('Test passed!')

test_greeting()
"

# Create report
cat > /tmp/report.json << EOF
{
  "instance_id": "test-task-001",
  "patch_applied_successfully": true,
  "tests_passed": true,
  "resolved": true,
  "test_output": "Test passed!"
}
EOF

echo "Evaluation complete!"
`;

    const report = yield* lifecycle.runEvaluationInContainer(
      context,
      evalScript,
      testTask.patch || ""
    );
    
    console.log("✅ Evaluation complete!");
    console.log("   Instance ID:", report.instance_id);
    console.log("   Resolved:", report.resolved);
    console.log("   Tests Passed:", report.tests_passed);
    
    // Step 3: Cleanup
    console.log("\n🧹 Cleaning up resources...");
    yield* lifecycle.cleanupContainerResources(context);
    console.log("✅ Cleanup complete!");
    
    console.log("\n✨ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
});

// Run the test
console.log("Starting Docker build test...\n");
console.log("Note: This requires Docker to be running and will fail when trying to pull");
console.log("the base image 'swebench/swe-eval:latest' unless you have it locally.\n");
console.log("To create a mock base image, run:");
console.log("  docker pull python:3.8-slim");
console.log("  docker tag python:3.8-slim swebench/swe-eval:latest\n");

NodeRuntime.runMain(
  testProgram.pipe(
    Effect.provide(RuntimeLayer),
    Effect.tapError(error => 
      Effect.sync(() => {
        console.error("\n❌ Error details:", error);
      })
    )
  )
);