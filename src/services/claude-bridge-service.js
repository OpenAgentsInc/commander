#!/usr/bin/env node
// External Node.js service for Claude CLI bridge
// This runs as a separate process with full Node.js capabilities

const WebSocket = require('ws');
const pty = require('node-pty');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
        uptime: process.uptime(),
        pid: process.pid
      }));
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