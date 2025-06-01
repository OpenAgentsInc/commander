
Okay, I understand the issue. The user can open the "SWE-Bench Task Browser" from the hotbar, but from there, the UI flow to launch an evaluation and open subsequent panes (Launcher, Monitor, Results) is broken. This means the problem likely lies within the `TaskBrowserPane` component itself or the actions/components it's supposed to trigger.

Here are the full instructions for the coding agent to fix this issue. We'll focus on ensuring the chain of UI interactions for SWE-Bench is correctly implemented as per the MVP design.

**Objective:** Enable the full SWE-Bench evaluation UI flow, starting from the "SWE-Bench Task Browser" pane. This involves verifying and correcting the "Launch Evaluation" functionality in the `TaskBrowserPane` and the subsequent "Run Evaluation" functionality in the `EvaluationLauncherPane`.

**Instructions for the Coding Agent:**

**Phase 1: Verify Prerequisite Setup (Feature Flags and Hotbar - Likely Correct based on user report)**

1.  **Feature Flag Check:**
    *   **File:** `src/services/featureflags/FeatureFlag.ts`
    *   **Verify:** Ensure the enum `Feature` contains `SWE_BENCH_MVP_UI`.
        ```typescript
        export enum Feature {
          // ... other features ...
          SWE_BENCH_MVP_UI = "SWE_BENCH_MVP_UI",
        }
        ```
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Verify:** In `DefaultDevConfigLayer`, ensure `SWE_BENCH_MVP_UI` is included in the `FEATURE_FLAGS_ENABLED_LIST` string. For example:
        ```typescript
        yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST",
          "...existing flags...,SWE_BENCH_MVP_UI" // Ensure it's added
        ));
        ```

2.  **Hotbar Button and Keyboard Shortcut Check:**
    *   **File:** `src/components/hud/Hotbar.tsx`
    *   **Verify:** The `HotbarItem` for SWE-Bench correctly uses the `SWE_BENCH_MVP_UI` feature flag and calls `openTaskBrowserPane`.
        ```typescript
        // Inside Hotbar component
        const openTaskBrowserPane = usePaneStore((state) => state.openTaskBrowserPane);
        const [isSweBenchEnabled] = useFeatureFlag(Feature.SWE_BENCH_MVP_UI);
        // ...
        {isSweBenchEnabled && (
          <HotbarItem
            slotNumber={7} // Or the assigned slot
            onClick={openTaskBrowserPane}
            // ... other props ...
          >
            {/* Icon */}
          </HotbarItem>
        )}
        ```
    *   **File:** `src/pages/HomePage.tsx`
    *   **Verify:** The global keydown handler for `Ctrl+7` (or the assigned shortcut) correctly calls `openTaskBrowserPane` when `isSweBenchEnabled` is true.

    *These are likely correct as the user can open the Task Browser.*

**Phase 2: Fix `TaskBrowserPane` "Launch Evaluation" Functionality**

The problem likely starts here: the user opens the Task Browser but cannot proceed.

1.  **File:** `src/panes/swebench/TaskBrowserPane.tsx`
    *   **Ensure State for Selected Tasks:**
        *   Verify that there's a state variable to hold selected task IDs, e.g., `selectedTaskIds` (typically a `Set<string>`).
        *   Verify `handleToggleSelection` correctly updates this state.

    *   **Implement/Verify "Launch Evaluation" Button:**
        *   Ensure a "Launch Evaluation" button is present.
        *   The button's `disabled` state should be `selectedTaskIds.size === 0`.
        *   The button's `onClick` handler should be `handleLaunchEvaluation`.

    *   **Implement/Verify `handleLaunchEvaluation` Function:**
        *   This function is critical. It must call the `openEvaluationLauncherPane` action from `usePaneStore`.
        ```typescript
        // Inside TaskBrowserPane component

        // Ensure this hook is used to get the action:
        // const { openEvaluationLauncherPane } = usePaneStore(
        //   useShallow(state => ({ openEvaluationLauncherPane: state.openEvaluationLauncherPane }))
        // );
        // OR:
        // const openEvaluationLauncherPane = usePaneStore((state) => state.openEvaluationLauncherPane);


        const handleLaunchEvaluation = () => {
          if (selectedTaskIds.size === 0) {
            console.warn("[TaskBrowserPane] No tasks selected for evaluation.");
            // Optionally show a toast/alert to the user
            return;
          }

          // Log for debugging
          console.log(`[TaskBrowserPane] Launching evaluation for ${selectedTaskIds.size} tasks. Task IDs:`, Array.from(selectedTaskIds));
          console.log(`[TaskBrowserPane] Using tasksDir: ${tasksDir}`);

          openEvaluationLauncherPane({
            taskInstanceIds: Array.from(selectedTaskIds),
            tasksDir: tasksDir // Ensure tasksDir state is correctly populated and passed
          });
        };
        ```
    *   **Ensure `tasksDir` state is correctly managed and passed.** This is needed by the launcher to know where to fetch task details if it re-loads them.

2.  **File:** `src/stores/panes/actions/openEvaluationLauncherPane.ts`
    *   **Verify Action Implementation:**
        *   Ensure this action correctly calls `addPaneActionLogic` to create a new pane.
        *   The `type` should be `SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE`.
        *   The `content` passed to `addPaneActionLogic` must include `taskInstanceIds` and `tasksDir`.
        ```typescript
        // src/stores/panes/actions/openEvaluationLauncherPane.ts
        import { type PaneInput } from "@/types/pane";
        import { type SetPaneStore, type GetPaneStore } from "../types";
        import { addPaneActionLogic } from "./addPane";
        import {
          SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE,
          SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE
        } from "../constants";

        export const openEvaluationLauncherPaneAction = (
          set: SetPaneStore,
          get: GetPaneStore,
          content: { taskInstanceIds: string[], tasksDir: string } // Ensure tasksDir is received
        ) => {
          const paneId = `swe_bench_launcher_${Date.now()}`; // Dynamic ID
          const title = `${SWE_BENCH_EVALUATION_LAUNCHER_PANE_TITLE_BASE} (${content.taskInstanceIds.length} task${content.taskInstanceIds.length === 1 ? '' : 's'})`;

          const newPaneInput: PaneInput = {
            id: paneId,
            type: SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE,
            title: title,
            content: content, // Critical: pass taskInstanceIds AND tasksDir
            dismissable: true,
            width: 500, // Or other appropriate size
            height: 350,
          };
          set((state) => addPaneActionLogic(state, newPaneInput, true)); // true for tiling/focus
        };
        ```

**Phase 3: Fix `EvaluationLauncherPane` "Run Evaluation" Functionality**

This pane is opened by the Task Browser and is responsible for starting the actual batch run.

1.  **File:** `src/panes/swebench/EvaluationLauncherPane.tsx`
    *   **Receive Content Correctly:**
        *   Ensure the component correctly receives `taskInstanceIds` and `tasksDir` from `pane.content`.
            ```typescript
            // Inside EvaluationLauncherPane component
            const content = pane.content as { taskInstanceIds?: string[], tasksDir?: string };
            const initialTaskIds = content?.taskInstanceIds || [];
            const tasksDir = content?.tasksDir || "patches"; // Default if not provided
            ```
    *   **Implement/Verify "Run Evaluation" Button:**
        *   Ensure a "Run Evaluation" button is present.
        *   Its `onClick` handler should be `handleRunEvaluation`.

    *   **Implement/Verify `handleRunEvaluation` Function:**
        *   This function calls the IPC `spawnBatchRun` and then opens the monitor pane.
        ```typescript
        // Inside EvaluationLauncherPane component
        const { openEvaluationMonitorPane, removePane } = usePaneStore(
          useShallow(state => ({
            openEvaluationMonitorPane: state.openEvaluationMonitorPane,
            removePane: state.removePane
          }))
        );
        // ... states for patchSource, outputDirSuffix, maxTasks ...

        const handleRunEvaluation = async () => {
          setIsLoading(true);
          setError(null);

          try {
            if (!window.electronAPI?.sweBench?.spawnBatchRun) {
              throw new Error("SWE-Bench API (spawnBatchRun) not available on window.electronAPI");
            }

            // Determine tasks to run: either selected or all from tasksDir if selection is empty
            const effectiveInstanceIds = initialTaskIds.length > 0 ? initialTaskIds : undefined;
            // If initialTaskIds is empty and maxTasks is set, the script will run up to maxTasks from tasksDir
            // If initialTaskIds is empty and maxTasks is NOT set, the script will run ALL tasks from tasksDir

            const params = {
              instanceIds: effectiveInstanceIds,
              patchSource, // From component state
              outputDirName: outputDirSuffix || undefined, // From component state
              maxTasks: maxTasks ? parseInt(maxTasks, 10) : undefined, // From component state
              tasksDir // From pane.content
            };

            console.log("[LauncherPane] Spawning batch run with params:", params);
            const result = await window.electronAPI.sweBench.spawnBatchRun(params);

            if (result && result.runId) {
              console.log("[LauncherPane] Batch run spawned. Run ID:", result.runId);
              openEvaluationMonitorPane({
                runId: result.runId,
                outputDir: path.join("swebench-results", result.runId), // Construct full path for clarity or let monitor do it
                totalTasks: effectiveInstanceIds?.length || (params.maxTasks || (await window.electronAPI.sweBench.listTasks(tasksDir)).length) // Calculate total tasks accurately
              });
              removePane(pane.id); // Close self
            } else {
              throw new Error("Failed to spawn batch run or receive runId.");
            }
          } catch (err) {
            console.error("Error launching evaluation:", err);
            setError(err instanceof Error ? err.message : "Failed to launch evaluation");
          } finally {
            setIsLoading(false);
          }
        };
        ```
        *   **Crucial:** Ensure `tasksDir` is passed correctly to `spawnBatchRun` if your main process handler or batch script relies on it.
        *   Ensure `totalTasks` for `openEvaluationMonitorPane` is calculated accurately. If `instanceIds` are provided, use their length. If not, and `maxTasks` is provided, use `maxTasks`. If neither, it implies all tasks in `tasksDir`, so you might need an IPC call to `listTasks` to get the count. For MVP, if `instanceIds` is empty, `totalTasks` might be approximated by `maxTasks` or a large default if all are run.

2.  **File:** `src/stores/panes/actions/openEvaluationMonitorPane.ts`
    *   **Verify Action Implementation:**
        *   Ensure it correctly calls `addPaneActionLogic`.
        *   The `type` should be `SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE`.
        *   The `content` must include `runId`, `outputDir`, and `totalTasks`.
        ```typescript
        // src/stores/panes/actions/openEvaluationMonitorPane.ts
        // ... imports ...
        export const openEvaluationMonitorPaneAction = (
          set: SetPaneStore,
          get: GetPaneStore,
          content: { runId: string, outputDir: string, totalTasks: number } // Ensure totalTasks is passed
        ) => {
          const paneId = `swe_bench_monitor_${content.runId}`; // Dynamic ID based on runId
          const title = `${SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE_BASE}: ${content.runId.substring(0, 15)}...`;

          const newPaneInput: PaneInput = {
            id: paneId,
            type: SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE,
            title: title,
            content: content, // Pass runId, outputDir, totalTasks
            // ... other properties like dismissable, width, height ...
          };
          set((state) => addPaneActionLogic(state, newPaneInput, true));
        };
        ```

**Phase 4: Verify `PaneManager` Mappings**

1.  **File:** `src/panes/PaneManager.tsx`
    *   **Verify Pane Type Mappings:**
        *   Ensure that the `PaneManager` correctly maps all four SWE-Bench pane types to their respective components:
            ```typescript
            {pane.type === SWE_BENCH_TASK_BROWSER_PANE_TYPE && (
              <TaskBrowserPane pane={pane} /> // Pass full pane object
            )}
            {pane.type === SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE && (
              <EvaluationLauncherPane pane={pane} />
            )}
            {pane.type === SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE && (
              <EvaluationMonitorPane pane={pane} />
            )}
            {pane.type === SWE_BENCH_RESULTS_VIEWER_PANE_TYPE && (
              <ResultsViewerPane pane={pane} />
            )}
            ```
        *   Note: Ensure you're importing the actual pane `type` constants from `src/stores/panes/constants.ts` for these checks, not just string literals.

**Phase 5: IPC Handler for `spawnBatchRun` (Main Process)**

1.  **File:** `src/main.ts` (or where `SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL` handler is defined)
    *   **Verify `spawnBatchRun` Handler:**
        *   This handler spawns `scripts/run_swe_bench_batch_env.ts`.
        *   Ensure it correctly constructs the arguments for the script based on `params` received from `EvaluationLauncherPane`. Especially `--instance-ids`, `--patch-source`, `--output-dir` (using `runId`), `--max-tasks`, and `--tasks-dir`.
        *   The `runId` returned should be the name of the subdirectory created under `swebench-results/`.
        *   Ensure `stdout`, `stderr`, and `exit` events from the child process are correctly piped to the renderer using `SWE_BENCH_BATCH_RUN_STDOUT_CHANNEL`, etc., and include the `runId`.

---

By systematically checking and correcting these points, the UI flow for launching and monitoring SWE-Bench evaluations should be restored. The agent should prioritize the flow from `TaskBrowserPane` to `EvaluationLauncherPane` and then to `EvaluationMonitorPane`.

```

1.  **Feature Flag Configuration Update:**
    *   **File**: `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action**: Ensure `SWE_BENCH_MVP_UI` is correctly added to the `FEATURE_FLAGS_ENABLED_LIST` string in the `DefaultDevConfigLayer`. If it's missing, add it. The string is comma-separated.
        ```typescript
        // Example of what it might look like
        yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST",
          "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,SWE_BENCH_MVP_UI" // Ensure SWE_BENCH_MVP_UI is present
        ));
        ```

2.  **Task Browser Pane - "Launch Evaluation" Button Implementation:**
    *   **File**: `src/panes/swebench/TaskBrowserPane.tsx`
    *   **Action**:
        *   Verify that `selectedTaskIds` (a `Set<string>`) is correctly managed for task selection.
        *   Ensure the "Launch Evaluation" button is rendered and its `disabled` prop is correctly bound to `selectedTaskIds.size === 0`.
        *   The `onClick` handler for this button (`handleLaunchEvaluation`) must call `openEvaluationLauncherPane` from the `usePaneStore`.
        *   **Crucially, ensure `tasksDir` (the currently selected task directory in the browser) is passed in the `content` object to `openEvaluationLauncherPane`.**

        ```typescript
        // Inside TaskBrowserPane component
        import { usePaneStore } from "@/stores/pane";
        import { useShallow } from "zustand/react/shallow";
        // ... other imports ...

        // const [tasksDir, setTasksDir] = useState<string>("patches"); // Or your default
        // const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

        const { openEvaluationLauncherPane } = usePaneStore(
          useShallow(state => ({ openEvaluationLauncherPane: state.openEvaluationLauncherPane }))
        );

        const handleLaunchEvaluation = () => {
          if (selectedTaskIds.size === 0) {
            // Optionally, show a toast or alert to the user
            console.warn("[TaskBrowserPane] No tasks selected for evaluation.");
            return;
          }

          console.log(`[TaskBrowserPane] Launching evaluation for tasks: ${Array.from(selectedTaskIds).join(", ")} from directory: ${tasksDir}`);

          openEvaluationLauncherPane({
            taskInstanceIds: Array.from(selectedTaskIds),
            tasksDir: tasksDir // Ensure tasksDir is correctly passed
          });
        };

        // In JSX for the button:
        // <Button onClick={handleLaunchEvaluation} disabled={selectedTaskIds.size === 0}>
        //   Launch Evaluation ({selectedTaskIds.size})
        // </Button>
        ```

3.  **Evaluation Launcher Pane - "Run Evaluation" Button and IPC Call:**
    *   **File**: `src/panes/swebench/EvaluationLauncherPane.tsx`
    *   **Action**:
        *   Verify that the component correctly receives `taskInstanceIds` and `tasksDir` from `pane.content`.
        *   Ensure the "Run Evaluation" button exists and its `onClick` handler (`handleRunEvaluation`) is correctly implemented.
        *   This handler must:
            *   Gather parameters (`instanceIds`, `patchSource`, `outputDirName`, `maxTasks`, `tasksDir`).
            *   Call `window.electronAPI.sweBench.spawnBatchRun(params)`.
            *   On successful promise resolution from `spawnBatchRun` (which should return `{ runId: string }`), call `openEvaluationMonitorPane` with the `runId`, the constructed `outputDir`, and `totalTasks`.
            *   Call `removePane(pane.id)` to close the launcher pane.

        ```typescript
        // Inside EvaluationLauncherPane component
        import { usePaneStore } from "@/stores/pane";
        import { useShallow } from "zustand/react/shallow";
        import path from "path-browserify"; // For path.join in renderer if needed, or construct in main
        // ... other imports ...

        // const content = pane.content as { taskInstanceIds?: string[], tasksDir?: string };
        // const initialTaskIds = content?.taskInstanceIds || [];
        // const tasksDir = content?.tasksDir || "patches"; // Default or from content

        const { openEvaluationMonitorPane, removePane } = usePaneStore(
          useShallow(state => ({
            openEvaluationMonitorPane: state.openEvaluationMonitorPane,
            removePane: state.removePane
          }))
        );
        // ... states for patchSource, outputDirSuffix, maxTasks, isLoading, error ...

        const handleRunEvaluation = async () => {
          setIsLoading(true);
          setError(null);

          try {
            if (!window.electronAPI?.sweBench?.spawnBatchRun) {
              throw new Error("SWE-Bench API (spawnBatchRun) not available.");
            }

            const effectiveInstanceIds = initialTaskIds.length > 0 ? initialTaskIds : undefined;
            const maxTasksInt = maxTasks ? parseInt(maxTasks, 10) : undefined;

            const paramsToSpawn = {
              instanceIds: effectiveInstanceIds,
              patchSource: patchSource, // from component state
              outputDirName: outputDirSuffix || undefined, // from component state
              maxTasks: maxTasksInt,
              tasksDir: tasksDir // from pane.content
            };

            console.log("[LauncherPane] Calling spawnBatchRun with params:", paramsToSpawn);
            const spawnResult = await window.electronAPI.sweBench.spawnBatchRun(paramsToSpawn);

            if (spawnResult && spawnResult.runId) {
              let totalTasksForMonitor = 0;
              if (effectiveInstanceIds) {
                totalTasksForMonitor = effectiveInstanceIds.length;
              } else if (maxTasksInt) {
                totalTasksForMonitor = maxTasksInt;
              } else {
                // Fallback: try to get count. If API not available, use a placeholder
                try {
                  totalTasksForMonitor = (await window.electronAPI.sweBench.listTasks(tasksDir)).length;
                } catch {
                  totalTasksForMonitor = 100; // Placeholder if listTasks fails or isn't precise
                }
              }

              openEvaluationMonitorPane({
                runId: spawnResult.runId,
                outputDir: path.join("swebench-results", spawnResult.runId), // Construct consistent path
                totalTasks: totalTasksForMonitor
              });
              removePane(pane.id);
            } else {
              throw new Error("Failed to spawn batch run or did not receive a valid runId.");
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error("[LauncherPane] Error launching evaluation:", errorMessage, err);
            setError(errorMessage);
          } finally {
            setIsLoading(false);
          }
        };

        // In JSX:
        // <Button onClick={handleRunEvaluation} disabled={isLoading}>Run Evaluation</Button>
        ```

4.  **Verify Pane Store Actions:**
    *   **Files**: `src/stores/panes/actions/openEvaluationLauncherPane.ts` and `openEvaluationMonitorPane.ts`.
    *   **Action**: Double-check that these actions correctly use `addPaneActionLogic` and pass the `type` (`SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE`, `SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE`) and `content` payload without modification. The `id` for these should be dynamic (e.g., include a timestamp or the `runId` for the monitor) to allow multiple instances if needed (though monitor is usually per-run).

5.  **Verify `PaneManager.tsx` Mappings:**
    *   **File**: `src/panes/PaneManager.tsx`
    *   **Action**: Ensure the `case` statements or conditional rendering logic correctly maps the `SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE` and `SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE` constants to their respective React components (`EvaluationLauncherPane`, `EvaluationMonitorPane`) and passes the `pane` object as props.

    ```typescript
    // Example snippet in PaneManager.tsx
    // Ensure these use the imported constants from ../stores/panes/constants
    // import { SWE_BENCH_TASK_BROWSER_PANE_TYPE, ... } from "@/stores/panes/constants";
    // ...
    {pane.type === SWE_BENCH_TASK_BROWSER_PANE_TYPE && (
      <TaskBrowserPane pane={pane} />
    )}
    {pane.type === SWE_BENCH_EVALUATION_LAUNCHER_PANE_TYPE && (
      <EvaluationLauncherPane pane={pane} />
    )}
    {pane.type === SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE && (
      <EvaluationMonitorPane pane={pane} />
    )}
    {pane.type === SWE_BENCH_RESULTS_VIEWER_PANE_TYPE && (
      <ResultsViewerPane pane={pane} />
    )}
    ```

6.  **IPC Handler in `main.ts` for `SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL`:**
    *   **File:** `src/main.ts`
    *   **Action:** Review the handler for `SWE_BENCH_SPAWN_BATCH_RUN_CHANNEL`.
        *   It should correctly construct the command-line arguments for `scripts/run_swe_bench_batch_env.ts` based on the `params` received from the renderer (especially `instanceIds`, `patchSource`, `tasksDir`, `maxTasks`).
        *   Ensure the `outputDir` argument passed to the script is just the `runId` (the unique subdirectory name), and the script itself prepends `./swebench-results/`.
        *   Confirm that `stdout`, `stderr`, and `exit` events from the spawned child process correctly send messages back to the renderer using `event.sender.send(IPC_CHANNEL, { runId, output: data })`.

After these verifications and potential corrections, the UI flow for launching SWE-Bench evaluations should be functional. The agent should focus on the connections between panes: `TaskBrowserPane` -> `EvaluationLauncherPane` -> `EvaluationMonitorPane`.Okay, the user can open the "SWE-Bench Task Browser" pane via the hotbar, but the subsequent UI flow for launching evaluations and viewing other SWE-Bench related panes is broken. This points to issues in the `TaskBrowserPane`'s action buttons, the pane store actions they call, or the components those actions are supposed to render.
