#!/bin/bash
# Start Commander with Claude Bridge Service

echo "Starting Commander with Claude Bridge Service..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    
    # Kill bridge service if PID file exists
    if [ -f ~/claude-bridge.pid ]; then
        PID=$(cat ~/claude-bridge.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo "Stopping Claude Bridge Service (PID: $PID)..."
            kill $PID
            rm ~/claude-bridge.pid
        fi
    fi
    
    # Kill any remaining bridge service processes
    pkill -f "claude-bridge-service.js" 2>/dev/null
    
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if bridge service is already running
if [ -f ~/claude-bridge.pid ]; then
    PID=$(cat ~/claude-bridge.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Claude Bridge Service already running (PID: $PID)"
    else
        echo "Removing stale PID file..."
        rm ~/claude-bridge.pid
        echo "Starting Claude Bridge Service..."
        ./scripts/start-claude-bridge.sh
        sleep 2
    fi
else
    # Also check if process is running without PID file
    EXISTING_PID=$(ps aux | grep "claude-bridge-service.js" | grep -v grep | awk '{print $2}' | head -1)
    if [ ! -z "$EXISTING_PID" ]; then
        echo "Claude Bridge Service already running (PID: $EXISTING_PID)"
        echo $EXISTING_PID > ~/claude-bridge.pid
    else
        echo "Starting Claude Bridge Service..."
        ./scripts/start-claude-bridge.sh
        sleep 2
    fi
fi

# Check if bridge is running
if [ -f ~/claude-bridge.pid ]; then
    PID=$(cat ~/claude-bridge.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Claude Bridge Service started successfully (PID: $PID)"
    else
        echo "Warning: Claude Bridge Service failed to start"
    fi
else
    echo "Warning: Claude Bridge Service PID file not found"
fi

echo ""
echo "Starting Commander app..."
echo "Press Ctrl+C to stop both services"
echo ""

# Start the Electron app (this will block until the app closes)
pnpm electron-forge start