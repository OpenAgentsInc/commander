#!/usr/bin/env node
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

async function checkDatabase() {
  // Use the same path as Electron app
  const electronUserDataPath = process.platform === 'darwin' 
    ? path.join(process.env.HOME, 'Library', 'Application Support', 'Commander')
    : process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'Commander')
    : path.join(process.env.HOME, '.config', 'Commander');

  const dbPath = path.join(electronUserDataPath, 'commander-data', 'database', 'main_v1');
  
  console.log('Checking database at:', dbPath);
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database directory does not exist!');
    return;
  }
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    
    // Check sessions
    console.log('\n--- SESSIONS ---');
    const sessions = await db.exec('SELECT * FROM sessions ORDER BY last_updated_at DESC LIMIT 10');
    console.log('Sessions found:', sessions.rows?.length || 0);
    if (sessions.rows?.length > 0) {
      sessions.rows.forEach(s => {
        console.log(`- ${s.id}: ${s.title || 'Untitled'} (${new Date(s.last_updated_at * 1000).toLocaleString()})`);
      });
    }
    
    // Check messages
    console.log('\n--- MESSAGES ---');
    const messages = await db.exec('SELECT COUNT(*) as count FROM messages');
    console.log('Total messages:', messages.rows?.[0]?.count || 0);
    
    // Check table structure
    console.log('\n--- TABLE STRUCTURE ---');
    const tableInfo = await db.exec(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    console.log('Messages table columns:');
    tableInfo.rows?.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Sample messages
    console.log('\n--- SAMPLE MESSAGES ---');
    const sampleMessages = await db.exec('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 5');
    if (sampleMessages.rows?.length > 0) {
      sampleMessages.rows.forEach(m => {
        console.log(`- [${m.role}] ${m.content?.substring(0, 50)}... (session: ${m.session_id?.substring(0, 8)}...)`);
      });
    }
    
    await db.close();
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase();