# Running Full SWE-bench Evaluation with Claude Code Agent

This guide explains how to run a complete SWE-bench evaluation using the Claude Code agent through the full harness infrastructure.

## Prerequisites

### 1. System Requirements
- **Docker**: Must be installed and running
- **Node.js**: v18+ with pnpm
- **Memory**: At least 16GB RAM recommended
- **Disk Space**: 50GB+ free space for Docker images and evaluation data
- **Claude CLI**: Authenticated (`claude auth`)

### 2. Base Docker Image
The official SWE-bench base image must be built or available:

```bash
# Check if image exists
docker images | grep swebench/swe-eval

# If not present, build it:
git clone https://github.com/princeton-nlp/SWE-bench.git
cd SWE-bench
docker build -f dockerfiles/Dockerfile.base -t swebench/swe-eval:latest .
```

### 3. Claude Bridge Service
The bridge must be running for Claude Code agent to work:

```bash
# In a separate terminal, start the bridge
pnpm bridge

# Verify it's running (should see "WebSocket server listening on ws://localhost:45671")
```

### 4. Task Data
Download the SWE-bench task data:

```bash
# For SWE-bench Lite (~300 tasks, recommended for first run)
python scripts/download_swe_bench_tasks.py --dataset_name princeton-nlp/SWE-bench_Lite --split test

# For full SWE-bench (~2300 tasks)
python scripts/download_swe_bench_tasks.py --dataset_name princeton-nlp/SWE-bench --split test
```

## Running the Full Harness

### Basic Command

```bash
pnpm tsx scripts/run_swe_bench_batch_env.ts \
  --patch_source agent:claude_code \
  --output_dir ./swebench-results/claude-full-$(date +%F-%H%M%S)
```

### Command Options

- `--patch_source agent:claude_code` - Use Claude Code agent for patch generation
- `--tasks_dir <path>` - Custom directory for task files (default: `assets/swe_bench_data`)
- `--instance_ids <ids>` - Run specific tasks only (comma-separated)
- `--max_tasks <N>` - Limit number of tasks to run
- `--output_dir <path>` - Where to save results
- `--stop_on_failure` - Stop if any task fails (not recommended)

### Example: Run First 10 Tasks

```bash
pnpm tsx scripts/run_swe_bench_batch_env.ts \
  --patch_source agent:claude_code \
  --max_tasks 10 \
  --output_dir ./swebench-results/claude-test-10
```

### Example: Run Specific Tasks

```bash
pnpm tsx scripts/run_swe_bench_batch_env.ts \
  --patch_source agent:claude_code \
  --instance_ids "django__django-11099,astropy__astropy-12907" \
  --output_dir ./swebench-results/claude-specific
```

## Running at Scale

### Batch Processing Strategy

For 100+ tasks, run in manageable batches to avoid resource exhaustion:

```bash
#!/bin/bash
# run-swebench-batches.sh

# Configuration
BATCH_SIZE=20
OUTPUT_BASE="./swebench-results/claude-full-$(date +%F)"

# Get all task files
TASK_FILES=(assets/swe_bench_data/*.json)
TOTAL_TASKS=${#TASK_FILES[@]}

echo "Total tasks: $TOTAL_TASKS"
echo "Batch size: $BATCH_SIZE"
echo "Output directory: $OUTPUT_BASE"

# Process in batches
for ((i=0; i<$TOTAL_TASKS; i+=$BATCH_SIZE)); do
    BATCH_NUM=$((i/BATCH_SIZE + 1))
    echo ""
    echo "=== Processing batch $BATCH_NUM (tasks $i-$((i+BATCH_SIZE-1))) ==="
    
    # Extract instance IDs for this batch
    INSTANCE_IDS=""
    for ((j=i; j<i+BATCH_SIZE && j<$TOTAL_TASKS; j++)); do
        TASK_FILE=${TASK_FILES[$j]}
        INSTANCE_ID=$(basename "$TASK_FILE" .json)
        if [ -z "$INSTANCE_IDS" ]; then
            INSTANCE_IDS="$INSTANCE_ID"
        else
            INSTANCE_IDS="$INSTANCE_IDS,$INSTANCE_ID"
        fi
    done
    
    # Run batch
    pnpm tsx scripts/run_swe_bench_batch_env.ts \
        --patch_source agent:claude_code \
        --instance_ids "$INSTANCE_IDS" \
        --output_dir "$OUTPUT_BASE/batch-$BATCH_NUM"
    
    # Check exit code
    if [ $? -ne 0 ]; then
        echo "Batch $BATCH_NUM failed! Check logs."
    else
        echo "Batch $BATCH_NUM completed successfully."
    fi
    
    # Rest between batches
    echo "Resting for 60 seconds..."
    sleep 60
done

echo ""
echo "=== All batches complete ==="
```

### Resource Management

1. **Monitor Docker Resources**
   ```bash
   # Check Docker disk usage
   docker system df
   
   # Clean up after each batch
   docker system prune -f --volumes
   ```

2. **Monitor System Resources**
   ```bash
   # In another terminal
   htop  # or top
   ```

3. **Bridge Service Health**
   - Check `~/claude-bridge-service.log` for errors
   - Restart if memory usage grows too high

## Environment Variables

Set these before running for better control:

```bash
# Required for Claude Code agent
export CLAUDE_CODE_PROVIDER_ENABLED=true

# Optional configurations
export SWE_BENCH_DATASET_PATH="./assets/swe_bench_data"
export SWE_BENCH_HOST_TEMP_DIR="/tmp/swe_bench_runs"
export SWE_BENCH_BASE_IMAGE_NAME="swebench/swe-eval:latest"
export SWE_BENCH_USE_ENHANCED_DOCKERFILE="true"
```

## Expected Timeline

- **Per task**: 5-15 minutes (including Docker build, patch generation, evaluation)
- **Patch generation**: 2-5 minutes per task
- **10 tasks**: ~1-2 hours
- **100 tasks**: ~10-15 hours
- **Full SWE-bench (~2300 tasks)**: 2-4 days

## Monitoring Progress

### Live Progress
The harness outputs progress to console:
```
Processing task 1/100: django__django-11099
Building Docker image...
Generating patch with Claude Code...
Running evaluation...
✓ Task completed in 423s
```

### Check Results During Run
```bash
# Count completed tasks
ls -1 ./swebench-results/claude-full-*/batch-*/*_eval_result.json | wc -l

# Check latest results
tail -f ./swebench-results/claude-full-*/batch-*/summary.json
```

## Handling Failures

### Common Issues

1. **Bridge Connection Lost**
   - Symptom: "WebSocket connection failed"
   - Fix: Restart bridge service with `pnpm bridge`

2. **Docker Build Failures**
   - Symptom: "Failed to build Docker image"
   - Fix: Check disk space, clean Docker cache

3. **Timeouts**
   - Symptom: Task takes > 15 minutes
   - Fix: Skip task and continue (harness handles this)

### Resume Failed Run

If the harness crashes, you can resume:

1. Check which tasks completed:
   ```bash
   ls ./swebench-results/your-run/*_eval_result.json | wc -l
   ```

2. Extract completed instance IDs:
   ```bash
   ls ./swebench-results/your-run/*_eval_result.json | \
     xargs -I {} basename {} _eval_result.json > completed.txt
   ```

3. Resume with remaining tasks:
   ```bash
   # This is pseudo-code - you'd need to filter the task list
   pnpm tsx scripts/run_swe_bench_batch_env.ts \
     --patch_source agent:claude_code \
     --exclude_file completed.txt \
     --output_dir ./swebench-results/your-run-resumed
   ```

## Analyzing Results

After completion, analyze results:

```bash
# Use the provided analysis script
./scripts/analyze-swebench-results.sh ./swebench-results/claude-full-*

# Calculate overall resolution rate
find ./swebench-results/claude-full-* -name "*_eval_result.json" -exec \
  jq -r '.report.resolved' {} \; | grep -c "true"
```

See the [Results Interpretation Guide](../logs/20250531/2144-results-interpretation-guide.md) for detailed analysis instructions.

## Best Practices

1. **Start Small**: Test with 5-10 tasks first
2. **Monitor Resources**: Keep an eye on disk space and memory
3. **Use Batches**: Don't run 100+ tasks in one go
4. **Save Logs**: Redirect output to files for debugging
5. **Backup Results**: Copy results to safe location after each batch

## Troubleshooting

### Enable Debug Logging
```bash
# Add verbose logging
export DEBUG=1
pnpm tsx scripts/run_swe_bench_batch_env.ts --patch_source agent:claude_code --verbose
```

### Check Individual Task Logs
```bash
# View container logs for a specific task
cat ./swebench-results/*/django__django-11099_eval_result.json | jq '.container_logs'
```

### Verify Claude Bridge
```bash
# Test bridge directly
curl -X POST http://localhost:45671 \
  -H "Content-Type: application/json" \
  -d '{"type": "health"}'
```

## Next Steps

After a successful run:

1. Analyze the results using the interpretation guide
2. Compare with baseline (gold patches) if available
3. Identify patterns in failures for prompt improvement
4. Consider running multiple times for statistical significance
5. Share results with the team for collective analysis

## Support

For issues specific to:
- **Claude Bridge**: Check `~/claude-bridge-service.log`
- **Docker**: Check Docker daemon logs
- **Harness**: Look for error messages in console output
- **General**: Create an issue in the Commander repository