import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Effect, Exit, Layer, Runtime } from "effect";
import { useWalletStore } from "@/stores/walletStore";
import { globalWalletConfig } from "@/services/walletConfig";
import { SparkService, SparkServiceConfigTag } from "@/services/spark";
import { SparkServiceTestLive, TestSparkServiceConfigLayer } from "@/services/spark/SparkServiceTestImpl";
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";

describe("Wallet Store Runtime Integration", () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let testRuntime: Runtime.Runtime<SparkService | TelemetryService>;

  beforeEach(async () => {
    // Suppress console output during tests
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = vi.fn();
    console.error = vi.fn();

    // Clear localStorage
    localStorage.clear();
    
    // Reset global wallet config
    globalWalletConfig.mnemonic = null;
    
    // Create test runtime with mock SparkService
    const telemetryLayer = TelemetryServiceLive.pipe(
      Layer.provide(DefaultTelemetryConfigLayer)
    );
    
    const testLayer = Layer.mergeAll(
      telemetryLayer,
      SparkServiceTestLive.pipe(
        Layer.provide(TestSparkServiceConfigLayer),
        Layer.provide(telemetryLayer)
      )
    );
    
    testRuntime = await Effect.runPromise(
      Layer.toRuntime(testLayer).pipe(Effect.scoped)
    );
    
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
    console.error = originalConsoleError;
  });

  it("should use test mnemonic when no user wallet is initialized", async () => {
    const runtime = getMainRuntime();
    
    // Get balance with no user wallet
    const program = Effect.flatMap(SparkService, (spark) => spark.getBalance());
    const result = await Effect.runPromiseExit(Effect.provide(program, runtime));
    
    expect(Exit.isSuccess(result)).toBe(true);
    if (Exit.isSuccess(result)) {
      // Should get balance from test wallet (48 sats)
      console.log("Balance without user wallet:", result.value);
      // This test doesn't verify the exact balance, just that it works
    }
  });

  it("should use user's mnemonic after wallet initialization", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet with user's mnemonic
    const success = await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    expect(success).toBe(true);
    
    // Verify global config was updated
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
    
    // Get new runtime after reinitialization
    const runtime = getMainRuntime();
    
    // Get balance with user's wallet
    const program = Effect.flatMap(SparkService, (spark) => spark.getBalance());
    const result = await Effect.runPromiseExit(Effect.provide(program, runtime));
    
    expect(Exit.isSuccess(result)).toBe(true);
    if (Exit.isSuccess(result)) {
      // Should get balance from user's wallet (different from test wallet)
      console.log("Balance with user wallet:", result.value);
    }
  });

  it("should restore wallet config on app restart", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet
    await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    
    // Simulate app restart by resetting global config
    globalWalletConfig.mnemonic = null;
    
    // Force store rehydration
    const rehydratedState = useWalletStore.getState();
    expect(rehydratedState.seedPhrase).toBe(testMnemonic);
    expect(rehydratedState.isInitialized).toBe(true);
    
    // Wait for services to reinitialize
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Verify global config was restored
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
  });

  it("should clear wallet config on logout", async () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Initialize wallet
    await useWalletStore.getState()._initializeWalletWithSeed(testMnemonic, true);
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
    
    // Logout
    useWalletStore.getState().logout();
    
    // Verify wallet config was cleared
    expect(globalWalletConfig.mnemonic).toBeNull();
    expect(useWalletStore.getState().isInitialized).toBe(false);
  });
});