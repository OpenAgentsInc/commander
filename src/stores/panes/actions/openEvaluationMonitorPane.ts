import { type PaneInput } from "@/types/pane";
import { type SetPaneStore, type GetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import { 
  SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE, 
  SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE_BASE,
  DEFAULT_PANE_WIDTH,
  DEFAULT_PANE_HEIGHT
} from "../constants";

export const openEvaluationMonitorPaneAction = (
  set: SetPaneStore, 
  get: GetPaneStore, 
  content: { runId: string, outputDir: string, totalTasks: number }
) => {
  const paneId = `swe_bench_monitor_${content.runId}`;
  const title = `${SWE_BENCH_EVALUATION_MONITOR_PANE_TITLE_BASE}: ${content.runId}`;
  const newPaneInput: PaneInput = {
    id: paneId,
    type: SWE_BENCH_EVALUATION_MONITOR_PANE_TYPE,
    title: title,
    content: content, // Pass runId, outputDir, and totalTasks
    dismissable: true,
    width: DEFAULT_PANE_WIDTH * 1.5,
    height: DEFAULT_PANE_HEIGHT * 2,
  };
  set((state) => addPaneActionLogic(state, newPaneInput, true));
};