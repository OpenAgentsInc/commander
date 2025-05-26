// WebSocket implementation for Claude CLI via external bridge service

import { ipcMain, dialog, BrowserWindow } from "electron";
import * as crypto from "crypto";

const WebSocket = require('ws');

// Claude Bridge Service configuration
const BRIDGE_SERVICE_URL = 'ws://localhost:45671';
const activeConnections = new Map<string, WebSocket>();

// Database operation helpers
async function saveSessionToDatabase(session: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: `db-save-session-${Date.now()}`,
        operation: 'saveSession',
        params: session
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      ws.close();
      if (response.type === 'db_result') {
        resolve();
      } else if (response.type === 'db_error') {
        reject(new Error(response.error));
      }
    });
    
    ws.on('error', reject);
  });
}

async function saveMessageToDatabase(message: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: `db-save-message-${Date.now()}`,
        operation: 'saveMessage',
        params: message
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      ws.close();
      if (response.type === 'db_result') {
        resolve();
      } else if (response.type === 'db_error') {
        reject(new Error(response.error));
      }
    });
    
    ws.on('error', reject);
  });
}

async function saveToolCallToDatabase(toolCall: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: `db-save-toolcall-${Date.now()}`,
        operation: 'saveToolCall',
        params: toolCall
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      ws.close();
      if (response.type === 'db_result') {
        resolve();
      } else if (response.type === 'db_error') {
        reject(new Error(response.error));
      }
    });
    
    ws.on('error', reject);
  });
}

async function updateSessionInDatabase(sessionId: string, updates: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: `db-update-session-${Date.now()}`,
        operation: 'updateSession',
        params: { sessionId, updates }
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      ws.close();
      if (response.type === 'db_result') {
        resolve();
      } else if (response.type === 'db_error') {
        reject(new Error(response.error));
      }
    });
    
    ws.on('error', reject);
  });
}

// Check if bridge service is running
async function checkBridgeService(): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(BRIDGE_SERVICE_URL);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'health' }));
    });
    
    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'health' && msg.status === 'ok') {
          ws.close();
          resolve(true);
        }
      } catch (e) {
        resolve(false);
      }
    });
    
    ws.on('error', () => {
      resolve(false);
    });
    
    // Timeout after 2 seconds
    setTimeout(() => {
      ws.close();
      resolve(false);
    }, 2000);
  });
}

export function setupClaudeWebSocketHandler() {
  // Helper to generate random UUID
  const generateId = () => crypto.randomUUID();

  // Handle streaming requests
  ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => {
    console.log("[Main Process] Claude WebSocket stream request:", requestId);
    console.log("[Main Process] Received params:", JSON.stringify(params, null, 2));
    
    // Check if bridge service is available
    const bridgeAvailable = await checkBridgeService();
    if (!bridgeAvailable) {
      console.error("[Main Process] Claude Bridge Service not available");
      event.sender.send(`claude-code:chat-stream:error`, requestId, {
        __error: true,
        message: "Claude Bridge Service not running. Start it with: node src/services/claude-bridge-service.js"
      });
      return;
    }
    
    // Database persistence setup
    console.log("[Main Process] Received params.sessionId:", params.sessionId);
    const sessionId = params.sessionId || generateId();
    console.log("[Main Process] Using sessionId:", sessionId);
    const now = Math.floor(Date.now() / 1000);
    
    // Initialize database session
    try {
      // Ensure session exists
      const session = {
        id: sessionId,
        created_at: now,
        last_updated_at: now,
        provider_key: "claude_code",
        model_name: params.model || "claude-3-opus-20240229",
        system_prompt: params.messages?.find((m: any) => m.role === "system")?.content || "",
        metadata_json: JSON.stringify({}),
        title: "Claude Code Chat"
      };
      
      await saveSessionToDatabase(session);
      console.log("[Main Process] Session saved to database:", sessionId);
    } catch (error) {
      console.error("[Main Process] Failed to save session:", error);
      // Continue even if database fails
    }
    
    // Build conversation context
    const messages = params.messages || [];
    let conversationContext = "";
    
    // Find system message if any
    const systemMessage = messages.find((m: any) => m.role === "system")?.content;
    
    // Build conversation history
    const conversationMessages = messages.filter((m: any) => m.role !== "system");
    
    if (conversationMessages.length === 0) {
      console.error("[Main Process] No messages to send");
      event.sender.send(`claude-code:chat-stream:error`, requestId, {
        __error: true,
        message: "No messages provided"
      });
      return;
    }
    
    // For multi-turn conversations, format as a proper conversation
    if (conversationMessages.length > 1) {
      // Build conversation with clear role markers
      const formattedMessages = conversationMessages.map((msg: any, index: number) => {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        return `${role}: ${msg.content}`;
      });
      
      // Join with double newlines for clarity
      conversationContext = formattedMessages.join('\n\n');
      
      // If the last message is from the user, add a prompt for Claude
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage.role === 'user') {
        conversationContext += '\n\nAssistant:';
      }
    } else {
      // Single message - just send the content
      conversationContext = conversationMessages[0].content;
    }
    
    // Build Claude CLI args
    const args = ["-p", conversationContext, "--output-format", "stream-json", "--verbose"];
    if (systemMessage) {
      args.push("--system-prompt", systemMessage);
    }
    
    console.log("[Main Process] Conversation context being sent:", conversationContext);
    console.log("[Main Process] Connecting to bridge service with args:", args);
    
    // Save user message to database
    if (conversationMessages.length > 0) {
      const lastUserMessage = conversationMessages.find((m: any, i: number, arr: any[]) => 
        m.role === 'user' && i === arr.findLastIndex((msg: any) => msg.role === 'user')
      );
      
      if (lastUserMessage) {
        try {
          const userDbMessage = {
            id: generateId(),
            session_id: sessionId,
            role: "user",
            content: lastUserMessage.content,
            timestamp: now,
            model: params.model || "claude-3-opus-20240229",
            tool_calls_json: null,
            metadata_json: null
          };
          
          await saveMessageToDatabase(userDbMessage);
          console.log("[Main Process] User message saved to database");
        } catch (error) {
          console.error("[Main Process] Failed to save user message:", error);
        }
      }
    }
    
    // Connect to bridge service
    const ws = new WebSocket(BRIDGE_SERVICE_URL);
    activeConnections.set(requestId, ws);
    
    let hasReceivedData = false;
    let assistantMessageId = generateId();
    let fullAssistantContent = "";
    let toolCalls: any[] = [];
    
    ws.on('open', () => {
      console.log("[Main Process] Connected to bridge service");
      // Send the command with activeFolder if provided
      ws.send(JSON.stringify({ 
        id: requestId, 
        args,
        activeFolder: params.activeFolder // Forward the activeFolder if present
      }));
    });
    
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'claude_stream_chunk':
            hasReceivedData = true;
            const claudeMessage = message.payload;
            console.log("[Main Process] Received stream chunk:", claudeMessage.type);
            
            if (claudeMessage.type === "assistant" && claudeMessage.message) {
              // Extract text content from assistant message
              const assistantMessage = claudeMessage.message;
              if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
                for (const contentPart of assistantMessage.content) {
                  if (contentPart.type === "text" && contentPart.text) {
                    // Send plain text chunks directly
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, contentPart.text);
                    // Collect for database
                    fullAssistantContent += contentPart.text;
                  } else if (contentPart.type === "tool_use") {
                    // Send tool usage info
                    const toolInfo = `\n[Using tool: ${contentPart.name}]\n`;
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, toolInfo);
                    // Collect tool call for database
                    toolCalls.push({
                      id: contentPart.id,
                      type: "function",
                      function: {
                        name: contentPart.name,
                        arguments: JSON.stringify(contentPart.input || {})
                      }
                    });
                  }
                }
              }
              
              // Save complete assistant message immediately when received
              if (!assistantMessageId) {
                assistantMessageId = claudeMessage.id || generateId();
              }
              
              // Save the assistant message to database
              (async () => {
                try {
                  const assistantDbMessage = {
                    id: assistantMessageId,
                    session_id: sessionId,
                    role: "assistant",
                    content: assistantMessage.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(''),
                    tool_calls_json: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
                    timestamp: Math.floor(Date.now() / 1000),
                    provider_message_id: claudeMessage.id,
                  };
                  
                  await saveMessageToDatabase(assistantDbMessage);
                  console.log("[Main Process] Assistant message saved to database");
                  
                  // Save tool executions if any
                  const toolUses = assistantMessage.content.filter((p: any) => p.type === 'tool_use');
                  for (const tu of toolUses) {
                    const toolExecution = {
                      id: tu.id,
                      message_id: assistantMessageId,
                      tool_name: tu.name,
                      arguments_json: JSON.stringify(tu.input || {}),
                      status: "pending",
                      created_at: Math.floor(Date.now() / 1000),
                      updated_at: Math.floor(Date.now() / 1000),
                    };
                    
                    await saveToolCallToDatabase(toolExecution);
                  }
                  if (toolUses.length > 0) {
                    console.log(`[Main Process] ${toolUses.length} tool calls saved to database`);
                  }
                } catch (error) {
                  console.error("[Main Process] Failed to save assistant message:", error);
                }
              })();
            } else if (claudeMessage.type === "init") {
              console.log("[Main Process] Stream initialized:", claudeMessage);
            } else if (claudeMessage.type === "result") {
              console.log("[Main Process] Stream result:", claudeMessage);
            }
            break;
            
          case 'data':
            // Legacy non-streaming format support
            hasReceivedData = true;
            console.log("[Main Process] Received data from bridge:", message.data);
            
            // Parse Claude's streaming JSON format
            const claudeData = message.data;
            if (claudeData.type === "assistant" && claudeData.message) {
              // Extract text content from assistant message
              const assistantMessage = claudeData.message;
              if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
                for (const contentPart of assistantMessage.content) {
                  if (contentPart.type === "text" && contentPart.text) {
                    // Send plain text chunks directly
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, contentPart.text);
                    // Collect for database
                    fullAssistantContent += contentPart.text;
                  } else if (contentPart.type === "tool_use") {
                    // Send tool usage info
                    const toolInfo = `\n[Using tool: ${contentPart.name}]\n`;
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, toolInfo);
                    // Collect tool call for database
                    toolCalls.push({
                      id: contentPart.id,
                      type: "function",
                      function: {
                        name: contentPart.name,
                        arguments: JSON.stringify(contentPart.input || {})
                      }
                    });
                  }
                }
              }
            } else {
              // For other types of data, send as-is
              console.log("[Main Process] Non-assistant data:", claudeData);
            }
            break;
            
          case 'raw':
            hasReceivedData = true;
            console.log("[Main Process] Received raw data from bridge:", message.data);
            // For raw data (like tool output), send directly
            event.sender.send(`claude-code:chat-stream:chunk`, requestId, message.data);
            break;
            
          case 'claude_stream_done':
            console.log("[Main Process] Claude stream completed with code:", message.exitCode);
            ws.close();
            activeConnections.delete(requestId);
            
            // Update session last_updated_at
            (async () => {
              try {
                await updateSessionInDatabase(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) });
              } catch (error) {
                console.error("[Main Process] Failed to update session:", error);
              }
            })();
            
            if (message.exitCode === 0) {
              event.sender.send(`claude-code:chat-stream:done`, requestId);
            } else {
              event.sender.send(`claude-code:chat-stream:error`, requestId, {
                __error: true,
                message: `Claude CLI stream ended with code ${message.exitCode}`
              });
            }
            break;
            
          case 'claude_stream_error':
            console.error("[Main Process] Claude stream error:", message.error);
            event.sender.send(`claude-code:chat-stream:error`, requestId, {
              __error: true,
              message: message.error
            });
            break;
            
          case 'exit':
            console.log("[Main Process] Claude CLI exited with code:", message.exitCode);
            ws.close();
            activeConnections.delete(requestId);
            
            // Save assistant message to database on successful completion
            if (message.exitCode === 0 && fullAssistantContent) {
              (async () => {
                try {
                  const assistantDbMessage = {
                    id: assistantMessageId,
                    session_id: sessionId,
                    role: "assistant",
                    content: fullAssistantContent,
                    tool_calls_json: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
                    timestamp: Math.floor(Date.now() / 1000),
                  };
                  
                  await saveMessageToDatabase(assistantDbMessage);
                  console.log("[Main Process] Assistant message saved to database");
                  
                  // Save tool executions if any
                  if (toolCalls.length > 0) {
                    for (const tc of toolCalls) {
                      const toolExecution = {
                        id: tc.id,
                        message_id: assistantMessageId,
                        tool_name: tc.function.name,
                        arguments_json: tc.function.arguments,
                        status: "pending",
                        created_at: Math.floor(Date.now() / 1000),
                        updated_at: Math.floor(Date.now() / 1000),
                      };
                      
                      await saveToolCallToDatabase(toolExecution);
                    }
                    console.log(`[Main Process] ${toolCalls.length} tool calls saved to database`);
                  }
                  
                  // Update session last_updated_at
                  await updateSessionInDatabase(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) });
                } catch (error) {
                  console.error("[Main Process] Failed to save assistant message:", error);
                }
              })();
            }
            
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
            console.error("[Main Process] Bridge error:", message.error);
            event.sender.send(`claude-code:chat-stream:error`, requestId, {
              __error: true,
              message: message.error
            });
            break;
        }
      } catch (e) {
        console.error("[Main Process] Failed to parse bridge message:", e);
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error("[Main Process] WebSocket error:", error);
      event.sender.send(`claude-code:chat-stream:error`, requestId, {
        __error: true,
        message: `WebSocket error: ${error.message}`
      });
      activeConnections.delete(requestId);
    });
    
    ws.on('close', () => {
      console.log("[Main Process] WebSocket closed");
      activeConnections.delete(requestId);
      
      if (!hasReceivedData) {
        event.sender.send(`claude-code:chat-stream:error`, requestId, {
          __error: true,
          message: "Connection to bridge service closed without receiving data"
        });
      }
    });
    
    // Timeout handler
    setTimeout(() => {
      if (activeConnections.has(requestId) && !hasReceivedData) {
        console.error("[Main Process] Bridge timeout");
        ws.close();
        activeConnections.delete(requestId);
        event.sender.send(`claude-code:chat-stream:error`, requestId, {
          __error: true,
          message: "Timeout waiting for Claude CLI response"
        });
      }
    }, 30000);
  });
  
  // Handle cancel requests
  ipcMain.on("claude-code:chat-stream:cancel", (event, requestId: string) => {
    console.log("[Main Process] Cancel request for:", requestId);
    const ws = activeConnections.get(requestId);
    if (ws) {
      ws.close();
      activeConnections.delete(requestId);
    }
  });
  
  // Handle folder selection
  ipcMain.handle("claude-code:select-folder", async (event) => {
    console.log("[Main Process] Received claude-code:select-folder request");
    
    try {
      // Workaround: Focus the window first
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      console.log("[Main Process] Main window found:", !!mainWindow);
      
      if (mainWindow) {
        console.log("[Main Process] Focusing main window before dialog");
        mainWindow.focus();
        
        // Small delay to ensure focus
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Try different property combinations as workaround
      const dialogOptions: Electron.OpenDialogOptions = {
        properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
        title: 'Select Project Folder',
        buttonLabel: 'Select',
      };
      
      console.log("[Main Process] Showing dialog with options:", dialogOptions);
      
      // Try without specifying browserWindow to see if that helps
      const result = await dialog.showOpenDialog(dialogOptions);
      
      console.log("[Main Process] Dialog result:", JSON.stringify(result, null, 2));
      console.log("[Main Process] Result type:", typeof result);
      console.log("[Main Process] Result keys:", result ? Object.keys(result) : 'null');
      
      // Check both possible result formats
      if (result) {
        // Handle the result object format
        if ('filePaths' in result && Array.isArray(result.filePaths) && result.filePaths.length > 0) {
          console.log("[Main Process] Folder selected from filePaths:", result.filePaths[0]);
          return result.filePaths[0];
        }
        // Handle if result is directly an array (older Electron versions)
        if (Array.isArray(result) && result.length > 0) {
          console.log("[Main Process] Folder selected from array result:", result[0]);
          return result[0];
        }
        // Check canceled property
        if ('canceled' in result && !result.canceled && 'filePaths' in result) {
          console.log("[Main Process] Not canceled but filePaths is:", result.filePaths);
        }
      }
      
      console.log("[Main Process] No folder was selected");
      return null;
    } catch (error) {
      console.error("[Main Process] Error showing folder dialog:", error);
      console.error("[Main Process] Error stack:", error?.stack);
      console.error("[Main Process] Error type:", error?.constructor?.name);
      return null;
    }
  });
}