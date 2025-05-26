#!/usr/bin/env node
// External Node.js service for Claude CLI and Database bridge
// This runs as a separate process with full Node.js capabilities

const WebSocket = require('ws');
const pty = require('node-pty');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const WS_PORT = 45671;

// Get the project root directory (where this script was started from)
// If started from scripts directory, go up two levels
const PROJECT_ROOT = process.cwd();

// Logging
const logFile = path.join(process.env.HOME || '/tmp', 'claude-bridge-service.log');
function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(logMsg.trim());
  fs.appendFileSync(logFile, logMsg);
}

log('=== Claude Bridge Service Starting ===');
log(`Working directory: ${PROJECT_ROOT}`);

// Initialize PGLite database
let db = null;
const dbPath = path.join(process.env.HOME || '/tmp', '.commander', 'database', 'main_v1');

async function initDatabase() {
  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    
    log(`Initializing PGLite database at: ${dbPath}`);
    db = new PGlite(dbPath);
    await db.waitReady;
    
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        model TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        timestamp BIGINT NOT NULL,
        tool_calls_json TEXT,
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS tool_executions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL REFERENCES messages(id),
        tool_name TEXT NOT NULL,
        input_json TEXT NOT NULL,
        result_json TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);
    `);
    
    log('Database initialized successfully');
  } catch (error) {
    log(`ERROR: Failed to initialize database: ${error.message}`);
    throw error;
  }
}

// Initialize database on startup
initDatabase().catch(err => {
  log(`FATAL: Could not initialize database: ${err.message}`);
  process.exit(1);
});

// Find Claude CLI
let claudePath;
try {
  claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
  log(`Found Claude CLI at: ${claudePath}`);
} catch (e) {
  log(`ERROR: Could not find Claude CLI: ${e.message}`);
  // Try common locations
  const fallbacks = [
    '/Users/christopherdavid/.npm-global/bin/claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(process.env.HOME, '.local/bin/claude'),
    path.join(process.env.HOME, 'node_modules/.bin/claude')
  ];
  
  for (const fallback of fallbacks) {
    if (fs.existsSync(fallback)) {
      claudePath = fallback;
      log(`Found Claude CLI at fallback: ${claudePath}`);
      break;
    }
  }
  
  if (!claudePath) {
    log('FATAL: Could not find Claude CLI anywhere');
    process.exit(1);
  }
}

// Database operation handler
async function handleDatabaseOperation(ws, request) {
  const { id, operation, params } = request;
  
  if (!db) {
    ws.send(JSON.stringify({
      id,
      type: 'db_error',
      error: 'Database not initialized'
    }));
    return;
  }
  
  try {
    let result;
    
    switch (operation) {
      case 'saveSession':
        await db.exec(
          `INSERT INTO sessions (id, title, model) VALUES ('${params.id}', '${params.title}', '${params.model}') 
           ON CONFLICT (id) DO UPDATE SET last_updated_at = CURRENT_TIMESTAMP`
        );
        result = { success: true };
        break;
        
      case 'getSession':
        const sessionResult = await db.query(
          'SELECT * FROM sessions WHERE id = ?',
          [params.sessionId]
        );
        result = sessionResult.rows[0] || null;
        break;
        
      case 'saveMessage':
        await db.exec(
          `INSERT INTO messages (id, session_id, role, content, model, timestamp, tool_calls_json, metadata_json)
           VALUES ('${params.id}', '${params.session_id}', '${params.role}', 
                   '${params.content.replace(/'/g, "''")}', '${params.model}', 
                   ${params.timestamp}, '${params.tool_calls_json || ''}', '${params.metadata_json || ''}')`
        );
        result = { success: true };
        break;
        
      case 'getMessagesForSession':
        log(`Getting messages for session: ${params.sessionId}`);
        const messagesResult = await db.query(
          'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?',
          [params.sessionId, params.limit || 100, params.offset || 0]
        );
        result = messagesResult.rows;
        log(`Found ${result.length} messages for session ${params.sessionId}`);
        break;
        
      case 'saveToolCall':
        await db.exec(
          `INSERT INTO tool_executions (id, message_id, tool_name, input_json, status)
           VALUES ('${params.id}', '${params.message_id}', '${params.tool_name}', 
                   '${params.input_json.replace(/'/g, "''")}', '${params.status || 'pending'}')`
        );
        result = { success: true };
        break;
        
      case 'updateToolCallResult':
        await db.exec(
          `UPDATE tool_executions 
           SET result_json = '${params.resultJson.replace(/'/g, "''")}', 
               status = '${params.status}', completed_at = CURRENT_TIMESTAMP
           WHERE id = '${params.toolCallId}'`
        );
        result = { success: true };
        break;
        
      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
    
    ws.send(JSON.stringify({
      id,
      type: 'db_result',
      result
    }));
    
  } catch (error) {
    log(`Database operation error: ${error.message}`);
    ws.send(JSON.stringify({
      id,
      type: 'db_error',
      error: error.message
    }));
  }
}

// WebSocket server for streaming and health checks
const wss = new WebSocket.Server({ port: WS_PORT });
log(`WebSocket server started on port ${WS_PORT}`);

wss.on('connection', (ws) => {
  log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    let request;
    try {
      request = JSON.parse(message);
      log(`Received request: ${JSON.stringify(request)}`);
    } catch (e) {
      log(`ERROR: Invalid JSON message: ${e.message}`);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid JSON message'
      }));
      return;
    }
    
    // Handle health check
    if (request.type === 'health') {
      ws.send(JSON.stringify({
        type: 'health',
        status: 'ok',
        claudePath,
        dbStatus: db ? 'ready' : 'not initialized',
        uptime: process.uptime(),
        pid: process.pid
      }));
      return;
    }
    
    // Handle database operations
    if (request.type === 'db') {
      handleDatabaseOperation(ws, request);
      return;
    }
    
    const { id, args } = request;
    
    if (!args || !Array.isArray(args)) {
      ws.send(JSON.stringify({
        id,
        type: 'error',
        error: 'Missing or invalid args array'
      }));
      return;
    }
    
    log(`Executing Claude CLI with args: ${args.join(' ')}`);
    
    try {
      // Spawn Claude with PTY using project root as working directory
      const ptyProcess = pty.spawn(claudePath, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: PROJECT_ROOT,
        env: process.env
      });
      
      log(`PTY process spawned with PID: ${ptyProcess.pid}`);
      
      let outputBuffer = '';
      let errorBuffer = '';
      let hasReceivedData = false;
      
      ptyProcess.onData((data) => {
        if (!hasReceivedData) {
          hasReceivedData = true;
          log('First data received from Claude CLI');
        }
        
        outputBuffer += data;
        
        // Also capture any error-like output
        if (data.includes('error') || data.includes('Error') || data.includes('failed')) {
          errorBuffer += data;
        }
        
        // Parse JSON lines
        const lines = outputBuffer.split('\n');
        if (lines.length > 1) {
          outputBuffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            // Remove all ANSI escape sequences including cursor controls
            const cleaned = trimmed.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\[?[0-9;]*[hl]/g, '');
            
            if (cleaned && cleaned.startsWith('{')) {
              try {
                const json = JSON.parse(cleaned);
                log(`Parsed JSON type: ${json.type}`);
                ws.send(JSON.stringify({
                  id,
                  type: 'data',
                  data: json
                }));
              } catch (e) {
                // Not JSON, might be raw output
                if (cleaned) {
                  log(`Non-JSON output: ${cleaned.substring(0, 50)}...`);
                  ws.send(JSON.stringify({
                    id,
                    type: 'raw',
                    data: cleaned
                  }));
                }
              }
            }
          }
        }
      });
      
      ptyProcess.onExit(({ exitCode, signal }) => {
        log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
        
        // Send any remaining data
        if (outputBuffer.trim()) {
          // Remove all ANSI escape sequences including cursor controls
          const cleaned = outputBuffer.trim().replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\[?[0-9;]*[hl]/g, '');
          if (cleaned) {
            ws.send(JSON.stringify({
              id,
              type: 'raw',
              data: cleaned
            }));
          }
        }
        
        // If exit code is non-zero, send error info
        if (exitCode !== 0) {
          const errorMessage = errorBuffer || outputBuffer || 'Unknown error';
          log(`Process failed with error: ${errorMessage}`);
          ws.send(JSON.stringify({
            id,
            type: 'error',
            error: `Claude CLI exited with code ${exitCode}: ${errorMessage.trim()}`
          }));
        }
        
        ws.send(JSON.stringify({
          id,
          type: 'exit',
          exitCode
        }));
      });
      
    } catch (error) {
      log(`ERROR spawning Claude: ${error.message}`);
      ws.send(JSON.stringify({
        id,
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    log(`WebSocket error: ${error.message}`);
  });
});

log(`WebSocket server listening on ws://localhost:${WS_PORT}`);
log('Claude Bridge Service ready');

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  wss.close();
  process.exit(0);
});