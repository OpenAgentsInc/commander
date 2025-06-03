# SWE-bench Official Integration Specification

## Overview

This specification defines how to integrate the official SWE-bench evaluation harness with Commander's Claude Code agent while preserving the existing UI and workflow.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Commander Electron App                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Renderer Process                      │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │ │
│  │  │   UI Panes  │  │ Task Browser │  │ Result Viewer │  │ │
│  │  └─────────────┘  └──────────────┘  └───────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │ IPC                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     Main Process                         │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │          SWEBenchPythonBridgeService            │    │ │
│  │  │  - Spawns Python subprocess                     │    │ │
│  │  │  - Formats patches for SWE-bench                │    │ │
│  │  │  - Streams evaluation progress                  │    │ │
│  │  └──────────────────────┬──────────────────────────┘    │ │
│  │                         │ Child Process                  │ │
│  │  ┌──────────────────────▼──────────────────────────┐    │ │
│  │  │           swebench_runner.py                    │    │ │
│  │  │  - Uses official swebench package               │    │ │
│  │  │  - Runs evaluations                             │    │ │
│  │  │  - Returns structured results                   │    │ │
│  │  └──────────────────────┬──────────────────────────┘    │ │
│  │                         │                                │ │
│  │  ┌──────────────────────▼──────────────────────────┐    │ │
│  │  │      AgentPatchGeneratorService                 │    │ │
│  │  │  - Generates patches via Claude Code            │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Docker API    │
                    └─────────────────┘
```

## Integration Points

### 1. Python Bridge Service

**File**: `src/services/swe_bench_harness/SWEBenchPythonBridgeService.ts`

```typescript
interface SWEBenchPythonBridgeService {
  readonly _: unique symbol;
  
  /**
   * Initialize the Python environment and check dependencies
   */
  initialize(): Effect.Effect<void, PythonBridgeError>;
  
  /**
   * Run evaluation using official SWE-bench
   * @param predictions Array of predictions in SWE-bench format
   * @param options Evaluation options
   */
  runEvaluation(
    predictions: SWEBenchPrediction[],
    options: EvaluationOptions
  ): Stream.Stream<EvaluationProgress, PythonBridgeError>;
  
  /**
   * Get evaluation results
   * @param runId The evaluation run ID
   */
  getResults(runId: string): Effect.Effect<EvaluationResults, PythonBridgeError>;
}

interface SWEBenchPrediction {
  instance_id: string;
  model_name_or_path: string;
  model_patch: string;
}

interface EvaluationOptions {
  dataset_name?: string;  // Default: "princeton-nlp/SWE-bench"
  max_workers?: number;   // Default: 1
  timeout?: number;       // Default: 1800
  cache_level?: string;   // Default: "instance"
  namespace?: string;     // Default: "swebench"
}
```

### 2. Python Runner Script

**File**: `src/services/swe_bench_harness/python-bridge/swebench_runner.py`

```python
#!/usr/bin/env python3
"""
Bridge between Commander and official SWE-bench evaluation harness.
Handles streaming progress updates and result formatting.
"""

import json
import sys
import threading
from pathlib import Path
from typing import List, Dict, Any

from swebench.harness.run_evaluation import main as run_evaluation
from swebench.harness.utils import load_swebench_dataset

class CommanderSWEBenchRunner:
    def __init__(self):
        self.progress_file = None
        
    def run_evaluation(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run SWE-bench evaluation with Commander configuration."""
        # Convert Commander format to SWE-bench CLI args
        args = self._build_args(config)
        
        # Set up progress monitoring
        self._setup_progress_monitoring(config['run_id'])
        
        # Run official SWE-bench evaluation
        results = run_evaluation(args)
        
        return self._format_results(results)
    
    def _build_args(self, config: Dict[str, Any]) -> List[str]:
        """Convert config to SWE-bench CLI arguments."""
        args = []
        
        # Required arguments
        args.extend(['--predictions_path', config['predictions_path']])
        args.extend(['--run_id', config['run_id']])
        
        # Optional arguments
        if 'dataset_name' in config:
            args.extend(['--dataset_name', config['dataset_name']])
        if 'max_workers' in config:
            args.extend(['--max_workers', str(config['max_workers'])])
        if 'timeout' in config:
            args.extend(['--timeout', str(config['timeout'])])
            
        return args
```

### 3. Modified Harness Service

**Changes to**: `src/services/swe_bench_harness/SWEBenchHarnessServiceImpl.ts`

```typescript
// Add new evaluation mode
evaluateTask: (instanceId, patchSource) =>
  Effect.gen(function* (_) {
    const pythonBridge = yield* SWEBenchPythonBridgeService;
    
    // Generate patch using existing logic
    const patch = yield* generatePatchContent(task, patchSource);
    
    // Format for SWE-bench
    const prediction: SWEBenchPrediction = {
      instance_id: instanceId,
      model_name_or_path: "commander-claude-code",
      model_patch: patch
    };
    
    // Run evaluation via Python bridge
    const results = yield* pythonBridge.runEvaluation(
      [prediction],
      { max_workers: 1, timeout: 1800 }
    ).pipe(
      Stream.runCollect,
      Effect.map(Chunk.toArray)
    );
    
    return formatEvaluationResult(results);
  })
```

## Data Flow

### 1. Patch Generation Flow
```
User Request → UI → IPC → AgentPatchGenerator → Claude Code → Patch
```

### 2. Evaluation Flow
```
Patch → Python Bridge → SWE-bench → Docker → Test Results → UI
```

### 3. Progress Updates
```
Python Process → JSON Lines → Node.js Stream → IPC → UI Updates
```

## File Structure

```
commander/
├── .gitignore                    # Add: /swebench
├── scripts/
│   └── setup-swebench.sh         # NEW: Clone and setup script
├── src/
│   ├── main.ts                   # Add Python bridge IPC handlers
│   └── services/
│       └── swe_bench_harness/
│           ├── python-bridge/    # NEW: Python integration
│           │   ├── __init__.py
│           │   ├── swebench_runner.py
│           │   ├── progress_monitor.py
│           │   └── requirements.txt
│           ├── SWEBenchPythonBridgeService.ts
│           └── SWEBenchPythonBridgeServiceImpl.ts
└── swebench/                     # Git submodule (official repo)
```

## Implementation Steps

### Phase 1: Setup Infrastructure (Day 1)

1. **Add SWE-bench as Git Submodule**
   ```bash
   git submodule add https://github.com/princeton-nlp/SWE-bench.git swebench
   git submodule update --init --recursive
   ```

2. **Create Python Environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -e ./swebench
   pip install -r src/services/swe_bench_harness/python-bridge/requirements.txt
   ```

3. **Implement Python Bridge Service**
   - Create TypeScript service interface
   - Implement child process spawning
   - Add JSON-lines communication protocol
   - Handle process lifecycle

### Phase 2: Integration (Day 2)

1. **Modify Existing Services**
   - Update `SWEBenchHarnessServiceImpl` to use Python bridge
   - Keep existing UI components unchanged
   - Maintain backward compatibility

2. **Implement Progress Streaming**
   - Monitor SWE-bench log files
   - Parse progress updates
   - Stream to UI via IPC

3. **Result Processing**
   - Parse SWE-bench evaluation results
   - Convert to Commander's format
   - Store in existing structure

### Phase 3: Testing & Polish (Day 3)

1. **End-to-End Testing**
   - Test with gold patches
   - Test with Claude-generated patches
   - Verify all 2,298 tasks can be loaded

2. **Error Handling**
   - Python environment errors
   - Docker errors
   - Timeout handling

3. **Documentation Updates**
   - Update README
   - Fix misleading claims
   - Add setup instructions

## Key Considerations

### 1. Python Environment Management
- Check Python availability on startup
- Provide clear error messages if missing
- Consider bundling Python or using conda

### 2. Docker Resource Management
- Official SWE-bench can use significant resources
- Implement proper cleanup on interruption
- Add resource usage warnings

### 3. Progress Reporting
- SWE-bench writes to log files, not stdout
- Need file watching for real-time updates
- Parse structured logs for progress

### 4. Error Recovery
- Handle partial runs
- Allow resuming failed evaluations
- Proper cleanup on errors

## Testing Strategy

### Unit Tests
```typescript
describe('SWEBenchPythonBridgeService', () => {
  it('should initialize Python environment');
  it('should format predictions correctly');
  it('should parse evaluation results');
  it('should handle Python process errors');
});
```

### Integration Tests
```typescript
describe('Full Evaluation Pipeline', () => {
  it('should run evaluation with gold patch');
  it('should run evaluation with generated patch');
  it('should report progress updates');
  it('should handle timeouts gracefully');
});
```

## Success Criteria

1. **Functional Requirements**
   - ✅ Can run full SWE-bench evaluation suite
   - ✅ Accurately reports PASS/FAIL for each test
   - ✅ Properly validates FAIL_TO_PASS transitions
   - ✅ Supports all SWE-bench languages (Python, JS, etc.)

2. **Performance Requirements**
   - ✅ Evaluation speed matches official SWE-bench
   - ✅ Handles concurrent evaluations up to CPU limits
   - ✅ Proper Docker resource cleanup

3. **User Experience**
   - ✅ Existing UI continues to work
   - ✅ Real-time progress updates
   - ✅ Clear error messages
   - ✅ Results match official leaderboard format

## Migration Path

1. **Keep existing code**: Don't delete current implementation yet
2. **Add feature flag**: `USE_OFFICIAL_SWEBENCH=true`
3. **Gradual rollout**: Test with subset first
4. **Full migration**: Once validated, remove old code

This approach ensures we get real SWE-bench evaluation working while minimizing disruption to the existing system.