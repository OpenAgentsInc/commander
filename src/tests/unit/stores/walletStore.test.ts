import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWalletStore } from '@/stores/walletStore';
import { Effect } from 'effect';
import { BIP39Service } from '@/services/bip39';

// Create mocks for the necessary dependencies
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    runPromise: vi.fn(),
    runPromiseExit: vi.fn(),
  })),
}));

// Mock successful and failed Effect results
const mockSuccessResult = {
  _tag: 'Success',
  value: 'test test test test test test test test test test test junk',
};

const mockFailureResult = {
  _tag: 'Failure',
  cause: new Error('Test error'),
};

describe('walletStore', () => {
  // Clean up the store after each test
  beforeEach(() => {
    // Create clean localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    // Replace global localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Reset the wallet store to initial state
    const store = useWalletStore.getState();
    store.logout();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('has the correct initial state', () => {
    // Get the store and check its initial state
    const store = useWalletStore.getState();
    
    expect(store.seedPhrase).toBe(null);
    expect(store.isInitialized).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.hasSeenSelfCustodyNotice).toBe(false);
  });
  
  it('should generate a new wallet successfully', async () => {
    // Mock the effect
    Effect.runPromiseExit = vi.fn().mockResolvedValue(mockSuccessResult);
    
    // Get the store and call generateNewWallet
    const store = useWalletStore.getState();
    const result = await store.generateNewWallet();
    
    // Check that the proper Effect was created
    expect(Effect.flatMap).toHaveBeenCalledWith(BIP39Service, expect.any(Function));
    
    // Check the result
    expect(result).toBe(mockSuccessResult.value);
    
    // Verify that seedPhrase and isInitialized are still null/false
    // (they should only be set after the user confirms backup)
    expect(store.seedPhrase).toBe(null);
    expect(store.isInitialized).toBe(false);
  });
  
  it('should handle generate wallet failure', async () => {
    // Mock the effect to fail
    Effect.runPromiseExit = vi.fn().mockResolvedValue(mockFailureResult);
    
    // Get the store and call generateNewWallet
    const store = useWalletStore.getState();
    const result = await store.generateNewWallet();
    
    // Check that the proper Effect was created
    expect(Effect.flatMap).toHaveBeenCalledWith(BIP39Service, expect.any(Function));
    
    // Check the error state
    expect(result).toBe(null);
    expect(store.error).toBeTruthy();
    expect(store.isLoading).toBe(false);
  });
  
  it('should initialize wallet with seed after backup confirmation', async () => {
    // Get the store and call _initializeWalletWithSeed
    const store = useWalletStore.getState();
    const testSeed = 'test test test test test test test test test test test junk';
    
    // Mock _initializeServices
    const initServicesSpy = vi.spyOn(store, '_initializeServices').mockResolvedValue();
    
    // Initialize with a seed phrase
    const result = await store._initializeWalletWithSeed(testSeed, true);
    
    // Check that services were initialized
    expect(initServicesSpy).toHaveBeenCalledWith(testSeed);
    
    // Check the store state
    expect(result).toBe(true);
    expect(store.seedPhrase).toBe(testSeed);
    expect(store.isInitialized).toBe(true);
    expect(store.error).toBe(null);
    expect(store.hasSeenSelfCustodyNotice).toBe(false); // Should be false for new wallets
  });
  
  it('should restore wallet with valid seed phrase', async () => {
    // Mock the validate effect
    Effect.runPromiseExit = vi.fn().mockResolvedValue({ _tag: 'Success', value: true });
    
    // Get the store and spy on _initializeWalletWithSeed
    const store = useWalletStore.getState();
    const testSeed = 'test test test test test test test test test test test junk';
    
    // Mock _initializeWalletWithSeed
    const initSpy = vi.spyOn(store, '_initializeWalletWithSeed').mockResolvedValue(true);
    
    // Call restoreWallet
    const result = await store.restoreWallet(testSeed);
    
    // Check that the proper Effect was created
    expect(Effect.flatMap).toHaveBeenCalledWith(BIP39Service, expect.any(Function));
    
    // Check that initializeWalletWithSeed was called with the seed
    expect(initSpy).toHaveBeenCalledWith(testSeed, false);
    
    // Check the result
    expect(result).toBe(true);
  });
  
  it('should logout correctly', () => {
    // First set up the store with a seed phrase and initialized state
    const store = useWalletStore.getState();
    store.seedPhrase = 'test test test test test test test test test test test junk';
    store.isInitialized = true;
    store.hasSeenSelfCustodyNotice = true;
    
    // Call logout
    store.logout();
    
    // Verify the state is reset
    expect(store.seedPhrase).toBe(null);
    expect(store.isInitialized).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBe(null);
  });
  
  it('should set and get the seed phrase correctly', () => {
    // Get the store and set up a seed phrase
    const store = useWalletStore.getState();
    const testSeed = 'test test test test test test test test test test test junk';
    store.seedPhrase = testSeed;
    
    // Check getSeedPhrase
    expect(store.getSeedPhrase()).toBe(testSeed);
  });
  
  it('should track self-custody notice correctly', () => {
    // Get the store
    const store = useWalletStore.getState();
    
    // Verify initial state
    expect(store.hasSeenSelfCustodyNotice).toBe(false);
    
    // Set the flag
    store.setHasSeenSelfCustodyNotice();
    
    // Verify updated state
    expect(store.hasSeenSelfCustodyNotice).toBe(true);
  });
});