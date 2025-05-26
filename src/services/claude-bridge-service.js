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
// Use the same path as Electron app: ~/Library/Application Support/Commander/commander-data/database/main_v1
const electronUserDataPath = process.platform === 'darwin' 
  ? path.join(process.env.HOME, 'Library', 'Application Support', 'Commander')
  : process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'Commander')
  : path.join(process.env.HOME, '.config', 'Commander');

const dbPath = path.join(electronUserDataPath, 'commander-data', 'database', 'main_v1');

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
    
    // Add missing columns if they don't exist (for migration)
    try {
      await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS name TEXT`);
      await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_call_id TEXT`);
      await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT`);
      await db.exec(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title TEXT`);
      log('Added missing columns to existing tables');
    } catch (e) {
      log('Migration: Some columns may already exist, continuing...');
    }
    
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
        await db.query(
          `INSERT INTO sessions (id, created_at, last_updated_at, provider_key, model_name, system_prompt, metadata_json, title) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (id) DO UPDATE SET 
             last_updated_at = $3,
             provider_key = $4,
             model_name = $5,
             system_prompt = $6,
             metadata_json = $7,
             title = $8`,
          [
            params.id,
            params.created_at,
            params.last_updated_at,
            params.provider_key,
            params.model_name || null,
            params.system_prompt || null,
            params.metadata_json || null,
            params.title || null
          ]
        );
        result = { success: true };
        break;
        
      case 'getSession':
        const sessionResult = await db.query(
          `SELECT * FROM sessions WHERE id = $1`,
          [params.sessionId]
        );
        result = sessionResult.rows ? sessionResult.rows[0] : null;
        break;
        
      case 'saveMessage':
        await db.query(
          `INSERT INTO messages (id, session_id, role, content, name, tool_call_id, tool_calls_json, timestamp, provider_message_id, metadata_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            params.id,
            params.session_id,
            params.role,
            params.content || null,
            params.name || null,
            params.tool_call_id || null,
            params.tool_calls_json || null,
            params.timestamp,
            params.provider_message_id || null,
            params.metadata_json || null
          ]
        );
        result = { success: true };
        break;
        
      case 'getMessagesForSession':
        log(`Getting messages for session: ${params.sessionId}`);
        const messagesResult = await db.query(
          `SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC LIMIT $2 OFFSET $3`,
          [params.sessionId, params.limit || 100, params.offset || 0]
        );
        result = messagesResult.rows || [];
        log(`Found ${result.length} messages for session ${params.sessionId}`);
        break;
        
      case 'saveToolCall':
        await db.query(
          `INSERT INTO tool_executions (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.id,
            params.message_id,
            params.tool_name,
            params.arguments_json,
            params.result_json || null,
            params.status,
            params.created_at,
            params.updated_at
          ]
        );
        result = { success: true };
        break;
        
      case 'updateSession':
        const updateClauses = [];
        const updateValues = [];
        const updates = params.updates || {};
        let paramIndex = 2; // $1 is for sessionId
        
        if (updates.last_updated_at !== undefined) {
          updateClauses.push(`last_updated_at = $${paramIndex++}`);
          updateValues.push(updates.last_updated_at);
        }
        if (updates.provider_key !== undefined) {
          updateClauses.push(`provider_key = $${paramIndex++}`);
          updateValues.push(updates.provider_key);
        }
        if (updates.model_name !== undefined) {
          updateClauses.push(`model_name = $${paramIndex++}`);
          updateValues.push(updates.model_name || null);
        }
        if (updates.system_prompt !== undefined) {
          updateClauses.push(`system_prompt = $${paramIndex++}`);
          updateValues.push(updates.system_prompt || null);
        }
        if (updates.metadata_json !== undefined) {
          updateClauses.push(`metadata_json = $${paramIndex++}`);
          updateValues.push(updates.metadata_json || null);
        }
        if (updates.title !== undefined) {
          updateClauses.push(`title = $${paramIndex++}`);
          updateValues.push(updates.title || null);
        }
        
        if (updateClauses.length > 0) {
          await db.query(
            `UPDATE sessions SET ${updateClauses.join(', ')} WHERE id = $1`,
            [params.sessionId, ...updateValues]
          );
        }
        result = { success: true };
        break;
        
      case 'updateToolCallResult':
        await db.query(
          `UPDATE tool_executions 
           SET result_json = $1, 
               status = $2, updated_at = $3
           WHERE id = $4`,
          [
            params.resultJson,
            params.status,
            Math.floor(Date.now() / 1000),
            params.toolCallId
          ]
        );
        result = { success: true };
        break;
        
      case 'getToolCallsForMessage':
        const toolCallsResult = await db.query(
          `SELECT * FROM tool_executions WHERE message_id = $1 ORDER BY created_at`,
          [params.messageId]
        );
        result = toolCallsResult.rows || [];
        break;
        
      case 'getAllSessions':
        const { limit = 100, offset = 0, sortBy = 'last_updated_at', sortOrder = 'DESC' } = params || {};
        // Validate sortBy to prevent SQL injection
        const allowedSortColumns = ['created_at', 'last_updated_at'];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'last_updated_at';
        const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
        
        const sessionsResult = await db.query(
          `SELECT * FROM sessions ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        result = sessionsResult.rows || [];
        log(`Found ${result.length} sessions`);
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
    
    const { id, args, activeFolder } = request;
    
    if (!args || !Array.isArray(args)) {
      ws.send(JSON.stringify({
        id,
        type: 'error',
        error: 'Missing or invalid args array'
      }));
      return;
    }
    
    // Ensure streaming format is enabled
    const claudeArgs = [...args];
    
    // Add project-path flag if activeFolder is provided
    if (activeFolder) {
      claudeArgs.push("--project-path", activeFolder);
      log(`Using active folder for Claude CLI: ${activeFolder}`);
    }
    const outputFormatIndex = claudeArgs.findIndex(arg => arg === '--output-format');
    if (outputFormatIndex !== -1) {
      claudeArgs.splice(outputFormatIndex, 2); // Remove existing output format
    }
    claudeArgs.push('--output-format', 'stream-json');
    
    // Add --dangerously-skip-permissions flag to avoid permission prompts
    if (!claudeArgs.includes('--dangerously-skip-permissions')) {
      claudeArgs.push('--dangerously-skip-permissions');
    }
    
    log(`Executing Claude CLI with streaming args: ${claudeArgs.join(' ')}`);
    
    try {
      // Spawn Claude with PTY using project root as working directory
      const ptyProcess = pty.spawn(claudePath, claudeArgs, {
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
        
        // Parse JSON lines for streaming
        let newlineIndex;
        while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
          const jsonLine = outputBuffer.substring(0, newlineIndex).trim();
          outputBuffer = outputBuffer.substring(newlineIndex + 1);
          
          if (jsonLine) {
            // Remove all ANSI escape sequences including cursor controls
            const cleaned = jsonLine.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\[?[0-9;]*[hl]/g, '');
            
            if (cleaned && cleaned.startsWith('{')) {
              try {
                const claudeMessage = JSON.parse(cleaned);
                log(`Parsed Claude Message: type=${claudeMessage.type}`);
                
                // Send as streaming chunk
                ws.send(JSON.stringify({
                  id,
                  type: 'claude_stream_chunk',
                  payload: claudeMessage
                }));
              } catch (e) {
                log(`JSON Parse Error in bridge service: ${e.message} for line: <<<${cleaned}>>>`);
                // Continue processing other lines
              }
            } else if (cleaned) {
              // Non-JSON output, send as raw
              ws.send(JSON.stringify({
                id,
                type: 'raw',
                data: cleaned
              }));
            }
          }
        }
      });
      
      ptyProcess.onExit(({ exitCode, signal }) => {
        log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
        
        // Process any remaining data in buffer
        if (outputBuffer.trim()) {
          const cleaned = outputBuffer.trim().replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\[?[0-9;]*[hl]/g, '');
          if (cleaned && cleaned.startsWith('{')) {
            try {
              const claudeMessage = JSON.parse(cleaned);
              log(`Final Claude Message: type=${claudeMessage.type}`);
              ws.send(JSON.stringify({
                id,
                type: 'claude_stream_chunk',
                payload: claudeMessage
              }));
            } catch (e) {
              log(`Final JSON Parse Error: ${e.message}`);
              if (cleaned) {
                ws.send(JSON.stringify({
                  id,
                  type: 'raw',
                  data: cleaned
                }));
              }
            }
          } else if (cleaned) {
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
            type: 'claude_stream_error',
            error: `Claude CLI exited with code ${exitCode}: ${errorMessage.trim()}`
          }));
        }
        
        // Send stream done message
        ws.send(JSON.stringify({
          id,
          type: 'claude_stream_done',
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