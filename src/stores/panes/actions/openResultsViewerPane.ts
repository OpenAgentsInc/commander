import { type SetPaneStore, type GetPaneStore } from "../types";
import { togglePaneAction } from "./togglePane";
import { 
  SWE_BENCH_RESULTS_VIEWER_PANE_ID_CONST, 
  SWE_BENCH_RESULTS_VIEWER_PANE_TYPE, 
  SWE_BENCH_RESULTS_VIEWER_PANE_TITLE, 
  DEFAULT_PANE_WIDTH, 
  DEFAULT_PANE_HEIGHT 
} from "../constants";

export const openResultsViewerPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
  togglePaneAction(set, get, {
    paneId: SWE_BENCH_RESULTS_VIEWER_PANE_ID_CONST,
    createPaneInput: (screenWidth, screenHeight, storedPosition) => ({
      id: SWE_BENCH_RESULTS_VIEWER_PANE_ID_CONST,
      type: SWE_BENCH_RESULTS_VIEWER_PANE_TYPE,
      title: SWE_BENCH_RESULTS_VIEWER_PANE_TITLE,
      x: storedPosition?.x ?? Math.max(20, (screenWidth - DEFAULT_PANE_WIDTH * 2) / 2),
      y: storedPosition?.y ?? Math.max(20, (screenHeight - DEFAULT_PANE_HEIGHT * 2) / 2),
      width: storedPosition?.width ?? DEFAULT_PANE_WIDTH * 2,
      height: storedPosition?.height ?? DEFAULT_PANE_HEIGHT * 2,
      dismissable: true,
      content: {},
    }),
  });
};