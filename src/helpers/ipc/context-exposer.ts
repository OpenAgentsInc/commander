import { contextBridge, ipcRenderer } from "electron";
import { 
  THEME_MODE_TOGGLE_CHANNEL, 
  THEME_MODE_DARK_CHANNEL, 
  THEME_MODE_LIGHT_CHANNEL, 
  THEME_MODE_SYSTEM_CHANNEL, 
  THEME_MODE_CURRENT_CHANNEL 
} from "./theme/theme-channels";
import { WIN_MINIMIZE_CHANNEL, WIN_MAXIMIZE_CHANNEL, WIN_CLOSE_CHANNEL } from "./window/window-channels";
import { OLLAMA_CHAT_COMPLETION_CHANNEL, OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, OLLAMA_STATUS_CHECK } from "./ollama/ollama-channels";
import { dbChannels } from "./db/db-channels";
import type { DBSession, DBMessage, DBToolExecution } from "@/services/db";
import { SWE_BENCH_EVALUATE_TASK_CHANNEL } from "./swe_bench/swe-bench-channels";
import type { EvaluationResult } from "@/services/swe_bench_harness/types";
// import { claudeCodeChannels } from "./claude_code/claude-code-channels";

// Define Claude Code channels inline to avoid import issues
const claudeCodeChannels = {
  chatCompletion: "claude-code:chat-completion",
  chatStream: "claude-code:chat-stream",
};

export default function exposeContexts() {
  // Build unified electronAPI object with all IPC functions
  const electronAPI = {
    // Ollama API
    ollama: {
      checkStatus: () => ipcRenderer.invoke(OLLAMA_STATUS_CHECK),
      generateChatCompletion: (request: unknown) =>
        ipcRenderer.invoke(OLLAMA_CHAT_COMPLETION_CHANNEL, request),
      generateChatCompletionStream: (
        request: unknown,
        onChunk: (chunk: any) => void,
        onDone: () => void,
        onError: (error: any) => void,
      ) => {
        const requestId = `ollama-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: any) => {
          if (id === requestId) onChunk(chunk);
        };

        const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
          if (id === requestId) {
            cleanup();
            onDone();
          }
        };

        const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
          if (id === requestId) {
            cleanup();
            onError(error);
          }
        };

        const cleanup = () => {
          ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
          ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
          ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);
        };

        ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
        ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
        ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);

        ipcRenderer.send(OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, requestId, request);

        return () => {
          ipcRenderer.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, requestId);
          cleanup();
        };
      },
    },

    // Claude Code API
    claudeCode: {
      chatCompletion: (params: any) =>
        ipcRenderer.invoke(claudeCodeChannels.chatCompletion, params),
      streamChat: (
        params: any,
        onChunk: (chunk: string) => void,
        onDone: () => void,
        onError: (error: any) => void
      ) => {
        const requestId = `claude-code-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: string) => {
          if (id === requestId) onChunk(chunk);
        };

        const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
          if (id === requestId) {
            cleanup();
            onDone();
          }
        };

        const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
          if (id === requestId) {
            cleanup();
            onError(error);
          }
        };

        const cleanup = () => {
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:chunk`, chunkListener);
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:done`, doneListener);
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:error`, errorListener);
        };

        ipcRenderer.on(`${claudeCodeChannels.chatStream}:chunk`, chunkListener);
        ipcRenderer.on(`${claudeCodeChannels.chatStream}:done`, doneListener);
        ipcRenderer.on(`${claudeCodeChannels.chatStream}:error`, errorListener);

        ipcRenderer.send(claudeCodeChannels.chatStream, requestId, { ...params, stream: true });

        return () => {
          ipcRenderer.send(`${claudeCodeChannels.chatStream}:cancel`, requestId);
          cleanup();
        };
      },
    },

    // Database API
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
    },

    // SWE-Bench API
    sweBench: {
      evaluateTask: (instanceId: string, patchContent: string) =>
        ipcRenderer.invoke(SWE_BENCH_EVALUATE_TASK_CHANNEL, instanceId, patchContent),
    },
  };

  // Expose unified API once
  contextBridge.exposeInMainWorld("electronAPI", electronAPI);

  // Expose theme API
  contextBridge.exposeInMainWorld("themeMode", {
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
    dark: () => ipcRenderer.invoke(THEME_MODE_DARK_CHANNEL),
    light: () => ipcRenderer.invoke(THEME_MODE_LIGHT_CHANNEL),
    system: () => ipcRenderer.invoke(THEME_MODE_SYSTEM_CHANNEL),
    current: () => ipcRenderer.invoke(THEME_MODE_CURRENT_CHANNEL),
  });

  // Expose window API
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL),
  });
}
