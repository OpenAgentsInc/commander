#!/bin/bash
# Workaround script to run SWE-bench batch evaluation bypassing runtime issues

cd /Users/christopherdavid/code/commander

# Set environment variables
export CLAUDE_CODE_PROVIDER_ENABLED=true
export SWE_BENCH_DATASET_PATH="./assets/swe_bench_data"
export SWE_BENCH_USE_ENHANCED_DOCKERFILE=true

# Create output directory
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="./swebench-results/claude-code-test-$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

echo "=== SWE-bench Claude Code Agent Test Run (Workaround) ==="
echo "Output Directory: $OUTPUT_DIR"
echo ""

# Get first 5 task files
TASK_FILES=($(ls ./assets/swe_bench_data/*.json | head -5))
echo "Running ${#TASK_FILES[@]} tasks"

# Run the Node.js process directly without tsx wrapper
node --loader tsx/esm scripts/run_swe_bench_batch_env.ts \
  --patch_source agent:claude_code \
  --max_tasks 5 \
  --output_dir "$OUTPUT_DIR" 2>&1 | tee "$OUTPUT_DIR/run.log"

echo ""
echo "=== Run complete ==="
echo "Results saved to: $OUTPUT_DIR"