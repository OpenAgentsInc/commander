import { describe, it, expect, vi } from 'vitest';
import { openAgentChatPaneAction } from '@/stores/panes/actions/openAgentChatPane';
import { AGENT_CHAT_PANE_ID, AGENT_CHAT_PANE_TITLE, AGENT_CHAT_PANE_DEFAULT_WIDTH, AGENT_CHAT_PANE_DEFAULT_HEIGHT } from '@/stores/panes/constants';
import * as addPaneModule from '@/stores/panes/actions/addPane';

describe('openAgentChatPaneAction', () => {
  it('should call addPaneActionLogic with correct parameters', () => {
    // Mock dependencies
    const mockAddPaneActionLogic = vi.spyOn(addPaneModule, 'addPaneActionLogic').mockImplementation(() => {
      return { panes: [], activePaneId: null }; // Return mock state
    });
    
    const mockSet = vi.fn();
    const mockState = { panes: [], activePaneId: null };
    
    // Execute the action
    openAgentChatPaneAction(mockSet);
    
    // Extract the state transformation function
    const stateFn = mockSet.mock.calls[0][0];
    stateFn(mockState);
    
    // Verify addPaneActionLogic was called with correct parameters
    expect(mockAddPaneActionLogic).toHaveBeenCalledWith(
      mockState,
      {
        id: AGENT_CHAT_PANE_ID,
        type: 'agent_chat',
        title: AGENT_CHAT_PANE_TITLE,
        dismissable: true,
        width: AGENT_CHAT_PANE_DEFAULT_WIDTH,
        height: AGENT_CHAT_PANE_DEFAULT_HEIGHT,
      },
      true // tile positioning
    );
  });
});