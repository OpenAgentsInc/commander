#!/usr/bin/env node
// Interactive PSQL-like interface for PGLite database

const { PGlite } = require('@electric-sql/pglite');
const readline = require('readline');
const path = require('path');
const { table } = require('table');

// Database path
const dbPath = path.join(process.env.HOME || '/tmp', '.commander', 'database', 'main_v1');

async function main() {
  console.log('Connecting to PGLite database...');
  
  try {
    const db = new PGlite(dbPath);
    await db.waitReady;
    console.log('Connected successfully!\n');
    console.log('Type SQL queries or commands:');
    console.log('  \\dt     - List tables');
    console.log('  \\d table - Describe table structure');
    console.log('  \\q      - Quit');
    console.log('  \\h      - Help\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'pglite> '
    });
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const query = line.trim();
      
      if (!query) {
        rl.prompt();
        return;
      }
      
      // Handle special commands
      if (query === '\\q') {
        console.log('Goodbye!');
        await db.close();
        process.exit(0);
      }
      
      if (query === '\\h' || query === '\\?') {
        console.log(`
Commands:
  \\dt          - List all tables
  \\d tablename - Describe table structure
  \\q           - Quit
  \\h, \\?       - Show this help
  
Example queries:
  SELECT * FROM messages LIMIT 5;
  SELECT COUNT(*) FROM sessions;
  SELECT role, COUNT(*) FROM messages GROUP BY role;
  SELECT * FROM messages WHERE content LIKE '%test%';
        `);
        rl.prompt();
        return;
      }
      
      if (query === '\\dt') {
        try {
          const result = await db.exec(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
          `);
          
          if (result.rows.length > 0) {
            console.log('\nList of tables:');
            result.rows.forEach(row => {
              console.log(`  ${row.tablename}`);
            });
            console.log('');
          } else {
            console.log('No tables found.');
          }
        } catch (err) {
          console.error('Error:', err.message);
        }
        rl.prompt();
        return;
      }
      
      if (query.startsWith('\\d ')) {
        const tableName = query.substring(3).trim();
        try {
          const result = await db.exec(`
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position
          `);
          
          if (result.rows.length > 0) {
            console.log(`\nTable "${tableName}":`);
            const tableData = [
              ['Column', 'Type', 'Nullable', 'Default'],
              ...result.rows.map(row => [
                row.column_name,
                row.data_type,
                row.is_nullable,
                row.column_default || ''
              ])
            ];
            console.log(table(tableData));
          } else {
            console.log(`Table "${tableName}" not found.`);
          }
        } catch (err) {
          console.error('Error:', err.message);
        }
        rl.prompt();
        return;
      }
      
      // Execute SQL query
      try {
        const startTime = Date.now();
        const result = await db.exec(query);
        const duration = Date.now() - startTime;
        
        if (result.rows && result.rows.length > 0) {
          // Format as table
          const columns = Object.keys(result.rows[0]);
          const tableData = [
            columns,
            ...result.rows.map(row => columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string' && val.length > 50) {
                return val.substring(0, 47) + '...';
              }
              return String(val);
            }))
          ];
          
          console.log(table(tableData));
          console.log(`(${result.rows.length} rows, ${duration}ms)\n`);
        } else {
          console.log(`Query executed successfully (${duration}ms)\n`);
        }
      } catch (err) {
        console.error('ERROR:', err.message, '\n');
      }
      
      rl.prompt();
    });
    
    rl.on('close', async () => {
      console.log('\nGoodbye!');
      await db.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
  }
}

// Check if 'table' package is installed
try {
  require('table');
} catch (e) {
  console.log('Installing required package...');
  require('child_process').execSync('npm install table', { stdio: 'inherit' });
}

main();