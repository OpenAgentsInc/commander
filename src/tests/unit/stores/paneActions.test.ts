import { describe, it, expect, beforeEach } from 'vitest';
import { usePaneStore } from '@/stores/pane';
import { NIP90_DVM_TEST_PANE_ID, NIP90_CONSUMER_CHAT_PANE_ID } from '@/stores/panes/constants';

describe('Pane Store NIP-90 Actions', () => {
  beforeEach(() => {
    usePaneStore.getState().resetHUDState(); // Ensure clean state
  });

  it('openNip90DvmTestPaneAction should add a NIP-90 DVM test pane', () => {
    usePaneStore.getState().openNip90DvmTestPane();
    const { panes, activePaneId } = usePaneStore.getState();
    const newPane = panes.find(p => p.id === NIP90_DVM_TEST_PANE_ID);
    expect(newPane).toBeDefined();
    expect(newPane?.type).toBe('nip90_dvm_test');
    expect(activePaneId).toBe(NIP90_DVM_TEST_PANE_ID);
  });

  it('openNip90ConsumerChatPaneAction should add a NIP-90 consumer chat pane', () => {
    usePaneStore.getState().openNip90ConsumerChatPane();
    const { panes, activePaneId } = usePaneStore.getState();
    const newPane = panes.find(p => p.id === NIP90_CONSUMER_CHAT_PANE_ID);
    expect(newPane).toBeDefined();
    expect(newPane?.type).toBe('nip90_consumer_chat');
    expect(activePaneId).toBe(NIP90_CONSUMER_CHAT_PANE_ID);
  });

  it('opening an existing NIP-90 pane should bring it to front and activate it', () => {
    usePaneStore.getState().openNip90DvmTestPane(); // Open once
    const initialPanes = [...usePaneStore.getState().panes];
    usePaneStore.getState().openNip90DvmTestPane(); // Open again
    const { panes, activePaneId } = usePaneStore.getState();
    expect(panes.length).toBe(initialPanes.length); // No new pane added
    expect(activePaneId).toBe(NIP90_DVM_TEST_PANE_ID);
    expect(panes[panes.length - 1].id).toBe(NIP90_DVM_TEST_PANE_ID); // Active pane is last
  });
});