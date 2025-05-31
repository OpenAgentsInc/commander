#!/bin/bash
# Manual execution of SWE-bench task using Docker

TASK_FILE="${1:-assets/swebench-tasks/simple-python-fix.json}"
PATCH_FILE="${2:-}"

echo "🔧 Manual SWE-bench Docker Execution"
echo "==================================="

# Extract task details
INSTANCE_ID=$(jq -r '.instance_id' "$TASK_FILE")
REPO=$(jq -r '.repo' "$TASK_FILE")
BASE_COMMIT=$(jq -r '.base_commit' "$TASK_FILE")
TEST_TO_RUN=$(jq -r '.FAIL_TO_PASS[0]' "$TASK_FILE")

echo "📋 Task: $INSTANCE_ID"
echo "📦 Repository: $REPO"
echo "🔖 Commit: $BASE_COMMIT"
echo ""

# Create working directory
WORK_DIR="/tmp/swebench-manual-$INSTANCE_ID-$(date +%s)"
mkdir -p "$WORK_DIR"

# Create Dockerfile
cat > "$WORK_DIR/Dockerfile" << EOF
FROM swebench/swe-eval:latest

# Clone and setup repository
RUN git clone https://github.com/$REPO.git /opt/swe-bench/repo
WORKDIR /opt/swe-bench/repo
RUN git checkout $BASE_COMMIT

# Install repo-specific dependencies
RUN if [ -f setup.py ]; then pip install -e . || true; fi
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt || true; fi

# Copy evaluation files
COPY eval.sh /opt/swe-bench/
COPY test.patch /opt/swe-bench/
RUN chmod +x /opt/swe-bench/eval.sh

WORKDIR /opt/swe-bench/repo
EOF

# Create test patch file
jq -r '.test_patch' "$TASK_FILE" > "$WORK_DIR/test.patch"

# Create evaluation script
cat > "$WORK_DIR/eval.sh" << 'EVALSCRIPT'
#!/bin/bash
set -e

echo "🧪 Running SWE-bench evaluation..."
cd /opt/swe-bench/repo

# Apply test patch
echo "📝 Applying test patch..."
patch -p1 < /opt/swe-bench/test.patch

# Run the test
echo "🏃 Running tests..."
if [[ -f manage.py ]]; then
    # Django project
    python manage.py test $TEST_TO_RUN
else
    # Regular Python project
    python -m pytest $TEST_TO_RUN -xvs || true
fi

echo "✅ Evaluation complete!"
EVALSCRIPT

# Replace TEST_TO_RUN in eval script
sed -i.bak "s|\$TEST_TO_RUN|$TEST_TO_RUN|g" "$WORK_DIR/eval.sh"

echo "📦 Building Docker image..."
docker build -t "swebench-manual-$INSTANCE_ID" "$WORK_DIR"

echo ""
echo "🐳 Running evaluation..."
docker run --rm "swebench-manual-$INSTANCE_ID" /opt/swe-bench/eval.sh

echo ""
echo "🧹 To cleanup:"
echo "  docker rmi swebench-manual-$INSTANCE_ID"
echo "  rm -rf $WORK_DIR"