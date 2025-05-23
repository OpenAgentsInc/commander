// src/tests/integration/runtime-reinitialization.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Context, Runtime } from "effect";
import {
  initializeMainRuntime,
  getMainRuntime,
  reinitializeRuntime,
  buildFullAppLayer, // We'll need to control parts of this
  FullAppContext,
} from "@/services/runtime";
import { SparkService, SparkServiceConfigTag, SparkServiceConfig } from "@/services/spark";
import { TelemetryService, TelemetryServiceLive, TelemetryServiceConfigTag } from "@/services/telemetry";
import { globalWalletConfig } from "@/services/configuration/globalWalletConfig";

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

// We need to mock `buildFullAppLayer` to control which SparkService layer it uses.
// This is a bit intrusive but necessary for this specific test.
vi.mock("@/services/runtime", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@/services/runtime")>();
  return {
    ...originalModule,
    buildFullAppLayer: vi.fn(() => {
      // This mock implementation will decide which SparkService layer to use
      // based on globalWalletConfig.mnemonic, similar to the real implementation.
      // For simplicity in this test, we'll just return a base layer merged with
      // the controlled SparkService layer.
      let sparkLayerToUse: Layer.Layer<SparkService, any, any>;
      if (globalWalletConfig.mnemonic === "user_mnemonic_for_v2") {
        sparkLayerToUse = MockSparkServiceV2;
      } else {
        sparkLayerToUse = MockSparkServiceV1;
      }

      // A very minimal layer, just enough for SparkService and TelemetryService
      // In a real scenario, you'd mock other essential services if `SparkServiceLive` depended on them.
      const minimalBaseLayer = Layer.merge(
        Layer.succeed(TelemetryServiceConfigTag, { enabled: true, logToConsole: false, logLevel: "info"}),
        Layer.succeed(SparkServiceConfigTag, { network: "MAINNET", mnemonicOrSeed: globalWalletConfig.mnemonic || "mock_initial" })
      );
      const telemetryLayer = TelemetryServiceLive.pipe(Layer.provide(minimalBaseLayer));

      return Layer.merge(
        sparkLayerToUse.pipe(Layer.provide(telemetryLayer)), // SparkService needs Telemetry
        telemetryLayer
      );
    }),
  };
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
    const currentRuntime = getMainRuntime(); // This is the key: it should fetch the *latest* instance
    // 2. Resolve SparkService from that runtime
    const spark = yield* SparkService;    // This Effect will be provided with `currentRuntime`
    // 3. Call the method
    return yield* spark.payLightningInvoice({ invoice: "test_invoice", maxFeeSats: 10, timeoutSeconds: 60 });
  });

  it("should use the SparkService from the initial runtime before reinitialization", async () => {
    // 1. Initialize runtime (globalWalletConfig.mnemonic is null, so buildFullAppLayer mock uses MockSparkServiceV1)
    await initializeMainRuntime();

    // 2. Run the paymentEffect. It should use the SparkService from the *initial* runtime.
    const result1 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));

    expect(result1.payment.id).toBe("v1_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
  });

  it("should use the SparkService from the reinitialized runtime after reinitialization", async () => {
    // 1. Initial initialization (uses MockSparkServiceV1 via buildFullAppLayer mock)
    globalWalletConfig.mnemonic = "initial_mock_mnemonic"; // Ensures a specific branch in mock buildFullAppLayer
    await initializeMainRuntime();

    // Run once with initial runtime
    await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
    mockPayInvoiceV1.mockClear(); // Clear calls for next assertion

    // 2. Simulate wallet setup and runtime reinitialization
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2"; // This will trigger our mock buildFullAppLayer to use V2
    await reinitializeRuntime(); // This calls buildFullAppLayer again, updating the global runtime instance

    // 3. Run the paymentEffect again. It should now use SparkService from the *reinitialized* runtime.
    const result2 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));

    expect(result2.payment.id).toBe("v2_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(0); // V1 should NOT have been called again
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1); // V2 should have been called
  });

  it("should demonstrate the stale closure problem when runtime is captured", async () => {
    // This test demonstrates what happens when you capture the runtime in a closure
    // (the anti-pattern that causes the payment failure)
    
    // 1. Initialize with V1
    globalWalletConfig.mnemonic = "initial_mock_mnemonic";
    await initializeMainRuntime();
    
    // Simulate capturing runtime in a closure (BAD PATTERN)
    const capturedRuntime = getMainRuntime(); // This is what the old code was doing
    
    // 2. Reinitialize with V2
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2";
    await reinitializeRuntime();
    
    // 3. Run effect with captured (stale) runtime
    const staleResult = await Effect.runPromise(paymentEffect.pipe(Effect.provide(capturedRuntime)));
    
    // The payment goes to V1 (WRONG!) because we're using the stale runtime
    expect(staleResult.payment.id).toBe("v1_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
    
    // 4. Run effect with fresh runtime (CORRECT PATTERN)
    mockPayInvoiceV1.mockClear();
    const freshResult = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));
    
    // The payment goes to V2 (CORRECT!) because we're using the fresh runtime
    expect(freshResult.payment.id).toBe("v2_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(0);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple reinitializations correctly", async () => {
    // Test that multiple reinitializations work correctly
    
    // 1. Start with V1
    globalWalletConfig.mnemonic = "mnemonic_v1";
    await initializeMainRuntime();
    
    const result1 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));
    expect(result1.payment.id).toBe("v1_payment");
    
    // 2. Switch to V2
    mockPayInvoiceV1.mockClear();
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2";
    await reinitializeRuntime();
    
    const result2 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));
    expect(result2.payment.id).toBe("v2_payment");
    
    // 3. Switch back to V1
    mockPayInvoiceV2.mockClear();
    globalWalletConfig.mnemonic = "mnemonic_v1_again";
    await reinitializeRuntime();
    
    const result3 = await Effect.runPromise(paymentEffect.pipe(Effect.provide(getMainRuntime())));
    expect(result3.payment.id).toBe("v1_payment");
    
    // Verify call counts
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(2); // Called in step 1 and 3
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1); // Called only in step 2
  });
});