Okay, let's figure out how to prevent your Vite dev server from rebuilding and discuss how to handle interruptions if they still occur, especially with long-running Claude Code CLI processes.

## Preventing Rebuilds in Vite + Electron Forge

The "build started..." message in your log (`docs/logs/20250529/2223-rebuild-serverlog.md`) clearly indicates that Vite is rebuilding one of your Electron process bundles (likely the main process, given the output `main.js`). Even with HMR disabled for the renderer, Vite's dev server or build watcher will still monitor files for changes and trigger rebuilds.

Here's how to configure Vite to minimize or completely stop these rebuilds during development:

**1. Identify the Vite Configs:**
You have multiple Vite configuration files for different Electron processes:
*   `vite.main.config.ts` (for the Electron main process)
*   `vite.preload.config.ts` (for preload scripts)
*   `vite.renderer.config.mts` (for the Electron renderer process)

The rebuild log points to the main process (`.vite/build/main.js`), so `vite.main.config.ts` is a primary target. However, if you want to prevent rebuilds for the renderer as well (e.g., if editor changes there also cause issues), you'll apply similar changes to `vite.renderer.config.mts`.

**2. Disable File Watching:**

   **For the Main Process (and Preload Scripts if necessary):**
   Electron Forge's Vite plugin typically uses Vite's `build` command with a watcher for the main and preload scripts. To disable this, modify `vite.main.config.ts` (and `vite.preload.config.ts`):

   ```typescript
   // vite.main.config.ts (and/or vite.preload.config.ts)
   import { defineConfig } from 'vite';
   // ... other imports

   export default defineConfig({
     // ... other configurations ...
     build: {
       // ... other build options ...
       watch: null, // This explicitly disables the watcher during `vite build --watch`
     },
     // As a fallback, or if the plugin uses Vite's dev server for main (less common):
     server: {
       watch: null, // Disables watcher for Vite's dev server
     },
   });
   ```

   **For the Renderer Process:**
   The renderer process uses Vite's dev server. You've mentioned disabling HMR. To also stop the server from watching files for rebuilds, modify `vite.renderer.config.mts`:

   ```typescript
   // vite.renderer.config.mts
   import { defineConfig } from 'vite';
   // ... other imports

   export default defineConfig({
     // ... other configurations ...
     server: {
       hmr: false, // Ensure HMR is off
       watch: null, // This disables Vite's file watcher for the dev server
     },
   });
   ```

   **Important Considerations for Disabling Watchers:**
   *   **No Automatic Updates:** With watchers disabled, changes you make to the source code will **not** automatically trigger a rebuild or reload. You will need to manually stop and restart the development server (`pnpm start`) to see your changes.
   *   **Targeted Ignoring (Alternative):** If completely disabling watching is too disruptive, you can try to ignore specific paths that might be triggering unwanted rebuilds (like logs, temporary files from Claude CLI, or `node_modules`). This is less likely to fully prevent rebuilds if the Claude CLI or editor actions modify source files or files Vite is configured to watch.
     ```typescript
     // Example for more targeted ignoring (less aggressive)
     server: {
       watch: {
         ignored: [
           '**/node_modules/**',
           '**/.vite/**',
           '**/dist/**',
           '**/logs/**', // Add any directories Claude CLI might write to
           '**/*.tmp',   // Example for temporary files
           // Add specific paths related to your "Claude codes" if they write files
         ],
       },
     },
     // Similar `ignored` array can be used in `build.watch` if it takes Chokidar options
     build: {
        watch: { // This structure assumes `build.watch` accepts Chokidar options
           ignored: ['**/logs/**', '**/.git/**'],
        }
     }
     ```

**3. Check `forge.config.ts`:**
   The Electron Forge Vite plugin configuration in `forge.config.ts` could potentially override parts of your individual Vite configs. Review the `plugins` array, specifically the `@electron-forge/plugin-vite` section, for any `devServer` or `build` options that might influence watching. However, the primary control should be within the Vite config files themselves as shown above.

By setting `watch: null` in the appropriate `server` or `build` sections of your Vite configurations, you should be able to prevent Vite from automatically rebuilding.

## Smartly Continuing Interrupted Processes

If a rebuild *does* occur (or if you choose a less aggressive watch-ignoring strategy), making a long-running process like the Claude Code CLI "smartly continue" is challenging due to Electron's process model. When the Electron main process reloads, its state and connections are typically lost.

Your current architecture, using an **external `Claude Bridge Service`** (`src/services/claude-bridge-service.js`) that communicates with Electron via WebSockets, is the correct fundamental approach for decoupling the CLI's lifecycle from Electron's.

Here's how to enhance it for better resilience against Electron app reloads:

**1. Ensure Bridge Service and Claude CLI Persistence:**
   *   **Bridge Service:** The `claude-bridge-service.js` (started by `pnpm bridge`) is a separate Node.js process. It should ideally remain running even if the Electron app restarts.
   *   **Claude CLI (PTY Process):** When `claude-bridge-service.js` spawns the `@anthropic-ai/claude-code` CLI using `node-pty`, this PTY process should also ideally persist if the WebSocket connection from Electron Main to the Bridge Service drops due to an Electron reload. The bridge service should not automatically kill the PTY process just because a WebSocket client disconnects. It should only kill a PTY if explicitly told to (e.g., by a cancel request or if the original task completes/errors).

**2. Stateful Bridge Service:**
   The `claude-bridge-service.js` needs to be more stateful regarding the CLI processes it manages:
   *   **Task Mapping:** Maintain a map of ongoing tasks. When Electron requests a Claude CLI operation, it sends a `requestId` (as it currently does for streams) and its `sessionId` (from `useCoderChat` via `CoderPane`). The bridge should associate this `sessionId` with the spawned PTY process and the Claude CLI's internal session ID (if the CLI exposes one, e.g., after an initial run or if using `--resume`).
   *   **Output Buffering (Optional but helpful):** If the WebSocket to Electron is down, the bridge could temporarily buffer output from the PTY.

**3. Electron Main Process Reconnection & Resumption (`main-claude-websocket.ts`):**
   *   **Reconnect:** When Electron's main process starts (or restarts), `setupClaudeWebSocketHandler` attempts to connect to the bridge service.
   *   **Session Resumption Query:** Upon successful reconnection, the Electron main process should communicate with the bridge regarding active Commander sessions. It could send a message to the bridge like: `{"type": "query_active_sessions", "sessionIds": ["session-from-pane-1", "session-from-pane-2"]}`.
   *   **Bridge Response:** The bridge would check its map of active PTY processes.
        *   If a PTY is still running for a given `sessionId`:
            *   The bridge could re-pipe the PTY's `stdout` to the new WebSocket connection for that `requestId`.
            *   It could send any buffered output.
            *   Crucially, for Claude Code CLI, it might be best to use the CLI's own session resumption. The bridge could potentially restart the `claude` command with `--resume <claude-session-id>` and pipe the output of this *new* (but resumed) process. This depends on how well the CLI handles session state and output replay.
        *   If no PTY is running for a `sessionId` (e.g., it finished or errored while Electron was down), the bridge reports this.

**4. UI Context Restoration (`CoderPane.tsx` and `useCoderChat.ts`):**
   *   The existing database persistence (handled by the bridge service for Claude Code interactions) is vital.
   *   When a `CoderPane` re-initializes after an Electron reload, `useCoderChat` attempts to load history for its `sessionId` from the database.
   *   If the main process successfully resumes an active stream/session with the bridge, new data will flow to the renderer and be appended to the chat.

**Key changes for the Bridge Service (`claude-bridge-service.js`):**

*   Modify how PTY processes are stored. Instead of just `activeConnections` for WebSockets, have a structure like `activeClaudeSessions: Map<string, { pty: IPty, claudeSessionId?: string, lastRequestId: string, bufferedOutput: string[] }>`, where the key might be the Commander `sessionId`.
*   When a WebSocket connection from Electron requests a stream for a `sessionId`:
    *   If a PTY for that `sessionId` is already running, attach the new WebSocket to its output.
    *   If not, spawn a new PTY, potentially using `claude --resume <saved-claude-session-id>` if the bridge stored it from a previous run for that Commander `sessionId`.
*   Do not kill PTYs on WebSocket `close` unless explicitly cancelled. PTYs should only terminate on `ptyProcess.onExit` or via an explicit cancellation from Electron.

**Summary for Smart Continuation:**

The path to "smartly continue" involves making the `Claude Bridge Service` the robust, long-lived manager of Claude CLI processes. Electron becomes a (potentially transient) client to this bridge. Database persistence ensures conversation history is safe, and session IDs (both Commander's and potentially Claude CLI's internal ones) are key to re-associating after Electron reloads. This is a significant enhancement to the bridge service's logic.

By combining the Vite watch disabling with a more resilient bridge service, you can achieve a development environment that is both stable (no unwanted rebuilds) and capable of gracefully handling necessary reloads without losing the state of long-running external AI tasks.
The log `docs/logs/20250529/2223-rebuild-serverlog.md` contains these lines around the "build started..." message:

```
[Main Process] Cancel request for: claude-code-stream-1748542810863-jaty0rbz5
[2025-05-29T18:21:09.713Z] Parsed Claude Message: type=assistant
[2025-05-29T18:21:09.713Z] Parsed Claude Message: type=result
[2025-05-29T18:21:09.728Z] PTY process exited with code: 0, signal: 0  <-- This is the PTY for the cancelled stream
[2025-05-29T18:21:10.615Z] Parsed Claude Message: type=assistant
[2025-05-29T18:21:10.615Z] Parsed Claude Message: type=result
[2025-05-29T18:21:10.633Z] PTY process exited with code: 0, signal: 0

build started...
[2025-05-29T18:22:21.580Z] Parsed Claude Message: type=assistant       <-- This is from a NEW PTY process after rebuild
[2025-05-29T18:22:21.582Z] Parsed Claude Message: type=result
[2025-05-29T18:22:21.619Z] PTY process exited with code: 0, signal: 0
✓ 1 modules transformed.
.vite/build/main.js  1,022.55 kB │ gzip: 202.35 kB
built in 25874ms.
```
The "PTY process exited" messages *before* "build started..." indicate that the PTY processes (running `claude`) were indeed terminated when their corresponding streams were cancelled or when the main process was preparing to reload. This means the bridge service, as currently implemented, likely does not keep PTYs alive across Electron main process restarts if the stream request is cancelled during shutdown, or if the bridge itself is restarted by `start-with-bridge.sh`.

For "smartly continue", the `claude-bridge-service.js` would need to:
1. Not kill the `ptyProcess` when its associated WebSocket from Electron Main closes *unexpectedly* (i.e., not due to a `cancel` IPC message or the task finishing).
2. Keep track of the `claude` CLI's own session ID (if any) for each Commander `sessionId` it's handling. This might involve parsing initial output from `claude` if it emits a session ID.
3. Upon a new WebSocket connection from Electron Main, if a `sessionId` is provided that the bridge recognizes as having a still-active (or resumable) `claude` PTY, it attempts to reconnect the data flow. This is the most complex part.

The easiest win for now is to prevent the rebuilds in the first place.The "build started..." message in your server log (`docs/logs/20250529/2223-rebuild-serverlog.md`) confirms that Vite is rebuilding your Electron main process bundle. This can be triggered by file changes, including those made by tools or editor actions.

Here's how you can configure your Vite setup to prevent these rebuilds and a strategy for making long-running processes more resilient:

## 1. Preventing Vite Rebuilds in Development

To stop Vite from watching files and triggering rebuilds, you need to modify the Vite configuration files for each Electron process.

**A. For the Main Process (and Preload Scripts):**
Electron Forge's Vite plugin usually uses Vite's build command with a watcher for the main and preload scripts. To disable this, modify `vite.main.config.ts` (and `vite.preload.config.ts` if needed):

```typescript
// src/vite.main.config.ts (and/or src/vite.preload.config.ts)
import { defineConfig } from 'vite';
// ... other imports

export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    // ... other configurations ...
    build: {
      // ... other build options ...
      // Disable the watcher in development mode to prevent rebuilds
      watch: isDevelopment ? null : undefined,
    },
    // As a safety net, if Vite's dev server were used for main (less common):
    server: isDevelopment ? {
      watch: null, // Disables watcher for Vite's dev server
    } : undefined,
  };
});
```
Setting `build.watch: null` explicitly tells Vite (when run with `--watch` flag by Electron Forge) not to watch files.

**B. For the Renderer Process:**
The renderer process uses Vite's dev server. To stop it from watching files (in addition to HMR being disabled):

```typescript
// src/vite.renderer.config.mts
import { defineConfig } from 'vite';
// ... other imports

export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    // ... other configurations ...
    server: isDevelopment ? {
      hmr: false, // Ensure HMR is off as you've done
      watch: null, // This disables Vite's file watcher for the dev server
    } : undefined,
  };
});
```

**Important Notes on Disabling Watchers:**
*   **Manual Restarts Needed:** With file watching disabled, any changes you make to your source code **will not** be reflected automatically. You will need to **manually stop and restart the development server** (`pnpm start`) to see your code changes.
*   **Targeted Ignoring (Alternative):** If a full watch disable is too disruptive for general development, you could try to specifically ignore directories where non-source files are written (e.g., logs, Claude CLI output directories if known) using the `ignored` option within `watch`. However, this might not catch all rebuild triggers.
    ```typescript
    // Example for server.watch or build.watch Chokidar options
    watch: {
      ignored: [
        '**/node_modules/**', '**/.vite/**', '**/dist/**',
        '**/logs/**', // Your log directory
        // Add other paths that might be modified by external tools
      ]
    }
    ```

These changes should significantly reduce or eliminate automatic rebuilds. Remember the trade-off: you lose automatic updates for code changes.

## 2. Smartly Continuing Interrupted Processes (Claude Code CLI)

If a rebuild *does* occur (or if you're trying to make the system robust against crashes/restarts), making a long-running process like the Claude Code CLI "smartly continue" involves ensuring the external `Claude Bridge Service` can manage the CLI process lifecycle independently of Electron's main process state.

Your current architecture with the `Claude Bridge Service` (`src/services/claude-bridge-service.js`) is a good foundation. Here’s how to enhance it:

**A. Bridge Service Enhancements:**

1.  **Persistent CLI Processes:**
    *   The `Claude Bridge Service` is a separate Node.js process. When the Electron main process (its WebSocket client) disconnects (e.g., due to an Electron reload), the bridge service should **not** automatically terminate the `node-pty` process running the Claude CLI. The PTY process should continue running.
    *   The `start-claude-bridge.sh` script likely starts the bridge so it persists. Ensure the PTY process itself isn't tied to the WebSocket connection's lifecycle within `claude-bridge-service.js`.

2.  **Stateful Task Management in Bridge:**
    *   The bridge service needs to maintain a state map for active Claude CLI tasks. This map could be keyed by the `sessionId` that originates from `CoderPane` (and is passed through `main-claude-websocket.ts` to the bridge).
    *   For each `sessionId`, store:
        *   The `ptyProcess` instance.
        *   The Claude CLI's internal session ID (if available/retrievable from CLI output or if `--resume` returns one).
        *   The `requestId` of the last WebSocket message from Electron for this task.
        *   A buffer for any output received from the PTY while the Electron WebSocket was disconnected.

3.  **Reconnection and Session Resumption Logic:**
    *   When a new WebSocket connection comes from Electron's `main-claude-websocket.ts`:
        *   If the connection request includes a `sessionId` that the bridge service recognizes as having an active (or recently active) PTY:
            *   The bridge should re-associate the new WebSocket with the existing PTY process.
            *   It should send any buffered output from the PTY over the new WebSocket.
            *   It should continue streaming live output from the PTY.
            *   **Claude CLI Session Resume:** If the Claude CLI has a robust session resume feature (e.g., `claude --resume <claude-session-id>`), the bridge might need to:
                1.  Store the Claude CLI session ID when a task starts.
                2.  If Electron reconnects and the original PTY died or is in an unknown state, the bridge could attempt to spawn a *new* PTY process with the `--resume` flag using the stored Claude session ID. This is often more reliable than trying to re-attach to an old PTY's raw output stream if the CLI itself manages session state well.

**B. Electron Main Process (`main-claude-websocket.ts`) Enhancements:**

1.  **Pass `sessionId` to Bridge:**
    *   Ensure the `sessionId` from `params` (originating from `CoderPane` -> `useCoderChat`) is consistently sent to the `Claude Bridge Service` with every CLI command request. Your log shows this is already being done for stream requests, which is good. The bridge will use this `sessionId` to identify and manage the task.
        ```javascript
        // In main-claude-websocket.ts, when sending to bridge:
        // ws.send(JSON.stringify({ id: requestId, args, sessionId: params.sessionId }));
        ```
        (This appears to be missing in your current `main-claude-websocket.ts` for streaming; `params.sessionId` is logged but not explicitly passed in the WebSocket message to the bridge. It should be added to the payload sent to the bridge.)

2.  **Query Task Status on Reconnect:**
    *   When `setupClaudeWebSocketHandler` establishes a new connection to the bridge (especially after a main process restart), it could send a message to query the status of tasks associated with active `CoderPane` session IDs. The UI would then need to reconcile its state.

**C. Database Persistence:**
Your existing message persistence via the bridge service to PGlite is crucial. This ensures that even if a live stream cannot be perfectly resumed, the conversation history up to the point of interruption is saved and can be reloaded by the `CoderPane`.

**Consideration from Logs:**
The log `docs/logs/20250529/2223-rebuild-serverlog.md` shows "PTY process exited" *before* "build started...". This means when the stream was cancelled (likely due to the main process shutting down for a reload), the PTY was also terminated.
To achieve smart continuation, the `claude-bridge-service.js` **must not** terminate the PTY process when its WebSocket client from Electron disconnects, unless it was an explicit cancellation request from the user for that specific task.

**Example Conceptual Flow for Smart Resume:**
1.  User initiates a Claude Code task in `CoderPane` (Session ID: `S1`, Electron Request ID: `R1`).
2.  Electron Main sends `{ requestId: R1, sessionId: S1, args: [...] }` to Bridge.
3.  Bridge spawns `claude ...` (PTY_S1), stores Claude's internal session ID (e.g., `C_SESS_1`), maps `S1` to `PTY_S1` and `C_SESS_1`.
4.  Bridge streams output from `PTY_S1` to Electron Main via WebSocket for `R1`.
5.  **Electron Main Process Rebuilds/Restarts.**
6.  Old WebSocket (for `R1`) closes. Bridge notes this but *keeps `PTY_S1` running*. Buffers any new output from `PTY_S1`.
7.  New Electron Main Process starts, `CoderPane` for `S1` re-initializes, requests a new stream (new Electron Request ID: `R2`) for `S1`.
8.  Electron Main sends `{ requestId: R2, sessionId: S1, args: [...] }` to Bridge.
9.  Bridge sees `S1` has an active `PTY_S1` (or knows `C_SESS_1`):
    *   **Option A (Re-pipe):** Sends buffered output from `PTY_S1` on new WebSocket for `R2`, then continues live stream.
    *   **Option B (CLI Resume):** Kills `PTY_S1`. Spawns new `claude --resume C_SESS_1` (new PTY_S1_Resumed). Streams output from `PTY_S1_Resumed` to Electron Main via WebSocket for `R2`. This is generally more robust if the CLI supports it well.
10. User sees the task continue or resume in `CoderPane`.

By implementing these changes, you can make your development process smoother by preventing unwanted rebuilds, and make your application more resilient for users if interruptions do occur. The external bridge service is key to the "smartly continue" part.
