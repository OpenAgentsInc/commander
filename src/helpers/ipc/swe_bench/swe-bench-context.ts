// src/helpers/ipc/swe_bench/swe-bench-context.ts
import { contextBridge, ipcRenderer } from "electron";
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
} from "./swe-bench-channels";
// Ensure EvaluationResult type (or a simplified version for IPC) is accessible here.
// Adjust path based on actual location in your project.
import type { EvaluationResult, SWEBenchTask } from "@/services/swe_bench_harness/types";

export interface IpcErrorObject {
  __error: true;
  name: string;
  message: string;
  stack?: string;
}

export interface SpawnBatchRunParams {
  instanceIds?: string[];
  patchSource: string;
  outputDirName?: string;
  maxTasks?: number;
  tasksDir: string;
}

export interface BatchRunOutput {
  runId: string;
  output: string | number;
}

export function exposeSWEBenchContext() {
  contextBridge.exposeInMainWorld("electronAPI", {
    ...(window.electronAPI || {}),
    sweBench: {
      evaluateTask: (instanceId: string, patchContent: string): Promise<EvaluationResult | IpcErrorObject> =>
        ipcRenderer.invoke(SWE_BENCH_EVALUATE_TASK_CHANNEL, instanceId, patchContent),
      
      // Task listing and retrieval
      listTasks: (tasksDir: string): Promise<string[]> =>
        ipcRenderer.invoke(SWE_BENCH_LIST_TASKS_CHANNEL, tasksDir),
      getTask: (tasksDir: string, instanceId: string): Promise<SWEBenchTask | null> =>
        ipcRenderer.invoke(SWE_BENCH_GET_TASK_CHANNEL, tasksDir, instanceId),
      
      // Batch run management
      spawnBatchRun: (params: SpawnBatchRunParams): Promise<{ runId: string }> =>
        ipcRenderer.invoke(SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL, params),
      stopBatchRun: (runId: string): Promise<void> =>
        ipcRenderer.invoke(SWE_BENCH_STOP_BATCH_RUN_CHANNEL, runId),
      
      // Event listeners for batch run output
      onBatchRunOutput: (channel: string, callback: (data: BatchRunOutput) => void) => {
        const listener = (_event: any, data: BatchRunOutput) => callback(data);
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
      },
      
      // Results management  
      listResultRuns: (): Promise<string[]> =>
        ipcRenderer.invoke(SWE_BENCH_LIST_RESULT_RUNS_CHANNEL),
      getResultSummary: (runDir: string): Promise<any> =>
        ipcRenderer.invoke(SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL, runDir),
      getTaskResult: (runDir: string, instanceId: string): Promise<any> =>
        ipcRenderer.invoke(SWE_BENCH_GET_TASK_RESULT_CHANNEL, runDir, instanceId),
    },
    
    // Generic file system operations
    fs: {
      listDirs: (dirPath: string): Promise<string[]> =>
        ipcRenderer.invoke(FS_LIST_DIRS_CHANNEL, dirPath),
      readJsonFile: (filePath: string): Promise<any> =>
        ipcRenderer.invoke(FS_READ_JSON_FILE_CHANNEL, filePath),
    },
  });
}