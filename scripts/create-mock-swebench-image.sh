#\!/bin/bash
# Create a mock SWE-bench base image for testing

echo "Creating mock SWE-bench base image..."

# Check if Docker is running
if \! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Pull Python base image
echo "📦 Pulling Python base image..."
docker pull python:3.8-slim

# Tag it as our mock SWE-bench image
echo "🏷️  Tagging as swebench/swe-eval:latest..."
docker tag python:3.8-slim swebench/swe-eval:latest

echo "✅ Mock SWE-bench base image created\!"
echo ""
echo "You can now run the test script:"
echo "  pnpm tsx scripts/test-swebench-docker-build.ts"
