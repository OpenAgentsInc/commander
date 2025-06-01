#!/bin/bash
# Test script for running 5 SWE-bench tasks with Claude Code agent

# Set a unique run ID
RUN_ID="claude-code-test-$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="./swebench-results/$RUN_ID"

echo "=== SWE-bench Claude Code Agent Test Run ==="
echo "Run ID: $RUN_ID"
echo "Output Directory: $OUTPUT_DIR"
echo ""

# Check if Claude bridge is running
if ! pgrep -f "claude-bridge-service" > /dev/null; then
    echo "ERROR: Claude bridge service is not running!"
    echo "Please start it in another terminal with: pnpm bridge"
    exit 1
fi

echo "✓ Claude bridge service is running"

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "WARNING: ANTHROPIC_API_KEY is not set. The agent may not work properly."
    echo "Please set it with: export ANTHROPIC_API_KEY='your-key-here'"
fi

# Enable Claude Code provider
export CLAUDE_CODE_PROVIDER_ENABLED=true

# Run evaluation on 5 tasks
echo ""
echo "Running evaluation on 5 tasks..."
echo "Command: pnpm tsx scripts/run_swe_bench_batch_env.ts --patch_source agent:claude_code --max_tasks 5 --output_dir $OUTPUT_DIR"
echo ""

# Execute the batch runner
pnpm tsx scripts/run_swe_bench_batch_env.ts \
  --patch_source agent:claude_code \
  --max_tasks 5 \
  --output_dir "$OUTPUT_DIR"

echo ""
echo "=== Test run complete ==="
echo "Results saved to: $OUTPUT_DIR"
echo ""
echo "To analyze results:"
echo "  - Check individual task results: ls -la $OUTPUT_DIR/*_eval_result.json"
echo "  - View summary: cat $OUTPUT_DIR/summary.json"