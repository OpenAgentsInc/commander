#!/usr/bin/env node
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

async function initDatabase() {
  // Use the same path as Electron app
  const electronUserDataPath = process.platform === 'darwin' 
    ? path.join(process.env.HOME, 'Library', 'Application Support', 'Commander')
    : process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'Commander')
    : path.join(process.env.HOME, '.config', 'Commander');

  const dbPath = path.join(electronUserDataPath, 'commander-data', 'database', 'main_v1');
  
  console.log('Initializing database at:', dbPath);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    
    // Create tables
    console.log('Creating tables...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        last_updated_at INTEGER NOT NULL,
        provider_key TEXT NOT NULL,
        model_name TEXT,
        system_prompt TEXT,
        metadata_json TEXT,
        title TEXT
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT,
        name TEXT,
        tool_call_id TEXT,
        tool_calls_json TEXT,
        timestamp INTEGER NOT NULL,
        provider_message_id TEXT,
        metadata_json TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS tool_executions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id),
        tool_name TEXT NOT NULL,
        arguments_json TEXT NOT NULL,
        result_json TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'executed_success', 'executed_error')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);
    `);
    
    console.log('Tables created successfully!');
    
    // Check what we have
    const sessions = await db.exec('SELECT COUNT(*) as count FROM sessions');
    const messages = await db.exec('SELECT COUNT(*) as count FROM messages');
    
    console.log(`\nDatabase stats:`);
    console.log(`- Sessions: ${sessions.rows?.[0]?.count || 0}`);
    console.log(`- Messages: ${messages.rows?.[0]?.count || 0}`);
    
    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDatabase();