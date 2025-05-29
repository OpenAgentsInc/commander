It sounds like you're dealing with a frustrating issue where long-running Claude Code CLI operations are being interrupted, likely by an unexpected Vite rebuild, and the UI isn't recovering gracefully. The "cancel-serverlogs" filename suggests that a cancellation mechanism is involved, possibly triggered during the main process restart.

Here's an analysis and instructions for a coding agent to address this.

## Analysis of the Problem

1.  **Vite Rebuilds Persist:**
    *   Despite previous attempts (as per `docs/logs/20250529/2228-rebuild-instructions.md`) to disable Vite's file watching in development using `watch: null` in Vite configurations, the log `docs/logs/20250529/2246-cancel-serverlogs.md` (and `2223-rebuild-serverlog.md`) clearly shows `build started...` and Vite output. This is the primary suspect for interrupting the main Electron process.
    *   **Possible Reasons:**
        *   The Vite configuration changes might not be fully effective due to overrides in `forge.config.ts` or specific behaviors of the `@electron-forge/plugin-vite`.
        *   Vite's watcher might still be picking up changes to files that are not explicitly ignored (e.g., markdown files being saved, as you mentioned, if they are in a watched path).
        *   The `start-with-bridge.sh` script, if it restarts `electron-forge start` based on some external file changes, could also be a factor, though less likely if Vite itself is rebuilding.

2.  **Interruption of Claude Code CLI:**
    *   When the Electron main process rebuilds and restarts, it likely sends a cancellation signal for any ongoing IPC requests, including the `claude-code:chat-stream`.
    *   The `main-claude-websocket.ts` handles `claude-code:chat-stream:cancel` by closing its WebSocket connection to the `claude-bridge-service.js`.
    *   The `claude-bridge-service.js`, according to its logic (especially after the resilience enhancements from `docs/logs/20250529/2228-rebuild-log.md`), should handle this 'cancel' message by terminating the `node-pty` process running the Claude CLI. The "PTY process exited" log lines confirm this termination.

3.  **UI Hang ("Claude Code is working"):**
    *   This occurs because the `useCoderChat` hook's `isLoading` state (or similar state for the assistant's message `isStreaming`) isn't reset to `false` when the stream is abruptly terminated by the main process restart.
    *   The `onError` or `onDone` callbacks for the stream, which are responsible for resetting these states, might not execute cleanly if the IPC channel or WebSocket connection is broken due to the main process dying.
    *   The `Effect.ensuring` block in `useCoderChat` (or similar cleanup logic in the `ClaudeCodeCliAgentLanguageModelLive` provider) might not be robust enough to handle this specific type of interruption.

4.  **No Recovery:**
    *   The "nothing recovered" part implies that even if the `claude-bridge-service.js` *could* theoretically keep the PTY alive (as per resilience enhancements), the explicit cancellation from the dying main process is terminating it.
    *   The UI doesn't receive a final error state or a clear "cancelled" state, leading to the hang.

## Instructions for Coding Agent to Fix the Issue

The primary goal is to (1) make Vite rebuilds far less likely from non-source changes, and (2) make the UI robust to interruptions, displaying an appropriate state rather than hanging.

### Part I: Aggressively Prevent Unwanted Vite Rebuilds

**Objective:** Ensure Vite only rebuilds on deliberate source code changes, not due to external tools saving files (like markdown).

**Target Files:**
*   `vite.main.config.ts`
*   `vite.preload.config.ts`
*   `vite.renderer.config.mts`
*   `forge.config.ts`

**Instructions:**

1.  **Strengthen Vite Watch Configuration:**
    *   In `vite.main.config.ts`, `vite.preload.config.ts`, and `vite.renderer.config.mts`, modify the `watch` configurations for development mode.
    *   For `build.watch` (in `vite.main.config.ts` and `vite.preload.config.ts`), change `watch: isDevelopment ? null : undefined` to an empty object `watch: isDevelopment ? {} : undefined`. This is sometimes interpreted by Chokidar (Vite's watcher) as "watch effectively nothing" more reliably than `null`.
    *   For `server.watch` (in `vite.renderer.config.mts`), ensure it's also `null` or `{}` for development.
    *   **Explicitly Ignore Non-Source File Types/Directories:**
        *   Add comprehensive `ignored` patterns to `build.watch.ignored` and `server.watch.ignored` to exclude common non-source files/directories that might be modified. This is crucial for files saved by "another something".
        *   **Example (apply to all three Vite configs within their respective `build.watch` or `server.watch` sections in development mode):**
            ```typescript
            // In development mode section:
            watch: {
              // ignored: ['**/node_modules/**', ... (keep existing good ignores)]
              // Add these:
              ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/.vite/**',
                '**/dist/**',
                '**/.DS_Store',
                '**/logs/**',          // All logs
                '**/*.log',            // Log files anywhere
                '**/*.md',             // ALL markdown files (if they are not source)
                '**/docs/**/*.md',     // Specifically markdown in docs
                // Add any other specific paths or file types here
                // If the "markdown file" is in a specific output directory, target that:
                // '**/output_md_dir/**'
              ],
              // Optional: usePolling: false, // Can sometimes help if FS events are noisy
            }
            ```
        *   **Clarification on Markdown Files:**
            *   If markdown files that are part of your application's source code (e.g., content rendered in the app) are being edited and *should* trigger rebuilds, then a blanket `**/*.md` ignore is too broad.
            *   If the problematic markdown files are generated logs or temporary files, ensure they are written to a directory that *can* be safely ignored (e.g., a dedicated `./tmp_md_logs/` directory at the project root, then add `'**/tmp_md_logs/**'` to `ignored`). **It's best practice not to write volatile/generated files into your `src` directory.**

2.  **Review `forge.config.ts` for Vite Plugin Overrides:**
    *   Carefully check the `@electron-forge/plugin-vite` configuration block.
    *   Ensure there are no options like `vitePlugin.devServer.watch` or `vitePlugin.build[<index>].watch` that might be re-enabling watching. If found, align them with the disabled/ignored settings.

### Part II: Improve UI Robustness to Stream Interruptions

**Objective:** Ensure the `CoderPane` and its underlying hooks correctly handle stream cancellations or unexpected terminations, reset loading states, and provide user feedback.

**Target Files:**
*   `src/hooks/coder/useCoderChat.ts`
*   `src/services/ai/providers/claude_code_cli/ClaudeCodeAgentLanguageModelLive.ts`
*   `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload script)
*   `src/main-claude-websocket.ts` (Main process IPC handler for Claude Code)

**Instructions:**

1.  **In `src/hooks/coder/useCoderChat.ts` (`sendMessage` function):**
    *   **Robust `isLoading` Reset:** The `Effect.ensuring` block is critical. Ensure `setIsLoading(false)` is unconditionally called within it, regardless of how the stream effect terminates (success, error, interruption/abort).
        ```typescript
        // Inside the Effect.ensuring block of the `program`
        Effect.ensuring(
          Effect.sync(() => {
            console.log(`[useCoderChat] Ensuring block for ${assistantMessageId}. Signal aborted: ${localAbortController.signal.aborted}`);

            setIsLoading(false); // <<< THIS IS CRITICAL: Ensure isLoading is always reset

            // Update the specific message's streaming state
            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      isStreaming: false,
                      content: localAbortController.signal.aborted && !msg.content?.includes("[Stream cancelled")
                                 ? (msg.content || "") + "\n[Stream cancelled]"
                                 : msg.content,
                      _updateId: Date.now()
                    }
                  : msg,
              ),
            );

            if (!localAbortController.signal.aborted && finalSessionId) {
              // ... existing DB save logic for completed messages ...
            }

            if (streamAbortControllerRef.current === localAbortController) {
              streamAbortControllerRef.current = null;
            }
            if (currentAssistantMessageIdRef.current === assistantMsgId) {
              currentAssistantMessageIdRef.current = null;
            }
          }),
        ),
        ```
    *   **Clearer Error Propagation:** When `Effect.tapErrorCause` catches an error:
        *   If the error indicates an abort (check `signal.aborted` or if the error is an `AbortError`), update the assistant message content to explicitly state `[Stream cancelled by system or user.]`.
        *   Set a more generic error message in the `error` state like "AI task was interrupted."

2.  **In `src/services/ai/providers/claude_code_cli/ClaudeCodeAgentLanguageModelLive.ts`:**
    *   **Stream Error Mapping:** In `streamText`, when `electronAPI.claudeCode.streamChat`'s `onError` callback is invoked, ensure the error passed to `emit.fail()` is a distinct `AiProviderError` that clearly indicates an IPC or bridge communication failure if possible.
        ```typescript
        // Inside streamText -> streamChat -> onError
        onError: (err) => {
          const ipcError = err && typeof err === 'object' && err.__error ? err : { message: String(err) };
          Effect.runFork(telemetry.trackEvent({ /* ... */ value: ipcError.message }));
          emit.fail(new AiProviderError({
            message: `Claude Code IPC stream error: ${ipcError.message}`,
            cause: err,
            provider: "ClaudeCodeCLI_IPC", // More specific provider context
            isRetryable: false
          }));
          emit.end(); // Ensure stream is always ended on error
        }
        ```

3.  **In `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload `streamChat`):**
    *   **Handle Renderer Destruction:** Before calling `event.sender.send` in `chunkListener`, `doneListener`, and `errorListener`, check `if (event.sender.isDestroyed()) { cleanup(); return; }`. This prevents errors if the renderer context is gone.
    *   **Propagate Cancellation Error:** If the `cancelIPC` function itself is called (meaning the stream was cancelled from the renderer side via `streamAbortControllerRef.abort()`), consider having the cleanup logic within `cancelIPC` also trigger the `onError` callback with a specific "cancelled by client" message, if it hasn't already errored or completed. This is tricky because `cleanup` removes listeners. A flag might be needed. Alternatively, `useCoderChat` should handle its own `AbortError` more directly.

4.  **In `src/main-claude-websocket.ts` (`setupClaudeWebSocketHandler`):**
    *   **Robust WebSocket `on('close')` and `on('error')` for Bridge Connection:**
        *   In the `ws.on('close', ...)` handler: If the stream hasn't already been marked as done or errored by an explicit message from the bridge (`claude_stream_done`, `claude_stream_error`), and `hasReceivedData` is true (meaning it was mid-stream), send a specific error to the renderer:
            ```javascript
            // Inside ws.on('close')
            if (!streamExplicitlyEnded && hasReceivedData) { // streamExplicitlyEnded is a new flag
              log(`[Main Process] WebSocket to bridge closed unexpectedly for ${requestId}`);
              if (!event.sender.isDestroyed()) {
                event.sender.send(`claude-code:chat-stream:error`, requestId, {
                  __error: true,
                  message: "Connection to Claude Bridge Service lost mid-stream."
                });
              }
            } else if (!streamExplicitlyEnded && !hasReceivedData) {
                // ... existing logic for connection closed without data ...
            }
            ```
            Set `streamExplicitlyEnded = true` when `claude_stream_done` or `claude_stream_error` is processed.
        *   Similarly, in `ws.on('error', ...)`, ensure an error is sent to the renderer.
    *   **Cancellation Message to Bridge:** When `claude-code:chat-stream:cancel` is received, the main process sends `{ type: 'cancel', requestId }` to the bridge. The bridge side (`claude-bridge-service.js`) already has logic to kill the PTY. This seems fine. The key is how the renderer's UI state is reset.

**III. Refine Claude Bridge Service (Optional - for future resilience)**

**Objective:** If preventing rebuilds entirely proves too difficult, or for general robustness, make the bridge service more resilient to Electron main process restarts. (This is a larger change, building on `docs/logs/20250529/2228-rebuild-log.md` ideas).

*For now, focus on I and II. If problems persist, these bridge enhancements would be the next step.*

1.  **Session-Based PTY Management (Bridge):**
    *   In `claude-bridge-service.js`, when a new stream request comes from Electron main with a `sessionId`:
        *   If a PTY process associated with that `sessionId` is *already running* (and its `requestId` differs, indicating a new Electron client connection for the same session), the bridge should:
            *   Re-associate the new WebSocket (for the new `requestId`) with the existing PTY.
            *   Send any buffered output from the PTY to the new WebSocket.
            *   Continue streaming live output.
        *   If no PTY exists for the `sessionId`, spawn a new one. If a `claudeSessionId` was previously captured for this Commander `sessionId`, attempt to use `claude --resume <claudeSessionId>` (if the CLI supports this robustly).
2.  **Conditional PTY Termination (Bridge):**
    *   Only terminate a PTY process if:
        *   The PTY itself exits (due to completion or error).
        *   An explicit "user cancel" message is received from Electron (e.g., different IPC channel than the one potentially triggered by main process shutdown). For generic "cancel" from main process (as potentially on shutdown), the bridge might just detach the WebSocket but keep the PTY and buffer output, awaiting a potential reconnect with the same `sessionId`. This is complex as it needs to differentiate "user clicked cancel" from "main process is restarting".

By implementing (I) and (II), the immediate issue of UI hangs due to rebuilds and interrupted streams should be significantly mitigated. The UI will become more responsive to the actual state of the Claude Code CLI process. If rebuilds are successfully suppressed, the primary cause of interruption will be removed.

The key is to ensure that if a stream *does* get terminated for any reason (user cancellation, network error to bridge, bridge error, CLI error, or even an unprevented main process restart), the `isLoading` state in `useCoderChat` is reliably set to `false`, and an appropriate message is displayed to the user.

One final thought: The log `docs/logs/20250529/2223-rebuild-serverlog.md` also shows:
```
[79244:0529/202145.191061:ERROR:CONSOLE:2] "TypeError: object null is not iterable (cannot read property Symbol(Symbol.iterator))", source: node:electron/js2c/sandbox_bundle (2)
```
This renderer-side error occurs *after* the `claude-code-stream-cancel` and *before* the "build started..." line. This might be unrelated, or it could be a symptom of the renderer trying to process a malformed state or event due to the impending shutdown/interruption. Fixing the isLoading state might resolve this if it's a consequence of an unhandled promise or bad state update during the interruption.

```
[79244:0529/204147.834661:ERROR:CONSOLE:2] "TypeError: object null is not iterable (cannot read property Symbol(Symbol.iterator))", source: node:electron/js2c/sandbox_bundle (2)
```
This error also appears in `docs/logs/20250529/2246-cancel-serverlogs.md` after a PTY exit and before the `build started...` message. It's worth investigating if this renderer-side error is consistently linked to the hang or interruption scenario. It might be a separate bug in how the renderer handles the abrupt end of an IPC stream or data update.The problem you're describing, where a long-running Claude Code CLI process gets interrupted by a Vite rebuild and leaves the UI in a hung state, is indeed a tricky one. The "cancel-serverlogs" file name strongly suggests that a cancellation mechanism is being invoked, likely as part of the Electron main process shutdown/restart cycle triggered by the rebuild.

Here's an analysis of the situation based on the provided codebase and logs, followed by specific instructions for a coding agent to address the issue:

**Analysis of the Problem:**

1.  **Persistent Vite Rebuilds:**
    *   Despite your efforts to disable Vite's file watching (as documented in `docs/logs/20250529/2228-rebuild-instructions.md`), the logs (e.g., `docs/logs/20250529/2223-rebuild-serverlog.md` and `docs/logs/20250529/2246-cancel-serverlogs.md`) clearly show `build started...` messages. This indicates that the Vite development server or build watcher for the Electron main/preload process is still active and triggering rebuilds.
    *   The trigger is likely a file modification, possibly the "markdown file" you mentioned. If this file resides within a directory Vite monitors (even `docs/` if it's not properly ignored), Vite will react.
    *   The existing `watch: null` or `watch: {}` in your Vite configs might not be sufficient to completely override Electron Forge's Vite plugin behavior, or the `ignored` patterns are not catching the specific file modifications.

2.  **Interruption and Cancellation Flow:**
    *   When Vite rebuilds the main process, Electron Forge restarts it.
    *   During this restart, the old main process attempts to clean up. This likely includes sending a "cancel" IPC message (`claude-code:chat-stream:cancel`) for any active Claude Code streams, as seen in `docs/logs/20250529/2246-cancel-serverlogs.md`.
    *   The `main-claude-websocket.ts` handler for this cancel message instructs the `claude-bridge-service.js` to terminate the PTY process running the Claude CLI (as confirmed by "PTY process exited" logs).
    *   The previous changes for PTY persistence in the bridge (`docs/logs/20250529/2228-rebuild-log.md`) are being overridden by this explicit cancellation from the main process.

3.  **UI Hang ("Claude Code is working"):**
    *   The core issue here is that the UI state in `CoderPane.tsx` (managed by `useCoderChat.ts`) doesn't correctly reflect the termination of the Claude Code task.
    *   The `isLoading` state in `useCoderChat.ts` (or a similar `isStreaming` state on the specific message) likely remains `true` because the stream interruption due to the main process restart doesn't cleanly propagate an "error" or "done" event back to the renderer hook's stream processing logic.
    *   The `Effect.ensuring` block in `useCoderChat`'s `sendMessage` might not be reliably resetting `isLoading` if the underlying IPC/WebSocket connection vanishes abruptly.

4.  **No Recovery:**
    *   Because the PTY process is terminated (due to the cancellation chain), there's indeed nothing for the application to recover from in terms of continuing the *same* Claude CLI execution. The UI hangs because it's still waiting for a response that will never come, and its loading state isn't reset.

**Core Problem Areas:**

*   **Vite Rebuilds:** Still being triggered by non-source file changes.
*   **UI State Management:** Not robustly handling abrupt stream terminations caused by main process restarts.

**Instructions for Coding Agent:**

The priority is to (A) further harden against unwanted rebuilds, and (B) ensure the UI gracefully handles interruptions if they still occur.

**Part I: More Aggressive Vite Rebuild Prevention**

**Objective:** Make Vite significantly less sensitive to changes outside of the core source files during development.

**Target Files:**
*   `vite.main.config.ts`
*   `vite.preload.config.ts`
*   `vite.renderer.config.mts`
*   `forge.config.ts` (for reviewing plugin options)

**Instructions:**

1.  **Strengthen `watch.ignored` Patterns:**
    *   In `vite.main.config.ts`, `vite.preload.config.ts`, and `vite.renderer.config.mts`, under the `development` mode condition:
        *   Ensure the `watch.ignored` array is comprehensive. Specifically target the directory where "markdown files" are being saved if it's known and *not* part of the application's direct source code.
        *   If these markdown files are in `docs/`, ensure `**/docs/**` is in `ignored`.
        *   **Example (add to existing ignored arrays in development mode):**
            ```typescript
            // In development mode section's watch configuration:
            ignored: [
              // ... existing ignores like node_modules, .vite, dist ...
              '**/logs/**',      // Your current logs directory
              '**/docs/**',       // Add docs directory if markdown files are there
              '**/*.md',         // Potentially ignore all markdown files if appropriate
              '**/*.log',
              // Add any other paths that might be modified by external tools or background processes
            ]
            ```
    *   **Important:** If markdown files are being generated *into* your `src` directory by some process, this is problematic. Such files should be generated outside `src`. If they must remain, the `ignored` patterns must be highly specific.

2.  **Investigate `vite-plugin-watch` (Optional but Recommended if Ignores Fail):**
    *   If broad `ignored` patterns are still not preventing rebuilds, consider adding `vite-plugin-watch` to your Vite configurations (especially `vite.main.config.ts`). This plugin offers more explicit control over what to watch or ignore.
    *   **Installation:** `pnpm add -D vite-plugin-watch`
    *   **Usage Example (in `vite.main.config.ts`):**
        ```typescript
        import { defineConfig } from 'vite';
        import watch from 'vite-plugin-watch'; // Or import { VitePluginWatch }

        export default defineConfig((configEnv) => {
          const isDevelopment = configEnv.mode === 'development';
          return {
            // ...
            plugins: [
              // ... your other plugins ...
              isDevelopment
                ? watch({
                    // Watch only specific source directories, ignore everything else
                    include: ['src/main.ts', 'src/helpers/**/*.ts', 'src/services/ai/**/*.ts'], // Be very specific
                    exclude: ['**/node_modules/**', '**/docs/**', '**/*.md'], // Explicitly exclude
                  })
                : undefined,
            ].filter(Boolean),
            build: {
              watch: isDevelopment ? {} : undefined, // Keep this as well
            },
            // ...
          };
        });
        ```
        *Adapt `include` patterns carefully to only watch essential source files for the main process.*

3.  **Check `forge.config.ts` for Global Watcher Overrides:**
    *   Re-verify the `@electron-forge/plugin-vite` configuration in `forge.config.ts`. Ensure it doesn't have options that forcefully enable watching in a way that overrides your Vite file settings.

**Part II: Make UI and Stream Handling Robust to Interruptions**

**Objective:** Ensure that if a Claude Code stream is cancelled or the underlying process dies (e.g., due to a main process restart), the `CoderPane` UI resets its loading state and informs the user.

**Target Files:**
*   `src/hooks/coder/useCoderChat.ts`
*   `src/services/ai/providers/claude_code_cli/ClaudeCodeAgentLanguageModelLive.ts`
*   `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload script)
*   `src/main-claude-websocket.ts` (Main Process IPC Handler for Claude Code)

**Instructions:**

1.  **In `src/hooks/coder/useCoderChat.ts` (`sendMessage` function):**
    *   **Ensure `setIsLoading(false)` in `Effect.ensuring`:**
        *   The `Effect.ensuring` block is the correct place for cleanup. Ensure `setIsLoading(false)` is called unconditionally within it.
        *   If the stream was aborted (check `localAbortController.signal.aborted`), update the assistant message placeholder to indicate cancellation (e.g., append `\n[Process Interrupted]`). This provides user feedback.
        ```typescript
        // Inside the Effect.ensuring block:
        Effect.ensuring(
          Effect.sync(() => {
            // ... (existing console.log) ...

            setIsLoading(false); // <<< CRITICAL: Unconditionally reset loading state

            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      content: localAbortController.signal.aborted && !msg.content?.includes("[Stream Interrupted]")
                                 ? (msg.content || "") + "\n[Stream Interrupted by User/System]"
                                 : msg.content,
                      _updateId: Date.now()
                    }
                  : msg,
              ),
            );

            if (!localAbortController.signal.aborted && finalSessionId) {
              // ... existing DB save logic for successfully completed messages ...
            }

            // ... rest of the cleanup ...
          }),
        ),
        ```
    *   **Handle AbortError in `Effect.tapErrorCause`:**
        *   If `Cause.squash(cause)` results in an `AbortError` (or an error with `name === 'AbortError'`), this means the stream was aborted by `streamAbortControllerRef.current.abort()`. This path should also lead to UI state reset (which the `ensuring` block now handles) but maybe set a specific, milder error message in `setError` or just log it.
            ```typescript
            Effect.tapErrorCause((cause) =>
              Effect.sync(() => {
                const localSignal = localAbortController.signal; // Use captured controller
                let isAbort = localSignal.aborted;
                const squashedError = Cause.squash(cause);

                if (squashedError instanceof Error && squashedError.name === 'AbortError') {
                  isAbort = true;
                }

                if (isAbort) {
                  // ... log "Stream was interrupted or aborted" ...
                  // No need to call setError if it's a user-initiated abort
                } else {
                  // ... existing error handling for non-abort errors ...
                  setError(squashedError as AiProviderError);
                }
              }),
            ),
            ```

2.  **In `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload `streamChat`):**
    *   **Robust `onError` Call on IPC Channel Closure:**
        *   The main process might disappear during a rebuild. The `ipcRenderer` listeners should detect this.
        *   If `event.sender.isDestroyed()` becomes true while listeners are active, or if an IPC send/invoke fails because the main process is gone, `onError` must be called.
        *   Modify the `cleanup` function:
            ```typescript
            const cleanup = (isError: boolean = false, errorDetails?: any) => {
              ipcRenderer.removeListener(/* ... */);
              ipcRenderer.removeListener(/* ... */);
              ipcRenderer.removeListener(/* ... */);
              if (isError && !streamHasEnded) { // Add a streamHasEnded flag
                onError(errorDetails || new Error("IPC channel or main process closed unexpectedly."));
              }
              streamHasEnded = true; // Set this flag in onDone and onError
            };
            ```
            A `streamHasEnded` flag (scoped to the `streamChat` call) would be set to `true` in the original `onDone` and `onError` from the IPC listeners. The cleanup called from `cancelIPC` or if `event.sender.isDestroyed()` could then call `onError` if the stream hadn't naturally ended.
    *   It's also good practice to wrap `ipcRenderer.send` calls in `try...catch` within the preload if they could throw synchronously when the main process is unavailable, though typically they queue or error asynchronously.

3.  **In `src/main-claude-websocket.ts` (`claude-code:chat-stream` handler):**
    *   **WebSocket `on('close')` and `on('error')` Handlers:**
        *   These handlers need to reliably send an error back to the renderer if the WebSocket connection to the bridge service closes or errors out *while a stream is considered active by the renderer*.
        *   Introduce a flag, say `isStreamActiveForRenderer = true`, set when the main process starts forwarding chunks and reset when `claude_stream_done` or `claude_stream_error` is received from the bridge.
        *   **In `ws.on('close', ...)`:**
            ```javascript
            // ... inside ws.on('close')
            activeConnections.delete(requestId); // From Electron IPC active request map
            if (activeClaudeSessions.has(sessionId)) { // Check the bridge's session map
                const session = activeClaudeSessions.get(sessionId);
                if (session.requestId === requestId) { // Only if this WS was for this session's current request
                    log(`[Main Process] WebSocket closed for active session ${sessionId}, request ${requestId}. Not killing PTY.`);
                    // Mark this specific WS as closed for this requestId, but PTY might live on.
                }
            }

            if (isStreamActiveForRenderer && !event.sender.isDestroyed()) {
                log(`[Main Process] WS to bridge closed unexpectedly for ${requestId}. Sending error to renderer.`);
                event.sender.send(`claude-code:chat-stream:error`, requestId, {
                    __error: true,
                    message: "Connection to Claude AI service bridge was lost.",
                    _tag: "BridgeConnectionLost" // Custom tag
                });
            }
            ```
        *   `isStreamActiveForRenderer` would be set to `false` when `claude_stream_done` or `claude_stream_error` is received from the bridge and relayed to the renderer.

**Testing & Verification after Fixes:**

1.  **Rebuild Test:**
    *   Start a long Claude Code task.
    *   Manually save a markdown file in `docs/` (or another directory that *should* be ignored).
    *   Verify that **no Vite rebuild occurs** and the Claude Code task continues uninterrupted.
2.  **Interruption Test (Simulated):**
    *   If rebuilds are still hard to completely stop, manually kill and restart the Electron main process (e.g., `pnpm start:app-only` if `start-with-bridge.sh` doesn't auto-restart it, or simulate by closing the app and restarting while bridge is running).
    *   Verify that the `CoderPane` UI doesn't hang indefinitely. It should either show an error message like "[Stream Interrupted]" or "[Connection Lost]" and `isLoading` should be `false`.
    *   The "Claude Code is working" message should disappear.
3.  **Cancellation Test:**
    *   Start a Claude Code task.
    *   Manually trigger the cancellation mechanism (e.g., if there's a "Stop" button in the UI or by navigating away if that triggers cleanup).
    *   Verify the UI updates appropriately, `isLoading` is false, and the message indicates cancellation.

These instructions aim to tackle both the rebuild triggers and the UI's reaction to stream interruptions, leading to a more stable and user-friendly experience. The "object null is not iterable" error is likely a symptom of state corruption when the stream/IPC is abruptly terminated; improving the error propagation and state reset should help mitigate that as well.

```

```

After reviewing your logs, specifically `docs/logs/20250529/2246-cancel-serverlogs.md`, it's clear that:
1.  Vite rebuilds are indeed still happening (`build started...` is present).
2.  The Electron main process, upon restarting, sends `Cancel request for: claude-code-stream-...` messages via IPC.
3.  The `claude-bridge-service.js` receives these and, as per its current design, terminates the PTY process (`PTY process exited...`).
4.  The UI hangs because it doesn't gracefully handle this interruption/cancellation originating from a main process restart.

The core problem is twofold:
*   Unwanted Vite rebuilds are triggering main process restarts.
*   The UI and stream handling logic are not robust enough to an abrupt termination of the backend (Claude CLI via bridge) when the main process dies and cancels ongoing operations.

Here are revised and specific instructions for a coding agent, focusing on preventing rebuilds and making the UI handle these interruptions properly.

## Instructions for Coding Agent

**I. Aggressively Prevent Unwanted Vite Rebuilds (Refined)**

**Objective:** Ensure Vite only rebuilds on deliberate source code changes, not due to external tools saving files (like markdown files in `docs/`).

**Target Files:**
*   `vite.main.config.ts`
*   `vite.preload.config.ts`
*   `vite.renderer.config.mts`

**Instructions:**

1.  **Strengthen `watch.ignored` Patterns:**
    *   In all three Vite configuration files, within the `development` mode conditional block, update the `watch.ignored` array. The goal is to be very explicit about what *not* to watch.
    *   **For `server.watch` (in `vite.renderer.config.mts`):**
        ```typescript
        // vite.renderer.config.mts
        // ...
        server: isDevelopment ? {
          hmr: false,
          watch: {
            ignored: [
              '**/node_modules/**',
              '**/.git/**',
              '**/.vite/**',
              '**/dist/**',
              '**/.DS_Store',
              '**/logs/**',         // Ignore all logs
              '**/*.log',           // Ignore .log files anywhere
              'docs/**',            // Ignore the entire docs directory
              '**/*.md',            // Broadly ignore markdown files if they are not app source
              // Add specific paths to other non-source files/dirs if needed
            ],
          },
        } : undefined,
        // ...
        ```
    *   **For `build.watch` (in `vite.main.config.ts` and `vite.preload.config.ts`):**
        Electron Forge's Vite plugin uses `vite build --watch`. The `build.watch` option in Vite can accept Chokidar options.
        ```typescript
        // vite.main.config.ts (and vite.preload.config.ts)
        // ...
        build: {
          // ... other build options ...
          watch: isDevelopment
            ? {
                ignored: [
                  '**/node_modules/**',
                  '**/.git/**',
                  '**/.vite/**',
                  '**/dist/**',
                  '**/.DS_Store',
                  '**/logs/**',
                  'docs/**',       // Ignore the entire docs directory
                  '**/*.md',
                ],
              }
            : null, // Keep null or undefined for production if no watching is needed
        },
        // ...
        ```
    *   **Rationale:** Explicitly ignoring `docs/**` and `**/*.md` should prevent markdown file saves from triggering rebuilds, assuming they are the primary cause outside `src/`.

2.  **Verify No Overrides in `forge.config.ts`:**
    *   Double-check `forge.config.ts` to ensure the `@electron-forge/plugin-vite` section does not contain `watch` options that might override these more specific ignores.

**II. Improve UI Robustness to Stream Interruption/Cancellation**

**Objective:** When a Claude Code stream is cancelled (especially due to main process restart), the `CoderPane` UI must reset loading states and provide clear user feedback.

**Target Files:**
*   `src/hooks/coder/useCoderChat.ts`
*   `src/services/ai/providers/claude_code_cli/ClaudeCodeAgentLanguageModelLive.ts`
*   `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload)
*   `src/main-claude-websocket.ts` (Main Process IPC Handler)

**Instructions:**

1.  **In `src/hooks/coder/useCoderChat.ts` (`sendMessage` function):**
    *   **Centralize `setIsLoading(false)`:** Ensure `setIsLoading(false)` is called in the `Effect.ensuring` block, which executes regardless of how the main Effect body completes (success, failure, or interruption).
    *   **Detect and Handle Abort/Interruption:**
        ```typescript
        // Inside sendMessage, capture the current controller
        const localAbortController = streamAbortControllerRef.current;

        // ... (program definition using Effect.gen) ...

        // Modify the Effect.ensuring block
        Effect.ensuring(
          Effect.sync(() => {
            const wasAborted = localAbortController?.signal.aborted ?? false;
            console.log(`[useCoderChat] Ensuring block for ${assistantMessageId}. WasAborted: ${wasAborted}, Current isLoading: ${isLoadingRef.current}`); // Use isLoadingRef for current value

            setIsLoading(false); // Always reset loading state

            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      content: wasAborted && !msg.content?.includes("[Stream Interrupted]")
                                 ? (msg.content || "") + "\n[Stream Interrupted]"
                                 : msg.content,
                      _updateId: Date.now()
                    }
                  : msg,
              ),
            );

            // Only save if not aborted and session is valid
            if (!wasAborted && finalSessionId) {
              // ... (existing DB save logic for successfully completed messages) ...
            } else if (wasAborted) {
              runTelemetry({
                category: "agent_chat",
                action: "stream_not_saved_due_to_abort",
                label: assistantMessageId,
                value: finalSessionId || "unknown_session",
              });
            }

            // Cleanup refs
            if (streamAbortControllerRef.current === localAbortController) {
              streamAbortControllerRef.current = null;
            }
            if (currentAssistantMessageIdRef.current === assistantMessageId) {
              currentAssistantMessageIdRef.current = null;
            }
          }),
        ),
        ```
    *   **Error Handling in `tapErrorCause`:**
        *   When an error occurs, check if it's due to an abort. If so, the `ensuring` block will handle the UI update.
        *   If it's a different error, set the `error` state for display.
        ```typescript
        // Inside .pipe() for the program
        Effect.tapErrorCause((causeInstance) => // Renamed cause to causeInstance
          Effect.sync(() => {
            const localSignal = localAbortController?.signal;
            let isAbort = localSignal?.aborted ?? false;
            const squashedError = Cause.squash(causeInstance);

            if (squashedError instanceof Error && squashedError.name === 'AbortError') {
              isAbort = true;
            }

            if (!isAbort) { // Only set error state if not a deliberate abort
              console.error("[useCoderChat] Stream error (non-abort):", { /* ... */ });
              setError(squashedError as AiProviderError); // This updates the UI to show an error
              runTelemetry({
                category: "agent_chat",
                action: "send_message_failure_stream",
                label: (squashedError as Error).message || "Unknown stream error",
                value: Cause.pretty(causeInstance),
              });
            } else {
              console.log(`[useCoderChat] Stream (${assistantMessageId}) was aborted/interrupted. No error state set.`);
              runTelemetry({
                category: "agent_chat",
                action: "stream_interrupted_or_aborted_in_error_path",
                label: assistantMessageId,
              });
            }
          }),
        ),
        ```

2.  **In `src/helpers/ipc/claude_code/claude-code-context.ts` (Preload `streamChat`):**
    *   **Robust Error on Channel Closure:**
        *   Add a boolean flag `streamEndedNaturally` initialized to `false`. Set it to `true` in `onDone` and in `onError` *before* calling the actual `onError` callback.
        *   Modify `cleanup()`:
            ```typescript
            let streamEndedNaturally = false; // Add this flag

            const cleanup = () => {
              ipcRenderer.removeListener(/* ... */); // Remove all listeners
              // If stream didn't end via onDone or onError, but cleanup is called (e.g. main process died),
              // then trigger onError.
              if (!streamEndedNaturally) {
                console.warn(`[Claude IPC Preload] Stream ${requestId} cleanup called without natural end. Triggering error.`);
                onError({ __error: true, message: "IPC connection to main process lost or stream cancelled by system." });
              }
            };

            // In onDone:
            const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
              if (id === requestId) {
                streamEndedNaturally = true; // Mark as naturally ended
                cleanup();
                onDone();
              }
            };

            // In onError (IPC error):
            const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
              if (id === requestId) {
                streamEndedNaturally = true; // Mark as naturally ended (with an error)
                cleanup();
                onError(error);
              }
            };

            // The cancel function returned:
            return () => {
              ipcRenderer.send(`${claudeCodeChannels.chatStream}:cancel`, requestId);
              // Call cleanup with a flag indicating it's a deliberate cancellation
              // or let the main process's ack of cancellation handle the final `onError` or `onDone`.
              // For now, let the main process dictate the end state after cancel.
              // If main process just disappears, the check in cleanup will trigger onError.
              if (!streamEndedNaturally) { // If not already ended, mark as system cancelled.
                  // This specific onError call in cancel path is tricky because onError itself might try to send via IPC again.
                  // It's better if the main process's acknowledgement of cancel or its disappearance reliably triggers the error.
                  console.log(`[Claude IPC Preload] User cancelled stream ${requestId}. Cleanup will occur when main process confirms or connection breaks.`);
              }
              cleanup(); // Clean up listeners immediately on client-side cancel.
            };
            ```

3.  **In `src/main-claude-websocket.ts` (`claude-code:chat-stream` handler):**
    *   **Send Error on Abrupt WebSocket Closure:**
        *   Add a flag `streamTerminatedByBridge` (scoped to each stream request). Set it to `true` when `claude_stream_done` or `claude_stream_error` is received from the bridge.
        *   Modify `ws.on('close', ...)`:
            ```javascript
            let streamTerminatedByBridge = false; // Add this flag inside the ipcMain.on scope

            // When 'claude_stream_done' or 'claude_stream_error' is received from bridge:
            // streamTerminatedByBridge = true;

            ws.on('close', () => {
              log(`[Main Process] WebSocket closed for request: ${requestId}, session: ${sessionId}`);
              activeConnections.delete(id); // Use 'id' which is the bridge's request id.
              const sessionData = activeClaudeSessions.get(sessionId);
              if (sessionData && sessionData.requestId === id) {
                // This specific request for the session is now closed.
                // Don't delete session from activeClaudeSessions, as PTY might live
