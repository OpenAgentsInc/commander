// Minimal utility wrapper to test basic functionality
const { parentPort } = require('node:worker_threads');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Simple console logging that should work
console.log('[Utility Wrapper] Starting minimal wrapper...');

// Try to create a simple log file
try {
  const logPath = path.join(process.env.HOME || '/tmp', 'claude-utility-minimal.log');
  fs.writeFileSync(logPath, `[${new Date().toISOString()}] Utility wrapper started\n`);
  console.log('[Utility Wrapper] Log file created at:', logPath);
} catch (e) {
  console.error('[Utility Wrapper] Failed to create log file:', e.message);
}

// Test if we can access parentPort
if (!parentPort) {
  console.error('[Utility Wrapper] No parentPort available!');
  process.exit(1);
}

console.log('[Utility Wrapper] parentPort available, waiting for messages...');

// Send a test message immediately
parentPort.postMessage({ 
  type: 'error', 
  error: 'Utility wrapper initialized successfully' 
});

// Listen for messages from the main process
parentPort.on('message', (message) => {
  console.log('[Utility Wrapper] Received message:', message.type);
  
  if (message.type === 'start') {
    const { command, args, env } = message;
    
    console.log('[Utility Wrapper] Command:', command);
    console.log('[Utility Wrapper] Args:', args);
    
    // Try basic spawn without PTY
    try {
      console.log('[Utility Wrapper] Attempting to spawn process...');
      
      const childProcess = spawn(command, args, {
        env: { ...process.env, ...env },
        cwd: env.HOME || process.env.HOME,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log('[Utility Wrapper] Process spawned, PID:', childProcess.pid);
      
      let outputBuffer = '';
      let errorBuffer = '';
      let hasReceivedData = false;
      
      // Handle stdout
      childProcess.stdout.on('data', (data) => {
        if (!hasReceivedData) {
          hasReceivedData = true;
          console.log('[Utility Wrapper] First stdout data received');
          parentPort.postMessage({ 
            type: 'error', 
            error: 'First data received from Claude CLI' 
          });
        }
        
        const text = data.toString();
        console.log('[Utility Wrapper] stdout:', text.substring(0, 100));
        outputBuffer += text;
        
        // Try to parse JSON lines
        const lines = outputBuffer.split('\n');
        if (lines.length > 1) {
          outputBuffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.startsWith('{')) {
              try {
                const json = JSON.parse(trimmed);
                console.log('[Utility Wrapper] Parsed JSON type:', json.type);
                parentPort.postMessage({ type: 'data', data: json });
              } catch (e) {
                console.log('[Utility Wrapper] Not JSON:', trimmed.substring(0, 50));
                parentPort.postMessage({ type: 'raw', data: trimmed });
              }
            }
          }
        }
      });
      
      // Handle stderr
      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        console.error('[Utility Wrapper] stderr:', text);
        errorBuffer += text;
        parentPort.postMessage({ 
          type: 'error', 
          error: `Claude CLI stderr: ${text}` 
        });
      });
      
      // Handle exit
      childProcess.on('close', (code) => {
        console.log('[Utility Wrapper] Process exited with code:', code);
        
        // Send any remaining data
        if (outputBuffer.trim()) {
          parentPort.postMessage({ type: 'raw', data: outputBuffer.trim() });
        }
        if (errorBuffer.trim()) {
          parentPort.postMessage({ 
            type: 'error', 
            error: `Final stderr: ${errorBuffer}` 
          });
        }
        
        parentPort.postMessage({ type: 'exit', code });
      });
      
      // Handle spawn error
      childProcess.on('error', (err) => {
        console.error('[Utility Wrapper] Spawn error:', err.message);
        parentPort.postMessage({ 
          type: 'error', 
          error: `Failed to spawn process: ${err.message}` 
        });
        parentPort.postMessage({ type: 'exit', code: 1 });
      });
      
    } catch (err) {
      console.error('[Utility Wrapper] Error in spawn:', err);
      parentPort.postMessage({ 
        type: 'error', 
        error: `Spawn exception: ${err.message}` 
      });
      parentPort.postMessage({ type: 'exit', code: 1 });
    }
  }
});

// Log that we're ready
console.log('[Utility Wrapper] Ready to receive commands');
parentPort.postMessage({ 
  type: 'error', 
  error: 'Wrapper ready and waiting for start command' 
});