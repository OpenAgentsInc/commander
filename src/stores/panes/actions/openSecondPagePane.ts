import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  SECOND_PAGE_PANE_ID,
  SECOND_PAGE_PANE_TITLE,
  DEFAULT_PANE_WIDTH,
  DEFAULT_PANE_HEIGHT,
} from "../constants";

export function openSecondPagePaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: SECOND_PAGE_PANE_ID,
      type: "second_page_content",
      title: SECOND_PAGE_PANE_TITLE,
      dismissable: true,
      width: DEFAULT_PANE_WIDTH,
      height: DEFAULT_PANE_HEIGHT,
    };
    return addPaneActionLogic(state, newPaneInput, true);
  });
}
