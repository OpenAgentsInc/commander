#!/bin/bash
# Check baseline behavior without test patch

TASK_FILE="${1:-assets/swebench-tasks/simple-python-fix.json}"

echo "🔧 Checking SWE-bench Baseline Behavior"
echo "======================================"

# Extract task details
INSTANCE_ID=$(jq -r '.instance_id' "$TASK_FILE")
REPO=$(jq -r '.repo' "$TASK_FILE")
BASE_COMMIT=$(jq -r '.base_commit' "$TASK_FILE")

echo "📋 Task: $INSTANCE_ID"
echo "📦 Repository: $REPO"
echo "🔖 Commit: $BASE_COMMIT"
echo ""

# Create working directory
WORK_DIR="/tmp/swebench-baseline-$INSTANCE_ID-$(date +%s)"
mkdir -p "$WORK_DIR"

# Create test script to check current behavior
cat > "$WORK_DIR/test_baseline.py" << 'EOF'
from sympy import Sum, symbols

print("Testing Sum(1, (n, a, b)) behavior:")
print("-" * 40)

a, b, n = symbols('a b n', integer=True)

# Test symbolic case
result_symbolic = Sum(1, (n, a, b)).doit()
print(f"Sum(1, (n, a, b)).doit() = {result_symbolic}")
print(f"Expected: b - a + 1")
print(f"Match: {result_symbolic == b - a + 1}")
print()

# Test concrete cases
test_cases = [
    (0, 5, 6),
    (3, 8, 6),
    (1, 1, 1),
    (5, 2, 0)  # Upper < lower
]

for start, end, expected in test_cases:
    result = Sum(1, (n, start, end)).doit()
    print(f"Sum(1, (n, {start}, {end})).doit() = {result}")
    print(f"Expected: {expected}")
    print(f"Match: {result == expected}")
    print()
EOF

# Run in Docker
echo "🐳 Running baseline check..."
docker run --rm -v "$WORK_DIR:/workspace" \
    -w /opt/swe-bench/repo \
    "swebench-manual-$INSTANCE_ID" \
    python /workspace/test_baseline.py

echo ""
echo "🧹 Cleanup:"
echo "  rm -rf $WORK_DIR"