# Claude Code CLI Integration & Bridge Service System

## Table of Contents
1.  [Overview](#1-overview)
2.  [Architecture Diagram](#2-architecture-diagram)
3.  [Component Breakdown](#3-component-breakdown)
    3.1.  [Electron Renderer Process Components](#31-electron-renderer-process-components)
    3.2.  [Electron Main Process Components](#32-electron-main-process-components)
    3.3.  [Claude Bridge Service (External Node.js Process)](#33-claude-bridge-service-external-nodejs-process)
    3.4.  [`@anthropic-ai/claude-code` CLI (External Subprocess)](#34-anthropic-ai--claude-code-cli-external-subprocess)
4.  [Communication Protocols & Data Flow](#4-communication-protocols--data-flow)
    4.1.  [Renderer to Main Process (Electron IPC)](#41-renderer-to-main-process-electron-ipc)
    4.2.  [Main Process to Bridge Service (WebSocket)](#42-main-process-to-bridge-service-websocket)
    4.3.  [Bridge Service to Claude CLI (node-pty)](#43-bridge-service-to-claude-cli-node-pty)
5.  [Key Functionalities](#5-key-functionalities)
    5.1.  [Chat Completions (Streaming & Non-Streaming)](#51-chat-completions-streaming--non-streaming)
    5.2.  [Tool Use / Function Calling](#52-tool-use--function-calling)
    5.3.  [Message and Session Persistence (via Bridge Service)](#53-message-and-session-persistence-via-bridge-service)
6.  [Configuration Management](#6-configuration-management)
7.  [Error Handling](#7-error-handling)
8.  [Security Considerations](#8-security-considerations)
9.  [Database Integration Details](#9-database-integration-details)
10. [Testing Strategies](#10-testing-strategies)
11. [Resilient Session Management (NEW)](#11-resilient-session-management-new)
    11.1. [Overview](#111-overview)
    11.2. [Key Features](#112-key-features)
    11.3. [Implementation Details](#113-implementation-details)
    11.4. [Development Mode Enhancements](#114-development-mode-enhancements)
12. [Troubleshooting & Known Issues](#12-troubleshooting--known-issues)
13. [Future Considerations](#13-future-considerations)

## 1. Overview

The Claude Code CLI Integration & Bridge Service system enables OpenAgents Commander to utilize the specialized coding capabilities of the `@anthropic-ai/claude-code` command-line tool. Due to Electron's security model and the complexities of managing long-running, network-dependent subprocesses (as highlighted in `docs/claude-code/compass_artifact_wf-*.md`), a multi-layered approach involving an external Node.js "bridge" service is employed.

This system allows Commander to:
-   Invoke the Claude Code CLI for chat completions, including streaming responses.
-   Integrate Claude Code CLI as a provider within the application's unified `AgentLanguageModel` AI backend.
-   Persist chat sessions and messages related to Claude Code CLI interactions into the shared PGlite database.
-   Handle potential tool use (function calling) if supported by the CLI and models.

The architecture prioritizes offloading the direct management of the Claude CLI subprocess to an external Node.js environment, which communicates with the Electron application via WebSockets. This bypasses certain Electron limitations and provides a more robust environment for the CLI tool.

## 2. Architecture Diagram

(Adapted from `docs/systems/message-persistence-architecture.md`, focusing on Claude Code integration)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Commander Application (Electron)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐         ┌─────────────────────────┐              │
│  │   Renderer Process       │         │    Main Process         │              │
│  │                          │   IPC   │                         │              │
│  │  ┌──────────────────┐   │◄────────►│  ┌─────────────────┐  │              │
│  │  │ AgentChatPane    │   │         │  │ ClaudeCode IPC  │  │              │
│  │  │ (uses AgentLang-  │   │         │  │ Listeners       │  │              │
│  │  │  Model via Orche- │   │         │  │ (main-claude-   │  │              │
│  │  │  stratorService) │   │         │  │  websocket.ts)  │  │              │
│  │  └──────────┬───────┘   │         │  └─────────┬────────┘  │              │
│  │             │           │         │            │ Uses      │              │
│  │             ▼           │         │            ▼           │              │
│  │  ┌──────────────────┐   │         │  ┌─────────────────┐  │              │
│  │  │ ClaudeCodeCli    │   │         │  │ WebSocket Client│  │              │
│  │  │ AgentLanguage-   │   │         │  │ (to Bridge Svc) │  │              │
│  │  │ ModelLive        │   │         │  └─────────────────┘  │              │
│  │  │ (IPC to Main)    │   │         └─────────────────────────┘              │
│  │  └──────────────────┘   │                                                │
│  └─────────────────────────┘                                                │
│                                                                                 │
└────────────────────────────┬────────────────────────────────────────────────────┘
                             │ WebSocket (localhost:45671)
                             │ (Claude CLI commands & DB ops)
                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Claude Bridge Service (External Node.js Process)            │
│                          (`src/services/claude-bridge-service.js`)              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐         ┌─────────────────────────┐              │
│  │ WebSocket Server        │         │ PGlite DB Client        │              │
│  │ (Handles requests from  │         │ (Direct DB Access,      │              │
│  │  Electron Main Process) │         │  Schema Mgmt, Queries)  │              │
│  └──────────┬──────────────┘         └──────────┬──────────────┘              │
│             │                                    │ Connects to                 │
│             │                                    └────────┐                    │
│             │ Spawns & Manages                   ┌────────▼───────────┐        │
│             ▼                                    │ PGlite Database    │        │
│  ┌─────────────────────────┐                     │ (File System:      │        │
│  │ node-pty                │                     │  ~/.config/Commander/│        │
│  │ (Spawns Claude CLI)     │                     │  commander-data/   │        │
│  └──────────┬──────────────┘                     │  database/main_v1) │        │
│             │                                    └────────────────────┘        │
│             │ stdin/stdout/stderr                                               │
│             ▼                                                                 │
│  ┌─────────────────────────────────────────────────┐                            │
│  │ @anthropic-ai/claude-code CLI (Subprocess)      │                            │
│  └────────────────────┬────────────────────────────┘                            │
│                       │ HTTP/S                                                  │
│                       ▼                                                         │
│  ┌─────────────────────────────────────────────────┐                            │
│  │ Anthropic API Servers                           │                            │
│  └─────────────────────────────────────────────────┘                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

```

## 3. Component Breakdown

### 3.1. Electron Renderer Process Components

-   **`AgentChatPane.tsx`**: The primary UI for chat. It uses the `useAgentChat` hook.
-   **`useAgentChat.ts` Hook**:
    -   Manages chat state (messages, loading, errors).
    -   Interacts with `ChatOrchestratorService` to send messages and receive streamed responses.
    -   When "Claude Code (CLI)" is selected as the provider, `ChatOrchestratorService` will route requests to `ClaudeCodeCliAgentLanguageModelLive`.
-   **`ClaudeCodeCliAgentLanguageModelLive.ts` (`src/services/ai/providers/claude_code_cli/`)**:
    -   Implements the `AgentLanguageModel.Tag` interface.
    -   Converts `AgentLanguageModel` method calls (e.g., `streamText`) into IPC requests to the Electron main process using `window.electronAPI.claudeCode.streamChat()` (exposed via preload script).
    -   Adapts parameters to the format expected by the IPC bridge (ultimately for the Claude CLI).
    -   Receives streamed responses (or errors) from IPC and maps them to the `AiResponse` type (or `AiProviderError`).
-   **IPC Context Exposer (`src/helpers/ipc/claude_code/claude-code-context.ts` & `src/helpers/ipc/context-exposer.ts`):**
    -   The preload script (`src/preload.ts`) calls `exposeContexts()`.
    -   `exposeContexts()` calls specific exposers like `exposeClaudeCodeContext()`.
    -   `exposeClaudeCodeContext()` uses `contextBridge.exposeInMainWorld("electronAPI.claudeCode", ...)` to provide renderer-safe functions for invoking Claude Code related IPC channels.
    -   These functions handle the low-level `ipcRenderer.invoke` or `ipcRenderer.send/on` logic for communication with the main process.

### 3.2. Electron Main Process Components

-   **Claude Code IPC Listeners (`src/main-claude-websocket.ts` -> `setupClaudeWebSocketHandler()` called from `src/main.ts`):**
    -   **Non-streaming (`claude-code:chat-completion` channel):**
        -   Receives requests from the renderer via `ipcMain.handle`.
        -   Directly spawns the `@anthropic-ai/claude-code` CLI using `child_process.spawn` for simple, non-interactive commands. This handler is a **fallback/alternative** to the WebSocket bridge for potentially simpler, non-streaming requests.
        -   _Note: The primary streaming mechanism now uses the WebSocket bridge._
    -   **Streaming (`claude-code:chat-stream` channel):**
        -   Receives requests from the renderer via `ipcMain.on`.
        -   Establishes a WebSocket connection to the external `Claude Bridge Service` (running on `ws://localhost:45671`).
        -   Sends a JSON message to the bridge service containing the `requestId` and CLI arguments.
        -   Listens for `claude_stream_chunk`, `claude_stream_done`, `claude_stream_error` messages from the bridge service over WebSocket.
        -   Relays these messages back to the originating renderer window using `event.sender.send()`.
        -   Handles stream cancellation requests from the renderer by closing the WebSocket connection or sending a cancel message to the bridge.
-   **Database Proxying Logic (in `main-claude-websocket.ts`):**
    -   The main process handlers for saving sessions and messages (`saveSessionToDatabase`, `saveMessageToDatabase`, etc.) also use the WebSocket bridge to delegate these operations to the `Claude Bridge Service`, which has direct PGlite access.
-   **IPC Channel Definitions (`src/helpers/ipc/claude_code/claude-code-channels.ts`):**
    -   Defines constants for channel names (e.g., `CLAUDE_CODE_CHAT_STREAM_CHANNEL`).

### 3.3. Claude Bridge Service (External Node.js Process)
-   **File:** `src/services/claude-bridge-service.js`
-   **Purpose:** A standalone Node.js script that acts as a bridge between the Electron main process and the Claude Code CLI, and also directly manages database operations.
-   **Key Components:**
    -   **WebSocket Server:**
        -   Listens on `ws://localhost:45671`.
        -   Handles incoming messages from the Electron main process.
        -   Differentiates between Claude CLI command requests and database operation requests based on message `type`.
    -   **Claude CLI Execution (`node-pty`):**
        -   Receives CLI arguments from Electron.
        -   Uses `node-pty` to spawn the `@anthropic-ai/claude-code` CLI as a pseudo-terminal, which can be more robust for interactive CLIs than `child_process`.
        -   Forces `--output-format stream-json` for streaming.
        -   Captures `stdout` from the CLI.
        -   Parses the line-separated JSON objects from `stream-json` output.
        -   Sends each parsed JSON object (chunk) back to the Electron main process over WebSocket.
        -   Handles CLI exit and error events, relaying them back.
    -   **PGlite Database Client:**
        -   Initializes a `PGlite` client instance using the **synchronized database path** (same as Electron's main process).
        -   Executes SQL queries received from Electron (via WebSocket) for saving sessions, messages, and tool executions.
        -   Handles schema creation and basic migrations (e.g., adding missing columns).
    -   **Path Management:**
        -   Calculates the database directory path in a platform-aware manner to match `app.getPath("userData")` used by Electron, ensuring both processes access the same database file. (Fix `024-database-path-synchronization.md`)
    -   **Logging:** Writes logs to `claude-bridge-service.log` in the user's home directory.

### 3.4. `@anthropic-ai/claude-code` CLI (External Subprocess)
-   The actual command-line tool provided by Anthropic.
-   Spawned by the `Claude Bridge Service` using `node-pty`.
-   Interacts with Anthropic's backend APIs.
-   Requires `ANTHROPIC_API_KEY` environment variable (passed by the bridge service).
-   Its `stdout` (especially in `stream-json` mode) is the source of data for streaming back to the application.

## 4. Communication Protocols & Data Flow

### 4.1. Renderer to Main Process (Electron IPC)
-   **Channel:** `claude-code:chat-stream` (for streaming), `claude-code:chat-completion` (for non-streaming).
-   **Payload (`ClaudeExecParams` type in `src/types.d.ts`):**
    ```typescript
    interface ClaudeExecParams {
      messages: Array<{role: string; content: string}>;
      model?: string;
      max_tokens?: number;
      temperature?: number;
      sessionId?: string; // For DB persistence
      // ... other CLI compatible params ...
    }
    ```
-   **Streaming Flow:**
    1.  Renderer calls `window.electronAPI.claudeCode.streamChat(params, onChunk, onDone, onError)`.
    2.  Preload script sends message to main process on `claude-code:chat-stream` with `requestId` and `params`.
    3.  Main process listens for `${channel}:chunk`, `${channel}:done`, `${channel}:error` events from renderer, tagged with `requestId`.

### 4.2. Main Process to Bridge Service (WebSocket)
-   **URL:** `ws://localhost:45671`
-   **Message Format (Main -> Bridge for CLI command):**
    ```json
    {
      "id": "unique-request-id-from-ipc", // Passed through from renderer
      "args": ["-p", "prompt text", "--output-format", "stream-json", ...] // Array of CLI arguments
    }
    ```
-   **Message Format (Main -> Bridge for DB operation):**
    ```json
    {
      "type": "db",
      "id": "db-request-id",
      "operation": "saveMessage", // e.g., "saveSession", "getMessagesForSession"
      "params": { /* operation-specific parameters */ }
    }
    ```
-   **Message Format (Bridge -> Main for CLI Stream Chunks):**
    ```json
    {
      "id": "unique-request-id-from-ipc",
      "type": "claude_stream_chunk",
      "payload": { /* Parsed JSON object from Claude CLI's stream-json output */ }
    }
    ```
-   **Message Format (Bridge -> Main for CLI Stream Done/Error):**
    ```json
    { "id": "unique-request-id-from-ipc", "type": "claude_stream_done", "exitCode": 0 }
    { "id": "unique-request-id-from-ipc", "type": "claude_stream_error", "error": "Error message" }
    ```
-   **Message Format (Bridge -> Main for DB Result/Error):**
    ```json
    { "id": "db-request-id", "type": "db_result", "result": { /* query result */ } }
    { "id": "db-request-id", "type": "db_error", "error": "Error message" }
    ```

### 4.3. Bridge Service to Claude CLI (node-pty)
-   Standard `stdin`, `stdout`, `stderr` interaction with the spawned CLI process.
-   Bridge service passes arguments and environment variables (like `ANTHROPIC_API_KEY`) when spawning.
-   Reads `stream-json` output from CLI's `stdout`.

## 5. Key Functionalities

### 5.1. Chat Completions (Streaming & Non-Streaming)
-   The `ClaudeCodeCliAgentLanguageModelLive` implements `streamText` and `generateText`.
-   **Streaming:**
    -   Uses the `claude-code:chat-stream` IPC channel.
    -   Bridge service uses `node-pty` and parses `stream-json` output.
    -   Chunks are relayed back to the renderer and progressively update the UI.
-   **Non-Streaming (Fallback):**
    -   Uses the `claude-code:chat-completion` IPC channel.
    -   Main process handler uses `child_process.spawn` (simpler for single response).
    -   Entire response is returned as a single payload.

### 5.2. Tool Use / Function Calling
-   Claude Code CLI supports tools.
-   The system is designed to handle this:
    1.  `ClaudeCodeCliAgentLanguageModelLive` formats tools from `AiToolkit` into the CLI's expected format and includes them in the request.
    2.  The CLI, if it decides to use a tool, will output a `tool_use` content block (as per Anthropic's format).
    3.  The bridge service parses this and sends it as part of a `claude_stream_chunk` payload.
    4.  The Electron main process relays this tool call information.
    5.  `ChatOrchestratorService` in the renderer receives the `AiResponse` containing `toolCalls`.
    6.  It invokes `ToolHandlerService.executeTool()`.
    7.  The tool's result (stringified JSON) is sent back to the Claude Code CLI via another call through the same IPC/WebSocket/PTY chain, as a `role: "tool"` message.

### 5.3. Message and Session Persistence (via Bridge Service)
-   The Electron main process (`main-claude-websocket.ts`) is responsible for initiating database saves.
-   After receiving messages or completing interactions with the Claude CLI (via the bridge), it sends specific database operation requests (e.g., `saveSession`, `saveMessage`, `saveToolCall`) to the `Claude Bridge Service` over WebSocket.
-   The bridge service directly executes these PGlite operations using its own PGlite client instance that points to the shared database file.
-   This keeps direct database access outside of Electron's renderer and main process for this specific provider, centralizing it in the bridge.

## 6. Configuration Management
-   **`ConfigurationService` (`src/services/configuration/`):**
    -   Stores `ANTHROPIC_API_KEY` (as a secret).
    -   Stores `CLAUDE_CODE_CLI_PATH` (optional, if CLI is not in system `PATH`).
    -   Stores `CLAUDE_CODE_PROVIDER_ENABLED` and `CLAUDE_CODE_DEFAULT_MODEL`.
-   **Bridge Service (`claude-bridge-service.js`):**
    -   Reads `ANTHROPIC_API_KEY` from its own environment variables (which Electron main process should ensure are set when spawning the bridge, or the bridge reads from system env).
    -   Hardcoded WebSocket port (`45671`).
    -   Computes DB path dynamically.

## 7. Error Handling
-   **CLI Errors:** Bridge service captures `stderr` and non-zero exit codes from `node-pty`, sending them as `claude_stream_error` messages over WebSocket.
-   **WebSocket Errors:** Electron main process handles WebSocket connection errors or errors sent by the bridge, propagating them to the renderer via IPC.
-   **IPC Errors:** Renderer-side IPC stubs (`claude-code-context.ts`) handle `invoke` rejections or error events from `on` listeners.
-   **`ClaudeCodeCliAgentLanguageModelLive`:** Maps all received errors to typed `AiProviderError`s.
-   **Database Errors:** Bridge service catches PGlite errors and sends them as `db_error` WebSocket messages. Main process relays these.

## 8. Security Considerations
-   The `Claude Bridge Service` is a local WebSocket server. Access should be restricted to `localhost`.
-   `ANTHROPIC_API_KEY` must be handled securely. It's passed to the bridge service's environment, which then passes it to the Claude CLI environment.
-   SQL queries in the bridge service must use parameterized statements to prevent SQL injection (as per `docs/fixes/024-database-path-synchronization.md`).
-   The bridge service, having direct file system and network access, should be as minimal as possible and only expose necessary functionality.

## 9. Database Integration Details
-   **Shared Path:** Both the `PGLiteService` in Electron's main process (for general app data) and the PGlite client in `claude-bridge-service.js` (for Claude-specific message persistence) are configured to use the same base directory structure derived from `app.getPath("userData")`, ensuring they can access the same `main_v1` database file. See `docs/fixes/024-database-path-synchronization.md`.
-   **Schema Management:** The `claude-bridge-service.js` includes `CREATE TABLE IF NOT EXISTS` statements and `ALTER TABLE ADD COLUMN IF NOT EXISTS` for basic schema creation and migration of `sessions`, `messages`, and `tool_executions` tables relevant to its interactions.

## 10. Testing Strategies
-   **Bridge Service (`claude-bridge-service.js`):**
    -   Unit test WebSocket message handling logic.
    -   Unit test CLI argument building.
    -   Integration test PTY interaction with a mock CLI script.
    -   Integration test database operations with an in-memory PGlite instance.
-   **Electron Main Process (`main-claude-websocket.ts`):**
    -   Unit test IPC handlers by mocking `event.sender` and the WebSocket client.
-   **Renderer (`ClaudeCodeCliAgentLanguageModelLive.ts`):**
    -   Unit test by mocking `window.electronAPI.claudeCode`.
-   **E2E (Playwright):**
    -   Requires the bridge service to be running.
    -   Test full chat flow, including streaming and persistence, by selecting "Claude Code (CLI)" provider in `AgentChatPane`.
    -   Requires a valid `ANTHROPIC_API_KEY` and installed `@anthropic-ai/claude-code` CLI in the test environment.

## 11. Resilient Session Management (NEW)

### 11.1. Overview
As of the latest implementation, the Claude Bridge Service now supports **resilient session management** that allows Claude CLI processes to survive Electron application restarts. This addresses the issue of long-running Claude Code tasks being interrupted by Vite rebuilds or manual Electron restarts during development.

### 11.2. Key Features
-   **PTY Process Persistence:** PTY processes spawned for Claude CLI are no longer automatically terminated when the WebSocket connection from Electron closes.
-   **Session Tracking:** Active sessions are tracked using the `sessionId` passed from the renderer through IPC.
-   **Output Buffering:** When Electron is disconnected, CLI output is buffered in memory for later delivery.
-   **Automatic Reconnection:** When Electron reconnects with the same `sessionId`, it automatically receives any buffered output and continues streaming new output.
-   **Explicit Cancellation:** PTY processes are only terminated upon explicit cancel requests or natural completion.

### 11.3. Implementation Details

#### Session State Management
```javascript
// Bridge service maintains two key data structures:
const activeClaudeSessions = new Map(); 
// Map<sessionId, { pty, requestId, bufferedOutput, claudeSessionId }>

const activeConnections = new Map(); 
// Map<requestId, ws>
```

#### Enhanced Message Protocol
The WebSocket protocol between Electron main and bridge service now includes:
-   **Session ID in requests:** `{ id: requestId, args: [...], sessionId: "..." }`
-   **Cancel messages:** `{ type: 'cancel', requestId: "..." }`
-   **Session query:** `{ type: 'query_active_sessions', sessionIds: [...] }`
-   **Health check includes session count:** `{ type: 'health', ..., activeSessions: N }`

#### Reconnection Flow
1. Electron main process sends request with `sessionId`
2. Bridge checks if session exists and has active PTY
3. If yes: Updates requestId mapping, sends buffered output, resumes streaming
4. If no: Spawns new PTY process and creates session entry

### 11.4. Development Mode Enhancements
To prevent Vite from interrupting Claude Code sessions during development:
-   **Vite configs modified:** All three Vite configs (main, preload, renderer) now set `watch: null` in development mode
-   **Manual restart required:** Developers must manually restart the dev server to see code changes
-   **Trade-off:** Stability over convenience during Claude Code usage

## 12. Troubleshooting & Known Issues
-   **CLI Not Found:** The bridge service includes fallback paths but relies on user installation. Error messages guide the user.
-   **Authentication Errors:** If `claude auth` hasn't been run or API key is invalid, CLI will fail. Errors are propagated.
-   **Bridge Service Not Running:** Electron main process checks for bridge availability and reports error if not found. `pnpm bridge` and `pnpm bridge:stop` scripts manage the bridge service.
-   **Database Path Mismatches:** Previously an issue, resolved by synchronized path calculation.
-   **Timeout Issues:** Addressed by setting a timeout in `main-claude-websocket.ts` for the utility process, and the bridge service itself could implement timeouts for PTY interactions.
-   **Session Buffer Overflow:** Currently no limit on buffered output size. In production, consider implementing a circular buffer or size limit.
-   **Orphaned Sessions:** Sessions are kept indefinitely. Consider implementing TTL or cleanup mechanism for old sessions.

## 13. Future Considerations
-   **SDK Usage in Bridge:** Evaluate replacing direct `node-pty` interaction in the bridge with Jason Kneen's Claude Code SDK for better abstraction and type safety, if performance allows.
-   **Dynamic Port for Bridge:** Allow configuration of the WebSocket port for the bridge service.
-   **Health Check Endpoint:** The bridge service has a basic `health` check; this could be expanded to include session details.
-   **More Robust Error Codes:** Standardize error codes exchanged between Electron and the bridge.
-   **Alternative to External Bridge:** Re-evaluate `UtilityProcess` from Electron if its network/subprocess capabilities improve sufficiently for direct CLI management from the main process.
-   **Claude CLI Resume Feature:** The infrastructure is ready to support `claude --resume <session-id>` when the CLI provides session IDs in its output.
-   **Session Persistence:** Save session state to disk to survive bridge service restarts.
-   **Resource Management:** Implement limits on concurrent sessions, buffer sizes, and session lifetimes.

This system, while complex due to the multi-process architecture, provides a robust and isolated way to integrate the powerful Claude Code CLI into OpenAgents Commander, treating it as just another AI provider within the application's flexible AI backend.
