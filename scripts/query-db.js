#!/usr/bin/env node

const { PGlite } = require("@electric-sql/pglite");
const path = require("path");
const os = require("os");

async function queryDatabase() {
  const dbPath = path.join(os.homedir(), ".commander", "database", "main_v1");
  console.log(`Opening database at: ${dbPath}`);
  
  const db = new PGlite(dbPath);
  await db.waitReady;
  
  try {
    // Show all sessions
    console.log("\n=== SESSIONS ===");
    const sessions = await db.query("SELECT id, title, model, created_at, last_updated_at FROM sessions ORDER BY created_at DESC");
    if (sessions.rows && sessions.rows.length > 0) {
      console.table(sessions.rows);
    } else {
      console.log("No sessions found");
    }
    
    // Show recent messages
    console.log("\n=== RECENT MESSAGES ===");
    const messages = await db.query(`
      SELECT 
        m.id,
        m.session_id,
        m.role,
        SUBSTRING(m.content, 1, 50) as content_preview,
        m.timestamp,
        s.title as session_title
      FROM messages m
      LEFT JOIN sessions s ON m.session_id = s.id
      ORDER BY m.timestamp DESC
      LIMIT 10
    `);
    if (messages.rows && messages.rows.length > 0) {
      console.table(messages.rows);
    } else {
      console.log("No messages found");
    }
    
    // Show message counts by session
    console.log("\n=== MESSAGE COUNTS BY SESSION ===");
    const counts = await db.query(`
      SELECT 
        s.id as session_id,
        s.title,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_at
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id, s.title
      ORDER BY last_message_at DESC
    `);
    if (counts.rows && counts.rows.length > 0) {
      console.table(counts.rows);
    }
    
    // Show latest message content (if a session ID is provided as argument)
    const sessionId = process.argv[2];
    if (sessionId) {
      console.log(`\n=== MESSAGES FOR SESSION ${sessionId} ===`);
      const sessionMessages = await db.query(`
        SELECT role, content, timestamp 
        FROM messages 
        WHERE session_id = '${sessionId}'
        ORDER BY timestamp ASC
      `);
      if (sessionMessages.rows && sessionMessages.rows.length > 0) {
        sessionMessages.rows.forEach(msg => {
          console.log(`\n[${msg.role.toUpperCase()}] (${new Date(msg.timestamp * 1000).toLocaleString()}):`);
          console.log(msg.content);
          console.log("-".repeat(80));
        });
      } else {
        console.log("No messages found for this session");
      }
    }
    
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await db.close();
  }
}

// Run the query
queryDatabase().catch(console.error);