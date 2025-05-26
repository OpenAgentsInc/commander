**Objective:** Implement message streaming from the Claude Code CLI to the `AgentChatPane` UI.

**Background:** The Claude Code CLI supports an `--output-format stream-json` option. When used, it streams each message (init, user, assistant, result with stats) as a separate JSON object. We need to adapt our system to process these JSON objects individually and stream the content of `assistant` messages to the UI.

**Instructions:**

**I. Modify `claude-bridge-service.js` (External Node.js Service):**

1.  **Update CLI Execution Arguments:**
    *   In the `message` event handler for the WebSocket server (`wss.on('message', ...)`) where the `claude` CLI is invoked (currently via `pty.spawn`), ensure that the arguments array `args` for the `claude` command **always** includes `--output-format stream-json` when the interaction is chat-like (e.g., a user prompt).
    *   The `args` array might look like: `["-p", conversationContext, "--output-format", "stream-json", "--verbose"]`. If `systemPrompt` is used, include it as well.

2.  **Process Streamed JSON Output:**
    *   Modify the `ptyProcess.onData((data) => { ... })` handler.
    *   The `data` received will be a stream of text that needs to be parsed into individual JSON objects. CLI output might send partial JSON objects or multiple JSON objects in a single `data` chunk.
    *   Maintain a buffer (`outputBuffer` is already used). Append incoming `data` to this buffer.
    *   Attempt to parse complete JSON objects from the buffer. A common way is to split the buffer by newlines (`\n`), as `stream-json` typically outputs one JSON object per line.
        ```javascript
        // Inside ptyProcess.onData
        outputBuffer += data;
        let newlineIndex;
        while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
          const jsonLine = outputBuffer.substring(0, newlineIndex).trim();
          outputBuffer = outputBuffer.substring(newlineIndex + 1);

          if (jsonLine) {
            try {
              const claudeMessage = JSON.parse(jsonLine);
              // Send this parsed claudeMessage object over WebSocket
              log(`Parsed Claude Message: type=${claudeMessage.type}`);
              ws.send(JSON.stringify({
                id: requestId, // The original request ID from Electron main
                type: 'claude_stream_chunk', // New WebSocket message type
                payload: claudeMessage // Send the full parsed JSON object
              }));
            } catch (e) {
              log(`JSON Parse Error in bridge service: ${e.message} for line: ${jsonLine}`);
              // Optionally send a parse error message back, or log and continue
            }
          }
        }
        ```

3.  **Handle End of Stream:**
    *   The `ptyProcess.onExit(...)` handler can remain largely the same. It should send a final `exit` message type over WebSocket to signal the end of the entire CLI interaction.
        ```javascript
        // Inside ptyProcess.onExit
        // ... (existing logic) ...
        ws.send(JSON.stringify({
          id: requestId,
          type: 'claude_stream_done', // New WebSocket message type for stream completion
          exitCode: exitCode
        }));
        ```
    *   Ensure any remaining `outputBuffer` content is processed or logged upon exit.

**II. Modify `main-claude-websocket.ts` (Electron Main Process):**

1.  **Handle New WebSocket Message Types:**
    *   In the `ws.on('message', (data: string) => { ... })` handler for messages *from* the `claude-bridge-service`:
        *   Expect `claude_stream_chunk` messages. The `payload` will be the parsed JSON object from the CLI (e.g., `{ type: "assistant", message: { content: [...] } }`).
        *   Expect `claude_stream_done` messages to signal the end of the stream.

2.  **Forward Assistant Content to Renderer:**
    *   When a `claude_stream_chunk` with `payload.type === "assistant"` is received:
        *   Extract the textual content. Claude's `stream-json` output for assistant messages often has `message.content` as an array of parts (e.g., `[{ type: "text", text: "..." }]`). Iterate through these parts and concatenate the `text` from `text` parts.
        *   Send this extracted text content to the renderer using the existing IPC channel:
            `event.sender.send('claude-code:chat-stream:chunk', requestId, extractedTextChunk);`
        *   **Important for Persistence:** Accumulate `extractedTextChunk` for the current assistant turn. When a `claude_stream_chunk` with `payload.type === "result"` (or based on CLI's end-of-message signal if different) is received for the current assistant turn, or when `claude_stream_done` indicates the whole interaction is finished, then save the *complete accumulated assistant message* to the database using `saveMessageToDatabase`.
            *   You'll need to manage `assistantMessageId` and `fullAssistantContent` similar to how it's done for the current non-streaming implementation. Reset them when a new assistant message starts.
            *   The `result` message from Claude CLI often contains token usage stats, which could also be persisted if desired.
            *   If the `stream-json` format delivers *complete* assistant messages in each JSON object (as per the Anthropic doc: "Each message is emitted as a separate JSON object"), then you can save each complete assistant message object to the database as it arrives. Modify `saveMessageToDatabase` or its calling logic to handle these full `assistant` message objects.

3.  **Handle Stream End Signal from Bridge:**
    *   When a `claude_stream_done` message is received from the bridge, send the `claude-code:chat-stream:done` IPC message to the renderer.
    *   Ensure any final accumulated assistant message is saved.

4.  **Error Handling:**
    *   If errors occur while parsing JSON from the bridge or processing chunks, send an error to the renderer via `claude-code:chat-stream:error`.

**III. Modify `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload Script):**

1.  **`streamChat`'s `onChunk` Callback:**
    *   The `onChunk` callback (`(chunk: string) => void`) within `window.electronAPI.claudeCode.streamChat` currently expects raw string data.
    *   It will now receive the `extractedTextChunk` (which is also a string) sent by `main-claude-websocket.ts`. No change should be strictly necessary here if `main-claude-websocket.ts` already sends string pieces.
    *   The key is that `onChunk` will be called more frequently with smaller pieces of the assistant's response.

**IV. Modify `src/hooks/ai/useAgentChat.ts` (Renderer Process):**

1.  **Process Streamed Chunks:**
    *   The `streamConversation` method in `ChatOrchestratorService`, when using the `ClaudeCodeCliAgentLanguageModelLive` provider, will call `window.electronAPI.claudeCode.streamChat`.
    *   The `onChunk` callback provided to `streamChat` (which is inside `ClaudeCodeCliAgentLanguageModelLive.ts` and then bubbles up to `useAgentChat.ts`) will receive text chunks.
    *   The `useAgentChat.ts` hook's logic for handling streamed chunks from `ChatOrchestratorService` should already append these incoming text chunks to the `content` of the `UIAgentChatMessage` where `isStreaming: true`.
    *   Ensure that `setMessages` is correctly updating the `content` of the streaming assistant message incrementally. The `_updateId` mechanism or creating new message objects should ensure React re-renders.

    ```typescript
    // Inside useAgentChat.ts, within the stream processing part of sendMessage
    // ...
    Stream.runForEach(textStream, (chunkResponse: AiResponse) => // chunkResponse.text is the streamed text
      Effect.sync(() => {
        if (signal.aborted) { /* ... */ return; }
        setMessages((prevMsgs) =>
          prevMsgs.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: (msg.content || "") + chunkResponse.text, // Append new chunk
                  _updateId: Date.now(),
                  // ... (providerInfo potentially updated if chunkResponse has metadata)
                }
              : msg,
          ),
        );
      }),
    // ...
    ```

**Summary of Streaming Flow:**

1.  **UI (`AgentChatPane`)**: User sends message.
2.  **Hook (`useAgentChat`)**: Calls `ChatOrchestratorService.streamConversation`.
3.  **Orchestrator**: Selects `ClaudeCodeCliAgentLanguageModelLive`.
4.  **Provider (`ClaudeCodeCliAgentLanguageModelLive`)**: Calls `window.electronAPI.claudeCode.streamChat`.
5.  **Preload (`claude-code-context.ts`)**: Sends IPC message `claude-code:chat-stream` to main.
6.  **Main Process (`main-claude-websocket.ts`)**:
    *   Receives IPC, establishes WebSocket to `claude-bridge-service.js`.
    *   Sends command to bridge.
7.  **Bridge Service (`claude-bridge-service.js`)**:
    *   Spawns `claude ... --output-format stream-json`.
    *   Receives stdout, parses JSON objects.
    *   Sends each JSON object as `claude_stream_chunk` via WebSocket back to Electron Main.
    *   Sends `claude_stream_done` when CLI exits.
8.  **Main Process (`main-claude-websocket.ts`)**:
    *   Receives `claude_stream_chunk` from bridge.
    *   If `payload.type === "assistant"`, extracts text.
    *   Sends extracted text via IPC `claude-code:chat-stream:chunk` to Preload.
    *   Persists complete assistant messages.
    *   Receives `claude_stream_done` from bridge, sends `claude-code:chat-stream:done` to Preload.
9.  **Preload (`claude-code-context.ts`)**: `onChunk` callback invoked with text piece.
10. **Provider (`ClaudeCodeCliAgentLanguageModelLive`)**: `onChunk` (from Preload) maps text piece to `AiResponse`, emits on Effect `Stream`.
11. **Hook (`useAgentChat`)**: Consumes `AiResponse` from `Stream`, updates `messages` state, UI re-renders incrementally.

This change will require careful handling of the data formats at each step, especially parsing the `stream-json` from the CLI and then correctly forwarding the relevant parts for UI display and persistence.Okay, I'll provide the paragraph for `docs/systems/message-persistence-architecture.md` and the specific coding instructions to add streaming for the Claude Code CLI.

---

**1. Paragraph for `docs/systems/message-persistence-architecture.md`**

Please add the following paragraph to the "Message Persistence Architecture in Commander" document. A good place might be as a new sub-section (e.g., "3.1 Message Streaming Considerations") or integrated into the "Data Flow" or "Component Breakdown" sections.

> **Message Streaming from Claude Code CLI**
>
> Currently, the system processes responses from the Claude Code CLI in a non-streaming manner. The `claude-bridge-service.js` executes the `claude` command and waits for the entire output to complete before sending it back to the Electron main process. This means that messages, including assistant responses and tool calls, are displayed in the `AgentChatPane` only after the full interaction turn is finished. Persistence of these messages to the PGlite database via `main-claude-websocket.ts` also occurs after the complete message content is received.
>
> The Claude Code CLI itself supports a `--output-format stream-json` flag, which enables it to emit each part of the conversation (such as `init`, `user`, `assistant` messages, or `tool_use` and `result` blocks) as individual JSON objects. To enable real-time streaming in the UI, the system architecture would need to be adapted. This would involve modifying `claude-bridge-service.js` to parse these streamed JSON objects and send them incrementally over the WebSocket connection. Subsequently, `main-claude-websocket.ts` would need to handle these individual JSON chunks, forward the content of `assistant` messages (and potentially visualizations for tool calls) to the renderer process for immediate display, and implement a strategy for persisting these complete messages as they are fully received from the stream.

---

**2. Specific Instructions for Coding Agent to Add Streaming**

Here are the instructions for your coding agent to implement streaming for the Claude Code CLI:

**Objective:** Modify the system to stream messages from the Claude Code CLI to the UI, using the `--output-format stream-json` option.

**Core Changes Required:**

1.  **`claude-bridge-service.js`**:
    *   Update to use `claude ... --output-format stream-json`.
    *   Process `ptyProcess.onData` to parse individual JSON objects from the CLI's stdout.
    *   Send each parsed JSON object as a new WebSocket message type (e.g., `claude_stream_chunk`) to `main-claude-websocket.ts`.
    *   Signal the end of the stream via WebSocket (e.g., `claude_stream_done`).

2.  **`main-claude-websocket.ts`**:
    *   Handle `claude_stream_chunk` messages from the bridge service.
    *   Extract relevant content (especially from `assistant` type messages).
    *   Send these content pieces to the renderer via the existing `claude-code:chat-stream:chunk` IPC channel.
    *   Implement logic to save complete assistant messages (and tool executions) to the database as they are fully received from the stream.
    *   Handle `claude_stream_done` messages from the bridge to signal stream completion to the renderer.

3.  **Renderer-Side Components (`claude-code-context.ts`, `ClaudeCodeCliAgentLanguageModelLive.ts`, `useAgentChat.ts`)**:
    *   The preload script (`claude-code-context.ts`) will continue to receive chunks via IPC.
    *   The `ClaudeCodeCliAgentLanguageModelLive` will map these chunks (which are parts of an assistant's response) into `AiResponse` objects for the `Stream`.
    *   The `useAgentChat` hook will consume this stream of `AiResponse` objects and update the UI incrementally.

**Detailed Instructions:**

**I. Modify `src/services/claude-bridge-service.js`**

1.  **Update Claude CLI Arguments:**
    *   Locate the `pty.spawn(claudePath, args, ...)` call within the WebSocket message handler.
    *   Ensure the `args` array **always** includes `--output-format` and `stream-json` when a chat-like interaction is intended.
        *   Example: `const args = ["-p", conversationContext, "--output-format", "stream-json", "--verbose"];`
        *   If `systemMessage` is present, ensure it's also included.

2.  **Process Streamed JSON from PTY:**
    *   In the `ptyProcess.onData((data) => { ... })` handler:
        *   You are already appending `data` to `outputBuffer`.
        *   Implement logic to parse complete JSON objects from `outputBuffer`. Since `stream-json` usually outputs one JSON object per line, split `outputBuffer` by `\n`.
        *   Iterate through the lines. For each non-empty line:
            *   Try to `JSON.parse(line)`.
            *   If successful, `log` the parsed `claudeMessage` (e.g., `log(`Parsed Claude Message: type=${claudeMessage.type}`);`).
            *   Send this `claudeMessage` object over the WebSocket to the main process using a new message `type`:
                ```javascript
                ws.send(JSON.stringify({
                  id: requestId, // Original request ID from main process
                  type: 'claude_stream_chunk', // New WebSocket message type
                  payload: claudeMessage // The full parsed JSON object
                }));
                ```
            *   If `JSON.parse(line)` fails, log the error and the problematic line. You might decide to send an error chunk or simply ignore malformed lines.
        *   Retain any incomplete line fragment in `outputBuffer` for the next `onData` event.

3.  **Handle Stream Termination:**
    *   In the `ptyProcess.onExit(({ exitCode, signal }) => { ... })` handler:
        *   Before sending the final `exit` message, ensure any remaining content in `outputBuffer` is processed (attempt to parse JSON one last time).
        *   Change the WebSocket message `type` for stream completion to distinguish it from non-streaming exits:
            ```javascript
            ws.send(JSON.stringify({
              id: requestId,
              type: 'claude_stream_done', // New type for stream completion
              exitCode: exitCode
            }));
            ```
        *   The existing logic for handling non-zero `exitCode` (sending an error message) can remain, but use `claude_stream_error` or a similar distinct type.

**II. Modify `src/main-claude-websocket.ts` (Electron Main Process)**

1.  **Handle New WebSocket Message Types from Bridge:**
    *   In the `ws.on('message', (data: string) => { ... })` handler:
        *   Add cases for `message.type === 'claude_stream_chunk'` and `message.type === 'claude_stream_done'`.

2.  **Process `claude_stream_chunk`:**
    *   When a `claude_stream_chunk` is received, its `message.payload` will be the JSON object from the Claude CLI.
    *   **Extract Content for UI:**
        *   Check `message.payload.type`. If it's `"assistant"` and `message.payload.message` exists:
            *   The `message.payload.message.content` is often an array of content blocks (e.g., `[{type: "text", text: "..."}]`).
            *   Iterate through this array. For parts where `type === "text"`, extract the `text` value.
            *   Concatenate these text parts to form `extractedTextChunk`.
            *   Send this `extractedTextChunk` to the renderer:
                `event.sender.send('claude-code:chat-stream:chunk', requestId, extractedTextChunk);`
        *   If `message.payload.type === "tool_use"` (or similar, based on actual CLI JSON output for tools):
            *   Extract tool call information (name, id, input).
            *   Send a structured representation or a descriptive string to the renderer via `claude-code:chat-stream:chunk` (e.g., `"[Using tool: ${toolName} with input: ${JSON.stringify(toolInput).substring(0,50)}...]"`) so the UI can display it.
            *   Store the `tool_call_id` and other relevant details if you need to send tool results back later.
    *   **Persistence Logic:**
        *   Maintain `fullAssistantContent` and `toolCalls` accumulation similar to the current non-streaming logic.
        *   If `message.payload.type === "assistant"`, append extracted text to `fullAssistantContent`.
        *   If `message.payload.type === "tool_use"`, add the tool call details to your `toolCalls` array.
        *   When a message indicating the end of an assistant's turn or a complete tool result arrives (this might be indicated by the `result` type message from the CLI, or simply the next `user` message, or when `claude_stream_done` is received), save the accumulated `fullAssistantContent` and any `toolCalls` to the database using `saveMessageToDatabase` and `saveToolCallToDatabase`. You'll need to associate them with the current `assistantMessageId`.
        *   Ensure `assistantMessageId` is generated/reset appropriately for each new assistant message turn.

3.  **Process `claude_stream_done`:**
    *   When `message.type === 'claude_stream_done'` is received:
        *   Ensure any final accumulated assistant content or tool calls are persisted.
        *   Send the `claude-code:chat-stream:done` IPC message to the renderer:
            `event.sender.send('claude-code:chat-stream:done', requestId);`
    *   If `message.exitCode !== 0`, also send an error:
        `event.sender.send('claude-code:chat-stream:error', requestId, { __error: true, message: \`Claude CLI stream ended with code ${message.exitCode}\` });`

4.  **Update Error Handling for Streaming:**
    *   If errors occur during WebSocket message processing or from the bridge service (e.g., `message.type === 'error'` or `claude_stream_error`), propagate them to the renderer using `claude-code:chat-stream:error`.

**III. Modify `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload Script)**

1.  **`streamChat`'s `onChunk` Callback:**
    *   The `onChunk: (chunk: string) => void` callback is designed to receive string data.
    *   The `main-claude-websocket.ts` part already sends extracted text strings. This should remain compatible. The key change is that `onChunk` will now be called multiple times for a single assistant response, each time with a new piece of text.

**IV. `src/services/ai/providers/claude_code/ClaudeCodeCliAgentLanguageModelLive.ts` (Renderer)**

1.  **`streamText` Method:**
    *   This method uses `window.electronAPI.claudeCode.streamChat`.
    *   The `onChunk` callback passed to `streamChat` receives the text pieces.
    *   Each text piece should be wrapped in an `AiResponse` object (e.g., `AiResponse.fromSimple({ text: sdkChunkText })`) and emitted on the `Stream.Stream<AiResponse, AiProviderError>`.
    *   The existing `mapSdkChunkToAiResponse` or similar logic should correctly handle creating an `AiResponse` from just the text part.

    ```typescript
    // Conceptual change in ClaudeCodeCliAgentLanguageModelLive.ts -> streamText -> onChunk from IPC
    (sdkChunkText: string) => { // sdkChunkText is the string piece from IPC
        const mappedChunk = AiResponse.fromSimple({
            text: sdkChunkText,
            // No toolCalls or metadata expected per individual text chunk from this stream
        });
        emit.single(mappedChunk);
    }
    ```

**V. `src/hooks/ai/useAgentChat.ts` (Renderer Hook)**

1.  **Message Accumulation Logic:**
    *   The existing logic that consumes the `Stream<AiResponse, ...>` from `ChatOrchestratorService` and updates the `messages` state by appending `chunkResponse.text` to the `content` of the streaming assistant message should work correctly.
    *   The primary change is that `setMessages` will be called more frequently for a single assistant turn, updating the UI incrementally.

    ```typescript
    // Inside useAgentChat.ts, within the stream processing part of sendMessage
    // ...
    Stream.runForEach(textStream, (chunkResponse: AiResponse) => // chunkResponse is now from the stream
      Effect.sync(() => {
        if (signal.aborted) { /* ... */ return; }
        setMessages((prevMsgs) =>
          prevMsgs.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: (msg.content || "") + chunkResponse.text, // Append new text
                  _updateId: Date.now(), // Force re-render
                  // providerInfo: ... // Potentially update if chunkResponse carries provider info
                }
              : msg,
          ),
        );
      }),
    // ...
    ```

2.  **Handling Tool Call Visualizations (Advanced/Future):**
    *   If `main-claude-websocket.ts` sends special chunks for tool calls (e.g., `"[Using tool...]"`, `"[Tool result...]"`) via the same `claude-code:chat-stream:chunk` IPC, `useAgentChat` will display them as part of the assistant's text.
    *   For a richer UI, `main-claude-websocket.ts` could send structured tool call information via a *new* IPC channel (e.g., `claude-code:chat-stream:tool_call`), and `useAgentChat` would need to listen to this and update its `messages` state with a specific message type for tool calls. *This is a more advanced step beyond simple text streaming.* For now, focus on streaming the textual output.

**Final Checks:**

*   Ensure robust error handling at each stage of the new streaming pipeline (bridge, main, preload, renderer).
*   Verify that the `requestId` is correctly propagated and used to associate streamed chunks with the correct originating UI request.
*   Test cancellation of streams thoroughly.
*   Confirm that message persistence logic in `main-claude-websocket.ts` correctly saves the complete assistant messages and any associated tool calls after they have been fully streamed or when the interaction ends.

This approach aims to reuse as much of the existing IPC and stream handling infrastructure as possible while adapting the data processing in `claude-bridge-service.js` and `main-claude-websocket.ts` for the `stream-json` format.Okay, I'll provide the paragraph for `docs/systems/message-persistence-architecture.md` and the specific coding instructions for your agent to implement streaming.

---

**1. Paragraph for `docs/systems/message-persistence-architecture.md`**

Please add the following paragraph, perhaps under a new sub-section like "3.1 Message Streaming Considerations" or within the "Data Flow" section if more appropriate:

> **Message Streaming from Claude Code CLI**
>
> Currently, the system does not implement real-time streaming of message content from the Claude Code CLI to the user interface. While the Claude Code CLI itself supports a `stream-json` output format, which emits each message (init, user, assistant, result) as a distinct JSON object, our `claude-bridge-service.js` and the subsequent data pipeline via WebSockets and IPC are configured to collect the full output from the CLI before processing and displaying it. This means assistant responses appear in the UI only after the Claude Code CLI process has completed its turn. For persistence, complete assistant messages are saved to the PGlite database after the full response is received by `main-claude-websocket.ts`. Future enhancements could adapt the `claude-bridge-service.js` to parse the `stream-json` output, sending individual message objects (particularly the content of `assistant` messages) incrementally over WebSockets. This would then allow `main-claude-websocket.ts` to forward these partial updates to the renderer for a live streaming display in `AgentChatPane`, while still persisting the complete message once fully received.

---

**2. Specific Instructions for Coding Agent to Add Streaming**

Here are the instructions for your coding agent:

**Objective:** Implement message streaming from the Claude Code CLI to the `AgentChatPane` UI.

**Background:** The Claude Code CLI supports an `--output-format stream-json` option. When used, it streams each message (init, user, assistant, result with stats) as a separate JSON object. We need to adapt our system to process these JSON objects individually and stream the content of `assistant` messages to the UI.

**Instructions:**

**I. Modify `src/services/claude-bridge-service.js` (External Node.js Service):**

1.  **Update CLI Execution Arguments:**
    *   Locate the `pty.spawn(claudePath, args, ...)` call (or `child_process.spawn` if `pty` is not used for streaming) within the WebSocket message handler where `claude` commands are executed.
    *   Ensure the `args` array for the `claude` command **always** includes `--output-format` and `stream-json` when a chat-like interaction is intended (i.e., when `params.outputFormat` from the client is not already `stream-json`, or by default for chat operations).
        *   Example modification within the WebSocket message handler:
            ```javascript
            // Inside wss.on('message', (message) => { ... request = JSON.parse(message); const { id, args: originalArgs } = request; ... })
            const claudeArgs = [...originalArgs]; // originalArgs usually contains ["-p", conversationContext, "--verbose"]
            // Find and remove existing output-format if any, then add stream-json
            const outputFormatIndex = claudeArgs.findIndex(arg => arg === '--output-format');
            if (outputFormatIndex !== -1) {
              claudeArgs.splice(outputFormatIndex, 2); // Remove --output-format and its value
            }
            claudeArgs.push('--output-format', 'stream-json');

            log(`Executing Claude CLI with streaming args: ${claudeArgs.join(' ')}`);
            const ptyProcess = pty.spawn(claudePath, claudeArgs, { /* ... existing options ... */ });
            ```

2.  **Process Streamed JSON Output from PTY:**
    *   Modify the `ptyProcess.onData((data) => { ... })` handler.
    *   The `data` received will be a stream of text that needs to be parsed into individual JSON objects. `stream-json` typically outputs one JSON object per line.
    *   Append incoming `data` to `outputBuffer`.
    *   Implement logic to parse complete JSON objects from the buffer by splitting by newlines (`\n`).
        ```javascript
        // Inside ptyProcess.onData handler
        outputBuffer += data;
        let newlineIndex;
        while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
          const jsonLine = outputBuffer.substring(0, newlineIndex).trim();
          outputBuffer = outputBuffer.substring(newlineIndex + 1);

          if (jsonLine) {
            try {
              const claudeMessage = JSON.parse(jsonLine);
              log(`Parsed Claude Message: type=${claudeMessage.type}`);
              // Send this parsed claudeMessage object over WebSocket
              ws.send(JSON.stringify({
                id: requestId, // The original request ID from Electron main
                type: 'claude_stream_chunk', // New WebSocket message type
                payload: claudeMessage // Send the full parsed JSON object
              }));
            } catch (e) {
              log(`JSON Parse Error in bridge service: ${e.message} for line: <<<${jsonLine}>>>`);
              // Optionally send a parse error message back, or log and continue
            }
          }
        }
        ```

3.  **Handle End of Stream from PTY:**
    *   In the `ptyProcess.onExit(({ exitCode, signal }) => { ... })` handler:
        *   Process any remaining `outputBuffer` content (attempt to parse JSON one last time).
        *   Change the WebSocket message `type` for stream completion to `claude_stream_done`:
            ```javascript
            ws.send(JSON.stringify({
              id: requestId,
              type: 'claude_stream_done',
              exitCode: exitCode // Keep exitCode for diagnostics
            }));
            ```
        *   If `exitCode !== 0`, also consider sending a `claude_stream_error` type message or include error details in `claude_stream_done`.

**II. Modify `src/main-claude-websocket.ts` (Electron Main Process):**

1.  **Handle New WebSocket Message Types:**
    *   In the `ws.on('message', (data: string) => { ... })` handler (for messages from the bridge):
        *   Add a `case 'claude_stream_chunk':` to handle incoming JSON objects.
        *   Add a `case 'claude_stream_done':` to handle the end of the stream.

2.  **Process `claude_stream_chunk`:**
    *   The `message.payload` will be the parsed JSON object from the Claude CLI.
    *   **Extract Content for UI Streaming:**
        *   If `message.payload.type === "assistant"` and `message.payload.message` exists:
            *   The `message.payload.message.content` is an array (e.g., `[{type: "text", text: "..."}]`).
            *   Iterate this `content` array. For each part where `type === "text"`, extract the `text` value.
            *   Concatenate these text parts to form an `extractedTextChunkForUI`.
            *   Send this `extractedTextChunkForUI` to the renderer:
                `event.sender.send('claude-code:chat-stream:chunk', requestId, extractedTextChunkForUI);`
        *   If `message.payload.type === "tool_use"`:
            *   Extract tool call details (`id`, `name`, `input`).
            *   Send a descriptive string or structured object to the renderer for UI display, e.g.:
                `event.sender.send('claude-code:chat-stream:chunk', requestId, \`[Tool Call: ${message.payload.name} with ID ${message.payload.id}]\`);`
                (More advanced: send a structured object that `useAgentChat` can interpret to render a special tool_call message).
    *   **Persistence Logic for Full Messages:**
        *   When a `claude_stream_chunk` with `message.payload.type === "assistant"` is received, this JSON object represents a complete assistant message.
        *   Adapt the existing logic for `assistantMessageId` and call `saveMessageToDatabase` with the data from `message.payload`. You'll need to format it into `DBMessage`.
            ```javascript
            // Example for saving a complete assistant message from the stream
            if (message.payload.type === "assistant" && message.payload.message) {
              const assistantDbMessage = {
                id: message.payload.id || generateId(), // Claude CLI usually provides message ID
                session_id: sessionId, // ensure sessionId is available in this scope
                role: "assistant",
                content: message.payload.message.content.filter(p => p.type === 'text').map(p => p.text).join(''),
                tool_calls_json: message.payload.message.content.some(p => p.type === 'tool_use')
                  ? JSON.stringify(message.payload.message.content.filter(p => p.type === 'tool_use'))
                  : undefined,
                timestamp: Math.floor(Date.now() / 1000), // Or use timestamp from Claude if available
                provider_message_id: message.payload.id,
              };
              await saveMessageToDatabase(assistantDbMessage);

              // If there were tool_calls, save them too
              const toolUses = message.payload.message.content.filter(p => p.type === 'tool_use');
              for (const tu of toolUses) {
                 const toolExecution = {
                    id: tu.id, // Tool call ID
                    message_id: assistantDbMessage.id, // FK to the assistant message
                    tool_name: tu.name,
                    arguments_json: JSON.stringify(tu.input),
                    status: "pending", // Or "executed_success" if result is also in this chunk
                    created_at: Math.floor(Date.now() / 1000),
                    updated_at: Math.floor(Date.now() / 1000),
                 };
                 await saveToolCallToDatabase(toolExecution);
              }
            }
            ```
        *   If `message.payload.type === "user"` and it's the *first* user message of a new session, save it. Subsequent user messages are saved by the renderer/orchestrator logic typically.
        *   The `init` and `result` messages from the Claude CLI stream can be logged via telemetry but usually don't need to be persisted as chat messages unless they contain critical session metadata.

3.  **Process `claude_stream_done`:**
    *   When `message.type === 'claude_stream_done'` is received from the bridge:
        *   Send the `claude-code:chat-stream:done` IPC message to the renderer.
        *   `event.sender.send('claude-code:chat-stream:done', requestId);`
        *   Ensure `updateSessionInDatabase(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) });` is called.
    *   If `message.exitCode !== 0`, handle it as an error for the stream:
        `event.sender.send('claude-code:chat-stream:error', requestId, { __error: true, message: \`Claude CLI stream ended with code ${message.exitCode}\` });`

**III. Modify `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload Script)**

1.  **`streamChat`'s `onChunk` Callback:**
    *   The `onChunk: (chunk: string) => void` callback will now receive the `extractedTextChunkForUI` (a string representing a piece of the assistant's response or a tool call indicator) from `main-claude-websocket.ts`.
    *   This part should remain largely compatible as it's already designed to handle string chunks. The difference is that these chunks will now correspond to parts of a streaming response.

**IV. `src/services/ai/providers/claude_code/ClaudeCodeCliAgentLanguageModelLive.ts` (Renderer)**

1.  **`streamText` Method:**
    *   This method uses `window.electronAPI.claudeCode.streamChat`.
    *   The `onChunk` callback (inside `Stream.asyncInterrupt` or `Stream.asyncScoped`) receives text pieces.
    *   Each text piece should be wrapped into an `AiResponse` object.
        ```typescript
        // Inside streamText in ClaudeCodeCliAgentLanguageModelLive.ts
        // ...
        (sdkChunkText: string) => { // sdkChunkText is the string piece from IPC
            // This maps the raw text chunk into our application's AiResponse structure
            const mappedChunk = AiResponse.fromSimple({
                text: sdkChunkText
                // If main process sends structured tool_call info, parse and map it here
            });
            emit.single(mappedChunk); // Emit AiResponse for useAgentChat to consume
        },
        // ...
        ```

**V. `src/hooks/ai/useAgentChat.ts` (Renderer Hook)**

1.  **Message Accumulation for UI:**
    *   The `sendMessage` function calls `chatOrchestrator.streamConversation`.
    *   The `Stream.runForEach` loop consuming the stream of `AiResponse` objects will now receive these `AiResponse` objects more frequently, each containing a part of the assistant's message.
    *   The existing logic for updating `messages` state:
        ```typescript
        setMessages((prevMsgs) =>
          prevMsgs.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: (msg.content || "") + chunkResponse.text, // Append new text
                  // ... (other properties like _updateId, providerInfo)
                }
              : msg,
          ),
        );
        ```
        This logic should correctly append the incoming `chunkResponse.text` to the currently streaming assistant message in the UI.

**VI. `src/components/chat/ChatMessage.tsx`**

1.  **Streaming Indicator:**
    *   The `isStreaming` prop and the blinking cursor `▋` should continue to work as expected, providing visual feedback that the message is still arriving.

**Summary of Changes:**

*   The bridge service becomes a parser for the CLI's `stream-json` output, forwarding full JSON messages.
*   The main process handles these JSON messages, extracts text for UI streaming, and persists complete assistant/tool messages.
*   The renderer's `AgentLanguageModel` implementation and `useAgentChat` hook consume the streamed text pieces to update the UI incrementally.
*   Persistence logic in `main-claude-websocket.ts` needs to be adapted to save messages received via `claude_stream_chunk` (specifically `assistant` type) rather than waiting for the full output.

This will enable a much more responsive chat experience when using the Claude Code CLI.
