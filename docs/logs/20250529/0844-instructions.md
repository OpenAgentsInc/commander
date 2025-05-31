The core problem is that the assistant message's text content and its tool calls (with their results) are not being saved and rehydrated in an interleaved manner. Currently, the full text content of an assistant message is saved as one block, and then tool calls are appended. Upon rehydration, this leads to the text appearing first, followed by all tool calls and their results.

We need to:
1.  Save the assistant's message content in a structured format that preserves the original order of text parts and tool_use directives.
2.  Modify the message rehydration logic in `CoderPane.tsx` to parse this structured content and reconstruct the message parts in the correct interleaved order.

Here are the specific instructions:

**Target File 1: `src/main-claude-websocket.ts`**

**Objective:** Change how assistant messages are saved to the database. Instead of concatenating all text parts into a single string for `messages.content`, store the array of content parts (text and tool_use) as a JSON string.

**Instructions:**

1.  **Modify Assistant Message Saving Logic:**
    Locate the `ipcMain.on("claude-code:chat-stream", ...)` handler. Inside this handler, find where the `assistantDbMessage` is prepared and saved after the Claude CLI stream completes (e.g., in `claude_stream_done` or `exit` message handlers from the bridge service, or after the local `ptyProcess.onExit` handler).

    Currently, it might look like this:
    ```javascript
    // Existing logic (simplified)
    // ... after stream completion ...
    const assistantDbMessage = {
      id: assistantMessageId,
      // ... other fields ...
      content: fullAssistantContent, // This is a concatenated string of all text parts
      tool_calls_json: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
      // ...
    };
    await saveMessageToDatabase(assistantDbMessage);
    ```

    **Change this to:**
    *   Ensure you have an array that accumulates all content parts from the assistant as they arrive in the stream. Let's call this `accumulatedContentParts`. Each element in this array should be an object like `{ type: 'text', text: '...' }` or `{ type: 'tool_use', id: '...', name: '...', input: {...} }` directly as received from the Claude CLI's `stream-json` "assistant" message content blocks.
    *   When saving the `assistantDbMessage`, the `content` field should now be `JSON.stringify(accumulatedContentParts)`.
    *   The `tool_calls_json` field should still be populated from the `toolCalls` array as before (this array typically holds a slightly different structure of tool call information, specifically for indexing or separate querying, and can remain).

    **Modified Logic Example:**
    ```javascript
    // ... after stream completion ...

    // Ensure `accumulatedContentParts` has been populated correctly during streaming.
    // Each element in `accumulatedContentParts` should look like:
    // { type: 'text', text: 'Some text' }
    // OR
    // { type: 'tool_use', id: 'toolu_abc', name: 'ToolName', input: { param: 'value' } }

    const assistantDbMessage = {
      id: assistantMessageId,
      session_id: sessionId,
      role: "assistant",
      // Store the structured array of parts as a JSON string in the content field
      content: JSON.stringify(accumulatedContentParts),
      // Keep tool_calls_json for now, it might be used for other purposes or can be deprecated later
      tool_calls_json: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
      timestamp: Math.floor(Date.now() / 1000),
    };

    await saveMessageToDatabase(assistantDbMessage);
    console.log("[Main Process] Assistant message with structured content saved to database");

    // ... rest of the logic ...
    ```

    **Note on `accumulatedContentParts`:**
    You should already have a mechanism to collect parts. For example, if you have:
    ```javascript
    // During streaming...
    // let accumulatedContentParts = []; // Initialize this at the start of the assistant's response stream
    // ...
    if (claudeMessage.type === "assistant" && claudeMessage.message) {
        const assistantMessage = claudeMessage.message;
        if (assistantMessage.content && Array.isArray(assistantMessage.content)) {
            // Instead of just processing, accumulate these parts
            accumulatedContentParts.push(...assistantMessage.content);
            // ... then send to UI, save tool_calls to `toolCalls` array, etc.
        }
    }
    ```
    Make sure this `accumulatedContentParts` array is correctly populated and used for saving.

**Target File 2: `src/components/coder/CoderPane.tsx`**

**Objective:** Modify the `loadMessagesForSessionInternal` function to parse the structured `content` field of assistant messages and reconstruct the UI message parts in their original, interleaved order.

**Instructions:**

1.  **Update Message Rehydration Logic:**
    Inside `loadMessagesForSessionInternal`, locate the loop where `dbMessages` are processed (around `dbMessages.forEach(dbMsg => { ... });`).

    Modify the logic for `dbMsg.role === 'assistant'` messages:

    ```typescript
    // ... inside loadMessagesForSessionInternal ...
    dbMessages.forEach(dbMsg => {
      let uiParts: Array<ChatMessage['parts'][number]> = []; // Initialize parts for the UI message

      if (dbMsg.role === 'assistant') {
        let successfullyParsedStructuredContent = false;
        if (dbMsg.content) {
          try {
            const structuredContent = JSON.parse(dbMsg.content);
            if (Array.isArray(structuredContent)) {
              // New format: dbMsg.content is an array of parts
              console.log(`[CoderPane] Rehydrating assistant message ${dbMsg.id} with structured content`);
              const toolExecutionMap = new Map(
                (toolExecutionsByMessage.get(dbMsg.id) || []).map(exec => [exec.id, exec])
              );

              for (const rawPart of structuredContent) {
                if (rawPart.type === 'text' && rawPart.text) {
                  uiParts.push({ type: 'text', text: rawPart.text });
                } else if (rawPart.type === 'tool_use' && rawPart.id && rawPart.name) {
                  uiParts.push({
                    type: 'tool_call',
                    id: rawPart.id,
                    name: rawPart.name,
                    input: rawPart.input || {},
                  });

                  // Immediately add its result if available
                  const execution = toolExecutionMap.get(rawPart.id);
                  if (execution) {
                    if (execution.result_json) {
                      let parsedResultJson;
                      try {
                        parsedResultJson = JSON.parse(execution.result_json);
                      } catch (e) {
                        console.warn(`[CoderPane] Failed to parse result_json for tool ${rawPart.id}:`, execution.result_json, e);
                        parsedResultJson = { content: `[Error parsing result: ${execution.result_json}]`, isError: true };
                      }
                      uiParts.push({
                        type: 'tool_result',
                        tool_use_id: execution.id,
                        content: parsedResultJson,
                        isError: execution.status === 'executed_error' || parsedResultJson.isError,
                        isLoading: false,
                      });
                    } else { // Result not yet available or failed before result
                      uiParts.push({
                        type: 'tool_result',
                        tool_use_id: execution.id,
                        content: execution.status === 'pending' ? "Tool execution is pending..."
                                  : execution.status === 'executed_error' ? "[Error result not available]"
                                  : "[Result not available yet]",
                        isLoading: execution.status === 'pending',
                        isError: execution.status === 'executed_error',
                      });
                    }
                  } else {
                     // Tool call was in content, but no execution record (should ideally not happen if save logic is correct)
                     uiParts.push({ type: 'tool_result', tool_use_id: rawPart.id, content: "[Tool execution record missing]", isLoading: true, isError: false });
                  }
                }
              }
              successfullyParsedStructuredContent = true;
            }
          } catch (e) {
            // dbMsg.content was not valid JSON or not an array, fallback to old logic
            console.warn(`[CoderPane] Failed to parse structured content for assistant message ${dbMsg.id}, falling back. Error:`, e);
          }
        }

        if (!successfullyParsedStructuredContent) {
          // Fallback for old data or if content isn't structured JSON
          console.log(`[CoderPane] Rehydrating assistant message ${dbMsg.id} with fallback logic (plain text content + tool_calls_json)`);
          if (dbMsg.content) { // This is the concatenated fullAssistantContent
            uiParts.push({ type: 'text', text: dbMsg.content });
          }

          if (dbMsg.tool_calls_json) {
            try {
              const toolCallsFromDb = JSON.parse(dbMsg.tool_calls_json);
              const toolExecutionMap = new Map(
                (toolExecutionsByMessage.get(dbMsg.id) || []).map(exec => [exec.id, exec])
              );

              toolCallsFromDb.forEach((tc: any) => {
                uiParts.push({
                  type: 'tool_call',
                  id: tc.id,
                  name: tc.function.name,
                  input: JSON.parse(tc.function.arguments) // Arguments are stringified JSON in tool_calls_json
                });

                const execution = toolExecutionMap.get(tc.id);
                // ... (add tool_result part based on execution, same logic as above) ...
                if (execution) {
                  if (execution.result_json) {
                    // ... (same as above)
                    let parsedResultJson;
                    try {
                      parsedResultJson = JSON.parse(execution.result_json);
                    } catch (e) {
                      parsedResultJson = { content: `[Error parsing result: ${execution.result_json}]`, isError: true };
                    }
                    uiParts.push({ type: 'tool_result', tool_use_id: execution.id, content: parsedResultJson, isError: execution.status === 'executed_error' || parsedResultJson.isError, isLoading: false });
                  } else {
                    uiParts.push({ type: 'tool_result', tool_use_id: execution.id, content: execution.status === 'pending' ? "Tool execution is pending..." : "[Result not available]", isLoading: execution.status === 'pending', isError: execution.status === 'executed_error' });
                  }
                } else {
                  uiParts.push({ type: 'tool_result', tool_use_id: tc.id, content: "[Tool execution record missing]", isLoading: true, isError: false });
                }
              });
            } catch (e) {
              console.error(`[CoderPane] Error parsing tool_calls_json for message ${dbMsg.id}:`, e);
            }
          }
        }
      } else { // For user or system messages
        if (dbMsg.content) { // Ensure content is not null or undefined
          uiParts.push({ type: 'text', text: dbMsg.content });
        }
      }

      // Add the fully constructed message to newMessagesState
      newMessagesState.push({
        id: dbMsg.id,
        role: dbMsg.role as ChatMessage['role'],
        content: dbMsg.content || "", // Retain original dbMsg.content for non-UI purposes if needed (or it can be derived from parts)
        parts: uiParts.length > 0 ? uiParts : undefined,
        timestamp: dbMsg.timestamp * 1000, // Convert seconds to ms
      });
    });
    // ...
    ```

2.  **Adjust `CoderChatMessage` (if necessary):**
    The `CoderChatMessage` component in `CoderPane.tsx` already iterates through `message.parts` to render them.
    Its existing logic for `renderParts`:
    ```javascript
    // ...
    message.parts.forEach(part => {
      if (part.type === 'text') { /* render text */ }
      else if (part.type === 'tool_call') { /* render tool_call and its associated tool_result */ }
      else if (part.type === 'tool_result') { /* this is handled implicitly with tool_call */ return null; }
    });
    ```
    This should correctly render the interleaved parts if the `parts` array is constructed in the correct order by `loadMessagesForSessionInternal`. No changes should be strictly necessary here if the above rehydration logic is correct. The main point is that `loadMessagesForSessionInternal` must now build `uiParts` in the exact sequence they appeared in the original structured `dbMsg.content`.

**Testing:**
1.  Send a multi-step prompt to Claude Code that involves at least two tool calls with intervening text from the assistant.
    *   Example: "Read `README.md`. Then tell me its first line. Then read `package.json`. Then tell me its name."
2.  Observe the live display: It should be interleaved correctly.
3.  Refresh the page.
4.  Verify that the rehydrated message in `CoderPane` still shows the text parts and tool_call/tool_result parts interleaved in the original, correct order.
5.  Check the PGlite database: The `messages` table's `content` column for assistant messages should now store a JSON string representing an array of these parts.
6.  Check server logs (`claude-bridge-service.log` and `main.log`) for any errors during saving or rehydration.

This approach ensures that the order of operations as streamed by the Claude CLI is preserved in the database and correctly reconstructed in the UI upon refresh.
