#!/usr/bin/env node
// Add debug endpoints to the bridge service via WebSocket

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:45671';

// Helper to send database operations
async function queryDatabase(operation, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const requestId = Date.now().toString();
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: requestId,
        type: 'db',
        operation,
        params
      }));
    });
    
    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.id === requestId) {
        ws.close();
        if (response.type === 'db_result') {
          resolve(response.result);
        } else if (response.type === 'db_error') {
          reject(new Error(response.error));
        }
      }
    });
    
    ws.on('error', reject);
    
    setTimeout(() => {
      ws.close();
      reject(new Error('Query timeout'));
    }, 5000);
  });
}

// Debug functions
async function debugQueries() {
  console.log('=== Debugging PGLite Database via WebSocket ===\n');
  
  try {
    // Check health
    const health = await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'health' }));
      });
      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        if (response.type === 'health') {
          ws.close();
          resolve(response);
        }
      });
      ws.on('error', reject);
    });
    
    console.log('Bridge Service Health:', health);
    console.log('Database Status:', health.dbStatus);
    console.log('');
    
    // Get recent sessions
    const sessionId = process.argv[2]; // Optional session ID from command line
    
    if (sessionId) {
      console.log(`\n=== Messages for Session ${sessionId} ===`);
      const messages = await queryDatabase('getMessagesForSession', {
        sessionId,
        limit: 20
      });
      
      if (messages.length > 0) {
        messages.forEach((msg, i) => {
          console.log(`\n--- Message ${i + 1} ---`);
          console.log(`Role: ${msg.role}`);
          console.log(`Timestamp: ${new Date(parseInt(msg.timestamp)).toISOString()}`);
          console.log(`Content: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`);
          if (msg.tool_calls_json) {
            console.log(`Tool Calls: ${msg.tool_calls_json}`);
          }
        });
      } else {
        console.log('No messages found for this session');
      }
    }
    
    // You can also save test data
    if (process.argv[3] === '--test-save') {
      console.log('\n=== Testing Save Operations ===');
      
      const testSessionId = `test-session-${Date.now()}`;
      const testMessageId = `test-message-${Date.now()}`;
      
      // Save a test session
      await queryDatabase('saveSession', {
        id: testSessionId,
        title: 'Test Session',
        model: 'claude-3-opus-20240229'
      });
      console.log('✓ Saved test session:', testSessionId);
      
      // Save a test message
      await queryDatabase('saveMessage', {
        id: testMessageId,
        session_id: testSessionId,
        role: 'user',
        content: 'This is a test message',
        model: 'claude-3-opus-20240229',
        timestamp: Date.now()
      });
      console.log('✓ Saved test message:', testMessageId);
      
      // Retrieve to verify
      const retrieved = await queryDatabase('getMessagesForSession', {
        sessionId: testSessionId,
        limit: 10
      });
      console.log('✓ Retrieved messages:', retrieved.length);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run debug queries
debugQueries();

console.log(`
Usage:
  node scripts/db-debug-endpoints.js                          # Check database health
  node scripts/db-debug-endpoints.js <session-id>             # Get messages for a session
  node scripts/db-debug-endpoints.js test --test-save         # Test save operations
`);