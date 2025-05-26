#!/usr/bin/env node

const WebSocket = require('ws');

async function queryDatabase(query) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:45671');
    const requestId = `query-${Date.now()}`;
    
    ws.on('open', () => {
      console.log('Connected to bridge service');
      
      // Send a raw SQL query through a custom operation
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation: 'rawQuery',
        params: { query }
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
  });
}

async function showDatabaseContents() {
  try {
    // First, let's try to get sessions through the existing operation
    console.log('\n=== Getting Sessions via WebSocket ===');
    
    // Get all sessions
    const sessions = await queryDatabase('getSession', { sessionId: '' }).catch(() => null);
    console.log('Sessions response:', sessions);
    
    // Let's try a different approach - use the existing operations
    console.log('\n=== Testing WebSocket Connection ===');
    
    // Test health check
    const ws = new WebSocket('ws://localhost:45671');
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'health' }));
    });
    
    ws.on('message', (data) => {
      console.log('Health check response:', data.toString());
      ws.close();
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Alternative: Let's directly query the PGLite database
const { PGlite } = require("@electric-sql/pglite");
const path = require("path");
const os = require("os");

async function directQuery() {
  console.log('\n=== Direct PGLite Query ===');
  const dbPath = path.join(os.homedir(), ".commander", "database", "main_v1");
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    
    // Get table list
    const tables = await db.exec(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('\nTables:', tables.rows);
    
    // Count sessions
    const sessionCount = await db.exec('SELECT COUNT(*) as count FROM sessions');
    console.log('\nSession count:', sessionCount.rows);
    
    // Get all sessions
    const sessions = await db.exec('SELECT * FROM sessions ORDER BY created_at DESC');
    console.log('\nSessions:', sessions.rows);
    
    // Count messages
    const messageCount = await db.exec('SELECT COUNT(*) as count FROM messages');
    console.log('\nMessage count:', messageCount.rows);
    
    // Get recent messages
    const messages = await db.exec(`
      SELECT id, session_id, role, SUBSTRING(content, 1, 50) as content_preview, timestamp 
      FROM messages 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    console.log('\nRecent messages:', messages.rows);
    
    await db.close();
  } catch (error) {
    console.error('Direct query error:', error);
  }
}

// Run both approaches
showDatabaseContents().then(() => directQuery());