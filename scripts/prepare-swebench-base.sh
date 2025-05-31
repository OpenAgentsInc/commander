#!/bin/bash
# Prepare a proper SWE-bench base image with Python testing tools

echo "📦 Creating enhanced SWE-bench base image..."

# Create a Dockerfile for the base image
cat > /tmp/swebench-base.Dockerfile << 'EOF'
FROM python:3.8-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install common Python testing frameworks
RUN pip install --no-cache-dir \
    pytest==7.1.2 \
    pytest-cov==3.0.0 \
    pytest-xdist==2.5.0 \
    numpy \
    scipy \
    matplotlib

# Create working directory
WORKDIR /opt/swe-bench

# Set up git config (required for some operations)
RUN git config --global user.email "swebench@example.com" && \
    git config --global user.name "SWE-bench"

ENTRYPOINT ["/bin/bash"]
EOF

# Build the enhanced base image
echo "🔨 Building enhanced base image..."
docker build -f /tmp/swebench-base.Dockerfile -t swebench/swe-eval:latest /tmp/

echo "✅ Enhanced base image ready!"
echo ""
echo "The base image now includes:"
echo "- Python 3.8"
echo "- Git"
echo "- pytest and common testing tools"
echo "- Build essentials for compiling Python packages"