#!/bin/bash
# Script to start Commander app with Claude Bridge Service

echo "🚀 Starting Commander with Claude Bridge..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if Claude Bridge is already running
if lsof -i :45671 > /dev/null 2>&1; then
    echo "✅ Claude Bridge is already running on port 45671"
else
    echo "🌉 Starting Claude Bridge Service..."
    cd "$PROJECT_DIR"
    
    # Check if we need to rebuild node-pty for Node.js
    if ! node -e "require('node-pty')" 2>/dev/null; then
        echo "📦 Rebuilding node-pty for Node.js..."
        npm rebuild node-pty --update-binary
    fi
    
    # Start the bridge service in background
    node src/services/claude-bridge-service.js > ~/claude-bridge-service.log 2>&1 &
    BRIDGE_PID=$!
    
    # Save PID for later
    echo $BRIDGE_PID > ~/claude-bridge.pid
    
    # Give it a moment to start
    sleep 2
    
    # Check if it started successfully
    if kill -0 $BRIDGE_PID 2>/dev/null; then
        echo "✅ Claude Bridge started (PID: $BRIDGE_PID)"
    else
        echo "❌ Failed to start Claude Bridge"
        echo "Check logs at: ~/claude-bridge-service.log"
        exit 1
    fi
fi

# Start the Electron app
echo "🖥️  Starting Commander app..."
cd "$PROJECT_DIR"
electron-forge start

# When the app exits, optionally stop the bridge
echo ""
echo "Commander has exited."
echo "Claude Bridge is still running. To stop it: pnpm run bridge:stop"