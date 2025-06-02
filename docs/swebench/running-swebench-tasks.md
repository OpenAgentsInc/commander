# Running SWE-Bench Tasks Guide

## Overview

SWE-bench is a benchmark for evaluating language models on real-world software engineering tasks. This guide explains how to download official task data from Hugging Face and run evaluations using Commander's built-in harness service.

## Prerequisites

1. **Docker**: Ensure Docker is installed and running
2. **Node.js and pnpm**: Required for running TypeScript scripts
3. **Python 3**: Required for downloading task data
4. **Python dependencies**: Install with:
   ```bash
   pip install datasets huggingface_hub
   ```
5. **SWE-Bench Docker image**: Pull the base image:
   ```bash
   docker pull swebench/swe-eval:latest
   ```

## Understanding SWE-Bench Task Structure

A SWE-bench task contains:

```typescript
{
  "instance_id": "django__django-11099",
  "repo": "django/django",
  "base_commit": "ef082ebb84f00e38af4e8880d04e8365c2766d34",
  "problem_statement": "Description of the bug to fix...",
  "hints_text": "Optional hints about the solution",
  "test_patch": "Diff containing the test cases",
  "version": "3.0",
  "FAIL_TO_PASS": ["tests/migrations/test_questioner.py::test_ask_not_null_alteration"],
  "PASS_TO_PASS": ["tests/migrations/test_questioner.py::test_ask_not_null_addition"],
  "patch": "Optional gold patch (the actual fix)"
}
```

## Setting up Task Data

### Task Data Location

The full SWE-bench dataset (2,298 tasks) is already included in `assets/swe_bench_data/`. Each task is stored as a JSON file named `<instance_id>.json`.

To update or download fresh data from Hugging Face:

```bash
# Use the provided shell script
./scripts/fetch_swebench_tasks.sh

# Or manually download using Python (requires datasets and huggingface_hub)
# Note: Some datasets may require Hugging Face authentication
```

### Task File Naming

Tasks are saved as `<instance_id>.json` with sanitized filenames (e.g., `django__django-11099.json`).

## Running Evaluations

### Batch Evaluation Runner

Use `scripts/run-swebench-evaluation.ts` to evaluate multiple tasks:

```bash
# Run full evaluation with gold patches (reference implementation)
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source gold

# Evaluate with AI-generated patches (Claude)
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source agent:claude_code --max_tasks 50

# Evaluate with empty patches (baseline)
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source empty --max_tasks 10

# Run specific tasks by ID
pnpm tsx scripts/run-swebench-evaluation.ts --instance_ids "django__django-11099,sympy__sympy-13146"

# Stop on first failure
pnpm tsx scripts/run-swebench-evaluation.ts --stop_on_failure --max_tasks 100

# Custom output directory
pnpm tsx scripts/run-swebench-evaluation.ts --output_dir ./my-results

# Monitor progress in another terminal
pnpm tsx scripts/monitor-swebench-progress.ts
```

The evaluation script generates patches and saves them locally. Full Docker-based test execution is planned for future releases.

### Agent Evaluation Requirements

When using `--patch_source agent:<provider_key>` (e.g., `agent:claude_code`), ensure:

1. **AI Provider is configured**: For Claude Code:
   - Install Claude CLI: `npm install -g @anthropic-ai/cli`
   - Authenticate: `claude auth`
   - Set `ANTHROPIC_API_KEY` environment variable

2. **Bridge service is running**: For Claude Code, the bridge service must be active:
   ```bash
   pnpm bridge
   ```

3. **Provider is enabled**: Set the appropriate environment variable:
   ```bash
   CLAUDE_CODE_PROVIDER_ENABLED=true pnpm tsx scripts/run_swe_bench_batch_env.ts --patch_source agent:claude_code --instance_ids django__django-11099
   ```

#### Command Line Arguments

- `--tasks_dir <path>` - Directory containing task JSON files (default: `assets/swe_bench_data`)
- `--instance_ids <ids>` - Comma-separated list of specific instance IDs to run
- `--max_tasks <N>` - Maximum number of tasks to run
- `--output_dir <path>` - Directory for results (default: `./docs/swebench-results/eval-<timestamp>`)
- `--patch_source <type>` - Patch source: `gold`, `empty`, or `agent:<provider>` (default: `agent:claude_code`)
- `--stop_on_failure` - Stop batch execution on first task failure

### Single Task Runners (Alternative)

For running individual tasks:

```bash
# Full runner with complete harness
pnpm tsx scripts/run-swebench-task.ts --task assets/swe_bench_data/django__django-11099.json --patch fix.patch

# Simple runner for demonstration
pnpm tsx scripts/run-swebench-task-simple.ts --task task.json --patch-content "diff --git..."
```

## Understanding the Evaluation Process

1. **Task Loading**: The runner loads and validates task JSON files
2. **Docker Image Build**: A custom Docker image is built for each repository and commit
3. **Container Setup**: A container is created with the repository at the specified commit
4. **Patch Application**: The gold patch (or empty patch) is applied to the codebase
5. **Test Execution**: The specified tests are run to check if the issue is fixed
6. **Result Collection**: Test results and logs are collected and analyzed
7. **Cleanup**: Container and image are removed (unless debugging)

## Interpreting Results

### Success Criteria

A task is considered "resolved" when:
- The patch applies cleanly
- All `FAIL_TO_PASS` tests now pass
- All `PASS_TO_PASS` tests still pass

### Output Structure

```
docs/swebench-results/eval-2024-05-31T10-30-45-123Z/
├── summary.json                          # Overall batch summary with success rates
├── progress.json                         # Real-time progress tracking
├── django__django-11099.patch           # Generated patch for each task
├── sympy__sympy-13146.patch
└── ...
```

### Result Files

**summary.json**:
```json
{
  "timestamp": "2024-05-31T10:30:45.123Z",
  "configuration": {
    "patchSource": "agent:claude_code",
    "tasksDir": "assets/swe_bench_data",
    "outputDir": "./docs/swebench-results/eval-2024-05-31T10-30-45-123Z"
  },
  "statistics": {
    "totalTasks": 50,
    "successfulTasks": 45,
    "failedTasks": 5,
    "successRate": "90.0%",
    "patchesGenerated": 45,
    "avgDurationSeconds": "92.3"
  },
  "taskResults": [
    {
      "instanceId": "django__django-11099",
      "repo": "django/django",
      "success": true,
      "patchGenerated": true,
      "patchLength": 1234,
      "duration": 89451
    }
  ]
}
```

## Logging and Observability

### Main Application Log

The Commander application now writes detailed operational logs to a file for better observability during SWE-Bench runs:

- **Log Location**: `<userDataPath>/logs/commander-run.log`
  - On macOS: `~/Library/Application Support/commander/logs/commander-run.log`
  - On Linux: `~/.config/commander/logs/commander-run.log`
  - On Windows: `%APPDATA%\commander\logs\commander-run.log`

### Log Contents

The log file contains structured entries with:
- Timestamp in ISO format
- Log level (DEBUG, INFO, WARN, ERROR)
- Category and action (e.g., `[swe_bench:lifecycle] (container_created)`)
- Relevant context data

Example log entries:
```
2024-06-01T16:30:45.123Z [INFO] [swe_bench:batch] (batch_start) batch_runner | Context: {"options":{"patch_source":"gold"}}
2024-06-01T16:30:46.456Z [INFO] [swe_bench:lifecycle] (image_build_start) django__django-11099 | Context: {"imageName":"sweb.eval.django__django-11099"}
2024-06-01T16:30:47.789Z [DEBUG] [docker:build] (output_line) sweb.eval.django__django-11099 | Value: Step 1/10 : FROM python:3.8
2024-06-01T16:31:23.456Z [DEBUG] [docker:exec] (stdout) container123 | Value: Running tests... | Context: {"fullLength":2048,"exitCode":0}
2024-06-01T16:31:25.789Z [INFO] [swe_bench:harness] (evaluation_complete) django__django-11099 | Context: {"resolved":true}
```

### Configuring Log Levels

To adjust the verbosity of file logging, modify the configuration:

1. **For Development**: Edit `src/services/configuration/ConfigurationServiceImpl.ts`:
   ```typescript
   yield* _(configService.set("TELEMETRY_LOG_FILE_LEVEL", "debug")); // Options: debug, info, warn, error
   ```

2. **For Runtime**: Set environment variables (if implemented):
   ```bash
   TELEMETRY_LOG_FILE_LEVEL=debug pnpm tsx scripts/run_swe_bench_batch_env_effect.ts
   ```

### Other Log Sources

1. **Claude Bridge Service Log**: `~/claude-bridge-service.log`
   - Contains Claude Code CLI interactions
   - Bridge service communication logs

2. **Batch Runner Console Output**: 
   - Real-time progress updates
   - Can be redirected: `pnpm tsx scripts/run_swe_bench_batch_env.ts > batch_run.log 2>&1`

3. **Docker Build Output**: 
   - Captured in main log at DEBUG level
   - Includes all Docker build steps and layer caching

4. **Container Execution Logs**:
   - Test execution stdout/stderr captured at DEBUG level
   - Full output available in result JSON files

### Real-time Monitoring

Monitor evaluation progress in real-time:

```bash
# In one terminal, start the evaluation
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source agent:claude_code --max_tasks 100

# In another terminal, monitor progress
pnpm tsx scripts/monitor-swebench-progress.ts
```

The monitor shows:
- Current progress percentage
- Success rate
- Recent task completions
- Estimated time remaining


## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker daemon
   docker info  # Check if Docker is running
   ```

2. **Missing base image**
   ```bash
   # Note: swebench/swe-eval:latest may not exist publicly
   # Create a custom base image:
   docker build -t swebench/swe-eval:latest -f scripts/swebench-base.dockerfile .
   ```

3. **Python dependencies missing**
   ```bash
   pip install datasets huggingface_hub
   ```

4. **Hugging Face authentication required**
   ```bash
   # Some datasets may require authentication
   huggingface-cli login
   ```

5. **Task download failures**
   - Check internet connection
   - Verify dataset name is correct
   - Some datasets may be private or require agreement to terms

### Debug Mode

Keep containers for inspection:
```bash
# Add to any runner command
--keep-container
```

## Best Practices

1. **Start Small**: Test with a few tasks first using `--max_tasks 5`
2. **Monitor Resources**: Docker builds can use significant disk space
3. **Clean Up Regularly**: Remove old Docker images with `docker system prune`
4. **Save Results**: Results are timestamped but consider backing up important runs
5. **Verify Patches**: Check that gold patches actually fix the issues

## Example Workflow

```bash
# 1. Test with a few tasks using gold patches
pnpm tsx scripts/run-swebench-evaluation.ts --max_tasks 5 --patch_source gold

# 2. Monitor progress in another terminal
pnpm tsx scripts/monitor-swebench-progress.ts

# 3. Check results
cat docs/swebench-results/eval-*/summary.json | jq '.statistics'

# 4. Run AI evaluation on specific tasks
pnpm tsx scripts/run-swebench-evaluation.ts --instance_ids "django__django-11099" --patch_source agent:claude_code

# 5. Run full benchmark (2,298 tasks)
pnpm tsx scripts/run-swebench-evaluation.ts --patch_source agent:claude_code
```

## References

- [SWE-bench Paper](https://arxiv.org/abs/2310.06770)
- [Official SWE-bench Repository](https://github.com/princeton-nlp/SWE-bench)
- [Dataset on HuggingFace](https://huggingface.co/datasets/princeton-nlp/SWE-bench)
- [SWE-bench Lite Dataset](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Lite)