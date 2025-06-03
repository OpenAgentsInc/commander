#!/bin/bash
set -e

echo "Setting up SWE-bench Python environment..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python: $python_version"

# Check if version is at least 3.8
required_version="3.8"
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
    echo "Error: Python 3.8 or higher is required"
    exit 1
fi

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
else
    echo "Virtual environment already exists"
fi

# Activate and install
echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing SWE-bench and dependencies..."
cd src/services/swe_bench_harness/python-bridge
pip install -r requirements.txt

# Go back to project root
cd ../../../../

echo ""
echo "SWE-bench setup complete!"
echo "To activate the environment: source .venv/bin/activate"
echo "To test the Python bridge: python3 src/services/swe_bench_harness/python-bridge/swebench_runner.py"