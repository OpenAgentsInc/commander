Okay, Agent, let's address these issues.

The primary problems are:
1.  **Telemetry Rendering:** Tool calls and results from Claude Code are appearing as raw JSON in the UI, not as structured components.
2.  **Database Errors:** We're consistently seeing "duplicate key value violates unique constraint 'messages_pkey'" when saving assistant messages.

Here are the instructions to fix these:

**I. Fix Telemetry Rendering (Displaying Tool Calls/Results as Components)**

**Goal:** Parse tool-related JSON from Claude's output and render it using dedicated React components within the `CoderPane`.

**1. Create New Display Components for Tool Calls and Results:**

    *   **File:** `src/components/coder/ToolCallDisplay.tsx`
        ```typescript
        import React from 'react';
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { ScrollArea } from '@/components/ui/scroll-area'; // If args can be long

        interface ToolCallDisplayProps {
          toolName: string;
          toolCallId?: string;
          args: Record<string, any>;
        }

        const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolName, toolCallId, args }) => {
          return (
            <Card className="my-2 border-blue-500/50 bg-blue-900/20">
              <CardHeader className="p-2">
                <CardTitle className="text-xs font-semibold text-blue-300">
                  Tool Call: {toolName} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="max-h-40">
                  <pre className="text-xs text-blue-200 whitespace-pre-wrap">
                    Args: {JSON.stringify(args, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        };

        export default ToolCallDisplay;
        ```

    *   **File:** `src/components/coder/ToolResultDisplay.tsx`
        ```typescript
        import React from 'react';
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { ScrollArea } from '@/components/ui/scroll-area';

        interface ToolResultDisplayProps {
          toolName?: string; // Name of the tool that was called
          toolCallId?: string; // ID of the tool call this is a result for
          result: any; // Can be string, object, etc.
        }

        const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolName, toolCallId, result }) => {
          const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          return (
            <Card className="my-2 border-green-500/50 bg-green-900/20">
              <CardHeader className="p-2">
                <CardTitle className="text-xs font-semibold text-green-300">
                  Tool Result {toolName && `for ${toolName}`} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                 <ScrollArea className="max-h-60">
                  <pre className="text-xs text-green-200 whitespace-pre-wrap">
                    {resultString}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        };

        export default ToolResultDisplay;
        ```

    *   **Update `src/components/coder/index.ts`:**
        ```typescript
        // src/components/coder/index.ts
        export { default as CoderPane } from "./CoderPane";
        export { default as ToolCallDisplay } from "./ToolCallDisplay"; // Add this
        export { default as ToolResultDisplay } from "./ToolResultDisplay"; // Add this
        ```

**2. Modify `CoderChatMessage` and `CoderPane` to Render Structured Parts:**

    *   **File:** `src/components/coder/CoderPane.tsx`
        *   **Update `ChatMessage` interface:**
            ```typescript
            interface ChatMessage {
              id: string;
              role: 'user' | 'assistant' | 'system';
              content: string; // Still used for DB and non-parsed text
              parts?: Array<{ type: 'text', text: string } |
                              { type: 'tool_call', name: string, id: string, input: Record<string, any> } |
                              { type: 'tool_result', tool_use_id: string, content: any, isError?: boolean, isLoading?: boolean }>;
              timestamp: number;
              isStreaming?: boolean;
            }
            ```
        *   **Modify `sendMessage` -> `onChunk` callback in `CoderPane.tsx`:**
            The current logic for parsing `[[TOOL_CALL...]]` is incorrect. The `main-claude-websocket.ts` sends stringified JSON objects for tool calls.
            Replace the `onChunk` callback inside `sendMessage` with the following:
            ```typescript
            // ... inside sendMessage in CoderPane.tsx ...
            (chunk: string) => { // chunk is a string, potentially JSON
              let parsedChunkData;
              let isStructured = false;

              try {
                parsedChunkData = JSON.parse(chunk);
                // Check if it matches the structure of tool_call or tool_result sent by main process
                if (parsedChunkData && (parsedChunkData.type === 'tool_call' || parsedChunkData.type === 'tool_result')) {
                  isStructured = true;
                }
              } catch (e) {
                // Not JSON, assume it's a plain text chunk
                parsedChunkData = { type: 'text', text: chunk };
              }

              // Update the message object in the store
              updateMessage(assistantMessageId, (prevMessage) => {
                const newParts = prevMessage.parts ? [...prevMessage.parts] : [];
                let newContent = prevMessage.content || "";

                if (isStructured) {
                  if (parsedChunkData.type === 'tool_call') {
                    newParts.push({
                      type: 'tool_call',
                      id: parsedChunkData.id || `tool_call_${Date.now()}`, // Use provided ID or generate
                      name: parsedChunkData.name,
                      input: parsedChunkData.parameters // Ensure this matches what main-claude-websocket sends
                    });
                    // Append a textual representation to content for DB / non-UI uses
                    newContent += `\n[Tool Call: ${parsedChunkData.name} with args ${JSON.stringify(parsedChunkData.parameters)}]\n`;
                  } else if (parsedChunkData.type === 'tool_result') {
                     newParts.push({
                      type: 'tool_result',
                      tool_use_id: parsedChunkData.tool_use_id, // Ensure main sends this
                      content: parsedChunkData.content, // Ensure main sends this
                      isError: parsedChunkData.is_error,
                    });
                    newContent += `\n[Tool Result for ${parsedChunkData.tool_use_id}: ${JSON.stringify(parsedChunkData.content)}]\n`;
                  }
                } else { // Text chunk
                  newContent += parsedChunkData.text;
                  const lastPart = newParts.length > 0 ? newParts[newParts.length - 1] : null;
                  if (lastPart && lastPart.type === 'text') {
                    lastPart.text += parsedChunkData.text;
                  } else {
                    newParts.push({ type: 'text', text: parsedChunkData.text });
                  }
                }
                // Return updates for the store
                return { content: newContent, parts: newParts, isStreaming: true };
              });
            },
            async () => { // onDone
              updateMessage(assistantMessageId, { isStreaming: false });
              setIsLoading(false);
              streamCancelRef.current = null;
            },
            (error: any) => { // onError
              console.error('Claude Code stream error:', error);
              updateMessage(assistantMessageId, {
                content: `${messages.find(m => m.id === assistantMessageId)?.content || ""}\n\nError: ${error.message || 'Stream failed'}`,
                isStreaming: false
              });
              setIsLoading(false);
              streamCancelRef.current = null;
            }
            // ...
            ```
        *   **Modify `CoderChatMessage` component in `CoderPane.tsx`:**
            Replace the existing `CoderChatMessage` component (the one wrapping `UIChatMessage`) with this, which directly renders parts:
            ```typescript
            import ToolCallDisplay from './ToolCallDisplay'; // Add this import
            import ToolResultDisplay from './ToolResultDisplay'; // Add this import

            const CoderChatMessage: React.FC<{ message: ChatMessage; index: number }> = ({ message }) => {
              const renderContentPart = (part: any, partIndex: number) => {
                switch (part.type) {
                  case 'text':
                    return <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>;
                  case 'tool_call':
                    return (
                      <ToolCallDisplay
                        key={partIndex}
                        toolName={part.name}
                        toolCallId={part.id}
                        args={part.input}
                      />
                    );
                  case 'tool_result':
                     // tool_result might be sent from the user or assistant in advanced scenarios
                    return (
                      <ToolResultDisplay
                        key={partIndex}
                        toolCallId={part.tool_use_id}
                        result={part.content}
                      />
                    );
                  default:
                    return <span key={partIndex} className="whitespace-pre-wrap">{JSON.stringify(part)}</span>;
                }
              };

              const containerClasses = cn(
                "coder-chat-message w-full flex mb-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              );

              const bubbleClasses = cn(
                "max-w-[85%] rounded-md p-2 text-xs",
                message.role === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              );

              return (
                <div className={containerClasses}>
                  <div className={bubbleClasses}>
                    <div className="font-semibold mb-1 capitalize">
                      {message.role === 'assistant' ? 'Claude Code' : message.role}
                    </div>
                    <div>
                      {message.parts && message.parts.length > 0
                        ? message.parts.map(renderContentPart)
                        : <span className="whitespace-pre-wrap">{message.content}</span>}
                      {message.isStreaming && message.role === 'assistant' && (
                        <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            };
            ```
        *   Remove the custom `messageParts` memoization that used `content.split`. The `parts` should now come directly from the accumulated chunks.
        *   Ensure the `CoderChatMessage` component is used in the `messages.map(...)` within `CoderPane.tsx`.

**II. Fix Database Duplicate Key Errors**

**Goal:** Ensure assistant messages are saved to the database exactly once per complete response.

**1. Modify `src/main-claude-websocket.ts`:**

    *   **Scope `messageAlreadySaved` correctly OR (Preferred) Remove save from chunk processing:**
        The simplest and most robust fix is to *only* save the assistant's message when the Claude CLI process (`ptyProcess`) fully exits and all data has been processed. The `fullAssistantContent` and `toolCalls` variables are already correctly scoped to the `requestId`.

        *   **Inside `ipcMain.on("claude-code:chat-stream", ...)`:**
            *   Locate the `ws.on('message', ...)` handler.
            *   **Inside `case 'claude_stream_chunk':`**:
                *   Find the block:
                    ```javascript
                    if (claudeMessage.type === "assistant" && claudeMessage.message) {
                      // ...
                      if (assistantMessage.stop_reason && !messageAlreadySaved) { // <<< THIS BLOCK
                        messageAlreadySaved = true;
                        // (async () => { ... saveMessageToDatabase ... })(); // <<< REMOVE THIS ASYNC IIFE
                      }
                    }
                    ```
                *   **Remove the entire `if (assistantMessage.stop_reason && !messageAlreadySaved)` block that calls `saveMessageToDatabase`.** The accumulation of `fullAssistantContent` and `toolCalls` within this `claude_stream_chunk` case should remain.

    *   **Verify `case 'exit'` logic (in `ws.on('message', ...)` handler):**
        *   This block should be the *sole* place where the assistant's message is saved.
        *   It already checks `if (message.exitCode === 0 && fullAssistantContent)`. This is correct.
        *   The `assistantDbMessage` is correctly constructed using `assistantMessageId`, `fullAssistantContent`, and `toolCalls`.

**By making these changes:**
-   The `claude_stream_chunk` handler will only be responsible for accumulating the content and tool calls into `fullAssistantContent` and `toolCalls`, and sending text/tool chunks to the renderer.
-   The `exit` handler will be the single point of truth for saving the complete assistant message to the database, after the CLI process has finished and all its output has been collected. This naturally prevents duplicate saves for the same message ID.

**After implementing these changes, thoroughly test:**
1.  **Tool Call Rendering:** Ensure tool calls (e.g., `Task`, `Read`, `Write`) from Claude are displayed as structured blocks in the `CoderPane`, not raw JSON.
2.  **Tool Result Rendering:** Ensure tool results (if Claude outputs them or if you mock user sending them back) are also rendered nicely.
3.  **Database Integrity:** Verify that `messages_pkey` duplicate key errors no longer occur in the console logs after several interactions with Claude Code, especially those involving multiple tool uses or long streaming responses. Check the `claude-bridge-service.log` as well.
4.  **Message Persistence:** Confirm that user messages, full assistant responses (including accumulated text and tool call representations in `content`), and tool execution records are correctly saved to the database *once* per interaction.
5.  **Normal Chat:** Basic chat functionality without tool calls should remain unaffected.

This should resolve the telemetry rendering issues and the database errors.Okay, Agent, the telemetry output and database errors indicate a couple of specific problems.

**Problem 1: Telemetry logs show JSON dumps, not rendered components.**
This means that when the Claude Code CLI uses tools, the tool invocations and results are being displayed as raw JSON strings in the `CoderPane` UI instead of being rendered as structured React components.

**Problem 2: "Duplicate key value violates unique constraint 'messages_pkey'" errors.**
This error, visible in `docs/logs/20250527/0300-pattern-coderlog.md`, means we're trying to save an assistant's message to the database multiple times with the same ID. This is happening in `main-claude-websocket.ts` during the streaming and finalization of Claude's response.

Here are the instructions to fix these issues:

**I. Fix Telemetry Rendering (Display Tool Calls/Results as Components)**

**Goal:** Parse tool-related JSON from Claude Code CLI's `stream-json` output and render it using dedicated React components within the `CoderPane`.

**1. Create Display Components for Tool Calls and Results:**

    *   **Create file:** `src/components/coder/ToolCallDisplay.tsx`
        ```typescript
        import React from 'react';
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { ScrollArea } from '@/components/ui/scroll-area';

        interface ToolCallDisplayProps {
          toolName: string;
          toolCallId?: string;
          args: Record<string, any>;
        }

        const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolName, toolCallId, args }) => {
          return (
            <Card className="my-2 border-blue-500/50 bg-black text-blue-300">
              <CardHeader className="p-2">
                <CardTitle className="text-xs font-semibold">
                  Tool Call: {toolName} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="max-h-40">
                  <pre className="text-xs text-blue-200 whitespace-pre-wrap bg-gray-900/50 p-1 rounded">
                    Args: {JSON.stringify(args, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        };

        export default ToolCallDisplay;
        ```

    *   **Create file:** `src/components/coder/ToolResultDisplay.tsx`
        ```typescript
        import React from 'react';
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { ScrollArea } from '@/components/ui/scroll-area';

        interface ToolResultDisplayProps {
          toolName?: string;
          toolCallId?: string;
          result: any;
          isError?: boolean;
        }

        const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolName, toolCallId, result, isError }) => {
          const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          const borderColor = isError ? "border-red-500/50" : "border-green-500/50";
          const bgColor = isError ? "bg-red-900/20" : "bg-green-900/20";
          const textColor = isError ? "text-red-300" : "text-green-300";
          const contentTextColor = isError ? "text-red-200" : "text-green-200";

          return (
            <Card className={`my-2 ${borderColor} ${bgColor} text-white`}>
              <CardHeader className="p-2">
                <CardTitle className={`text-xs font-semibold ${textColor}`}>
                  Tool Result {toolName && `for ${toolName}`} {toolCallId && `(ID: ${toolCallId.substring(0,8)}...)`}
                  {isError && " (Error)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                 <ScrollArea className="max-h-60">
                  <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-1 rounded`}>
                    {resultString}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        };

        export default ToolResultDisplay;
        ```

    *   **Update `src/components/coder/index.ts`:**
        Ensure it exports the new components:
        ```typescript
        // src/components/coder/index.ts
        export { default as CoderPane } from "./CoderPane";
        export { default as ToolCallDisplay } from "./ToolCallDisplay";
        export { default as ToolResultDisplay } from "./ToolResultDisplay";
        ```

**2. Modify `CoderPane.tsx` to Use New Display Components:**

    *   **Update `ChatMessage` interface in `CoderPane.tsx`:**
        Add a `parts` array to store structured message content. `content` will now primarily be for the database and non-UI uses.
        ```typescript
        interface ChatMessage {
          id: string;
          role: 'user' | 'assistant' | 'system';
          content: string; // Holds full textual content for DB
          parts?: Array< // For UI rendering
            | { type: 'text'; text: string }
            | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
            | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
          >;
          timestamp: number;
          isStreaming?: boolean;
        }
        ```

    *   **Modify `sendMessage` -> `onChunk` callback in `CoderPane.tsx`:**
        The current `onChunk` handler tries to parse custom `[[TOOL_CALL...]]` markers. This is incorrect. The `main-claude-websocket.ts` already sends structured JSON for tool calls/results.
        Replace the `onChunk` callback inside the `sendMessage` function with this logic:
        ```typescript
        // ... inside sendMessage function in CoderPane.tsx ...
        (chunk: string) => { // chunk is a string, potentially JSON from main process
          let parsedData;
          let isStructured = false;

          try {
            parsedData = JSON.parse(chunk);
            if (parsedData && (parsedData.type === 'tool_call' || parsedData.type === 'tool_result')) {
              isStructured = true;
            }
          } catch (e) {
            // Not JSON, assume it's a plain text chunk
            parsedData = { type: 'text', text: chunk };
          }

          updateMessage(assistantMessageId, (prevMessage) => {
            const newParts = prevMessage.parts ? [...prevMessage.parts] : [];
            let newContentForDb = prevMessage.content || ""; // For DB, accumulate textual representation

            if (isStructured) {
              if (parsedData.type === 'tool_call') {
                newParts.push({
                  type: 'tool_call',
                  id: parsedData.id || `tool_call_${Date.now()}`,
                  name: parsedData.name,
                  input: parsedData.parameters // Ensure 'parameters' matches what main sends
                });
                newContentForDb += `\n[Tool Call: ${parsedData.name} Args: ${JSON.stringify(parsedData.parameters)}]\n`;
              } else if (parsedData.type === 'tool_result') {
                // This typically comes from a User message, but handling if Assistant streams it
                newParts.push({
                  type: 'tool_result',
                  tool_use_id: parsedData.tool_use_id,
                  content: parsedData.content,
                  isError: parsedData.is_error,
                });
                newContentForDb += `\n[Tool Result for ${parsedData.tool_use_id}: ${JSON.stringify(parsedData.content)}]\n`;
              }
            } else { // Text chunk
              newContentForDb += parsedData.text;
              const lastPart = newParts.length > 0 ? newParts[newParts.length - 1] : null;
              if (lastPart && lastPart.type === 'text') {
                lastPart.text += parsedData.text;
              } else {
                newParts.push({ type: 'text', text: parsedData.text });
              }
            }
            return { ...prevMessage, content: newContentForDb, parts: newParts, isStreaming: true };
          });
        },
        // ... rest of onDone and onError ...
        ```

    *   **Modify `CoderChatMessage` component in `CoderPane.tsx`:**
        This component needs to render the `parts` array. Replace its `render` logic (the part returning JSX) with:
        ```typescript
        // ... inside CoderChatMessage in CoderPane.tsx ...
        // Add these imports at the top of CoderPane.tsx
        // import ToolCallDisplay from './ToolCallDisplay';
        // import ToolResultDisplay from './ToolResultDisplay';
        // import { cn } from "@/utils/tailwind"; // if not already imported

        // ... CoderChatMessage component ...
        const renderContentPart = (part: any, partIndex: number) => {
          switch (part.type) {
            case 'text':
              return <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>;
            case 'tool_call':
              return (
                <ToolCallDisplay
                  key={partIndex}
                  toolName={part.name}
                  toolCallId={part.id}
                  args={part.input}
                />
              );
            case 'tool_result':
              return (
                <ToolResultDisplay
                  key={partIndex}
                  toolCallId={part.tool_use_id}
                  result={part.content}
                  isError={part.isError}
                />
              );
            default:
              // Fallback for unknown parts: render as stringified JSON
              return <pre key={partIndex} className="text-xs whitespace-pre-wrap bg-gray-800 p-1 rounded">{JSON.stringify(part, null, 2)}</pre>;
          }
        };

        const containerClasses = cn(
          "w-full flex mb-2", // Removed coder-chat-message as it's not defined globally
          message.role === 'user' ? 'justify-end' : 'justify-start'
        );

        const bubbleClasses = cn(
          "max-w-[90%] rounded-md p-2 text-xs shadow", // General bubble style
          message.role === 'user'
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-200" // Assistant messages
        );

        return (
          <div className={containerClasses}>
            <div className={bubbleClasses}>
              <div className="font-semibold mb-1 capitalize text-xs">
                {message.role === 'assistant' ? 'Claude Code' : message.role}
              </div>
              <div> {/* Content wrapper */}
                {message.parts && message.parts.length > 0
                  ? message.parts.map(renderContentPart)
                  : <span className="whitespace-pre-wrap">{message.content}</span>}
                {message.isStreaming && message.role === 'assistant' && (
                  <span className="inline-block w-2 h-3 ml-1 bg-white animate-pulse" />
                )}
              </div>
            </div>
          </div>
        );
        // ...
        ```
        *   Remove the `React.useMemo` for `messageParts` that was parsing `[[TOOL_CALL...]]`. The `parts` will now be directly populated by the `onChunk` handler.
        *   Remove the custom CSS for `.coder-chat-message .prose ...` as `UIChatMessage` is no longer used directly for complex rendering here. The new display components handle their own styling.

**III. Fix Database Duplicate Key Errors**

**Goal:** Ensure assistant messages generated by Claude Code CLI are saved to the database exactly once per complete response, by centralizing the save operation in `main-claude-websocket.ts`.

**1. Modify `src/main-claude-websocket.ts`:**

    *   **Centralize Save Logic:** The primary save for an assistant's message should occur only when the Claude CLI subprocess fully exits and all its output has been processed. The `case 'exit':` block in the `ws.on('message', ...)` handler is the correct place for this.
    *   **Remove Save from `claude_stream_chunk`:**
        *   Locate the `ws.on('message', (data: string) => { ... })` handler.
        *   Inside the `switch (message.type)`:
            *   Find `case 'claude_stream_chunk':`.
            *   Inside this case, find the block:
                ```javascript
                if (claudeMessage.type === "assistant" && claudeMessage.message) {
                  // ...
                  if (assistantMessage.stop_reason && !messageAlreadySaved) { // <<< THIS BLOCK
                    messageAlreadySaved = true;
                    // (async () => { ... saveMessageToDatabase ... })(); // <<< THIS ASYNC IIFE
                  }
                }
                ```
            *   **Delete or comment out the entire `if (assistantMessage.stop_reason && !messageAlreadySaved)` block, including the `async` IIFE that calls `saveMessageToDatabase`.**
                The accumulation of `fullAssistantContent` and `toolCalls` should remain.
    *   **Ensure `messageAlreadySaved` is correctly scoped (if still used for other purposes, though it shouldn't be needed for saving anymore):**
        If you were to keep the `messageAlreadySaved` flag for any other logic (not recommended for the save operation), it should be scoped to the `requestId`. Initialize it within the `ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => { ... })` handler, perhaps using a `Map<string, boolean>` or by declaring `let messageAlreadySaved = false;` at the top of this handler, before `ws.on('open', ...)`.
        **However, with the save logic removed from `claude_stream_chunk`, this flag is no longer necessary for preventing duplicate saves.**

**Explanation of DB Fix:**
By removing the save attempt from the `claude_stream_chunk` case (specifically when `stop_reason` is seen), we eliminate one of the two potential save points. The `fullAssistantContent` and `toolCalls` will continue to be accumulated correctly. The single, authoritative save will then happen in the `case 'exit':` block (or `case 'claude_stream_done':` if the bridge service sends that instead of `exit` for successful completion), using the fully accumulated content. This ensures that the assistant's message (ID: `assistantMessageId`) is saved only once after the entire response, including all tool interactions, has been processed by the CLI.

**After implementing these changes, test thoroughly as outlined previously.** Pay close attention to the console logs in both the renderer and main process, and inspect the `claude-bridge-service.log` for any database-related errors. Verify that tool calls and results are rendered correctly in the `CoderPane`.

```
