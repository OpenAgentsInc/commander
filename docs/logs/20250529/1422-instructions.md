Okay, I will provide instructions for the coding agent to disable the "Task" tool when sending chat history (or any request) to the Claude Code CLI via the bridge service.

**Objective:**
Modify the argument construction logic for the Claude Code CLI to always include the "Task" tool in the disallowed list, unless a specific list of `allowedTools` is provided by the caller.

**File to Modify:** `src/main-claude-websocket.ts`

**Location within the file:**
Inside the `ipcMain.on("claude-code:chat-stream", async (event, requestId: string, params: any) => { ... })` handler, specifically where the `args: string[]` array is being constructed and before it's sent to the bridge service.

**Instructions:**

1.  **Locate the argument construction block.** This block is responsible for populating the `args` array with flags and values for the Claude Code CLI. It typically includes adding `-p`, `--output-format`, `--model`, `--temperature`, `--max-tokens-to-sample`, and `--system-prompt`.

2.  **Insert the new tool disallowing logic *after* all other standard arguments have been added to `args`, but *before* the `args` array is logged or sent to the bridge service.**

    The relevant section to modify should look something like this:
    ```javascript
    // ... (existing code to push -p, --output-format, model, temperature, max_tokens, system_prompt to args) ...

    // New logic to be inserted starts here:
    // Tool management for Claude Code CLI

    // Log the current args before tool modification for debugging
    // log(`[Main Process] Args before tool management:`, args);

    if (params.allowedTools && Array.isArray(params.allowedTools) && params.allowedTools.length > 0) {
      // If allowedTools is explicitly provided, use it.
      args.push("--allowedTools", params.allowedTools.join(','));
      log(`[Main Process] Using allowedTools from params for Claude Code: ${params.allowedTools.join(',')}`);
    } else {
      // If allowedTools is not specified, we will manage disallowedTools.
      // Start with any disallowedTools passed in params, or an empty array.
      let disallowedToolsArray = [];
      if (params.disallowedTools && Array.isArray(params.disallowedTools) && params.disallowedTools.length > 0) {
        disallowedToolsArray = [...params.disallowedTools];
      }

      // Ensure "Task" is in the disallowed list.
      // Note: Claude CLI tool names are case-sensitive. "Task" is the default name.
      if (!disallowedToolsArray.includes("Task")) {
        disallowedToolsArray.push("Task");
      }

      // If there are any tools to disallow, add the flag.
      if (disallowedToolsArray.length > 0) {
        args.push("--disallowedTools", disallowedToolsArray.join(','));
        log(`[Main Process] Disallowing tools for Claude Code: ${disallowedToolsArray.join(',')}`);
      } else {
        // If no allowedTools and no disallowedTools (even after adding "Task", which shouldn't happen if Task is always disallowed),
        // this means no tool-related flags are added.
        log(`[Main Process] No specific tool restrictions applied for Claude Code (Task should be implicitly disallowed if not in an allowed list).`);
      }
    }
    // New logic ends here

    // Existing log: Ensure this log captures the FINAL args array AFTER tool modifications
    log(`[Main Process] Final Claude CLI args to be sent to bridge:`, args);

    // Send the command to the bridge service
    ws.send(JSON.stringify({ id: requestId, args })); // Ensure this 'args' is the modified one
    ```

3.  **Verify the `params` object.** The `params` object received by this IPC handler is of type `ClaudeExecParams` (defined in `src/types.d.ts` and `src/services/ai/providers/claude_code/claudeCliUtils.ts`). This type should already include optional `allowedTools?: string[]` and `disallowedTools?: string[]` fields. The code in `src/hooks/coder/useCoderChat.ts` that calls `window.electronAPI.claudeCode.streamChat()` does not currently pass these tool-related fields, so `params.allowedTools` and `params.disallowedTools` will typically be `undefined`. The logic above correctly handles this by defaulting to disallowing "Task".

**Explanation of Changes:**

*   The new logic checks if `params.allowedTools` is provided. If it is, those tools will be explicitly allowed, and the `--disallowedTools` flag won't be added by this default logic (respecting the caller's intent).
*   If `params.allowedTools` is *not* provided:
    *   It takes any `params.disallowedTools` that might have been passed.
    *   It ensures "Task" is added to this list of disallowed tools.
    *   It then adds the `--disallowedTools` flag to the CLI arguments with the combined list.
*   This ensures that "Task" is disabled by default unless a specific set of `allowedTools` (which might or might not include "Task") is requested.
*   The logging statement for the final arguments sent to the bridge service should come *after* this new logic block to accurately reflect the arguments being used.

This modification will ensure that the "Task" tool is disabled for all Claude Code CLI interactions initiated via the streaming WebSocket bridge, unless explicitly overridden by an `allowedTools` parameter from the renderer.
