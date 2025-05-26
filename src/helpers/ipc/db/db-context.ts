import { contextBridge, ipcRenderer } from "electron";
import { dbChannels } from "./db-channels";
import type { DBSession, DBMessage, DBToolExecution } from "@/services/db";

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
      saveToolCall: (toolCall: DBToolExecution) => ipcRenderer.invoke(dbChannels.saveToolCall, toolCall),
      updateToolCallResult: (toolCallId: string, resultJson: string, status: "executed_success" | "executed_error") => ipcRenderer.invoke(dbChannels.updateToolCallResult, toolCallId, resultJson, status),
      getToolCallsForMessage: (messageId: string) => ipcRenderer.invoke(dbChannels.getToolCallsForMessage, messageId),
      getAllSessions: (options?: { limit?: number; offset?: number; sortBy?: "created_at" | "last_updated_at"; sortOrder?: "ASC" | "DESC" }) => ipcRenderer.invoke(dbChannels.getAllSessions, options),
    },
  });
}