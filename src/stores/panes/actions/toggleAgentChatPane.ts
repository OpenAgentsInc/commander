import { SetPaneStore, PaneStoreType } from '../types';
import { AGENT_CHAT_PANE_ID } from '../constants';
import { removePaneAction } from './removePane';
import { openAgentChatPaneAction } from './openAgentChatPane';

export function toggleAgentChatPaneAction(set: SetPaneStore, get: () => PaneStoreType) {
  const state = get();
  const pane = state.panes.find(p => p.id === AGENT_CHAT_PANE_ID);
  
  // If the pane exists and is active, close it
  if (pane && state.activePaneId === AGENT_CHAT_PANE_ID) {
    removePaneAction(set, AGENT_CHAT_PANE_ID);
  } else {
    // Otherwise, open it (or bring it to front if it exists but not active)
    openAgentChatPaneAction(set);
  }
}