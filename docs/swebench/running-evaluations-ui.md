# Running SWE-Bench Evaluations with the UI

This guide shows how to run SWE-Bench evaluations using Commander's graphical interface.

## Prerequisites

- Commander app running (`pnpm start`)
- Docker installed and running
- SWE-Bench tasks available in `assets/swe_bench_data/`

## Quick Start

### 1. Open the Task Browser

Press **Ctrl+7** (or Cmd+7 on Mac) to open the SWE-Bench Task Browser.

### 2. Select Tasks

- **For specific tasks**: Click the checkbox next to each task you want to evaluate
- **For all tasks**: Click "Select All" button
- **To search**: Type in the search box to filter tasks by ID

### 3. Launch Evaluation

1. Click **"Launch Evaluation"** button (shows count of selected tasks)
2. In the Evaluation Launcher:
   - **Patch Source**: Choose one of:
     - `Gold` - Use reference patches (for testing the harness)
     - `Empty` - No patches (baseline)
     - `Agent: Claude Code` - Generate patches with Claude
     - `Agent: Ollama` - Generate patches with Ollama
   - **Output Directory** (optional): Add a custom suffix like "experiment-1"
   - **Max Tasks** (optional): Limit number of tasks when running all
3. Click **"Run Evaluation"**

### 4. Monitor Progress

The Evaluation Monitor opens automatically showing:
- Real-time logs (stdout/stderr)
- Progress bar and statistics
- Success/failure counts
- Stop button if you need to cancel

### 5. View Results

When complete:
1. Click **"View Results"** in the monitor
2. Or press Ctrl+7 and manually open a Results Viewer pane
3. Select your run from the dropdown to see:
   - Summary statistics
   - Individual task results
   - Generated patches (click the file icon)

## Tips

- **Task Directories**: Use the dropdown in Task Browser to switch between different task sets
- **Multiple Runs**: You can run multiple evaluations in parallel - each gets its own monitor
- **Logs**: Switch between "All", "Stdout", and "Stderr" tabs to filter output
- **Results History**: All runs are saved in `docs/swebench-results/` for later viewing

## Troubleshooting

**No tasks showing?**
- Check that `assets/swe_bench_data/` contains JSON files
- Try selecting a different directory from the dropdown

**Evaluation fails immediately?**
- Ensure Docker is running: `docker ps`
- Check logs in the Evaluation Monitor stderr tab

**Can't see generated patches?**
- Only available when using agent patch sources
- Look for the file icon in the results table

## Example: Running a Full Evaluation

1. Press Ctrl+7 to open Task Browser
2. Select "patches" directory (default)
3. Click "Select All" 
4. Click "Launch Evaluation (X tasks)"
5. Choose "Gold" patch source for testing
6. Click "Run Evaluation"
7. Watch progress in the monitor
8. When done, click "View Results" to see outcomes