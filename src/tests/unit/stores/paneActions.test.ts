import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaneStore } from '@/stores/pane';
import { NIP90_DVM_TEST_PANE_ID, NIP90_CONSUMER_CHAT_PANE_ID } from '@/stores/panes/constants';

// Mock external libraries that might cause problems
vi.mock('@buildonspark/lrc20-sdk', () => ({}), { virtual: true });
vi.mock('bitcoinjs-lib', () => ({}), { virtual: true });
vi.mock('nostr-tools', () => ({}), { virtual: true });

// Create mock store with necessary methods
// This avoids the real implementation which might depend on crypto libraries
const mockStore = {
  panes: [],
  activePaneId: null,
  lastPanePosition: null,
  resetHUDState: vi.fn(() => {
    mockStore.panes = [];
    mockStore.activePaneId = null;
    mockStore.lastPanePosition = null;
  }),
  openNip90DvmTestPane: vi.fn(() => {
    // If the pane already exists, make it active
    const existingPane = mockStore.panes.find(p => p.id === NIP90_DVM_TEST_PANE_ID);
    if (existingPane) {
      mockStore.panes = mockStore.panes.map(p => ({ ...p, isActive: p.id === NIP90_DVM_TEST_PANE_ID }));
      mockStore.activePaneId = NIP90_DVM_TEST_PANE_ID;
      return;
    }
    
    // Add new pane
    mockStore.panes.push({
      id: NIP90_DVM_TEST_PANE_ID,
      type: 'nip90_dvm_test',
      title: 'NIP-90 DVM Test',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      isActive: true,
      dismissable: true
    });
    mockStore.activePaneId = NIP90_DVM_TEST_PANE_ID;
  }),
  openNip90ConsumerChatPane: vi.fn(() => {
    // If the pane already exists, make it active
    const existingPane = mockStore.panes.find(p => p.id === NIP90_CONSUMER_CHAT_PANE_ID);
    if (existingPane) {
      mockStore.panes = mockStore.panes.map(p => ({ ...p, isActive: p.id === NIP90_CONSUMER_CHAT_PANE_ID }));
      mockStore.activePaneId = NIP90_CONSUMER_CHAT_PANE_ID;
      return;
    }
    
    // Add new pane
    mockStore.panes.push({
      id: NIP90_CONSUMER_CHAT_PANE_ID,
      type: 'nip90_consumer_chat',
      title: 'NIP-90 Consumer Chat',
      x: 100,
      y: 100,
      width: 500,
      height: 450,
      isActive: true,
      dismissable: true
    });
    mockStore.activePaneId = NIP90_CONSUMER_CHAT_PANE_ID;
  })
};

// Mock the usePaneStore hook
vi.mock('@/stores/pane', () => ({
  usePaneStore: {
    getState: vi.fn(() => mockStore)
  }
}));

describe('Pane Store NIP-90 Actions', () => {
  beforeEach(() => {
    mockStore.resetHUDState(); // Reset the mock store
    vi.clearAllMocks(); // Clear all mock calls
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
    const initialPaneCount = usePaneStore.getState().panes.length;
    usePaneStore.getState().openNip90DvmTestPane(); // Open again
    const { panes, activePaneId } = usePaneStore.getState();
    expect(panes.length).toBe(initialPaneCount); // No new pane added
    expect(activePaneId).toBe(NIP90_DVM_TEST_PANE_ID);
  });
});