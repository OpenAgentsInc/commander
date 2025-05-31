// src/helpers/ipc/swe_bench/swe-bench-context.ts
import { contextBridge, ipcRenderer } from "electron";
import { SWE_BENCH_EVALUATE_TASK_CHANNEL } from "./swe-bench-channels";
// Ensure EvaluationResult type (or a simplified version for IPC) is accessible here.
// Adjust path based on actual location in your project.
import type { EvaluationResult } from "@/services/swe_bench_harness/types";

export interface IpcErrorObject {
  __error: true;
  name: string;
  message: string;
  stack?: string;
}

export function exposeSWEBenchContext() {
  contextBridge.exposeInMainWorld("electronAPI", {
    ...(window.electronAPI || {}),
    sweBench: {
      evaluateTask: (instanceId: string, patchContent: string): Promise<EvaluationResult | IpcErrorObject> =>
        ipcRenderer.invoke(SWE_BENCH_EVALUATE_TASK_CHANNEL, instanceId, patchContent),
    },
  });
}