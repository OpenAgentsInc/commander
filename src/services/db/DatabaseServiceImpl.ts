import { Effect, Layer } from "effect";
import type { PGlite } from "@electric-sql/pglite";
import { PGLiteService } from "./PGLiteService";
import { DatabaseService, DatabaseError } from "./DatabaseService";
import type { DBSession, DBMessage, DBToolExecution } from "./DatabaseSchemas";
import { TelemetryService } from "@/services/telemetry";

export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function*(_) {
    const pgliteService = yield* _(PGLiteService);
    const telemetry = yield* _(TelemetryService);
    const client: PGlite = pgliteService.client;

    const runQuery = <T = any>(sql: string, params?: any[]) =>
      Effect.tryPromise({
        try: () => client.query<T>(sql, params),
        catch: (cause) => new DatabaseError({ message: "Query failed", cause, query: sql, params })
      }).pipe(
        Effect.tapError((err) => 
          telemetry.trackEvent({ 
            category: "db_error", 
            action: "query_failed", 
            label: sql.substring(0, 50), 
            value: err.message 
          }).pipe(Effect.ignore)
        )
      );

    const runExec = (sql: string) =>
      Effect.tryPromise({
        try: () => client.exec(sql),
        catch: (cause) => new DatabaseError({ message: "Exec failed", cause, query: sql })
      }).pipe(
        Effect.tapError((err) => 
          telemetry.trackEvent({ 
            category: "db_error", 
            action: "exec_failed", 
            label: sql.substring(0, 50), 
            value: err.message 
          }).pipe(Effect.ignore)
        )
      );

    const initDB = Effect.gen(function*(_) {
      yield* _(telemetry.trackEvent({ category: "db_init", action: "start" }).pipe(Effect.ignore));
      
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
          tool_calls_json TEXT,
          timestamp INTEGER NOT NULL,
          provider_message_id TEXT,
          metadata_json TEXT
        );
      `));
      
      yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);`));
      
      yield* _(runExec(`
        CREATE TABLE IF NOT EXISTS tool_executions (
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
      
      yield* _(runExec(`CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);`));
      
      yield* _(telemetry.trackEvent({ category: "db_init", action: "success" }).pipe(Effect.ignore));
    });

    return DatabaseService.of({
      _tag: "DatabaseService",
      initDB: () => initDB.pipe(Effect.catchAll(e => {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error("[DB Service] FATAL: initDB failed", e);
        return Effect.die(e);
      })),

      saveSession: (session) => runQuery(
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
        return runQuery(
          `UPDATE sessions SET ${setClauses}, last_updated_at = $${values.length + 2} WHERE id = $1;`,
          [sessionId, ...values, Math.floor(Date.now() / 1000)]
        ).pipe(Effect.asVoid);
      },

      getAllSessions: (options = {}) => {
        const { 
          limit = 100, 
          offset = 0, 
          sortBy = "last_updated_at", 
          sortOrder = "DESC" 
        } = options;
        
        return runQuery<DBSession>(
          `SELECT * FROM sessions ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2;`,
          [limit, offset]
        ).pipe(
          Effect.map(result => result.rows),
          Effect.tap((sessions) => 
            telemetry.trackEvent({ 
              category: "db_query", 
              action: "get_all_sessions", 
              label: `Found ${sessions.length} sessions`,
              value: sessions.length
            }).pipe(Effect.ignore)
          )
        );
      },

      saveMessage: (message) => runQuery(
        `INSERT INTO messages (id, session_id, role, content, name, tool_call_id, tool_calls_json, timestamp, provider_message_id, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [message.id, message.session_id, message.role, message.content, message.name, message.tool_call_id, message.tool_calls_json, message.timestamp, message.provider_message_id, message.metadata_json]
      ).pipe(Effect.asVoid),

      getMessagesForSession: (sessionId, limit = 50, offset = 0) => runQuery<DBMessage>(
        `SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC LIMIT $2 OFFSET $3;`,
        [sessionId, limit, offset]
      ).pipe(Effect.map(result => result.rows)),

      saveToolCall: (toolExecution) => runQuery(
        `INSERT INTO tool_executions (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [toolExecution.id, toolExecution.message_id, toolExecution.tool_name, toolExecution.arguments_json, toolExecution.result_json, toolExecution.status, toolExecution.created_at, toolExecution.updated_at]
      ).pipe(Effect.asVoid),

      updateToolCallResult: (toolCallId, resultJson, status) => runQuery(
        `UPDATE tool_executions SET result_json = $1, status = $2, updated_at = $3 WHERE id = $4;`,
        [resultJson, status, Math.floor(Date.now()/1000), toolCallId]
      ).pipe(Effect.asVoid),

      getToolCallsForMessage: (messageId) => runQuery<DBToolExecution>(
        `SELECT * FROM tool_executions WHERE message_id = $1 ORDER BY created_at ASC;`,
        [messageId]
      ).pipe(Effect.map(result => result.rows)),
    });
  })
);