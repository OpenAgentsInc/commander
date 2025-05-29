// WebSocket implementation for Claude CLI via external bridge service

import { ipcMain } from "electron";
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
    const requestId = `db-save-toolcall-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation: 'saveToolCall',
        params: toolCall
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      if (response.id === requestId) {
        clearTimeout(timeoutId); // Clear timeout on response
        ws.close();
        if (response.type === 'db_result' && response.result && response.result.success) {
          console.log(`[Main Process] Tool call ${toolCall.id} reported as saved by bridge. Rows affected: ${response.result.rowsAffected || 'N/A'}`);
          resolve();
        } else {
          const errorMessage = response.error || (response.result && response.result.error) || 'Unknown error from bridge during saveToolCall';
          console.error(`[Main Process] Bridge service FAILED to save tool call ${toolCall.id}: ${errorMessage}`);
          console.error(`[Main Process] Bridge saveToolCall response details: ${JSON.stringify(response.result)}`);
          reject(new Error(`Bridge failed to save tool call ${toolCall.id}: ${errorMessage}. Details: ${JSON.stringify(response.result)}`));
        }
      }
    });
    
    const timeoutId = setTimeout(() => {
      ws.close();
      const errorMsg = `Timeout waiting for bridge response for saveToolCall ${toolCall.id}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    }, 5000); // 5 second timeout for DB operations
    
    ws.on('error', (err) => {
      clearTimeout(timeoutId);
      const errorMsg = `WebSocket error for saveToolCall ${toolCall.id}: ${err.message || 'Unknown WebSocket error'}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    });
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

async function updateToolCallResultInDatabase(toolCallId: string, resultJson: string, status: "executed_success" | "executed_error"): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    const requestId = `db-update-toolcall-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation: 'updateToolCallResult',
        params: { toolCallId, resultJson, status }
      }));
    });
    
    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      if (response.id === requestId) {
        clearTimeout(timeoutId);
        ws.close();
        if (response.type === 'db_result' && response.result && response.result.success) {
          console.log(`[Main Process] Tool call ${toolCallId} result reported as updated by bridge. Rows affected: ${response.result.rowsAffected || 'N/A'}`);
          resolve();
        } else {
          const errorMessage = response.error || (response.result && response.result.error) || 'Unknown error from bridge during updateToolCallResult';
          console.error(`[Main Process] Bridge service FAILED to update tool call result ${toolCallId}: ${errorMessage}`);
          console.error(`[Main Process] Bridge updateToolCallResult response details: ${JSON.stringify(response.result)}`);
          reject(new Error(`Bridge failed to update tool call ${toolCallId}: ${errorMessage}. Details: ${JSON.stringify(response.result)}`));
        }
      }
    });
    
    const timeoutId = setTimeout(() => {
      ws.close();
      const errorMsg = `Timeout waiting for bridge response for updateToolCallResult ${toolCallId}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    }, 5000); // 5 second timeout
    
    ws.on('error', (err) => {
      clearTimeout(timeoutId);
      const errorMsg = `WebSocket error for updateToolCallResult ${toolCallId}: ${err.message || 'Unknown WebSocket error'}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    });
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
        system_prompt: params.systemPrompt || "",
        metadata_json: JSON.stringify({}),
        title: "Claude Code Chat"
      };
      
      await saveSessionToDatabase(session);
      console.log("[Main Process] Session saved to database:", sessionId);
    } catch (error) {
      console.error("[Main Process] Failed to save session:", error);
      // Continue even if database fails
    }
    
    // Get messages and system prompt from params
    const chatMessagesForPrompt = params.messages || []; // These are already user/assistant turns from useCoderChat
    const systemPromptContent = params.systemPrompt;    // This is now explicitly passed

    if (chatMessagesForPrompt.length === 0 && !systemPromptContent) {
      console.log("[Main Process] No messages or system prompt to send to Claude CLI");
      event.sender.send(`claude-code:chat-stream:error`, requestId, {
        __error: true,
        message: "No messages or system prompt provided"
      });
      return;
    }

    // Helper function to format messages (inline version)
    function formatMessagesForClaudeCli_main(messages: any[]) {
      const relevantMessages = messages.filter(
        (msg) => msg.role === "user" || msg.role === "assistant",
      );
      if (relevantMessages.length === 0) return "";
      let prompt = relevantMessages
        .map((message) => {
          const role = message.role === "user" ? "Human" : "Assistant";
          const content = message.content || "";
          return `${role}: ${content}`;
        })
        .join("\n\n");
      const lastMessage = relevantMessages[relevantMessages.length - 1];
      if (lastMessage.role === "user") {
        prompt += "\n\nAssistant:";
      }
      return prompt;
    }

    // Use the formatter
    const conversationContext = formatMessagesForClaudeCli_main(chatMessagesForPrompt);

    // Build Claude CLI args
    const args: string[] = [];
    if (conversationContext) { // Only add -p if there's actual conversation context
         args.push("-p", conversationContext);
    }
    args.push("--output-format", "stream-json");
    
    // Claude CLI requires --verbose when using --output-format stream-json with -p
    args.push("--verbose");

    // Remove all unsupported CLI parameters
    // Claude CLI doesn't support these flags in the current version
    // if (params.model) {
    //     args.push("--model", params.model);
    // }
    // if (params.temperature !== undefined) {
    //     args.push("--temperature", String(params.temperature));
    // }
    // if (params.max_tokens) {
    //     args.push("--max-tokens-to-sample", String(params.max_tokens));
    // }

    if (systemPromptContent) {
      args.push("--system-prompt", systemPromptContent);
    }

    // Tool management for Claude Code CLI
    if (params.allowedTools && Array.isArray(params.allowedTools) && params.allowedTools.length > 0) {
      // If allowedTools is explicitly provided, use it.
      args.push("--allowedTools", params.allowedTools.join(','));
      console.log(`[Main Process] Using allowedTools from params for Claude Code: ${params.allowedTools.join(',')}`);
    } else {
      // If allowedTools is not specified, we will manage disallowedTools.
      // Start with any disallowedTools passed in params, or an empty array.
      let disallowedToolsArray: string[] = [];
      if (params.disallowedTools && Array.isArray(params.disallowedTools) && params.disallowedTools.length > 0) {
        disallowedToolsArray = [...params.disallowedTools];
      }

      // Ensure specific tools are in the disallowed list.
      // Note: Claude CLI tool names are case-sensitive.
      const toolsToDisable = ["Task", "TodoWrite", "TodoRead", "NotebookRead", "NotebookEdit"];
      for (const tool of toolsToDisable) {
        if (!disallowedToolsArray.includes(tool)) {
          disallowedToolsArray.push(tool);
        }
      }

      // If there are any tools to disallow, add the flag.
      if (disallowedToolsArray.length > 0) {
        args.push("--disallowedTools", disallowedToolsArray.join(','));
        console.log(`[Main Process] Disallowing tools for Claude Code: ${disallowedToolsArray.join(', ')}`);
        console.log(`[Main Process] Total ${disallowedToolsArray.length} tools disabled`);
        
        // Log to telemetry if available
        try {
          const telemetryLog = {
            event: 'claude_code_tools_disabled',
            tools: disallowedToolsArray,
            sessionId: sessionId,
            timestamp: Date.now()
          };
          console.log('[Main Process] Tool restriction telemetry:', JSON.stringify(telemetryLog));
        } catch (e) {
          // Telemetry logging failed, continue
        }
      } else {
        // If no allowedTools and no disallowedTools (even after adding tools, which shouldn't happen),
        // this means no tool-related flags are added.
        console.log(`[Main Process] No specific tool restrictions applied for Claude Code.`);
      }
    }
    
    console.log("[Main Process] Conversation context being sent:", conversationContext);
    console.log("[Main Process] Final Claude CLI args to be sent to bridge:", args);
    
    // Save user message to database
    if (chatMessagesForPrompt.length > 0) {
      const lastUserMessage = chatMessagesForPrompt.find((m: any, i: number, arr: any[]) => 
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
    let messageAlreadySaved = false;
    let messageSavePromise: Promise<void> | null = null;
    let accumulatedContent: any[] = [];
    
    ws.on('open', () => {
      console.log("[Main Process] Connected to bridge service");
      // Send the command
      ws.send(JSON.stringify({ id: requestId, args }));
    });
    
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'claude_stream_chunk':
            hasReceivedData = true;
            const claudeMessage = message.payload;
            console.log("[Main Process] Received stream chunk:", claudeMessage.type);
            console.log("[Main Process] Full Claude message:", JSON.stringify(claudeMessage, null, 2));
            
            if (claudeMessage.type === "assistant" && claudeMessage.message) {
              // Extract text content from assistant message
              const assistantMessage = claudeMessage.message;
              
              // Use the Claude message ID if we haven't set one yet
              if (!assistantMessageId && claudeMessage.id) {
                assistantMessageId = claudeMessage.id;
              }
              
              // Save assistant message to database immediately on first chunk
              if (!messageAlreadySaved && !messageSavePromise && assistantMessageId) {
                // Save synchronously to ensure it's done before tool calls
                messageSavePromise = saveMessageToDatabase({
                  id: assistantMessageId,
                  session_id: sessionId,
                  role: "assistant",
                  content: "[]", // Start with empty array, will update later
                  tool_calls_json: undefined,
                  timestamp: Math.floor(Date.now() / 1000),
                })
                .then(() => {
                  messageAlreadySaved = true;
                  console.log("[Main Process] Assistant message placeholder saved to database early");
                })
                .catch((error) => {
                  console.error("[Main Process] Failed to save assistant message placeholder:", error);
                  messageAlreadySaved = true; // Prevent retrying
                });
              }
              
              // Accumulate all content parts
              if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
                accumulatedContent = accumulatedContent.concat(assistantMessage.content);
                
                for (const contentPart of assistantMessage.content) {
                  if (contentPart.type === "text" && contentPart.text) {
                    // Send plain text chunks directly
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, contentPart.text);
                    // Collect for database
                    fullAssistantContent += contentPart.text;
                  } else if (contentPart.type === "tool_use") {
                    // Send structured tool call info to UI
                    const toolCallInfo = {
                      type: 'tool_call',
                      id: contentPart.id,
                      name: contentPart.name,
                      parameters: contentPart.input
                    };
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(toolCallInfo));
                    // Collect tool call for database
                    toolCalls.push({
                      id: contentPart.id,
                      type: "function",
                      function: {
                        name: contentPart.name,
                        arguments: JSON.stringify(contentPart.input || {})
                      }
                    });
                    
                    // *** NEW: Immediately save the tool call to the database ***
                    const toolExecutionData = {
                      id: contentPart.id,                      // Tool call ID from Claude
                      message_id: assistantMessageId,          // ID of the parent assistant message
                      tool_name: contentPart.name,
                      arguments_json: JSON.stringify(contentPart.input || {}),
                      status: "pending",                       // Initial status
                      created_at: Math.floor(Date.now() / 1000),
                      updated_at: Math.floor(Date.now() / 1000),
                      result_json: null                       // No result yet
                    };
                    
                    console.log(`[Main Process] Immediately saving tool call: ${toolExecutionData.id} for message ${assistantMessageId}`);
                    
                    // Wait for message to be saved first if needed
                    const saveToolCall = async () => {
                      if (messageSavePromise) {
                        await messageSavePromise;
                      }
                      return saveToolCallToDatabase(toolExecutionData);
                    };
                    
                    saveToolCall()
                      .then(() => {
                        console.log(`[Main Process] Successfully saved pending tool call ${toolExecutionData.id} to DB.`);
                      })
                      .catch(error => {
                        console.error(`[Main Process] Failed to immediately save tool call ${toolExecutionData.id} to DB:`, error);
                        // Optionally, send an error notification to the renderer or log to telemetry
                      });
                    // *** END OF NEW LOGIC ***
                  }
                }
              }
              
              // Removed save logic from here - it now happens only in the 'exit' or 'claude_stream_done' handler
            } else if (claudeMessage.type === "init") {
              console.log("[Main Process] Stream initialized:", claudeMessage);
            } else if (claudeMessage.type === "result") {
              console.log("[Main Process] Stream result:", claudeMessage);
              // Don't send result to UI - it's already included in the assistant message
            } else if (claudeMessage.type === "tool_result") {
              console.log("[Main Process] Tool result:", claudeMessage);
              // Format and send tool results to UI
              if (claudeMessage.content && Array.isArray(claudeMessage.content)) {
                for (const contentPart of claudeMessage.content) {
                  if (contentPart.type === "text" && contentPart.text) {
                    const toolResultInfo = {
                      type: 'tool_result',
                      result: contentPart.text
                    };
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(toolResultInfo));
                  }
                }
              }
            } else if (claudeMessage.type === "user" && claudeMessage.message) {
              console.log("[Main Process] User message (tool result):", claudeMessage);
              // Handle tool results that come as user messages (from Task tool subtools)
              const userMessage = claudeMessage.message;
              console.log("[Main Process] Processing user message content:", JSON.stringify(userMessage.content));
              if (userMessage.content && Array.isArray(userMessage.content)) {
                for (const contentPart of userMessage.content) {
                  console.log("[Main Process] Content part type:", contentPart.type);
                  if (contentPart.type === "tool_result") {
                    // Extract text content from tool result if it's an array
                    let resultContent = contentPart.content;
                    if (Array.isArray(contentPart.content)) {
                      // Extract text from content array
                      resultContent = contentPart.content
                        .filter((item: any) => item.type === 'text')
                        .map((item: any) => item.text)
                        .join('\n');
                    }
                    
                    const toolResultInfo = {
                      type: 'tool_result',
                      tool_use_id: contentPart.tool_use_id,
                      content: resultContent,
                      is_error: contentPart.is_error
                    };
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(toolResultInfo));
                    
                    // Update tool execution in database
                    console.log(`[Main Process] Attempting to save tool result for ${contentPart.tool_use_id}`);
                    (async () => {
                      try {
                        await updateToolCallResultInDatabase(
                          contentPart.tool_use_id,
                          JSON.stringify({ content: resultContent }),
                          contentPart.is_error ? 'executed_error' : 'executed_success'
                        );
                        console.log(`[Main Process] Tool result saved for ${contentPart.tool_use_id}`);
                      } catch (error) {
                        console.error(`[Main Process] Failed to save tool result for ${contentPart.tool_use_id}:`, error);
                      }
                    })();
                  }
                }
              }
            } else {
              // Log any other message types we're not handling
              console.log("[Main Process] Unhandled Claude message type:", claudeMessage.type);
              console.log("[Main Process] Message content:", JSON.stringify(claudeMessage, null, 2));
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
                    // Send structured tool call info to UI
                    const toolCallInfo = {
                      type: 'tool_call',
                      id: contentPart.id,
                      name: contentPart.name,
                      parameters: contentPart.input
                    };
                    event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(toolCallInfo));
                    // Collect tool call for database
                    toolCalls.push({
                      id: contentPart.id,
                      type: "function",
                      function: {
                        name: contentPart.name,
                        arguments: JSON.stringify(contentPart.input || {})
                      }
                    });
                    
                    // *** NEW: Immediately save the tool call to the database ***
                    const toolExecutionData2 = {
                      id: contentPart.id,                      // Tool call ID from Claude
                      message_id: assistantMessageId,          // ID of the parent assistant message
                      tool_name: contentPart.name,
                      arguments_json: JSON.stringify(contentPart.input || {}),
                      status: "pending",                       // Initial status
                      created_at: Math.floor(Date.now() / 1000),
                      updated_at: Math.floor(Date.now() / 1000),
                      result_json: null                       // No result yet
                    };
                    
                    console.log(`[Main Process] Immediately saving tool call: ${toolExecutionData2.id} for message ${assistantMessageId}`);
                    
                    // Wait for message to be saved first if needed
                    const saveToolCall2 = async () => {
                      if (messageSavePromise) {
                        await messageSavePromise;
                      }
                      return saveToolCallToDatabase(toolExecutionData2);
                    };
                    
                    saveToolCall2()
                      .then(() => {
                        console.log(`[Main Process] Successfully saved pending tool call ${toolExecutionData2.id} to DB.`);
                      })
                      .catch(error => {
                        console.error(`[Main Process] Failed to immediately save tool call ${toolExecutionData2.id} to DB:`, error);
                        // Optionally, send an error notification to the renderer or log to telemetry
                      });
                    // *** END OF NEW LOGIC ***
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
            
            // Save assistant message to database on successful completion
            if (message.exitCode === 0 && accumulatedContent.length > 0) {
              (async () => {
                try {
                  const assistantDbMessage = {
                    id: assistantMessageId,
                    session_id: sessionId,
                    role: "assistant",
                    content: JSON.stringify(accumulatedContent), // Store structured content
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
            if (message.exitCode === 0 && accumulatedContent.length > 0) {
              (async () => {
                try {
                  const assistantDbMessage = {
                    id: assistantMessageId,
                    session_id: sessionId,
                    role: "assistant",
                    content: JSON.stringify(accumulatedContent), // Store structured content
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
}