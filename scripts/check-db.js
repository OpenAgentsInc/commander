#!/usr/bin/env node

const { PGlite } = require("@electric-sql/pglite");
const path = require("path");
const os = require("os");

async function checkDatabase() {
  const dbPath = path.join(os.homedir(), ".commander", "database", "main_v1");
  console.log(`Checking database at: ${dbPath}`);
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    console.log('Database opened successfully');
    
    // First, let's see what schemas exist
    const schemas = await db.query(`
      SELECT schema_name 
      FROM information_schema.schemata
    `);
    console.log('\nSchemas:', schemas);
    
    // Check if our tables exist
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\nTables in public schema:', tables);
    
    // Try a simple query on each table
    try {
      const sessionResult = await db.query('SELECT COUNT(*) FROM sessions');
      console.log('\nSessions table exists, count:', sessionResult);
    } catch (e) {
      console.log('\nSessions table error:', e.message);
    }
    
    try {
      const messageResult = await db.query('SELECT COUNT(*) FROM messages');
      console.log('\nMessages table exists, count:', messageResult);
    } catch (e) {
      console.log('\nMessages table error:', e.message);
    }
    
    // If tables exist, show their structure
    try {
      const sessionCols = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sessions'
      `);
      console.log('\nSessions table columns:', sessionCols);
    } catch (e) {
      console.log('Could not get session columns');
    }
    
    await db.close();
    console.log('\nDatabase check complete');
  } catch (error) {
    console.error('Database error:', error);
  }
}

checkDatabase();