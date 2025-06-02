# Python Integration in Commander

This document explains how the Commander application integrates with Python for various features, particularly for the SWE-Bench dataset management functionality.

## Overview

Commander uses Python as an external process to handle certain tasks that are better suited to Python's ecosystem, particularly when working with machine learning datasets from Hugging Face. The integration follows a subprocess architecture where the Electron main process spawns Python scripts and communicates with them via JSON messages.

## Architecture

```
┌─────────────────────┐
│   Electron Main     │
│     Process         │
│   (main.ts)         │
└──────────┬──────────┘
           │
           │ spawn()
           ▼
┌─────────────────────┐
│   Python Process    │
│  (*.py scripts)     │
└─────────────────────┘
           │
           │ JSON output
           ▼
┌─────────────────────┐
│  IPC to Renderer    │
│    Process          │
└─────────────────────┘
```

## Communication Protocol

### 1. Process Spawning

The main process uses Node.js's `child_process.spawn()` to execute Python scripts:

```typescript
const child = spawn("python3", args, {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
});
```

### 2. JSON Message Format

Python scripts communicate progress and results back to Electron using structured JSON messages printed to stdout:

```python
print(json.dumps({
    "type": "progress",    # or "error", "complete", "success"
    "message": "Human-readable message",
    "progress": 50,        # Optional: percentage (0-100)
    "taskCount": 100       # Optional: additional data
}))
```

### 3. Error Handling

Errors are communicated through JSON messages with type "error":

```python
print(json.dumps({
    "type": "error",
    "message": "Detailed error message for user"
}))
sys.exit(1)  # Non-zero exit code indicates failure
```

## Python Scripts

### 1. check_python_deps.py

**Purpose**: Verifies that required Python dependencies are installed before attempting to run other Python scripts.

**Location**: `scripts/check_python_deps.py`

**Key Features**:
- Checks for required packages (currently `datasets` and `requests`)
- Attempts to auto-install missing dependencies via pip
- Returns JSON status messages

**Usage in main.ts**:
```typescript
const depCheck = spawnSync("python3", ["scripts/check_python_deps.py"], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
```

### 2. download_swe_bench_tasks.py

**Purpose**: Downloads SWE-Bench dataset tasks from Hugging Face and saves them as individual JSON files.

**Location**: `scripts/download_swe_bench_tasks.py`

**Key Features**:
- Downloads tasks from the official `princeton-nlp/SWE-bench` dataset
- Supports different dataset splits (test, dev, train)
- Provides real-time progress updates via JSON messages
- Sanitizes filenames for cross-platform compatibility

**Command-line arguments**:
- `--dataset_name`: Hugging Face dataset identifier (default: "princeton-nlp/SWE-bench")
- `--split`: Dataset split to download (default: "test")
- `--output_dir`: Directory to save task files (default: "assets/swe_bench_data")
- `--max_tasks`: Optional limit on number of tasks to download

## IPC Integration

### IPC Channels

The main process exposes these Python-related IPC channels:

1. **SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL**: Checks if dataset exists on disk
2. **SWE_BENCH_DOWNLOAD_DATASET_CHANNEL**: Initiates dataset download
3. **SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL**: Streams progress updates
4. **SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL**: Signals download completion

### Example IPC Handler

```typescript
ipcMain.handle(SWE_BENCH_DOWNLOAD_DATASET_CHANNEL, async (event, params: any) => {
  // 1. Check Python dependencies
  const depCheck = spawnSync("python3", ["scripts/check_python_deps.py"], ...);
  
  // 2. Build arguments for Python script
  const args = ["scripts/download_swe_bench_tasks.py"];
  if (params.datasetName) args.push("--dataset_name", params.datasetName);
  
  // 3. Spawn Python process
  const child = spawn("python3", args, ...);
  
  // 4. Handle stdout for progress messages
  child.stdout.on("data", (data: Buffer) => {
    const parsed = JSON.parse(message);
    event.sender.send(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, parsed);
  });
});
```

## Error Handling Best Practices

### 1. Python Availability Check

Before running any Python script, the main process checks if Python is available:

```typescript
if (depCheck.error) {
  throw new Error("Python 3 is not installed or not in PATH");
}
```

### 2. User-Friendly Error Messages

The UI layer transforms technical errors into helpful messages:

```typescript
if (errorMsg.includes("Missing required Python packages")) {
  helpfulError = "Missing Python dependencies. Please run: pip install datasets";
}
```

### 3. Graceful Degradation

If Python operations fail, the application continues to function with appropriate error states shown in the UI.

## Dependencies

### Required Python Version
- Python 3.7 or later

### Required Python Packages
- `datasets`: Hugging Face datasets library for downloading SWE-Bench
- `requests`: HTTP library (usually installed with datasets)

### Installation
```bash
pip install datasets
```

Or if you have multiple Python versions:
```bash
python3 -m pip install datasets
```

## Security Considerations

1. **Input Validation**: All arguments passed to Python scripts are validated
2. **Path Restrictions**: File operations are restricted to the application's working directory
3. **Process Isolation**: Python processes run with limited permissions
4. **No Shell Execution**: Uses `spawn()` instead of `exec()` to avoid shell injection

## Future Enhancements

1. **Virtual Environment Support**: Consider using Python virtual environments for dependency isolation
2. **Binary Distribution**: Bundle Python runtime with the application for easier distribution
3. **Streaming Large Datasets**: Implement chunked downloading for very large datasets
4. **Caching**: Add local caching to avoid re-downloading datasets

## Troubleshooting

### Common Issues

1. **"Python 3 is not installed"**
   - Install Python from https://python.org/downloads/
   - Ensure Python is added to PATH during installation

2. **"Missing required Python packages"**
   - Run: `pip install datasets`
   - On macOS with system Python: `pip3 install --user datasets`

3. **"Download process exited with code 1"**
   - Check Python installation: `python3 --version`
   - Verify dependencies: `python3 scripts/check_python_deps.py`
   - Check network connectivity for Hugging Face access

### Debug Mode

To debug Python script execution, you can run them manually:

```bash
# Check dependencies
python3 scripts/check_python_deps.py

# Test dataset download
python3 scripts/download_swe_bench_tasks.py --max_tasks 5
```

## Code Examples

### Adding a New Python Script

1. Create the Python script in `scripts/`:
```python
#!/usr/bin/env python3
import json
import sys

def main():
    # Emit progress
    print(json.dumps({
        "type": "progress",
        "message": "Processing...",
        "progress": 50
    }))
    
    # Emit completion
    print(json.dumps({
        "type": "complete",
        "message": "Task completed successfully"
    }))

if __name__ == "__main__":
    main()
```

2. Add IPC handler in main.ts:
```typescript
ipcMain.handle("my-python-task", async (event, params) => {
  const child = spawn("python3", ["scripts/my_script.py"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"]
  });
  
  child.stdout.on("data", (data) => {
    const message = JSON.parse(data.toString());
    event.sender.send("my-python-task:progress", message);
  });
});
```

3. Expose in context-exposer.ts:
```typescript
myPythonTask: () => ipcRenderer.invoke("my-python-task")
```

This architecture provides a clean separation between the Electron/TypeScript application logic and Python-based data processing tasks, leveraging the strengths of both ecosystems.