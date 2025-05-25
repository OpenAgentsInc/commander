import { app, BrowserWindow, nativeTheme } from "electron"; // Add nativeTheme
import registerListeners from "./helpers/ipc/listeners-register";
import { addOllamaEventListeners } from "./helpers/ipc/ollama/ollama-listeners";
// import { addClaudeCodeEventListeners } from "./helpers/ipc/claude_code/claude-code-listeners";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

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
        console.error("[Main Process] 'which claude' failed:", whichError.message);
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
      return { __error: true, message: error.message };
    }
  });
  
  // Streaming Claude CLI handler using SDK non-interactive mode
  ipcMain.on("claude-code:chat-stream", (event, requestId, params) => {
    console.log("[Main Process] Received claude-code:chat-stream request:", requestId, params);
    
    try {
      // First, try to find the claude command
      const { execSync } = require("child_process");
      let claudePath;
      try {
        claudePath = execSync("which claude", { encoding: "utf8" }).trim();
        console.log(`[Main Process] Found claude at: ${claudePath}`);
      } catch (whichError) {
        console.error("[Main Process] 'which claude' failed:", whichError.message);
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
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code" 
          });
          return;
        }
      }
      
      // Test with hardcoded simple message to eliminate content issues
      const userMessage = "hi"; // Hardcode to exact working manual test
      console.log("[Main Process] Using hardcoded test message:", userMessage);
      
      // Quick auth check to diagnose authentication issues
      try {
        console.log("[Main Process] Testing Claude auth status...");
        const authCheck = execSync(`${claudePath} --version`, { 
          encoding: "utf8", 
          timeout: 3000,
          env: { ...process.env },
          cwd: process.env.HOME
        });
        console.log(`[Main Process] Claude version check successful:`, authCheck.trim());
      } catch (authError) {
        console.error(`[Main Process] Claude version check failed:`, authError.message);
        // Don't fail here, just log it
      }
      
      // Build arguments for non-interactive streaming mode
      // Note: Skipping --system-prompt as it can cause CLI hanging issues
      // System messages should be handled through conversation context instead
      const args = ["-p", userMessage, "--output-format", "stream-json", "--verbose"];
      
      console.log(`[Main Process] Spawning Claude with args:`, args);
      console.log(`[Main Process] Environment check:`, {
        PATH: process.env.PATH?.split(':').slice(0, 5), // First 5 PATH entries
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL,
        cwd: process.cwd(),
        claudePath
      });
      
      // Nuclear option: Write to temp script and execute it
      const fs = require("fs");
      const path = require("path");
      const { exec } = require("child_process");
      
      const tempScriptPath = path.join(process.env.HOME, `.claude_temp_${Date.now()}.sh`);
      const scriptContent = `#!/bin/zsh
export PATH="${process.env.PATH}"
export HOME="${process.env.HOME}"
cd "${process.env.HOME}"
${claudePath} ${args.join(' ')}
`;
      
      console.log("[Main Process] Creating temp script:", tempScriptPath);
      console.log("[Main Process] Script content:", scriptContent);
      
      fs.writeFileSync(tempScriptPath, scriptContent, { mode: 0o755 });
      
      exec(`/bin/zsh "${tempScriptPath}"`, {
        cwd: process.env.HOME,
        timeout: 20000, // 20 second timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }, (error, stdout, stderr) => {
        // Clean up temp script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (cleanupError) {
          console.error("[Main Process] Failed to cleanup temp script:", cleanupError);
        }
        if (error) {
          console.error("[Main Process] execFile error:", error);
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `execFile error: ${error.message}`
          });
          return;
        }
        
        console.log("[Main Process] execFile stdout:", stdout);
        console.log("[Main Process] execFile stderr:", stderr);
        
        if (stderr) {
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Claude CLI stderr: ${stderr}`
          });
          return;
        }
        
        // Parse the complete output
        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const jsonChunk = JSON.parse(line);
              console.log("[Main Process] Parsed JSON chunk:", JSON.stringify(jsonChunk, null, 2));
              
              if (jsonChunk.type === "assistant" && jsonChunk.message) {
                const message = jsonChunk.message;
                if (message.content && Array.isArray(message.content)) {
                  for (const contentPart of message.content) {
                    if (contentPart.type === "text" && contentPart.text) {
                      event.sender.send("claude-code:chat-stream:chunk", requestId, contentPart.text);
                    }
                  }
                }
              }
            } catch (parseError) {
              if (line.trim()) {
                event.sender.send("claude-code:chat-stream:chunk", requestId, line);
              }
            }
          }
          
          event.sender.send("claude-code:chat-stream:done", requestId);
        } catch (outputError) {
          console.error("[Main Process] Output parsing error:", outputError);
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Output parsing error: ${outputError.message}`
          });
        }
      });
      
      return; // Skip the old spawn approach
      
      // Add timeout to detect hanging
      const timeoutId = setTimeout(() => {
        console.error("[Main Process] Claude CLI timeout - no output after 10 seconds");
        claudeProcess.kill();
        event.sender.send("claude-code:chat-stream:error", requestId, { 
          __error: true, 
          message: "Claude CLI timeout. Command executed:\nclaude " + args.join(' ') + "\n\nTry this command manually to debug." 
        });
      }, 10000); // 10 second timeout
      
      claudeProcess.stdout.on("data", (data) => {
        clearTimeout(timeoutId); // Clear timeout on first data
        const rawData = data.toString();
        console.log("[Main Process] Claude raw streaming data:", rawData);
        
        // Split by lines in case multiple JSON objects are in one chunk
        const lines = rawData.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const jsonChunk = JSON.parse(line);
            console.log("[Main Process] Parsed JSON chunk:", JSON.stringify(jsonChunk, null, 2));
            
            // Handle different Claude Code message types
            if (jsonChunk.type === "assistant" && jsonChunk.message) {
              const message = jsonChunk.message;
              if (message.content && Array.isArray(message.content)) {
                for (const contentPart of message.content) {
                  if (contentPart.type === "text" && contentPart.text) {
                    console.log("[Main Process] Sending text chunk:", contentPart.text);
                    event.sender.send("claude-code:chat-stream:chunk", requestId, contentPart.text);
                  } else if (contentPart.type === "tool_use") {
                    // Handle tool use - could show what Claude is doing
                    const toolInfo = `[Using tool: ${contentPart.name}]`;
                    console.log("[Main Process] Sending tool use info:", toolInfo);
                    event.sender.send("claude-code:chat-stream:chunk", requestId, toolInfo);
                  }
                }
              }
            } else if (jsonChunk.type === "system" && jsonChunk.subtype === "init") {
              // System initialization - could show available tools
              const initInfo = `[Claude Code initialized with tools: ${jsonChunk.tools?.join(", ") || "none"}]`;
              console.log("[Main Process] Sending init info:", initInfo);
              event.sender.send("claude-code:chat-stream:chunk", requestId, initInfo);
            } else if (jsonChunk.type === "user" && jsonChunk.message) {
              // User message or tool results - usually we skip these
              console.log("[Main Process] Skipping user message chunk");
            }
          } catch (parseError) {
            // If not valid JSON, send as-is (fallback)
            if (line.trim()) {
              console.log("[Main Process] Sending raw chunk (parse failed):", line);
              event.sender.send("claude-code:chat-stream:chunk", requestId, line);
            }
          }
        }
      });
      
      claudeProcess.stderr.on("data", (data) => {
        clearTimeout(timeoutId); // Clear timeout on stderr too
        const errorMessage = data.toString();
        console.error("[Main Process] Claude CLI stderr:", errorMessage);
        console.error("[Main Process] Full stderr buffer:", JSON.stringify(errorMessage));
        
        // Check for specific authentication errors
        if (errorMessage.includes("not authenticated") || errorMessage.includes("auth") || errorMessage.includes("login")) {
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Authentication error: ${errorMessage}\n\nPlease run 'claude auth' in your terminal to authenticate.` 
          });
        } else {
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Claude CLI error: ${errorMessage}` 
          });
        }
      });
      
      claudeProcess.on("close", (code) => {
        clearTimeout(timeoutId); // Clear timeout on process close
        console.log(`[Main Process] Claude CLI stream ended with code: ${code}`);
        if (code === 0) {
          event.sender.send("claude-code:chat-stream:done", requestId);
        } else {
          event.sender.send("claude-code:chat-stream:error", requestId, { 
            __error: true, 
            message: `Claude CLI exited with code ${code}. This might be an authentication issue - try running 'claude auth' manually.` 
          });
        }
      });
      
      claudeProcess.on("error", (error) => {
        console.error("[Main Process] Claude CLI process error:", error);
        event.sender.send("claude-code:chat-stream:error", requestId, { 
          __error: true, 
          message: `Process error: ${error.message}` 
        });
      });
    } catch (error) {
      console.error("[Main Process] Claude CLI spawn error:", error);
      event.sender.send("claude-code:chat-stream:error", requestId, { 
        __error: true, 
        message: `Spawn error: ${error.message}` 
      });
    }
  });
  
  console.log("[Main Process] Successfully registered Claude Code direct CLI handlers");
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

app.whenReady().then(createWindow).then(installExtensions);

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
