Yes, it's crucial to have tests that verify this dynamic runtime behavior, especially since it's a common source of subtle bugs in applications using Effect-TS with mutable global state (like your `mainRuntimeInstance`).

Here's a test designed to isolate and confirm that Effect programs (like those in `handlePayment`) correctly use the latest runtime instance after `reinitializeRuntime` has been called.

---

**Test Name:** `Effect programs use the latest runtime instance for service resolution after reinitialization`
**Filename:** `src/tests/integration/runtime-reinitialization.test.ts` (Create this new file)

**Relevant Code for the Test:**

```typescript
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
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";
import { globalWalletConfig } from "@/services/walletConfig";

// Mock the actual SparkServiceLive and SparkServiceTestLive layers
// to control which `payLightningInvoice` spy is used.
const mockPayInvoiceV1 = vi.fn(() => Effect.succeed({ payment: { id: "v1_payment" } } as any));
const MockSparkServiceV1 = Layer.succeed(SparkService, {
  createLightningInvoice: vi.fn(),
  payLightningInvoice: mockPayInvoiceV1,
  getBalance: vi.fn(),
  getSingleUseDepositAddress: vi.fn(),
  checkWalletStatus: vi.fn(),
  checkInvoiceStatus: vi.fn(),
});

const mockPayInvoiceV2 = vi.fn(() => Effect.succeed({ payment: { id: "v2_payment" } } as any));
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

  const paymentEffect = Effect.gen(function* (_) {
    // This simulates the pattern in handlePayment:
    // 1. Get current runtime
    const currentRuntime = getMainRuntime(); // This is the key: it should fetch the *latest* instance
    // 2. Resolve SparkService from that runtime
    const spark = yield* _(SparkService);    // This Effect will be provided with `currentRuntime`
    // 3. Call the method
    return yield* _(spark.payLightningInvoice({ invoice: "test_invoice", maxFeeSats: 10 }));
  });

  it("should use the SparkService from the initial runtime before reinitialization", async () => {
    // 1. Initialize runtime (globalWalletConfig.mnemonic is null, so buildFullAppLayer mock uses MockSparkServiceV1)
    await initializeMainRuntime();

    // 2. Run the paymentEffect. It should use the SparkService from the *initial* runtime.
    const result1 = await Effect.runPromise(paymentEffect);

    expect(result1.payment.id).toBe("v1_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
  });

  it("should use the SparkService from the reinitialized runtime after reinitialization", async () => {
    // 1. Initial initialization (uses MockSparkServiceV1 via buildFullAppLayer mock)
    globalWalletConfig.mnemonic = "initial_mock_mnemonic"; // Ensures a specific branch in mock buildFullAppLayer
    await initializeMainRuntime();

    // Run once with initial runtime
    await Effect.runPromise(paymentEffect);
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(1);
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(0);
    mockPayInvoiceV1.mockClear(); // Clear calls for next assertion

    // 2. Simulate wallet setup and runtime reinitialization
    globalWalletConfig.mnemonic = "user_mnemonic_for_v2"; // This will trigger our mock buildFullAppLayer to use V2
    await reinitializeRuntime(); // This calls buildFullAppLayer again, updating the global runtime instance

    // 3. Run the paymentEffect again. It should now use SparkService from the *reinitialized* runtime.
    const result2 = await Effect.runPromise(paymentEffect);

    expect(result2.payment.id).toBe("v2_payment");
    expect(mockPayInvoiceV1).toHaveBeenCalledTimes(0); // V1 should NOT have been called again
    expect(mockPayInvoiceV2).toHaveBeenCalledTimes(1); // V2 should have been called
  });
});
```

**Instructions to the Coding Agent to Implement This Test:**

1.  **Create the Test File:**
    *   Create a new file named `src/tests/integration/runtime-reinitialization.test.ts`.

2.  **Add Mock Setup:**
    *   At the top of the file, add the `vi.mock("@/services/runtime", ...)` block. This mock is crucial. It intercepts calls to `buildFullAppLayer` (which `initializeMainRuntime` and `reinitializeRuntime` use) and allows the test to control which version of `SparkService` (`MockSparkServiceV1` or `MockSparkServiceV2`) is included in the application's layer based on the `globalWalletConfig.mnemonic`.
    *   Define `mockPayInvoiceV1`, `MockSparkServiceV1`, `mockPayInvoiceV2`, and `MockSparkServiceV2` as shown. These will be distinct service implementations with spied methods.

3.  **Write the `describe` Block:**
    *   Copy the `describe("Runtime Reinitialization and Service Resolution", ...)` block into the file.

4.  **Implement `beforeEach`:**
    *   Add the `beforeEach` block to clear mocks and reset `globalWalletConfig.mnemonic`.

5.  **Implement `paymentEffect`:**
    *   Define the `paymentEffect` `Effect.gen` program. This program simulates the core logic of `handlePayment` in `useNip90ConsumerChat`: it dynamically gets the current runtime via `getMainRuntime()` and then attempts to use the `SparkService` from that runtime.

6.  **Implement the First Test Case (`should use the SparkService from the initial runtime...`):**
    *   This test case calls `initializeMainRuntime()` first.
    *   Then, it runs `paymentEffect`.
    *   It asserts that `mockPayInvoiceV1` (from the initial mock runtime configuration) was called.

7.  **Implement the Second Test Case (`should use the SparkService from the reinitialized runtime...`):**
    *   This test case:
        *   Initializes the runtime.
        *   Runs `paymentEffect` to confirm the initial service (V1) is used.
        *   Changes `globalWalletConfig.mnemonic` to simulate user wallet setup.
        *   Calls `reinitializeRuntime()`.
        *   Runs `paymentEffect` *again*.
        *   Asserts that `mockPayInvoiceV2` (from the reinitialized mock runtime configuration) was called this time, and `mockPayInvoiceV1` was not called again.

**Why this test is effective:**

*   It directly tests the interaction between `getMainRuntime()`, `reinitializeRuntime()`, and an Effect program that consumes services.
*   It verifies that `reinitializeRuntime()` correctly updates the global `mainRuntimeInstance` in such a way that subsequent calls to `getMainRuntime()` (from within different executions of `paymentEffect`) retrieve the new, reconfigured runtime.
*   It confirms that services resolved from this dynamically fetched runtime are indeed the ones from the *latest* layer composition.
*   It avoids the complexities of React rendering and hook lifecycles, focusing on the core Effect runtime behavior that was causing the NIP-90 payfail issue.

By ensuring this test passes, you can be confident that the pattern of calling `getMainRuntime()` inside callbacks (as instructed for `useNip90ConsumerChat.ts`) will correctly pick up reinitialized services, including the user-configured `SparkService`.kjkj
