Okay, the issue identified in `docs/logs/20250529/0807-log.md` is a race condition: `tool_result` messages (type "user") arrive and attempt to update `tool_executions` records in the database *before* the corresponding `tool_use` (tool call) information from the assistant's message has been saved to create those `tool_executions` records. Tool calls were being saved only after the entire assistant message stream completed.

The fix involves saving the `tool_executions` record to the database immediately when a `tool_use` part is detected in an assistant's streaming response.

Here are the specific instructions for the coding agent:

**Target File:** `src/main-claude-websocket.ts`

**Objective:** Modify the WebSocket message handler for `claude_stream_chunk` to save tool call information (`tool_executions` record) to the database as soon as a `tool_use` part is identified in an assistant's message, rather than waiting for the entire stream to complete.

**Detailed Instructions:**

1.  **Locate the Message Handler:**
    Find the `ws.on('message', (data: string) => { ... });` block within the `ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => { ... });` handler.

2.  **Identify Assistant Message Chunk Processing:**
    Inside the message handler, navigate to the section where `claudeMessage.type === "assistant"` is processed. It will look something like this:
    ```javascript
    // ...
    if (claudeMessage.type === "assistant" && claudeMessage.message) {
      const assistantMessage = claudeMessage.message;
      // ...
      if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
        for (const contentPart of assistantMessage.content) {
          // ...
          if (contentPart.type === "text" && contentPart.text) {
            // ...
          } else if (contentPart.type === "tool_use") {
            // THIS IS THE CRITICAL SECTION TO MODIFY
            // Current logic likely pushes to a `toolCalls` array for later processing.
          }
        }
      }
    }
    // ...
    ```

3.  **Implement Immediate `saveToolCallToDatabase`:**
    Within the `else if (contentPart.type === "tool_use")` block:
    *   **Immediately after identifying a `tool_use` part**, and *before* or in *parallel* with pushing it to the `toolCalls` array (which is still needed for the final `messages.tool_calls_json`), construct the `DBToolExecution` object.
    *   Call `saveToolCallToDatabase` with this object. This function is asynchronous; handle it as a fire-and-forget operation with error logging to avoid blocking the stream processing.
    *   Ensure you use the correct `assistantMessageId` (which should be available in this scope, likely generated when the stream started or from the first assistant chunk) as the `message_id` for the `tool_executions` record.

    **Example Modification:**
    ```javascript
    // ... inside the loop processing assistantMessage.content ...
    else if (contentPart.type === "tool_use") {
      // Send structured tool call info to UI (existing logic, if any)
      const toolCallInfo = {
        type: 'tool_call',
        id: contentPart.id,
        name: contentPart.name,
        parameters: contentPart.input
      };
      event.sender.send(`claude-code:chat-stream:chunk`, requestId, JSON.stringify(toolCallInfo));

      // Collect tool call for final message save (existing logic)
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
      saveToolCallToDatabase(toolExecutionData)
        .then(() => {
          console.log(`[Main Process] Successfully saved pending tool call ${toolExecutionData.id} to DB.`);
        })
        .catch(error => {
          console.error(`[Main Process] Failed to immediately save tool call ${toolExecutionData.id} to DB:`, error);
          // Optionally, send an error notification to the renderer or log to telemetry
        });
      // *** END OF NEW LOGIC ***
    }
    // ...
    ```

4.  **Verify `assistantMessageId` Scope:**
    Ensure that `assistantMessageId` is correctly defined and accessible within the `tool_use` processing block. It is typically generated when the assistant's response stream begins or upon receiving the first assistant chunk with a message ID.

5.  **No Changes to `tool_result` Handling (Initially):**
    The logic for handling incoming `tool_result` messages (typically `claudeMessage.type === "user"`) and calling `updateToolCallResultInDatabase` should remain as is. The fix here is to ensure the record it tries to update *exists* because the `tool_use` part was saved promptly.

6.  **Test Thoroughly:**
    *   After implementation, test scenarios with multiple tool calls in a single assistant response.
    *   Test scenarios where tool results arrive quickly after tool calls.
    *   Verify that after a refresh, all tool calls and their corresponding results are displayed correctly and in order.
    *   Inspect the `claude-bridge-service.log` and the Electron main process console for:
        *   Successful `saveToolCall` logs from the bridge service occurring *before* `updateToolCallResult` logs for the same `tool_id`.
        *   Absence of "No tool_execution record found with id: ..." errors from the bridge when `updateToolCallResult` is called.

This change ensures that the `tool_executions` table is populated with "pending" tool calls as soon as they are announced by the assistant, allowing subsequent `tool_result` messages to correctly find and update these records.
