# SWE-bench Evaluation Visibility Analysis & Next Steps

## Executive Summary

We successfully generated 50 real patches for SWE-bench instances, but the evaluation process lacks visibility. While we have sophisticated UI components, the long-running evaluation scripts provide no real-time feedback beyond basic console output. This document analyzes our current infrastructure and proposes concrete improvements.

## Part 1: 50-Instance Evaluation Results

### Key Achievements
- **Generated 50/50 patches** (100% success rate) in ~115 minutes
- All patches are properly formatted git diffs
- Claude 3.5 Sonnet successfully understood complex Python codebases

### Sample Patches Generated
1. **Simple Fix** (astropy__astropy-12907):
   ```diff
   -        cright[-right.shape[0]:, -right.shape[1]:] = 1
   +        cright[-right.shape[0]:, -right.shape[1]:] = right
   ```

2. **Complex Addition** (astropy__astropy-13132):
   - Added `__array_function__` support to Time class
   - Created new helper modules
   - ~80 lines of code changes

3. **Feature Enhancement** (astropy__astropy-12544):
   - Added `mask_invalid` parameter to FITS table reading
   - Modified multiple functions with proper documentation

### Issue Encountered
The Python bridge only evaluated 2 instances instead of 50 due to a filtering bug. The process timed out during Docker image building with zero visibility into what was happening.

## Part 2: Current Infrastructure Analysis

### What We Have

#### 1. **Sophisticated UI Components**
- **TaskBrowserPane**: Browse and select SWE-bench tasks
- **EvaluationLauncherPane**: Configure evaluation parameters
- **EvaluationMonitorPane**: Real-time log streaming (stdout/stderr)
- **ResultsViewerPane**: View completed evaluation results
- **SweBenchSimpleLauncherPane**: Dataset management

#### 2. **IPC Communication**
Well-structured channels for:
- Task management
- Process spawning/monitoring
- Real-time output streaming
- Results retrieval

#### 3. **TelemetryService**
- Event tracking with categories/actions/labels
- Multiple log levels (debug, info, warn, error)
- File and console output
- Structured data with Schema validation

### What's Missing

#### 1. **Granular Progress Tracking**
Current state:
```
[Status] Building environment images...
📊 Progress: 50.0% (1/2)
```

What we need:
```
[Status] Building environment images...
  → astropy__astropy-12907: Pulling base image (2.3GB/3.1GB)
  → astropy__astropy-12907: Installing dependencies (45/127 packages)
  → astropy__astropy-12907: Running tests (3/15 completed)
  ✓ astropy__astropy-12907: RESOLVED (2 tests passed)
```

#### 2. **Telemetry UI Integration**
- No UI components consume telemetry events
- No real-time telemetry dashboard
- No metrics visualization

#### 3. **Process Visibility**
When running `run-swebench-50.ts`:
- No indication of current task being processed
- No Docker container status
- No test execution details
- No intermediate results

## Part 3: Gap Analysis

### Critical Gaps

1. **Script-to-UI Disconnect**
   - CLI scripts don't integrate with UI monitoring
   - No way to launch `run-swebench-real-simple.ts` from UI
   - UI components only work with older evaluation scripts

2. **Telemetry Underutilization**
   - Scripts use basic console.log instead of telemetry
   - No structured event format for SWE-bench operations
   - No telemetry persistence for analysis

3. **Docker Operations Opacity**
   - Image building happens silently
   - Container lifecycle not tracked
   - No resource usage monitoring

4. **Evaluation Pipeline Visibility**
   ```
   Current: Patch Generation → ??? → Results
   Needed:  Patch Generation → Clone Repo → Apply Patch → 
            Build Docker → Run Tests → Grade Results → Summary
   ```

## Part 4: Proposed Solution Architecture

### 1. Enhanced Telemetry Integration

```typescript
// New SWE-bench specific telemetry events
interface SWEBenchEvents {
  // Evaluation lifecycle
  "swebench:evaluation:start": { runId: string, config: EvaluationConfig }
  "swebench:evaluation:complete": { runId: string, summary: Summary }
  
  // Instance progress
  "swebench:instance:start": { instanceId: string, repo: string }
  "swebench:instance:patch_generated": { instanceId: string, patchSize: number }
  "swebench:instance:docker_build": { instanceId: string, step: string, progress: number }
  "swebench:instance:test_running": { instanceId: string, test: string, status: string }
  "swebench:instance:complete": { instanceId: string, resolved: boolean }
  
  // Metrics
  "swebench:metrics:update": { 
    runId: string,
    completed: number,
    total: number,
    resolved: number,
    duration: number
  }
}
```

### 2. New UI Components

#### A. **TelemetryStreamPane**
```typescript
interface TelemetryStreamPaneProps {
  runId: string
  filters?: EventFilter[]
  autoScroll?: boolean
}

// Features:
// - Real-time event stream
// - Filterable by category/action/level
// - Expandable event details
// - Search functionality
```

#### B. **EvaluationDashboard**
```typescript
interface EvaluationDashboardProps {
  runId: string
}

// Features:
// - Progress overview (patches/docker/tests)
// - Instance status grid
// - Resource usage graphs
// - Time estimates
```

### 3. Unified Evaluation Service

Create a new service that wraps all evaluation scripts:

```typescript
export class UnifiedEvaluationService extends Context.Tag("UnifiedEvaluationService")<
  UnifiedEvaluationService,
  {
    // Start evaluation with full telemetry
    startEvaluation: (config: EvaluationConfig) => Effect.Effect<
      Stream.Stream<EvaluationEvent, EvaluationError>,
      never
    >
    
    // Get evaluation status
    getStatus: (runId: string) => Effect.Effect<EvaluationStatus, never>
    
    // Cancel evaluation
    cancel: (runId: string) => Effect.Effect<void, never>
  }
>() {}
```

## Part 5: Implementation Roadmap

### Phase 1: Telemetry Enhancement (2-3 days)
1. Modify `claude-patch-generator.ts` to emit telemetry events
2. Update Python bridge to emit structured progress events
3. Create telemetry event schemas for SWE-bench operations
4. Add telemetry to all evaluation scripts

### Phase 2: UI Components (3-4 days)
1. Create TelemetryStreamPane component
2. Add telemetry integration to existing monitor pane
3. Create evaluation dashboard with progress visualization
4. Add WebSocket support for real-time updates

### Phase 3: Service Unification (2-3 days)
1. Create UnifiedEvaluationService
2. Wrap existing scripts in service methods
3. Add IPC handlers for new service
4. Update UI to use unified service

### Phase 4: Enhanced Monitoring (2-3 days)
1. Add Docker container monitoring
2. Implement test execution tracking
3. Create resource usage monitoring
4. Add time estimation algorithms

## Part 6: Immediate Next Steps for Coding Agent

### Task 1: Add Telemetry to Patch Generation
```typescript
// In claude-patch-generator.ts
const result = await generatePatchWithClaude(task, options);

// Add telemetry
yield* telemetry.trackEvent({
  category: "swebench",
  action: "patch_generated",
  label: task.instance_id,
  value: result.patch?.length || 0,
  context: {
    success: result.success,
    attempts: result.attempts,
    duration: result.duration,
    error: result.error
  }
});
```

### Task 2: Create Telemetry Stream Component
1. Create `src/components/telemetry/TelemetryStreamPane.tsx`
2. Subscribe to telemetry events via IPC
3. Display events in a filterable, searchable list
4. Add to pane registry

### Task 3: Enhance Python Bridge Logging
```python
# In python_bridge.py
def emit_progress(message_type, data):
    """Emit structured progress event"""
    event = {
        "type": "telemetry",
        "data": {
            "category": "swebench_evaluation",
            "action": message_type,
            "context": data,
            "timestamp": datetime.now().isoformat()
        }
    }
    print(json.dumps(event))
    sys.stdout.flush()
```

### Task 4: Update Monitor Pane
1. Parse telemetry events from stdout
2. Display structured progress information
3. Show per-instance status cards
4. Add progress timeline visualization

## Conclusion

We have a solid foundation with sophisticated UI components and a flexible telemetry service. The gap is in connecting these pieces to provide visibility into long-running evaluations. By implementing structured telemetry events and creating new UI components to consume them, we can transform the evaluation experience from a black box to a transparent, monitorable process.

The proposed changes will enable:
- Real-time visibility into every step of evaluation
- Better debugging when evaluations fail
- Performance insights and optimization opportunities
- A professional, production-ready evaluation system

With these improvements, running a 300-instance SWE-bench evaluation will provide continuous feedback and allow operators to understand exactly what's happening at each stage.