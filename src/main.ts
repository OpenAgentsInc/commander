import { app, BrowserWindow, nativeTheme, ipcMain } from "electron"; // Add nativeTheme
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
import { 
  SWE_BENCH_EVALUATE_TASK_CHANNEL,
  SWE_BENCH_LIST_TASKS_CHANNEL,
  SWE_BENCH_GET_TASK_CHANNEL,
  SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL,
  SWE_BENCH_STOP_BATCH_RUN_CHANNEL,
  SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL,
  SWE_BENCH_BATCH_RUN_STDERR_CHANNEL,
  SWE_BENCH_BATCH_RUN_EXIT_CHANNEL,
  SWE_BENCH_LIST_RESULT_RUNS_CHANNEL,
  SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL,
  SWE_BENCH_GET_TASK_RESULT_CHANNEL,
  FS_LIST_DIRS_CHANNEL,
  FS_READ_JSON_FILE_CHANNEL,
  SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL,
  SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL
} from "./helpers/ipc/swe_bench/swe-bench-channels";
// @ts-ignore - Conditionally imported in main process only
let sweBenchImports: any;

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
        console.log("SKIPPING SYSTEM MESG")
        // args.push("--system-prompt", systemMessage);
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

  // Lazy load SWE-Bench dependencies
  if (!sweBenchImports) {
    try {
      sweBenchImports = {
        FullSWEBenchHarnessLayer: require("./services/swe_bench_harness/example-layer-composition").FullSWEBenchHarnessLayer,
        SWEBenchHarnessService: require("./services/swe_bench_harness").SWEBenchHarnessService,
        Effect: require("effect").Effect,
        Cause: require("effect").Cause,
      };
    } catch (e) {
      console.error("[Main Process] Failed to load SWE-Bench dependencies:", e);
    }
  }

  // Register SWE-Bench IPC handler
  ipcMain.handle(SWE_BENCH_EVALUATE_TASK_CHANNEL, async (_event, instanceId: string, patchContent: string) => {
    console.log(`[IPC Main] Received swebench:evaluate-task for ${instanceId}`);
    
    if (!sweBenchImports) {
      const error = { 
        __error: true, 
        message: "SWE-Bench dependencies not loaded",
        name: "DependencyError"
      };
      console.error("[IPC Main] SWE-Bench dependencies not available");
      return error;
    }

    const { FullSWEBenchHarnessLayer, SWEBenchHarnessService, Effect, Cause } = sweBenchImports;

    const program = Effect.gen(function* (_: any) {
      const harness = yield* _(SWEBenchHarnessService);
      return yield* _(harness.evaluateTask(instanceId, patchContent));
    });

    try {
      // Run the program with the layer provided directly
      const result = await Effect.runPromise(
        Effect.provide(program, FullSWEBenchHarnessLayer)
      );
      console.log(`[IPC Main] Evaluation result for ${instanceId}:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      const errorCause = error instanceof Error ? error : Cause.squash(error);
      const serializableError = {
        __error: true,
        message: errorCause instanceof Error ? errorCause.message : String(errorCause),
        stack: errorCause instanceof Error ? errorCause.stack : undefined,
        name: errorCause instanceof Error ? errorCause.name : "Error"
      };
      console.error(`[IPC Main] Error evaluating task ${instanceId}:`, serializableError);
      return serializableError;
    }
  });
  console.log("[Main Process] SWE-Bench IPC handler registered for evaluate-task");

  // Add new SWE-Bench IPC handlers
  
  // Task listing and retrieval handlers
  ipcMain.handle(SWE_BENCH_LIST_TASKS_CHANNEL, async (_event, tasksDir: string) => {
    console.log(`[IPC Main] Listing tasks from: ${tasksDir}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      const basePath = path.join(process.cwd(), "assets/swebench-tasks");
      // Handle "." as root directory
      const fullPath = tasksDir === "." || !tasksDir ? basePath : path.join(basePath, tasksDir);
      
      console.log(`[IPC Main] Full path for tasks: ${fullPath}`);
      const files = await fs.readdir(fullPath);
      const taskIds = files
        .filter((f: string) => f.endsWith('.json'))
        .map((f: string) => f.replace('.json', ''));
      
      console.log(`[IPC Main] Found ${taskIds.length} tasks:`, taskIds);
      return taskIds;
    } catch (error) {
      console.error("[IPC Main] Error listing tasks:", error);
      return [];
    }
  });

  ipcMain.handle(SWE_BENCH_GET_TASK_CHANNEL, async (_event, tasksDir: string, instanceId: string) => {
    console.log(`[IPC Main] Getting task: ${instanceId} from ${tasksDir}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      const basePath = path.join(process.cwd(), "assets/swebench-tasks");
      // Handle "." as root directory
      const dirPath = tasksDir === "." || !tasksDir ? basePath : path.join(basePath, tasksDir);
      const fullPath = path.join(dirPath, `${instanceId}.json`);
      
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error("[IPC Main] Error getting task:", error);
      return null;
    }
  });

  // Batch run management - store running processes
  const runningBatchProcesses = new Map<string, any>();

  ipcMain.handle(SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL, async (event, params: any) => {
    console.log("[IPC Main] Spawning batch run:", params);
    try {
      const { spawn } = require("child_process");
      const path = require("path");
      
      // Generate unique run ID with timestamp
      const runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      
      // Build arguments for the batch runner script
      const args = ["tsx", "scripts/run-swebench-evaluation.ts"];
      if (params.instanceIds && params.instanceIds.length > 0) {
        args.push("--instance_ids", params.instanceIds.join(","));
      }
      args.push("--patch_source", params.patchSource);
      if (params.outputDirName) {
        args.push("--output_dir", params.outputDirName);
      } else {
        args.push("--output_dir", runId);
      }
      if (params.maxTasks) {
        args.push("--max_tasks", params.maxTasks.toString());
      }
      args.push("--tasks_dir", params.tasksDir);
      
      // Spawn the process
      const child = spawn("pnpm", args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Store the process
      runningBatchProcesses.set(runId, child);
      
      // Handle stdout
      child.stdout.on("data", (data: Buffer) => {
        event.sender.send(SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL, { runId, output: data.toString() });
      });
      
      // Handle stderr
      child.stderr.on("data", (data: Buffer) => {
        event.sender.send(SWE_BENCH_BATCH_RUN_STDERR_CHANNEL, { runId, output: data.toString() });
      });
      
      // Handle exit
      child.on("exit", (code: number) => {
        console.log(`[IPC Main] Batch run ${runId} exited with code ${code}`);
        runningBatchProcesses.delete(runId);
        event.sender.send(SWE_BENCH_BATCH_RUN_EXIT_CHANNEL, { runId, output: code });
      });
      
      return { runId };
    } catch (error) {
      console.error("[IPC Main] Error spawning batch run:", error);
      throw error;
    }
  });

  ipcMain.handle(SWE_BENCH_STOP_BATCH_RUN_CHANNEL, async (_event, runId: string) => {
    console.log(`[IPC Main] Stopping batch run: ${runId}`);
    const child = runningBatchProcesses.get(runId);
    if (child) {
      child.kill();
      runningBatchProcesses.delete(runId);
    }
  });

  // Results management handlers
  ipcMain.handle(SWE_BENCH_LIST_RESULT_RUNS_CHANNEL, async () => {
    console.log("[IPC Main] Listing result runs");
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      const resultsDir = path.join(process.cwd(), "docs", "swebench-results");
      const entries = await fs.readdir(resultsDir, { withFileTypes: true });
      
      return entries
        .filter((e: any) => e.isDirectory())
        .map((e: any) => e.name)
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error("[IPC Main] Error listing result runs:", error);
      return [];
    }
  });

  ipcMain.handle(SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL, async (_event, runDir: string) => {
    console.log(`[IPC Main] Getting result summary for: ${runDir}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      const summaryPath = path.join(process.cwd(), "docs", "swebench-results", runDir, "summary.json");
      
      // Check if file exists first
      try {
        await fs.access(summaryPath);
      } catch {
        console.log(`[IPC Main] Summary file not found for run: ${runDir}`);
        return null;
      }
      
      const content = await fs.readFile(summaryPath, 'utf-8');
      
      return JSON.parse(content);
    } catch (error) {
      console.error("[IPC Main] Error getting result summary:", error);
      return null;
    }
  });

  ipcMain.handle(SWE_BENCH_GET_TASK_RESULT_CHANNEL, async (_event, runDir: string, instanceId: string) => {
    console.log(`[IPC Main] Getting task result for: ${instanceId} in ${runDir}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      const resultPath = path.join(process.cwd(), "docs", "swebench-results", runDir, `${instanceId}_eval_result.json`);
      const content = await fs.readFile(resultPath, 'utf-8');
      
      return JSON.parse(content);
    } catch (error) {
      console.error("[IPC Main] Error getting task result:", error);
      return null;
    }
  });

  // Generic file system handlers
  ipcMain.handle(FS_LIST_DIRS_CHANNEL, async (_event, dirPath: string) => {
    console.log(`[IPC Main] Listing directories in: ${dirPath}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      // Ensure we only access allowed directories
      const safePath = path.join(process.cwd(), dirPath);
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      
      return entries
        .filter((e: any) => e.isDirectory())
        .map((e: any) => e.name);
    } catch (error) {
      console.error("[IPC Main] Error listing directories:", error);
      return [];
    }
  });

  ipcMain.handle(FS_READ_JSON_FILE_CHANNEL, async (_event, filePath: string) => {
    console.log(`[IPC Main] Reading JSON file: ${filePath}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      // Ensure we only access allowed files
      const safePath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(safePath, 'utf-8');
      
      return JSON.parse(content);
    } catch (error) {
      console.error("[IPC Main] Error reading JSON file:", error);
      return null;
    }
  });

  // Dataset management handlers
  ipcMain.handle(SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL, async (_event, datasetName?: string, tasksDir?: string) => {
    console.log(`[IPC Main] Checking dataset status: ${datasetName || 'default'}, ${tasksDir || 'default'}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      // Default values
      const dataset = datasetName || "princeton-nlp/SWE-bench";
      let datasetPath = tasksDir;
      
      if (!datasetPath) {
        // Default to ./assets/swe_bench_data relative to app directory
        datasetPath = path.join(process.cwd(), "assets/swe_bench_data");
      }
      
      // Check if directory exists
      try {
        const stats = await fs.stat(datasetPath);
        if (!stats.isDirectory()) {
          return { exists: false, path: datasetPath, datasetName: dataset };
        }
      } catch (e) {
        // Directory doesn't exist
        return { exists: false, path: datasetPath, datasetName: dataset };
      }
      
      // Count JSON files
      const files = await fs.readdir(datasetPath);
      const taskCount = files.filter((f: string) => f.endsWith('.json')).length;
      
      return { exists: true, path: datasetPath, taskCount, datasetName: dataset };
    } catch (error) {
      console.error("[IPC Main] Error checking dataset status:", error);
      return { exists: false, path: "", datasetName: datasetName || "princeton-nlp/SWE-bench" };
    }
  });

  ipcMain.handle(SWE_BENCH_DOWNLOAD_DATASET_CHANNEL, async (event, params: any) => {
    console.log("[IPC Main] Downloading dataset:", params);
    try {
      const { spawn, spawnSync } = require("child_process");
      const path = require("path");
      
      // Generate unique download ID
      const downloadId = `download-${Date.now()}`;
      
      // First check if Python dependencies are installed
      console.log("[IPC Main] Checking Python dependencies...");
      const depCheck = spawnSync("python3", ["scripts/check_python_deps.py"], {
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      
      if (depCheck.error) {
        console.error("[IPC Main] Python not found:", depCheck.error);
        throw new Error("Python 3 is not installed or not in PATH. Please install Python 3.7 or later.");
      }
      
      if (depCheck.status !== 0) {
        const errorOutput = depCheck.stderr || depCheck.stdout || "Failed to check dependencies";
        console.error("[IPC Main] Dependency check failed:", errorOutput);
        
        // Try to parse JSON error message
        try {
          const lines = (depCheck.stdout || "").split('\n').filter((line: string) => line.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        throw new Error("Python dependencies are not installed. Please run: pip install datasets");
      }
      
      // Build arguments for Python script
      const args = ["scripts/download_swe_bench_tasks.py"];
      if (params.datasetName) {
        args.push("--dataset_name", params.datasetName);
      }
      if (params.split) {
        args.push("--split", params.split);
      }
      if (params.outputDir) {
        args.push("--output_dir", params.outputDir);
      } else {
        // Default output directory
        args.push("--output_dir", path.join(process.cwd(), "assets/swe_bench_data"));
      }
      if (params.maxTasks) {
        args.push("--max_tasks", params.maxTasks.toString());
      }
      
      // Spawn Python process
      const child = spawn("python3", args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      });
      
      // Handle spawn errors
      child.on("error", (error: any) => {
        console.error("[IPC Main] Failed to spawn Python process:", error);
        event.sender.send(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, {
          downloadId,
          type: "error",
          message: `Failed to start download: ${error.message}. Make sure Python 3 is installed and available in PATH.`
        });
      });
      
      // Handle stdout (progress messages)
      child.stdout.on("data", (data: Buffer) => {
        const messages = data.toString().split('\n').filter((line: string) => line.trim());
        for (const message of messages) {
          try {
            const parsed = JSON.parse(message);
            event.sender.send(
              parsed.type === 'complete' ? SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL : SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL,
              { downloadId, ...parsed }
            );
          } catch (e) {
            // Not JSON, ignore
          }
        }
      });
      
      // Handle stderr (errors)
      let stderrBuffer = "";
      child.stderr.on("data", (data: Buffer) => {
        stderrBuffer += data.toString();
        console.error("[IPC Main] Download stderr:", data.toString());
      });
      
      // Handle exit
      child.on("exit", (code: number) => {
        if (code !== 0) {
          const errorMessage = stderrBuffer || `Download process exited with code ${code}`;
          console.error(`[IPC Main] Download failed with code ${code}:`, errorMessage);
          event.sender.send(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, {
            downloadId,
            type: "error",
            message: errorMessage
          });
        }
      });
      
      return { downloadId };
    } catch (error) {
      console.error("[IPC Main] Error starting download:", error);
      throw error;
    }
  });

  ipcMain.handle(SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL, async (_event, tasksDir: string, count: number) => {
    console.log(`[IPC Main] Getting ${count} random task IDs from: ${tasksDir}`);
    try {
      const fs = require("fs").promises;
      const path = require("path");
      
      // List all JSON files
      const files = await fs.readdir(tasksDir);
      const taskFiles = files.filter((f: string) => f.endsWith('.json'));
      
      // Extract instance IDs
      const instanceIds = taskFiles.map((f: string) => f.replace('.json', ''));
      
      // Shuffle and take requested count
      const shuffled = instanceIds.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));
      
      console.log(`[IPC Main] Selected ${selected.length} random task IDs`);
      return selected;
    } catch (error) {
      console.error("[IPC Main] Error getting random task IDs:", error);
      return [];
    }
  });

  console.log("[Main Process] All SWE-Bench IPC handlers registered");

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
