// Ultra-minimal wrapper to diagnose utility process issues
const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.HOME || '/tmp', 'claude-utility-debug.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(logMsg);
  try {
    fs.appendFileSync(logFile, logMsg);
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
}

log('=== UTILITY WRAPPER STARTING ===');
log(`Process ID: ${process.pid}`);
log(`Node version: ${process.version}`);
log(`__dirname: ${__dirname}`);
log(`process.argv: ${JSON.stringify(process.argv)}`);

// Check if we're in a worker thread context
try {
  const { parentPort } = require('node:worker_threads');
  
  if (!parentPort) {
    log('ERROR: parentPort is null/undefined');
    process.exit(1);
  }
  
  log('SUCCESS: parentPort available');
  
  // Try to send a message immediately
  try {
    parentPort.postMessage({ type: 'error', error: 'Wrapper initialized' });
    log('SUCCESS: Sent initial message');
  } catch (e) {
    log(`ERROR sending message: ${e.message}`);
  }
  
  // Set up message handler
  parentPort.on('message', (msg) => {
    log(`Received message: ${JSON.stringify(msg)}`);
    
    if (msg.type === 'start') {
      log('Processing start command...');
      
      // Try basic spawn
      try {
        const { spawn } = require('child_process');
        const { command, args, env } = msg;
        
        log(`Spawning: ${command} ${args.join(' ')}`);
        
        const proc = spawn(command, args, {
          env: { ...process.env, ...env }
        });
        
        proc.on('error', (err) => {
          log(`Spawn error: ${err.message}`);
          parentPort.postMessage({ type: 'error', error: err.message });
        });
        
        proc.on('exit', (code) => {
          log(`Process exited with code: ${code}`);
          parentPort.postMessage({ type: 'exit', code });
        });
        
        // Capture output
        proc.stdout.on('data', (data) => {
          log(`stdout: ${data.toString().substring(0, 100)}`);
          parentPort.postMessage({ type: 'data', data: data.toString() });
        });
        
        proc.stderr.on('data', (data) => {
          log(`stderr: ${data.toString()}`);
          parentPort.postMessage({ type: 'error', error: data.toString() });
        });
        
      } catch (e) {
        log(`ERROR in spawn: ${e.message}`);
        parentPort.postMessage({ type: 'error', error: e.message });
      }
    }
  });
  
  log('Message handler set up, waiting for commands...');
  
} catch (e) {
  log(`FATAL ERROR: ${e.message}`);
  log(`Stack: ${e.stack}`);
  process.exit(1);
}