import { SetPaneStore, PaneStoreType } from "../types";
import { PREVIOUS_CHATS_PANE_ID } from "../constants";
import { removePaneAction } from "./removePane";
import { openPreviousChatsPaneAction } from "./openPreviousChatsPane";

export function togglePreviousChatsPaneAction(
  set: SetPaneStore,
  get: () => PaneStoreType,
) {
  const state = get();
  const pane = state.panes.find((p) => p.id === PREVIOUS_CHATS_PANE_ID);

  // If the pane exists and is active, close it
  if (pane && state.activePaneId === PREVIOUS_CHATS_PANE_ID) {
    removePaneAction(set, PREVIOUS_CHATS_PANE_ID);
  } else {
    // Otherwise, open it (or bring it to front if it exists but not active)
    openPreviousChatsPaneAction(set);
  }
}