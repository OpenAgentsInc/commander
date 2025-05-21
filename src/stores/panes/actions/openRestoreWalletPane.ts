import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  RESTORE_WALLET_PANE_ID,
  RESTORE_WALLET_PANE_TITLE,
} from "../constants";

export function openRestoreWalletPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: RESTORE_WALLET_PANE_ID,
      type: "restore_wallet_content",
      title: RESTORE_WALLET_PANE_TITLE,
      dismissable: true, // User might want to go back to setup choice
      width: 500,
      height: 400,
    };
    return addPaneActionLogic(state, newPaneInput, true);
  });
}
