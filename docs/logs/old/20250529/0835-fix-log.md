# Fix for Foreign Key Constraint Violation

## Problem
Tool calls were failing to save because they were being inserted before the parent assistant message existed in the database, causing foreign key constraint violations.

## Solution Implemented

### 1. Save Assistant Message Early
Modified `main-claude-websocket.ts` to save a placeholder assistant message as soon as we receive the first assistant chunk with an ID:

```typescript
// Save assistant message to database immediately on first chunk
if (!messageAlreadySaved && !messageSavePromise && assistantMessageId) {
  messageSavePromise = saveMessageToDatabase({
    id: assistantMessageId,
    session_id: sessionId,
    role: "assistant",
    content: "", // Start with empty content, will update later
    tool_calls_json: undefined,
    timestamp: Math.floor(Date.now() / 1000),
  })
  .then(() => {
    messageAlreadySaved = true;
    console.log("[Main Process] Assistant message placeholder saved to database early");
  })
  // ...
}
```

### 2. Wait for Message Before Saving Tool Calls
Updated tool call saving logic to wait for the message save promise to complete:

```typescript
// Wait for message to be saved first if needed
const saveToolCall = async () => {
  if (messageSavePromise) {
    await messageSavePromise;
  }
  return saveToolCallToDatabase(toolExecutionData);
};
```

### 3. Update Bridge Service to Handle Duplicates
Modified `claude-bridge-service.js` to use ON CONFLICT DO UPDATE for saveMessage:

```sql
INSERT INTO messages (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  tool_calls_json = EXCLUDED.tool_calls_json,
  metadata_json = EXCLUDED.metadata_json
```

This allows the message to be updated with full content when the stream completes.

## How It Works Now

1. **Stream starts**: Assistant message ID is received
2. **Placeholder saved**: Empty assistant message saved to DB immediately
3. **Tool calls arrive**: They wait for message save, then insert successfully
4. **Tool results arrive**: They can update existing tool_execution records
5. **Stream completes**: Assistant message is updated with full content

## Expected Outcome

- No more foreign key constraint violations
- Tool calls are saved immediately when detected
- Tool results can update existing records
- Full conversation persists correctly after page refresh