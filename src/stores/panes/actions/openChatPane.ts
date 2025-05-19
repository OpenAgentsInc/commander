import { Pane, PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { CHATS_PANE_ID, CHANGELOG_PANE_ID, PANE_OFFSET, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from '../constants';
import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';

function ensureChatsPane(panes: Pane[]): Pane[] {
  let currentPanes = [...panes];
  let chatsPane = currentPanes.find(p => p.id === CHATS_PANE_ID);

  if (!chatsPane) {
    chatsPane = {
      id: CHATS_PANE_ID,
      type: 'chats',
      title: 'Chats',
      x: 20,
      y: 20,
      width: 300,
      height: 400,
      isActive: true, // OpenChatPane makes chats active by default
      dismissable: false,
    };
    currentPanes.unshift(chatsPane);
  } else {
    currentPanes = currentPanes.filter(p => p.id !== CHATS_PANE_ID);
    currentPanes.unshift({...chatsPane, isActive: true});
  }
  return currentPanes;
}


export function openChatPaneAction(
  set: SetPaneStore,
  newChatPaneInput: PaneInput,
  isCommandKeyHeld: boolean = false
) {
  set((state: PaneStoreType) => {
    if (!newChatPaneInput.id) {
      console.error('Chat pane ID is required.');
      return state;
    }

    let panes = ensureChatsPane([...state.panes]);

    panes = panes.map(p => ({
      ...p,
      isActive: (p.id === CHATS_PANE_ID || p.type === 'changelog') ? p.isActive : false
    }));

    const existingChatPaneIndex = panes.findIndex(p => p.id === newChatPaneInput.id && p.type === 'chat');

    if (existingChatPaneIndex !== -1) {
      const existingPane = panes[existingChatPaneIndex];
      panes.splice(existingChatPaneIndex, 1);
      panes.push({ ...existingPane, isActive: true });
      return {
        panes,
        activePaneId: existingPane.id,
        lastPanePosition: { x: existingPane.x, y: existingPane.y, width: existingPane.width, height: existingPane.height }
      };
    }

    const chatPanes = panes.filter(p => p.type === 'chat');
    let positionProps;

    if (chatPanes.length === 0) {
      positionProps = {
        x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2 - DEFAULT_PANE_WIDTH / 2 + 100,
        y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.05,
        width: DEFAULT_PANE_WIDTH * 1.5,
        height: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.8,
      };
    } else if (chatPanes.length === 1 && !isCommandKeyHeld) {
      const existing = chatPanes[0];
      positionProps = { x: existing.x, y: existing.y, width: existing.width, height: existing.height };
      panes = panes.filter(p => p.id !== existing.id);
    } else {
      const lastPane = chatPanes[chatPanes.length - 1] || panes.find(p => p.id === CHATS_PANE_ID);
      positionProps = {
        x: (lastPane?.x || 0) + PANE_OFFSET,
        y: (lastPane?.y || 0) + PANE_OFFSET,
        width: DEFAULT_PANE_WIDTH,
        height: DEFAULT_PANE_HEIGHT,
      };
    }

    const finalPanePosition = ensurePaneIsVisible({
        ...positionProps,
        id: newChatPaneInput.id,
        type: 'chat', title: '', isActive: true
    });

    const newPane: Pane = {
      id: newChatPaneInput.id,
      type: 'chat',
      title: newChatPaneInput.title || `Chat ${newChatPaneInput.id}`,
      x: finalPanePosition.x,
      y: finalPanePosition.y,
      width: finalPanePosition.width,
      height: finalPanePosition.height,
      isActive: true,
      dismissable: true,
    };

    panes.push(newPane);

    const chatsPane = panes.find(p => p.id === CHATS_PANE_ID);
    if (chatsPane) {
        panes = panes.filter(p => p.id !== CHATS_PANE_ID);
        panes.unshift({...chatsPane, isActive: true});
    }

    return {
      panes,
      activePaneId: newPane.id,
      lastPanePosition: { x: newPane.x, y: newPane.y, width: newPane.width, height: newPane.height }
    };
  });
}