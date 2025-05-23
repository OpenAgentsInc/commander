import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useWalletStore } from "@/stores/walletStore";
import { globalWalletConfig } from "@/services/walletConfig";

// Mock the reinitializeRuntime function
vi.mock("@/services/runtime", () => ({
  getMainRuntime: vi.fn(() => ({})),
  reinitializeRuntime: vi.fn().mockResolvedValue(undefined),
}));

describe("Wallet Store Runtime Integration", () => {
  let originalConsoleLog: typeof console.log;

  beforeEach(async () => {
    // Suppress console output during tests
    originalConsoleLog = console.log;
    console.log = vi.fn();

    // Clear localStorage
    localStorage.clear();
    
    // Reset global wallet config
    globalWalletConfig.mnemonic = null;
    
    // Reset wallet store
    useWalletStore.setState({
      seedPhrase: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      hasSeenSelfCustodyNotice: false,
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("should update globalWalletConfig when initializing wallet", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet with user's mnemonic
    const success = await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    expect(success).toBe(true);
    
    // Verify global config was updated
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
    
    // Verify wallet store state
    expect(useWalletStore.getState().isInitialized).toBe(true);
    expect(useWalletStore.getState().seedPhrase).toBe(testMnemonic);
  });

  it("should clear globalWalletConfig on logout", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet
    await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
    
    // Logout
    useWalletStore.getState().logout();
    
    // Verify wallet config was cleared
    expect(globalWalletConfig.mnemonic).toBeNull();
    expect(useWalletStore.getState().isInitialized).toBe(false);
    expect(useWalletStore.getState().seedPhrase).toBeNull();
  });

  it("should restore wallet config on app restart", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet
    await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    
    // Simulate app restart by resetting global config
    globalWalletConfig.mnemonic = null;
    
    // Force store rehydration
    const store = useWalletStore.getState();
    expect(store.seedPhrase).toBe(testMnemonic);
    expect(store.isInitialized).toBe(true);
    
    // The onRehydrateStorage callback should run _initializeServices
    // But in tests, we need to manually trigger it
    if (store.seedPhrase && store.isInitialized) {
      await store._initializeServices(store.seedPhrase);
    }
    
    // Verify global config was restored
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
  });

  it("should log wallet initialization with partial mnemonic", async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    await useWalletStore.getState()._initializeServices(testMnemonic);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("WalletStore: Initializing services with mnemonic starting with: aband...")
    );
    
    consoleSpy.mockRestore();
  });
});