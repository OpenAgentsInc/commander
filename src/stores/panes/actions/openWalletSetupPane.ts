import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import { WALLET_SETUP_PANE_ID, WALLET_SETUP_PANE_TITLE } from "../constants";

export function openWalletSetupPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: WALLET_SETUP_PANE_ID,
      type: "wallet_setup_content",
      title: WALLET_SETUP_PANE_TITLE,
      dismissable: true, // Users should be able to dismiss and set up wallet later
      width: 500,
      height: 400,
    };
    return addPaneActionLogic(state, newPaneInput, true);
  });
}
