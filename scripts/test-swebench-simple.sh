#!/bin/bash
# Quick test script to verify SWE-bench with Claude integration

echo "🧪 Testing SWE-bench with Claude Code integration..."
echo "📍 Working directory: $(pwd)"
echo ""

# Set required environment variables
export SWE_BENCH_DATASET_PATH="/Users/christopherdavid/code/commander/assets/swebench-tasks"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Create output directory
OUTPUT_DIR="./swebench-results/test-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "📂 Output directory: $OUTPUT_DIR"
echo "🤖 Using Claude Code for patch generation"
echo ""

# Run with simple-python-fix task
echo "▶️  Running simple-python-fix task..."
pnpm tsx scripts/run_swe_bench_batch_env_effect.ts \
  --tasks_dir ./assets/swebench-tasks \
  --instance_ids simple-python-fix \
  --patch_source agent:claude_code \
  --max_tasks 1 \
  --output_dir "$OUTPUT_DIR"

echo ""
echo "✅ Test complete. Check $OUTPUT_DIR for results."