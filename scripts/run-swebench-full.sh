#!/bin/bash
# Run full SWE-bench evaluation

echo "🚀 Starting full SWE-bench evaluation..."
echo "This will take approximately 15-20 minutes for 6 tasks."
echo ""

# Run with no timeout
cd /Users/christopherdavid/code/commander
pnpm tsx scripts/run-swebench-evaluation.ts \
  --patch_source agent:claude_code \
  --output_dir "./swebench-results/full-benchmark-$(date +%s)"

echo ""
echo "✅ Evaluation complete!"