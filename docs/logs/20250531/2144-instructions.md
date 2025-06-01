Okay, I will provide specific instructions for the coding agent to modify the `claude-bridge-service.js` file. The goal is to address the CLI output format issue by ensuring that if `--output-format stream-json` is used in conjunction with a prompt flag (`-p` or `--prompt`), the `--verbose` flag is also present. If the client requests `--output-format text`, the bridge should honor that.

---

**Instructions for the Coding Agent:**

**Target File:** `src/services/claude-bridge-service.js`

**Objective:**
Modify the Claude Bridge Service to correctly handle the `--output-format` and `--verbose` flags for the `claude` CLI.
The service should:
1.  Honor a client's request for `--output-format text`.
2.  If `--output-format stream-json` is being used (either by client request or bridge default for streaming) AND a prompt flag (`-p` or `--prompt`) is present, ensure `--verbose` is also included in the arguments passed to the `claude` CLI.

**Detailed Steps:**

1.  **Locate the CLI Argument Processing Logic:**
    *   In `src/services/claude-bridge-service.js`, find the `wss.on('message', (message) => { ... });` handler.
    *   Inside this handler, locate the section where `request.args` (from the parsed WebSocket message) are processed to form the final `claudeArgs` array that will be passed to `pty.spawn(claudePath, claudeArgs, ...)`. This is typically where `const { id, args, sessionId } = request;` or similar occurs.

2.  **Implement Argument Adjustment Logic:**
    *   Before the `pty.spawn` call, insert the following logic to adjust `claudeArgs`. Make sure `claudeArgs` is mutable (e.g., `let claudeArgs = [...request.args];` if `request.args` should not be modified directly, or work on `request.args` if it's already a mutable copy).

    ```javascript
    // Inside the WebSocket message handler, after 'request.args' are available
    // let claudeArgs = request.args; // Or how claudeArgs is currently initialized

    // --- BEGIN MODIFICATIONS ---

    const originalArgs = [...request.args]; // Keep a copy for reference if needed
    let finalArgs = [...request.args]; // Work on a mutable copy

    log(`[Bridge Arg Handler] Initial args from client: ${JSON.stringify(finalArgs)}`);

    const hasPromptFlag = finalArgs.includes('-p') || finalArgs.includes('--prompt');
    let outputFormat = null;
    const outputFormatIndex = finalArgs.findIndex(arg => arg === '--output-format');

    if (outputFormatIndex !== -1 && finalArgs.length > outputFormatIndex + 1) {
      outputFormat = finalArgs[outputFormatIndex + 1];
      log(`[Bridge Arg Handler] Client requested --output-format: ${outputFormat}`);
    } else {
      log(`[Bridge Arg Handler] No --output-format specified by client.`);
      // If the bridge needs to default to stream-json for its streaming mechanism
      // when no format is specified by the client, and it's a streaming request:
      // (Assuming this part of bridge logic is implicit or handled elsewhere,
      // for now, we respect if client *doesn't* send it)
      // For instance, if this 'claude' type request in the bridge is always for streaming,
      // it might be adding stream-json by default IF no output-format is specified.
      // Let's ensure if it DOES default to stream-json, verbose is handled.
      // Based on existing logs, the client (Electron main process) *is* sending stream-json.
    }

    // Recommendation 1.1: "Not force stream-json format when text is requested"
    // This means if client explicitly sends '--output-format text', we should honor it.
    // The current logic will pass it through unless the bridge explicitly overrides it.

    // Recommendation 1.2: "Add the --verbose flag when using stream-json with prompts"
    // This applies if 'stream-json' is the chosen format (either by client or by bridge default/override).

    let effectiveOutputFormat = outputFormat;

    // Check if the bridge's internal logic will force stream-json.
    // For example, if the bridge logic for handling stream responses TO the Electron app
    // DEPENDS on the Claude CLI outputting stream-json.
    // From the provided log docs/logs/20250530/1630-cancelled.md,
    // the bridge *does* execute with --output-format stream-json.
    // The request to the bridge also contained it.
    // Let's assume stream-json IS the intended format from CLI for streaming back to Electron.

    // Ensure stream-json is used if this handler is for streaming.
    // The client (Electron's main-claude-websocket.ts) appears to be already adding it.
    // So, if 'text' was requested but the bridge needs 'stream-json' for its streaming mechanism,
    // this is where an override would happen. But for now, assume client controls this.
    if (outputFormat !== 'stream-json') {
        // If client explicitly requested 'text', and bridge can support streaming 'text' output line-by-line,
        // then we should honor 'text'.
        // If client requests 'text' but bridge MUST have 'stream-json' to stream to Electron,
        // then an override is needed. The summary says "Not force stream-json when text is requested".
        // This implies the bridge should work with 'text' if requested.
        // So, no override for now. `effectiveOutputFormat` remains what client sent or null.
    }

    if (!effectiveOutputFormat) {
        // If no output format was specified by the client for a streaming type request,
        // and the bridge inherently expects stream-json for its streaming logic to the Electron app:
        log('[Bridge Arg Handler] No output format specified by client. Defaulting to stream-json for bridge streaming.');
        const existingFormatIndex = finalArgs.findIndex(arg => arg === '--output-format');
        if (existingFormatIndex !== -1) {
            finalArgs.splice(existingFormatIndex, 2); // Remove existing if any
        }
        finalArgs.push('--output-format', 'stream-json');
        effectiveOutputFormat = 'stream-json';
    }


    // Now, ensure --verbose if effectiveOutputFormat is 'stream-json' and a prompt is present.
    if (effectiveOutputFormat === 'stream-json' && hasPromptFlag) {
      const hasVerboseFlag = finalArgs.includes('--verbose');
      if (!hasVerboseFlag) {
        log('[Bridge Arg Handler] Adding --verbose because --output-format stream-json and a prompt flag are present.');
        finalArgs.push('--verbose');
      } else {
        log('[Bridge Arg Handler] --verbose already present with stream-json and prompt.');
      }
    } else if (effectiveOutputFormat === 'text') {
        log(`[Bridge Arg Handler] Using --output-format text as requested. --verbose not strictly required by this rule.`);
    }


    // Log the final arguments that will be used.
    log(`[Bridge Arg Handler] Final claudeArgs for PTY spawn: ${JSON.stringify(finalArgs)}`);

    // The `pty.spawn` call should use `finalArgs`
    // Example: const ptyProcess = pty.spawn(claudePath, finalArgs, { ... });

    // --- END MODIFICATIONS ---
    ```

3.  **Adapt `pty.spawn` Call:**
    *   Ensure the `pty.spawn` call uses the modified arguments array (e.g., `finalArgs` from the sketch above, instead of directly using `request.args`).

4.  **Review Existing Default Flags:**
    *   The log `docs/logs/20250530/1630-cancelled.md` shows `Executing Claude CLI with streaming args: ... --dangerously-skip-permissions`. Check if the bridge *always* adds this flag. If so, ensure your new logic is compatible and this flag is still appended if necessary, after your adjustments to `--output-format` and `--verbose`. Your new logic should be placed *before* such final default flags are appended.

**Rationale for this approach:**
*   This logic first respects the client's choice for `--output-format`.
*   If the client doesn't specify an output format and the bridge needs `stream-json` for its operation (which seems to be the case for streaming to Electron app), it defaults to `stream-json`.
*   Crucially, it then checks if `stream-json` is the *effective* format being used. If so, and if a prompt is present, it ensures `--verbose` is added if it's missing.
*   This directly addresses the error message reported ("When using --print, --output-format=stream-json requires --verbose") by ensuring the condition is met. The `--print` part of the error might be an internal alias or behavior of the Claude CLI when `-p` is used without `--output-format text`.

**Developer Testing Post-Implementation:**
After the agent applies these changes:
1.  Stop and restart the bridge service (`pnpm bridge:stop` then `pnpm bridge`).
2.  Restart the OpenAgents Commander application (`pnpm start:app-only` if bridge is separate, or `pnpm start`).
3.  Attempt to evaluate a SWE-Bench task using the Claude Code agent (`--patch_source agent:claude_code`).
4.  Monitor `~/claude-bridge-service.log` for the new log messages to see how arguments are being handled.
5.  Confirm that the "requires --verbose" error no longer appears and that the evaluation proceeds.
6.  If the client (e.g., via `CoderPane` or a direct test through `main-claude-websocket.ts`) sends a request with `--output-format text`, verify the bridge log shows this is honored and the output is indeed text, not `stream-json` (unless the bridge's fundamental streaming to Electron mechanism *requires* it, in which case the override logic and logging should confirm this).

This approach should make the bridge's argument handling more robust and resolve the specified CLI error.
