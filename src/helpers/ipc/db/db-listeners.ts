// src/helpers/ipc/db/db-listeners.ts
import { ipcMain } from "electron";
import { Effect, Layer, Runtime, Cause } from "effect";
import { DatabaseService, DatabaseError } from "@/services/db";
import { DatabaseServiceWebSocketProxyLive } from "@/services/db/DatabaseServiceWebSocketProxy";
import type { DBSession, DBMessage, DBToolExecution } from "@/services/db";
import { dbChannels } from "./db-channels";
import { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

interface IpcErrorObject {
  __error: true;
  name: string;
  message: string;
  stack?: string;
  _tag?: string;
  cause?: any;
}

function extractErrorForIPC(error: any): IpcErrorObject {
  const details: IpcErrorObject = {
    __error: true,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  };

  if (error instanceof Error && error.stack) {
    details.stack = error.stack;
  }

  if (error && typeof error === "object") {
    if ("_tag" in error) {
      details._tag = (error as any)._tag;
    }
    if ("cause" in error && error.cause) {
      details.cause = String(error.cause);
    }
  }

  return details;
}

// Global runtime instance for database service
let databaseRuntime: Runtime.Runtime<DatabaseService> | null = null;

export async function initializeDatabaseService() {
  if (databaseRuntime) {
    console.log("[DB IPC] Database service already initialized");
    return databaseRuntime;
  }

  console.log("[DB IPC] Initializing database service...");

  try {
    // Create database layer using WebSocket proxy
    const databaseLayer = DatabaseServiceWebSocketProxyLive;

    // Create the runtime
    const runtimeContext = await Effect.runPromise(
      Layer.toRuntime(databaseLayer).pipe(Effect.scoped)
    );
    databaseRuntime = Runtime.make(runtimeContext);

    console.log("[DB IPC] Database service (WebSocket proxy) initialized successfully");
    return databaseRuntime;
  } catch (error) {
    console.error("[DB IPC] Failed to initialize database service:", error);
    throw error;
  }
}

// Export runDbEffect for use by other modules like main-claude-websocket
export async function runDbEffect<A, E extends DatabaseError>(
  effect: Effect.Effect<A, E, DatabaseService>
): Promise<A | IpcErrorObject> {
  try {
    if (!databaseRuntime) {
      await initializeDatabaseService();
    }
    if (!databaseRuntime) {
      throw new Error("Database runtime not available");
    }
    return await Effect.runPromise(Effect.provide(effect, databaseRuntime));
  } catch (error) {
    return extractErrorForIPC(error);
  }
}

export function addDatabaseEventListeners() {
  if ((global as any).__databaseEventListenersRegistered) {
    console.log("[DB IPC] Database event listeners already registered, skipping...");
    return;
  }

  console.log("[DB IPC] Registering database event listeners...");

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

  ipcMain.handle(dbChannels.saveToolCall, (_, toolCall: DBToolExecution) =>
    runDbEffect(Effect.flatMap(DatabaseService, db => db.saveToolExecution(toolCall)))
  );

  ipcMain.handle(dbChannels.updateToolCallResult, (_, toolCallId: string, resultJson: string, status: "executed_success" | "executed_error") =>
    runDbEffect(Effect.flatMap(DatabaseService, db => db.updateToolCallResult(toolCallId, resultJson, status)))
  );

  ipcMain.handle(dbChannels.getToolCallsForMessage, (_, messageId: string) =>
    runDbEffect(Effect.flatMap(DatabaseService, db => db.getToolCallsForMessage(messageId)))
  );

  ipcMain.handle(dbChannels.getAllSessions, (_, options?: { limit?: number; offset?: number; sortBy?: "created_at" | "last_updated_at"; sortOrder?: "ASC" | "DESC" }) =>
    runDbEffect(Effect.flatMap(DatabaseService, db => db.getAllSessions(options)))
  );

  (global as any).__databaseEventListenersRegistered = true;
  console.log("[DB IPC] Database event listeners registered successfully");
}

export { databaseRuntime };