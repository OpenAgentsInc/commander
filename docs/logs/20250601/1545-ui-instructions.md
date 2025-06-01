Okay, let's implement the MVP for the SWE-Bench UI in Commander. This will involve creating four new panes and integrating them with your existing Effect-TS services and pane management system.

**Phase 1: Constants, Store Actions, and Basic Pane Placeholders**

**1. Define Pane Type Constants and Feature Flag:**

*   **File:** `src/services/featureflags/FeatureFlag.ts`
    *   Add a new feature flag for the SWE-Bench UI:
        ```typescript
        // ... existing features ...
        SWE_BENCH_HARNESS_PANE = "SWE_BENCH_HARNESS_PANE", // For the main SWE-Bench hotbar button
        ```

*   **File:** `src/stores/panes/constants.ts`
    *   Add IDs and titles for the new SWE-Bench panes:
        ```typescript
        // ... existing constants ...
        export const SWE_BENCH_TASK_BROWSER_PANE_ID = "swe_bench_task_browser";
        export const SWE_BENCH_TASK_BROWSER_PANE_TITLE = "SWE-Bench: Task Browser";

        export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_ID = "swe_bench_evaluation_launcher";
        export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE = "SWE-Bench: Launch Evaluation";

        export const SWE_BENCH_EVALUATION_MONITOR_PANE_ID = "swe_bench_evaluation_monitor";
        export const SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE = "SWE-Bench: Evaluation Monitor";

        export const SWE_BENCH_RESULTS_VIEWER_PANE_ID = "swe_bench_results_viewer";
        export const SWE_BENCH_RESULTS_VIEWER_PANE_TITLE = "SWE-Bench: Results Viewer";
        ```

**2. Update Pane Store Actions and Types:**

*   **File:** `src/stores/panes/types.ts`
    *   Add new actions to `PaneStoreType`:
        ```typescript
        // ... existing actions ...
        openTaskBrowserPane: () => void;
        openEvaluationLauncherPane: (content?: Record<string, any>) => void; // Can pass task IDs
        openEvaluationMonitorPane: (content?: Record<string, any>) => void;  // Can pass run ID / output dir
        openResultsViewerPane: () => void;
        ```

*   **File:** `src/stores/panes/actions/index.ts`
    *   Create new action files for each pane (e.g., `openTaskBrowserPane.ts`) and export them.
    *   These actions will use `togglePaneAction` or `addPaneActionLogic` similar to other pane opening actions.

    *   **Example for `openTaskBrowserPane.ts`:**
        ```typescript
        // src/stores/panes/actions/openTaskBrowserPane.ts
        import { type SetPaneStore, type GetPaneStore } from "../types";
        import { togglePaneAction } from "./togglePane";
        import { SWE_BENCH_TASK_BROWSER_PANE_ID, SWE_BENCH_TASK_BROWSER_PANE_TITLE, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "../constants";

        export const openTaskBrowserPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
          togglePaneAction(set, get, {
            paneId: SWE_BENCH_TASK_BROWSER_PANE_ID,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => ({
              id: SWE_BENCH_TASK_BROWSER_PANE_ID,
              type: "swe_bench_task_browser",
              title: SWE_BENCH_TASK_BROWSER_PANE_TITLE,
              x: storedPosition?.x ?? (screenWidth - DEFAULT_PANE_WIDTH * 1.5) / 2,
              y: storedPosition?.y ?? (screenHeight - DEFAULT_PANE_HEIGHT * 1.5) / 2,
              width: storedPosition?.width ?? DEFAULT_PANE_WIDTH * 1.5,
              height: storedPosition?.height ?? DEFAULT_PANE_HEIGHT * 1.5,
              dismissable: true,
              content: {},
            }),
          });
        };
        ```
    *   Create similar files for `openEvaluationLauncherPaneAction`, `openEvaluationMonitorPaneAction`, and `openResultsViewerPaneAction`. Adjust default sizes and positions as needed. The launcher and monitor might be opened with specific content (task IDs, run ID) by other panes, so their `createPaneInput` should handle `storedData.content`.

*   **File:** `src/stores/pane.ts`
    *   Import and add the new actions to the `usePaneStore` definition.

**3. Create Placeholder Pane Components:**

*   Create a new directory: `src/panes/swebench/`
*   Inside this directory, create placeholder React components for each new pane:
    *   `TaskBrowserPane.tsx`
    *   `EvaluationLauncherPane.tsx`
    *   `EvaluationMonitorPane.tsx`
    *   `ResultsViewerPane.tsx`
    *   Each component should render a simple `div` with its name for now.

    *   **Example for `TaskBrowserPane.tsx`:**
        ```typescript
        // src/panes/swebench/TaskBrowserPane.tsx
        import React from "react";
        import type { PaneProps } from "@/types/pane"; // Assuming PaneProps is in a shared types file

        export const TaskBrowserPane: React.FC<PaneProps> = ({ id, title, content }) => {
          return (
            <div className="p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-2">{title}</h2>
              <p>Task Browser Pane Content - ID: {id}</p>
              {/* Task list, search, filter, preview, launch button will go here */}
            </div>
          );
        };
        ```
    *   Create similar placeholders for the other three panes.

**4. Update `PaneManager.tsx`:**

*   **File:** `src/panes/PaneManager.tsx`
    *   Import the new pane components.
    *   Add cases to the conditional rendering logic to display the new panes based on their `pane.type`:
        ```typescript
        // ... existing imports ...
        import { TaskBrowserPane } from "./swebench/TaskBrowserPane";
        import { EvaluationLauncherPane } from "./swebench/EvaluationLauncherPane";
        import { EvaluationMonitorPane } from "./swebench/EvaluationMonitorPane";
        import { ResultsViewerPane } from "./swebench/ResultsViewerPane";

        // ... inside PaneManager component, in the map function ...
        {pane.type === "swe_bench_task_browser" && (
          <TaskBrowserPane {...pane} />
        )}
        {pane.type === "swe_bench_evaluation_launcher" && (
          <EvaluationLauncherPane {...pane} />
        )}
        {pane.type === "swe_bench_evaluation_monitor" && (
          <EvaluationMonitorPane {...pane} />
        )}
        {pane.type === "swe_bench_results_viewer" && (
          <ResultsViewerPane {...pane} />
        )}
        // ... other pane types ...
        ```

**5. Update Hotbar:**

*   **File:** `src/components/hud/Hotbar.tsx`
    *   Import a new icon for SWE-Bench (e.g., `ClipboardCheck` from `lucide-react`).
    *   Add a new `HotbarItem` that calls `usePaneStore.getState().openTaskBrowserPane()`.
    *   Conditionally render this item based on the `SWE_BENCH_HARNESS_PANE` feature flag.

    ```typescript
    // ... existing imports ...
    import { ClipboardCheck } from "lucide-react"; // Or any other suitable icon
    import { useFeatureFlag } from "@/hooks/useFeatureFlag";
    import { Feature } from "@/services/featureflags/FeatureFlag";
    import { SWE_BENCH_TASK_BROWSER_PANE_ID } from "@/stores/panes/constants";

    // ... inside Hotbar component ...
    const openTaskBrowserPane = usePaneStore((state) => state.openTaskBrowserPane);
    const [isSweBenchEnabled] = useFeatureFlag(Feature.SWE_BENCH_HARNESS_PANE);
    const activePaneId = usePaneStore((state) => state.activePaneId);
    // ...

    // Add a new HotbarItem, for example in slot 7
    {isSweBenchEnabled && (
      <HotbarItem
        slotNumber={7}
        onClick={openTaskBrowserPane}
        isActive={activePaneId === SWE_BENCH_TASK_BROWSER_PANE_ID}
        tooltipContent="SWE-Bench Task Browser (Ctrl+7)"
      >
        <ClipboardCheck />
      </HotbarItem>
    )}
    ```
*   **File:** `src/controls.ts`
    *   Add a new `AppControls` enum member and map it to a key (e.g., `Digit7`):
        ```typescript
        export enum AppControls {
          // ... existing controls ...
          SWE_BENCH_BROWSER = "SWE_BENCH_BROWSER", // New
        }

        export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
          // ... existing mappings ...
          { name: AppControls.SWE_BENCH_BROWSER, keys: ["Digit7", "Numpad7"] },
        ];
        ```
*   **File:** `src/pages/HomePage.tsx`
    *   Update the global keydown handler to include `toggleTaskBrowserPane` (or `openTaskBrowserPane` if not a toggle) when `Ctrl+7` (or the chosen key) is pressed, guarded by `isSweBenchEnabled`.

**6. Feature Flag Configuration:**

*   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   Add `SWE_BENCH_HARNESS_PANE` to the `FEATURE_FLAGS_ENABLED_LIST` in `DefaultDevConfigLayer` to enable it by default in development.
        ```typescript
        // In DefaultDevConfigLayer's Effect.gen block
        // Append to existing FEATURE_FLAGS_ENABLED_LIST string
        // Example: "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,SWE_BENCH_HARNESS_PANE"
        ```

**Phase 2: Implement IPC Channels for SWE-Bench UI**

**Objective:** Create IPC channels for communication between renderer panes and main process services, especially for file system operations and task listing.

1.  **Define New IPC Channels:**
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-channels.ts`
        *   Add channels:
            ```typescript
            export const SWE_BENCH_LIST_TASKS_CHANNEL = "swebench:list-tasks";
            export const SWE_BENCH_GET_TASK_CHANNEL = "swebench:get-task";
            // EVALUATE_TASK is already defined
            export const SWE_BENCH_LIST_RESULT_RUNS_CHANNEL = "swebench:list-result-runs";
            export const SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL = "swebench:get-result-summary";
            export const SWE_BENCH_GET_TASK_RESULT_CHANNEL = "swebench:get-task-result";
            export const SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL = "swebench:spawn-batch-run"; // For launcher
            export const SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL = "swebench:batch-run-stdout"; // Main to Renderer
            export const SWE_BENCH_BATCH_RUN_STDERR_CHANNEL = "swebench:batch-run-stderr"; // Main to Renderer
            export const SWE_BENCH_BATCH_RUN_EXIT_CHANNEL = "swebench:batch-run-exit";   // Main to Renderer
            export const SWE_BENCH_STOP_BATCH_RUN_CHANNEL = "swebench:stop-batch-run"; // Renderer to Main
            ```

2.  **Expose Renderer API Functions:**
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-context.ts`
        *   Update `exposeSWEBenchContext` to include invokers for the new channels:
            ```typescript
            // ... existing evaluateTask ...
            listTasks: () => ipcRenderer.invoke(SWE_BENCH_LIST_TASKS_CHANNEL),
            getTask: (instanceId: string) => ipcRenderer.invoke(SWE_BENCH_GET_TASK_CHANNEL, instanceId),
            listResultRuns: () => ipcRenderer.invoke(SWE_BENCH_LIST_RESULT_RUNS_CHANNEL),
            getResultSummary: (runDir: string) => ipcRenderer.invoke(SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL, runDir),
            getTaskResult: (runDir: string, instanceId: string) => ipcRenderer.invoke(SWE_BENCH_GET_TASK_RESULT_CHANNEL, runDir, instanceId),
            spawnBatchRun: (params: { instanceIds?: string[]; patchSource: string; outputDirName?: string; maxTasks?: number }) =>
              ipcRenderer.invoke(SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL, params), // Returns runId (outputDirName)
            stopBatchRun: (runId: string) => ipcRenderer.invoke(SWE_BENCH_STOP_BATCH_RUN_CHANNEL, runId),
            onBatchRunStdout: (callback: (data: { runId: string, output: string }) => void) => {
              const listener = (_event: any, data: { runId: string, output: string }) => callback(data);
              ipcRenderer.on(SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL, listener);
              return () => ipcRenderer.removeListener(SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL, listener);
            },
            // Similar for onBatchRunStderr and onBatchRunExit
            ```
    *   Update `src/types.d.ts` to reflect these new methods in `window.electronAPI.sweBench`.

3.  **Implement Main Process Handlers:**
    *   **File:** `src/main.ts`
        *   Add handlers for `SWE_BENCH_LIST_TASKS_CHANNEL`, `SWE_BENCH_GET_TASK_CHANNEL`, `SWE_BENCH_LIST_RESULT_RUNS_CHANNEL`, `SWE_BENCH_GET_RESULT_SUMMARY_CHANNEL`, `SWE_BENCH_GET_TASK_RESULT_CHANNEL`. These will use `SWEBenchTaskService` or Node.js `fs` module (via Effect-TS `FileSystem` service if refactored).
        *   **Handler for `SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL`:**
            *   This handler will use `child_process.spawn` to execute `scripts/run_swe_bench_batch_env.ts` with the provided parameters.
            *   It should generate a unique `runId` (which will be the output subdirectory name).
            *   Store the spawned `ChildProcess` object in a map keyed by `runId`.
            *   Pipe the `stdout` and `stderr` of the child process to send `SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL` and `SWE_BENCH_BATCH_RUN_STDERR_CHANNEL` messages to the renderer (`event.sender.send(...)`).
            *   On child process `exit`, send `SWE_BENCH_BATCH_RUN_EXIT_CHANNEL`.
            *   Return the `runId` to the renderer immediately.
        *   **Handler for `SWE_BENCH_STOP_BATCH_RUN_CHANNEL`:**
            *   Takes `runId`. Finds the `ChildProcess` in the map and calls `kill()`.

    *   **Refactor `swebench:evaluate-task` (Optional for MVP, current file-based status is simpler):**
        *   If direct progress from `SWEBenchHarnessService` is desired *instead of* spawning the script, this IPC handler needs to be refactored significantly to manage the Effect stream and send progress events. This is more complex. The script-spawning approach for the `EvaluationLauncherPane` + `EvaluationMonitorPane` is likely simpler for the MVP.

**Phase 3: Implement Pane Functionality**

**1. `TaskBrowserPane.tsx` Implementation:**
    *   Fetch task IDs on mount: `const taskIds = await window.electronAPI.sweBench.listTasks();`
    *   Implement search/filter locally on the fetched `taskIds`.
    *   Display tasks in a Shadcn `Table`.
    *   On row click, fetch full task details (`window.electronAPI.sweBench.getTask(id)`) and show `problem_statement` in a preview area.
    *   "Launch" button:
        *   Gets selected task ID(s).
        *   Calls `usePaneStore.getState().openEvaluationLauncherPane({ selectedTaskIds: [...] });`

**2. `EvaluationLauncherPane.tsx` Implementation:**
    *   Receives `selectedTaskIds` from `pane.content`.
    *   Form with:
        *   Dropdown for Patch Source (`gold`, `empty`, `agent:claude_code`).
        *   (Optional) Input for custom output directory name suffix.
    *   "Run Evaluation" button logic:
        *   `setIsLoading(true);`
        *   `const runId = await window.electronAPI.sweBench.spawnBatchRun({ instanceIds: selectedTaskIds, patchSource: chosenSource, ... });`
        *   `setIsLoading(false);`
        *   `usePaneStore.getState().openEvaluationMonitorPane({ runId });`
        *   (Optionally close self: `removePane(id)`).

**3. `EvaluationMonitorPane.tsx` Implementation:**
    *   Receives `runId` (the output directory name) from `pane.content`.
    *   UI: Display `runId`. Area for live logs. Overall progress (X/Y tasks).
    *   `useEffect` to subscribe to `onBatchRunStdout`, `onBatchRunStderr`, `onBatchRunExit`. Append data to a local state for logs.
    *   Periodically (or on exit event), poll `summary.json` from the `runId` directory (`window.electronAPI.sweBench.getResultSummary(runId)`). Update progress bar based on `tasks_attempted` vs total from initial launch params.
    *   "Stop Run" button calls `window.electronAPI.sweBench.stopBatchRun(runId)`.

**4. `ResultsViewerPane.tsx` Implementation:**
    *   Fetch list of run directories: `const runs = await window.electronAPI.sweBench.listResultRuns();`
    *   Dropdown to select a `runDir` from `runs`.
    *   When a run is selected:
        *   Fetch `summary.json`: `const summary = await window.electronAPI.sweBench.getResultSummary(selectedRunDir);`
        *   Display summary stats.
        *   Fetch individual task results from `summary.results` or by listing `_eval_result.json` files and then fetching them.
        *   Display in a `Table` with columns: Instance ID, Resolved, Patch Source, Duration.
        *   On row click, if `generated_patch_content` exists, show it in a modal or dedicated area.

This structured approach should allow the agent to implement the MVP panes systematically.

```

I will provide instructions to implement the SWE-Bench UI MVP as described in `docs/swebench/ui-mvp.md`. This involves creating four new panes, connecting them to the existing Effect-TS services via IPC, and integrating them into the pane management system.

**Overall Plan:**

1.  **Setup:** Define constants, pane store actions, and feature flags.
2.  **IPC Layer:** Create necessary IPC channels, main process handlers, and preload context exposers.
3.  **Pane Components (MVP Functionality):** Implement the four panes with their core MVP features.
4.  **Integration:** Update `PaneManager` and `Hotbar`.

---

**Instructions for the Coding Agent:**

**Phase 1: Setup - Constants, Store Actions, Feature Flags**

1.  **Feature Flag:**
    *   **File:** `src/services/featureflags/FeatureFlag.ts`
    *   Add a new feature flag for the SWE-Bench UI:
        ```typescript
        // Add to the enum
        SWE_BENCH_MVP_UI = "SWE_BENCH_MVP_UI",
        ```
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   In `DefaultDevConfigLayer`, add `SWE_BENCH_MVP_UI` to `FEATURE_FLAGS_ENABLED_LIST`. For example:
        ```typescript
        yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST",
          "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,SWE_BENCH_MVP_UI" // Append here
        ));
        ```

2.  **Pane Constants:**
    *   **File:** `src/stores/panes/constants.ts`
    *   Add constants for the new pane types, IDs, and titles:
        ```typescript
        // SWE-Bench MVP Panes
        export const SWE_BENCH_TASK_BROWSER_PANE_TYPE = "swe_bench_task_browser";
        export const SWE_BENCH_TASK_BROWSER_PANE_ID_CONST = "swe_bench_task_browser_main";
        export const SWE_BENCH_TASK_BROWSER_PANE_TITLE = "SWE-Bench: Task Browser";

        export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE = "swe_bench_evaluation_launcher";
        // Launcher panes will be dynamic, so no const ID here, but a base title
        export const SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE = "SWE-Bench: Launch";

        export const SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE = "swe_bench_evaluation_monitor";
        // Monitor panes will be dynamic
        export const SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE_BASE = "SWE-Bench: Monitor";

        export const SWE_BENCH_RESULTS_VIEWER_PANE_TYPE = "swe_bench_results_viewer";
        export const SWE_BENCH_RESULTS_VIEWER_PANE_ID_CONST = "swe_bench_results_viewer_main";
        export const SWE_BENCH_RESULTS_VIEWER_PANE_TITLE = "SWE-Bench: Results";
        ```

3.  **Pane Store Actions and Types:**
    *   **File:** `src/stores/panes/types.ts`
    *   Add new actions to `PaneStoreType`:
        ```typescript
        // ... existing actions ...
        openTaskBrowserPane: () => void;
        openEvaluationLauncherPane: (content: { taskInstanceIds: string[], tasksDir: string }) => void;
        openEvaluationMonitorPane: (content: { runId: string, outputDir: string, totalTasks: number }) => void;
        openResultsViewerPane: () => void;
        ```
    *   **File:** `src/stores/panes/actions/index.ts`
        *   Create and export four new action files: `openTaskBrowserPane.ts`, `openEvaluationLauncherPane.ts`, `openEvaluationMonitorPane.ts`, `openResultsViewerPane.ts`.
        *   Implement these actions using `togglePaneAction` (for browser and viewer which are singletons for MVP) or `addPaneActionLogic` (for launcher and monitor which might be dynamic per launch/run).

    *   **Example: `src/stores/panes/actions/openTaskBrowserPane.ts`**
        ```typescript
        import { type SetPaneStore, type GetPaneStore } from "../types";
        import { togglePaneAction } from "./togglePane";
        import { SWE_BENCH_TASK_BROWSER_PANE_ID_CONST, SWE_BENCH_TASK_BROWSER_PANE_TYPE, SWE_BENCH_TASK_BROWSER_PANE_TITLE, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "../constants";

        export const openTaskBrowserPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
          togglePaneAction(set, get, {
            paneId: SWE_BENCH_TASK_BROWSER_PANE_ID_CONST,
            createPaneInput: (screenWidth, screenHeight, storedPosition) => ({
              id: SWE_BENCH_TASK_BROWSER_PANE_ID_CONST,
              type: SWE_BENCH_TASK_BROWSER_PANE_TYPE,
              title: SWE_BENCH_TASK_BROWSER_PANE_TITLE,
              x: storedPosition?.x ?? Math.max(20, (screenWidth - DEFAULT_PANE_WIDTH * 1.8) / 2),
              y: storedPosition?.y ?? Math.max(20, (screenHeight - DEFAULT_PANE_HEIGHT * 1.8) / 2),
              width: storedPosition?.width ?? DEFAULT_PANE_WIDTH * 1.8,
              height: storedPosition?.height ?? DEFAULT_PANE_HEIGHT * 1.8,
              dismissable: true,
              content: {},
            }),
          });
        };
        ```
    *   **Example: `src/stores/panes/actions/openEvaluationLauncherPane.ts` (uses `addPaneActionLogic` for dynamic ID)**
        ```typescript
        import { type PaneInput } from "@/types/pane";
        import { type SetPaneStore, type GetPaneStore } from "../types";
        import { addPaneActionLogic } from "./addPane";
        import { SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE, SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE } from "../constants";

        export const openEvaluationLauncherPaneAction = (set: SetPaneStore, get: GetPaneStore, content: { taskInstanceIds: string[], tasksDir: string }) => {
          const paneId = `swe_bench_launcher_${Date.now()}`;
          const title = `${SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE} (${content.taskInstanceIds.length} tasks)`;
          const newPaneInput: PaneInput = {
            id: paneId,
            type: SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE,
            title: title,
            content: content, // Pass task IDs and tasksDir
            dismissable: true,
            width: 500,
            height: 350,
          };
          set((state) => addPaneActionLogic(state, newPaneInput, true));
        };
        ```
    *   Create similar actions for `EvaluationMonitor` (dynamic ID, pass `runId` and `outputDir`) and `ResultsViewer` (singleton, like browser).
    *   **File:** `src/stores/pane.ts` - Import and add the new actions to the store.

**Phase 2: IPC Layer for SWE-Bench UI**

1.  **Define IPC Channels:**
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-channels.ts`
    *   Ensure these channels are defined (some may exist from previous steps):
        ```typescript
        export const SWE_BENCH_LIST_TASKS_CHANNEL = "swebench:list-tasks"; // (tasksDir: string) => Promise<string[]> (instance_ids)
        export const SWE_BENCH_GET_TASK_CHANNEL = "swebench:get-task";     // (tasksDir: string, instanceId: string) => Promise<SWEBenchTask | null>

        export const SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL = "swebench:spawn-batch-run"; // (params) => Promise<{runId: string}> (runId is outputDir name)
        export const SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL = "swebench:batch-run-stdout"; // Event: (runId, data)
        export const SWE_BENCH_BATCH_RUN_STDERR_CHANNEL = "swebench:batch-run-stderr"; // Event: (runId, data)
        export const SWE_BENCH_BATCH_RUN_EXIT_CHANNEL = "swebench:batch-run-exit";     // Event: (runId, code)
        export const SWE_BENCH_STOP_BATCH_RUN_CHANNEL = "swebench:stop-batch-run";     // (runId) => Promise<void>

        export const FS_LIST_DIRS_CHANNEL = "fs:list-dirs";               // (path) => Promise<string[]>
        export const FS_READ_JSON_FILE_CHANNEL = "fs:read-json-file";    // (filePath) => Promise<any>
        ```

2.  **Expose Renderer API Functions:**
    *   **File:** `src/helpers/ipc/swe_bench/swe-bench-context.ts`
        *   Update/Create `exposeSWEBenchContext` in `electronAPI.sweBench`:
            ```typescript
            // ...
            listTasks: (tasksDir: string) => ipcRenderer.invoke(SWE_BENCH_LIST_TASKS_CHANNEL, tasksDir),
            getTask: (tasksDir: string, instanceId: string) => ipcRenderer.invoke(SWE_BENCH_GET_TASK_CHANNEL, tasksDir, instanceId),
            spawnBatchRun: (params: { instanceIds?: string[]; patchSource: string; outputDirName?: string; maxTasks?: number; tasksDir: string }) =>
              ipcRenderer.invoke(SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL, params),
            stopBatchRun: (runId: string) => ipcRenderer.invoke(SWE_BENCH_STOP_BATCH_RUN_CHANNEL, runId),
            // Event listeners (onBatchRunStdout, etc.)
            onBatchRunOutput: (channel: string, callback: (data: { runId: string, output: string | number }) => void) => {
              const listener = (_event: any, data: { runId: string, output: string | number }) => callback(data);
              ipcRenderer.on(channel, listener);
              return () => ipcRenderer.removeListener(channel, listener);
            },
            ```
    *   **File:** `src/helpers/ipc/context-exposer.ts`
        *   Ensure `exposeSWEBenchContext()` is called.
        *   Add a generic `fs` API for the ResultsViewerPane:
            ```typescript
            // Also in context-exposer.ts
            contextBridge.exposeInMainWorld("electronAPI", {
              // ... existing electronAPI ...
              fs: {
                listDirs: (dirPath: string) => ipcRenderer.invoke(FS_LIST_DIRS_CHANNEL, dirPath),
                readJsonFile: (filePath: string) => ipcRenderer.invoke(FS_READ_JSON_FILE_CHANNEL, filePath),
              }
            });
            ```
    *   Update `src/types.d.ts` for `window.electronAPI.sweBench` and `window.electronAPI.fs`.

3.  **Implement Main Process IPC Handlers:**
    *   **File:** `src/main.ts`
        *   Import necessary Node.js modules (`fs`, `path`, `spawn` from `child_process`).
        *   Import Effect services (`SWEBenchTaskService`, `ConfigurationService`).
        *   **`SWE_BENCH_LIST_TASKS_CHANNEL` handler:**
            *   Takes `tasksDir`.
            *   Uses `ConfigurationService` to get base `SWE_BENCH_DATASET_PATH`.
            *   Constructs full path, reads directory using `fs.readdir`, filters for `.json` files, returns `instance_id` array.
        *   **`SWE_BENCH_GET_TASK_CHANNEL` handler:**
            *   Takes `tasksDir`, `instanceId`.
            *   Constructs full path to `instanceId.json`.
            *   Reads and parses JSON using `fs.readFile` and `JSON.parse`.
        *   **`SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL` handler:**
            *   Takes `params: { instanceIds, patchSource, outputDirName, maxTasks, tasksDir }`.
            *   Generate `runId` (timestamped output directory name if `outputDirName` not given).
            *   Construct arguments for `scripts/run_swe_bench_batch_env.ts`.
            *   Use `spawn('pnpm', ['tsx', 'scripts/run_swe_bench_batch_env.ts', ...args], { stdio: 'pipe' })`.
            *   Store `ChildProcess` in a global map `Map<string, ChildProcess>` keyed by `runId`.
            *   Relay `stdout`, `stderr`, `exit` events from child process to renderer using `event.sender.send(CHANNEL, { runId, data })`.
            *   Return `{ runId }` to renderer.
        *   **`SWE_BENCH_STOP_BATCH_RUN_CHANNEL` handler:**
            *   Takes `runId`. Kills the corresponding `ChildProcess` from the map.
        *   **`FS_LIST_DIRS_CHANNEL` handler:**
            *   Takes `basePath`. Reads `swebench-results` directory (ensure path is safe/sandboxed).
            *   Returns array of directory names.
        *   **`FS_READ_JSON_FILE_CHANNEL` handler:**
            *   Takes `filePath` (relative to `swebench-results` or a base path).
            *   Reads and parses JSON file. Ensure path is safe.

**Phase 3: Implement Pane Components (MVP Functionality)**

1.  **`TaskBrowserPane.tsx` (`src/panes/swebench/TaskBrowserPane.tsx`)**
    *   **State:** `tasksDir` (default to `assets/swe_bench_data`), `taskIds` (string[]), `isLoading`, `error`, `filterText`, `selectedTaskPreview` (content of selected task's problem_statement).
    *   **UI:**
        *   Input for `tasksDir` (optional, for advanced users).
        *   Input for `filterText`.
        *   Button "Load Tasks".
        *   Shadcn `Table` to display filtered `taskIds` (columns: Instance ID, Action Button).
        *   Area to display `selectedTaskPreview`.
    *   **Logic:**
        *   "Load Tasks": Calls `window.electronAPI.sweBench.listTasks(tasksDir)`.
        *   Table row click: Calls `window.electronAPI.sweBench.getTask(tasksDir, instanceId)` to fetch preview.
        *   "Launch" button in table row: Calls `usePaneStore.getState().openEvaluationLauncherPane({ taskInstanceIds: [clickedInstanceId], tasksDir })`.

2.  **`EvaluationLauncherPane.tsx` (`src/panes/swebench/EvaluationLauncherPane.tsx`)**
    *   Receives `taskInstanceIds` and `tasksDir` from `pane.content`.
    *   **State:** `patchSource` ("gold", "empty", "agent:claude_code"), `outputDirSuffix` (optional text input).
    *   **UI:**
        *   Display selected task IDs.
        *   Shadcn `Select` for `patchSource`.
        *   Input for `outputDirSuffix`.
        *   Button "Run Evaluation".
    *   **Logic:**
        *   "Run Evaluation":
            *   `const { runId } = await window.electronAPI.sweBench.spawnBatchRun({ instanceIds: pane.content.taskInstanceIds, patchSource, outputDirName: outputDirSuffix, tasksDir: pane.content.tasksDir });`
            *   `usePaneStore.getState().openEvaluationMonitorPane({ runId, outputDir: runId /* because runId is the dir name */, totalTasks: pane.content.taskInstanceIds.length });`
            *   `usePaneStore.getState().removePane(id);` (close self).

3.  **`EvaluationMonitorPane.tsx` (`src/panes/swebench/EvaluationMonitorPane.tsx`)**
    *   Receives `runId` (output directory path) and `totalTasks` from `pane.content`.
    *   **State:** `logOutput` (string[]), `completedTasks` (number), `currentTaskStatus` (string).
    *   **UI:**
        *   Display `Run ID: {runId}`.
        *   Progress bar: `value={(completedTasks / totalTasks) * 100}`.
        *   "Current Task: {currentTaskStatus}".
        *   Scrollable log area for `logOutput`.
        *   "Stop Run" button.
    *   **Logic:**
        *   `useEffect` to subscribe to `onBatchRunOutput` for `stdout`, `stderr`, `exit` events.
            *   Append stdout/stderr to `logOutput`.
            *   Parse stdout for lines like `Evaluating task: <instanceId>` to update `currentTaskStatus`.
            *   On `exit` or if stdout indicates completion of a task, increment `completedTasks` (this might be tricky; polling `summary.json` might be more reliable for progress than stdout parsing).
        *   "Stop Run" button: `window.electronAPI.sweBench.stopBatchRun(runId)`.

4.  **`ResultsViewerPane.tsx` (`src/panes/swebench/ResultsViewerPane.tsx`)**
    *   **State:** `availableRuns` (string[]), `selectedRunDir` (string | null), `summaryData` (any | null), `taskResults` (EvaluationResult[]).
    *   **UI:**
        *   Dropdown (`Select`) to choose `selectedRunDir` from `availableRuns`.
        *   Display summary stats from `summaryData`.
        *   `Table` to show `taskResults` (Instance ID, Resolved, Duration, Patch Source).
        *   Area to show patch content when a task row is clicked.
    *   **Logic:**
        *   `useEffect` (on mount): `const runs = await window.electronAPI.fs.listDirs("./swebench-results"); setAvailableRuns(runs);`
        *   `useEffect` (on `selectedRunDir` change):
            *   `const summary = await window.electronAPI.fs.readJsonFile(path.join("./swebench-results", selectedRunDir, "summary.json")); setSummaryData(summary);`
            *   Fetch individual `_eval_result.json` files based on `summary.results` or by listing files in `selectedRunDir`.

**Final Steps:**

1.  **Update `Hotbar.tsx`**: Add the `SWE_BENCH_MVP_UI` feature flag guard and wire up the button to `openTaskBrowserPaneAction`.
2.  **Update `HomePage.tsx`**: Ensure the new `AppControls` member for SWE-Bench (e.g., `SWE_BENCH_BROWSER`) correctly calls `openTaskBrowserPaneAction`.

This comprehensive plan covers the MVP features. The "Real-time progress bar" for `EvaluationMonitorPane` might be simplified for MVP to just show logs and final summary, with detailed progress polling as a fast-follow.

```
