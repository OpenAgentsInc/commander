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
  SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL,
  SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL,
  SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL,
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
        
      // Dataset management
      checkDatasetStatus: (datasetName?: string, tasksDir?: string): Promise<{ exists: boolean, path: string, taskCount?: number, datasetName: string }> =>
        ipcRenderer.invoke(SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL, datasetName, tasksDir),
      downloadDataset: (params: { datasetName: string, split?: string, maxTasks?: number, outputDir?: string }): Promise<{ downloadId: string }> =>
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
      getRandomTaskIds: (tasksDir: string, count: number): Promise<string[]> =>
        ipcRenderer.invoke(SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL, tasksDir, count),
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