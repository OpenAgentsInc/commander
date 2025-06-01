// src/helpers/ipc/swe_bench/swe-bench-channels.ts
export const SWE_BENCH_EVALUATE_TASK_CHANNEL = "swebench:evaluate-task";

// Task listing and retrieval
export const SWE_BENCH_LIST_TASKS_CHANNEL = "swebench:list-tasks";
export const SWE_BENCH_GET_TASK_CHANNEL = "swebench:get-task";

// Batch run management
export const SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL = "swebench:spawn-batch-run";
export const SWE_BENCH_STOP_BATCH_RUN_CHANNEL = "swebench:stop-batch-run";

// Batch run output events (Main to Renderer)
export const SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL = "swebench:batch-run-stdout";
export const SWE_BENCH_BATCH_RUN_STDERR_CHANNEL = "swebench:batch-run-stderr";
export const SWE_BENCH_BATCH_RUN_EXIT_CHANNEL = "swebench:batch-run-exit";

// Results management
export const SWE_BENCH_LIST_RESULT_RUNS_CHANNEL = "swebench:list-result-runs";
export const SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL = "swebench:get-result-summary";
export const SWE_BENCH_GET_TASK_RESULT_CHANNEL = "swebench:get-task-result";

// Generic file system operations (for results viewing)
export const FS_LIST_DIRS_CHANNEL = "fs:list-dirs";
export const FS_READ_JSON_FILE_CHANNEL = "fs:read-json-file";