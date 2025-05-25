#!/bin/bash
# Script to start Claude Bridge Service with proper node-pty build

echo "Starting Claude Bridge Service..."

# Save current directory
ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

# Check if we need to rebuild node-pty for Node.js
if ! node -e "require('node-pty')" 2>/dev/null; then
  echo "Rebuilding node-pty for Node.js..."
  npm rebuild node-pty --update-binary
fi

# Start the bridge service
echo "Starting bridge service on port 45671..."
node src/services/claude-bridge-service.js &
BRIDGE_PID=$!

echo "Claude Bridge Service started with PID: $BRIDGE_PID"
echo "To stop: kill $BRIDGE_PID"

# Save PID to file for easy stopping
echo $BRIDGE_PID > ~/claude-bridge.pid

# Return to original directory
cd "$ORIGINAL_DIR"

echo "Bridge service is ready. Logs are at ~/claude-bridge-service.log"