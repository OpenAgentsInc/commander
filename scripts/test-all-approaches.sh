#!/bin/bash
# Test all Docker evaluation approaches

echo "🔧 Testing All SWE-bench Docker Evaluation Approaches"
echo "===================================================="
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run:"
    echo "   python -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r swebench/requirements.txt"
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

echo "1️⃣  Testing manual evaluation with dataset download..."
echo "-----------------------------------------------"
python scripts/manual-eval.py

echo ""
echo "2️⃣  Testing single Django instance..."
echo "--------------------------------"
tsx scripts/test-single-django.ts

echo ""
echo "3️⃣  Testing minimal evaluation (5 instances)..."
echo "-----------------------------------------"
tsx scripts/run-minimal-eval.ts

echo ""
echo "✅ All approaches tested. Check the output above for results."
echo ""
echo "If any approach succeeded, we have our SWE-bench score!"
echo "Look for lines like: ✨ SCORE: XX.XX% (X/Y)"