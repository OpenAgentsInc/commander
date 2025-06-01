# SWE-bench MVP: 4 Essential Panes for Commander

Based on your 24-hour sprint goal, here's the minimal viable product for getting SWE-bench working with your Claude Code agent:

## 1. **TaskBrowserPane**
**Type**: `swe_bench_task_browser`
- **Simple task list** with search/filter (instance ID, repo, difficulty)
- **One-click task selection** → feeds to evaluation config
- **Basic task preview** (problem statement, repo info)
- Uses your existing `SWEBenchTaskService`

## 2. **EvaluationLauncherPane**
**Type**: `swe_bench_evaluation_launcher`
- **Quick launch form**: Select tasks + Claude Code agent
- **Basic settings**: timeout, max tasks, output directory
- **"Run Evaluation" button** → triggers your `SWEBenchHarnessService`
- **Progress indicator** while starting up

## 3. **EvaluationMonitorPane**
**Type**: `swe_bench_evaluation_monitor`
- **Real-time progress bar** (X of Y tasks complete)
- **Current task status** (which instance is running)
- **Basic logs stream** from Docker containers
- **Stop/pause controls**
- Updates from your existing evaluation pipeline

## 4. **ResultsViewerPane**
**Type**: `swe_bench_results_viewer`
- **Results table**: Instance ID, Status (Pass/Fail), Duration
- **Success rate summary** at top
- **Quick patch viewer** (click to see generated diffs)
- **Export results** button
- Reads from your `/swebench-results/` directory

## Implementation Priority

**Day 1 (MVP Launch):**
1. `TaskBrowserPane` - Get basic task selection working
2. `EvaluationLauncherPane` - Wire up to your existing services
3. `EvaluationMonitorPane` - Show progress from running evaluations
4. `ResultsViewerPane` - Display your existing results

**Pane Registration Example:**
```typescript
// In your pane constants
export const SWE_BENCH_TASK_BROWSER_PANE_ID = "swe_bench_task_browser";
export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_ID = "swe_bench_evaluation_launcher";
export const SWE_BENCH_EVALUATION_MONITOR_PANE_ID = "swe_bench_evaluation_monitor";
export const SWE_BENCH_RESULTS_VIEWER_PANE_ID = "swe_bench_results_viewer";
```

**Hotbar Integration:**
- Add SWE-bench button to your hotbar that opens the `TaskBrowserPane`
- From there, users can launch → monitor → view results in a simple flow

This gives you the complete SWE-bench GUI workflow in 4 focused panes that leverage all your existing backend infrastructure! 🚀
