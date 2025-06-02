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
import { 
  SWE_BENCH_EVALUATE_TASK_CHANNEL,
  SWE_BENCH_LIST_TASKS_CHANNEL,
  SWE_BENCH_GET_TASK_CHANNEL,
  SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL,
  SWE_BENCH_STOP_BATCH_RUN_CHANNEL,
  SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL,
  SWE_BENCH_BATCH_RUN_STDERR_CHANNEL,
  SWE_BENCH_BATCH_RUN_EXIT_CHANNEL,
  SWE_BENCH_LIST_RESULT_RUNS_CHANNEL,
  SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL,
  SWE_BENCH_GET_TASK_RESULT_CHANNEL,
  FS_LIST_DIRS_CHANNEL,
  FS_READ_JSON_FILE_CHANNEL,
  SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL,
  SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL,
} from "./swe_bench/swe-bench-channels";
import type { EvaluationResult, SWEBenchTask } from "@/services/swe_bench_harness/types";
import type { SpawnBatchRunParams, BatchRunOutput } from "./swe_bench/swe-bench-context";
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
      
      // Task listing and retrieval
      listTasks: (tasksDir: string) =>
        ipcRenderer.invoke(SWE_BENCH_LIST_TASKS_CHANNEL, tasksDir),
      getTask: (tasksDir: string, instanceId: string) =>
        ipcRenderer.invoke(SWE_BENCH_GET_TASK_CHANNEL, tasksDir, instanceId),
      
      // Batch run management
      spawnBatchRun: (params: SpawnBatchRunParams) =>
        ipcRenderer.invoke(SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL, params),
      stopBatchRun: (runId: string) =>
        ipcRenderer.invoke(SWE_BENCH_STOP_BATCH_RUN_CHANNEL, runId),
      
      // Event listeners for batch run output
      onBatchRunOutput: (channel: string, callback: (data: BatchRunOutput) => void) => {
        const listener = (_event: any, data: BatchRunOutput) => callback(data);
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
      },
      
      // Results management  
      listResultRuns: () =>
        ipcRenderer.invoke(SWE_BENCH_LIST_RESULT_RUNS_CHANNEL),
      getResultSummary: (runDir: string) =>
        ipcRenderer.invoke(SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL, runDir),
      getTaskResult: (runDir: string, instanceId: string) =>
        ipcRenderer.invoke(SWE_BENCH_GET_TASK_RESULT_CHANNEL, runDir, instanceId),
        
      // Dataset management
      checkDatasetStatus: (datasetName?: string, tasksDir?: string) =>
        ipcRenderer.invoke(SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL, datasetName, tasksDir),
      downloadDataset: (params: { datasetName: string, split?: string, maxTasks?: number, outputDir?: string }) =>
        ipcRenderer.invoke(SWE_BENCH_DOWNLOAD_DATASET_CHANNEL, params),
      onDatasetDownloadEvent: (callback: (data: { downloadId: string, type: 'progress' | 'error' | 'complete', message?: string, progress?: number, taskCount?: number }) => void) => {
        const progressListener = (_event: any, data: any) => {
          if (data.type === 'progress') callback(data);
        };
        const errorListener = (_event: any, data: any) => {
          if (data.type === 'error') callback(data);
        };
        const completeListener = (_event: any, data: any) => {
          if (data.type === 'complete') callback(data);
        };
        
        ipcRenderer.on(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, progressListener);
        ipcRenderer.on(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, errorListener);
        ipcRenderer.on(SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL, completeListener);
        
        return () => {
          ipcRenderer.removeListener(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, progressListener);
          ipcRenderer.removeListener(SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL, errorListener);
          ipcRenderer.removeListener(SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL, completeListener);
        };
      },
      getRandomTaskIds: (tasksDir: string, count: number) =>
        ipcRenderer.invoke(SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL, tasksDir, count),
    },
    
    // Generic file system operations
    fs: {
      listDirs: (dirPath: string) =>
        ipcRenderer.invoke(FS_LIST_DIRS_CHANNEL, dirPath),
      readJsonFile: (filePath: string) =>
        ipcRenderer.invoke(FS_READ_JSON_FILE_CHANNEL, filePath),
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
