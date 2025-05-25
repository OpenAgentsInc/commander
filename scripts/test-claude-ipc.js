#!/usr/bin/env node
// Test the actual Claude IPC implementation in the running Electron app

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Claude IPC Integration Test ===');
console.log('This test will:');
console.log('1. Start the Electron app');
console.log('2. Wait for it to initialize');
console.log('3. The app should have test code to trigger Claude CLI');
console.log('');

// First, let's check if the utility wrapper exists and add debugging
const wrapperPath = path.join(__dirname, '../src/services/ai/providers/claude_code/claude-utility-wrapper.js');
if (fs.existsSync(wrapperPath)) {
  console.log('✓ Utility wrapper found at:', wrapperPath);
} else {
  console.error('✗ Utility wrapper NOT found at:', wrapperPath);
}

// Start the app
console.log('Starting Electron app...');
const app = spawn('pnpm', ['start'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    DEBUG: '*'
  }
});

app.on('close', (code) => {
  console.log(`\nElectron app exited with code ${code}`);
  
  // Check for logs
  console.log('\nChecking for utility wrapper logs...');
  const logPath = path.join(process.env.HOME, 'claude-utility-debug.log');
  if (fs.existsSync(logPath)) {
    console.log('\n=== Utility Wrapper Log ===');
    console.log(fs.readFileSync(logPath, 'utf8'));
  } else {
    console.log('No utility wrapper log found');
  }
});

// Instructions
setTimeout(() => {
  console.log('\n=== Manual Test Instructions ===');
  console.log('1. Click on the AI chat button');
  console.log('2. Select "Claude Code (CLI)" provider');
  console.log('3. Send a message like "Hello"');
  console.log('4. Watch the console for errors');
  console.log('5. Press Ctrl+C to exit when done');
}, 3000);