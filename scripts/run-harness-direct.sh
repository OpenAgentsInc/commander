#!/bin/bash
# Run SWE-bench harness evaluation directly

set -e

# Activate virtual environment
source .venv/bin/activate

# Set environment for ARM64
export DOCKER_DEFAULT_PLATFORM=linux/arm64

# Change to swebench directory
cd swebench

echo "🚀 Running SWE-bench evaluation with existing predictions..."
echo "=================================================="

# Run the evaluation
python -m swebench.harness.run_evaluation \
    --predictions_path ../swebench-results/direct-50-1748985899981/predictions.json \
    --dataset_name princeton-nlp/SWE-bench_Lite \
    --max_workers 4 \
    --timeout 1800 \
    --run_id "harness-direct-$(date +%s)" \
    --cache_level instance

echo "✅ Evaluation complete!"