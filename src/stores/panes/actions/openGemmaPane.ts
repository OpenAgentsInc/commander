import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  GEMMA_PANE_ID,
  GEMMA_PANE_TITLE,
  GEMMA_PANE_DEFAULT_WIDTH,
  GEMMA_PANE_DEFAULT_HEIGHT,
} from "../constants";

export function openGemmaPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: GEMMA_PANE_ID,
      type: "gemma",
      title: GEMMA_PANE_TITLE,
      dismissable: true,
      width: GEMMA_PANE_DEFAULT_WIDTH,
      height: GEMMA_PANE_DEFAULT_HEIGHT,
    };
    // addPaneActionLogic handles focusing if exists, or creating if new
    return addPaneActionLogic(state, newPaneInput, true /* tile positioning */);
  });
}