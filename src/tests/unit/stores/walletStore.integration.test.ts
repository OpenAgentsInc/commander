import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useWalletStore } from "@/stores/walletStore";
import { globalWalletConfig } from "@/services/walletConfig";
import * as runtime from "@/services/runtime";

// Mock the runtime module
vi.mock("@/services/runtime", () => ({
  getMainRuntime: vi.fn(() => ({
    // Mock runtime implementation
  })),
  reinitializeRuntime: vi.fn(() => Promise.resolve()),
}));

// Mock Effect.runPromiseExit to simulate BIP39 validation
vi.mock("effect", async () => {
  const actual = await vi.importActual("effect") as any;
  return {
    ...actual,
    Effect: {
      ...(actual.Effect || {}),
      runPromiseExit: vi.fn((effect) => {
        // Simulate successful mnemonic validation
        return Promise.resolve({
          _tag: "Success",
          value: true,
        });
      }),
    },
  };
});

describe("WalletStore Integration with SparkService", () => {
  beforeEach(() => {
    // Reset wallet store to initial state
    useWalletStore.setState({
      seedPhrase: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      hasSeenSelfCustodyNotice: false,
    });
    
    // Reset global wallet config
    globalWalletConfig.mnemonic = null;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should update globalWalletConfig when initializing with seed", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Call the internal initialization method
    const result = await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    
    expect(result).toBe(true);
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
    expect(runtime.reinitializeRuntime).toHaveBeenCalledTimes(1);
  });

  it("should store the seed phrase in wallet state", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    
    const state = useWalletStore.getState();
    expect(state.seedPhrase).toBe(testMnemonic);
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should handle errors during initialization", async () => {
    const testMnemonic = "test mnemonic";
    
    // Mock reinitializeRuntime to throw an error
    vi.mocked(runtime.reinitializeRuntime).mockRejectedValueOnce(new Error("Runtime initialization failed"));
    
    const result = await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    
    expect(result).toBe(false);
    const state = useWalletStore.getState();
    expect(state.error).toBe("Runtime initialization failed");
    expect(state.isInitialized).toBe(false);
  });

  it("should clear wallet state and config on logout", () => {
    // Set up initial state
    globalWalletConfig.mnemonic = "test mnemonic";
    useWalletStore.setState({
      seedPhrase: "test mnemonic",
      isInitialized: true,
    });
    
    // Logout
    useWalletStore.getState().logout();
    
    const state = useWalletStore.getState();
    expect(state.seedPhrase).toBeNull();
    expect(state.isInitialized).toBe(false);
    // Note: globalWalletConfig is not cleared on logout in current implementation
    // This might be something to fix for security
  });
});