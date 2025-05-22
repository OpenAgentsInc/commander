Okay, Agent, we have a few remaining issues in the `SparkService` tests. Let's tackle them methodically.

The primary issues are:

1.  A Vitest `ReferenceError: Cannot access 'mockWalletInstance' before initialization` which blocks test execution.
2.  Several TypeScript errors (`TS18046`: result is unknown, `TS2345`: Effect R channel not 'never') in `src/tests/unit/services/spark/SparkService.test.ts`.

Here are the instructions:

**I. Fix Vitest `ReferenceError: Cannot access 'mockWalletInstance' before initialization`**

**Target File:** `src/tests/unit/services/spark/SparkService.test.ts`

**Context:** The `vi.mock('@buildonspark/spark-sdk', ...)` factory function is hoisted and tries to use `mockWalletInstance` before its declaration in the test file's execution order.

**Instructions:**

1.  **Modify the `@buildonspark/spark-sdk` Mock:**
    Instead of having the mock factory directly reference `mockWalletInstance`, structure the mock so `mockWalletInstance` can be defined and then its methods assigned _after_ the `vi.mock` call, or define the mock methods inline. The cleanest approach for this specific error is to ensure the factory function doesn't rely on an externally defined `mockWalletInstance` that isn't yet initialized due to hoisting.

    Change the mock setup at the top of `src/tests/unit/services/spark/SparkService.test.ts` like this:

    ```typescript
    // src/tests/unit/services/spark/SparkService.test.ts
    import { vi } from "vitest";

    // Define mock error classes (as they were, this is fine)
    class MockNetworkError extends Error {
      /* ... */
    }
    class MockValidationError extends Error {
      /* ... */
    }
    class MockAuthError extends Error {
      /* ... */
    }
    class MockRPCError extends Error {
      /* ... */
    }

    // Declare mockWalletInstance here, but its methods will be assigned in beforeEach
    let mockWalletInstance: {
      createLightningInvoice: ReturnType<typeof vi.fn>;
      payLightningInvoice: ReturnType<typeof vi.fn>;
      getBalance: ReturnType<typeof vi.fn>;
      getSingleUseDepositAddress: ReturnType<typeof vi.fn>;
      cleanupConnections: ReturnType<typeof vi.fn>;
    };

    // Mock the SDK. The factory function will now be able to reference `mockWalletInstance`
    // because its *declaration* is hoisted, even if assignment happens later.
    // Alternatively, and more robustly, make the factory self-contained or mock methods individually.
    // For now, let's try ensuring mockWalletInstance is assignable.
    vi.mock("@buildonspark/spark-sdk", () => {
      // This factory is hoisted. We'll define mockWalletInstance's methods in beforeEach.
      // The factory should return an object that *will contain* the mocked methods.
      const actualMockWalletInstance = {
        createLightningInvoice: vi.fn(),
        payLightningInvoice: vi.fn(),
        getBalance: vi.fn(),
        getSingleUseDepositAddress: vi.fn(),
        cleanupConnections: vi.fn().mockResolvedValue(undefined),
      };
      // Assign to the outer scope variable so tests can manipulate it
      mockWalletInstance = actualMockWalletInstance;

      return {
        SparkWallet: {
          initialize: vi
            .fn()
            .mockResolvedValue({ wallet: actualMockWalletInstance }),
        },
        NetworkError: MockNetworkError,
        ValidationError: MockValidationError,
        AuthenticationError: MockAuthError,
        RPCError: MockRPCError,
        ConfigurationError: class extends Error {},
        NotImplementedError: class extends Error {},
        SparkSDKError: class extends Error {},
      };
    });

    // ... rest of your imports (Effect, Layer, SparkService etc.)
    import { describe, it, expect, beforeEach } from "vitest";
    // ...

    describe("SparkService", () => {
      // ...
      beforeEach(async () => {
        vi.clearAllMocks(); // Clears call counts etc.

        // Re-assign mock implementations for mockWalletInstance's methods here
        // This ensures they are fresh for each test and correctly typed.
        mockWalletInstance.createLightningInvoice.mockReset();
        mockWalletInstance.payLightningInvoice.mockReset();
        mockWalletInstance.getBalance.mockReset();
        mockWalletInstance.getSingleUseDepositAddress.mockReset();
        mockWalletInstance.cleanupConnections.mockResolvedValue(undefined);

        // Ensure the SparkWallet.initialize mock is also fresh if needed for re-initialization tests
        const sdk = await import("@buildonspark/spark-sdk");
        vi.mocked(sdk.SparkWallet.initialize)
          .mockClear()
          .mockResolvedValue({ wallet: mockWalletInstance });

        mockTrackEvent.mockClear();
      });
      // ... rest of the tests
    });
    ```

    This approach ensures `mockWalletInstance` is declared before `vi.mock` tries to use it within its factory due to hoisting, and its methods are re-mocked correctly in `beforeEach`.

**II. Fix TypeScript Errors in `src/tests/unit/services/spark/SparkService.test.ts`**

**Context:**

- `TS18046: 'result' is of type 'unknown'.`
- `TS2345: Argument of type 'Effect<any, any, any>' is not assignable to parameter of type 'Effect<any, any, never>'.`

**Instructions:**

1.  **Address `TS18046 ('result' is unknown)`:**
    The `createTestProgram` helper function uses `createMockSparkService`. The methods in `createMockSparkService` need to return `Effect.succeed` with explicitly typed success values.

    - In `src/tests/unit/services/spark/SparkService.test.ts`, modify `createMockSparkService`:

      ```typescript
      // Inside createMockSparkService in SparkService.test.ts

      // For createLightningInvoice:
      return Effect.succeed<LightningInvoice>({
        // Explicitly type the success value
        invoice: {
          encodedInvoice:
            "lnbc10n1p3zry29pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g",
          paymentHash: "abcdef1234567890",
          amountSats: params.amountSats,
          createdAt: Math.floor(Date.now() / 1000),
          expiresAt:
            Math.floor(Date.now() / 1000) + (params.expirySeconds || 3600),
          memo: params.memo,
        },
      });

      // For payLightningInvoice:
      return Effect.succeed<LightningPayment>({
        // Explicitly type
        payment: {
          id: "payment123",
          paymentHash: "abcdef1234567890",
          amountSats: 1000,
          feeSats: Math.min(params.maxFeeSats, 10),
          createdAt: Math.floor(Date.now() / 1000),
          status: "SUCCESS", // Use a literal type if defined in your interface
          destination: "dest123",
        },
      });

      // For getBalance:
      return Effect.succeed<BalanceInfo>({
        // Explicitly type
        balance: BigInt(50000),
        tokenBalances: new Map([
          [
            "token1",
            {
              balance: BigInt(1000),
              tokenInfo: {
                // Ensure this matches your BalanceInfo.tokenInfo structure
                tokenId: "token1", // Renamed from tokenPublicKey
                name: "Test Token",
                symbol: "TEST",
                decimals: 8,
              },
            },
          ],
        ]),
      });

      // For getSingleUseDepositAddress:
      return Effect.succeed<string>(
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      ); // Explicitly type
      ```

    - After this, when you use `const result = getSuccess(exit);`, TypeScript should infer the correct type for `result`.

2.  **Address `TS2345 (Effect R channel not 'never')`:**
    This error occurs when tests use `SparkServiceLive` directly. The `testLayer` in these tests needs to fully satisfy all dependencies of `SparkServiceLive`.
    `SparkServiceLive` depends on `SparkServiceConfigTag` and `TelemetryService`. The current `testLayer` is:
    `const testLayer = pipe(SparkServiceLive, Layer.provide(dependenciesLayer));`
    where `dependenciesLayer = Layer.merge(MockSparkConfigLayer, MockTelemetryServiceLayer);`

    This _should_ be correct. The `SparkServiceImpl.ts` makes calls like:
    `const sparkConfig = yield* _(SparkServiceConfigTag);`
    `const telemetry = yield* _(TelemetryService);`
    And then initializes `SparkWallet` using `SparkWallet.initialize`.
    The mocked `SparkWallet.initialize` (from `vi.mock`) should not introduce new dependencies.
    The `telemetry.trackEvent` calls within `SparkServiceImpl` also need their `TelemetryServiceConfig` dependency satisfied if they are run in isolation, but here they are part of the larger `SparkServiceLive` effect which _should_ have `TelemetryService` (and its config) provided by `dependenciesLayer`.

    The problem might be more subtle. Let's ensure the Effect programs are correctly typed.

    - In tests that use `SparkServiceLive`, like the "handle network errors during invoice creation" test:

      ```typescript
      // Program that uses the actual service via its Tag
      const program: Effect.Effect<
        LightningInvoice,
        SparkError | TrackEventError,
        SparkService
      > = Effect.gen(function* (_) {
        const service = yield* _(SparkService); // Requires SparkService
        return yield* _(service.createLightningInvoice(invoiceParams));
      });

      const exit = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(testLayer), // testLayer provides SparkService
        ),
      );
      ```

      The type `Effect.Effect<LightningInvoice, SparkError | TrackEventError, SparkService>` for `program` is correct _before_ providing `testLayer`. After `Effect.provide(testLayer)`, the `R` channel should become `never`.

    - **Key Check:** Review `SparkServiceImpl.ts`. If any internal `Effect.gen` or `Effect.tryPromise` directly calls `Effect.provide` for telemetry _without_ also providing `DefaultTelemetryConfigLayer` or `MockTelemetryConfigLayer` _at that specific point_, it could lead to this. However, `SparkServiceLive` itself receives `TelemetryService` (which should be pre-configured) from its `R` channel.
      The agent's telemetry calls in `SparkServiceImpl` for `wallet_initialize_start/success/failure` are `await Effect.runPromise(telemetry.trackEvent(...))`. These run outside the main Effect chain of the method they are in. _These must be fixed_.

      **Action for `SparkServiceImpl.ts`:**
      Change all "fire-and-forget" telemetry calls that use `Effect.runPromise` to be properly integrated into the main Effect chain or ensure they are fully provided.

      Example from `SparkServiceImpl.ts` (wallet initialization):

      ```typescript
      // Original problematic telemetry:
      // await Effect.runPromise(telemetry.trackEvent({ /* ... */ }));

      // Change to (to integrate into the main Effect chain):
      yield *
        _(
          telemetry.trackEvent({
            /* ... */
          }),
        );
      // This assumes telemetry.trackEvent already handles its own TelemetryServiceConfig requirement
      // (e.g., if TelemetryService itself is configured). If not, and if TelemetryService methods
      // need TelemetryServiceConfig, then this needs to be provided to the whole SparkServiceLive layer.
      // The agent's SparkService interface methods correctly type R as `never` AFTER TelemetryService is provided to SparkServiceLive.
      // So, the telemetry.trackEvent calls within the service methods should just work.

      // The issue is likely that `telemetry.trackEvent` itself returns `Effect<void, TrackEventError, TelemetryServiceConfig>`.
      // When `SparkServiceLive` is constructed, it's given `TelemetryService` and `SparkServiceConfig`.
      // `TelemetryServiceLive` requires `TelemetryServiceConfigTag`.
      // So, `SparkServiceLive` needs `Layer.provide(telemetryLayer)` where `telemetryLayer` itself is `TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer))`.
      // This is already done in `runtime.ts`.

      // In SparkServiceImpl, the telemetry calls like:
      // Effect.tapBoth({ onSuccess: (invoice) => telemetry.trackEvent(...) })
      // The `telemetry.trackEvent(...)` here is an Effect. If it requires `TelemetryServiceConfig`,
      // and `SparkServiceLive` doesn't explicitly provide it to these sub-effects, then the overall `R`
      // channel of the method might not be `never`.

      // Simplest Fix for SparkServiceImpl.ts:
      // Ensure all telemetry.trackEvent calls are yielded:
      // yield* _(telemetry.trackEvent( /* ... */ ));
      // This makes them part of the Effect.gen chain.
      // The error TS2345 suggests that even after providing `testLayer`, the resulting Effect's `R` is not `never`.
      // This means `SparkServiceLive` itself, or one of its direct dependencies as provided by `testLayer`, has an unfulfilled requirement.
      // `SparkServiceLive` needs `SparkServiceConfigTag` and `TelemetryService`.
      // `testLayer` provides these.
      // Therefore, methods within `SparkServiceLive` should have their R channels fully satisfied if they only use these.

      // Let's focus on the `program` in the test.
      // If `service.createLightningInvoice(params)` returns an Effect with `R = TelemetryServiceConfig`,
      // then the `program` will also have `R = SparkService | TelemetryServiceConfig`.
      // Then `testLayer` needs to provide `TelemetryServiceConfig` too.
      // `MockTelemetryServiceLayer` is `Layer.succeed(TelemetryService, MockTelemetryService)`. This does NOT provide `TelemetryServiceConfig`.
      // `MockTelemetryService` methods should ideally return `Effect<..., ..., never>` if they are fully self-contained or if `TelemetryServiceConfig` is assumed to be provided globally to them.

      // Modify `MockTelemetryServiceLayer` in `SparkService.test.ts`:
      const MockTelemetryServiceLayer = Layer.provide(
        Layer.succeed(TelemetryService, MockTelemetryService),
        Layer.succeed(TelemetryServiceConfigTag, {
          /* dummy config for telemetry if needed by its impl */ enabled: true,
          logToConsole: false,
          logLevel: "info",
        }),
      );
      // And ensure `dependenciesLayer` in the test correctly uses this *new* `MockTelemetryServiceLayer`.
      // `const dependenciesLayer = Layer.merge(MockSparkConfigLayer, MockTelemetryServiceLayer);`

      // This ensures that if TelemetryService (even the mock) needs TelemetryServiceConfig, it's provided within the test layer.
      ```

This should address the TypeScript errors. The key is ensuring that all mocked service methods return correctly typed Effects and that test layers provide all necessary contexts.

After applying these fixes, run `pnpm t` and `pnpm test` again.Okay, Agent, we're making good progress. Let's tackle these remaining TypeScript errors and the Vitest test failure in `SparkService.test.ts`.

**I. Fix Vitest `ReferenceError: Cannot access 'mockWalletInstance' before initialization`**

**Target File:** `src/tests/unit/services/spark/SparkService.test.ts`

**Context:** This is a hoisting issue where `mockWalletInstance` is used by the `vi.mock` factory before it's fully defined in the module's execution flow.

**Instructions:**

1.  **Restructure the Mock Setup:**
    Modify the top of `src/tests/unit/services/spark/SparkService.test.ts`. We will define the mock functions directly within the factory or ensure `mockWalletInstance`'s methods are assigned safely.

    ```typescript
    // src/tests/unit/services/spark/SparkService.test.ts
    import { vi, describe, it, expect, beforeEach } from "vitest";

    // Define mock error classes (as they were, this is fine)
    class MockNetworkError extends Error {
      /* ... (content as before) ... */
    }
    class MockValidationError extends Error {
      /* ... (content as before) ... */
    }
    class MockAuthError extends Error {
      /* ... (content as before) ... */
    }
    class MockRPCError extends Error {
      /* ... (content as before) ... */
    }

    // --- This is the critical change for the ReferenceError ---
    // We will define the mock methods for the wallet instance directly in the factory
    // or ensure they are assigned safely if accessed globally.
    // Let's make the factory self-contained regarding the wallet methods.

    const mockCreateLightningInvoice = vi.fn();
    const mockPayLightningInvoice = vi.fn();
    const mockGetBalance = vi.fn();
    const mockGetSingleUseDepositAddress = vi.fn();
    const mockCleanupConnections = vi.fn().mockResolvedValue(undefined);

    vi.mock("@buildonspark/spark-sdk", () => ({
      SparkWallet: {
        initialize: vi.fn().mockResolvedValue({
          // This mockResolvedValue is key
          wallet: {
            // This is the object that `mockWalletInstance` would represent
            createLightningInvoice: mockCreateLightningInvoice,
            payLightningInvoice: mockPayLightningInvoice,
            getBalance: mockGetBalance,
            getSingleUseDepositAddress: mockGetSingleUseDepositAddress,
            cleanupConnections: mockCleanupConnections,
          },
        }),
      },
      // Export all our mock error types
      NetworkError: MockNetworkError,
      ValidationError: MockValidationError,
      AuthenticationError: MockAuthError,
      RPCError: MockRPCError,
      ConfigurationError: class extends Error {},
      NotImplementedError: class extends Error {},
      SparkSDKError: class extends Error {},
    }));

    // Now, import the rest AFTER vi.mock
    import { Effect, Layer, Exit, Cause, Option, Context, pipe } from "effect";
    import {
      SparkService,
      SparkServiceLive,
      SparkServiceConfig,
      SparkServiceConfigTag,
      SparkLightningError,
      SparkBalanceError,
      SparkConnectionError,
      SparkValidationError,
      SparkTransactionError,
      SparkConfigError,
      SparkAuthenticationError,
      SparkRPCError,
      CreateLightningInvoiceParams,
      PayLightningInvoiceParams,
      LightningInvoice, // Ensure these are exported from SparkService.ts
      LightningPayment, // Ensure these are exported from SparkService.ts
      BalanceInfo, // Ensure these are exported from SparkService.ts
    } from "@/services/spark";
    import {
      TelemetryService,
      TelemetryServiceConfigTag,
      TrackEventError,
    } from "@/services/telemetry"; // Added TelemetryServiceConfigTag
    // import * as SparkSDK from '@buildonspark/spark-sdk'; // We don't need to import the whole SDK if we've mocked it.

    describe("SparkService", () => {
      const mockTrackEvent = vi
        .fn()
        .mockImplementation(() => Effect.succeed(undefined as void));
      const MockTelemetryService = {
        trackEvent: mockTrackEvent,
        isEnabled: () => Effect.succeed(true),
        setEnabled: () => Effect.succeed(undefined as void),
      };

      // Layer for providing TelemetryService and its config
      const MockTelemetryLayer = Layer.provide(
        Layer.succeed(TelemetryService, MockTelemetryService),
        Layer.succeed(TelemetryServiceConfigTag, {
          enabled: true,
          logToConsole: false,
          logLevel: "info",
        }),
      );

      const mockSparkConfig: SparkServiceConfig = {
        network: "REGTEST",
        mnemonicOrSeed:
          "test test test test test test test test test test test junk",
        accountNumber: 0,
        sparkSdkOptions: {
          grpcUrl: "http://localhost:8080",
          authToken: "test_token",
        },
      };
      const MockSparkConfigLayer = Layer.succeed(
        SparkServiceConfigTag,
        mockSparkConfig,
      );

      // Combined dependencies layer for SparkServiceLive
      const dependenciesLayer = Layer.merge(
        MockSparkConfigLayer,
        MockTelemetryLayer,
      );
      const testLayer = pipe(
        SparkServiceLive,
        Layer.provide(dependenciesLayer),
      );

      beforeEach(async () => {
        vi.clearAllMocks();
        // Reset the individual mock functions
        mockCreateLightningInvoice.mockReset();
        mockPayLightningInvoice.mockReset();
        mockGetBalance.mockReset();
        mockGetSingleUseDepositAddress.mockReset();
        mockCleanupConnections.mockClear().mockResolvedValue(undefined);
        mockTrackEvent.mockClear();

        // Reset SparkWallet.initialize mock if needed (e.g., if tests rely on re-initialization)
        const sdk = await import("@buildonspark/spark-sdk"); // Get the mocked module
        vi.mocked(sdk.SparkWallet.initialize)
          .mockClear()
          .mockResolvedValue({
            wallet: {
              createLightningInvoice: mockCreateLightningInvoice,
              payLightningInvoice: mockPayLightningInvoice,
              getBalance: mockGetBalance,
              getSingleUseDepositAddress: mockGetSingleUseDepositAddress,
              cleanupConnections: mockCleanupConnections,
            },
          });
      });

      // ... (Keep your test helpers: getSuccess, getFailure) ...
      const getSuccess = <A, E>(exit: Exit.Exit<A, E>): A => {
        /* ... */
      };
      const getFailure = <A, E>(exit: Exit.Exit<A, E>): E => {
        /* ... */
      };

      // No changes needed for createMockSparkService for now, as the agent's "fix" was to bypass SparkServiceLive
      // However, we want to test SparkServiceLive.
      // Remove `createMockSparkService` and `createTestProgram` helpers for now.
      // We will test SparkServiceLive directly.

      describe("createLightningInvoice", () => {
        const invoiceParams: CreateLightningInvoiceParams = {
          amountSats: 1000,
          memo: "Test payment",
        };

        it("should successfully create a lightning invoice", async () => {
          const mockInvoiceResponseSDK = {
            // This is what the SDK's mockWalletInstance.createLightningInvoice returns
            invoice: {
              encodedInvoice: "lnbc10n...",
              paymentHash: "abcdef1234567890",
            },
          };
          mockCreateLightningInvoice.mockResolvedValue(mockInvoiceResponseSDK);

          const program: Effect.Effect<
            LightningInvoice,
            SparkError | TrackEventError,
            SparkService
          > = Effect.flatMap(SparkService, (s) =>
            s.createLightningInvoice(invoiceParams),
          );

          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isSuccess(exit)).toBe(true);
          const result = getSuccess(exit);
          expect(result.invoice.paymentHash).toEqual("abcdef1234567890");
          expect(result.invoice.encodedInvoice).toContain("lnbc10n");
          expect(mockCreateLightningInvoice).toHaveBeenCalledWith(
            invoiceParams,
          );
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: "create_invoice_start" }),
          );
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: "create_invoice_success" }),
          );
        });

        it("should handle network errors during invoice creation", async () => {
          const networkError = new MockNetworkError("Connection failed", {
            endpoint: "invoice-api",
          });
          mockCreateLightningInvoice.mockRejectedValue(networkError);

          const program: Effect.Effect<
            LightningInvoice,
            SparkError | TrackEventError,
            SparkService
          > = Effect.flatMap(SparkService, (s) =>
            s.createLightningInvoice(invoiceParams),
          );

          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isFailure(exit)).toBe(true);
          const error = getFailure(exit);
          expect(error).toBeInstanceOf(SparkConnectionError);
          if (error instanceof SparkConnectionError) {
            expect(error.cause).toBe(networkError);
          }
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: "create_invoice_failure" }),
          );
        });

        it("should handle validation errors from params schema (if SparkServiceImpl uses Schema.decodeUnknown)", async () => {
          // For this test, SparkServiceImpl's createLightningInvoice would need to use Schema.decodeUnknown
          // If it doesn't, this test should check for SparkValidationError if custom validation exists.
          // The agent's SparkServiceImpl currently does *not* use Schema.decodeUnknown for params.
          // It relies on TypeScript types. So we'll test a direct SparkValidationError for invalid amount.

          mockCreateLightningInvoice.mockImplementation(async (params) => {
            if (params.amountSats <= 0)
              throw new MockValidationError("Amount must be > 0");
            return {
              invoice: { encodedInvoice: "lnbc...", paymentHash: "hash" },
            };
          });

          const invalidParams: CreateLightningInvoiceParams = {
            amountSats: -10,
            memo: "Invalid",
          };
          const program = Effect.flatMap(SparkService, (s) =>
            s.createLightningInvoice(invalidParams),
          );
          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isFailure(exit)).toBe(true);
          const error = getFailure(exit);
          expect(error).toBeInstanceOf(SparkValidationError);
        });
      });

      // Add similar direct tests for payLightningInvoice, getBalance, getSingleUseDepositAddress
      // using `SparkServiceLive` via `testLayer`.

      describe("payLightningInvoice", () => {
        const paymentParams: PayLightningInvoiceParams = {
          invoice: "lnbc...",
          maxFeeSats: 100,
        };

        it("should successfully pay a lightning invoice", async () => {
          const mockPaymentResponseSDK = {
            id: "payment123",
            paymentHash: "abcdef1234567890",
            amountSats: 1000,
            feeSats: 10,
            status: "SUCCESS",
            destination: "dest123",
          };
          mockPayLightningInvoice.mockResolvedValue(mockPaymentResponseSDK);

          const program = Effect.flatMap(SparkService, (s) =>
            s.payLightningInvoice(paymentParams),
          );
          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isSuccess(exit)).toBe(true);
          const result = getSuccess(exit);
          expect(result.payment.id).toEqual("payment123");
          expect(mockPayLightningInvoice).toHaveBeenCalledWith({
            invoice: paymentParams.invoice,
            maxFeeSats: paymentParams.maxFeeSats,
          });
        });
      });

      describe("getBalance", () => {
        it("should successfully retrieve balance information", async () => {
          const mockBalanceResponseSDK = {
            balance: BigInt(50000),
            tokenBalances: new Map([
              [
                "token1",
                {
                  balance: BigInt(1000),
                  tokenInfo: {
                    tokenPublicKey: "token1",
                    tokenName: "Test Token",
                    tokenSymbol: "TEST",
                    tokenDecimals: 8,
                  },
                },
              ],
            ]),
          };
          mockGetBalance.mockResolvedValue(mockBalanceResponseSDK);

          const program = Effect.flatMap(SparkService, (s) => s.getBalance());
          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isSuccess(exit)).toBe(true);
          const result = getSuccess(exit);
          expect(result.balance).toEqual(BigInt(50000));
          expect(result.tokenBalances.get("token1")?.tokenInfo.name).toBe(
            "Test Token",
          );
        });
      });

      describe("getSingleUseDepositAddress", () => {
        it("should successfully generate a deposit address", async () => {
          const mockAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
          mockGetSingleUseDepositAddress.mockResolvedValue(mockAddress);

          const program = Effect.flatMap(SparkService, (s) =>
            s.getSingleUseDepositAddress(),
          );
          const exit = await Effect.runPromiseExit(
            program.pipe(Effect.provide(testLayer)),
          );

          expect(Exit.isSuccess(exit)).toBe(true);
          const result = getSuccess(exit);
          expect(result).toEqual(mockAddress);
        });
      });

      describe("wallet initialization in SparkServiceLive", () => {
        it("should fail with SparkConfigError if SparkWallet.initialize rejects", async () => {
          const initError = new Error("SDK Initialization Failed");
          // Ensure SparkWallet.initialize is mocked to reject for this specific test
          const sdk = await import("@buildonspark/spark-sdk");
          vi.mocked(sdk.SparkWallet.initialize).mockRejectedValueOnce(
            initError,
          );

          // Create a new testLayer because SparkServiceLive attempts initialization upon layer creation
          const freshTestLayer = pipe(
            SparkServiceLive,
            Layer.provide(dependenciesLayer),
          );

          // Attempting to build the layer and get the service will trigger initialization
          const programToInitService = Effect.service(SparkService);
          const exit = await Effect.runPromiseExit(
            Effect.provide(programToInitService, freshTestLayer),
          );

          expect(Exit.isFailure(exit)).toBe(true);
          const error = getFailure(exit); // This will be the error from Layer.build if it fails
          expect(error).toBeInstanceOf(SparkConfigError); // Check against your custom error
          if (error instanceof SparkConfigError) {
            expect(error.message).toContain("Failed to initialize SparkWallet");
            expect(error.cause).toBe(initError);
          }
        });
      });
    });
    ```

**III. TypeScript: Explicitly type SDK results in `SparkServiceImpl.ts`**

**Target File:** `src/services/spark/SparkServiceImpl.ts`

**Context:** The agent used `as SDKLightningInvoice` etc. This can hide type mismatches. We need to ensure our internal types (`LightningInvoice`, `LightningPayment`, `BalanceInfo`) correctly map from the _actual_ (or accurately mocked) SDK response structures.

**Instructions:**

1.  **Review SDK Response Structures:**
    The agent has access to `node_modules/@buildonspark/spark-sdk/src/spark-wallet.ts`. Examine the return types of methods like `createLightningInvoice`, `payLightningInvoice`, `getBalance`.
    The SDK methods return Promises of specific types, e.g., `Promise<LightningReceiveRequest>`, `Promise<LightningSendRequest>`, `Promise<{ balance: bigint; ... }>`.

2.  **Update Internal Types (`SparkService.ts`) and Mappings (`SparkServiceImpl.ts`):**
    Ensure your `LightningInvoice`, `LightningPayment`, `BalanceInfo` interfaces in `SparkService.ts` match the relevant fields from the SDK's return types.

    - **For `createLightningInvoice` in `SparkServiceImpl.ts`:**
      The SDK's `wallet.createLightningInvoice` returns a `Promise<LightningReceiveRequest>`. Your `LightningInvoice` interface in `SparkService.ts` seems to already match this structure.
      Change:
      `const sdkResult = await wallet.createLightningInvoice(params) as SDKLightningInvoice;`
      To (assuming `wallet.createLightningInvoice` is correctly typed or mocked to return what `LightningReceiveRequest` from the SDK looks like):

      ```typescript
      const sdkResult = await wallet.createLightningInvoice(params); // Let TypeScript infer from mock/SDK
      // Ensure your internal LightningInvoice type matches the SDK's LightningReceiveRequest
      const result: LightningInvoice = {
        // Map to your defined type
        invoice: {
          encodedInvoice: sdkResult.invoice.encodedInvoice,
          paymentHash: sdkResult.invoice.paymentHash,
          amountSats: params.amountSats, // Assuming SDK doesn't return this or we override
          createdAt:
            sdkResult.invoice.createdAt || Math.floor(Date.now() / 1000), // Fallback if SDK doesn't provide
          expiresAt:
            sdkResult.invoice.expiresAt ||
            Math.floor(Date.now() / 1000) + (params.expirySeconds || 3600), // Fallback
          memo: sdkResult.invoice.memo || params.memo, // Prefer SDK if available
        },
      };
      ```

      If your `LightningInvoice` in `SparkService.ts` _is_ identical to the SDK's `LightningReceiveRequest`, then you can simplify. The key is that `sdkResult` should be correctly typed from the (mocked) SDK call.

    - **For `payLightningInvoice` in `SparkServiceImpl.ts`:**
      The SDK's `wallet.payLightningInvoice` returns a `Promise<LightningSendRequest>`.
      Change:
      `const sdkResult = await wallet.payLightningInvoice(...) as SDKLightningPayment;`
      To:

      ```typescript
      const sdkResult = await wallet.payLightningInvoice({
        invoice: params.invoice,
        maxFeeSats: params.maxFeeSats,
      });
      const result: LightningPayment = {
        // Map to your defined type
        payment: {
          id: sdkResult.id || "unknown-id",
          paymentHash: sdkResult.paymentHash, // This should be from the SDK's LightningSendRequest
          amountSats: sdkResult.amountSats, // This should be from the SDK's LightningSendRequest
          feeSats: sdkResult.feeSats, // This should be from the SDK's LightningSendRequest
          createdAt: sdkResult.createdAt || Math.floor(Date.now() / 1000),
          status: sdkResult.status || "SUCCESS", // Adapt based on SDK status values
          destination: sdkResult.destination,
        },
      };
      ```

    - **For `getBalance` in `SparkServiceImpl.ts`:**
      The SDK's `wallet.getBalance` returns `Promise<{ balance: bigint; tokenBalances: Map<string, ...> }>`.
      Change:
      `const sdkResult = await wallet.getBalance() as SDKBalanceInfo;`
      To:
      ```typescript
      const sdkResult = await wallet.getBalance();
      // Your existing mapping logic for tokenBalances seems okay, just ensure
      // sdkResult.tokenBalances.entries() is correctly typed if the SDK provides it.
      // Your BalanceInfo type in SparkService.ts should align with what getBalance() returns.
      const mappedTokenBalances = new Map<
        string,
        {
          /* your token info structure */
        }
      >();
      if (sdkResult.tokenBalances) {
        for (const [key, value] of sdkResult.tokenBalances.entries()) {
          mappedTokenBalances.set(key, {
            balance: value.balance,
            tokenInfo: {
              // Ensure these fields match your BalanceInfo.tokenInfo
              tokenId: value.tokenInfo.tokenPublicKey || key, // Example mapping
              name: value.tokenInfo.tokenName || "Unknown Token",
              symbol: value.tokenInfo.tokenSymbol || "UNK",
              decimals: value.tokenInfo.tokenDecimals || 0,
            },
          });
        }
      }
      const result: BalanceInfo = {
        balance: sdkResult.balance,
        tokenBalances: mappedTokenBalances,
      };
      ```

The goal is to remove `as SDK...` type assertions and ensure that the types flow correctly from the (mocked) SDK calls to your internal service types. If the SDK types are complex, it's fine to have intermediate local interfaces that mirror them before mapping to your `SparkService.ts` interfaces.

After these changes, `pnpm t` should pass, or the remaining errors will be more specific and easier to diagnose. The test failures related to Effect context should also be resolved by the `MockTelemetryLayer` change.

```

```
