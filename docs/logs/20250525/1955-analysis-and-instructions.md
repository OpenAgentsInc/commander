# Claude CLI Electron Integration - Network Restriction Analysis & Workaround Instructions

**Date**: 2025-01-25
**Time**: 19:55
**Context**: Electron subprocess network restrictions preventing Claude CLI API access
**Solution**: Implement utilityProcess API or external service bridge

## Critical Discovery: Network Context Isolation

The Claude CLI failure is caused by **Electron's Chromium-based subprocess network isolation**, not TTY or authentication issues. Key findings:

1. **ELECTRON_RUN_AS_NODE=1** is automatically set for child processes, creating an isolated Node.js environment without access to Electron's network stack
2. **TLS certificate validation fails** because subprocesses can't access Chromium's certificate stores (BoringSSL vs OpenSSL mismatch)
3. **Network requests timeout** because the subprocess operates in a restricted security context
4. **`claude --version` works** because it doesn't make network requests
5. **`claude -p "hi"` fails** because API calls can't penetrate the network isolation

## Workaround Option 1: Electron utilityProcess API

The `utilityProcess` API is Electron's recommended solution for subprocess network access.

### Implementation Instructions

**Step 1: Create Claude Wrapper Module**

Create `src/services/ai/providers/claude_code/claude-utility-wrapper.js`:

```javascript
// claude-utility-wrapper.js
// This runs in the utility process, not main process
const pty = require('node-pty');
const path = require('path');
const { parentPort } = require('worker_threads');

// Listen for commands from main process
parentPort.on('message', async (message) => {
  const { id, command, args, env } = message;

  try {
    // Find Claude CLI
    const claudePath = env.CLAUDE_PATH || '/Users/christopherdavid/.npm-global/bin/claude';

    // Spawn with PTY
    const ptyProcess = pty.spawn(claudePath, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: env.HOME || process.env.HOME,
      env: {
        ...process.env,
        ...env,
        // Ensure PATH includes Claude location
        PATH: `${path.dirname(claudePath)}:${process.env.PATH}`
      }
    });

    let outputBuffer = '';

    ptyProcess.onData((data) => {
      outputBuffer += data;

      // Parse JSON lines
      const lines = outputBuffer.split('\n');
      if (lines.length > 1) {
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim().replace(/\x1b\[[0-9;]*[mGKHJ]/g, '');
          if (line && line.startsWith('{')) {
            try {
              const json = JSON.parse(line);
              parentPort.postMessage({
                id,
                type: 'data',
                data: json
              });
            } catch (e) {
              // Send raw line if not JSON
              parentPort.postMessage({
                id,
                type: 'raw',
                data: line
              });
            }
          }
        }
        outputBuffer = lines[lines.length - 1];
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      // Send any remaining data
      if (outputBuffer.trim()) {
        const cleaned = outputBuffer.trim().replace(/\x1b\[[0-9;]*[mGKHJ]/g, '');
        if (cleaned) {
          parentPort.postMessage({
            id,
            type: 'raw',
            data: cleaned
          });
        }
      }

      parentPort.postMessage({
        id,
        type: 'exit',
        exitCode,
        signal
      });
    });

  } catch (error) {
    parentPort.postMessage({
      id,
      type: 'error',
      error: error.message
    });
  }
});
```

**Step 2: Update Main Process IPC Handler**

Replace the current implementation in `src/main.ts`:

```javascript
// Add to imports
const { utilityProcess } = require('electron');
const path = require('path');

// Store active utility processes
const activeUtilityProcesses = new Map();

// Replace the current claude-code:chat-stream handler
ipcMain.on("claude-code:chat-stream", (event, requestId, params) => {
  console.log("[Main Process] Received claude-code:chat-stream request:", requestId);

  try {
    // Create utility process with network access
    const utilityPath = path.join(__dirname, 'services/ai/providers/claude_code/claude-utility-wrapper.js');

    const utility = utilityProcess.fork(utilityPath, [], {
      serviceName: 'claude-cli-service',
      respondToAuthRequestsFromMainProcess: true, // Critical for HTTPS/API access
      stdio: 'pipe'
    });

    activeUtilityProcesses.set(requestId, utility);

    // Prepare Claude CLI arguments
    const userMessage = params.messages?.find(m => m.role === "user")?.content || "Hello";
    const args = ["-p", userMessage, "--output-format", "stream-json", "--verbose"];

    // Send command to utility process
    utility.postMessage({
      id: requestId,
      command: 'claude',
      args: args,
      env: {
        HOME: process.env.HOME,
        CLAUDE_PATH: '/Users/christopherdavid/.npm-global/bin/claude'
      }
    });

    // Handle responses from utility process
    utility.on('message', (message) => {
      console.log("[Main Process] Utility message:", message.type);

      switch (message.type) {
        case 'data':
          // Send parsed JSON to renderer
          event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(message.data));
          break;

        case 'raw':
          // Send raw text if needed
          console.log("[Main Process] Raw data:", message.data);
          break;

        case 'exit':
          activeUtilityProcesses.delete(requestId);
          if (message.exitCode === 0) {
            event.sender.send(`claude-code:chat-stream:done`, requestId);
          } else {
            event.sender.send(`claude-code:chat-stream:error`, requestId, {
              __error: true,
              message: `Claude CLI exited with code ${message.exitCode}`
            });
          }
          break;

        case 'error':
          activeUtilityProcesses.delete(requestId);
          event.sender.send(`claude-code:chat-stream:error`, requestId, {
            __error: true,
            message: message.error
          });
          break;
      }
    });

    // Timeout handler
    setTimeout(() => {
      if (activeUtilityProcesses.has(requestId)) {
        console.error("[Main Process] Utility process timeout");
        utility.kill();
        activeUtilityProcesses.delete(requestId);
        event.sender.send(`claude-code:chat-stream:error`, requestId, {
          __error: true,
          message: "Claude CLI timeout via utilityProcess"
        });
      }
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error("[Main Process] Failed to create utility process:", error);
    event.sender.send(`claude-code:chat-stream:error`, requestId, {
      __error: true,
      message: `Failed to create utility process: ${error.message}`
    });
  }
});

// Add cancel handler
ipcMain.on("claude-code:chat-stream:cancel", (event, requestId) => {
  const utility = activeUtilityProcesses.get(requestId);
  if (utility) {
    utility.kill();
    activeUtilityProcesses.delete(requestId);
  }
});
```

**Step 3: Update Build Configuration**

Ensure the utility wrapper is included in the build. Add to `forge.config.ts`:

```javascript
// In the packagerConfig section
extraResource: [
  'src/services/ai/providers/claude_code/claude-utility-wrapper.js'
]
```

## Workaround Option 2: External Service Bridge

If utilityProcess still has issues, implement a completely separate Node.js service.

### Implementation Instructions

**Step 1: Create External Service**

Create `services/claude-bridge-service.js`:

```javascript
// claude-bridge-service.js
// Run this as a separate process: node services/claude-bridge-service.js
const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');
const { execSync } = require('child_process');

const app = express();
const PORT = 43210;

// Find Claude CLI
let claudePath;
try {
  claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
} catch (e) {
  claudePath = '/Users/christopherdavid/.npm-global/bin/claude';
}

console.log(`Claude Bridge Service starting on port ${PORT}`);
console.log(`Claude CLI path: ${claudePath}`);

// WebSocket server for streaming
const wss = new WebSocket.Server({ port: PORT + 1 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    const { id, args } = JSON.parse(message);
    console.log(`Executing Claude CLI:`, args);

    try {
      const ptyProcess = pty.spawn(claudePath, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
      });

      let outputBuffer = '';

      ptyProcess.onData((data) => {
        outputBuffer += data;
        const lines = outputBuffer.split('\n');

        if (lines.length > 1) {
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim().replace(/\x1b\[[0-9;]*[mGKHJ]/g, '');
            if (line && line.startsWith('{')) {
              ws.send(JSON.stringify({
                id,
                type: 'data',
                data: line
              }));
            }
          }
          outputBuffer = lines[lines.length - 1];
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        ws.send(JSON.stringify({
          id,
          type: 'exit',
          exitCode
        }));
      });

    } catch (error) {
      ws.send(JSON.stringify({
        id,
        type: 'error',
        error: error.message
      }));
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', claudePath });
});

app.listen(PORT, () => {
  console.log(`HTTP health check on http://localhost:${PORT}/health`);
  console.log(`WebSocket streaming on ws://localhost:${PORT + 1}`);
});
```

**Step 2: Update Electron to Use External Service**

In `src/main.ts`:

```javascript
const WebSocket = require('ws');

// Check if bridge service is running
async function checkBridgeService() {
  try {
    const response = await fetch('http://localhost:43210/health');
    return response.ok;
  } catch (e) {
    return false;
  }
}

ipcMain.on("claude-code:chat-stream", async (event, requestId, params) => {
  // Check if bridge service is available
  const bridgeAvailable = await checkBridgeService();

  if (!bridgeAvailable) {
    event.sender.send(`claude-code:chat-stream:error`, requestId, {
      __error: true,
      message: "Claude Bridge Service not running. Start it with: node services/claude-bridge-service.js"
    });
    return;
  }

  // Connect to bridge service
  const ws = new WebSocket('ws://localhost:43211');

  ws.on('open', () => {
    const userMessage = params.messages?.find(m => m.role === "user")?.content || "Hello";
    const args = ["-p", userMessage, "--output-format", "stream-json", "--verbose"];

    ws.send(JSON.stringify({ id: requestId, args }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'data':
        event.sender.send(`claude-code:chat-stream:chunk`, requestId, message.data);
        break;
      case 'exit':
        ws.close();
        if (message.exitCode === 0) {
          event.sender.send(`claude-code:chat-stream:done`, requestId);
        } else {
          event.sender.send(`claude-code:chat-stream:error`, requestId, {
            __error: true,
            message: `Claude CLI exited with code ${message.exitCode}`
          });
        }
        break;
      case 'error':
        ws.close();
        event.sender.send(`claude-code:chat-stream:error`, requestId, {
          __error: true,
          message: message.error
        });
        break;
    }
  });

  ws.on('error', (error) => {
    event.sender.send(`claude-code:chat-stream:error`, requestId, {
      __error: true,
      message: `WebSocket error: ${error.message}`
    });
  });
});
```

## Testing Instructions

### For utilityProcess approach:

1. Implement the utility wrapper and main process changes
2. Test with: `pnpm start`
3. Select Claude Code provider and send a message
4. Monitor console for "Utility message:" logs

### For external service approach:

1. Start the bridge service: `node services/claude-bridge-service.js`
2. Verify health check: `curl http://localhost:43210/health`
3. Start Electron app: `pnpm start`
4. Test Claude Code provider

## Expected Outcomes

With either workaround, you should see:
- First data within 1-2 seconds (system init)
- Assistant response within 5-7 seconds
- Clean JSON streaming without timeouts
- Proper exit codes (0 for success)

## Key Takeaways

1. **Root cause**: Electron's subprocess network isolation, not authentication or TTY issues
2. **Solution 1**: utilityProcess with `respondToAuthRequestsFromMainProcess: true`
3. **Solution 2**: External Node.js service completely bypasses Electron restrictions

The utilityProcess approach is recommended as it's officially supported by Electron and maintains security while enabling network access.
