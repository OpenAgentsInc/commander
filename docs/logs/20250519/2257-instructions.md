The observations in `docs/logs/20250519/2221-instructions.md` (which provides a self-assessment and next steps based on an earlier state) have been **partially implemented**.

Here's a breakdown based on the goals outlined in `2221-instructions.md` and the state of the codebase shown in the provided file listing (which seems to reflect the state *after* the agent's work logged in `2221-log.md` and `2233-log.md`):

**Assessment of Implementation against `2221-instructions.md` Goals:**

1.  **Input Schema Validation in `SparkServiceImpl.ts`:**
    *   **Status:** Implemented.
    *   **Details:** `src/services/spark/SparkServiceImpl.ts` uses `Schema.decodeUnknown` for `CreateLightningInvoiceParamsSchema` and `PayLightningInvoiceParamsSchema` in the respective methods. It maps `ParseError` to `SparkValidationError`. Telemetry logs `validatedParams`.
    *   **Gap from Instructions:** The instructions also asked for tests that *specifically* target these schema validations failing *before* an SDK call. While `SparkService.test.ts` has tests for SDK validation errors (mocked), it lacks tests that provide invalid input to `SparkServiceLive` to trigger its internal schema validation and ensure the SDK method isn't called.

2.  **Type-Safe and Accurate SDK Response Mapping in `SparkServiceImpl.ts`:**
    *   **Status:** Partially Implemented.
    *   **Details:**
        *   `as any` or `as SDKType` casts have been removed.
        *   **`createLightningInvoice`**: The mapping uses `validatedParams.amountSats` for `result.invoice.amountSats` instead of potentially sourcing it from `sdkResult.invoice.amount.originalValue` (if the SDK provides it). This is a deviation from the typical pattern of using the SDK's returned values but might be an intentional choice to ensure the invoice amount matches the requested amount.
        *   **`payLightningInvoice`**:
            *   `amountSats`: Mapped as `(sdkResult.transfer?.totalAmount?.originalValue) || (sdkResult.fee && typeof sdkResult.fee.originalValue === 'number' ? sdkResult.fee.originalValue : 0)`. This is an improvement over just using the fee but still not directly mapping `sdkResult.amount?.originalValue` which is the standard field for the payment amount in `LightningSendRequest` from the SDK.
            *   `paymentHash`: Correctly uses `sdkResult.paymentPreimage`.
            *   `status`: Maps SDK status strings to internal `SUCCESS`/`PENDING`/`FAILED`.
            *   `destination`: Uses `sdkResult.transfer?.sparkId || (sdkResult.encodedInvoice ? ...)` which is an indirect mapping. The SDK's `LightningSendRequest` usually has a `destinationNodePubkey`.
        *   **`getBalance`**: Mapping for `tokenBalances` and `tokenInfo` seems reasonable with fallbacks.
    *   **Gap from Instructions:** The mapping for `amountSats` and `destination` in `payLightningInvoice` needs to be verified against the actual fields available in the `@buildonspark/spark-sdk`'s `LightningSendRequest` type (likely `sdkResult.amount.originalValue` and `sdkResult.destinationNodePubkey` respectively). Similarly, for `createLightningInvoice`, if the SDK returns an amount, that should generally be preferred or reconciled.

3.  **Comprehensive SDK Error Mapping in `SparkServiceImpl.ts`:**
    *   **Status:** Implemented.
    *   **Details:** The `catch` blocks in `SparkServiceImpl.ts` for SDK calls now include `instanceof` checks for `ValidationError`, `NetworkError`, `RPCError`, `AuthenticationError`, `NotImplementedError`, `ConfigurationError` (SDK's own), and the base `SparkSDKError`. These are mapped to the corresponding custom `Spark...Error` types.
    *   **Gap from Instructions:** The tests in `SparkService.test.ts` are not fully comprehensive in testing the mapping for *all* these SDK error types for *all* service methods. For example, tests for mapping `SDK.NotImplementedError` are missing.

4.  **Resource Management for `SparkWallet` in `SparkServiceImpl.ts`:**
    *   **Status:** Implemented.
    *   **Details:** `SparkServiceLive` now uses `Layer.scoped` and `Effect.addFinalizer`. The finalizer checks for `wallet.cleanupConnections` and attempts to call it, also attempting to log telemetry for success/failure of cleanup.
    *   **Note:** The robustness of telemetry logging within the finalizer was a point of subsequent refinement (as seen in `2233-log.md`). The provided `SparkServiceImpl.ts` has the Effect-based telemetry in the finalizer.

5.  **Test Enhancements in `src/tests/unit/services/spark/SparkService.test.ts`:**
    *   **Input Validation Failure Tests**: **Missing** specific tests for `SparkServiceImpl.ts`'s internal schema validation (failing *before* SDK call).
    *   **Granular SDK Error Mapping Tests**: **Partially implemented.** Tests cover some mappings (e.g., `NetworkError`, `AuthenticationError`, `RPCError`) but not all SDK error types for all service methods (e.g., `SDK.NotImplementedError`, SDK's own `ConfigurationError` or `ValidationError`).
    *   **Wallet Initialization Failure Test**: **Implemented.**
    *   **Resource Cleanup Test**: **Implemented** (as per the refactored version in `2233-instructions.md`).

**Summary of Implementation:**

The agent has made significant progress. Core aspects like input schema validation in the service, broader SDK error mapping in the service, and resource management have been added. The tests for initialization failure and resource cleanup are also in place.

The main remaining gaps are:
*   Verifying and correcting the accuracy of specific field mappings from SDK responses (especially amounts and destination).
*   Adding specific tests for the service's internal input schema validation failures.
*   Expanding test coverage for all defined SDK error type mappings across all service methods.

**Logical Next Steps & Coding Instructions:**

**I. Correct SDK Response Field Mappings in `src/services/spark/SparkServiceImpl.ts`**

Based on the typical structure of Spark SDKs and common Lightning types:

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Inside createLightningInvoice method, after `const sdkResult = await wallet.createLightningInvoice(validatedParams);`
// Assume SDK's LightningReceiveRequest.invoice.amount is of type CurrencyAmount { originalValue: number }
const result_createInvoice: LightningInvoice = {
  invoice: {
    encodedInvoice: sdkResult.invoice.encodedInvoice,
    paymentHash: sdkResult.invoice.paymentHash,
    // If SDK returns amount, prefer it. Otherwise, use the requested amount.
    amountSats: sdkResult.invoice.amount?.originalValue ?? validatedParams.amountSats,
    createdAt: sdkResult.invoice.createdAt ? Date.parse(sdkResult.invoice.createdAt) / 1000 : Math.floor(Date.now() / 1000),
    expiresAt: sdkResult.invoice.expiresAt ? Date.parse(sdkResult.invoice.expiresAt) / 1000 : Math.floor(Date.now() / 1000) + (validatedParams.expirySeconds || 3600),
    memo: sdkResult.invoice.memo || validatedParams.memo
  }
};
// return result_createInvoice; // Modify the return statement

// Inside payLightningInvoice method, after `const sdkResult = await wallet.payLightningInvoice(...)`
// Assume SDK's LightningSendRequest has 'amount' of type CurrencyAmount and 'destinationNodePubkey'
const result_payInvoice: LightningPayment = {
  payment: {
    id: sdkResult.id || 'unknown-id',
    paymentHash: sdkResult.paymentPreimage || 'unknown-hash', // SDK often uses paymentPreimage for send
    amountSats: sdkResult.amount?.originalValue || 0,         // Actual amount sent by SDK
    feeSats: sdkResult.fee?.originalValue || 0,
    createdAt: sdkResult.createdAt ? Date.parse(sdkResult.createdAt) / 1000 : Math.floor(Date.now() / 1000),
    status: String(sdkResult.status).toUpperCase().includes('SUCCESS') ? 'SUCCESS' :
              (String(sdkResult.status).toUpperCase().includes('PEND') ? 'PENDING' : 'FAILED'), // Map SDK status
    destination: sdkResult.destinationNodePubkey || // Prefer specific destination field
                 (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0, 20) + '...' : 'unknown-destination')
  }
};
// return result_payInvoice; // Modify the return statement

// Inside getBalance method, within the tokenBalances mapping:
// ...
tokenInfo: {
  tokenId: value.tokenInfo.tokenPublicKey || key, // Prefer tokenPublicKey if available
  name: value.tokenInfo.tokenName || 'Unknown Token',
  symbol: value.tokenInfo.tokenSymbol || 'UNK',
  decimals: value.tokenInfo.tokenDecimals || 0
}
// ...
```

**II. Add Tests for Input Schema Validation Failures in `src/tests/unit/services/spark/SparkService.test.ts`**

```typescript
// File: src/tests/unit/services/spark/SparkService.test.ts

// Inside describe('createLightningInvoice')
it('should fail with SparkValidationError (schema validation) for zero amountSats via SparkServiceLive', async () => {
  const invalidParams: CreateLightningInvoiceParams = { amountSats: 0, memo: 'Invalid Zero Amount' };
  // SDK mock should NOT be called for this test
  createLightningInvoiceMock.mockClear();
  mockTrackEvent.mockClear();

  const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invalidParams));
  const exit = await safeRunEffect(program.pipe(Effect.provide(testLayerForLive)));

  expect(Exit.isFailure(exit)).toBe(true);
  const error = getFailure(exit);
  expect(error).toBeInstanceOf(SparkValidationError);
  if (error instanceof SparkValidationError && error.cause) {
    expect(error.message).toContain("Invalid parameters for createLightningInvoice");
    // @ts-ignore - Assuming cause is ParseError from effect/Schema
    expect(error.cause._tag).toBe("ParseError");
  }
  expect(createLightningInvoiceMock).not.toHaveBeenCalled(); // Crucial: SDK method wasn't called
  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
    action: 'create_invoice_failure', // Or a more specific validation_failure action
    label: expect.stringContaining("Invalid parameters"),
    category: 'spark:lightning' // Ensure correct category
  }));
  // Ensure no "start" or "success" telemetry was called for this action
  expect(mockTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_start' }));
  expect(mockTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_success' }));
});

// Inside describe('payLightningInvoice')
it('should fail with SparkValidationError (schema validation) for empty invoice string via SparkServiceLive', async () => {
  const invalidParams: PayLightningInvoiceParams = { invoice: '', maxFeeSats: 100 };
  payLightningInvoiceMock.mockClear();
  mockTrackEvent.mockClear();

  const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(invalidParams));
  const exit = await safeRunEffect(program.pipe(Effect.provide(testLayerForLive)));

  expect(Exit.isFailure(exit)).toBe(true);
  const error = getFailure(exit);
  expect(error).toBeInstanceOf(SparkValidationError);
  if (error instanceof SparkValidationError && error.cause) {
    expect(error.message).toContain("Invalid parameters for payLightningInvoice");
    // @ts-ignore
    expect(error.cause._tag).toBe("ParseError");
  }
  expect(payLightningInvoiceMock).not.toHaveBeenCalled();
  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
    action: 'pay_invoice_failure',
    label: expect.stringContaining("Invalid parameters"),
    category: 'spark:lightning'
  }));
  expect(mockTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'pay_invoice_start' }));
  expect(mockTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'pay_invoice_success' }));
});
```

**III. Add More Granular SDK Error Mapping Tests in `src/tests/unit/services/spark/SparkService.test.ts`**

```typescript
// File: src/tests/unit/services/spark/SparkService.test.ts

// Helper for SDK error mapping tests
const testSDKErrorMapping = async (
  sdkMethodMock: ReturnType<typeof vi.fn>,
  serviceMethodCall: Effect.Effect<any, SparkError | TrackEventError, SparkService>,
  sdkErrorInstance: Error, // Use the mock error type from ./mockSdk
  expectedSparkErrorType: new (...args: any[]) => SparkError,
  expectedCategory: string,
  expectedActionPrefix: string
) => {
  sdkMethodMock.mockRejectedValueOnce(sdkErrorInstance);
  mockTrackEvent.mockClear();

  const exit = await safeRunEffect(serviceMethodCall.pipe(Effect.provide(testLayerForLive)));

  expect(Exit.isFailure(exit)).toBe(true);
  const error = getFailure(exit);
  expect(error).toBeInstanceOf(expectedSparkErrorType);
  if (error instanceof expectedSparkErrorType) { // Type guard
    expect(error.cause).toBe(sdkErrorInstance);
  }
  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
    category: expectedCategory,
    action: `${expectedActionPrefix}_start`
  }));
  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
    category: expectedCategory,
    action: `${expectedActionPrefix}_failure`
  }));
};

// Inside describe('createLightningInvoice')
it('should map SDK ValidationError to SparkValidationError for createLightningInvoice', async () => {
  const params: CreateLightningInvoiceParams = { amountSats: 1000, memo: "Test" };
  const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(params));
  await testSDKErrorMapping(
    createLightningInvoiceMock,
    program,
    new MockValidationError("SDK CreateInvoice Validation Failed"),
    SparkValidationError,
    'spark:lightning',
    'create_invoice'
  );
});

it('should map SDK NotImplementedError to SparkNotImplementedError for createLightningInvoice', async () => {
  const params: CreateLightningInvoiceParams = { amountSats: 1000, memo: "Test" };
  const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(params));
  await testSDKErrorMapping(
    createLightningInvoiceMock,
    program,
    new MockNotImplementedError("SDK CreateInvoice Not Implemented"),
    SparkNotImplementedError,
    'spark:lightning',
    'create_invoice'
  );
});


// Inside describe('payLightningInvoice')
it('should map SDK ValidationError to SparkValidationError for payLightningInvoice', async () => {
  const params: PayLightningInvoiceParams = { invoice: "lnbc...", maxFeeSats: 100 };
  const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(params));
  await testSDKErrorMapping(
    payLightningInvoiceMock,
    program,
    new MockValidationError("SDK PayInvoice Validation Failed"),
    SparkValidationError,
    'spark:lightning',
    'pay_invoice'
  );
});

it('should map SDK NotImplementedError to SparkNotImplementedError for payLightningInvoice', async () => {
  const params: PayLightningInvoiceParams = { invoice: "lnbc...", maxFeeSats: 100 };
  const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(params));
  await testSDKErrorMapping(
    payLightningInvoiceMock,
    program,
    new MockNotImplementedError("SDK PayInvoice Not Implemented"),
    SparkNotImplementedError,
    'spark:lightning',
    'pay_invoice'
  );
});

// Inside describe('getBalance')
it('should map SDK ValidationError to SparkValidationError for getBalance', async () => {
  const program = Effect.flatMap(SparkService, s => s.getBalance());
  await testSDKErrorMapping(
    getBalanceMock,
    program,
    new MockValidationError("SDK GetBalance Validation Failed"),
    SparkValidationError,
    'spark:balance',
    'get_balance'
  );
});

it('should map SDK NotImplementedError to SparkNotImplementedError for getBalance', async () => {
  const program = Effect.flatMap(SparkService, s => s.getBalance());
  await testSDKErrorMapping(
    getBalanceMock,
    program,
    new MockNotImplementedError("SDK GetBalance Not Implemented"),
    SparkNotImplementedError,
    'spark:balance',
    'get_balance'
  );
});


// Inside describe('getSingleUseDepositAddress')
it('should map SDK ValidationError to SparkValidationError for getSingleUseDepositAddress', async () => {
  const program = Effect.flatMap(SparkService, s => s.getSingleUseDepositAddress());
  await testSDKErrorMapping(
    getSingleUseDepositAddressMock,
    program,
    new MockValidationError("SDK GetAddress Validation Failed"),
    SparkValidationError,
    'spark:deposit',
    'get_deposit_address'
  );
});

it('should map SDK NotImplementedError to SparkNotImplementedError for getSingleUseDepositAddress', async () => {
  const program = Effect.flatMap(SparkService, s => s.getSingleUseDepositAddress());
  await testSDKErrorMapping(
    getSingleUseDepositAddressMock,
    program,
    new MockNotImplementedError("SDK GetAddress Not Implemented"),
    SparkNotImplementedError,
    'spark:deposit',
    'get_deposit_address'
  );
});

// Ensure the mock SDK's ConfigurationError is also tested for mapping, e.g., in getBalance
it('should map SDK ConfigurationError to SparkConfigError for getBalance', async () => {
  const program = Effect.flatMap(SparkService, s => s.getBalance());
  await testSDKErrorMapping(
    getBalanceMock,
    program,
    new MockConfigError("SDK GetBalance Config Failed"), // Use the mock from mockSdk.ts
    SparkConfigError,
    'spark:balance',
    'get_balance'
  );
});
```

**IV. Verify Finalizer Telemetry Robustness (Self-Correction)**

The finalizer in `SparkServiceImpl.ts` (from the `Read` call, representing state *before* the 22:33 log's fix) already attempts to log telemetry for cleanup success/failure. The critical aspect, as noted in the 22:33 log, is that if `TelemetryService` itself fails or is unavailable during shutdown, the finalizer should not throw an unhandled error. The `2233-instructions.md` provided a refined version of the `catchAllCause` for the finalizer.

**Action:** Ensure the `Effect.addFinalizer` block in `src/services/spark/SparkServiceImpl.ts` uses the robust error handling for its internal telemetry calls as shown in the `2233-instructions.md` (step IV) or the `2233-log.md` (which simplified it to `console.log` and `Effect.sync` for type safety).
Given the `2233-log.md` made a specific change to use `Effect.sync` and `console.log` directly in the finalizer to avoid type issues with Effect channels in finalizers, that specific pattern from `2233-log.md` (section 4) should be applied if not already.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Inside SparkServiceLive, the Effect.addFinalizer block:
    yield* _(Effect.addFinalizer(() => {
      // Using Effect.sync to ensure the finalizer itself doesn't have a complex error channel
      return Effect.sync(() => {
        if (typeof wallet.cleanupConnections === 'function') {
          wallet.cleanupConnections()
            .then(() => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer telemetry fallback)
              console.log("[SparkService Finalizer] Wallet connections cleaned up successfully. Telemetry: spark:dispose, wallet_cleanup_success");
              // Attempt to use telemetry if available, but don't let it fail the finalizer
              Effect.runFork(
                telemetry.trackEvent({
                  category: 'spark:dispose',
                  action: 'wallet_cleanup_success',
                  label: `Network: ${sparkConfig.network}`,
                  value: 'success'
                })
              );
            })
            .catch(error => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer telemetry fallback)
              console.error("[SparkService Finalizer] Failed to cleanup wallet connections:", error, "Telemetry: spark:dispose, wallet_cleanup_failure");
              Effect.runFork(
                telemetry.trackEvent({
                  category: 'spark:dispose',
                  action: 'wallet_cleanup_failure',
                  label: error instanceof Error ? error.message : 'Unknown cleanup error',
                  value: 'failure'
                })
              );
            });
        }
      });
    }));
```
This revised finalizer telemetry attempts to use the `TelemetryService` via `Effect.runFork` (fire-and-forget) so it doesn't affect the finalizer's own Effect signature, and falls back to `console.log` for immediate feedback. The `Effect.sync` wrapper ensures the finalizer's main path is synchronous and less prone to type complexities.

After these changes, the service should be more robust, type-accurate, and well-tested.
