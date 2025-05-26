import { Effect, Layer } from "effect";
import { DatabaseService, DatabaseError } from "./DatabaseService";
import type { DBSession, DBMessage, DBToolExecution } from "./DatabaseSchemas";

export const DatabaseServiceRendererProxyLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    _tag: "DatabaseService",
    initDB: () => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.initDB();
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC initDB failed", cause: e })
    }),
    
    saveSession: (session) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.saveSession(session);
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC saveSession failed", cause: e })
    }),
    
    getSession: (sessionId) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.getSession(sessionId);
        if (res && (res as any).__error) throw res;
        return res as DBSession | null;
      },
      catch: (e) => new DatabaseError({ message: "IPC getSession failed", cause: e })
    }),
    
    updateSession: (sessionId, updates) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.updateSession(sessionId, updates);
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC updateSession failed", cause: e })
    }),
    
    saveMessage: (message) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.saveMessage(message);
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC saveMessage failed", cause: e })
    }),
    
    getMessagesForSession: (sessionId, limit, offset) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.getMessagesForSession(sessionId, limit, offset);
        if (res && (res as any).__error) throw res;
        return res as DBMessage[];
      },
      catch: (e) => new DatabaseError({ message: "IPC getMessagesForSession failed", cause: e })
    }),
    
    saveToolCall: (toolCall) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.saveToolCall(toolCall);
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC saveToolCall failed", cause: e })
    }),
    
    updateToolCallResult: (toolCallId, resultJson, status) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.updateToolCallResult(toolCallId, resultJson, status);
        if (res && (res as any).__error) throw res;
        return;
      },
      catch: (e) => new DatabaseError({ message: "IPC updateToolCallResult failed", cause: e })
    }),
    
    getToolCallsForMessage: (messageId) => Effect.tryPromise({
      try: async () => {
        const res = await window.electronAPI.database.getToolCallsForMessage(messageId);
        if (res && (res as any).__error) throw res;
        return res as DBToolExecution[];
      },
      catch: (e) => new DatabaseError({ message: "IPC getToolCallsForMessage failed", cause: e })
    }),
  })
);