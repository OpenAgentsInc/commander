import { app, BrowserWindow, nativeTheme } from "electron"; // Add nativeTheme
import registerListeners from "./helpers/ipc/listeners-register";
import { addOllamaEventListeners } from "./helpers/ipc/ollama/ollama-listeners";
// import { addClaudeCodeEventListeners } from "./helpers/ipc/claude_code/claude-code-listeners";
import { addDatabaseEventListeners, initializeDatabaseService } from "./helpers/ipc/db/db-listeners";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { setupClaudeWebSocketHandler } from "./main-claude-websocket";

const inDevelopment = process.env.NODE_ENV === "development";

// Register Ollama event listeners as early as possible
// This ensures the handlers are registered before the renderer tries to use them
console.log("[Main Process] Registering Ollama event listeners early");
try {
  addOllamaEventListeners();
  console.log(
    "[Main Process] Successfully registered Ollama event listeners early",
  );
} catch (error) {
  console.error(
    "[Main Process] Failed to register Ollama event listeners early:",
    error,
  );
}

// Register Claude Code event listeners
console.log("[Main Process] Registering Claude Code event listeners early");
try {
  const { ipcMain } = require("electron");
  const { spawn } = require("child_process");
  
  // Non-streaming Claude CLI handler using SDK non-interactive mode
  ipcMain.handle("claude-code:chat-completion", async (_, params) => {
    console.log("[Main Process] Received claude-code:chat-completion request:", params);
    
    try {
      // First, try to find the claude command
      const { execSync } = require("child_process");
      let claudePath;
      try {
        claudePath = execSync("which claude", { encoding: "utf8" }).trim();
        console.log(`[Main Process] Found claude at: ${claudePath}`);
      } catch (whichError) {
        console.error("[Main Process] 'which claude' failed:", whichError instanceof Error ? whichError.message : String(whichError));
        // Try common paths
        const fs = require("fs");
        const possiblePaths = [
          "/usr/local/bin/claude",
          "/opt/homebrew/bin/claude",
          `${process.env.HOME}/.local/bin/claude`,
          `${process.env.HOME}/node_modules/.bin/claude`
        ];
        
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            claudePath = path;
            console.log(`[Main Process] Found claude at fallback path: ${claudePath}`);
            break;
          }
        }
        
        if (!claudePath) {
          console.error("[Main Process] Claude command not found in any common paths");
          return { __error: true, message: "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code" };
        }
      }

      const userMessage = params.messages?.find(m => m.role === "user")?.content || "Hello";
      const systemMessage = params.messages?.find(m => m.role === "system")?.content;
      
      // Build arguments for non-interactive mode
      const args = ["-p", userMessage, "--output-format", "json"];
      if (systemMessage) {
        args.push("--system-prompt", systemMessage);
      }
      
      const result = await new Promise((resolve, reject) => {
        const claudeProcess = spawn(claudePath, args, {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env }
        });
        
        let output = "";
        let errorOutput = "";
        
        claudeProcess.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        claudeProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });
        
        claudeProcess.on("close", (code) => {
          if (code === 0) {
            try {
              // Try to parse JSON response
              const jsonResponse = JSON.parse(output);
              resolve(jsonResponse.content || jsonResponse.text || output);
            } catch (parseError) {
              // Fallback to raw output if JSON parsing fails
              resolve(output);
            }
          } else {
            reject(new Error(`Claude CLI failed with code ${code}: ${errorOutput}`));
          }
        });
        
        claudeProcess.on("error", (error) => {
          reject(error);
        });
      });
      
      console.log("[Main Process] Claude CLI response:", result);
      return result;
    } catch (error) {
      console.error("[Main Process] Claude CLI error:", error);
      return { __error: true, message: error instanceof Error ? error.message : String(error) };
    }
  });
  
  // Set up WebSocket-based streaming handler
  setupClaudeWebSocketHandler();
  
  // OLD utility process implementation - replaced with WebSocket approach
  /*
  // Streaming Claude CLI handler using utilityProcess for network access
  ipcMain.on("claude-code:chat-stream", (event, requestId, params) => {
    console.log("[Main Process] Received claude-code:chat-stream request:", requestId, params);
    
    try {
      const { utilityProcess } = require("electron");
      const path = require("path");
      const fs = require("fs");
      
      // First, try to find the claude command
      const { execSync } = require("child_process");
      let claudePath;
      try {
        claudePath = execSync("which claude", { encoding: "utf8" }).trim();
        console.log(`[Main Process] Found claude at: ${claudePath}`);
      } catch (whichError) {
        console.error("[Main Process] 'which claude' failed:", whichError instanceof Error ? whichError.message : String(whichError));
        // Try common paths
        const possiblePaths = [
          "/usr/local/bin/claude",
          "/opt/homebrew/bin/claude",
          `${process.env.HOME}/.local/bin/claude`,
          `${process.env.HOME}/node_modules/.bin/claude`
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            claudePath = possiblePath;
            console.log(`[Main Process] Found claude at fallback path: ${claudePath}`);
            break;
          }
        }
        
        if (!claudePath) {
          console.error("[Main Process] Claude command not found in any common paths");
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code" 
          });
          return;
        }
      }
      
      // Extract user message from params
      const userMessage = params.messages?.find(m => m.role === "user")?.content || "Hello";
      const systemMessage = params.messages?.find(m => m.role === "system")?.content;
      
      console.log("[Main Process] Processing message:", userMessage);
      
      // Build arguments for non-interactive streaming mode
      const args = ["-p", userMessage, "--output-format", "stream-json"];
      if (systemMessage) {
        args.push("--system-prompt", systemMessage);
      }
      
      // Disable specific tools by default
      const disabledTools = ["Task", "TodoRead", "TodoWrite", "NotebookRead", "NotebookEdit"];
      args.push("--disallowedTools", disabledTools.join(","));
      console.log(`[Main Process] Disabling tools: ${disabledTools.join(", ")}`);
      
      console.log(`[Main Process] Using utilityProcess with args:`, args);
      
      // Path to our wrapper script
      const wrapperPath = path.join(__dirname, "../../src/services/ai/providers/claude_code/claude-utility-wrapper.js");
      
      // Verify the wrapper exists
      if (!fs.existsSync(wrapperPath)) {
        console.error(`[Main Process] Wrapper not found at: ${wrapperPath}`);
        event.sender.send("claude-code:chat-stream:error", requestId, { 
          __error: true, 
          message: "Claude utility wrapper not found. Please check installation." 
        });
        return;
      }
      console.log(`[Main Process] Using wrapper at: ${wrapperPath}`);
      
      // Start utility process with network access
      const child = utilityProcess.fork(wrapperPath, [], {
        serviceName: "Claude CLI Process",
        stdio: "pipe",
        // Enable network access by allowing auth requests
        respondToAuthRequestsFromMainProcess: true
      });
      
      let buffer = '';
      let isRawMode = false;
      let hasReceivedData = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!hasReceivedData) {
          console.error("[Main Process] Claude CLI timeout - no output after 30 seconds");
          child.kill();
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: "Claude CLI timeout. The command may require authentication. Try running 'claude auth' in your terminal." 
          });
        }
      }, 30000); // 30 second timeout
      
      // Handle messages from the utility process
      child.on("message", (message) => {
        hasReceivedData = true;
        clearTimeout(timeoutId);
        
        console.log("[Main Process] Received message from utility process:", message.type);
        
        switch (message.type) {
          case "data":
            console.log("[Main Process] Data:", message.data);
            // Check for raw mode marker
            if (!isRawMode && message.data.includes('__RAW_MODE_START__')) {
              isRawMode = true;
              const parts = message.data.split('__RAW_MODE_START__');
              if (parts[0]) {
                // Process any data before the marker
                buffer = parts[0];
              }
              buffer = parts[1] || '';
            } else if (!isRawMode) {
              buffer += message.data;
            }
            break;
            
          case "raw":
            console.log("[Main Process] Raw streaming data:", message.data);
            // In raw mode, parse streaming JSON
            const lines = message.data.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const jsonChunk = JSON.parse(line);
                console.log("[Main Process] Parsed JSON chunk:", JSON.stringify(jsonChunk, null, 2));
                
                if (jsonChunk.type === "assistant" && jsonChunk.message) {
                  const assistantMessage = jsonChunk.message;
                  if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
                    for (const contentPart of assistantMessage.content) {
                      if (contentPart.type === "text" && contentPart.text) {
                        event.sender.send("claude-code:chat-stream:chunk", requestId, contentPart.text);
                      } else if (contentPart.type === "tool_use") {
                        const toolInfo = `\n[Using tool: ${contentPart.name}]\n`;
                        event.sender.send("claude-code:chat-stream:chunk", requestId, toolInfo);
                      }
                    }
                  }
                }
              } catch (parseError) {
                // If not valid JSON, it might be tool output
                if (line.trim() && !line.includes('__RAW_MODE_START__')) {
                  console.log("[Main Process] Non-JSON line (possibly tool output):", line);
                }
              }
            }
            break;
            
          case "error":
            console.error("[Main Process] Claude CLI error:", message.error);
            
            // Check for specific authentication errors
            if (message.error.includes("not authenticated") || 
                message.error.includes("auth") || 
                message.error.includes("login")) {
              event.sender.send("claude-code:chat-stream:error", requestId, { 
                __error: true, 
                message: `Authentication error: ${message.error}\n\nPlease run 'claude auth' in your terminal to authenticate.` 
              });
            } else {
              event.sender.send("claude-code:chat-stream:error", requestId, { 
                __error: true, 
                message: `Claude CLI error: ${message.error}` 
              });
            }
            break;
            
          case "exit":
            console.log(`[Main Process] Claude CLI exited with code: ${message.code}`);
            clearTimeout(timeoutId);
            
            if (message.code === 0) {
              event.sender.send("claude-code:chat-stream:done", requestId);
            } else {
              event.sender.send("claude-code:chat-stream:error", requestId, { 
                __error: true, 
                message: `Claude CLI exited with code ${message.code}. This might be an authentication issue - try running 'claude auth' manually.` 
              });
            }
            break;
        }
      });
      
      // Add immediate error handler
      child.on("error", (error) => {
        console.error("[Main Process] Utility process error:", error);
        event.sender.send("claude-code:chat-stream:error", requestId, { 
          __error: true, 
          message: `Utility process error: ${error.message}` 
        });
      });

      // Handle utility process spawn
      child.on("spawn", () => {
        console.log("[Main Process] Utility process spawned successfully");
        
        // Test if we can send messages
        try {
          // Send the command to execute
          child.postMessage({
            type: "start",
            command: claudePath,
            args: args,
            env: {
              PATH: process.env.PATH,
              HOME: process.env.HOME,
              USER: process.env.USER,
              // Add any Claude-specific environment variables
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
              CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || ''
            }
          });
          console.log("[Main Process] Start message sent to utility process");
        } catch (e) {
          console.error("[Main Process] Failed to send message to utility process:", e);
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Failed to communicate with utility process: ${e instanceof Error ? e.message : String(e)}` 
          });
        }
      });
      
      child.on("exit", (code) => {
        console.log("[Main Process] Utility process exited early with code:", code);
        clearTimeout(timeoutId);
        if (!hasReceivedData) {
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Utility process exited unexpectedly with code ${code}` 
          });
        }
      });
      
    } catch (error) {
      console.error("[Main Process] Claude CLI utilityProcess error:", error);
      event.sender.send("claude-code:chat-stream:error", requestId, { 
        __error: true, 
        message: `Process error: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  */
  
  console.log("[Main Process] Successfully registered Claude Code WebSocket handlers");
} catch (error) {
  console.error(
    "[Main Process] Failed to register Claude Code event listeners early:",
    error,
  );
}

function createWindow() {
  // Force dark theme for native Electron elements
  nativeTheme.themeSource = "dark";

  // Get screen dimensions and calculate 90% of width and height
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = Math.floor(width * 0.9);
  const windowHeight = Math.floor(height * 0.9);

  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // Center the window
    center: true,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,
      preload: preload,
    },
    // titleBarStyle: "hidden",
  });

  // Register other listeners after window creation
  console.log("[Main Process] Registering all IPC listeners");
  registerListeners(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

// Initialize database and register listeners before creating window
app.whenReady().then(async () => {
  console.log("[Main Process] App ready, initializing database...");
  
  try {
    // Initialize database service
    await initializeDatabaseService();
    console.log("[Main Process] Database initialized successfully");
    
    // Register database IPC listeners
    addDatabaseEventListeners();
    console.log("[Main Process] Database IPC listeners registered");
  } catch (error) {
    console.error("[Main Process] Failed to initialize database:", error);
    // Continue app startup even if database fails - we can show error in UI
  }
  
  // Create window and install extensions
  createWindow();
  await installExtensions();
});

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
