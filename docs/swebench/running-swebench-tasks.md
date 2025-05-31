# Running SWE-Bench Tasks Guide

## Overview

SWE-bench is a benchmark for evaluating language models on real-world software engineering tasks. This guide explains how to run SWE-bench tasks using the Commander's built-in harness service.

## Prerequisites

1. **Docker**: Ensure Docker is installed and running
2. **Node.js**: Required for running the task runner script
3. **Task Data**: Valid SWE-bench task JSON files

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
  "patch": "Optional gold patch for reference"
}
```

## Getting SWE-Bench Task Data

### Option 1: Use Example Tasks
Example tasks are provided in `assets/swebench-tasks/`:
- `simple-python-fix.json` - Basic Python bug fix
- `django-framework.json` - Django framework issue
- `numpy-computation.json` - NumPy computational bug

### Option 2: Download from HuggingFace
```bash
# Download the full dataset
wget https://huggingface.co/datasets/princeton-nlp/SWE-bench/resolve/main/swebench.json

# Extract specific tasks
jq '.[] | select(.instance_id == "django__django-11099")' swebench.json > task.json
```

### Option 3: Create Custom Tasks
You can create your own tasks following the schema defined in `src/services/swe_bench_harness/types.ts`.

## Running Tasks

### Available Runners

1. **Full Runner** (`scripts/run-swebench-task.ts`) - Uses the complete SWEBenchHarnessService
2. **Simple Runner** (`scripts/run-swebench-task-simple.ts`) - Demonstrates the workflow with manual steps

### Basic Usage

```bash
# Run a single task with a patch file
pnpm tsx scripts/run-swebench-task.ts --task assets/swebench-tasks/simple-python-fix.json --patch my-solution.patch

# Run with inline patch content
pnpm tsx scripts/run-swebench-task.ts --task task.json --patch-content "diff --git a/file.py..."

# Run without a patch (to see baseline failures)
pnpm tsx scripts/run-swebench-task.ts --task task.json --no-patch

# Use the simple runner for demonstration
pnpm tsx scripts/run-swebench-task-simple.ts --task assets/swebench-tasks/django-framework.json --patch assets/swebench-tasks/patches/django-framework.patch
```

### Command Line Options

- `--task <path>` - Path to the task JSON file (required)
- `--patch <path>` - Path to a patch file to apply
- `--patch-content <content>` - Inline patch content (alternative to --patch)
- `--no-patch` - Run without applying any patch
- `--output <path>` - Output directory for results (default: `./swebench-results`)
- `--keep-container` - Don't remove the Docker container after evaluation
- `--verbose` - Enable detailed logging

## Understanding the Evaluation Process

1. **Task Loading**: The runner loads and validates the task JSON
2. **Docker Image Build**: A custom Docker image is built for the specific repository and commit
3. **Container Setup**: A container is created with the repository at the correct state
4. **Patch Application**: Your patch is applied to the codebase
5. **Test Execution**: The specified tests are run to check if the issue is fixed
6. **Result Collection**: Test results and logs are collected and analyzed

## Interpreting Results

### Success Criteria
A task is considered resolved when:
- The patch applies cleanly
- All `FAIL_TO_PASS` tests now pass
- All `PASS_TO_PASS` tests still pass

### Output Structure
```
swebench-results/
├── django__django-11099/
│   ├── evaluation_report.json    # Detailed evaluation results
│   ├── patch_applied.diff        # The patch that was applied
│   ├── test_output.log          # Full test execution logs
│   └── container_logs.txt       # Docker container logs
```

### Evaluation Report Fields
- `instance_id`: The task identifier
- `patch_applied_successfully`: Whether the patch applied cleanly
- `tests_passed`: Whether all required tests passed
- `resolved`: Overall success status
- `test_output_log_path`: Path to detailed test logs

## Troubleshooting

### Common Issues

1. **Docker Permission Errors**
   ```bash
   # Ensure your user is in the docker group
   sudo usermod -aG docker $USER
   # Log out and back in for changes to take effect
   ```

2. **Container Build Failures**
   - Check Docker daemon is running: `docker ps`
   - Ensure sufficient disk space: `docker system df`
   - Clean up old images: `docker system prune -a`

3. **Patch Application Failures**
   - Ensure patch is based on the correct commit
   - Check for whitespace or line ending issues
   - Use `git diff` to generate patches

4. **Test Execution Timeouts**
   - Some tests may take longer than expected
   - Use `--timeout` flag to increase limits
   - Check container resources with `docker stats`

### Debug Mode

For detailed debugging:
```bash
# Keep container running for inspection
pnpm tsx scripts/run-swebench-task.ts --task task.json --patch fix.patch --keep-container --verbose

# Inspect the container
docker exec -it <container-id> bash
cd /workspace
# Manually run tests or inspect code
```

## Best Practices

1. **Start Simple**: Begin with the example tasks to understand the workflow
2. **Incremental Development**: Test patches locally before running full evaluation
3. **Resource Management**: Clean up containers and images regularly
4. **Logging**: Save evaluation logs for debugging and analysis
5. **Parallel Execution**: Run multiple tasks in parallel with care for system resources

## Advanced Usage

### Batch Processing
```bash
# Process multiple tasks
for task in assets/swebench-tasks/*.json; do
  pnpm tsx scripts/run-swebench-task.ts --task "$task" --patch fixes/$(basename "$task" .json).patch
done
```

### Custom Evaluation Scripts
The harness generates evaluation scripts automatically, but you can customize behavior by modifying the script generation in `SWEBenchEvaluationScriptService`.

### Integration with AI Models
The task runner can be integrated with AI services to automatically generate and test patches:
```typescript
// Example integration
const patch = await aiService.generatePatch(task.problem_statement);
const result = await harnessService.evaluateTask(task.instance_id, patch);
```

## References

- [SWE-bench Paper](https://arxiv.org/abs/2310.06770)
- [Official SWE-bench Repository](https://github.com/princeton-nlp/SWE-bench)
- [Dataset on HuggingFace](https://huggingface.co/datasets/princeton-nlp/SWE-bench)