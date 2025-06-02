Okay, this is a significant refactor towards a simpler and more robust SWE-Bench experience. I will provide instructions to implement the simplified SWE-Bench UI, ensure it uses the official Hugging Face dataset (`princeton-nlp/SWE-bench`), and streamlines the evaluation flow.

**Overall Goal:**
Replace the current complex SWE-Bench UI with a simpler "Launcher" pane. This pane will manage the download of the official `princeton-nlp/SWE-bench` dataset and offer two main actions: "Start Full Run" or "Start Run with X Random Tasks".

---

**Phase 1: New Main SWE-Bench Pane & Dataset Management**

1.  **Feature Flag & Constants Update:**
    *   **File:** `src/services/featureflags/FeatureFlag.ts`
        *   Rename `SWE_BENCH_MVP_UI` to `SWE_BENCH_SIMPLE_LAUNCHER`.
            ```typescript
            export enum Feature {
              // ... other features ...
              SWE_BENCH_SIMPLE_LAUNCHER = "SWE_BENCH_SIMPLE_LAUNCHER",
            }
            ```
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
        *   In `DefaultDevConfigLayer`, update `FEATURE_FLAGS_ENABLED_LIST` to include `SWE_BENCH_SIMPLE_LAUNCHER` and remove `SWE_BENCH_MVP_UI` if it was separate.
            ```typescript
            // Example:
            yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST",
              "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,SWE_BENCH_SIMPLE_LAUNCHER"
            ));
            ```
    *   **File:** `src/stores/panes/constants.ts`
        *   Define constants for the new simplified launcher pane:
            ```typescript
            export const SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE = "swe_bench_simple_launcher";
            export const SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST = "swe_bench_simple_launcher_main";
            export const SWE_BENCH_SIMPLE_LAUNCHER_PANE_TITLE = "SWE-Bench Launcher";
            ```

2.  **New Pane Store Action:**
    *   **File:** `src/stores/panes/actions/openSweBenchSimpleLauncherPane.ts` (new file)
        ```typescript
        import { type SetPaneStore, type GetPaneStore } from "../types";
        import { togglePaneAction } from "./togglePane";
        import {
          SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
          SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE,
          SWE_BENCH_SIMPLE_LAUNCHER_PANE_TITLE,
          DEFAULT_PANE_WIDTH,
          DEFAULT_PANE_HEIGHT
        } from "../constants";

        export const openSweBenchSimpleLauncherPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
          togglePaneAction(set, get, {
            paneId: SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => ({
              id: SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
              type: SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE,
              title: SWE_BENCH_SIMPLE_LAUNCHER_PANE_TITLE,
              x: storedPosition?.x ?? Math.max(20, (screenWidth - (DEFAULT_PANE_WIDTH * 1.2)) / 2),
              y: storedPosition?.y ?? Math.max(20, (screenHeight - (DEFAULT_PANE_HEIGHT * 1.2)) / 2),
              width: storedPosition?.width ?? DEFAULT_PANE_WIDTH * 1.2,
              height: storedPosition?.height ?? DEFAULT_PANE_HEIGHT * 1.2,
              dismissable: true,
              content: {},
            }),
          });
        };
        ```
    *   **File:** `src/stores/panes/actions/index.ts` - Export `openSweBenchSimpleLauncherPaneAction`.
    *   **File:** `src/stores/panes/types.ts` - Add `openSweBenchSimpleLauncherPane: () => void;` to `PaneStoreType`.
    *   **File:** `src/stores/pane.ts` - Add the new action to the store definition.

3.  **Update Hotbar & Keyboard Shortcut:**
    *   **File:** `src/components/hud/Hotbar.tsx`
        *   Import `SWE_BENCH_SIMPLE_LAUNCHER` from `FeatureFlag.ts`.
        *   Import `openSweBenchSimpleLauncherPane` from the store.
        *   Update the SWE-Bench `HotbarItem` (slot 7) to use `isSweBenchSimpleLauncherEnabled` and call `openSweBenchSimpleLauncherPane`.
    *   **File:** `src/pages/HomePage.tsx`
        *   Import `SWE_BENCH_SIMPLE_LAUNCHER` and `openSweBenchSimpleLauncherPane`.
        *   Update the keyboard shortcut (Ctrl+7) to check `isSweBenchSimpleLauncherEnabled` and call `openSweBenchSimpleLauncherPane`.

4.  **IPC for Dataset Management:**
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-channels.ts`
        *   Add/Ensure these channels:
            ```typescript
            export const SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL = "swebench:check-dataset-status";
            export const SWE_BENCH_DOWNLOAD_DATASET_CHANNEL = "swebench:download-dataset";
            export const SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL = "swebench:download-dataset-progress";
            export const SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL = "swebench:download-dataset-complete";
            export const SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL = "swebench:get-random-task-ids";
            ```
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-context.ts`
        *   Update/Ensure `electronAPI.sweBench` has:
            ```typescript
            // Existing evaluateTask, listTasks, getTask...
            checkDatasetStatus: (datasetName?: string, tasksDir?: string): Promise<{ exists: boolean, path: string, taskCount?: number, datasetName: string }>;
            downloadDataset: (params: { datasetName: string, split?: string, maxTasks?: number, outputDir?: string }): Promise<{ downloadId: string }>;
            onDatasetDownloadEvent: (callback: (data: { downloadId: string, type: 'progress' | 'error' | 'complete', message?: string, progress?: number, taskCount?: number }) => void) => (() => void);
            getRandomTaskIds: (tasksDir: string, count: number): Promise<string[]>;
            ```
    *   **File:** `src/types.d.ts` - Update `SweBenchAPI` interface to match.
    *   **File:** `src/main.ts` - Implement/Update handlers:
        *   **`SWE_BENCH_CHECK_DATASET_STATUS_CHANNEL`:**
            *   Takes optional `datasetName` (defaults to `princeton-nlp/SWE-bench`) and optional `tasksDir`.
            *   If `tasksDir` is provided, use it. Otherwise, get `SWE_BENCH_DATASET_PATH` from `ConfigurationService`.
            *   Check if the directory exists and count `.json` files.
            *   Return `{ exists, path, taskCount, datasetName }`.
        *   **`SWE_BENCH_DOWNLOAD_DATASET_CHANNEL`:**
            *   Takes `params: { datasetName, split?, maxTasks?, outputDir? }`.
            *   `datasetName` defaults to `princeton-nlp/SWE-bench`.
            *   `split` defaults to `test`.
            *   `outputDir` defaults to `config.SWE_BENCH_DATASET_PATH`.
            *   Generate a unique `downloadId`.
            *   Spawn Python script: `python scripts/download_swe_bench_tasks.py --dataset_name <name> --split <split> --output_dir <dir> [--max_tasks <N>]`.
            *   Pipe stdout/stderr to renderer via `SWE_BENCH_DOWNLOAD_DATASET_PROGRESS_CHANNEL` using `event.sender.send(...)`, including `downloadId`. Parse progress messages if possible.
            *   On exit, send `SWE_BENCH_DOWNLOAD_DATASET_COMPLETE_CHANNEL` with `downloadId`, success status, and final task count (by re-checking the directory).
            *   Return `{ downloadId }`.
        *   **`SWE_BENCH_GET_RANDOM_TASK_IDS_CHANNEL`:**
            *   Takes `tasksDir`, `count`.
            *   Use `SWEBenchTaskService.listAvailableTaskIds(tasksDir)` (ensure this takes `tasksDir` or reads it from the correct config).
            *   Shuffle the list and return the first `count` IDs.

5.  **Create `SweBenchSimpleLauncherPane.tsx` (`src/panes/swebench/`)**
    *   **File:** `src/panes/swebench/SweBenchSimpleLauncherPane.tsx` (new file)
        ```typescript
        import React, { useState, useEffect, useCallback } from "react";
        import { Pane } from "@/types/pane";
        import { usePaneStore } from "@/stores/pane";
        import { Button } from "@/components/ui/button";
        import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
        import { Input } from "@/components/ui/input";
        import { Label } from "@/components/ui/label";
        import { Progress } from "@/components/ui/progress";
        import { Loader2, AlertCircle, DownloadCloud, Play, Shuffle } from "lucide-react";

        interface SweBenchSimpleLauncherPaneProps { pane: Pane; }

        const FULL_DATASET_NAME = "princeton-nlp/SWE-bench";

        export const SweBenchSimpleLauncherPane: React.FC<SweBenchSimpleLauncherPaneProps> = ({ pane }) => {
          const { openEvaluationLauncherPane } = usePaneStore();

          const [datasetStatus, setDatasetStatus] = useState<{
            exists: boolean; path: string; taskCount?: number; datasetName: string;
          } | null>(null);
          const [isLoadingStatus, setIsLoadingStatus] = useState(true);
          const [isDownloading, setIsDownloading] = useState(false);
          const [downloadProgress, setDownloadProgress] = useState(0);
          const [downloadMessage, setDownloadMessage] = useState("");
          const [randomTaskCount, setRandomTaskCount] = useState<string>("10");
          const [error, setError] = useState<string | null>(null);

          const checkStatus = useCallback(async () => {
            setIsLoadingStatus(true);
            setError(null);
            try {
              const status = await window.electronAPI.sweBench!.checkDatasetStatus(FULL_DATASET_NAME);
              setDatasetStatus(status);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to check dataset status");
              setDatasetStatus(null);
            } finally {
              setIsLoadingStatus(false);
            }
          }, []);

          useEffect(() => {
            checkStatus();
          }, [checkStatus]);

          useEffect(() => {
            if (!window.electronAPI?.sweBench?.onDatasetDownloadEvent) return;

            const removeListener = window.electronAPI.sweBench.onDatasetDownloadEvent(
              (data) => {
                if (data.type === 'progress' && data.message) {
                  setDownloadMessage(data.message);
                  if (data.progress !== undefined) setDownloadProgress(data.progress);
                } else if (data.type === 'error' && data.message) {
                  setError(`Download Error: ${data.message}`);
                  setDownloadMessage(`Error: ${data.message}`);
                  setIsDownloading(false);
                } else if (data.type === 'complete') {
                  setDownloadMessage(data.message || "Download complete!");
                  setIsDownloading(false);
                  setDownloadProgress(100);
                  checkStatus(); // Refresh status after download
                }
              }
            );
            return removeListener;
          }, [checkStatus]);

          const handleDownloadDataset = async () => {
            if (!window.electronAPI?.sweBench?.downloadDataset) return;
            setIsDownloading(true);
            setDownloadProgress(0);
            setDownloadMessage("Starting download...");
            setError(null);
            try {
              await window.electronAPI.sweBench.downloadDataset({ datasetName: FULL_DATASET_NAME });
              // Progress will be handled by the event listener
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to start download");
              setIsDownloading(false);
            }
          };

          const handleStartFullRun = () => {
            if (!datasetStatus || !datasetStatus.exists || !datasetStatus.path) {
              setError("Dataset not ready.");
              return;
            }
            openEvaluationLauncherPane({
              taskInstanceIds: [], // Empty array signifies all tasks in tasksDir
              tasksDir: datasetStatus.path // Use the path of the full dataset
            });
          };

          const handleStartRandomRun = async () => {
            if (!datasetStatus || !datasetStatus.exists || !datasetStatus.path) {
              setError("Dataset not ready.");
              return;
            }
            const count = parseInt(randomTaskCount, 10);
            if (isNaN(count) || count <= 0) {
              setError("Please enter a valid number of tasks.");
              return;
            }
            try {
              setIsLoading(true);
              const randomIds = await window.electronAPI.sweBench!.getRandomTaskIds(datasetStatus.path, count);
              if (randomIds.length === 0) {
                setError(`Could not select ${count} random tasks. Dataset might be too small or empty.`);
                setIsLoading(false);
                return;
              }
              openEvaluationLauncherPane({
                taskInstanceIds: randomIds,
                tasksDir: datasetStatus.path
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to get random tasks.");
            } finally {
              setIsLoading(false);
            }
          };

          return (
            <div className="flex flex-col h-full p-6 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SWE-Bench Dataset Management</CardTitle>
                  <CardDescription>
                    Manage and download the official <code className="font-semibold">{FULL_DATASET_NAME}</code> dataset from Hugging Face.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingStatus && <Loader2 className="h-5 w-5 animate-spin" />}
                  {!isLoadingStatus && datasetStatus && (
                    <div>
                      <p>Status: <span className={datasetStatus.exists ? "text-green-500" : "text-orange-500"}>
                        {datasetStatus.exists ? `Found (${datasetStatus.taskCount || 0} tasks)` : "Not Downloaded"}
                      </span></p>
                      <p className="text-sm text-muted-foreground">Path: {datasetStatus.path || "N/A"}</p>
                    </div>
                  )}
                  <Button onClick={handleDownloadDataset} disabled={isDownloading} className="w-full">
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                    {datasetStatus?.exists ? "Refresh Full Dataset" : "Download Full Dataset"}
                  </Button>
                  {isDownloading && (
                    <div className="space-y-1">
                      <Progress value={downloadProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">{downloadMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Run Evaluations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Full Dataset Run</h3>
                    <Button
                      onClick={handleStartFullRun}
                      disabled={isDownloading || !datasetStatus?.exists || (datasetStatus?.taskCount || 0) === 0}
                      className="w-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Full Run ({datasetStatus?.taskCount || 0} tasks)
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Random Subset Run</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="random-task-count" className="whitespace-nowrap">Number of tasks (X):</Label>
                      <Input
                        id="random-task-count"
                        type="number"
                        value={randomTaskCount}
                        onChange={(e) => setRandomTaskCount(e.target.value)}
                        className="w-24"
                        min="1"
                      />
                    </div>
                    <Button
                      onClick={handleStartRandomRun}
                      disabled={isDownloading || isLoading || !datasetStatus?.exists || (datasetStatus?.taskCount || 0) === 0}
                      className="w-full"
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      Start Random Run
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          );
        };
        ```

6.  **Update `PaneManager.tsx`**:
    *   Import `SweBenchSimpleLauncherPane` and `SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE`.
    *   Add a case to render `SweBenchSimpleLauncherPane` when `pane.type === SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE`.
    *   Consider removing or feature-flagging the old `SWE_BENCH_TASK_BROWSER_PANE_TYPE` if this new pane replaces its entry point functionality.

**Phase 2: Update `SWEBenchTaskService` and other related components**

1.  **File:** `src/services/swe_bench_harness/SWEBenchTaskService.ts`
    *   Ensure `listAvailableTaskIds(tasksDir: string)` method exists and takes `tasksDir` as a parameter.
    *   Add `getRandomTaskIds(tasksDir: string, count: number): Effect.Effect<string[], DatasetAccessError | ConfigError>`
2.  **File:** `src/services/swe_bench_harness/SWEBenchTaskServiceImpl.ts`
    *   Implement `getRandomTaskIds`: Use `listAvailableTaskIds`, then shuffle and take `count`.
    *   Ensure `listAvailableTaskIds` uses the provided `tasksDir` instead of relying solely on configuration for the path. It should still use `ConfigurationService` to resolve the *base* path for `assets/swe_bench_data` if `tasksDir` is relative, or handle absolute `tasksDir`. The new IPC handler should ideally pass the absolute path derived from `ConfigurationService` to `tasksDir`.

3.  **Review `EvaluationLauncherPane.tsx` (`src/panes/swebench/`)**
    *   This pane is now opened by `SweBenchSimpleLauncherPane`.
    *   It receives `taskInstanceIds` and `tasksDir`.
    *   Its logic for selecting "all tasks" if `taskInstanceIds` is empty should continue to work by just passing an empty `instanceIds` array to `spawnBatchRun`.
    *   Ensure it correctly passes `tasksDir` to `spawnBatchRun`.

4.  **Review `scripts/run_swe_bench_batch_env.ts`:**
    *   Confirm that if `instance_ids` CLI argument is empty or not provided, it evaluates all tasks in the `tasks_dir`. This is important for the "Start Full Run" functionality.

**Phase 3: Documentation Update**

1.  **`README.md`**:
    *   Update the "Running SWE-Bench Evaluations" section to reflect the new, simplified UI.
    *   Emphasize the download of `princeton-nlp/SWE-bench`.
2.  **`docs/swebench/running-evaluations-ui.md`**:
    *   Completely rewrite this to describe the new `SWE-Bench Launcher` pane and its workflow. Remove references to the old `TaskBrowserPane` if it's being fully replaced as the main entry.

---

This refactor should streamline the SWE-Bench experience significantly. The key is the new `SweBenchSimpleLauncherPane` handling the dataset interactions and then delegating to the existing `EvaluationLauncherPane` with the appropriate task set.
```
