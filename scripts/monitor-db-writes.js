#!/usr/bin/env node
// Real-time monitor for database writes

const { PGlite } = require('@electric-sql/pglite');
const path = require('path');

const dbPath = path.join(process.env.HOME || '/tmp', '.commander', 'database', 'main_v1');

async function monitor() {
  console.log('=== PGLite Database Monitor ===');
  console.log(`Monitoring: ${dbPath}`);
  console.log('Press Ctrl+C to exit\n');
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    
    let lastMessageCount = 0;
    let lastSessionCount = 0;
    let lastToolCount = 0;
    
    // Initial counts
    const initMessages = await db.exec('SELECT COUNT(*) as count FROM messages');
    const initSessions = await db.exec('SELECT COUNT(*) as count FROM sessions');
    const initTools = await db.exec('SELECT COUNT(*) as count FROM tool_executions');
    
    lastMessageCount = parseInt(initMessages.rows[0].count);
    lastSessionCount = parseInt(initSessions.rows[0].count);
    lastToolCount = parseInt(initTools.rows[0].count);
    
    console.log('Initial state:');
    console.log(`  Sessions: ${lastSessionCount}`);
    console.log(`  Messages: ${lastMessageCount}`);
    console.log(`  Tool Executions: ${lastToolCount}`);
    console.log('\nMonitoring for changes...\n');
    
    // Poll for changes
    setInterval(async () => {
      try {
        // Check for new messages
        const messages = await db.exec('SELECT COUNT(*) as count FROM messages');
        const messageCount = parseInt(messages.rows[0].count);
        
        if (messageCount > lastMessageCount) {
          const newMessages = await db.exec(`
            SELECT id, role, substr(content, 1, 80) as content_preview, timestamp
            FROM messages 
            ORDER BY timestamp DESC 
            LIMIT ${messageCount - lastMessageCount}
          `);
          
          console.log(`[${new Date().toISOString()}] NEW MESSAGES (+${messageCount - lastMessageCount}):`);
          newMessages.rows.forEach(msg => {
            console.log(`  - ${msg.role}: ${msg.content_preview}${msg.content_preview.length >= 80 ? '...' : ''}`);
          });
          console.log('');
          
          lastMessageCount = messageCount;
        }
        
        // Check for new sessions
        const sessions = await db.exec('SELECT COUNT(*) as count FROM sessions');
        const sessionCount = parseInt(sessions.rows[0].count);
        
        if (sessionCount > lastSessionCount) {
          const newSessions = await db.exec(`
            SELECT id, title, model, created_at
            FROM sessions 
            ORDER BY created_at DESC 
            LIMIT ${sessionCount - lastSessionCount}
          `);
          
          console.log(`[${new Date().toISOString()}] NEW SESSIONS (+${sessionCount - lastSessionCount}):`);
          newSessions.rows.forEach(session => {
            console.log(`  - ${session.title} (${session.model})`);
          });
          console.log('');
          
          lastSessionCount = sessionCount;
        }
        
        // Check for new tool executions
        const tools = await db.exec('SELECT COUNT(*) as count FROM tool_executions');
        const toolCount = parseInt(tools.rows[0].count);
        
        if (toolCount > lastToolCount) {
          const newTools = await db.exec(`
            SELECT tool_name, status, started_at
            FROM tool_executions 
            ORDER BY started_at DESC 
            LIMIT ${toolCount - lastToolCount}
          `);
          
          console.log(`[${new Date().toISOString()}] NEW TOOL EXECUTIONS (+${toolCount - lastToolCount}):`);
          newTools.rows.forEach(tool => {
            console.log(`  - ${tool.tool_name} (${tool.status})`);
          });
          console.log('');
          
          lastToolCount = toolCount;
        }
        
      } catch (err) {
        console.error('Monitor error:', err.message);
      }
    }, 1000); // Poll every second
    
    // Keep process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('Failed to start monitor:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nMonitor stopped.');
  process.exit(0);
});

monitor();