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
    const errorMsg = '[DB Bridge] Database not initialized';
    log(`ERROR: ${errorMsg} for operation: ${operation}`);
    ws.send(JSON.stringify({
      id,
      type: 'db_error',
      error: errorMsg
    }));
    return;
  }
  
  log(`[DB Bridge] Handling DB operation: ${operation} with ID: ${id}`);
  if (params) {
    log(`[DB Bridge] Params for ${operation}: ${JSON.stringify(params, null, 2)}`);
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
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             tool_calls_json = EXCLUDED.tool_calls_json,
             metadata_json = EXCLUDED.metadata_json`,
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
        log(`[DB Bridge] Processing 'saveToolCall' for tool ID: ${params.id}, message ID: ${params.message_id}`);
        if (!params.id || !params.message_id || !params.tool_name || typeof params.arguments_json !== 'string' || !params.status || typeof params.created_at !== 'number' || typeof params.updated_at !== 'number') {
          log(`[DB Bridge] ERROR: Invalid parameters for saveToolCall: ${JSON.stringify(params)}`);
          result = { success: false, error: "Invalid parameters for saveToolCall", toolCallId: params.id };
          break;
        }

        const insertSql = `INSERT INTO tool_executions (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                           ON CONFLICT(id) DO NOTHING`;
        const insertParams = [
          params.id,
          params.message_id,
          params.tool_name,
          params.arguments_json,
          params.result_json || null,
          params.status,
          params.created_at,
          params.updated_at
        ];

        log(`[DB Bridge] Executing INSERT for toolCallId ${params.id}: SQL: ${insertSql}`);
        log(`[DB Bridge] Params: ${JSON.stringify(insertParams)}`);

        try {
          const insertResult = await db.query(insertSql, insertParams);
          log(`[DB Bridge] INSERT attempt for toolCallId ${params.id} completed. Result: ${JSON.stringify(insertResult)}`);

          // Verification SELECT query
          const verifyInsert = await db.query(`SELECT id FROM tool_executions WHERE id = $1`, [params.id]);
          if (verifyInsert.rows && verifyInsert.rows.length > 0) {
            result = { success: true, toolCallId: params.id, rowsAffected: 1 };
            log(`[DB Bridge] SUCCESS (Verified): Tool call ${params.id} saved. Found in DB.`);
          } else {
            log(`[DB Bridge] ERROR: Tool call ${params.id} NOT found in DB after INSERT attempt. Checking parent message...`);
            const msgCheck = await db.query(`SELECT id FROM messages WHERE id = $1`, [params.message_id]);
            if (msgCheck.rows && msgCheck.rows.length > 0) {
              log(`[DB Bridge] Parent message ${params.message_id} exists. Insert for tool ${params.id} might have failed for other reasons.`);
              result = { success: false, toolCallId: params.id, error: "Insert verification failed, parent message exists." };
            } else {
              log(`[DB Bridge] CRITICAL ERROR: Parent message ${params.message_id} for toolCallId ${params.id} does NOT exist. FK constraint likely failed.`);
              result = { success: false, toolCallId: params.id, error: "Insert failed, parent message_id not found (FK constraint failure)." };
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR inserting tool_execution for toolCallId ${params.id}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.id, error: dbError.message };
        }
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
        log(`[DB Bridge] Processing 'updateToolCallResult' for toolCallId: ${params.toolCallId}`);
        if (!params.toolCallId || typeof params.resultJson !== 'string' || !params.status) {
          log(`[DB Bridge] ERROR: Invalid parameters for updateToolCallResult: ${JSON.stringify(params)}`);
          result = { success: false, error: "Invalid parameters for updateToolCallResult", toolCallId: params.toolCallId };
          break;
        }

        const updateTimestamp = Math.floor(Date.now() / 1000);
        const updateSql = `UPDATE tool_executions
                           SET result_json = $1,
                               status = $2,
                               updated_at = $3
                           WHERE id = $4`;
        const updateQueryParams = [
          params.resultJson,
          params.status,
          updateTimestamp,
          params.toolCallId
        ];

        log(`[DB Bridge] Executing UPDATE for toolCallId: ${params.toolCallId}, status: ${params.status}, timestamp: ${updateTimestamp}`);
        log(`[DB Bridge] Result JSON preview (first 100 chars): ${params.resultJson.substring(0,100)}...`);

        try {
          const updateOpResult = await db.query(updateSql, updateQueryParams);
          // Log the full result to understand PGLite's response structure
          log(`[DB Bridge] UPDATE completed for toolCallId ${params.toolCallId}. Full result: ${JSON.stringify(updateOpResult)}`);
          
          // PGLite might return affectedRows, changes, or rowCount - check all
          const rowsAffectedUpdate = updateOpResult.affectedRows || updateOpResult.changes || updateOpResult.rowCount || 0;
          log(`[DB Bridge] Rows affected: ${rowsAffectedUpdate}`);

          if (rowsAffectedUpdate > 0) {
            result = { success: true, toolCallId: params.toolCallId, status: params.status, rowsAffected: rowsAffectedUpdate };
            log(`[DB Bridge] SUCCESS: Tool call ${params.toolCallId} updated. Rows affected: ${rowsAffectedUpdate}`);

            const verifyUpdate = await db.query(
              `SELECT id, status, result_json IS NOT NULL as has_result FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (verifyUpdate.rows && verifyUpdate.rows.length > 0) {
              log(`[DB Bridge] VERIFY UPDATE: Tool ${params.toolCallId} - status: ${verifyUpdate.rows[0].status}, has_result: ${verifyUpdate.rows[0].has_result}`);
            } else {
               log(`[DB Bridge] VERIFY UPDATE WARNING: Tool ${params.toolCallId} NOT found after update reported ${rowsAffectedUpdate} affected rows. This should not happen.`);
               result = { ...result, success: false, error: "Verification SELECT failed after update." };
            }
          } else {
            result = { success: false, toolCallId: params.toolCallId, status: params.status, rowsAffected: 0, error: "No rows updated. ToolCallId might not exist." };
            log(`[DB Bridge] WARNING: No rows updated for toolCallId ${params.toolCallId}. Checking if record exists...`);
            const checkResult = await db.query(
              `SELECT id, status FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (checkResult.rows && checkResult.rows.length > 0) {
              log(`[DB Bridge] Record EXISTS with status: ${checkResult.rows[0].status}. Update target ${params.status} may have been redundant or other issue.`);
            } else {
              log(`[DB Bridge] ERROR: No tool_execution record found with id: ${params.toolCallId} to update.`);
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR updating tool_executions for toolCallId ${params.toolCallId}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.toolCallId, error: dbError.message };
        }
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

// Track active Claude sessions
const activeClaudeSessions = new Map(); // Map<sessionId, { pty, requestId, bufferedOutput, claudeSessionId }>
const activeConnections = new Map(); // Map<requestId, ws>

// Helper function to attach PTY handlers
function attachPtyHandlers(ptyProcess, requestId, sessionId, ws) {
  let outputBuffer = '';
  let errorBuffer = '';
  let hasReceivedData = false;
  
  const session = sessionId ? activeClaudeSessions.get(sessionId) : null;
  
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
            
            // Try to extract Claude session ID if available
            if (session && !session.claudeSessionId && claudeMessage.session_id) {
              session.claudeSessionId = claudeMessage.session_id;
              log(`Captured Claude session ID: ${session.claudeSessionId}`);
            }
            
            const streamMsg = JSON.stringify({
              id: requestId,
              type: 'claude_stream_chunk',
              payload: claudeMessage
            });
            
            // Send to current connection if available
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(streamMsg);
            } else if (session) {
              // Buffer the output if connection is not available
              session.bufferedOutput.push(streamMsg);
              log(`Buffered message for session ${sessionId}, buffer size: ${session.bufferedOutput.length}`);
            }
          } catch (e) {
            log(`JSON Parse Error in bridge service: ${e.message} for line: <<<${cleaned}>>>`);
            // Continue processing other lines
          }
        } else if (cleaned) {
          // Non-JSON output, send as raw
          const rawMsg = JSON.stringify({
            id: requestId,
            type: 'raw',
            data: cleaned
          });
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(rawMsg);
          } else if (session) {
            session.bufferedOutput.push(rawMsg);
          }
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
          const finalMsg = JSON.stringify({
            id: requestId,
            type: 'claude_stream_chunk',
            payload: claudeMessage
          });
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(finalMsg);
          } else if (session) {
            session.bufferedOutput.push(finalMsg);
          }
        } catch (e) {
          log(`Final JSON Parse Error: ${e.message}`);
          if (cleaned) {
            const rawMsg = JSON.stringify({
              id: requestId,
              type: 'raw',
              data: cleaned
            });
            
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(rawMsg);
            } else if (session) {
              session.bufferedOutput.push(rawMsg);
            }
          }
        }
      } else if (cleaned) {
        const rawMsg = JSON.stringify({
          id: requestId,
          type: 'raw',
          data: cleaned
        });
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(rawMsg);
        } else if (session) {
          session.bufferedOutput.push(rawMsg);
        }
      }
    }
    
    // If exit code is non-zero, send error info
    if (exitCode !== 0) {
      const errorMessage = errorBuffer || outputBuffer || 'Unknown error';
      log(`Process failed with error: ${errorMessage}`);
      const errorMsg = JSON.stringify({
        id: requestId,
        type: 'claude_stream_error',
        error: `Claude CLI exited with code ${exitCode}: ${errorMessage.trim()}`
      });
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(errorMsg);
      } else if (session) {
        session.bufferedOutput.push(errorMsg);
      }
    }
    
    // Send stream done message
    const doneMsg = JSON.stringify({
      id: requestId,
      type: 'claude_stream_done',
      exitCode
    });
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(doneMsg);
    } else if (session) {
      session.bufferedOutput.push(doneMsg);
    }
    
    // Clean up session if PTY exited normally (not cancelled)
    if (sessionId && exitCode === 0) {
      // Keep the session info but mark PTY as null
      if (session) {
        session.pty = null;
        log(`PTY exited normally for session ${sessionId}, keeping session info for potential resume`);
      }
    }
    
    // Clean up connection
    activeConnections.delete(requestId);
  });
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
        pid: process.pid,
        activeSessions: activeClaudeSessions.size
      }));
      return;
    }
    
    // Handle database operations
    if (request.type === 'db') {
      handleDatabaseOperation(ws, request);
      return;
    }
    
    // Handle cancel request
    if (request.type === 'cancel') {
      const { requestId } = request;
      log(`Received cancel request for: ${requestId}`);
      
      // Find the session associated with this requestId
      for (const [sessionId, session] of activeClaudeSessions.entries()) {
        if (session.requestId === requestId) {
          log(`Cancelling PTY process for session: ${sessionId}`);
          if (session.pty) {
            session.pty.kill();
          }
          activeClaudeSessions.delete(sessionId);
          break;
        }
      }
      return;
    }
    
    // Handle session query
    if (request.type === 'query_active_sessions') {
      const { sessionIds } = request;
      const activeSessions = {};
      
      for (const sessionId of sessionIds || []) {
        if (activeClaudeSessions.has(sessionId)) {
          const session = activeClaudeSessions.get(sessionId);
          activeSessions[sessionId] = {
            active: true,
            hasBufferedOutput: session.bufferedOutput.length > 0,
            claudeSessionId: session.claudeSessionId
          };
        }
      }
      
      ws.send(JSON.stringify({
        type: 'active_sessions_response',
        activeSessions
      }));
      return;
    }
    
    const { id, args, sessionId } = request;
    
    if (!args || !Array.isArray(args)) {
      ws.send(JSON.stringify({
        id,
        type: 'error',
        error: 'Missing or invalid args array'
      }));
      return;
    }
    
    // Store connection for this request
    activeConnections.set(id, ws);
    
    // Check if we have an existing session
    if (sessionId && activeClaudeSessions.has(sessionId)) {
      const existingSession = activeClaudeSessions.get(sessionId);
      log(`Found existing session ${sessionId} with PTY alive: ${!!existingSession.pty}`);
      
      // Update the requestId for this session
      existingSession.requestId = id;
      
      // Send any buffered output
      if (existingSession.bufferedOutput.length > 0) {
        log(`Sending ${existingSession.bufferedOutput.length} buffered messages for session ${sessionId}`);
        for (const bufferedMsg of existingSession.bufferedOutput) {
          ws.send(bufferedMsg);
        }
        existingSession.bufferedOutput = [];
      }
      
      // If PTY is still alive, re-attach the data handler
      if (existingSession.pty) {
        attachPtyHandlers(existingSession.pty, id, sessionId, ws);
        return;
      } else {
        log(`PTY for session ${sessionId} is dead, will spawn new one`);
        // TODO: In future, could use --resume with existingSession.claudeSessionId if available
      }
    }
    
    // --- BEGIN MODIFICATIONS ---
    const originalArgs = [...args];
    let finalArgs = [...args]; // Work on a mutable copy
    
    log(`[Bridge Arg Handler] Initial args from client: ${JSON.stringify(finalArgs)}`);
    
    const hasPromptFlag = finalArgs.includes('-p') || finalArgs.includes('--prompt');
    let outputFormat = null;
    const outputFormatIndex = finalArgs.findIndex(arg => arg === '--output-format');
    
    if (outputFormatIndex !== -1 && finalArgs.length > outputFormatIndex + 1) {
      outputFormat = finalArgs[outputFormatIndex + 1];
      log(`[Bridge Arg Handler] Client requested --output-format: ${outputFormat}`);
    } else {
      log(`[Bridge Arg Handler] No --output-format specified by client.`);
    }
    
    let effectiveOutputFormat = outputFormat;
    
    // If no output format specified, default to stream-json for streaming capability
    if (!effectiveOutputFormat) {
      log('[Bridge Arg Handler] No output format specified by client. Defaulting to stream-json for bridge streaming.');
      const existingFormatIndex = finalArgs.findIndex(arg => arg === '--output-format');
      if (existingFormatIndex !== -1) {
        finalArgs.splice(existingFormatIndex, 2); // Remove existing if any
      }
      finalArgs.push('--output-format', 'stream-json');
      effectiveOutputFormat = 'stream-json';
    }
    
    // Ensure --verbose if effectiveOutputFormat is 'stream-json' and a prompt is present
    if (effectiveOutputFormat === 'stream-json' && hasPromptFlag) {
      const hasVerboseFlag = finalArgs.includes('--verbose');
      if (!hasVerboseFlag) {
        log('[Bridge Arg Handler] Adding --verbose because --output-format stream-json and a prompt flag are present.');
        finalArgs.push('--verbose');
      } else {
        log('[Bridge Arg Handler] --verbose already present with stream-json and prompt.');
      }
    } else if (effectiveOutputFormat === 'text') {
      log(`[Bridge Arg Handler] Using --output-format text as requested. --verbose not strictly required by this rule.`);
    }
    
    // Add --dangerously-skip-permissions flag to avoid permission prompts
    if (!finalArgs.includes('--dangerously-skip-permissions')) {
      finalArgs.push('--dangerously-skip-permissions');
    }
    
    log(`[Bridge Arg Handler] Final claudeArgs for PTY spawn: ${JSON.stringify(finalArgs)}`);
    // --- END MODIFICATIONS ---
    
    try {
      // Spawn Claude with PTY using project root as working directory
      const ptyProcess = pty.spawn(claudePath, finalArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: PROJECT_ROOT,
        env: process.env
      });
      
      log(`PTY process spawned with PID: ${ptyProcess.pid}`);
      
      // Store session information
      if (sessionId) {
        activeClaudeSessions.set(sessionId, {
          pty: ptyProcess,
          requestId: id,
          bufferedOutput: [],
          claudeSessionId: null // Will be extracted from Claude output if available
        });
      }
      
      attachPtyHandlers(ptyProcess, id, sessionId, ws);
      
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
    // Remove this connection from activeConnections
    for (const [requestId, conn] of activeConnections.entries()) {
      if (conn === ws) {
        activeConnections.delete(requestId);
        log(`Removed connection for request ${requestId}`);
        // Note: We do NOT kill the PTY process here - it should continue running
        break;
      }
    }
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