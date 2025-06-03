# SWE-bench Integration Implementation Instructions

## For the Implementing Agent

You are tasked with integrating the official SWE-bench evaluation harness into Commander. The current implementation is **fake** - it only generates patches but doesn't actually test them. Your job is to make it real.

## Pre-requisites Check

Before starting, verify:
```bash
# Check Python 3.8+ is installed
python3 --version

# Check Docker is running
docker info

# Check you're in the commander directory
pwd  # Should show: /Users/christopherdavid/code/commander

# Official SWE-bench is cloned locally
ls /Users/christopherdavid/code/swe-bench
```

## Phase 1: Infrastructure Setup (2-3 hours)

### Step 1.1: Add SWE-bench as Submodule

```bash
# Add the official repo as a git submodule
git submodule add https://github.com/princeton-nlp/SWE-bench.git swebench
git submodule update --init --recursive

# Add to .gitignore
echo "/swebench" >> .gitignore
```

### Step 1.2: Create Python Bridge Structure

Create these directories and files:

```bash
mkdir -p src/services/swe_bench_harness/python-bridge
touch src/services/swe_bench_harness/python-bridge/__init__.py
touch src/services/swe_bench_harness/python-bridge/swebench_runner.py
touch src/services/swe_bench_harness/python-bridge/requirements.txt
```

### Step 1.3: Python Requirements

Create `src/services/swe_bench_harness/python-bridge/requirements.txt`:
```txt
# Install swebench from local submodule
-e ../../../../swebench
# Additional dependencies
docker>=6.0.0
python-dotenv
```

### Step 1.4: Setup Script

Create `scripts/setup-swebench.sh`:
```bash
#!/bin/bash
set -e

echo "Setting up SWE-bench Python environment..."

# Create virtual environment
python3 -m venv .venv

# Activate and install
source .venv/bin/activate
pip install --upgrade pip
pip install -r src/services/swe_bench_harness/python-bridge/requirements.txt

echo "SWE-bench setup complete!"
echo "To activate: source .venv/bin/activate"
```

## Phase 2: Core Implementation (4-5 hours)

### Step 2.1: Python Runner Implementation

Create `src/services/swe_bench_harness/python-bridge/swebench_runner.py`:

```python
#!/usr/bin/env python3
"""
Commander SWE-bench Bridge
Integrates official SWE-bench with Commander's TypeScript services
"""

import json
import sys
import os
import tempfile
import threading
import time
from pathlib import Path
from typing import Dict, Any, List

# Add swebench to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../swebench'))

from swebench.harness.run_evaluation import run_instances
from swebench.harness.utils import load_swebench_dataset, get_predictions

def send_message(msg_type: str, data: Any):
    """Send JSON message to parent process via stdout"""
    message = {
        "type": msg_type,
        "timestamp": time.time(),
        "data": data
    }
    print(json.dumps(message), flush=True)

def monitor_logs(run_id: str, stop_event: threading.Event):
    """Monitor SWE-bench logs and send progress updates"""
    log_dir = Path(f"logs/run_evaluation/{run_id}")
    
    while not stop_event.is_set():
        if log_dir.exists():
            # Count completed evaluations
            completed = len(list(log_dir.rglob("report.json")))
            send_message("progress", {
                "completed": completed,
                "run_id": run_id
            })
        time.sleep(1)

def main():
    """Main entry point for Commander integration"""
    # Read configuration from stdin
    config_str = sys.stdin.readline()
    config = json.loads(config_str)
    
    send_message("status", {"message": "Initializing SWE-bench evaluation"})
    
    try:
        # Create predictions file
        predictions_file = Path(tempfile.mktemp(suffix=".json"))
        predictions_file.write_text(json.dumps(config["predictions"]))
        
        # Load dataset
        dataset_name = config.get("dataset_name", "princeton-nlp/SWE-bench")
        send_message("status", {"message": f"Loading dataset: {dataset_name}"})
        
        instances = load_swebench_dataset(dataset_name)
        if "instance_ids" in config:
            instances = [i for i in instances if i["instance_id"] in config["instance_ids"]]
        
        # Get predictions
        predictions = get_predictions(str(predictions_file))
        
        # Start progress monitor
        stop_event = threading.Event()
        monitor_thread = threading.Thread(
            target=monitor_logs, 
            args=(config["run_id"], stop_event)
        )
        monitor_thread.start()
        
        # Run evaluation
        send_message("status", {"message": f"Starting evaluation of {len(predictions)} instances"})
        
        run_instances(
            predictions=predictions,
            instances=instances,
            run_id=config["run_id"],
            max_workers=config.get("max_workers", 1),
            timeout=config.get("timeout", 1800),
            cache_level=config.get("cache_level", "instance"),
            clean=config.get("clean", True),
            force_rebuild=config.get("force_rebuild", False)
        )
        
        # Stop monitoring
        stop_event.set()
        monitor_thread.join()
        
        # Collect results
        results_dir = Path(f"evaluation_results/{config['run_id']}")
        results = {}
        
        if results_dir.exists():
            for result_file in results_dir.glob("*.json"):
                with open(result_file) as f:
                    instance_result = json.load(f)
                    results[instance_result["instance_id"]] = instance_result
        
        send_message("complete", {
            "run_id": config["run_id"],
            "results": results
        })
        
    except Exception as e:
        send_message("error", {
            "message": str(e),
            "type": type(e).__name__
        })
        sys.exit(1)
    finally:
        # Cleanup
        if 'predictions_file' in locals() and predictions_file.exists():
            predictions_file.unlink()

if __name__ == "__main__":
    main()
```

### Step 2.2: TypeScript Bridge Service

Create `src/services/swe_bench_harness/SWEBenchPythonBridgeService.ts`:

```typescript
import { Context, Effect, Layer, Stream, Chunk } from "effect";

export interface SWEBenchPrediction {
  instance_id: string;
  model_name_or_path: string;
  model_patch: string;
}

export interface EvaluationOptions {
  dataset_name?: string;
  max_workers?: number;
  timeout?: number;
  cache_level?: string;
  run_id?: string;
  instance_ids?: string[];
}

export interface EvaluationProgress {
  type: "status" | "progress" | "complete" | "error";
  data: any;
}

export class PythonBridgeError extends Error {
  readonly _tag = "PythonBridgeError";
}

export class SWEBenchPythonBridgeService extends Context.Tag("SWEBenchPythonBridgeService")<
  SWEBenchPythonBridgeService,
  {
    readonly initialize: () => Effect.Effect<void, PythonBridgeError>;
    readonly runEvaluation: (
      predictions: SWEBenchPrediction[],
      options: EvaluationOptions
    ) => Stream.Stream<EvaluationProgress, PythonBridgeError>;
  }
>() {}
```

Create `src/services/swe_bench_harness/SWEBenchPythonBridgeServiceImpl.ts`:

```typescript
import { Effect, Layer, Stream, Chunk, Queue, Scope } from "effect";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { SWEBenchPythonBridgeService, PythonBridgeError, EvaluationProgress } from "./SWEBenchPythonBridgeService";
import { TelemetryService } from "@/services/telemetry";
import { FileSystem } from "@effect/platform/FileSystem";

export const SWEBenchPythonBridgeServiceLive = Layer.effect(
  SWEBenchPythonBridgeService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const fs = yield* FileSystem;
    
    const pythonScript = path.join(
      __dirname,
      "python-bridge",
      "swebench_runner.py"
    );
    
    return SWEBenchPythonBridgeService.of({
      initialize: () =>
        Effect.gen(function* () {
          // Check Python is available
          const pythonCheck = yield* Effect.tryPromise({
            try: () => {
              return new Promise((resolve, reject) => {
                const proc = spawn("python3", ["--version"]);
                proc.on("close", (code) => {
                  if (code === 0) resolve(true);
                  else reject(new Error("Python not found"));
                });
              });
            },
            catch: (e) => new PythonBridgeError(`Python check failed: ${e}`)
          });
          
          // Check script exists
          const scriptExists = yield* fs.exists(pythonScript);
          if (!scriptExists) {
            return yield* Effect.fail(
              new PythonBridgeError(`Python script not found: ${pythonScript}`)
            );
          }
          
          yield* telemetry.trackEvent({
            category: "swebench_python_bridge",
            action: "initialized"
          }).pipe(Effect.catchAll(() => Effect.void));
        }),
        
      runEvaluation: (predictions, options) =>
        Stream.unwrapScoped(
          Effect.gen(function* () {
            const queue = yield* Queue.unbounded<EvaluationProgress>();
            
            // Start Python process
            const proc = spawn("python3", [pythonScript], {
              stdio: ["pipe", "pipe", "pipe"]
            });
            
            // Set up readline for parsing JSON lines
            const rl = readline.createInterface({
              input: proc.stdout!,
              crlfDelay: Infinity
            });
            
            // Handle stdout (JSON messages)
            rl.on("line", (line) => {
              try {
                const message = JSON.parse(line);
                Queue.offer(queue, message).pipe(Effect.runSync);
              } catch (e) {
                // Ignore non-JSON lines
              }
            });
            
            // Handle stderr
            proc.stderr!.on("data", (data) => {
              telemetry.trackEvent({
                category: "swebench_python_bridge",
                action: "stderr",
                label: data.toString()
              }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
            });
            
            // Handle process exit
            proc.on("close", (code) => {
              if (code !== 0) {
                Queue.offer(queue, {
                  type: "error",
                  data: { message: `Process exited with code ${code}` }
                }).pipe(Effect.runSync);
              }
              Queue.shutdown(queue).pipe(Effect.runSync);
            });
            
            // Send configuration
            const config = {
              predictions,
              run_id: options.run_id || `run_${Date.now()}`,
              ...options
            };
            
            proc.stdin!.write(JSON.stringify(config) + "\n");
            
            // Clean up on scope close
            yield* Scope.addFinalizer(Scope.Scope, Effect.sync(() => {
              if (!proc.killed) {
                proc.kill();
              }
            }));
            
            return Stream.fromQueue(queue);
          })
        )
    });
  })
);
```

### Step 2.3: Update Layer Composition

Add to `src/services/swe_bench_harness/cli-layer-composition.ts`:

```typescript
import { SWEBenchPythonBridgeServiceLive } from "./SWEBenchPythonBridgeServiceImpl";

// Add to the composed layer
const layer = Layer.mergeAll(
  // ... existing layers ...
  SWEBenchPythonBridgeServiceLive
);
```

### Step 2.4: Modify Harness Service

Update `src/services/swe_bench_harness/SWEBenchHarnessServiceImpl.ts`:

Add a feature flag at the top:
```typescript
const USE_OFFICIAL_SWEBENCH = process.env.USE_OFFICIAL_SWEBENCH === "true";
```

Modify the evaluateTask method:
```typescript
evaluateTask: (instanceId, patchSource) =>
  Effect.gen(function* (_) {
    if (USE_OFFICIAL_SWEBENCH) {
      // New official implementation
      const pythonBridge = yield* SWEBenchPythonBridgeService;
      const task = yield* taskService.getTask(instanceId);
      
      // Generate patch
      let patch: string;
      switch (patchSource.type) {
        case "gold":
          patch = task.patch || "";
          break;
        case "empty":
          patch = "";
          break;
        case "content":
          patch = patchSource.content;
          break;
        case "agent_generated":
          const generator = yield* AgentPatchGeneratorService;
          patch = yield* generator.generatePatch(task, "", patchSource.providerKey);
          break;
      }
      
      // Format prediction
      const prediction: SWEBenchPrediction = {
        instance_id: instanceId,
        model_name_or_path: "commander-claude-code",
        model_patch: patch
      };
      
      // Run evaluation
      const stream = pythonBridge.runEvaluation([prediction], {
        max_workers: 1,
        timeout: 1800
      });
      
      // Collect results
      const messages = yield* stream.pipe(
        Stream.runCollect,
        Effect.map(Chunk.toArray)
      );
      
      // Find completion message
      const result = messages.find(m => m.type === "complete");
      if (!result) {
        return yield* Effect.fail(new HarnessError({
          message: "Evaluation did not complete",
          instanceId
        }));
      }
      
      // Format result
      const instanceResult = result.data.results[instanceId];
      return {
        instance_id: instanceId,
        report: {
          instance_id: instanceId,
          resolved: instanceResult?.resolved || false,
          patch_applied_successfully: true,
          tests_passed: instanceResult?.resolved || false,
          test_output_path: instanceResult?.test_output_path
        },
        duration_ms: Date.now() - startTime,
        patch_source_type: patchSource.type
      };
    } else {
      // Existing implementation
      // ... keep existing code ...
    }
  })
```

## Phase 3: Testing & Validation (2-3 hours)

### Step 3.1: Create Test Script

Create `scripts/test-swebench-integration.ts`:

```typescript
import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";

// Set feature flag
process.env.USE_OFFICIAL_SWEBENCH = "true";

async function testIntegration() {
  console.log("Testing SWE-bench Python bridge integration...");
  
  // Test 1: Single task with gold patch
  console.log("\nTest 1: Gold patch evaluation");
  const result1 = await Effect.runPromise(
    evaluateTask("sympy__sympy-20590", { type: "gold" })
  );
  console.log("Result:", result1);
  
  // Test 2: Generate patch with Claude
  console.log("\nTest 2: Claude-generated patch");
  const result2 = await Effect.runPromise(
    evaluateTask("django__django-11099", {
      type: "agent_generated",
      providerKey: "claude_code"
    })
  );
  console.log("Result:", result2);
}

testIntegration().catch(console.error);
```

### Step 3.2: Update Documentation

Update `docs/swebench/README.md` to remove the disclaimer about not running tests:

```markdown
## Current Implementation Status

✅ **Full Test Execution**: The system now uses the official SWE-bench evaluation harness
✅ **Accurate Results**: Tests are actually run in Docker containers
✅ **Proper Validation**: FAIL_TO_PASS and PASS_TO_PASS tests are properly validated
✅ **Multi-language Support**: Supports all languages that SWE-bench supports
```

## Phase 4: UI Integration (1-2 hours)

### Step 4.1: Update Progress Monitoring

The existing UI should continue to work, but update the progress monitoring to use the Python bridge messages.

### Step 4.2: Add Setup Instructions to UI

Add a setup check on first run that verifies Python and Docker are available.

## Validation Checklist

- [ ] Python environment is set up correctly
- [ ] Can import swebench package
- [ ] Docker is running and accessible
- [ ] Can run evaluation with gold patches
- [ ] Can run evaluation with Claude-generated patches
- [ ] Progress updates appear in UI
- [ ] Results match official SWE-bench format
- [ ] Error handling works correctly
- [ ] Documentation is updated

## Common Issues & Solutions

1. **Python not found**: Ensure Python 3.8+ is in PATH
2. **Import errors**: Run `scripts/setup-swebench.sh`
3. **Docker errors**: Check Docker daemon is running
4. **Permission errors**: May need to run with appropriate permissions

## Testing Commands

```bash
# Setup
./scripts/setup-swebench.sh
source .venv/bin/activate

# Test Python bridge directly
cd src/services/swe_bench_harness/python-bridge
echo '{"predictions": [{"instance_id": "sympy__sympy-20590", "model_name_or_path": "test", "model_patch": ""}], "run_id": "test-1"}' | python3 swebench_runner.py

# Test full integration
USE_OFFICIAL_SWEBENCH=true pnpm tsx scripts/test-swebench-integration.ts
```

## Success Criteria

When complete, running an evaluation should:
1. Actually execute tests in Docker containers
2. Report real pass/fail results
3. Show progress in real-time
4. Generate results that match the official SWE-bench format

Remember: The goal is to replace the fake evaluation with real test execution while keeping the existing UI and Claude Code integration working.