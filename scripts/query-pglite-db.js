#!/usr/bin/env node
// Script to query the PGLite database directly

const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

// Database path matching the bridge service
const dbPath = path.join(process.env.HOME || '/tmp', '.commander', 'database', 'main_v1');

async function queryDatabase() {
  console.log(`Connecting to database at: ${dbPath}`);
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    console.log('Connected to database successfully\n');
    
    // Query 1: Count messages
    const messageCount = await db.exec('SELECT COUNT(*) as count FROM messages');
    console.log('Total messages:', messageCount.rows[0].count);
    
    // Query 2: List all sessions
    console.log('\n=== Sessions ===');
    const sessions = await db.exec('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10');
    if (sessions.rows.length > 0) {
      console.table(sessions.rows);
    } else {
      console.log('No sessions found');
    }
    
    // Query 3: Recent messages
    console.log('\n=== Recent Messages ===');
    const messages = await db.exec(`
      SELECT id, session_id, role, substr(content, 1, 50) as content_preview, timestamp 
      FROM messages 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    if (messages.rows.length > 0) {
      console.table(messages.rows);
    } else {
      console.log('No messages found');
    }
    
    // Query 4: Tool executions
    console.log('\n=== Tool Executions ===');
    const tools = await db.exec(`
      SELECT t.*, substr(m.content, 1, 30) as message_preview
      FROM tool_executions t
      JOIN messages m ON t.message_id = m.id
      ORDER BY t.started_at DESC
      LIMIT 10
    `);
    if (tools.rows.length > 0) {
      console.table(tools.rows);
    } else {
      console.log('No tool executions found');
    }
    
    // Query 5: Messages per session
    console.log('\n=== Messages per Session ===');
    const stats = await db.exec(`
      SELECT s.id, s.title, COUNT(m.id) as message_count, 
             MAX(m.timestamp) as last_message_timestamp
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id, s.title
      ORDER BY last_message_timestamp DESC
    `);
    if (stats.rows.length > 0) {
      console.table(stats.rows);
    } else {
      console.log('No statistics available');
    }
    
    // Allow custom queries via command line
    const customQuery = process.argv[2];
    if (customQuery) {
      console.log('\n=== Custom Query ===');
      console.log('Query:', customQuery);
      try {
        const result = await db.exec(customQuery);
        if (result.rows && result.rows.length > 0) {
          console.table(result.rows);
        } else {
          console.log('Query executed successfully, no rows returned');
        }
      } catch (err) {
        console.error('Custom query error:', err.message);
      }
    }
    
    await db.close();
    
  } catch (error) {
    console.error('Database error:', error.message);
    process.exit(1);
  }
}

// Run the script
queryDatabase();

// Usage examples:
console.log(`
Usage:
  node scripts/query-pglite-db.js                                    # Run default queries
  node scripts/query-pglite-db.js "SELECT * FROM messages LIMIT 5"  # Run custom query
  node scripts/query-pglite-db.js "SELECT COUNT(*) FROM sessions"   # Count sessions
`);