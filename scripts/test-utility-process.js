#!/usr/bin/env node
// Direct test of utility process with Claude CLI

const { app, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  console.log('[Test] Electron ready, testing utility process...');
  
  // Find claude
  const { execSync } = require('child_process');
  let claudePath;
  try {
    claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    console.log('[Test] Found claude at:', claudePath);
  } catch (e) {
    console.error('[Test] Could not find claude CLI');
    app.quit();
    return;
  }
  
  // Path to wrapper
  const wrapperPath = path.join(__dirname, '../src/services/ai/providers/claude_code/claude-utility-wrapper-minimal.js');
  
  if (!fs.existsSync(wrapperPath)) {
    console.error('[Test] Wrapper not found at:', wrapperPath);
    app.quit();
    return;
  }
  
  console.log('[Test] Starting utility process...');
  
  // Start utility process
  const child = utilityProcess.fork(wrapperPath, [], {
    serviceName: 'Claude Test',
    stdio: 'pipe',
    respondToAuthRequestsFromMainProcess: true
  });
  
  // Handle messages
  child.on('message', (message) => {
    console.log('[Test] Message from utility process:', message);
    
    if (message.type === 'exit') {
      console.log('[Test] Process exited with code:', message.code);
      setTimeout(() => app.quit(), 1000);
    }
  });
  
  // Handle spawn
  child.on('spawn', () => {
    console.log('[Test] Utility process spawned, sending command...');
    
    // Send test command
    child.postMessage({
      type: 'start',
      command: claudePath,
      args: ['-p', 'Say hello', '--output-format', 'stream-json', '--verbose'],
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        USER: process.env.USER
      }
    });
  });
  
  // Handle errors
  child.on('error', (error) => {
    console.error('[Test] Utility process error:', error);
    app.quit();
  });
  
  // Timeout
  setTimeout(() => {
    console.log('[Test] Timeout reached');
    app.quit();
  }, 30000);
});