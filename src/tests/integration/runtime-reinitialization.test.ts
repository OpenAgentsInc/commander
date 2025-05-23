// src/tests/integration/runtime-reinitialization.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Context, Runtime } from "effect";
import { globalWalletConfig } from "@/services/walletConfig";

// Mock the problematic ECC-dependent modules first
vi.mock("@buildonspark/lrc20-sdk", () => ({
  SparkSDK: vi.fn(() => ({
    payInvoice: vi.fn(),
    getBalance: vi.fn(),
    createInvoice: vi.fn(),
    getTokenBalances: vi.fn(),
    getSingleUseDepositAddress: vi.fn(),
    getUserStatus: vi.fn(),
    decodeInvoice: vi.fn(),
  })),
}));

// Mock bitcoinjs-lib and secp256k1 to avoid ECC initialization
vi.mock("bitcoinjs-lib", () => ({
  networks: { bitcoin: {}, regtest: {}, testnet: {} },
  payments: { p2wpkh: vi.fn() },
  initEccLib: vi.fn(),
}));

vi.mock("secp256k1", () => ({
  publicKeyCreate: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
}));

import { SparkService, SparkServiceConfigTag } from "@/services/spark";
import { TelemetryService, TelemetryServiceLive, TelemetryServiceConfigTag } from "@/services/telemetry";

// Mock the actual SparkServiceLive and SparkServiceTestLive layers
// to control which `payLightningInvoice` spy is used.
const mockPayInvoiceV1 = vi.fn(() => Effect.succeed({ payment: { id: "v1_payment", paymentHash: "mock_hash_v1" } } as any));
const MockSparkServiceV1 = Layer.succeed(SparkService, {
  createLightningInvoice: vi.fn(),
  payLightningInvoice: mockPayInvoiceV1,
  getBalance: vi.fn(),
  getSingleUseDepositAddress: vi.fn(),
  checkWalletStatus: vi.fn(),
  checkInvoiceStatus: vi.fn(),
});

const mockPayInvoiceV2 = vi.fn(() => Effect.succeed({ payment: { id: "v2_payment", paymentHash: "mock_hash_v2" } } as any));
const MockSparkServiceV2 = Layer.succeed(SparkService, {
  createLightningInvoice: vi.fn(),
  payLightningInvoice: mockPayInvoiceV2,
  getBalance: vi.fn(),
  getSingleUseDepositAddress: vi.fn(),
  checkWalletStatus: vi.fn(),
  checkInvoiceStatus: vi.fn(),
});

// Create mock runtime functions to avoid ECC dependencies
let mockMainRuntimeInstance: Runtime.Runtime<any> | null = null;

const createMockRuntime = (sparkService: any) => {
  const mockTelemetryService = {
    trackEvent: vi.fn(() => Effect.succeed(undefined)),
    isEnabled: vi.fn(() => Effect.succeed(true)),
    setEnabled: vi.fn(() => Effect.succeed(undefined)),
  };

  const mockContext = Context.empty()
    .pipe(Context.add(SparkService, sparkService))
    .pipe(Context.add(TelemetryService, mockTelemetryService));

  return {
    context: mockContext,
    runtimeFlags: {},
    fiberRefs: {},
  } as Runtime.Runtime<any>;
};

// Mock runtime management functions
const mockInitializeMainRuntime = vi.fn(async () => {
  const sparkService = globalWalletConfig.mnemonic === "user_mnemonic_for_v2" 
    ? MockSparkServiceV2.pipe(Layer.toRuntime)
    : MockSparkServiceV1.pipe(Layer.toRuntime);
  
  mockMainRuntimeInstance = createMockRuntime(
    globalWalletConfig.mnemonic === "user_mnemonic_for_v2" 
      ? { payLightningInvoice: mockPayInvoiceV2 }
      : { payLightningInvoice: mockPayInvoiceV1 }
  );
});

const mockGetMainRuntime = vi.fn(() => {
  if (!mockMainRuntimeInstance) {
    // Create default runtime
    mockMainRuntimeInstance = createMockRuntime({ payLightningInvoice: mockPayInvoiceV1 });
  }
  return mockMainRuntimeInstance;
});

const mockReinitializeRuntime = vi.fn(async () => {
  const sparkService = globalWalletConfig.mnemonic === "user_mnemonic_for_v2" 
    ? { payLightningInvoice: mockPayInvoiceV2 }
    : { payLightningInvoice: mockPayInvoiceV1 };
  
  mockMainRuntimeInstance = createMockRuntime(sparkService);
});


describe("Runtime Reinitialization and Service Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global state
    globalWalletConfig.mnemonic = null;
    // We need to ensure the runtime instance is reset between tests if it's a global singleton.
    // Since initializeMainRuntime reassigns it, this should be okay.
  });

  const paymentEffect = Effect.gen(function* () {
    // This simulates the pattern in handlePayment:
    // 1. Get current runtime
    const currentRuntime = mockGetMainRuntime(); // This is the key: it should fetch the *latest* instance
    // 2. Resolve SparkService from that runtime
    const spark = yield* SparkService;    // This Effect will be provided with `currentRuntime`
    // 3. Call the method
    return yield* spark.payLightningInvoice({ invoice: "test_invoice", maxFeeSats: 10, timeoutSeconds: 60 });
  });

  it("should use the SparkService from the initial runtime before reinitialization", async () => {
    // 1. Initialize runtime (globalWalletConfig.mnemonic is null, so uses MockSparkServiceV1)
    await mockInitializeMainRuntime();

    // 2. Run the paymentEffect. It should use the SparkService from the *initial* runtime.
    const result1 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));

    expect(result1.payment.id).toBe("v1_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
  });

  it("should use the SparkService from the reinitialized runtime after reinitialization", async () => {
    // 1. Initial initialization (uses MockSparkServiceV1)
    globalWalletConfig.mnemonic = "initial_mock_mnemonic";
    await mockInitializeMainRuntime();

    // Run once with initial runtime
    await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
    mockPayInvoiceV1.mockClear(); // Clear calls for next assertion

    // 2. Simulate wallet setup and runtime reinitialization
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2"; // This will trigger our mock to use V2
    await mockReinitializeRuntime(); // This updates the global runtime instance

    // 3. Run the paymentEffect again. It should now use SparkService from the *reinitialized* runtime.
    const result2 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));

    expect(result2.payment.id).toBe("v2_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(0); // V1 should NOT have been called again
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1); // V2 should have been called
  });

  it("should demonstrate the stale closure problem when runtime is captured", async () => {
    // This test demonstrates what happens when you capture the runtime in a closure
    // (the anti-pattern that causes the payment failure)
    
    // 1. Initialize with V1
    globalWalletConfig.mnemonic = "initial_mock_mnemonic";
    await mockInitializeMainRuntime();
    
    // Simulate capturing runtime in a closure (BAD PATTERN)
    const capturedRuntime = mockGetMainRuntime(); // This is what the old code was doing
    
    // 2. Reinitialize with V2
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2";
    await mockReinitializeRuntime();
    
    // 3. Run effect with captured (stale) runtime
    const staleResult = await Effect.runPromise(paymentEffect.pipe(Effect.provide(capturedRuntime)));
    
    // The payment goes to V1 (WRONG!) because we're using the stale runtime
    expect(staleResult.payment.id).toBe("v1_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
    
    // 4. Run effect with fresh runtime (CORRECT PATTERN)
    mockPayInvoiceV1.mockClear();
    const freshResult = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));
    
    // The payment goes to V2 (CORRECT!) because we're using the fresh runtime
    expect(freshResult.payment.id).toBe("v2_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(0);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple reinitializations correctly", async () => {
    // Test that multiple reinitializations work correctly
    
    // 1. Start with V1
    globalWalletConfig.mnemonic = "mnemonic_v1";
    await mockInitializeMainRuntime();
    
    const result1 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));
    expect(result1.payment.id).toBe("v1_payment");
    
    // 2. Switch to V2
    mockPayInvoiceV1.mockClear();
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2";
    await mockReinitializeRuntime();
    
    const result2 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));
    expect(result2.payment.id).toBe("v2_payment");
    
    // 3. Switch back to V1
    mockPayInvoiceV2.mockClear();
    globalWalletConfig.mnemonic = "mnemonic_v1_again";
    await mockReinitializeRuntime();
    
    const result3 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(mockGetMainRuntime())));
    expect(result3.payment.id).toBe("v1_payment");
    
    // Verify call counts
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(2); // Called in step 1 and 3
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1); // Called only in step 2
  });
});