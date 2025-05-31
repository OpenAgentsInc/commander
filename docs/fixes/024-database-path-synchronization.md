# Fix: Database Path Synchronization Between Electron and External Services

## Problem

Electron app and external Node.js services (like claude-bridge-service) use different database paths, causing data to be stored in separate locations. This leads to "no chat history" issues even when data exists.

### Error Message

```
Database operation error: column "undefined" does not exist
Database operation error: insert or update on table "messages" violates foreign key constraint "messages_session_id_fkey"
```

And user reports: "it says no chat history. but ive had some"

## Root Cause

1. **Path Mismatch**: Electron uses `app.getPath("userData")` which resolves to platform-specific locations:

   - macOS: `~/Library/Application Support/Commander/commander-data/database/main_v1`
   - Linux: `~/.config/Commander/commander-data/database/main_v1`
   - Windows: `%APPDATA%/Commander/commander-data/database/main_v1`

2. **External Service Path**: External services were using a hardcoded path:

   - All platforms: `~/.commander/database/main_v1`

3. **Result**: Two separate databases exist - one used by Electron, one by external services. Data saved by one isn't visible to the other.

## Solution

### 1. Synchronize Database Paths

Update external services to compute the same path as Electron:

```javascript
// claude-bridge-service.js
const electronUserDataPath =
  process.platform === "darwin"
    ? path.join(process.env.HOME, "Library", "Application Support", "Commander")
    : process.platform === "win32"
      ? path.join(process.env.APPDATA, "Commander")
      : path.join(process.env.HOME, ".config", "Commander");

const dbPath = path.join(
  electronUserDataPath,
  "commander-data",
  "database",
  "main_v1",
);
```

### 2. Fix SQL Injection Vulnerabilities

Replace string interpolation with parameterized queries:

```javascript
// BAD - SQL injection vulnerable
await db.exec(
  `INSERT INTO sessions (id, created_at) VALUES ('${params.id}', ${params.created_at})`,
);

// GOOD - Parameterized query
await db.query(`INSERT INTO sessions (id, created_at) VALUES ($1, $2)`, [
  params.id,
  params.created_at,
]);
```

### 3. Handle Missing Required Fields

Ensure all required database fields are provided:

```typescript
// main-claude-websocket.ts
const session = {
  id: sessionId,
  created_at: now,
  last_updated_at: now,
  provider_key: "claude_code",
  model_name: params.model || "claude-3-opus-20240229",
  system_prompt:
    params.messages?.find((m: any) => m.role === "system")?.content || "",
  metadata_json: JSON.stringify({}),
  title: "Claude Code Chat",
};
```

### 4. Add Database Migration Support

Handle schema changes for existing databases:

```javascript
// Add missing columns if they don't exist (for migration)
try {
  await db.exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS name TEXT`);
  await db.exec(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS tool_call_id TEXT`,
  );
  await db.exec(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id TEXT`,
  );
  await db.exec(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title TEXT`);
  log("Added missing columns to existing tables");
} catch (e) {
  log("Migration: Some columns may already exist, continuing...");
}
```

## Complete Example

### External Service Database Connection

```javascript
// Initialize PGLite database with correct path
const electronUserDataPath =
  process.platform === "darwin"
    ? path.join(process.env.HOME, "Library", "Application Support", "Commander")
    : process.platform === "win32"
      ? path.join(process.env.APPDATA, "Commander")
      : path.join(process.env.HOME, ".config", "Commander");

const dbPath = path.join(
  electronUserDataPath,
  "commander-data",
  "database",
  "main_v1",
);

async function initDatabase() {
  // Ensure directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new PGlite(dbPath);
  await db.waitReady;

  // Create tables and run migrations...
}
```

### Parameterized Query Pattern

```javascript
case 'getAllSessions':
  const { limit = 100, offset = 0, sortBy = 'last_updated_at', sortOrder = 'DESC' } = params || {};
  // Validate sortBy to prevent SQL injection
  const allowedSortColumns = ['created_at', 'last_updated_at'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'last_updated_at';
  const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const sessionsResult = await db.query(
    `SELECT * FROM sessions ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
```

## When to Apply This Fix

1. **Multiple Process Architecture**: When your Electron app spawns external Node.js services that need database access
2. **Data Visibility Issues**: When data saved by one part of the app isn't visible to another
3. **Path-Related Errors**: When you see database connection errors only in certain contexts
4. **Cross-Platform Support**: When you need consistent database paths across macOS, Linux, and Windows

## Related Issues

- Database schema migrations between versions
- SQL injection vulnerabilities in database queries
- Missing required fields in database operations
- Cross-process data synchronization
- Platform-specific path handling

## Prevention Strategies

1. **Environment Variables**: Pass database path as environment variable to external services
2. **Configuration Service**: Use a centralized configuration service for all path calculations
3. **Database Abstraction**: Create a shared database service module used by all processes
4. **Schema Validation**: Validate all database inputs against schema before operations
5. **Integration Tests**: Test database operations across all processes and platforms

## Key Takeaways

1. Always synchronize paths between Electron main process and external services
2. Use platform-aware path calculations (`app.getPath()` equivalent)
3. Never use string interpolation for SQL queries - always use parameterized queries
4. Include migration code for schema changes to support existing databases
5. Validate all required fields before database operations
