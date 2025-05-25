#!/bin/bash
# Script to run the Claude CLI test

echo "Starting Claude CLI integration test..."
echo "This will:"
echo "1. Start Electron with test entry point"
echo "2. Automatically trigger a Claude CLI request"
echo "3. Log all output to test-output.log"
echo "4. Check for the minimal wrapper log file"
echo ""

cd /Users/christopherdavid/code/commander

# Clean up old logs
rm -f test-output.log
rm -f ~/claude-utility-minimal.log

# Run the test
echo "Running test..."
npx electron src/test-claude-cli.js > test-output.log 2>&1

# Check results
echo ""
echo "=== Test Output ==="
cat test-output.log | grep -E "\[Test\]|\[Main Process\]|\[Utility Wrapper\]|error|Error"

echo ""
echo "=== Checking for utility wrapper log ==="
if [ -f ~/claude-utility-minimal.log ]; then
  echo "Found utility wrapper log:"
  cat ~/claude-utility-minimal.log
else
  echo "No utility wrapper log found"
fi

echo ""
echo "=== Full output saved to test-output.log ==="