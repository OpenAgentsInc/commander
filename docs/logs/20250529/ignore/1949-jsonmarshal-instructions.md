Okay, Agent, we're encountering a JSON unmarshaling error when the Claude Code AI uses the "Write" tool. The error `json: cannot unmarshal number into Go struct field WriteInput.content of type string` indicates that the Go-based server executing the "Write" tool received a *number* for the `content` field, but it strictly expects a *string*.

This problem likely stems from two combined issues:
1.  The AI model itself generated a `Write` tool call where the `content` argument was (or was interpreted as) a number.
2.  Our system prompt might not be effectively reaching the Claude Code CLI, or it's not specific enough to guide the AI on argument types for the `Write` tool.

Here are the specific instructions to fix this:

**Primary Objective:**
Ensure that the Claude Code AI is properly instructed to always provide a string value for the `content` parameter of the `Write` tool. This involves ensuring the system prompt is correctly passed to the CLI and enhancing the system prompt with explicit type guidance for this tool.

---

**Step 1: Ensure System Prompt is Correctly Passed to Claude Code CLI**

*   **File to Modify:** `src/main-claude-websocket.ts`
*   **Context:** Inside the `ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => { ... })` handler, in the section where `args: string[]` array is being constructed for the Claude CLI.
*   **Problem Identification:** The logs and potentially current code might show that the `--system-prompt` argument is skipped or improperly handled (e.g., due to a line like `console.log('skipping system pormpt ez')` and commented-out logic for adding the system prompt).
*   **Specific Instructions:**
    1.  Locate the part of the code where `args` are assembled. You should find `const systemPromptContent = params.systemPrompt;`.
    2.  Remove any lines like `console.log('skipping system pormpt ez')` that might indicate the system prompt is being deliberately ignored.
    3.  Ensure that the logic to add the system prompt to the `args` array is active and correct. It should look like this:
        ```javascript
        // Inside ipcMain.on("claude-code:chat-stream", ...) in src/main-claude-websocket.ts
        // ... (after const systemPromptContent = params.systemPrompt;) ...

        if (systemPromptContent && systemPromptContent.trim() !== "") {
          args.push("--system-prompt", systemPromptContent); // Ensure this line is active
          log(`[Main Process] Using system prompt (first 100 chars): ${systemPromptContent.substring(0, 100)}...`);
        } else {
          log("[Main Process] No system prompt provided by params, or it's empty. Claude CLI will use its default system prompt.");
        }
        // ... (rest of arg building, e.g., args.push("-p", conversationContext); etc.) ...
        ```
    4.  Confirm that `params.systemPrompt` (which becomes `systemPromptContent`) is indeed receiving the intended system message from the renderer process (originating from `useCoderChat.ts`).

---

**Step 2: Enhance Default System Prompt with Specific Guidance for the `Write` Tool**

*   **File to Modify:** `src/hooks/coder/useCoderChat.ts`
*   **Context:** The `initialSystemMessage` constant is used to initialize the chat and is subsequently passed as `systemPromptContent` to the main process when a Claude Code CLI session is initiated.
*   **Specific Instructions:**
    1.  Locate the `initialSystemMessage` declaration, which is currently:
        ```typescript
        const initialSystemMessage = 'You are Claude Code, a helpful AI coding assistant.';
        ```
    2.  Modify it to include explicit instructions regarding the `Write` tool's `content` parameter. Append the following guidance:

        ```typescript
        // In src/hooks/coder/useCoderChat.ts

        const initialSystemMessage = `You are Claude Code, a helpful AI coding assistant.
IMPORTANT TOOL USAGE GUIDELINES:
When using the 'Write' tool, adhere to the following for its parameters:
- 'file_path': This MUST be a string representing the full, absolute path to the file.
- 'content': This parameter MUST always be a string. If you are asked to write numerical data, JSON, or any other structured data to a file, ensure it is first converted to its complete string representation before being passed as the 'content' argument. For example, to write the number 123, the 'content' parameter should be the string "123", not the number 123. To write JSON data like { "key": "value" }, the 'content' parameter should be the string "{\\"key\\": \\"value\\"}".
(Other general instructions or existing system prompt content can follow or precede this block.)`;
        ```
        This enhanced `initialSystemMessage` will then be used as the `systemPromptContent` when `sendMessage` calls `window.electronAPI.claudeCode.streamChat` with `systemPrompt: systemMessageContent`.

---

**Rationale for these changes:**

1.  **Correct System Prompt Forwarding (Step 1):** The Claude Code CLI relies on the system prompt for behavioral guidance, including how to format tool arguments. Ensuring it's correctly passed is fundamental. The previous "skipping system prompt" log indicated this was a likely point of failure.
2.  **Explicit Type Instruction (Step 2):** LLMs can sometimes make incorrect assumptions about data types for tool arguments. By explicitly stating in the system prompt that the `Write` tool's `content` field *must* be a string, even for numeric-looking data or structured data, we directly address the root cause of the AI potentially generating a numeric value where a string is expected by the Go tool server.

**Verification Steps After Applying Fixes:**

1.  Restart the application (including the `claude-bridge-service.js` if it's run separately).
2.  Confirm from the main process logs (from `src/main-claude-websocket.ts`) that:
    *   The "skipping system pormpt ez" log is gone.
    *   The enhanced system prompt (or at least its beginning, including the `Write` tool guidance) is logged when a Claude Code CLI command is prepared.
3.  Test the scenario that previously caused the error. For example, ask the Coder AI: "Create a new log file at `docs/logs/test-numeric-content.md` with the content being just the number 12345."
4.  Monitor the `claude-bridge-service.log` (or its console output if run directly) for any `ERR Tool execution failed` messages related to the `Write` tool and JSON unmarshaling. The error should no longer occur if the AI correctly stringifies its `content` argument.

These steps should robustly address the JSON marshaling error by ensuring the AI provides the `Write` tool with string-formatted content as per the Go server's expectations.