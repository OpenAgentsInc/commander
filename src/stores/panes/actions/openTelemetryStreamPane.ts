import type { SetPaneStore, GetPaneStore } from "@/stores/panes/types";
import { addPaneAction } from "./addPane";
import { 
  TELEMETRY_STREAM_PANE_TYPE,
  TELEMETRY_STREAM_PANE_ID_CONST, 
  TELEMETRY_STREAM_PANE_TITLE,
  TELEMETRY_STREAM_PANE_DEFAULT_WIDTH,
  TELEMETRY_STREAM_PANE_DEFAULT_HEIGHT
} from "@/stores/panes/constants";

export const openTelemetryStreamPaneAction = (
  set: SetPaneStore,
  get: GetPaneStore,
  runId?: string
): void => {
  // Check if telemetry stream pane already exists
  const existingPane = get().panes.find(p => p.type === TELEMETRY_STREAM_PANE_TYPE);
  
  if (existingPane) {
    // If it exists, just bring it to front and update runId if provided
    const { bringPaneToFront, updatePaneContent } = get();
    bringPaneToFront(existingPane.id);
    
    if (runId) {
      updatePaneContent(existingPane.id, { runId });
    }
    return;
  }

  // Create new telemetry stream pane
  const newPane = {
    id: runId ? `${TELEMETRY_STREAM_PANE_TYPE}_${runId}` : TELEMETRY_STREAM_PANE_ID_CONST,
    type: TELEMETRY_STREAM_PANE_TYPE,
    title: runId ? `${TELEMETRY_STREAM_PANE_TITLE} - ${runId}` : TELEMETRY_STREAM_PANE_TITLE,
    width: TELEMETRY_STREAM_PANE_DEFAULT_WIDTH,
    height: TELEMETRY_STREAM_PANE_DEFAULT_HEIGHT,
    dismissable: true,
    content: runId ? { runId } : undefined
  };

  addPaneAction(set, newPane, true);
};

export const toggleTelemetryStreamPaneAction = (
  set: SetPaneStore,
  get: GetPaneStore
): void => {
  const existingPane = get().panes.find(p => p.type === TELEMETRY_STREAM_PANE_TYPE);
  
  if (existingPane) {
    // If it exists, close it
    get().removePane(existingPane.id);
  } else {
    // If it doesn't exist, open it
    openTelemetryStreamPaneAction(set, get);
  }
};