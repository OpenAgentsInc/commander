import { addPaneActionLogic } from "./addPane";
import type { SetPaneStore } from "../types";
import {
  PREVIOUS_CHATS_PANE_ID,
  PREVIOUS_CHATS_PANE_TITLE,
  PREVIOUS_CHATS_PANE_DEFAULT_WIDTH,
  PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT,
} from "../constants";

export const openPreviousChatsPaneAction = (set: SetPaneStore) => {
  set((state) => {
    const newPaneInput = {
      id: PREVIOUS_CHATS_PANE_ID,
      type: "previous_chats_list",
      title: PREVIOUS_CHATS_PANE_TITLE,
      dismissable: true,
      width: PREVIOUS_CHATS_PANE_DEFAULT_WIDTH,
      height: PREVIOUS_CHATS_PANE_DEFAULT_HEIGHT,
    };
    return addPaneActionLogic(state, newPaneInput, true /* shouldTile */);
  });
};