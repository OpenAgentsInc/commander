# Rebuild Prevention and Process Resilience Implementation Log

## Overview
Implementing changes to prevent Vite rebuilds during development and enhance the Claude Bridge Service for better resilience across Electron restarts.

## Implementation Steps

### 1. Disabling Vite File Watching ✅

Starting with modifying the Vite configuration files to prevent automatic rebuilds when files change.

#### vite.main.config.mts
- Modified to use a function config that checks for development mode
- Added `build.watch: null` to disable file watching during builds
- Added `server.watch: null` as a safety net

#### vite.preload.config.mts
- Modified to use a function config that checks for development mode
- Added `build.watch: null` to disable file watching during builds
- Added `server.watch: null` as a safety net

#### vite.renderer.config.mts
- Modified to use a function config that checks for development mode
- Changed `server.watch` to `null` in development mode (was previously using ignored patterns)
- Kept the ignored patterns for non-development modes

**Important Note**: With these changes, developers will need to manually restart the dev server (`pnpm start`) to see code changes reflected in the app.

### 2. Enhanced Claude Bridge Service for Process Resilience ✅

#### main-claude-websocket.ts Changes
- Added `sessionId` to WebSocket messages sent to bridge service
- Modified cancel handler to send explicit cancel message to bridge instead of just closing connection
- Added small delay after cancel to allow bridge to handle cancellation

#### claude-bridge-service.js Major Enhancements

##### New Data Structures
- Added `activeClaudeSessions` Map to track sessions: `Map<sessionId, { pty, requestId, bufferedOutput, claudeSessionId }>`
- Added `activeConnections` Map to track WebSocket connections: `Map<requestId, ws>`

##### New Message Types Supported
1. **cancel** - Explicitly cancel a PTY process for a given requestId
2. **query_active_sessions** - Query which sessions have active PTY processes
3. Enhanced **health** check to include active session count

##### Session Management Features
1. **Session Persistence**: PTY processes are no longer automatically killed when WebSocket disconnects
2. **Output Buffering**: When WebSocket is disconnected, output is buffered for later delivery
3. **Session Resumption**: When Electron reconnects with same sessionId:
   - Existing PTY process is reused if still alive
   - Buffered output is sent to new connection
   - Claude session ID is captured from output for potential future --resume support

##### Refactored PTY Handling
- Created `attachPtyHandlers()` function to centralize PTY event handling
- Supports both connected and disconnected states
- Handles buffering when WebSocket is not available
- Preserves session info even after PTY exits normally

##### Key Behavioral Changes
- PTY processes continue running even if Electron main process restarts
- Only explicit cancel requests or process completion will terminate PTY
- Session state is maintained for potential resumption
- WebSocket disconnection does not kill running Claude CLI processes

### 3. Benefits of These Changes

1. **No Unwanted Rebuilds**: Developers can use Claude Code without triggering Vite rebuilds
2. **Resilient Long-Running Tasks**: Claude CLI processes survive Electron restarts
3. **Seamless Reconnection**: Users can continue seeing output after reconnection
4. **Future-Ready**: Infrastructure in place for Claude CLI's --resume feature

### 4. Testing Recommendations

1. Start the dev server with `pnpm start`
2. Make a code change and verify no automatic rebuild occurs
3. Test Claude Code with a long-running task
4. While task is running, manually restart Electron (not the bridge)
5. Verify that the task continues and output resumes in UI

### 5. Limitations and Future Work

1. **Manual Restarts Required**: Developers must manually restart to see code changes
2. **Claude CLI Resume**: The --resume feature integration is prepared but not fully implemented
3. **Buffer Limits**: No current limit on buffered output size (could be added if needed)
4. **Session Cleanup**: Old sessions are not automatically cleaned up (could add TTL)
