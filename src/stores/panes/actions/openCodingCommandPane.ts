import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  CODING_COMMAND_PANE_ID,
  CODING_COMMAND_PANE_TITLE,
  CODING_COMMAND_PANE_DEFAULT_WIDTH,
  CODING_COMMAND_PANE_DEFAULT_HEIGHT,
} from "../constants";

export function openCodingCommandPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: CODING_COMMAND_PANE_ID,
      type: "coding_command",
      title: CODING_COMMAND_PANE_TITLE,
      dismissable: true,
      width: CODING_COMMAND_PANE_DEFAULT_WIDTH,
      height: CODING_COMMAND_PANE_DEFAULT_HEIGHT,
    };
    // addPaneActionLogic handles focusing if exists, or creating if new
    return addPaneActionLogic(state, newPaneInput, true /* tile positioning */);
  });
}