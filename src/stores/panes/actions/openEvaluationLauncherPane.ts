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
  content: { taskInstanceIds: string[], tasksDir: string }
) => {
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