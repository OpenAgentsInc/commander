#!/bin/bash
# Test the Claude Bridge Service

echo "=== Testing Claude Bridge Service ==="
echo ""

# Clean up old logs
rm -f ~/claude-bridge-service.log

# Start the bridge service
echo "Starting bridge service..."
node src/services/claude-bridge-service.js &
BRIDGE_PID=$!

echo "Bridge service started with PID: $BRIDGE_PID"
echo "Waiting for service to initialize..."
sleep 2

# Test WebSocket connection
echo ""
echo "Testing WebSocket connection..."
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:45671');

ws.on('open', () => {
  console.log('✓ Connected to bridge service');
  
  // Test health check
  ws.send(JSON.stringify({ type: 'health' }));
  
  // Test Claude command
  setTimeout(() => {
    console.log('\\nSending test command...');
    ws.send(JSON.stringify({
      id: 'test-1',
      args: ['-p', 'Say hello', '--output-format', 'stream-json', '--verbose']
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg.type);
  if (msg.type === 'data') {
    console.log('Data:', JSON.stringify(msg.data, null, 2));
  }
  if (msg.type === 'exit') {
    console.log('Exit code:', msg.exitCode);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});

// Timeout
setTimeout(() => {
  console.log('\\nTest timeout');
  ws.close();
  process.exit(1);
}, 15000);
"

# Clean up
echo ""
echo "Stopping bridge service..."
kill $BRIDGE_PID 2>/dev/null

echo ""
echo "=== Bridge Service Log ==="
cat ~/claude-bridge-service.log | tail -20