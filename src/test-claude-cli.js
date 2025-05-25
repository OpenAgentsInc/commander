// Test entry point for Claude CLI integration
// This bypasses the UI and directly tests the IPC communication

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import the IPC handler setup from main.ts
require('./main');

app.whenReady().then(() => {
  console.log('[Test] Electron app ready, creating test window...');
  
  // Create a minimal window
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Don't show the window
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Wait a bit for IPC handlers to be registered
  setTimeout(() => {
    console.log('[Test] Simulating Claude CLI request...');
    
    // Create a fake event object that mimics what the renderer would send
    const fakeEvent = {
      sender: {
        send: (channel, ...args) => {
          console.log(`[Test] Received IPC response on channel: ${channel}`);
          console.log('[Test] Args:', JSON.stringify(args, null, 2));
          
          // Check if we got an error or completion
          if (channel.includes('error')) {
            console.log('[Test] Error received, test failed');
            app.quit();
          } else if (channel.includes('done')) {
            console.log('[Test] Stream completed successfully!');
            app.quit();
          }
        }
      }
    };
    
    // Simulate the IPC call that would come from the renderer
    const requestId = `test-${Date.now()}`;
    const params = {
      messages: [
        {
          role: 'system',
          content: "You are Commander's AI Agent. Be helpful and concise."
        },
        {
          role: 'user',
          content: 'Say hello and introduce yourself briefly'
        }
      ],
      model: 'claude-sonnet',
      max_tokens: 2048,
      temperature: 0.7,
      stream: true
    };
    
    console.log('[Test] Sending claude-code:chat-stream request...');
    
    // Trigger the IPC handler directly
    ipcMain.emit('claude-code:chat-stream', fakeEvent, requestId, params);
    
    // Set a timeout to quit if nothing happens
    setTimeout(() => {
      console.log('[Test] Timeout reached, no response received');
      app.quit();
    }, 45000); // 45 seconds
    
  }, 2000); // Wait 2 seconds for app to initialize
});

app.on('window-all-closed', () => {
  app.quit();
});