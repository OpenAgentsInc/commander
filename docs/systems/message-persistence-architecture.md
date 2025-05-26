# Message Persistence Architecture in Commander

## Table of Contents
1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Cross-Process Communication](#cross-process-communication)
7. [Message Lifecycle](#message-lifecycle)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)
11. [Testing & Debugging](#testing--debugging)
12. [Future Considerations](#future-considerations)

## Overview

The Commander message persistence system is a multi-process architecture designed to save chat messages, AI responses, and tool executions across Claude Code sessions. The system uses PGLite (an embeddable WASM PostgreSQL) as its database engine and implements a sophisticated cross-process communication pattern to work within Electron's security constraints. As of the latest implementation, the system supports real-time streaming of assistant responses, providing users with immediate feedback as messages are generated.

### Key Design Decisions

1. **PGLite over SQLite**: Chosen for its PostgreSQL compatibility, WASM portability, and advanced query capabilities
2. **WebSocket Bridge Pattern**: External Node.js service handles database operations to bypass Electron renderer restrictions
3. **Effect-based Service Layer**: Provides functional error handling, dependency injection, and composable service architecture
4. **Cross-Process Database Access**: Both Electron main process and external bridge service access the same database file
5. **Real-time Message Streaming**: Claude CLI's `stream-json` format enables incremental display of responses as they're generated

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Commander Application                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐         ┌─────────────────────────┐              │
│  │   Renderer Process       │         │    Main Process         │              │
│  │                          │   IPC   │                         │              │
│  │  ┌──────────────────┐   │◄────────►│  ┌─────────────────┐  │              │
│  │  │  React UI        │   │         │  │  IPC Handlers    │  │              │
│  │  │  - AgentChatPane │   │         │  │                  │  │              │
│  │  │  - PreviousChats │   │         │  └─────────┬────────┘  │              │
│  │  └──────────┬───────┘   │         │            │           │              │
│  │             │           │         │            ▼           │              │
│  │             ▼           │         │  ┌─────────────────┐  │              │
│  │  ┌──────────────────┐   │         │  │ DatabaseService │  │              │
│  │  │ DatabaseService  │   │         │  │ (Effect Layer)  │  │              │
│  │  │ WebSocketProxy   │   │         │  └─────────┬────────┘  │              │
│  │  └──────────┬───────┘   │         │            │           │              │
│  └─────────────┼───────────┘         │            ▼           │              │
│                │                      │  ┌─────────────────┐  │              │
│                │                      │  │   PGLiteService │  │              │
│                │                      │  │   (Main Process)│  │              │
│                │                      │  └─────────┬────────┘  │              │
│                │                      └────────────┼───────────┘              │
│                │                                   │                          │
└────────────────┼───────────────────────────────────┼──────────────────────────┘
                 │                                   │
                 │         WebSocket                 │ File System
                 │         Port 45671                │ Access
                 │                                   │
                 ▼                                   ▼
┌─────────────────────────────────────┐    ┌──────────────────────┐
│   Claude Bridge Service (Node.js)    │    │   PGLite Database    │
│                                      │    │                      │
│  ┌────────────────────────────────┐  │    │  Location (macOS):   │
│  │  WebSocket Server              │  │    │  ~/Library/          │
│  │  - Database Operations         │◄─────►│  Application Support/│
│  │  - Claude CLI Execution        │  │    │  Commander/          │
│  │  - Message Persistence         │  │    │  commander-data/     │
│  └────────────────────────────────┘  │    │  database/main_v1    │
│                                      │    │                      │
│  ┌────────────────────────────────┐  │    │  Tables:             │
│  │  PGLite Client                 │  │    │  - sessions          │
│  │  - Query Execution             │  │    │  - messages          │
│  │  - Schema Management           │  │    │  - tool_executions   │
│  └────────────────────────────────┘  │    │                      │
└─────────────────────────────────────┘    └──────────────────────┘
```

## Component Breakdown

### 1. Renderer Process Components

#### DatabaseServiceWebSocketProxy (`src/services/db/DatabaseServiceWebSocketProxy.ts`)
- Implements the full DatabaseService interface
- Converts all database operations to WebSocket messages
- Handles connection state and reconnection logic
- Provides Effect-based error handling

```typescript
const DatabaseServiceWebSocketProxyLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    saveSession: (session) => Effect.tryPromise({
      try: () => sendDatabaseRequest('saveSession', session),
      catch: (e) => new DatabaseError({
        message: `WebSocket saveSession failed: ${e}`,
        cause: e
      })
    }),
    // ... other methods
  })
);
```

#### React Components
- **AgentChatPane**: Main chat interface, uses `useAgentChat` hook
- **PreviousChatsPane**: Displays chat history, queries sessions via DatabaseService
- **ChatMessage**: Individual message display component

### 2. Main Process Components

#### DatabaseServiceImpl (`src/services/db/DatabaseServiceImpl.ts`)
- Direct PGLite implementation for main process
- Uses Effect patterns for all operations
- Implements transaction support and error recovery

#### PGLiteService (`src/services/db/PGLiteService.ts`)
- Manages PGLite client lifecycle
- Handles database initialization and path configuration
- Platform-aware path resolution

```typescript
const userDataPath = app.getPath("userData");
const dataDir = path.join(userDataPath, dbDataDirName);
// Resolves to: ~/Library/Application Support/Commander/commander-data/database/main_v1
```

#### IPC Handlers (`src/main-claude-websocket.ts`)
- Manages Claude CLI communication via WebSocket
- Handles streaming message chunks (`claude_stream_chunk`) from bridge service
- Extracts text content and forwards incrementally to renderer
- Saves complete assistant messages immediately when received
- Handles session lifecycle (create, update)

### 3. Bridge Service Components

#### Claude Bridge Service (`src/services/claude-bridge-service.js`)
- External Node.js process running WebSocket server
- Handles both database operations and Claude CLI execution
- Implements schema migrations for database updates
- **Streaming Support**: Parses Claude CLI's `stream-json` output line by line

```javascript
// Streaming JSON parser for Claude CLI output
ptyProcess.onData((data) => {
  outputBuffer += data;
  let newlineIndex;
  while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
    const jsonLine = outputBuffer.substring(0, newlineIndex).trim();
    outputBuffer = outputBuffer.substring(newlineIndex + 1);
    
    if (jsonLine) {
      try {
        const claudeMessage = JSON.parse(jsonLine);
        // Send each JSON object as a streaming chunk
        ws.send(JSON.stringify({
          id: requestId,
          type: 'claude_stream_chunk',
          payload: claudeMessage
        }));
      } catch (e) {
        log(`JSON Parse Error: ${e.message}`);
      }
    }
  }
});
```

## Data Flow

### 1. Message Send Flow

```
User Input → React Component → useAgentChat Hook → IPC Channel → Main Process
     ↓
WebSocket → Bridge Service → Claude CLI (--output-format stream-json)
     ↓
Stream JSON Objects → Parse Line by Line → Send as claude_stream_chunk
     ↓
Main Process → Extract Text → IPC Stream → React Component → Incremental UI Update
     ↓
Complete Message → Save to Database
```

### 1.1 Streaming Flow Detail

The streaming implementation transforms the response handling:

1. **Claude CLI Execution**: Bridge service adds `--output-format stream-json` flag
2. **Line-by-Line Parsing**: Each JSON object (init, assistant, tool_use, result) parsed individually
3. **Incremental Forwarding**: Text chunks sent immediately to UI via `claude_stream_chunk` messages
4. **Real-time Display**: Users see responses character by character as generated
5. **Persistence on Completion**: Complete messages saved when fully received

### 2. Detailed Save Flow

1. **Session Creation** (First Message)
   ```typescript
   // In main-claude-websocket.ts
   const session = {
     id: sessionId,
     created_at: now,
     last_updated_at: now,
     provider_key: "claude_code",
     model_name: params.model || "claude-3-opus-20240229",
     system_prompt: params.messages?.find(m => m.role === "system")?.content || "",
     metadata_json: JSON.stringify({}),
     title: "Claude Code Chat"
   };
   await saveSessionToDatabase(session);
   ```

2. **User Message Save**
   ```typescript
   const userDbMessage = {
     id: generateId(),
     session_id: sessionId,
     role: "user",
     content: lastUserMessage.content,
     timestamp: now,
     tool_calls_json: null,
     metadata_json: null
   };
   await saveMessageToDatabase(userDbMessage);
   ```

3. **Assistant Response Save**
   ```typescript
   // After Claude response completes
   const assistantDbMessage = {
     id: assistantMessageId,
     session_id: sessionId,
     role: "assistant",
     content: fullAssistantContent,
     tool_calls_json: toolCalls.length > 0 ? JSON.stringify(toolCalls) : undefined,
     timestamp: Math.floor(Date.now() / 1000),
   };
   await saveMessageToDatabase(assistantDbMessage);
   ```

4. **Tool Execution Save**
   ```typescript
   const toolExecution = {
     id: tc.id,
     message_id: assistantMessageId,
     tool_name: tc.function.name,
     arguments_json: tc.function.arguments,
     status: "pending",
     created_at: Math.floor(Date.now() / 1000),
     updated_at: Math.floor(Date.now() / 1000),
   };
   await saveToolCallToDatabase(toolExecution);
   ```

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_updated_at INTEGER NOT NULL,
  provider_key TEXT NOT NULL,
  model_name TEXT,
  system_prompt TEXT,
  metadata_json TEXT,
  title TEXT
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  name TEXT,
  tool_call_id TEXT,
  tool_calls_json TEXT,
  timestamp INTEGER NOT NULL,
  provider_message_id TEXT,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

### Tool Executions Table
```sql
CREATE TABLE tool_executions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  tool_name TEXT NOT NULL,
  arguments_json TEXT NOT NULL,
  result_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed_success', 'executed_error')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_tool_executions_message_id ON tool_executions(message_id);
```

## Cross-Process Communication

### WebSocket Protocol

The system uses a JSON-based protocol over WebSocket with support for both database operations and streaming:

#### Database Request Format
```json
{
  "type": "db",
  "id": "unique-request-id",
  "operation": "saveMessage",
  "params": {
    "id": "message-id",
    "session_id": "session-id",
    "role": "user",
    "content": "Hello, Claude!"
    // ... other fields
  }
}
```

#### Streaming Message Types

##### Stream Chunk (Bridge → Main)
```json
{
  "id": "request-id",
  "type": "claude_stream_chunk",
  "payload": {
    "type": "assistant",
    "message": {
      "id": "msg_xyz",
      "content": [
        { "type": "text", "text": "Here's the response..." }
      ]
    }
  }
}
```

##### Stream Done (Bridge → Main)
```json
{
  "id": "request-id",
  "type": "claude_stream_done",
  "exitCode": 0
}
```

##### Stream Error (Bridge → Main)
```json
{
  "id": "request-id",
  "type": "claude_stream_error",
  "error": "Error message"
}
```

### IPC Channels

The renderer process cannot directly access the database due to Electron security restrictions. Instead, it uses IPC channels:

```typescript
// Renderer → Main
ipcRenderer.invoke('database:operation', {
  operation: 'getMessagesForSession',
  params: { sessionId, limit: 100 }
});

// Main → Bridge Service (WebSocket)
ws.send(JSON.stringify({
  type: 'db',
  id: requestId,
  operation: 'getMessagesForSession',
  params: { sessionId, limit: 100 }
}));
```

## Message Lifecycle

### 1. New Chat Session with Streaming

1. User opens agent chat pane
2. Types first message and hits send
3. `useAgentChat` hook generates new session ID
4. Session saved to database with metadata
5. User message saved with session reference
6. Message sent to Claude via bridge service with `--output-format stream-json`
7. Claude CLI emits JSON objects for each part of the response
8. Bridge service parses each JSON object and sends as `claude_stream_chunk`
9. Main process extracts text content and forwards to UI incrementally
10. UI updates in real-time, showing text as it's generated
11. Complete assistant message saved to database when fully received
12. Session `last_updated_at` updated on stream completion

### 2. Continuing Existing Session

1. User clicks session in Previous Chats pane
2. `openAgentChatPane` action called with session ID
3. `useAgentChat` loads session and message history
4. Database queries fetch all messages for session
5. Messages converted to chat UI format
6. User continues conversation
7. New messages append to existing session

### 3. Tool Execution Flow

1. Claude response includes tool call
2. Tool execution saved as "pending"
3. Tool executed by Claude CLI
4. Result captured and saved
5. Status updated to "executed_success" or "executed_error"
6. Tool results included in conversation context

## Error Handling & Recovery

### Database Connection Failures

```typescript
// Automatic reconnection in WebSocketProxy
const reconnect = () => {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    setTimeout(() => {
      connectWebSocket();
      reconnectAttempts++;
    }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
  }
};
```

### Transaction Rollback

The system uses database transactions for multi-step operations:

```typescript
Effect.gen(function* (_) {
  yield* _(db.exec("BEGIN"));
  try {
    yield* _(saveSession(session));
    yield* _(saveMessage(message));
    yield* _(db.exec("COMMIT"));
  } catch (error) {
    yield* _(db.exec("ROLLBACK"));
    throw error;
  }
});
```

### Schema Migration

The bridge service automatically handles schema updates:

```javascript
// Add missing columns for backward compatibility
try {
  await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS name TEXT`);
  await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_call_id TEXT`);
  // ... other migrations
} catch (e) {
  log('Migration: Some columns may already exist, continuing...');
}
```

## Security Considerations

### 1. SQL Injection Prevention

All database queries use parameterized statements:

```javascript
// Safe parameterized query
await db.query(
  `INSERT INTO messages (id, content) VALUES ($1, $2)`,
  [messageId, userContent]
);

// Never use string interpolation
// BAD: `INSERT INTO messages VALUES ('${userContent}')`
```

### 2. Input Validation

```javascript
// Validate sortBy to prevent injection
const allowedSortColumns = ['created_at', 'last_updated_at'];
const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'last_updated_at';
const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
```

### 3. Process Isolation

- Renderer process has no direct database access
- All database operations go through validated channels
- Bridge service runs with minimal privileges

### 4. Data Sanitization

- User content escaped for storage
- JSON fields validated before parsing
- HTML content sanitized before display

## Performance Optimization

### 1. Indexing Strategy

```sql
-- Optimized for common queries
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_sessions_last_updated ON sessions(last_updated_at);
```

### 2. Query Optimization

```typescript
// Batch message fetching with pagination
getMessagesForSession: (sessionId, options = {}) => {
  const { limit = 100, offset = 0 } = options;
  return runQuery<DBMessage>(
    `SELECT * FROM messages
     WHERE session_id = $1
     ORDER BY timestamp ASC
     LIMIT $2 OFFSET $3`,
    [sessionId, limit, offset]
  );
}
```

### 3. Connection Pooling

The WebSocket connection is reused for multiple operations:

```typescript
// Single persistent connection
const ws = new WebSocket(BRIDGE_SERVICE_URL);
activeConnections.set(requestId, ws);
```

### 4. Real-time Streaming Implementation

The system implements true streaming from Claude CLI to the UI:

```javascript
// Bridge service: Parse stream-json output line by line
while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
  const jsonLine = outputBuffer.substring(0, newlineIndex).trim();
  const claudeMessage = JSON.parse(jsonLine);
  
  // Send immediately as streaming chunk
  ws.send(JSON.stringify({
    id: requestId,
    type: 'claude_stream_chunk',
    payload: claudeMessage
  }));
}

// Main process: Handle streaming chunks
case 'claude_stream_chunk':
  const assistantMessage = claudeMessage.message;
  // Extract and forward text immediately
  for (const contentPart of assistantMessage.content) {
    if (contentPart.type === "text") {
      event.sender.send('claude-code:chat-stream:chunk', requestId, contentPart.text);
    }
  }
  // Save complete message object to database
  await saveMessageToDatabase(assistantMessage);
  break;
```

This approach provides:
- **Immediate Feedback**: Users see responses as they're generated
- **Efficient Memory Usage**: No need to buffer entire response
- **Resilient Persistence**: Messages saved as complete objects when received

## Testing & Debugging

### 1. Database Inspection Scripts

```javascript
// scripts/check-db.js
async function checkDatabase() {
  const db = new PGlite(dbPath);
  await db.waitReady;

  const sessions = await db.exec('SELECT * FROM sessions ORDER BY last_updated_at DESC');
  console.log('Sessions found:', sessions.rows?.length || 0);

  const messages = await db.exec('SELECT COUNT(*) as count FROM messages');
  console.log('Total messages:', messages.rows?.[0]?.count || 0);
}
```

### 2. Bridge Service Logging

```javascript
// Comprehensive logging in bridge service
function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(logMsg.trim());
  fs.appendFileSync(logFile, logMsg);
}
```

### 3. WebSocket and Streaming Debugging

```typescript
// Enable verbose WebSocket logging
ws.on('message', (data) => {
  console.log('[Main Process] Received from bridge:', data);
});

ws.on('error', (error) => {
  console.error('[Main Process] WebSocket error:', error);
});

// Streaming-specific debugging
case 'claude_stream_chunk':
  console.log(`[Main Process] Stream chunk type: ${claudeMessage.type}`);
  if (claudeMessage.type === "assistant") {
    console.log(`[Main Process] Assistant content parts: ${claudeMessage.message.content.length}`);
  }
  break;

// Bridge service streaming logs
log(`Parsed Claude Message: type=${claudeMessage.type}`);
log(`Stream buffer remaining: ${outputBuffer.length} chars`);
```

### 4. Effect Service Testing

```typescript
// Test with mock database layer
const testRuntime = pipe(
  Layer.succeed(DatabaseService, mockDatabaseService),
  Layer.provide(ConfigurationServiceLive),
  Layer.provide(TelemetryServiceLive)
);
```

## Future Considerations

### 1. Scalability Improvements

- **Message Compression**: Compress large messages before storage
- **Attachment Support**: Store images/files with messages
- **Search Indexing**: Full-text search across message content
- **Archival Strategy**: Move old sessions to archive storage

### 2. Feature Enhancements

- **Export/Import**: Allow users to export chat history
- **Sync Across Devices**: Cloud backup and sync
- **Message Encryption**: End-to-end encryption for sensitive chats
- **Collaborative Sessions**: Multiple users in same session

### 3. Performance Optimizations

- **Lazy Loading**: Load messages on demand during scroll
- **Virtual Scrolling**: Render only visible messages
- **Background Sync**: Save messages asynchronously
- **Connection Multiplexing**: Single WebSocket for all operations
- **Partial Message Updates**: Stream individual tokens rather than full text chunks
- **Compression**: Compress WebSocket messages for faster transmission

### 4. Reliability Improvements

- **Write-Ahead Logging**: Ensure durability of operations
- **Automatic Backups**: Periodic database snapshots
- **Conflict Resolution**: Handle concurrent edits
- **Offline Support**: Queue operations when offline

### 5. Developer Experience

- **Migration Framework**: Automated schema migrations
- **Debug Tools**: Visual database browser
- **Performance Profiling**: Query performance analytics
- **Testing Framework**: Automated database testing

## Conclusion

The Commander message persistence system represents a sophisticated solution to the challenges of saving chat data in an Electron application. By leveraging PGLite, WebSocket communication, and Effect-based service architecture, the system provides:

1. **Reliability**: Messages are persisted immediately and survive app restarts
2. **Security**: SQL injection prevention and process isolation
3. **Performance**: Optimized queries and streaming responses
4. **Maintainability**: Clear separation of concerns and comprehensive error handling
5. **Extensibility**: Easy to add new features and storage capabilities

The architecture balances the constraints of Electron's security model with the need for robust data persistence, creating a foundation that can scale with the application's growth. With the implementation of real-time streaming, the system now provides an even more responsive user experience while maintaining data integrity and security.
