#!/bin/bash
# Script to stop Claude Bridge Service

if [ -f ~/claude-bridge.pid ]; then
  PID=$(cat ~/claude-bridge.pid)
  if ps -p $PID > /dev/null; then
    echo "Stopping Claude Bridge Service (PID: $PID)..."
    kill $PID
    rm ~/claude-bridge.pid
    echo "Claude Bridge Service stopped."
  else
    echo "Claude Bridge Service not running (stale PID file)."
    rm ~/claude-bridge.pid
  fi
else
  echo "Claude Bridge Service not running (no PID file)."
  # Try to find and kill by process name
  PIDS=$(ps aux | grep "claude-bridge-service.js" | grep -v grep | awk '{print $2}')
  if [ ! -z "$PIDS" ]; then
    echo "Found running bridge service processes: $PIDS"
    echo "Stopping them..."
    echo $PIDS | xargs kill 2>/dev/null
  fi
fi