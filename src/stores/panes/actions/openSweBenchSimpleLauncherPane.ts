import { type SetPaneStore, type GetPaneStore } from "../types";
import { togglePaneAction } from "./togglePane";
import {
  SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
  SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE,
  SWE_BENCH_SIMPLE_LAUNCHER_PANE_TITLE,
  DEFAULT_PANE_WIDTH,
  DEFAULT_PANE_HEIGHT,
  PANE_MARGIN
} from "../constants";

export const openSweBenchSimpleLauncherPaneAction = (set: SetPaneStore, get: GetPaneStore) => {
  togglePaneAction(set, get, {
    paneId: SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
    createPaneInput: (screenWidth, screenHeight, storedPosition) => ({
      id: SWE_BENCH_SIMPLE_LAUNCHER_PANE_ID_CONST,
      type: SWE_BENCH_SIMPLE_LAUNCHER_PANE_TYPE,
      title: SWE_BENCH_SIMPLE_LAUNCHER_PANE_TITLE,
      x: storedPosition?.x ?? Math.max(PANE_MARGIN, (screenWidth - (DEFAULT_PANE_WIDTH * 1.2)) / 2),
      y: storedPosition?.y ?? Math.max(PANE_MARGIN, (screenHeight - (DEFAULT_PANE_HEIGHT * 1.2)) / 2),
      width: storedPosition?.width ?? DEFAULT_PANE_WIDTH * 1.2,
      height: storedPosition?.height ?? DEFAULT_PANE_HEIGHT * 1.2,
      dismissable: true,
      content: {},
    }),
  });
};