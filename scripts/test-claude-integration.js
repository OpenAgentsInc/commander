#!/usr/bin/env node
// Test script to verify Claude integration is working

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Electron app to test Claude integration...');
console.log('Please do the following:');
console.log('1. Select "Claude Code (CLI)" from the AI provider dropdown');
console.log('2. Send a message like "Introduce yourself"');
console.log('3. Watch the console output for errors');
console.log('4. Check ~/claude-utility-wrapper.log for detailed logs');
console.log('\nStarting app...\n');

const appPath = path.join(__dirname, '..');
const electron = spawn('pnpm', ['start'], {
  cwd: appPath,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1'
  }
});

electron.on('close', (code) => {
  console.log(`\nElectron app exited with code ${code}`);
  console.log('\nCheck the log file for details:');
  console.log('cat ~/claude-utility-wrapper.log');
});