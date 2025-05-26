Okay, this is a significant feature addition. We'll connect the Claude Code service to a PGlite database, ensuring all session information, including messages and tool calls, are persisted. Given that the Claude Code CLI interaction (via `ClaudeCodeCliService`) happens in the main process, the PGlite database and the primary `DatabaseService` will also reside in the main process. Renderer-side components will interact with this `DatabaseService` via IPC.

Here are the specific instructions for the coding agent:

**Phase D1: PGlite & Database Service Setup (Main Process)**

1.  **Add PGlite Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add `@electric-sql/pglite` to `dependencies`.
        ```json
        // In "dependencies":
        "@electric-sql/pglite": "^0.1.25", // Or latest stable version
        ```
    *   **Action:** Run `pnpm install`.
    *   **Note:** PGlite relies on WASM. Ensure `wasm-unsafe-eval` (or broader `blob:`) is allowed in `script-src` of your `Content-Security-Policy` in `index.html` if it wasn't already for `@effect/ai`. (Already present: `script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob:;`)

2.  **Configure Database Directory:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action:** Inside `DefaultDevConfigLayer`'s `Effect.gen` block, add:
        ```typescript
        yield* _(configService.set("DB_DATA_DIR", "commander-data/pglite-db")); // Subdirectory within userData
        ```

3.  **Create PGlite Service (Main Process):**
    *   **File:** `src/services/db/PGliteService.ts` (New file)
    *   **Content:**
        ```typescript
        import { Context, Effect, Layer, Config, Data } from "effect";
        import { PGlite } from "@electric-sql/pglite";
        import path from "path";
        import { app } from "electron"; // Electron API available in main process
        import fs from "fs";
        import { ConfigurationService } from "@/services/configuration";

        export class PGliteError extends Data.TaggedError("PGliteError")<{
          message: string;
          cause?: unknown;
        }> {}

        export interface PGliteService {
          readonly client: PGlite;
        }
        export const PGliteService = Context.GenericTag<PGliteService>("PGliteService");

        export const PGliteServiceLive = Layer.effect(
          PGliteService,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const dbDataDirName = yield* _(configService.get("DB_DATA_DIR"));

            const userDataPath = app.getPath("userData");
            const dataDir = path.join(userDataPath, dbDataDirName);

            // Ensure the directory exists
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }

            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log(`[PGliteService] Initializing PGlite in main process at: ${dataDir}`);

            const pgliteClient = yield* _(Effect.tryPromise({
              try: async () => {
                // Using new PGlite() with a file path for Node.js persistence
                const client = new PGlite(`file://${dataDir}`);
                await client.waitReady; // Ensure the DB is ready
                return client;
              },
              catch: (cause) => new PGliteError({ message: "Failed to initialize PGlite client", cause })
            }));

            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[PGliteService] PGlite client initialized successfully in main process.");
            return PGliteService.of({ client: pgliteClient });
          })
        );
        ```
    *   **Directory:** `src/services/db/`

4.  **Create Database Schemas (Effect Schemas):**
    *   **File:** `src/services/db/DatabaseSchemas.ts` (New file)
    *   **Content:**
        ```typescript
        import { Schema } from "effect";

        export const DBSessionSchema = Schema.Struct({
          id: Schema.String, // e.g., UUID or derived from pane ID
          created_at: Schema.Number, // Unix timestamp (seconds)
          last_updated_at: Schema.Number, // Unix timestamp (seconds)
          provider_key: Schema.String, // e.g., "claude_code_cli"
          model_name: Schema.optional(Schema.String),
          system_prompt: Schema.optional(Schema.String),
          metadata_json: Schema.optional(Schema.String), // For other session settings
        });
        export type DBSession = Schema.Schema.Type<typeof DBSessionSchema>;

        export const DBMessageSchema = Schema.Struct({
          id: Schema.String, // e.g., UUID
          session_id: Schema.String, // FK to sessions.id
          role: Schema.Union(
            Schema.Literal("user"),
            Schema.Literal("assistant"),
            Schema.Literal("system"),
            Schema.Literal("tool")
          ),
          content: Schema.NullishOr(Schema.String),
          name: Schema.optional(Schema.String), // For tool role
          tool_call_id: Schema.optional(Schema.String), // For tool role response
          timestamp: Schema.Number, // Unix timestamp (seconds)
          provider_message_id: Schema.optional(Schema.String), // ID from AI provider
          metadata_json: Schema.optional(Schema.String), // For usage, finish_reason
        });
        export type DBMessage = Schema.Schema.Type<typeof DBMessageSchema>;

        export const DBToolCallSchema = Schema.Struct({
          id: Schema.String, // From tool_calls[].id
          message_id: Schema.String, // FK to messages.id (assistant message)
          tool_name: Schema.String,
          arguments_json: Schema.String, // JSON string of arguments
          result_json: Schema.optional(Schema.String), // JSON string of tool result
          status: Schema.Union(
            Schema.Literal("pending"),
            Schema.Literal("executed_success"),
            Schema.Literal("executed_error")
          ),
          created_at: Schema.Number, // Unix timestamp
          updated_at: Schema.Number, // Unix timestamp
        });
        export type DBToolCall = Schema.Schema.Type<typeof DBToolCallSchema>;
        ```

5.  **Create Database Service Interface (Main Process):**
    *   **File:** `src/services/db/DatabaseService.ts` (New file)
    *   **Content:**
        ```typescript
        import { Context, Effect, Data } from "effect";
        import type { DBSession, DBMessage, DBToolCall } from "./DatabaseSchemas";

        export class DatabaseError extends Data.TaggedError("DatabaseError")<{
          message: string;
          cause?: unknown;
          query?: string;
          params?: any[];
        }> {}

        export interface DatabaseService {
          readonly _tag: "DatabaseService";
          initDB(): Effect.Effect<void, DatabaseError>;

          saveSession(session: DBSession): Effect.Effect<void, DatabaseError>;
          getSession(sessionId: string): Effect.Effect<DBSession | null, DatabaseError>;
          updateSession(sessionId: string, updates: Partial<Omit<DBSession, "id" | "created_at">>): Effect.Effect<void, DatabaseError>;

          saveMessage(message: DBMessage): Effect.Effect<void, DatabaseError>;
          getMessagesForSession(sessionId: string, limit?: number, offset?: number): Effect.Effect<DBMessage[], DatabaseError>;

          saveToolCall(toolCall: DBToolCall): Effect.Effect<void, DatabaseError>;
          updateToolCallResult(toolCallId: string, resultJson: string, status: "executed_success" | "executed_error"): Effect.Effect<void, DatabaseError>;
          getToolCallsForMessage(messageId: string): Effect.Effect<DBToolCall[], DatabaseError>;
        }
        export const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService");
        ```

6.  **Implement Database Service (Main Process):**
    *   **File:** `src/services/db/DatabaseServiceImpl.ts` (New file)
    *   **Action:** Implement the `DatabaseService` interface using the `PGliteService`. This will involve writing SQL queries.
        ```typescript
        import { Effect, Layer } from "effect";
        import type { PGlite } from "@electric-sql/pglite";
        import { PGliteService } from "./PGliteService";
        import { DatabaseService, DatabaseError } from "./DatabaseService";
        import type { DBSession, DBMessage, DBToolCall } from "./DatabaseSchemas";
        import { TelemetryService } from "@/services/telemetry";

        export const DatabaseServiceLive = Layer.effect(
          DatabaseService,
          Effect.gen(function*(_) {
            const pgliteService = yield* _(PGliteService);
            const telemetry = yield* _(TelemetryService); // For logging DB operations
            const client: PGlite = pgliteService.client;

            const runQuery = <T = any>(sql: string, params: any[] = []) =>
              Effect.tryPromise({
                try: () => client.query<T>(sql, params),
                catch: (cause) => new DatabaseError({ message: "Query failed", cause, query: sql, params })
              }).pipe(
                  Effect.tapError((err) => telemetry.trackEvent({ category: "db_error", action: "query_failed", label: sql.substring(0, 50), value: err.message }))
              );

            const runExec = (sql: string, params: any[] = []) =>
              Effect.tryPromise({
                try: () => client.exec(sql, params),
                catch: (cause) => new DatabaseError({ message: "Exec failed", cause, query: sql, params })
              }).pipe(
                  Effect.tapError((err) => telemetry.trackEvent({ category: "db_error", action: "exec_failed", label: sql.substring(0, 50), value: err.message }))
              );

            const initDB = Effect.gen(function*(_) {
              yield* _(telemetry.trackEvent({ category: "db_init", action: "start" }));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS sessions (
                  id TEXT PRIMARY KEY,
                  created_at INTEGER NOT NULL,
                  last_updated_at INTEGER NOT NULL,
                  provider_key TEXT NOT NULL,
                  model_name TEXT,
                  system_prompt TEXT,
                  metadata_json TEXT
                );
              `));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS messages (
                  id TEXT PRIMARY KEY,
                  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
                  content TEXT,
                  name TEXT,
                  tool_call_id TEXT,
                  timestamp INTEGER NOT NULL,
                  provider_message_id TEXT,
                  metadata_json TEXT
                );
              `));
              yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);`));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS tool_calls (
                  id TEXT PRIMARY KEY,
                  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
                  tool_name TEXT NOT NULL,
                  arguments_json TEXT NOT NULL,
                  result_json TEXT,
                  status TEXT NOT NULL CHECK (status IN ('pending', 'executed_success', 'executed_error')),
                  created_at INTEGER NOT NULL,
                  updated_at INTEGER NOT NULL
                );
              `));
              yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_tool_calls_message_id ON tool_calls(message_id);`));
              yield* _(telemetry.trackEvent({ category: "db_init", action: "success" }));
            });

            return DatabaseService.of({
              _tag: "DatabaseService",
              initDB: initDB.pipe(Effect.catchAll(e => Effect.die(e))), // initDB must succeed or app shouldn't start

              saveSession: (session) => runExec(
                `INSERT INTO sessions (id, created_at, last_updated_at, provider_key, model_name, system_prompt, metadata_json)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT(id) DO UPDATE SET
                   last_updated_at = excluded.last_updated_at,
                   provider_key = excluded.provider_key,
                   model_name = excluded.model_name,
                   system_prompt = excluded.system_prompt,
                   metadata_json = excluded.metadata_json;`,
                [session.id, session.created_at, session.last_updated_at, session.provider_key, session.model_name, session.system_prompt, session.metadata_json]
              ).pipe(Effect.asVoid),

              getSession: (sessionId) => runQuery<DBSession>(
                `SELECT * FROM sessions WHERE id = $1;`, [sessionId]
              ).pipe(Effect.map(result => result.rows[0] || null)),

              updateSession: (sessionId, updates) => {
                  const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
                  const values = Object.values(updates);
                  if (!setClauses) return Effect.void; // No updates to make
                  return runExec(
                      `UPDATE sessions SET ${setClauses}, last_updated_at = $${values.length + 2} WHERE id = $1;`,
                      [sessionId, ...values, Math.floor(Date.now() / 1000)]
                  ).pipe(Effect.asVoid);
              },

              saveMessage: (message) => runExec(
                `INSERT INTO messages (id, session_id, role, content, name, tool_call_id, timestamp, provider_message_id, metadata_json)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
                [message.id, message.session_id, message.role, message.content, message.name, message.tool_call_id, message.timestamp, message.provider_message_id, message.metadata_json]
              ).pipe(Effect.asVoid),

              getMessagesForSession: (sessionId, limit = 50, offset = 0) => runQuery<DBMessage>(
                `SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC LIMIT $2 OFFSET $3;`,
                [sessionId, limit, offset]
              ).pipe(Effect.map(result => result.rows)),

              saveToolCall: (toolCall) => runExec(
                `INSERT INTO tool_calls (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
                [toolCall.id, toolCall.message_id, toolCall.tool_name, toolCall.arguments_json, toolCall.result_json, toolCall.status, toolCall.created_at, toolCall.updated_at]
              ).pipe(Effect.asVoid),

              updateToolCallResult: (toolCallId, resultJson, status) => runExec(
                `UPDATE tool_calls SET result_json = $1, status = $2, updated_at = $3 WHERE id = $4;`,
                [resultJson, status, Math.floor(Date.now()/1000), toolCallId]
              ).pipe(Effect.asVoid),

              getToolCallsForMessage: (messageId) => runQuery<DBToolCall>(
                `SELECT * FROM tool_calls WHERE message_id = $1 ORDER BY created_at ASC;`,
                [messageId]
              ).pipe(Effect.map(result => result.rows)),
            });
          })
        );
        ```

7.  **Update `src/services/db/index.ts`:**
    ```typescript
    export * from "./DatabaseSchemas";
    export * from "./DatabaseService";
    export * from "./PGliteService"; // Export PGlite service if needed elsewhere
    export * from "./DatabaseServiceImpl";
    ```

8.  **Update Main Process Runtime & Call `initDB`:**
    *   **File:** `src/main-process-runtime.ts`
    *   **Action:**
        *   Import `PGliteServiceLive`, `DatabaseService`, `DatabaseServiceLive` from `../db`.
        *   Add `PGliteServiceLive` and `DatabaseServiceLive` to the `mainProcessLayer`. `DatabaseServiceLive` depends on `PGliteServiceLive` and `TelemetryService`. `PGliteServiceLive` depends on `ConfigurationService`.
        *   Modify `initializeMainProcessRuntime` to get `DatabaseService` from the runtime and call `initDB()`. This ensures tables are created on startup.
        ```typescript
        // src/main-process-runtime.ts
        // ... other imports ...
        import { PGliteServiceLive } from "@/services/db/PGliteService";
        import { DatabaseService, DatabaseServiceLive } from "@/services/db";

        export type MainProcessAppContext = ConfigurationService | TelemetryService | ClaudeCodeCliService | DatabaseService; // Add DatabaseService

        // ... telemetryLayer, configLayer, mainProcessBaseLayer setup ...
        // ... claudeCodeCliLayer setup ...

        const pgliteLayer = PGliteServiceLive.pipe(Layer.provide(mainProcessBaseLayer)); // PGlite needs ConfigurationService
        const databaseLayer = DatabaseServiceLive.pipe(Layer.provide(Layer.merge(pgliteLayer, telemetryLayer))); // DB needs PGlite and Telemetry

        const mainProcessLayer = Layer.mergeAll(
            mainProcessBaseLayer,
            claudeCodeCliLayer,
            pgliteLayer, // Added
            databaseLayer  // Added
        );

        export async function initializeMainProcessRuntime(): Promise<void> {
          if (mainProcessRuntimeInstance) { /* ... */ return; }
          try {
            // ...
            mainProcessRuntimeInstance = Runtime.make(runtimeContext);
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Main process Effect runtime initialized successfully.");

            // Initialize Database
            const dbService = Context.get(mainProcessRuntimeInstance.context, DatabaseService);
            await Effect.runPromise(dbService.initDB());
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Database initialized successfully.");

          } catch (e) { /* ... */ throw e; }
        }
        // ... getMainProcessRuntime ...
        ```

**Phase D2: IPC for DatabaseService**

1.  **Define DB IPC Channels (`db-channels.ts`):**
    *   **File:** `src/helpers/ipc/db/db-channels.ts` (New file)
    *   **Content:**
        ```typescript
        export const DB_SERVICE_CHANNEL_PREFIX = "db-service";

        export const dbChannels = {
          initDB: `${DB_SERVICE_CHANNEL_PREFIX}:initDB`,
          saveSession: `${DB_SERVICE_CHANNEL_PREFIX}:saveSession`,
          getSession: `${DB_SERVICE_CHANNEL_PREFIX}:getSession`,
          updateSession: `${DB_SERVICE_CHANNEL_PREFIX}:updateSession`,
          saveMessage: `${DB_SERVICE_CHANNEL_PREFIX}:saveMessage`,
          getMessagesForSession: `${DB_SERVICE_CHANNEL_PREFIX}:getMessagesForSession`,
          saveToolCall: `${DB_SERVICE_CHANNEL_PREFIX}:saveToolCall`,
          updateToolCallResult: `${DB_SERVICE_CHANNEL_PREFIX}:updateToolCallResult`,
          getToolCallsForMessage: `${DB_SERVICE_CHANNEL_PREFIX}:getToolCallsForMessage`,
        };
        ```

2.  **Implement Main Process DB IPC Listeners (`db-listeners.ts`):**
    *   **File:** `src/helpers/ipc/db/db-listeners.ts` (New file)
    *   **Action:** Create listeners for each `DatabaseService` method. These will use the `mainProcessRuntime` to get the `DatabaseService` instance and execute methods.
        ```typescript
        // src/helpers/ipc/db/db-listeners.ts
        import { ipcMain } from "electron";
        import { Effect, Runtime, Cause } from "effect";
        import type { MainProcessAppContext } from "@/main-process-runtime";
        import { DatabaseService, DatabaseError } from "@/services/db";
        import type { DBSession, DBMessage, DBToolCall } from "@/services/db";
        import { dbChannels } from "./db-channels";

        interface IpcErrorObject { /* ... (copy from ollama-listeners.ts or claude-code-cli-listeners.ts) ... */ }
        function extractErrorForIPC(error: any): IpcErrorObject { /* ... */ }

        export function addDatabaseEventListeners(runtime: Runtime.Runtime<MainProcessAppContext>) {
          const runDbEffect = <A, E extends DatabaseError>(effect: Effect.Effect<A, E, DatabaseService>) =>
            Effect.runPromise(Effect.provide(effect, runtime)).catch(error => extractErrorForIPC(error));

          ipcMain.handle(dbChannels.initDB, () =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.initDB()))
          );
          ipcMain.handle(dbChannels.saveSession, (_, session: DBSession) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.saveSession(session)))
          );
          ipcMain.handle(dbChannels.getSession, (_, sessionId: string) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.getSession(sessionId)))
          );
          ipcMain.handle(dbChannels.updateSession, (_, sessionId: string, updates: Partial<DBSession>) =>
             runDbEffect(Effect.flatMap(DatabaseService, db => db.updateSession(sessionId, updates)))
          );
          ipcMain.handle(dbChannels.saveMessage, (_, message: DBMessage) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.saveMessage(message)))
          );
          ipcMain.handle(dbChannels.getMessagesForSession, (_, sessionId: string, limit?: number, offset?: number) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.getMessagesForSession(sessionId, limit, offset)))
          );
          ipcMain.handle(dbChannels.saveToolCall, (_, toolCall: DBToolCall) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.saveToolCall(toolCall)))
          );
          ipcMain.handle(dbChannels.updateToolCallResult, (_, toolCallId: string, resultJson: string, status: "executed_success" | "executed_error") =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.updateToolCallResult(toolCallId, resultJson, status)))
          );
          ipcMain.handle(dbChannels.getToolCallsForMessage, (_, messageId: string) =>
            runDbEffect(Effect.flatMap(DatabaseService, db => db.getToolCallsForMessage(messageId)))
          );
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.log("[IPC Setup] Database event listeners registered.");
        }
        ```
    *   **Modify `src/main.ts`:** Import and call `addDatabaseEventListeners(getMainProcessRuntime())` inside `app.whenReady().then(async () => { ... after runtime init ... });`.

3.  **Expose DB IPC Context in Preload (`db-context.ts`):**
    *   **File:** `src/helpers/ipc/db/db-context.ts` (New file)
    *   **Content:**
        ```typescript
        import { contextBridge, ipcRenderer } from "electron";
        import { dbChannels } from "./db-channels";
        import type { DBSession, DBMessage, DBToolCall } from "@/services/db"; // Use types from our schema

        export function exposeDatabaseContext() {
          contextBridge.exposeInMainWorld("electronAPI", {
            ...(window.electronAPI || {}),
            database: {
              initDB: () => ipcRenderer.invoke(dbChannels.initDB),
              saveSession: (session: DBSession) => ipcRenderer.invoke(dbChannels.saveSession, session),
              getSession: (sessionId: string) => ipcRenderer.invoke(dbChannels.getSession, sessionId),
              updateSession: (sessionId: string, updates: Partial<DBSession>) => ipcRenderer.invoke(dbChannels.updateSession, sessionId, updates),
              saveMessage: (message: DBMessage) => ipcRenderer.invoke(dbChannels.saveMessage, message),
              getMessagesForSession: (sessionId: string, limit?: number, offset?: number) => ipcRenderer.invoke(dbChannels.getMessagesForSession, sessionId, limit, offset),
              saveToolCall: (toolCall: DBToolCall) => ipcRenderer.invoke(dbChannels.saveToolCall, toolCall),
              updateToolCallResult: (toolCallId: string, resultJson: string, status: "executed_success" | "executed_error") => ipcRenderer.invoke(dbChannels.updateToolCallResult, toolCallId, resultJson, status),
              getToolCallsForMessage: (messageId: string) => ipcRenderer.invoke(dbChannels.getToolCallsForMessage, messageId),
            },
          });
        }
        ```
    *   **Action:** Add `exposeDatabaseContext()` to `src/helpers/ipc/context-exposer.ts`.
    *   **Action:** Update `src/types.d.ts` for `window.electronAPI.database`. Use the `DBSession`, `DBMessage`, `DBToolCall` types from `DatabaseSchemas.ts`.
        ```typescript
        // src/types.d.ts
        // ...
        import type { DBSession, DBMessage, DBToolCall } from "@/services/db";
        // ...
        declare global {
          interface DatabaseAPI {
            initDB: () => Promise<void | IpcErrorObject>;
            saveSession: (session: DBSession) => Promise<void | IpcErrorObject>;
            getSession: (sessionId: string) => Promise<DBSession | null | IpcErrorObject>;
            updateSession: (sessionId: string, updates: Partial<DBSession>) => Promise<void | IpcErrorObject>;
            saveMessage: (message: DBMessage) => Promise<void | IpcErrorObject>;
            getMessagesForSession: (sessionId: string, limit?: number, offset?: number) => Promise<DBMessage[] | IpcErrorObject>;
            saveToolCall: (toolCall: DBToolCall) => Promise<void | IpcErrorObject>;
            updateToolCallResult: (toolCallId: string, resultJson: string, status: "executed_success" | "executed_error") => Promise<void | IpcErrorObject>;
            getToolCallsForMessage: (messageId: string) => Promise<DBToolCall[] | IpcErrorObject>;
          }
          interface ElectronAPI {
            // ...
            database: DatabaseAPI;
          }
        }
        ```

**Phase D3: Renderer-Side Database Service Proxy**

1.  **Create Proxy Layer (`DatabaseServiceRendererProxy.ts`):**
    *   **File:** `src/services/db/DatabaseServiceRendererProxy.ts` (New file)
    *   **Content:**
        ```typescript
        import { Effect, Layer } from "effect";
        import { DatabaseService, DatabaseError } from "./DatabaseService";
        import type { DBSession, DBMessage, DBToolCall } from "./DatabaseSchemas";

        export const DatabaseServiceRendererProxyLive = Layer.succeed(
          DatabaseService,
          DatabaseService.of({
            _tag: "DatabaseService",
            initDB: () => Effect.tryPromise({
                try: () => window.electronAPI.database.initDB().then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC initDB failed", cause: e})
            }),
            saveSession: (session) => Effect.tryPromise({
                try: () => window.electronAPI.database.saveSession(session).then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC saveSession failed", cause: e})
            }),
            getSession: (sessionId) => Effect.tryPromise({
                try: async () => {
                    const res = await window.electronAPI.database.getSession(sessionId);
                    if (res && (res as any).__error) throw res;
                    return res as DBSession | null;
                },
                catch: (e) => new DatabaseError({ message: "IPC getSession failed", cause: e})
            }),
            updateSession: (sessionId, updates) => Effect.tryPromise({
                try: () => window.electronAPI.database.updateSession(sessionId, updates).then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC updateSession failed", cause: e })
            }),
            saveMessage: (message) => Effect.tryPromise({
                try: () => window.electronAPI.database.saveMessage(message).then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC saveMessage failed", cause: e})
            }),
            getMessagesForSession: (sessionId, limit, offset) => Effect.tryPromise({
                try: async () => {
                    const res = await window.electronAPI.database.getMessagesForSession(sessionId, limit, offset);
                    if (res && (res as any).__error) throw res;
                    return res as DBMessage[];
                },
                catch: (e) => new DatabaseError({ message: "IPC getMessagesForSession failed", cause: e})
            }),
            saveToolCall: (toolCall) => Effect.tryPromise({
                try: () => window.electronAPI.database.saveToolCall(toolCall).then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC saveToolCall failed", cause: e})
            }),
            updateToolCallResult: (toolCallId, resultJson, status) => Effect.tryPromise({
                try: () => window.electronAPI.database.updateToolCallResult(toolCallId, resultJson, status).then(res => { if (res && (res as any).__error) throw res; return; }),
                catch: (e) => new DatabaseError({ message: "IPC updateToolCallResult failed", cause: e})
            }),
            getToolCallsForMessage: (messageId) => Effect.tryPromise({
                try: async () => {
                    const res = await window.electronAPI.database.getToolCallsForMessage(messageId);
                    if (res && (res as any).__error) throw res;
                    return res as DBToolCall[];
                },
                catch: (e) => new DatabaseError({ message: "IPC getToolCallsForMessage failed", cause: e})
            }),
          })
        );
        ```
    *   **Update `src/services/db/index.ts`** to export `DatabaseServiceRendererProxyLive`.

2.  **Integrate Proxy into Renderer Runtime:**
    *   **File:** `src/services/runtime.ts`
    *   **Action:** Add `DatabaseServiceRendererProxyLive` to `FullAppLayer` (the renderer's runtime).
        ```typescript
        // src/services/runtime.ts
        // ...
        import { DatabaseServiceRendererProxyLive } from "@/services/db"; // Use the renderer proxy
        // ...
        export type FullAppContext = /* ... */ | DatabaseService; // Add DatabaseService

        // ... (buildFullAppLayer function) ...
        const databaseProxyLayer = DatabaseServiceRendererProxyLive; // This is for the renderer
        // ...
        return Layer.mergeAll(
          // ...
          databaseProxyLayer,
          // ...
        );
        ```

**Phase D4: Claude Code Service & Chat Session DB Integration**

1.  **Modify `ClaudeCodeCliServiceLive` (Main Process) to use `DatabaseService`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliServiceLive.ts`
    *   **Action:**
        *   Add `DatabaseService` to its dependencies.
        *   In `executeCommand` and `streamCommand` (or their wrappers in `claude-code-listeners.ts` if logic is there):
            1.  Generate a `sessionId` if one isn't provided (e.g., from pane ID). A simple UUID or timestamp-based ID can work. `const sessionId = params.sessionId || crypto.randomUUID();`
            2.  Ensure session exists:
                ```typescript
                // At start of handling a command/stream
                const session: DBSession = {
                    id: sessionId, // Must be passed or generated
                    created_at: Math.floor(Date.now() / 1000),
                    last_updated_at: Math.floor(Date.now() / 1000),
                    provider_key: "claude_code_cli",
                    model_name: execParams.model, // from ClaudeExecParams
                    system_prompt: execParams.systemPrompt,
                };
                yield* _(dbService.saveSession(session));
                ```
            3.  Before calling `executor.execute` or `executor.executeStream`:
                *   Create a `DBMessage` for the user prompt. `messageId` can be `crypto.randomUUID()`.
                *   `yield* _(dbService.saveMessage(userMessageToSave));`
            4.  After CLI response (non-streaming `executeCommand`):
                *   Parse the `rawCliResponse`.
                *   Create `DBMessage` for assistant response.
                *   If `tool_calls` are present, create `DBToolCall` entries for each, linking to the assistant message's ID. Save them.
                *   `yield* _(dbService.saveMessage(assistantResponseMessage));`
                *   `yield* _(Effect.all(toolCallsToSave.map(tc => dbService.saveToolCall(tc))));`
            5.  For `streamCommand`:
                *   When a chunk is parsed by the IPC listener (`claude-code-listeners.ts`):
                    *   If it's the *first* assistant chunk for a new response, create an assistant `DBMessage` with initial content and `isStreaming: true` (if we add such a field, or just save partial content). The `messageId` for this assistant response stream needs to be generated once.
                    *   For subsequent text chunks, *append* to the existing assistant message's content in the DB (or save each chunk as a separate small message if appending is too complex initially, though not ideal). A simpler approach for streaming is to collect the full response in the renderer and save it once, but the user wants to save *all* messages, implying chunks if they are distinct. **Let's simplify: the main process CLI service will log the *complete* assistant response after the stream is done, or when non-streaming command completes. This simplifies DB updates.**
                    *   If a chunk contains `tool_calls`, save them.
                *   **Correction for streaming:** `ClaudeCodeCliServiceLive`'s `streamCommand` returns an Effect `Stream`. The IPC listener (`claude-code-listeners.ts`) is iterating this stream. The saving logic should happen *inside* the `streamCommand`'s Effect `Stream` pipeline in `ClaudeCodeCliServiceLive` if possible, or in the IPC listener *after* parsing each chunk if that's easier.
                    *   **Revised streaming save logic for `claude-code-listeners.ts`:**
                        ```typescript
                        // Inside ipcMain.on(claudeCodeChannels.chatStream, ...)
                        // ... after getting cliStream from claudeService.streamCommand ...
                        const assistantMessageId = crypto.randomUUID(); // Create once for the whole response
                        let fullAssistantContent = "";
                        const toolCallsDetected: DBToolCall[] = [];

                        yield* _(Stream.runForEach(cliStream, (rawJsonStringChunk: string) => Effect.gen(function*(_) {
                            // ... (parse rawJsonStringChunk into cliJsonChunk) ...
                            // ... (extract textContent and tool_calls from cliJsonChunk) ...
                            fullAssistantContent += textContent;
                            // if (tool_calls_from_chunk) toolCallsDetected.push(...mapToDBToolCalls(tool_calls_from_chunk, assistantMessageId));
                            // Send chunk to renderer: event.sender.send(..., rawJsonStringChunk)
                            // NO DB SAVING PER CHUNK HERE - save at the end.
                        })));
                        // AFTER Stream.runForEach completes (stream done):
                        const assistantMessageToSave: DBMessage = { /* ... role: 'assistant', content: fullAssistantContent, tool_calls (if any were aggregated) ... */ };
                        yield* _(dbService.saveMessage(assistantMessageToSave));
                        // if (toolCallsDetected.length > 0) {
                        //   yield* _(Effect.all(toolCallsDetected.map(tc => dbService.saveToolCall(tc))));
                        // }
                        ```

2.  **Modify `useAgentChat` (Renderer Process):**
    *   **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Action:**
        *   Add `DatabaseService.Tag` dependency.
        *   Introduce `sessionId: string` state, or receive it as a prop. Generate a new `sessionId` (e.g., `crypto.randomUUID()`) when a new chat starts (e.g., first message sent if no `sessionId` is active).
        *   **History Loading:**
            *   In `useEffect` (on mount or `sessionId` change), call `databaseService.getMessagesForSession(sessionId)`.
            *   Populate the local `messages` state (`UIAgentChatMessage[]`) from the DB messages. If messages have tool calls, fetch them too via `databaseService.getToolCallsForMessage(message.id)` and reconstruct the `tool_calls` array for the `UIAgentChatMessage`.
        *   **Message Sending:**
            *   The `sendMessage` function passes the `sessionId` to `ChatOrchestratorService` (if orchestrator needs to create session records) or directly to the main process if `ClaudeCodeCliService` creates the session.
            *   Since `ClaudeCodeCliService` (main) is now saving user & assistant messages for its provider, `useAgentChat` might not need to explicitly save messages for the Claude Code provider. It will optimistically add the user message to UI, and new assistant messages/chunks arrive via the stream (and are simultaneously saved by main process).
        *   **Tool Call Display:** If an `AiResponse` chunk (which wraps an `AgentChatMessage`) contains `tool_calls`, `useAgentChat` will update the UI. The DB is primarily for persistence and history.

3.  **(Future/Optional) Tool Execution Logging:**
    *   If/when `ToolHandlerService` (Phase 7) executes a tool, it should:
        *   Depend on `DatabaseService.Tag`.
        *   Call `dbService.updateToolCallResult(toolCall.id, JSON.stringify(result), 'executed_success' | 'executed_error')`.

**Phase D5: Testing**

1.  **Unit Tests for `DatabaseServiceImpl.ts` (Main Process):**
    *   Mock `PGliteService` (or use an in-memory PGlite instance for these tests).
    *   Test all DB methods: save/get session, save/get messages, save/get/update tool calls. Verify SQL queries and data mapping.
2.  **Integration Tests for IPC DB Access (Renderer):**
    *   Test the `DatabaseServiceRendererProxyLive` by calling its methods and ensuring data flows correctly to/from the (mocked) main process DB service via IPC.
3.  **Integration Tests for `ClaudeCodeCliServiceLive` (Main Process):**
    *   Provide mock `DatabaseService` and `ClaudeCliExecutor`.
    *   Verify that `executeCommand`/`streamCommand` correctly call `dbService.saveSession`, `saveMessage`, `saveToolCall`.
4.  **E2E Test:**
    *   Start app, use Claude Code CLI provider to chat.
    *   Verify messages (user, assistant, tool calls/results if implemented) appear.
    *   Close and reopen the app.
    *   Verify the chat history for that session is loaded and displayed from PGlite.

---
This plan should provide a solid foundation for database persistence with PGlite, primarily driven by the main process service that interacts with the Claude Code CLI. Remember to handle errors robustly at each layer (Effect errors, IPC errors, DB errors).Okay, Agent, this is a major feature. We're going to integrate PGlite to persist all Claude Code service session information, including messages and tool calls.

**Core Architecture:**

*   **PGlite in Main Process:** The PGlite database instance and the primary `DatabaseService` will run in the Electron main process. This allows the `ClaudeCodeCliService` (which also runs in main to manage the CLI subprocess) to directly interact with the database.
*   **IPC Bridge for Database:** Renderer-side components (like `AgentChatPane` and `useAgentChat`) will access database functionalities through a new set of IPC channels.
*   **Schema-Driven:** We'll use `@effect/schema` to define our database table structures.

Here are the specific instructions:

**Phase D1: PGlite & Database Service Setup (Main Process)**

1.  **Add PGlite Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add `@electric-sql/pglite` to `dependencies`.
        ```json
        // In "dependencies":
        "@electric-sql/pglite": "^0.1.25",
        ```
    *   Run `pnpm install`.

2.  **Configure Database Directory:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action:** Inside `DefaultDevConfigLayer`'s `Effect.gen` block, add:
        ```typescript
        yield* _(configService.set("DB_DATA_DIR", "commander-data/pglite-main-db")); // Ensure unique name
        ```

3.  **Create PGlite Service (Main Process):**
    *   **Directory:** `src/services/db/` (Create if it doesn't exist)
    *   **File:** `src/services/db/PGliteService.ts`
    *   **Content:** (Copy from your prompt - looks good)

4.  **Create Database Schemas (Effect Schemas):**
    *   **File:** `src/services/db/DatabaseSchemas.ts`
    *   **Content:** (Copy from your prompt - looks good, ensure `Schema` is imported from `"effect"` if not already aliased)

5.  **Create Database Service Interface (Main Process):**
    *   **File:** `src/services/db/DatabaseService.ts`
    *   **Content:** (Copy from your prompt - looks good, ensure `Data` is imported from `"effect"`)

6.  **Implement Database Service (Main Process):**
    *   **File:** `src/services/db/DatabaseServiceImpl.ts`
    *   **Content:** (Copy from your prompt - this is a large chunk, ensure all SQL queries are correct, especially `ON CONFLICT` clauses and FK relationships. Import `TelemetryService` from `@/services/telemetry`).

7.  **Export DB Services from `src/services/db/index.ts`:**
    *   **File:** `src/services/db/index.ts` (New file or update)
    *   **Content:**
        ```typescript
        export * from "./DatabaseSchemas";
        export * from "./DatabaseService";
        export * from "./PGliteService";
        export * from "./DatabaseServiceImpl";
        // Renderer proxy will be added later
        ```

8.  **Update Main Process Runtime & Call `initDB`:**
    *   **File:** `src/main-process-runtime.ts`
    *   **Action:**
        *   Import `PGliteServiceLive`, `DatabaseService`, `DatabaseServiceLive` from `@/services/db`.
        *   Update `MainProcessAppContext` type.
        *   Add `PGliteServiceLive` and `DatabaseServiceLive` to the `mainProcessLayer`.
        *   Modify `initializeMainProcessRuntime` to call `dbService.initDB()`.
        ```typescript
        // src/main-process-runtime.ts
        // ... other imports ...
        import { PGliteServiceLive } from "@/services/db/PGliteService"; // Correct path
        import { DatabaseService, DatabaseServiceLive } from "@/services/db"; // Correct path

        // Update MainProcessAppContext type
        export type MainProcessAppContext = ConfigurationService | TelemetryService | ClaudeCodeCliService | DatabaseService; // Add DatabaseService

        // ... (telemetryLayer, configLayer, mainProcessBaseLayer, claudeCodeCliLayer setup remains) ...

        const pgliteLayer = PGliteServiceLive.pipe(Layer.provide(mainProcessBaseLayer)); // PGlite needs ConfigurationService
        const databaseLayer = DatabaseServiceLive.pipe(Layer.provide(Layer.merge(pgliteLayer, telemetryLayer))); // DB needs PGlite and Telemetry

        // Update mainProcessLayer
        const mainProcessLayer = Layer.mergeAll(
            mainProcessBaseLayer,
            claudeCodeCliLayer,
            pgliteLayer, // Added
            databaseLayer  // Added
        );

        export async function initializeMainProcessRuntime(): Promise<void> {
          if (mainProcessRuntimeInstance) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Main process Effect runtime already initialized.");
            return;
          }
          try {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Initializing main process Effect runtime...");
            const runtimeContext = await Effect.runPromise(Layer.toRuntime(mainProcessLayer).pipe(Effect.scoped));
            mainProcessRuntimeInstance = Runtime.make(runtimeContext);
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Main process Effect runtime initialized successfully.");

            // Initialize Database
            const dbService = Context.get(mainProcessRuntimeInstance.context, DatabaseService);
            await Effect.runPromise(dbService.initDB());
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Database initialized successfully.");

          } catch (e) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("[Main Runtime] CRITICAL: Failed to create or initialize main process Effect runtime/DB:", e);
            throw e;
          }
        }
        // ... getMainProcessRuntime ...
        ```

**Phase D2: IPC for DatabaseService**

1.  **Define DB IPC Channels:**
    *   **Directory:** `src/helpers/ipc/db/` (Create if it doesn't exist)
    *   **File:** `src/helpers/ipc/db/db-channels.ts`
    *   **Content:** (Copy from your prompt - looks good)

2.  **Implement Main Process DB IPC Listeners:**
    *   **File:** `src/helpers/ipc/db/db-listeners.ts`
    *   **Action:** Create listeners. Ensure `extractErrorForIPC` is defined (copy from `ollama-listeners.ts` or `claude-code-cli-listeners.ts` if not already a shared utility).
    *   **Content:** (Copy from your prompt - this looks mostly correct, ensure all methods from `DatabaseService` are covered).

3.  **Register DB IPC Listeners:**
    *   **File:** `src/main.ts`
    *   **Action:**
        *   Import `addDatabaseEventListeners` from `./helpers/ipc/db/db-listeners`.
        *   Call `addDatabaseEventListeners(getMainProcessRuntime());` inside `app.whenReady().then(async () => { ... after main runtime init ... });`.
            ```typescript
            // src/main.ts
            // ...
            import { addDatabaseEventListeners } from "./helpers/ipc/db/db-listeners"; // New
            // ...

            app.whenReady().then(async () => {
              // ... (Ollama and Claude Code listener registration) ...
              try {
                // ... (initializeMainProcessRuntime call) ...
                const mainRuntime = getMainProcessRuntime(); // Get after init
                // ... (addClaudeCodeCliEventListeners(mainRuntime)) ...
                addDatabaseEventListeners(mainRuntime); // New
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.log("[Main Process] Successfully registered Database listeners.");
              } catch (error) {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("[Main Process] Failed to start main process services or Database listeners:", error);
              }
              // ...
            });
            ```

4.  **Expose DB IPC Context in Preload:**
    *   **File:** `src/helpers/ipc/db/db-context.ts`
    *   **Action:** Ensure `DBSession`, `DBMessage`, `DBToolCall` types are imported from `@/services/db` (which should re-export from `DatabaseSchemas.ts`).
    *   **Content:** (Copy from your prompt - looks good)

5.  **Update `context-exposer.ts` and `types.d.ts`:**
    *   **File:** `src/helpers/ipc/context-exposer.ts`
    *   **Action:** Add `exposeDatabaseContext()` call.
    *   **File:** `src/types.d.ts`
    *   **Action:** Define `DatabaseAPI` interface and add `database: DatabaseAPI;` to `ElectronAPI`. (Copy from your prompt - ensure types are imported from `@/services/db`).

**Phase D3: Renderer-Side Database Service Proxy**

1.  **Create Proxy Layer:**
    *   **File:** `src/services/db/DatabaseServiceRendererProxy.ts`
    *   **Content:** (Copy from your prompt - looks good. This layer makes the IPC calls look like a local Effect service to the renderer).

2.  **Export Proxy from `src/services/db/index.ts`:**
    *   **Action:** Add `export * from "./DatabaseServiceRendererProxy";`

3.  **Integrate Proxy into Renderer Runtime:**
    *   **File:** `src/services/runtime.ts` (Renderer's runtime)
    *   **Action:**
        *   Import `DatabaseServiceRendererProxyLive` from `@/services/db`.
        *   Add `DatabaseService` to `FullAppContext` type.
        *   Add `DatabaseServiceRendererProxyLive` to `FullAppLayer`.
        ```typescript
        // src/services/runtime.ts
        // ...
        import { DatabaseService, DatabaseServiceRendererProxyLive } from "@/services/db"; // Use the renderer proxy

        // Update FullAppContext type
        export type FullAppContext = /* ... existing ... */ | DatabaseService;

        export function buildFullAppLayer() {
          // ...
          const databaseProxyLayer = DatabaseServiceRendererProxyLive; // This is for the renderer
          // ...
          return Layer.mergeAll(
            // ... existing layers ...
            databaseProxyLayer,
            // ...
          );
        }
        // ...
        ```

**Phase D4: Claude Code Service & Chat Session DB Integration**

1.  **Modify `ClaudeCodeCliServiceLive` (Main Process) to use `DatabaseService`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliServiceLive.ts`
    *   **Action:**
        *   Add `DatabaseService` to its dependencies (it's already in `MainProcessAppContext`, so `ClaudeCodeCliServiceLive` which is part of `mainProcessLayer` can access it).
        *   Modify `executeCommand` and `streamCommand`:
            *   **Session Management:**
                *   These methods now need to accept a `sessionId: string` as part of their `ClaudeExecParams` or as a separate argument. This `sessionId` will be generated by the renderer (`useAgentChat`) and passed via IPC.
                *   At the start of each method, use `dbService.getSession(sessionId)`. If it doesn't exist, create and save a new `DBSession` record. Always update `last_updated_at`.
            *   **Saving User Prompt:**
                *   Extract the user's prompt (from `ClaudeExecParams.prompt` which is formatted by `claudeCliFormatters.ts`).
                *   Create a `DBMessage` (role: "user", content: extracted prompt, `id: crypto.randomUUID()`, `session_id: sessionId`, `timestamp`).
                *   Save it: `yield* _(dbService.saveMessage(userMessageToSave));`
            *   **Saving Assistant Response (and Tool Calls):**
                *   **Non-Streaming (`executeCommand`):**
                    *   After receiving the complete `rawCliResponse` string from the CLI:
                    *   Parse it into `ClaudeCliCompletionResponse` (using your schema).
                    *   Extract `textContent` and any `tool_calls`.
                    *   Create assistant's `DBMessage` (`id: crypto.randomUUID()`, `role: "assistant"`, `content: textContent`, `session_id`, `timestamp`). Save it.
                    *   If `tool_calls` exist: For each tool call, create a `DBToolCall` linked to the assistant's message ID (`id: tool_call.id`, `message_id: assistantMessageId`, `tool_name: tool_call.function.name`, `arguments_json: tool_call.function.arguments`, `status: "pending"`, timestamps). Save each.
                *   **Streaming (`streamCommand` - logic primarily in `claude-code-listeners.ts`):**
                    *   The IPC listener (`claude-code-listeners.ts`) for `claudeCodeChannels.chatStream` needs access to `DatabaseService` from the `mainProcessRuntime`.
                    *   When the stream starts: Generate an `assistantMessageId = crypto.randomUUID();`.
                    *   Initialize `let fullAssistantContent = "";` and `const toolCallsDetected: DBToolCall[] = [];`.
                    *   Inside the `Stream.runForEach` (or `for await...of cliStream` if you refactored `ClaudeCodeCliService.streamCommand` to return an `AsyncGenerator<string>`):
                        *   Parse each `rawJsonStringChunk` into `ClaudeCliStreamChunk`.
                        *   Extract `textContentChunk` and any `toolCallChunks`.
                        *   Append `textContentChunk` to `fullAssistantContent`.
                        *   Aggregate `toolCallChunks` into `toolCallsDetected`. *This part is complex for streaming tool calls, as arguments can also stream. For an initial pass, you might only fully save tool calls if they arrive complete in one chunk, or save them once the full assistant message is aggregated.*
                        *   Send the `rawJsonStringChunk` to the renderer as before.
                    *   **After the stream ends (`:done` or error):**
                        *   Create the final `DBMessage` for the assistant (`id: assistantMessageId`, `role: "assistant"`, `content: fullAssistantContent`, `session_id`, `timestamp`). Save it.
                        *   If `toolCallsDetected` has items, save them to `DBToolCall` table, linked to `assistantMessageId`.
                        *   Update session `last_updated_at`.

2.  **Modify `useAgentChat` (Renderer Process):**
    *   **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Action:**
        *   Add `DatabaseService.Tag` to its dependencies (will resolve to `DatabaseServiceRendererProxyLive`).
        *   **Session ID Management:**
            *   Add `currentSessionId: string | null` to the hook's state.
            *   When `useAgentChat` initializes or when the chat is cleared/reset, set `currentSessionId` to `null`.
            *   When the *first* message is sent in a new chat (i.e., `currentSessionId` is `null`):
                *   Generate a new `sessionId = crypto.randomUUID();`.
                *   Set `currentSessionId` state.
                *   This `sessionId` will then be passed to `ChatOrchestratorService` (or directly to the main process if `ClaudeCodeCliService` is called without orchestrator).
        *   **Passing `sessionId`:**
            *   The `ChatOrchestratorService.streamConversation` and `generateConversationResponse` methods need to be updated to accept an optional `sessionId?: string`.
            *   If `sessionId` is provided, the orchestrator should pass it along to the underlying `AgentLanguageModel` provider (if that provider is the Claude Code CLI provider, it will use it). For other providers (OpenAI API, Anthropic API), the orchestrator itself (if running in main) or the `AgentLanguageModel` provider (if running in main) would use this `sessionId` to interact with `DatabaseService` to save messages. *This implies that `ChatOrchestratorService` itself might need to be a main process service accessed via IPC if it's to coordinate DB saving for API-based providers.*
            *   **Simpler for now for Claude Code:** The `ClaudeCodeCliAgentLanguageModelLive` (renderer) will receive the `sessionId` via its options (e.g., in `StreamTextOptions`/`GenerateTextOptions` or a custom context). It then passes this `sessionId` over IPC to the main process `claude-code-listeners.ts`, which then passes it to `ClaudeCodeCliServiceLive`.
        *   **History Loading:**
            *   `useEffect(() => { ... }, [currentSessionId, dbService]);`
            *   If `currentSessionId` is set, call `dbService.getMessagesForSession(currentSessionId)`.
            *   For each `DBMessage`, fetch its `DBToolCall[]` using `dbService.getToolCallsForMessage(message.id)`.
            *   Transform `DBMessage` and `DBToolCall` arrays into `UIAgentChatMessage[]` and update the local `messages` state.
        *   **Optimistic Updates & Stream Handling:**
            *   When user sends a message: Optimistically add to UI `messages` state. The *actual saving* of the user message for Claude Code provider is done by `ClaudeCodeCliService` in main.
            *   When `streamText` from `ChatOrchestratorService` (backed by Claude Code provider's IPC mechanism) emits `AiResponse` chunks:
                *   These chunks represent what the main process CLI service has processed and *already saved (or is about to save the full response)* to the DB.
                *   Append text to the current assistant message in UI.
                *   If tool calls are part of the `AiResponse` (because the CLI indicated them), display them.

**Phase D5: Testing**

1.  **Main Process Tests (`DatabaseServiceImpl.test.ts`, `ClaudeCodeCliServiceLive.test.ts`):**
    *   `DatabaseServiceImpl.test.ts`: Use an in-memory PGlite instance. Test all CRUD operations.
    *   `ClaudeCodeCliServiceLive.test.ts`: Mock `DatabaseService` and `ClaudeCliExecutor`. Verify that service methods correctly interact with the mocked DB (e.g., `saveSession` called with correct data, `saveMessage` called for user and assistant).
2.  **Renderer Process Tests (`DatabaseServiceRendererProxy.test.ts`, `useAgentChat.test.ts`):**
    *   `DatabaseServiceRendererProxy.test.ts`: Mock `window.electronAPI.database`. Test that proxy methods correctly invoke IPC and handle responses/errors.
    *   `useAgentChat.test.ts`:
        *   Mock `DatabaseService` (the proxy).
        *   Test history loading on `sessionId` change.
        *   Test `sessionId` generation and passing.
        *   Test UI updates based on streamed messages (which are now assumed to be persisted by the backend).
3.  **E2E Test:**
    *   Perform a chat session using "Claude Code (CLI)" provider.
    *   Verify messages appear.
    *   Restart the application.
    *   Open the `AgentChatPane` again. The `sessionId` management in `useAgentChat` should allow it to load the previous session's messages from the database. (This implies `useAgentChat` needs a way to persist/restore its `currentSessionId`, perhaps via `localStorage` or by listing available sessions from the DB).

---
This is a complex integration. Pay close attention to where data is saved (main process for Claude Code provider) versus where it's displayed and managed for UI state (renderer process). The `sessionId` is key to linking everything.

Tool call streaming and aggregation for DB saving is particularly tricky. The simplest initial approach for streamed tool calls is to aggregate them in the main process listener and save them once the full assistant message (that contained the tool calls) is complete.

Remember to use `crypto.randomUUID()` for generating IDs for sessions, messages, and tool calls where appropriate. Timestamps should be `Math.floor(Date.now() / 1000)`.

```
思考ログからコードを生成します。ユーザーは、Claude Codeサービスをデータベースに接続し、メッセージやツールコールを含むすべてのセッション情報をデータベースに保存したいと考えています。PGliteを使用します。

**計画：**

1.  **データベースサービス定義（`src/services/db/`）：**
    *   `DatabaseService`インターフェース（`DatabaseService.ts`）を定義します。
    *   メソッド：`initDB`、`saveSession`、`getSession`、`saveMessage`、`getMessagesForSession`、`saveToolCall`、`getToolCallsForMessage`。
    *   DB操作用のエラータイプ（`DatabaseError`）。
    *   `@effect/schema`を使用したセッション、メッセージ、ツールコールテーブルのスキーマ定義。
    *   PGliteインスタンスを初期化して提供する`PGliteServiceLive`レイヤー（`PGliteService.ts`）を作成します（`docs/pglite.md`に基づく）。
    *   `PGliteService.Tag`に依存する`DatabaseService.Tag`を提供する`DatabaseServiceImpl.ts`を実装します。
    *   `DatabaseServiceImpl`内にスキーマ作成ロジック（例：`CREATE TABLE IF NOT EXISTS ...`）を追加します。

2.  **データベースサービスを使用するようにAIサービスを更新：**
    *   **`AgentChatSessionLive`（存在する場合、またはフェーズ8の一部として作成される場合）：**
        *   `DatabaseService.Tag`に依存するように変更します。
        *   `addMessage`：メッセージをDBに保存します。
        *   `getHistory`：セッションのメッセージをDBから取得します。
        *   `clearHistory`：セッションのメッセージをDBから削除します。
        *   `sessionId`の概念が必要です。
    *   **`ChatOrchestratorServiceLive`（ツールコールと結果を直接処理する場合）：**
        *   `DatabaseService.Tag`に依存するように変更します。
        *   LLMによってツールコールが行われた場合、`tool_call`の詳細（ID、名前、引数）を、それを含んでいたアシスタントメッセージに関連付けてDBに保存します。
        *   ツール結果が受信されてLLMに返送された場合、`tool_result`（内容、関連する`tool_call_id`）をDBに保存します。
    *   **`ClaudeCodeCliAgentLanguageModelLive`（または他の`AgentLanguageModel`実装）：**
        *   これらのサービスは主に、`tool_calls`を含む可能性のある`AiResponse`オブジェクトを*生成*します。これらの`tool_calls`の保存は、LLM応答が受信された後、セッションを管理するより高いレベル（おそらく`AgentChatSession`または`ChatOrchestratorService`）で行われるべきです。
        *   同様に、`AgentLanguageModel`が入力履歴の一部として`tool_result`メッセージを受信した場合、その`tool_result`は以前に保存されているはずです。

3.  **DBのデータモデル/スキーマ：**
    *   **Sessionsテーブル：**
        *   `id`（TEXT、PRIMARY KEY、例：UUIDまたはペインIDから派生）
        *   `created_at`（INTEGER、Unixタイムスタンプ）
        *   `last_updated_at`（INTEGER、Unixタイムスタンプ）
        *   `provider_key`（TEXT、例："ollama_gemma3_1b"、"claude_code_cli"）
        *   `model_name`（TEXT、オプション）
        *   `system_prompt`（TEXT、オプション）
        *   `metadata_json`（TEXT、オプション、他のセッション設定用）
    *   **Messagesテーブル：**
        *   `id`（TEXT、PRIMARY KEY、例：UUIDまたはLLM提供のID（安定している場合））
        *   `session_id`（TEXT、FOREIGN KEY to sessions.id）
        *   `role`（TEXT、"user"、"assistant"、"system"、"tool"）
        *   `content`（TEXT、null許容）
        *   `name`（TEXT、null許容、ツールロール用）
        *   `tool_call_id`（TEXT、null許容、ツールロール応答用）
        *   `timestamp`（INTEGER、Unixタイムスタンプ）
        *   `provider_message_id`（TEXT、null許容、AIプロバイダーからのID（利用可能な場合））
        *   `metadata_json`（TEXT、オプション、使用状況統計、終了理由など）
    *   **ToolCallsテーブル（アシスタントメッセージにリンク）：**
        *   `id`（TEXT、PRIMARY KEY、`tool_calls[].id`から）
        *   `message_id`（TEXT、FOREIGN KEY to messages.id - コールを行ったアシスタントメッセージ）
        *   `tool_name`（TEXT、`tool_calls[].function.name`から）
        *   `arguments_json`（TEXT、`tool_calls[].function.arguments`から）
        *   `result_json`（TEXT、null許容、ツールによって返された結果を文字列化したもの）
        *   `status`（TEXT、"pending"、"executed_success"、"executed_error"）
        *   `created_at`（INTEGER）
        *   `updated_at`（INTEGER）

4.  **ランタイム統合：**
    *   `src/services/runtime.ts`の`FullAppLayer`に`PGliteServiceLive`と`DatabaseServiceLive`を追加します。
    *   PGliteが正しく初期化されることを確認します（例：メインプロセスのファイルシステムパス、またはPGliteがメインで実行され、DBサービスがIPC経由でアクセスされる場合は共有コンテキスト）。**Claude Code CLIサービスもメインプロセスで実行されるため、ClaudeサービスがDBに直接ログを記録する必要がある場合は、PGliteもメインプロセスで実行するのがデータの一貫性の観点から最善かもしれません。**あるいは、レンダラー側のサービス（`AgentChatSession`など）のみがログを記録する場合、IndexedDBを使用したレンダラー内のPGliteで問題ありません。
    *   ユーザーはPGliteを「Claude Codeサービス」に接続したいと考えています。これは、CLIの対話が発生する場所でロギングが行われる可能性があることを意味します。CLI対話サービス（`ClaudeCodeCliService`）がメインプロセスにある場合、それが使用するDBサービスもそのPGliteインスタンスをメインプロセスに持つべきです。

5.  **`useAgentChat`と`AgentChatPane`のリファクタリング：**
    *   `useAgentChat`は、履歴を管理するために`AgentChatSession.Tag`を使用するようになります。
    *   メッセージの表示は`AgentChatSession.getHistory()`から行われます。
    *   `AgentChatPane`でのツールコール表示は、必要に応じて`DatabaseService`から詳細を取得できます（ただし、ツールコール/結果の詳細は通常`AgentChatMessage`オブジェクト自体の一部です）。

**特定の指示構造：**

*   **フェーズD1：PGliteサービス設定**
    *   `PGliteService.ts`（PGliteインスタンス用のEffectサービス）を作成します。
    *   PGliteデータパス用に`ConfigurationService`を更新します。
    *   `PGliteServiceLive`を*メインプロセスランタイム*（`src/main-process-runtime.ts`）に統合します（Claudeサービスがログを記録する必要がある場合）。
    *   PGliteがメインにある場合、レンダラーからのDatabaseServiceアクセス用にIPCを設定します。
*   **フェーズD2：データベースサービスとスキーマ**
    *   テーブルスキーマ（`SessionSchema`、`MessageSchema`、`ToolCallSchema`）を定義します。
    *   `DatabaseService.ts`（インターフェース）と`DatabaseServiceImpl.ts`（PGliteを使用した実装）を作成します。
    *   `DatabaseServiceImpl`にテーブルを作成するための`initDB`を実装します。
*   **フェーズD3：Claude CodeサービスDB統合**
    *   `ClaudeCodeCliServiceLive`（またはCLI実行をラップするメインプロセスサービス）を`DatabaseService.Tag`に依存するように変更します。
    *   セッションが開始されたとき（例：新しいチャットのCLIへの最初の呼び出し）、セッションレコードを作成します。
    *   ユーザープロンプトをメッセージとしてログに記録します。
    *   CLI応答をアシスタントメッセージとしてログに記録します。
    *   CLI出力がツールコールを示している場合は、それらをログに記録します。
    *   アプリがツールを実行して結果をCLIに返送する場合、それらのツール結果メッセージをログに記録します。
*   **フェーズD4：UIとチャットセッション統合（レンダラー）**
    *   `AgentChatSessionLive`（レンダラーでチャット状態を管理する別のサービスとして存在する場合）を`DatabaseService.Tag`（IPC経由でDBがメインにある場合）を使用するように変更します。
    *   または、`useAgentChat`を`DatabaseService.Tag`を使用して履歴を取得し、メッセージを保存するように変更します。このフックは現在の`sessionId`も管理する必要があります。
*   **フェーズD5：テスト**
    *   `DatabaseServiceImpl`の単体テスト（PGliteをモック）。
    *   データを保存するClaude Codeサービスの統合テスト。
    *   E2Eテスト：チャット、アプリを閉じる、再度開く、チャット履歴を確認する。

**キー決定：PGliteの実行場所**

ユーザーは「Claude Codeサービスをデータベースに接続する」ことを望んでいます。
Claude Codeサービス（具体的にはCLIを実行する`ClaudeCodeCliService`）は**メインプロセス**で実行されます。
したがって、PGliteインスタンスとそれを直接使用する`DatabaseService`も**メインプロセス**に配置して、`ClaudeCodeCliService`がデータをログに記録できるようにする必要があります。

レンダラー側のコンポーネント（`AgentChatPane`や`AgentChatSession`など）は、新しいIPCチャネルセットを介してこのメインプロセスの`DatabaseService`と対話します。

これは次のことを意味します：
1.  `PGliteServiceLive`と`DatabaseServiceLive`は`src/main-process-runtime.ts`の`mainProcessLayer`の一部です。
2.  データベース操作用の新しいIPCチャネル（`db-channels.ts`）、リスナー（メインの`db-listeners.ts`）、コンテキスト（プリロードの`db-context.ts`）。
3.  これらのIPC呼び出しを使用するレンダラー側の`DatabaseService`プロキシ/アダプター。

PGliteをメインプロセスに配置することを反映するように計画を修正しましょう。

**メインプロセスPGliteの改訂計画：**

1.  **フェーズD1：メインプロセスのPGliteとデータベースサービス**
    *   `ConfigurationService`：`DB_DATA_DIR`キー（例：`pglite-data`）を追加します。
    *   `PGliteService.ts`（メインプロセス）：`app.getPath('userData')`と`DB_DATA_DIR`を使用して`file://` URIで`PGlite`インスタンスを作成します。
    *   `DatabaseService.ts`（インターフェース、以前と同じ）。
    *   `DatabaseSchemas.ts`：セッション、メッセージ、ツールコールテーブルのEffectスキーマを定義します。
    *   `DatabaseServiceImpl.ts`（メインプロセス）：`DatabaseService.Tag`を実装し、`PGliteService.Tag`に依存します。テーブルを作成するための`initDB`メソッドを含みます。
    *   `main-process-runtime.ts`：`mainProcessLayer`に`PGliteServiceLive`と`DatabaseServiceLive`を追加します。起動時に`initDB`を呼び出します。
2.  **フェーズD2：DatabaseServiceのIPC**
    *   `db-channels.ts`：すべての`DatabaseService`メソッドのIPCチャネルを定義します。
    *   `db-listeners.ts`（メインプロセス）：
        *   各チャネルのリスナー。
        *   `mainProcessRuntime`から`DatabaseService.Tag`に依存します。
        *   対応するDBサービスメソッドを実行します。
        *   データのシリアライズ/デシリアライズを処理します（例：`Date`オブジェクト、`Uint8Array`（存在する場合））。
    *   `db-context.ts`（プリロードスクリプト）：`window.electronAPI.database`を介してIPCインボーカーを公開します。
    *   `types.d.ts`：`ElectronAPI`と`Window`インターフェースを更新します。
3.  **フェーズD3：レンダラー側のデータベースサービスプロキシ**
    *   `src/services/db/DatabaseServiceRendererProxy.ts`を作成します。
    *   これは、*レンダラーのEffectランタイム*に`DatabaseService.Tag`を提供する`Layer`になります。
    *   その実装は、`window.electronAPI.database`を使用してメインプロセスを呼び出します。
    *   このプロキシはIPC呼び出しを`Effect`に変換し、エラーをマッピングします。
4.  **フェーズD4：Claude CodeサービスとチャットセッションDB統合**
    *   **`ClaudeCodeCliServiceLive`（メインプロセス）：**
        *   `DatabaseService.Tag`（`mainProcessRuntime`から）に依存するようになります。
        *   担当：
            *   各会話の`sessionId`を作成/検索します。
            *   CLIに渡されたユーザープロンプト（`role: 'user'`）を保存します。
            *   CLI応答（`role: 'assistant'`）を保存します。
            *   CLIによって行われたツールコール（`role: 'assistant', tool_calls: [...]`）を保存します。
            *   CLIに返送されたツール結果（`role: 'tool'`）を保存します。
    *   **`useAgentChat`（レンダラープロセス）：**
        *   `DatabaseService.Tag`（`DatabaseServiceRendererProxy`に解決される）に依存するようになります。
        *   `sessionId`が必要になります（おそらく`AgentChatPane`へのプロップとして渡されるか、最初のメッセージ送信時に`useAgentChat`自体によって生成/管理されます）。
        *   `sendMessage`：
            *   ユーザーのメッセージは、主にCLIへの入力として*メインプロセス*の`ClaudeCodeCliService`によって保存されるようになります。
            *   フックは、ローカルの`messages`状態に楽観的に追加する可能性があります。
        *   **履歴の読み込み：**
            *   `useEffect`（マウント時または`sessionId`変更時）で、`databaseService.getMessagesForSession(sessionId)`を呼び出します。
            *   `DBMessage`と`DBToolCall`配列を`UIAgentChatMessage[]`に変換し、ローカルの`messages`状態を更新します。
        *   **ツールコール表示：** `AiResponse`チャンク（`AgentChatMessage`をラップ）に`tool_calls`が含まれている場合、`useAgentChat`はUIを更新します。DBは主に永続化と履歴用です。
5.  **フェーズD5：テスト**（以前と同様ですが、レンダラーテストのIPCレイヤーを反映）

これは、「Claude Codeサービス」（メインプロセスの`ClaudeCodeCliService`）がデータベースを直接使用するためのより堅牢なアーキテクチャです。

ユーザー指示の再確認：「Claude Codeサービスをデータベースに接続し、メッセージやツールコールを含むすべてのセッション情報をデータベースに保存する」。
「Claude Codeサービス」はメインプロセスの`ClaudeCodeCliService`です。
「セッション情報」は`sessions`テーブルを意味します。
「メッセージ」はユーザープロンプト、アシスタント応答、ツール結果を意味します。
「ツールコール」はツールを呼び出すアシスタント要求を意味します。

メインプロセスの`ClaudeCodeCliService`は次のことを行う必要があります：
-   `sessionId`を受け入れるか、セッションを管理します。チャットペインごとの場合、`sessionId`はペインのIDである可能性があり、レンダラーからIPC経由で渡されます。
-   `executeCommand`または`streamCommand`が呼び出されたとき：
    1.  `sessionId`のセッションがDBに存在することを確認し、存在しない場合は作成します。
    2.  CLIのユーザーの`ClaudeExecParams.prompt`（またはフォーマットされたメッセージ）をDBの`user`メッセージとして`sessionId`にリンクしてログに記録します。
    3.  CLIを実行します。
    4.  CLIがデータを出力するとき（`stream-json`のJSONチャンク）：
        *   各チャンクを解析します。
        *   アシスタントからのテキスト応答である場合は、`assistant`メッセージとして保存します。
        *   `tool_calls`が含まれている場合は、このアシスタントメッセージのIDにリンクされた`tool_calls`テーブルに各ツールコールを保存します。
    5.  （後で、アプリがツールを呼び出して結果をCLIに返送する場合）：結果がCLIに送信されると、それは保存される`tool`メッセージになります。

レンダラーの`ChatOrchestratorService`は、メインプロセスサービスがそのプロバイダーのロギングを処理する場合、保存のためにそれほど変更する必要がない場合があります。
`useAgentChat`フックは、主にDBから履歴を*取得*し（IPCプロキシ経由）、ストリームから到着するメッセージ（メインプロセス側でも保存されている）を表示します。

ツールコールのストリーミングとDB保存のための集約は特にトリッキーです。ストリーミングされたツールコールの最も単純な初期アプローチは、メインプロセスリスナーでそれらを集約し、ツールコールを含んでいた完全なアシスタントメッセージが完了したら一度に保存することです。

```python
# Initial analysis of required files for PGlite integration.

# Database Service Related (Main Process)
# 1. `src/services/db/PGliteService.ts` - NEW: Manages PGlite instance.
# 2. `src/services/db/DatabaseSchemas.ts` - NEW: Effect Schemas for DB tables.
# 3. `src/services/db/DatabaseService.ts` - NEW: Interface for DB operations.
# 4. `src/services/db/DatabaseServiceImpl.ts` - NEW: Implementation using PGlite.
# 5. `src/services/db/index.ts` - NEW: Barrel file for db services.

# Main Process Runtime & IPC for DB
# 6. `src/main-process-runtime.ts` - MODIFY: Add PGliteServiceLive, DatabaseServiceLive, call initDB.
# 7. `src/helpers/ipc/db/db-channels.ts` - NEW: Define IPC channels for DB service.
# 8. `src/helpers/ipc/db/db-listeners.ts` - NEW: Main process listeners for DB IPC calls.
# 9. `src/main.ts` - MODIFY: Register DB IPC listeners.
# 10. `src/helpers/ipc/db/db-context.ts` - NEW: Preload script exposure for DB IPC.
# 11. `src/helpers/ipc/context-exposer.ts` - MODIFY: Call exposeDatabaseContext.
# 12. `src/types.d.ts` - MODIFY: Add DatabaseAPI to ElectronAPI and Window.

# Renderer-Side DB Proxy
# 13. `src/services/db/DatabaseServiceRendererProxy.ts` - NEW: Renderer-side proxy for DatabaseService.
# 14. `src/services/db/index.ts` - MODIFY: Export DatabaseServiceRendererProxyLive.
# 15. `src/services/runtime.ts` - MODIFY: Add DatabaseServiceRendererProxyLive to renderer's FullAppLayer.

# Claude Code Service DB Integration (Main Process)
# 16. `src/services/ai/providers/claude_code_cli/ClaudeCodeCliServiceLive.ts` - MODIFY:
#     - Add DatabaseService dependency.
#     - Implement session creation/finding.
#     - Save user prompts, assistant responses, tool_calls, and tool_results.
#     - This service now needs to handle sessionId passing or generation.
# 17. `src/services/ai/providers/claude_code_cli/claudeCliUtils.ts` (ClaudeExecParams) - MODIFY:
#     - Add optional `sessionId?: string` to `ClaudeExecParams`.
# 18. `src/helpers/ipc/claude_code/claude-code-listeners.ts` - MODIFY:
#     - Ensure `sessionId` is passed from IPC params to `ClaudeCodeCliService` methods.
# 19. `src/helpers/ipc/claude_code/claude-code-context.ts` - MODIFY:
#     - Update `chatCompletion` and `streamChat` to accept `sessionId` in their `params` object.
# 20. `src/types.d.ts` - MODIFY: Update `ClaudeExecParams` in global if it's used there directly.

# UI & Chat Session DB Integration (Renderer)
# 21. `src/hooks/ai/useAgentChat.ts` - MODIFY:
#     - Add DatabaseService dependency (via proxy).
#     - Manage `currentSessionId` state.
#     - Load history from DB on mount/sessionId change.
#     - Pass `sessionId` to ChatOrchestratorService or directly in Claude Code CLI params.
#     - Update UI based on streamed messages (which are also being saved by main process).
# 22. `src/services/ai/orchestration/ChatOrchestratorService.ts` - MODIFY:
#     - `streamConversation` and `generateConversationResponse` methods need to accept optional `sessionId`.
#     - This `sessionId` should be plumbed through to the `ClaudeCodeCliAgentLanguageModelLive` if that's the active provider.
# 23. `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts` - MODIFY:
#     - `streamText` and `generateText` methods need to accept `sessionId` (e.g., via `StreamTextOptions`).
#     - This `sessionId` is then passed in the `ClaudeExecParams` over IPC.

# Configuration
# 24. `src/services/configuration/ConfigurationServiceImpl.ts` - MODIFY: Add `DB_DATA_DIR`.

# Tool Related (Future, but mention for completeness of saving tool calls)
# - `ToolHandlerServiceLive` might need to save tool results if it's directly involved.
#   However, with Claude Code CLI, the CLI itself might report tool results back, which `ClaudeCodeCliService` would then save.

# Testing
# - New unit tests for all DB services.
# - New integration tests for IPC DB access.
# - Updated integration tests for ClaudeCodeCliService to verify DB interactions.
# - Updated E2E tests to verify history persistence.

This is a comprehensive list. The agent should proceed phase by phase.
The `extractErrorForIPC` helper should be made a shared utility if it's copied in multiple listener files.
Let's focus on the `streamCommand` path in `ClaudeCodeCliServiceLive` and `claude-code-listeners.ts` for DB saving first, as that's the primary interaction path. Non-streaming can follow the same pattern.
A unique ID for messages (`id: crypto.randomUUID()`) and tool calls (`id: tool_call.id`) is important.
Sessions might be identified by the `pane.id` from the UI, passed down.
The `sessionId` should be added to `ClaudeExecParams` in `claudeCliUtils.ts`.

Let's reconsider the data flow for saving messages to simplify.
The user prompt is known in the renderer when `useAgentChat.sendMessage` is called.
It can be saved to the DB (via IPC) by `useAgentChat` *before* calling the orchestrator.
Or, the `sessionId` and `userPromptMessage` can be passed to the main process, and `ClaudeCodeCliService` saves it. The latter is cleaner as the "owner" of the Claude Code interaction (main process) handles all its related DB writes.

The `ClaudeCodeCliAgentLanguageModelLive` in the renderer will modify its `StreamTextOptions` and `GenerateTextOptions` to include `sessionId` and potentially the initial user message if the main process service is to save it.
The `ClaudeExecParams` will then carry this `sessionId` and user message info.

Revised logic for `ClaudeCodeCliServiceLive` (main process):
It receives `ClaudeExecParams` which includes `sessionId` and the *current* user prompt.
1.  `saveSession` (upsert)
2.  `saveMessage` (for the current user prompt)
3.  Execute CLI.
4.  On CLI response (full or stream end):
    *   `saveMessage` (for the assistant's complete response, including any `tool_calls` details in `metadata_json` or if `tool_calls` is a direct field on `DBMessage`).
    *   If `tool_calls` were made by the assistant, iterate and `saveToolCall` for each.
    *   (Future) If the app then executes these tools and gets results, `updateToolCallResult` and then `saveMessage` (for the `role: 'tool'` message with the result) before sending back to CLI.

This centralizes DB writes for a specific provider interaction within that provider's main process service.
`useAgentChat` in renderer then becomes primarily a *reader* from the DB for history, and a real-time appender for new stream chunks to the UI.
This also means `ChatOrchestratorService` doesn't need to know about the DB directly for message saving if each provider's main-process handler does it. It only needs to pass `sessionId`.
This also means the `AgentChatMessageSchema` for the DB should probably store `tool_calls` as a JSON string if it's a direct field.

Final check of the prompt: "connect our Claude Code service to database, saving all session info including messages and tool calls to database."
This means the `ClaudeCodeCliService` (or its listeners) is the primary point for DB interaction for *its* sessions/messages.
The `AgentChatSession` service (if we implement it fully later for context window management across *any* provider) would then be a layer on top, reading from this common DB structure.

Let's ensure the provided instructions are detailed enough for this main-process-centric saving approach for the Claude Code provider.
The most significant changes will be in:
- `ClaudeCodeCliServiceLive.ts` (main)
- `claude-code-listeners.ts` (main, to pass `sessionId` and parameters correctly)
- `ClaudeCodeCliAgentLanguageModelLive.ts` (renderer, to pass `sessionId` and options)
- `useAgentChat.ts` (renderer, to manage `sessionId` and load history from DB)
- And all the new DB service and IPC files.Okay, Agent, this is a substantial but crucial feature. We're going to integrate PGlite to persist all Claude Code service session information, including messages and tool calls.

**Core Architecture:**

*   **PGlite in Main Process:** The PGlite database instance and the primary `DatabaseService` will run in the Electron main process. This allows the `ClaudeCodeCliService` (which also runs in main to manage the CLI subprocess) to directly interact with the database for logging sessions, messages, and tool calls related to its operations.
*   **IPC Bridge for Database:** Renderer-side components (like `AgentChatPane` and `useAgentChat`) will access database functionalities (primarily for reading history) through a new set of IPC channels.
*   **Schema-Driven:** We'll use `@effect/schema` to define our database table structures.

Here are the specific instructions:

**Phase D1: PGlite & Database Service Setup (Main Process)**

1.  **Add PGlite Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add `@electric-sql/pglite` to `dependencies`.
        ```json
        // In "dependencies":
        "@electric-sql/pglite": "^0.1.25",
        ```
    *   Run `pnpm install`.

2.  **Configure Database Directory:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action:** Inside `DefaultDevConfigLayer`'s `Effect.gen` block, add:
        ```typescript
        yield* _(configService.set("DB_DATA_DIR", "commander-data/pglite-main-db"));
        ```

3.  **Create Directory:** `src/services/db/`

4.  **Create PGlite Service (Main Process):**
    *   **File:** `src/services/db/PGliteService.ts`
    *   **Content:**
        ```typescript
        import { Context, Effect, Layer, Data } from "effect";
        import { PGlite } from "@electric-sql/pglite";
        import path from "path";
        import { app } from "electron";
        import fs from "fs";
        import { ConfigurationService } from "@/services/configuration";
        import { TelemetryService } from "@/services/telemetry"; // For logging init status

        export class PGliteError extends Data.TaggedError("PGliteError")<{
          message: string;
          cause?: unknown;
        }> {}

        export interface PGliteService {
          readonly client: PGlite;
        }
        export const PGliteService = Context.GenericTag<PGliteService>("PGliteService");

        export const PGliteServiceLive = Layer.effect(
          PGliteService,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService); // Added TelemetryService
            const dbDataDirName = yield* _(configService.get("DB_DATA_DIR"));

            const userDataPath = app.getPath("userData");
            const dataDir = path.join(userDataPath, dbDataDirName);

            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }

            yield* _(telemetry.trackEvent({ category: "db_init", action: "pglite_service_start", label: `Data Directory: ${dataDir}` }));

            const pgliteClient = yield* _(Effect.tryPromise({
              try: async () => {
                const client = new PGlite(`file://${dataDir}`);
                await client.waitReady;
                return client;
              },
              catch: (cause) => new PGliteError({ message: "Failed to initialize PGlite client in main process", cause })
            }));

            yield* _(telemetry.trackEvent({ category: "db_init", action: "pglite_service_success", label: "PGlite client ready" }));
            return PGliteService.of({ client: pgliteClient });
          })
        );
        ```

5.  **Create Database Schemas (Effect Schemas):**
    *   **File:** `src/services/db/DatabaseSchemas.ts`
    *   **Content:**
        ```typescript
        import { Schema } from "effect";

        export const DBSessionSchema = Schema.Struct({
          id: Schema.String,
          created_at: Schema.Number, // Unix timestamp (seconds)
          last_updated_at: Schema.Number,
          provider_key: Schema.String,
          model_name: Schema.optional(Schema.String),
          system_prompt: Schema.optional(Schema.String),
          metadata_json: Schema.optional(Schema.String),
        });
        export type DBSession = Schema.Schema.Type<typeof DBSessionSchema>;

        // Re-using AgentChatMessage's ToolCallSchema for structure, but this is for DB storage
        export const DBToolCallFunctionSchema = Schema.Struct({
          name: Schema.String,
          arguments: Schema.String, // Stored as JSON string
        });
        export const DBToolCallItemSchema = Schema.Struct({
          id: Schema.String,
          type: Schema.Literal("function"),
          function: DBToolCallFunctionSchema,
        });
        export type DBToolCallItem = Schema.Schema.Type<typeof DBToolCallItemSchema>;

        export const DBMessageSchema = Schema.Struct({
          id: Schema.String,
          session_id: Schema.String,
          role: Schema.Union(
            Schema.Literal("user"),
            Schema.Literal("assistant"),
            Schema.Literal("system"),
            Schema.Literal("tool")
          ),
          content: Schema.NullishOr(Schema.String),
          name: Schema.optional(Schema.String),
          tool_call_id: Schema.optional(Schema.String), // For tool role response
          tool_calls_json: Schema.optional(Schema.String), // Storing tool_calls array as JSON string
          timestamp: Schema.Number, // Unix timestamp (seconds)
          provider_message_id: Schema.optional(Schema.String),
          metadata_json: Schema.optional(Schema.String),
        });
        export type DBMessage = Schema.Schema.Type<typeof DBMessageSchema>;

        export const DBToolExecutionSchema = Schema.Struct({ // Renamed from DBToolCall to avoid confusion
          id: Schema.String, // This is the tool_call.id from the LLM
          message_id: Schema.String, // FK to the assistant message that made the call
          tool_name: Schema.String,
          arguments_json: Schema.String,
          result_json: Schema.optional(Schema.String),
          status: Schema.Union(
            Schema.Literal("pending"),
            Schema.Literal("executed_success"),
            Schema.Literal("executed_error")
          ),
          created_at: Schema.Number,
          updated_at: Schema.Number,
        });
        export type DBToolExecution = Schema.Schema.Type<typeof DBToolExecutionSchema>;
        ```

6.  **Create Database Service Interface (Main Process):**
    *   **File:** `src/services/db/DatabaseService.ts`
    *   **Content:** (As in prompt, ensure `DatabaseError` is well-defined)

7.  **Implement Database Service (Main Process):**
    *   **File:** `src/services/db/DatabaseServiceImpl.ts`
    *   **Content:** (As in prompt, ensure table creation SQL matches `DatabaseSchemas.ts` structure. E.g., `messages` table needs `tool_calls_json TEXT;`. `tool_calls` table is now `tool_executions`.)
        ```typescript
        // src/services/db/DatabaseServiceImpl.ts
        // ... (imports: Effect, Layer, PGlite, PGliteService, DatabaseService, DatabaseError, DBSession, DBMessage, DBToolExecution, TelemetryService) ...

        export const DatabaseServiceLive = Layer.effect(
          DatabaseService,
          Effect.gen(function*(_) {
            const pgliteService = yield* _(PGliteService);
            const telemetry = yield* _(TelemetryService);
            const client: PGlite = pgliteService.client;

            const runQuery = <T = any>(sql: string, params: any[] = []) => /* ... (as in prompt) ... */ ;
            const runExec = (sql: string, params: any[] = []) => /* ... (as in prompt) ... */ ;

            const initDB = Effect.gen(function*(_) {
              yield* _(telemetry.trackEvent({ category: "db_init", action: "start" }));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS sessions ( /* ... columns from DBSessionSchema ... */ );
              `));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS messages (
                  /* ... columns from DBMessageSchema, including tool_calls_json TEXT ... */
                );
              `));
              yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);`));
              yield* _(runExec(`
                CREATE TABLE IF NOT EXISTS tool_executions ( /* Name changed from tool_calls */
                  /* ... columns from DBToolExecutionSchema ... */
                );
              `));
              yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);`));
              yield* _(telemetry.trackEvent({ category: "db_init", action: "success" }));
            });

            return DatabaseService.of({
              _tag: "DatabaseService",
              initDB: initDB.pipe(Effect.catchAll(e => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("[DB Service] FATAL: initDB failed", e);
                return Effect.die(e);
              })),

              saveSession: (session) => runExec( /* ... (as in prompt, ensure columns match DBSessionSchema) ... */ ).pipe(Effect.asVoid),
              getSession: (sessionId) => runQuery<DBSession>( /* ... (as in prompt) ... */ ).pipe(Effect.map(result => result.rows[0] || null)),
              updateSession: (sessionId, updates) => { /* ... (as in prompt, ensure columns match DBSessionSchema) ... */ },

              saveMessage: (message) => runExec( /* ... (as in prompt, ensure columns match DBMessageSchema, including tool_calls_json) ... */ ).pipe(Effect.asVoid),
              getMessagesForSession: (sessionId, limit = 50, offset = 0) => runQuery<DBMessage>( /* ... (as in prompt) ... */ ).pipe(Effect.map(result => result.rows)),

              saveToolCall: (toolExecution: DBToolExecution) => runExec( /* ... (use DBToolExecutionSchema for columns) ... */ ).pipe(Effect.asVoid), // Renamed param and type
              updateToolCallResult: (toolCallId, resultJson, status) => runExec( /* ... (SQL for tool_executions table) ... */ ).pipe(Effect.asVoid),
              getToolCallsForMessage: (messageId) => runQuery<DBToolExecution>( /* ... (SQL for tool_executions table) ... */ ).pipe(Effect.map(result => result.rows)),
            });
          })
        );
        ```

8.  **Update `src/services/db/index.ts`:** (As in prompt)

9.  **Update Main Process Runtime & Call `initDB`:**
    *   **File:** `src/main-process-runtime.ts` (As in prompt)

**Phase D2: IPC for DatabaseService**

1.  **Define DB IPC Channels (`db-channels.ts`):**
    *   **Directory:** `src/helpers/ipc/db/`
    *   **File:** `src/helpers/ipc/db/db-channels.ts` (As in prompt)

2.  **Implement Main Process DB IPC Listeners (`db-listeners.ts`):**
    *   **File:** `src/helpers/ipc/db/db-listeners.ts`
    *   **Action:** Ensure `extractErrorForIPC` is correctly defined or imported from a shared utility. Implement listeners for all `DatabaseService` methods.
    *   **Content:** (As in prompt - ensure `DatabaseService`, `DatabaseError`, `DBSession`, `DBMessage`, `DBToolExecution` types are imported from `@/services/db`)

3.  **Register DB IPC Listeners in `src/main.ts`:** (As in prompt)

4.  **Expose DB IPC Context in Preload (`db-context.ts`):**
    *   **File:** `src/helpers/ipc/db/db-context.ts`
    *   **Action:** Import `DBSession`, `DBMessage`, `DBToolExecution` types from `@/services/db`.
    *   **Content:** (As in prompt)

5.  **Update `context-exposer.ts` and `types.d.ts`:** (As in prompt)

**Phase D3: Renderer-Side Database Service Proxy**

1.  **Create Proxy Layer:**
    *   **File:** `src/services/db/DatabaseServiceRendererProxy.ts`
    *   **Content:** (As in prompt - ensure types are imported from `@/services/db`)

2.  **Export Proxy from `src/services/db/index.ts`:** Add `export * from "./DatabaseServiceRendererProxy";`

3.  **Integrate Proxy into Renderer Runtime (`src/services/runtime.ts`):** (As in prompt)

**Phase D4: Claude Code Service & Chat Session DB Integration**

1.  **Update `ClaudeExecParams` to include `sessionId`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/claudeCliUtils.ts`
    *   **Action:**
        ```typescript
        export interface ClaudeExecParams {
          sessionId?: string; // Add this
          // ... existing fields ...
        }
        ```

2.  **Modify `ClaudeCodeCliServiceLive` (Main Process) to use `DatabaseService`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliServiceLive.ts`
    *   **Action:**
        *   Add `DatabaseService` to its dependencies: `const dbService = yield* _(DatabaseService);`
        *   Modify `executeCommand` and `streamCommand`:
            *   Expect `sessionId` in `params: ClaudeExecParams`. If missing, generate one or log an error.
            *   **Session Handling:**
                ```typescript
                const sessionId = params.sessionId || crypto.randomUUID(); // Ensure sessionId
                const existingSession = yield* _(dbService.getSession(sessionId));
                const now = Math.floor(Date.now() / 1000);
                if (!existingSession) {
                  const newSession: DBSession = {
                    id: sessionId,
                    created_at: now,
                    last_updated_at: now,
                    provider_key: "claude_code_cli",
                    model_name: params.model, // from ClaudeExecParams
                    system_prompt: params.systemPrompt,
                  };
                  yield* _(dbService.saveSession(newSession));
                } else {
                  yield* _(dbService.updateSession(sessionId, { last_updated_at: now, model_name: params.model, system_prompt: params.systemPrompt }));
                }
                ```
            *   **Saving User Prompt:**
                *   `const userPrompt = params.prompt || ""; // The formatted prompt string`
                *   `const userMessageToSave: DBMessage = { id: crypto.randomUUID(), session_id: sessionId, role: "user", content: userPrompt, timestamp: now };`
                *   `yield* _(dbService.saveMessage(userMessageToSave));`
            *   **Saving Assistant Response (Non-Streaming - `executeCommand`):**
                *   After getting `rawCliResponse` and parsing it (e.g., into `parsedCliJsonResponse` of type `ClaudeCliCompletionResponse`):
                *   `const assistantMessageId = crypto.randomUUID();`
                *   `const assistantText = parsedCliJsonResponse.choices[0]?.message?.content || "";`
                *   `const toolCallsRaw = parsedCliJsonResponse.choices[0]?.message?.tool_calls; // Array of {id, type, function: {name, arguments}}`
                *   `const assistantMessageToSave: DBMessage = { id: assistantMessageId, session_id: sessionId, role: "assistant", content: assistantText, tool_calls_json: toolCallsRaw ? JSON.stringify(toolCallsRaw) : undefined, timestamp: Math.floor(Date.now() / 1000) };`
                *   `yield* _(dbService.saveMessage(assistantMessageToSave));`
                *   If `toolCallsRaw`:
                    ```typescript
                    for (const tc of toolCallsRaw) {
                      const dbToolCall: DBToolExecution = {
                        id: tc.id,
                        message_id: assistantMessageId,
                        tool_name: tc.function.name,
                        arguments_json: tc.function.arguments, // Arguments are already a JSON string
                        status: "pending",
                        created_at: Math.floor(Date.now() / 1000),
                        updated_at: Math.floor(Date.now() / 1000),
                      };
                      yield* _(dbService.saveToolCall(dbToolCall));
                    }
                    ```
            *   **Saving Assistant Response (Streaming - `streamCommand` and its listener in `claude-code-listeners.ts`):**
                *   The IPC listener for `claudeCodeChannels.chatStream` in `claude-code-listeners.ts` needs access to `DatabaseService`. Pass the `mainProcessRuntime` to it as done for other listener files.
                *   **In `claude-code-listeners.ts`:**
                    ```typescript
                    // Inside ipcMain.on(claudeCodeChannels.chatStream, ...)
                    // ...
                    const dbService = Context.get(runtime.context, DatabaseService); // Get from passed runtime
                    const cliParams = ipcCliParams as ClaudeExecParams; // Cast, ensure sessionId is there
                    const sessionId = cliParams.sessionId || crypto.randomUUID(); // Ensure sessionId
                    const assistantMessageId = crypto.randomUUID();
                    let fullAssistantContent = "";
                    let aggregatedToolCalls: any[] = []; // From CLI's tool_calls format

                    // Effect to run within the stream runForEach or after it.
                    // Simplified: saving happens AFTER the stream has fully completed.
                    // This avoids complex per-chunk DB updates for this iteration.

                    // ... (existing program with Stream.runForEach) ...
                    // Modify the program's finalization (after runForEach completes or errors)

                    Effect.runPromise(
                        Effect.provide(program, runtime) // existing run
                    ).then(async () => { // on success of stream
                        if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
                            // Save the complete assistant message
                            const assistantMessageToSave: DBMessage = {
                                id: assistantMessageId,
                                session_id: sessionId,
                                role: "assistant",
                                content: fullAssistantContent,
                                tool_calls_json: aggregatedToolCalls.length > 0 ? JSON.stringify(aggregatedToolCalls) : undefined,
                                timestamp: Math.floor(Date.now() / 1000)
                            };
                            await Effect.runPromise(Effect.provide(dbService.saveMessage(assistantMessageToSave), runtime));
                            if (aggregatedToolCalls.length > 0) {
                                for (const tc of aggregatedToolCalls) {
                                    const dbToolCall: DBToolExecution = {
                                        id: tc.id, message_id: assistantMessageId, tool_name: tc.function.name,
                                        arguments_json: tc.function.arguments, status: "pending",
                                        created_at: Math.floor(Date.now() / 1000), updated_at: Math.floor(Date.now() / 1000)
                                    };
                                    await Effect.runPromise(Effect.provide(dbService.saveToolCall(dbToolCall), runtime));
                                }
                            }
                            await Effect.runPromise(Effect.provide(dbService.updateSession(sessionId, { last_updated_at: Math.floor(Date.now() / 1000) }), runtime));
                            // ... send :done to renderer ...
                        }
                    }).catch(async (error) => {
                        // ... send :error to renderer ...
                        // Optionally save an error message to DB if appropriate
                    }).finally(() => { /* ... */ });

                    // Inside the Stream.runForEach or for await...of cliStream:
                    // (rawJsonStringChunk: string) => {
                    //   ... parse rawJsonStringChunk into cliJsonChunk ...
                    //   const textContentChunk = cliJsonChunk.choices[0]?.delta?.content || "";
                    //   fullAssistantContent += textContentChunk;
                    //   const toolCallDeltas = cliJsonChunk.choices[0]?.delta?.tool_calls;
                    //   if (toolCallDeltas) { /* Aggregate toolCallDeltas logic needed here */ }
                    //   event.sender.send(..., rawJsonStringChunk); // Send raw chunk to renderer for UI update
                    // }
                    ```
                *   **Tool Call Aggregation (Simplified for now):** The Claude CLI's `stream-json` output for `tool_calls` might stream them partially. For this iteration, focus on parsing the *final accumulated* `tool_calls` from the last chunk or the complete message if the CLI sends it that way. Full streaming aggregation of tool call arguments is complex. Assume for now that `tool_calls` appear complete in a chunk or at the end.
                *   **Actual Saving:** It's cleaner if the `ClaudeCodeCliServiceLive.streamCommand` itself returns a stream of structured `AiResponse` objects (after parsing CLI output) and then, after this stream is consumed (e.g., by `Stream.runDrain` in the listener), it performs the save operation for the aggregated message and tool calls. This keeps DB logic within the service.

3.  **Modify `ClaudeCodeCliAgentLanguageModelLive` (Renderer) to pass `sessionId`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Action:** Update `StreamTextOptions` and `GenerateTextOptions` to include an optional `sessionId?: string`.
        ```typescript
        // At the top of the file or in a shared types location for these options
        export interface ClaudeCliProviderOptions {
          sessionId?: string;
        }
        // ...
        // Modify method signatures and params passed to IPC
        // Example for streamText:
        streamText: (options: StreamTextOptions & ClaudeCliProviderOptions) => /* ... */ {
          // ...
          const sdkParams: ClaudeExecParams = {
            sessionId: options.sessionId, // Pass it through
            // ... other params ...
          };
          // ... call window.electronAPI.claudeCodeCli.streamChat(sdkParams, ...)
        },
        generateText: (options: GenerateTextOptions & ClaudeCliProviderOptions) => /* ... similar ... */
        ```

4.  **Modify `useAgentChat` (Renderer Process):**
    *   **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Action:**
        *   Add `DatabaseService.Tag` dependency.
        *   Manage `currentSessionId: string | null` state.
        *   **History Loading:** On mount or `currentSessionId` change, call `dbService.getMessagesForSession(currentSessionId)` and `dbService.getToolCallsForMessage(message.id)` to populate `UIAgentChatMessage[]`. Remember to parse `tool_calls_json` back into an array for UI display.
        *   **`sendMessage`:**
            *   If `currentSessionId` is null, generate one (`crypto.randomUUID()`) and set it.
            *   Pass `sessionId: currentSessionId` in the `options` to `chatOrchestrator.streamConversation`.
            *   **User Message Saving:** The user's message is now saved by the main process service. The hook can optimistically add it to the UI.
            *   **Stream Handling:** When chunks arrive, append to UI. The DB saving is handled by the main process.

5.  **Modify `ChatOrchestratorServiceLive` (Renderer):**
    *   **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   **Action:**
        *   Update `streamConversation` and `generateConversationResponse` method signatures in the interface and implementation to accept an optional `sessionId?: string` in their `params` object.
        *   When calling the selected `AgentLanguageModel` provider's methods (e.g., `agentLM.streamText`), pass the `sessionId` along in the options if it was provided to the orchestrator.
            ```typescript
            // Example in streamConversation
            const streamOptions: StreamTextOptions & ClaudeCliProviderOptions = { // Use extended options type
              ...options, // from orchestrator params
              prompt: JSON.stringify({ messages }),
              model: preferredProvider.modelName,
              sessionId: params.sessionId, // Pass sessionId
            };
            return agentLM.streamText(streamOptions) // ...
            ```

**Phase D5: Testing**

1.  **Unit Tests:**
    *   `DatabaseServiceImpl.test.ts`: (Main process) Mock `PGliteService`. Test all CRUD operations.
    *   `ClaudeCodeCliServiceLive.test.ts`: (Main process) Mock `DatabaseService` and `ClaudeCliExecutor`. Verify DB interactions.
    *   `DatabaseServiceRendererProxy.test.ts`: (Renderer) Mock `window.electronAPI.database`. Test IPC proxying.
    *   `useAgentChat.test.ts`: (Renderer) Mock `DatabaseService` (proxy) and `ChatOrchestratorService`. Test `sessionId` management and history loading.
2.  **E2E Test:**
    *   Perform a chat session with "Claude Code (CLI)".
    *   Restart app.
    *   Verify chat history is loaded.

This is a large set of changes. Proceed carefully, testing each component and IPC layer. The main challenge will be ensuring data consistency and correct `sessionId` propagation through all layers for the Claude Code provider.Okay, this is a significant feature: connecting the Claude Code service to a PGlite database to save all session info, messages, and tool calls.

Here's a detailed plan broken down into manageable phases.

**Overall Architecture:**

*   **PGlite in Main Process:** The database instance and `DatabaseService` will reside in the Electron main process. This is crucial because the `ClaudeCodeCliService` (which wraps the CLI execution) also runs in the main process and will be the primary writer to this database for Claude Code interactions.
*   **IPC for Database Access:** Renderer-side components (like `AgentChatPane` and `useAgentChat`) will primarily read history and potentially trigger some session management via a new set of IPC channels connected to the main process `DatabaseService`.
*   **Schema-Driven:** We'll use `@effect/schema` for database table structures.

---

**Phase D1: PGlite & Database Service Setup (Main Process)**

1.  **Add PGlite Dependency:**
    *   In `package.json`, add `@electric-sql/pglite` to `dependencies`.
        ```json
        "@electric-sql/pglite": "^0.1.25",
        ```
    *   Run `pnpm install`.

2.  **Configure Database Directory:**
    *   In `src/services/configuration/ConfigurationServiceImpl.ts`, within `DefaultDevConfigLayer`, add:
        ```typescript
        yield* _(configService.set("DB_DATA_DIR", "commander-data/database/main_v1")); // Use a versioned subdir
        ```

3.  **Create `src/services/db/` Directory.**

4.  **Create PGlite Service (Main Process):**
    *   **File:** `src/services/db/PGliteService.ts`
    *   **Content:**
        ```typescript
        import { Context, Effect, Layer, Data } from "effect";
        import { PGlite } from "@electric-sql/pglite";
        import path from "path";
        import { app } from "electron";
        import fs from "fs";
        import { ConfigurationService } from "@/services/configuration";
        import { TelemetryService } from "@/services/telemetry";

        export class PGliteError extends Data.TaggedError("PGliteError")<{
          message: string;
          cause?: unknown;
        }> {}

        export interface PGliteService {
          readonly client: PGlite;
        }
        export const PGliteService = Context.GenericTag<PGliteService>("PGliteService");

        export const PGliteServiceLive = Layer.effect(
          PGliteService,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);
            const dbDataDirName = yield* _(configService.get("DB_DATA_DIR"));

            const userDataPath = app.getPath("userData");
            const dataDir = path.join(userDataPath, dbDataDirName);

            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }

            yield* _(telemetry.trackEvent({ category: "db_setup", action: "pglite_service_init_start", label: `Data Dir: ${dataDir}` }));

            const pgliteClient = yield* _(Effect.tryPromise({
              try: async () => {
                const client = new PGlite(`file://${dataDir}`); // Ensure file:// prefix for Node persistence
                await client.waitReady;
                return client;
              },
              catch: (cause) => new PGliteError({ message: "Failed to initialize PGlite client (main process)", cause })
            }));

            yield* _(telemetry.trackEvent({ category: "db_setup", action: "pglite_service_init_success", label: "PGlite client ready (main process)" }));
            return PGliteService.of({ client: pgliteClient });
          })
        );
        ```

5.  **Create Database Schemas (`DatabaseSchemas.ts`):**
    *   **File:** `src/services/db/DatabaseSchemas.ts`
    *   **Content:** (Use the provided schema definitions for `DBSessionSchema`, `DBMessageSchema`, `DBToolExecutionSchema`. Ensure `Schema` is imported from `effect`. For `DBMessageSchema`, ensure `tool_calls_json: Schema.optional(Schema.String)` is included.)

6.  **Create Database Service Interface (`DatabaseService.ts`):**
    *   **File:** `src/services/db/DatabaseService.ts`
    *   **Content:** (Use the provided interface definition. Ensure `Data` is imported from `effect`.)

7.  **Implement Database Service (`DatabaseServiceImpl.ts`):**
    *   **File:** `src/services/db/DatabaseServiceImpl.ts`
    *   **Content:** (Use the provided implementation. Ensure table creation SQL matches `DatabaseSchemas.ts`. E.g., `messages` table needs `tool_calls_json TEXT;`. The table for tool calls is `tool_executions`.)

8.  **Export DB Services from `src/services/db/index.ts`:**
    *   **File:** `src/services/db/index.ts`
    *   **Content:**
        ```typescript
        export * from "./DatabaseSchemas";
        export * from "./DatabaseService";
        export * from "./PGliteService";
        export * from "./DatabaseServiceImpl";
        // Renderer proxy will be added later
        ```

9.  **Update Main Process Runtime & Call `initDB`:**
    *   **File:** `src/main-process-runtime.ts`
    *   **Action:**
        *   Import `PGliteServiceLive`, `DatabaseService`, `DatabaseServiceLive` from `@/services/db`.
        *   Update `MainProcessAppContext` type to include `DatabaseService`.
        *   Add `PGliteServiceLive` and `DatabaseServiceLive` to `mainProcessLayer`.
        *   Modify `initializeMainProcessRuntime` to call `dbService.initDB()`.
        ```typescript
        // src/main-process-runtime.ts
        // ... other imports ...
        import { PGliteServiceLive } from "@/services/db/PGliteService";
        import { DatabaseService, DatabaseServiceLive } from "@/services/db";

        // Update MainProcessAppContext type
        export type MainProcessAppContext = /* ... existing types ... */ | DatabaseService;

        // ... (telemetryLayer, configLayer, mainProcessBaseLayer, claudeCodeCliLayer setup) ...

        const pgliteLayer = PGliteServiceLive.pipe(Layer.provide(mainProcessBaseLayer));
        const databaseLayer = DatabaseServiceLive.pipe(Layer.provide(Layer.merge(pgliteLayer, telemetryLayer)));

        // Update mainProcessLayer
        const mainProcessLayer = Layer.mergeAll(
            mainProcessBaseLayer,
            claudeCodeCliLayer,
            pgliteLayer,
            databaseLayer
        );

        export async function initializeMainProcessRuntime(): Promise<void> {
          // ... (existing init logic) ...
          try {
            // ... (runtime instance creation) ...
            // Initialize Database
            const dbService = Context.get(mainProcessRuntimeInstance.context, DatabaseService);
            await Effect.runPromise(dbService.initDB());
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Database initialized successfully.");
          } catch (e) { /* ... */ throw e; }
        }
        // ...
        ```

**Phase D2: IPC for DatabaseService**

1.  **Create Directory:** `src/helpers/ipc/db/`

2.  **Define DB IPC Channels (`db-channels.ts`):**
    *   **File:** `src/helpers/ipc/db/db-channels.ts`
    *   **Content:** (As provided in your prompt)

3.  **Implement Main Process DB IPC Listeners (`db-listeners.ts`):**
    *   **File:** `src/helpers/ipc/db/db-listeners.ts`
    *   **Action:** Ensure `extractErrorForIPC` helper is correctly defined/imported. Implement listeners for all `DatabaseService` methods.
    *   **Content:** (As provided in your prompt. Ensure types are imported from `@/services/db`.)

4.  **Register DB IPC Listeners in `src/main.ts`:**
    *   **File:** `src/main.ts`
    *   **Action:** Import `addDatabaseEventListeners` and call it after `initializeMainProcessRuntime`.

5.  **Expose DB IPC Context in Preload (`db-context.ts`):**
    *   **File:** `src/helpers/ipc/db/db-context.ts`
    *   **Action:** Import DB types from `@/services/db`.
    *   **Content:** (As provided in your prompt)

6.  **Update `context-exposer.ts` and `types.d.ts`:**
    *   **File:** `src/helpers/ipc/context-exposer.ts` -> Add `exposeDatabaseContext()` call.
    *   **File:** `src/types.d.ts` -> Define `DatabaseAPI` and add to `ElectronAPI`. (As in prompt)

**Phase D3: Renderer-Side Database Service Proxy**

1.  **Create Proxy Layer (`DatabaseServiceRendererProxy.ts`):**
    *   **File:** `src/services/db/DatabaseServiceRendererProxy.ts`
    *   **Content:** (As provided in your prompt. Ensure types imported from `./DatabaseService` and `./DatabaseSchemas`.)

2.  **Export Proxy from `src/services/db/index.ts`:** Add `export * from "./DatabaseServiceRendererProxy";`

3.  **Integrate Proxy into Renderer Runtime (`src/services/runtime.ts`):**
    *   **File:** `src/services/runtime.ts`
    *   **Action:** Import `DatabaseService`, `DatabaseServiceRendererProxyLive` from `@/services/db`. Add `DatabaseService` to `FullAppContext` type. Add `DatabaseServiceRendererProxyLive` to `FullAppLayer`.

**Phase D4: Claude Code Service & Chat Session DB Integration**

1.  **Update `ClaudeExecParams` to include `sessionId`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/claudeCliUtils.ts`
    *   **Action:** Add `sessionId?: string;` to the `ClaudeExecParams` interface.

2.  **Modify `ClaudeCodeCliServiceLive` (Main Process) to use `DatabaseService`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliServiceLive.ts`
    *   **Action:**
        *   Add `DatabaseService` as a dependency: `const dbService = yield* _(DatabaseService);`
        *   Update `executeCommand` and `streamCommand` methods:
            *   Expect `sessionId` in `params: ClaudeExecParams`. If missing, generate one (`crypto.randomUUID()`) or log an error.
            *   **Session Handling:** Upsert session using `dbService.saveSession()`. Update `last_updated_at`.
            *   **Saving User Prompt:** Extract user prompt. Create `DBMessage` (role "user"). Save via `dbService.saveMessage()`.
            *   **Saving Assistant Response (Non-Streaming - `executeCommand`):**
                *   After CLI response, parse it.
                *   Create assistant's `DBMessage` (incl. `tool_calls_json` if any tool calls are present in the response). Save it.
                *   If tool calls exist, iterate and save each as `DBToolExecution` to `tool_executions` table, linked to the assistant message ID.
            *   **Saving Assistant Response (Streaming - this logic will be in `claude-code-listeners.ts` because it needs to access `dbService` from the `mainProcessRuntime` while iterating the stream from `ClaudeCodeCliService`):**
                *   Modify `src/helpers/ipc/claude_code/claude-code-listeners.ts`. The `ipcMain.on(claudeCodeChannels.chatStream, ...)` handler needs:
                    *   Access to `DatabaseService` from the `runtime` it receives: `const dbService = Context.get(runtime.context, DatabaseService);`
                    *   The `cliParams` (cast as `ClaudeExecParams`) will contain the `sessionId`. Ensure it's present or generate one.
                    *   Before starting the stream, upsert the session and save the user prompt (as done in `ClaudeCodeCliServiceLive`).
                    *   Inside the stream loop (e.g., `Stream.runForEach` or `for await...of cliStream`):
                        *   Initialize `assistantMessageId = crypto.randomUUID();`, `fullAssistantContent = "";`, `aggregatedToolCalls = [];` *before* the loop.
                    *   **After the stream ends (in `.then()` of `Effect.runPromise` or `finally` block):**
                        *   Create the final `DBMessage` for the assistant with `fullAssistantContent` and `tool_calls_json: JSON.stringify(aggregatedToolCalls)`. Save it.
                        *   If `aggregatedToolCalls` has items, save each to `tool_executions` table.
                        *   Update session `last_updated_at`.
                    *   **Inside the loop where `rawJsonStringChunk` is processed:**
                        *   Append parsed text content to `fullAssistantContent`.
                        *   If `tool_calls` are detected in a chunk, parse and add them to `aggregatedToolCalls`.
                        *   The `event.sender.send` should send the *raw JSON string chunk* to the renderer for immediate UI update.

3.  **Modify `ClaudeCodeCliAgentLanguageModelLive` (Renderer) to pass `sessionId`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Action:**
        *   Define an interface `ClaudeCliProviderOptions { sessionId?: string; }` at the top.
        *   Update `StreamTextOptions` and `GenerateTextOptions` in method signatures to be `StreamTextOptions & ClaudeCliProviderOptions` etc.
        *   When creating `sdkParams: ClaudeExecParams`, include `sessionId: options.sessionId`.

4.  **Modify `useAgentChat` (Renderer Process):**
    *   **File:** `src/hooks/ai/useAgentChat.ts`
    *   **Action:**
        *   Add `DatabaseService.Tag` dependency: `const dbService = Context.get(currentRuntime.context, DatabaseService);`
        *   Add `currentSessionId: string | null` to local state, initialized to `null`.
        *   **History Loading:**
            *   `useEffect(() => { if (currentSessionId) { Effect.runPromise(dbService.getMessagesForSession(currentSessionId, 100)).then(msgs => { /* map to UIAgentChatMessage and setMessages, fetch tool_calls for each */ }) } }, [currentSessionId, dbService]);`
        *   **`sendMessage` Logic:**
            *   If `currentSessionId` is `null`, generate a new one: `const newSessionId = crypto.randomUUID(); setCurrentSessionId(newSessionId);`. Use this `newSessionId` for the current interaction.
            *   Pass the `currentSessionId` (or `newSessionId`) in the `options` to `chatOrchestrator.streamConversation`.
            *   User message saving is now handled by the main process. Optimistically add to UI.
            *   Streamed assistant messages update the UI; saving is handled by main process.

5.  **Modify `ChatOrchestratorServiceLive` (Renderer):**
    *   **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   **Action:**
        *   Update `streamConversation` and `generateConversationResponse` signatures in the interface and implementation to accept an optional `sessionId?: string` in their `params` object.
        *   When calling the selected `AgentLanguageModel` provider, pass the `sessionId` in its options.
            ```typescript
            // Example in streamConversation
            const streamOptions: StreamTextOptions & Partial<ClaudeCliProviderOptions> = { // Use extended options type
              // ... existing options ...
              sessionId: params.sessionId, // Pass sessionId
            };
            return agentLM.streamText(streamOptions);
            ```

**Phase D5: Testing**

1.  **Unit Tests:**
    *   `DatabaseServiceImpl.test.ts`: (Main process) Mock `PGliteService`. Test CRUD operations.
    *   `ClaudeCodeCliServiceLive.test.ts`: (Main process) Mock `DatabaseService` & `ClaudeCliExecutor`. Verify DB interactions for session, user message, assistant message, and tool calls.
    *   `DatabaseServiceRendererProxy.test.ts`: (Renderer) Mock `window.electronAPI.database`. Test IPC proxying.
    *   `useAgentChat.test.ts`: (Renderer) Mock `DatabaseService` (proxy) & `ChatOrchestratorService`. Test `sessionId` management and history loading.
2.  **E2E Test:**
    *   Chat with "Claude Code (CLI)".
    *   Verify messages (user & assistant, including any tool call placeholders) appear.
    *   Restart app.
    *   Open `AgentChatPane`. `useAgentChat` should attempt to load history for the last active session (if `currentSessionId` is persisted in `useAgentChat` or a global store) or start a new one. Verify history appears.

This is a comprehensive plan. Focus on getting each IPC layer and service interaction correct, especially the data flow and `sessionId` propagation. Good luck!
