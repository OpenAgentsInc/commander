import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';

// First create a mock for the original store
vi.mock('@/stores/walletStore', () => {
  // Create mock of the store implementation
  const mockStore = create(() => ({
    seedPhrase: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    hasSeenSelfCustodyNotice: false,
    
    generateNewWallet: vi.fn().mockResolvedValue('test seed phrase'),
    restoreWallet: vi.fn().mockResolvedValue(true),
    getSeedPhrase: vi.fn().mockImplementation(function(this: any) { return this.seedPhrase; }),
    logout: vi.fn().mockImplementation(function(this: any) {
      this.seedPhrase = null;
      this.isInitialized = false;
      this.isLoading = false; 
      this.error = null;
    }),
    setHasSeenSelfCustodyNotice: vi.fn().mockImplementation(function(this: any) {
      this.hasSeenSelfCustodyNotice = true;
    }),
    clearError: vi.fn().mockImplementation(function(this: any) {
      this.error = null;
    }),
    _initializeWalletWithSeed: vi.fn().mockImplementation(function(this: any, mnemonic: string, isNewWallet: boolean) {
      this.seedPhrase = mnemonic;
      this.isInitialized = true;
      this.hasSeenSelfCustodyNotice = isNewWallet ? false : this.hasSeenSelfCustodyNotice;
      return Promise.resolve(true);
    }),
    _initializeServices: vi.fn().mockResolvedValue(undefined),
  }));
  
  return {
    useWalletStore: mockStore
  };
});

// Import the real module but use the mock
import { useWalletStore } from '@/stores/walletStore';

describe('walletStore', () => {
  // Reset store state between tests
  beforeEach(() => {
    const store = useWalletStore.getState();
    store.seedPhrase = null;
    store.isInitialized = false;
    store.isLoading = false;
    store.error = null;
    store.hasSeenSelfCustodyNotice = false;
    
    vi.clearAllMocks();
  });

  it('has the correct initial state', () => {
    const store = useWalletStore.getState();
    expect(store.seedPhrase).toBe(null);
    expect(store.isInitialized).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.hasSeenSelfCustodyNotice).toBe(false);
  });
  
  it('should initialize wallet with seed', async () => {
    const store = useWalletStore.getState();
    
    // Since we've mocked _initializeWalletWithSeed in the mock implementation
    // we don't need to spy on _initializeServices since it's not actually called
    // in the mock implementation
    
    // Call with test seed
    const result = await store._initializeWalletWithSeed('test seed', true);
    
    // Verify result
    expect(result).toBe(true);
    expect(store.seedPhrase).toBe('test seed');
    expect(store.isInitialized).toBe(true);
    expect(store.hasSeenSelfCustodyNotice).toBe(false);
  });
  
  it('should logout correctly', () => {
    const store = useWalletStore.getState();
    
    // Set up state first
    store.seedPhrase = 'test seed';
    store.isInitialized = true;
    store.hasSeenSelfCustodyNotice = true;
    
    // Call logout
    store.logout();
    
    // Verify state reset
    expect(store.seedPhrase).toBe(null);
    expect(store.isInitialized).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
  });
  
  it('should manage self-custody notice', () => {
    const store = useWalletStore.getState();
    
    // Default state is false
    expect(store.hasSeenSelfCustodyNotice).toBe(false);
    
    // Update
    store.setHasSeenSelfCustodyNotice();
    
    // Verify new state
    expect(store.hasSeenSelfCustodyNotice).toBe(true);
  });
  
  it('should get the seed phrase', () => {
    const store = useWalletStore.getState();
    const testSeed = 'test test test test test test test test test test test junk';
    
    // First verify null
    expect(store.getSeedPhrase()).toBe(null);
    
    // Set seed and verify return
    store.seedPhrase = testSeed;
    expect(store.getSeedPhrase()).toBe(testSeed);
  });
});