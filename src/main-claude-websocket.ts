// WebSocket implementation for Claude CLI via external bridge service

import { ipcMain } from "electron";

const WebSocket = require('ws');

// Claude Bridge Service configuration
const BRIDGE_SERVICE_URL = 'ws://localhost:45671';
const activeConnections = new Map<string, WebSocket>();

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
  // Handle streaming requests
  ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => {
    console.log("[Main Process] Claude WebSocket stream request:", requestId);
    
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
    
    // Connect to bridge service
    const ws = new WebSocket(BRIDGE_SERVICE_URL);
    activeConnections.set(requestId, ws);
    
    let hasReceivedData = false;
    
    ws.on('open', () => {
      console.log("[Main Process] Connected to bridge service");
      // Send the command
      ws.send(JSON.stringify({ id: requestId, args }));
    });
    
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'data':
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
                  } else if (contentPart.type === "tool_use") {
                    // Send tool usage info
                    const toolInfo = `\n[Using tool: ${contentPart.name}]\n`;
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, toolInfo);
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
            
          case 'exit':
            console.log("[Main Process] Claude CLI exited with code:", message.exitCode);
            ws.close();
            activeConnections.delete(requestId);
            
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
}