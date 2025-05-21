import { type PaneInput } from '@/types/pane';
import { type PaneStoreType, type SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';
import { AGENT_CHAT_PANE_ID, AGENT_CHAT_PANE_TITLE, AGENT_CHAT_PANE_DEFAULT_WIDTH, AGENT_CHAT_PANE_DEFAULT_HEIGHT } from '../constants';

export function openAgentChatPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const newPaneInput: PaneInput = {
      id: AGENT_CHAT_PANE_ID,
      type: 'agent_chat',
      title: AGENT_CHAT_PANE_TITLE,
      dismissable: true,
      width: AGENT_CHAT_PANE_DEFAULT_WIDTH,
      height: AGENT_CHAT_PANE_DEFAULT_HEIGHT,
    };
    // addPaneActionLogic handles focusing if exists, or creating if new
    return addPaneActionLogic(state, newPaneInput, true /* tile positioning */);
  });
}