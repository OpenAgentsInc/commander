The Spark service, as represented by the provided `SparkServiceImpl.ts` (which appears to be the version before the agent's claimed 22:07 fixes for `as any` casts) and its tests, is largely "Effect-ified" but contains some significant shortcuts and areas for improvement.

**Analysis of "Effect-ification" and Shortcuts:**

**Strengths (Properly "Effect-ified" Aspects):**

1.  **Service Definition:**
    *   `SparkService.ts` correctly defines the service interface (`SparkService`) and its `Context.Tag`.
    *   It defines a configuration interface (`SparkServiceConfig`) and a corresponding `Tag` (`SparkServiceConfigTag`) along with a `DefaultSparkServiceConfigLayer`.
    *   Custom error types (`SparkServiceError`, `SparkConfigError`, etc.) are defined using `Data.TaggedError`, which is good for typed errors in Effect.
2.  **Implementation (`SparkServiceImpl.ts`):**
    *   The `SparkServiceLive` layer correctly uses `Layer.effect` and `Effect.gen` to manage dependencies (`SparkServiceConfigTag`, `TelemetryService`).
    *   Initialization of `SparkWallet` is wrapped in `Effect.tryPromise`.
    *   Core SDK method calls (e.g., `wallet.createLightningInvoice`) are wrapped in `Effect.tryPromise`.
    *   Telemetry integration uses `yield* _(telemetry.trackEvent(...))` within the Effect chain, which is the correct pattern after the agent's 22:00 fix.
3.  **Error Handling:**
    *   The implementation attempts to map SDK errors (e.g., `NetworkError`, `ValidationError`) to the custom `SparkError` types using `instanceof` checks in `catch` blocks. This is a good foundation.
4.  **Tests (`SparkService.test.ts`):**
    *   The test setup (after the agent's 22:00 fixes) correctly mocks `@buildonspark/spark-sdk` and provides a `MockTelemetryLayer` that includes `TelemetryServiceConfigTag`.
    *   Tests use `Effect.runPromiseExit` and helper functions (`getSuccess`, `getFailure`) to assert on Effect outcomes, which is a good pattern.
    *   A hybrid testing approach is used:
        *   `createMockSparkService` for unit testing basic interface logic.
        *   Testing `SparkServiceLive` via a composed `testLayerForLive` for integration aspects, error mapping, and telemetry. This balance is generally good.

**Unnecessary Shortcuts and Weaknesses:**

1.  **Missing Input Schema Validation (Major Shortcut):**
    *   `SparkService.ts` defines `CreateLightningInvoiceParamsSchema` and `PayLightningInvoiceParamsSchema` using `effect/Schema`.
    *   However, `SparkServiceImpl.ts` (the provided version) **does not use these schemas to validate input parameters** before calling SDK methods. This bypasses Effect-TS's powerful schema validation capabilities and relies solely on TypeScript types at compile time, which doesn't protect against runtime invalid data.
2.  **Type-Unsafe SDK Response Handling (Major Shortcut if 22:07 log not fully applied):**
    *   The provided `SparkServiceImpl.ts` uses type assertions like `as SDKLightningInvoice` when handling results from `wallet.method()`. This is unsafe because it assumes the SDK's response perfectly matches the `SDKLightningInvoice` (or similar) interface without runtime validation. If the SDK's actual response structure differs, it can lead to runtime errors.
    *   The agent's log at 22:07 *claims* this was fixed for `payLightningInvoice` by examining SDK types and performing explicit mapping. This approach, if applied consistently to all methods, is much better than direct casting.
3.  **Incomplete or Potentially Incorrect SDK Field Mapping:**
    *   Even with explicit mapping (as hinted in the 22:07 log for `payLightningInvoice`), there's a risk of incorrect mapping if the SDK's return types are not fully understood. For example, the 22:07 log's mapping for `payLightningInvoice` seemed to use `sdkResult.fee.originalValue` for `amountSats`, which is likely incorrect. The actual payment amount should come from a different field in the SDK's `LightningSendRequest`.
4.  **Resource Management for `SparkWallet`:**
    *   `SparkWallet.initialize` is called within the `SparkServiceLive` layer. However, if the `SparkWallet` instance has a cleanup method (e.g., `cleanupConnections()` as seen in the SDK mock), it's not being managed by the layer's lifecycle (e.g., using `Layer.acquireRelease`). This could lead to resource leaks if the wallet needs explicit cleanup.
5.  **Completeness of SDK Error Mapping:**
    *   While `SparkServiceImpl.ts` maps several common SDK errors, it's crucial to ensure *all* relevant error types from `@buildonspark/spark-sdk/src/errors/types.ts` (e.g., `ConfigurationError` from the SDK itself, `NotImplementedError`, etc.) are caught and mapped to the appropriate custom `Spark...Error` types in *all* service methods that might throw them.

**Areas for Improvement:**

1.  **Implement Input Schema Validation:** Use `Schema.decodeUnknown(ParamsSchema)(params)` at the beginning of each service method in `SparkServiceImpl.ts` to validate inputs and fail early with a `SparkValidationError` if validation fails.
2.  **Ensure Type-Safe SDK Response Mapping:**
    *   Verify and apply the type-safe mapping approach (as described in the agent's 22:07 log) to *all* methods in `SparkServiceImpl.ts` that interact with the Spark SDK.
    *   Carefully consult the actual Spark SDK type definitions (e.g., in `node_modules/@buildonspark/spark-sdk/src/graphql/objects/`) to ensure correct field mapping to internal `SparkService.ts` types (`LightningInvoice`, `LightningPayment`, `BalanceInfo`). For instance, for `payLightningInvoice`, ensure the *actual amount paid* is mapped, not just the fee.
3.  **Enhance Error Mapping and Testing:**
    *   Review `@buildonspark/spark-sdk/src/errors/types.ts` and ensure all potential SDK errors are explicitly caught and mapped to specific `SparkError` subtypes in `SparkServiceImpl.ts`.
    *   Add dedicated tests in `SparkService.test.ts` for each SDK error type, mocking the SDK method to throw that specific error and asserting that the service correctly maps it to the corresponding custom `SparkError`.
4.  **Implement Resource Management:**
    *   If `SparkWallet` instances require explicit cleanup (e.g., a `close()` or `cleanupConnections()` method), refactor `SparkServiceLive` to use `Layer.acquireRelease` to manage the `SparkWallet` lifecycle.
5.  **(Optional but Recommended) Runtime Schema Validation for SDK Responses:**
    *   Define `Schema` for the expected structures of SDK responses (e.g., `SDKLightningReceiveRequestSchema`).
    *   After receiving a response from an SDK method, use `Schema.decodeUnknown` to validate it against the defined schema before mapping it to internal types. This adds a robust layer of runtime protection against unexpected SDK API changes.

**Specific Instructions for the Coding Agent:**

Here are the instructions to improve the `SparkService` and its tests:

**I. Modify `src/services/spark/SparkServiceImpl.ts`:**

1.  **Implement Input Schema Validation:**
    *   For `createLightningInvoice`:
        *   At the beginning of the `Effect.gen` block, before tracking telemetry, add:
            ```typescript
            const validatedParams = yield* _(
              Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params),
              Effect.mapError((e) => new SparkValidationError({
                message: "Invalid parameters for createLightningInvoice",
                cause: e,
                context: { originalParams: params }
              }))
            );
            ```
        *   Use `validatedParams` instead of `params` in the rest of the method, including the `wallet.createLightningInvoice(validatedParams)` call and telemetry logging.
    *   For `payLightningInvoice`:
        *   Similarly, add input validation using `PayLightningInvoiceParamsSchema`:
            ```typescript
            const validatedParams = yield* _(
              Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params),
              Effect.mapError((e) => new SparkValidationError({
                message: "Invalid parameters for payLightningInvoice",
                cause: e,
                context: { originalParams: params }
              }))
            );
            ```
        *   Use `validatedParams` in the rest of the method.

2.  **Ensure Type-Safe and Accurate SDK Response Mapping:**
    *   For **all** methods that call the Spark SDK (`createLightningInvoice`, `payLightningInvoice`, `getBalance`, `getSingleUseDepositAddress`):
        *   **Remove any remaining `as SDKType` or `as any` casts** when handling the `sdkResult`.
        *   **Consult SDK Type Definitions:** Carefully examine the actual return types of the corresponding `SparkWallet` methods in `node_modules/@buildonspark/spark-sdk/src/spark-wallet.ts` and related files (e.g., `src/graphql/objects/`).
        *   **Perform Explicit Mapping:** Create your internal types (`LightningInvoice`, `LightningPayment`, `BalanceInfo` defined in `SparkService.ts`) by explicitly mapping fields from the *actual* SDK response.
            *   **For `createLightningInvoice`:**
                *   The SDK's `wallet.createLightningInvoice` returns `Promise<LightningReceiveRequest>`.
                *   Your `LightningInvoice` interface in `SparkService.ts` should accurately reflect the fields from `LightningReceiveRequest` (from `@buildonspark/spark-sdk/src/graphql/objects/LightningReceiveRequest.ts`) that you want to expose.
                *   The mapping should look like:
                    ```typescript
                    // Assuming sdkResult is of type SDK.LightningReceiveRequest
                    const result: LightningInvoice = {
                      invoice: {
                        encodedInvoice: sdkResult.invoice.encodedInvoice,
                        paymentHash: sdkResult.invoice.paymentHash,
                        amountSats: sdkResult.invoice.amount.originalValue, // Verify this field in SDK type
                        createdAt: sdkResult.invoice.createdAt ? Date.parse(sdkResult.invoice.createdAt) / 1000 : Math.floor(Date.now() / 1000), // Handle potential string date
                        expiresAt: sdkResult.invoice.expiresAt ? Date.parse(sdkResult.invoice.expiresAt) / 1000 : Math.floor(Date.now() / 1000) + (validatedParams.expirySeconds || 3600),
                        memo: sdkResult.invoice.memo || validatedParams.memo
                      }
                    };
                    ```
            *   **For `payLightningInvoice`:**
                *   The SDK's `wallet.payLightningInvoice` returns `Promise<LightningSendRequest>`.
                *   Your `LightningPayment` interface needs to correctly map fields from `LightningSendRequest`.
                *   **Critically, ensure `amountSats` in your `LightningPayment` is mapped from the SDK's actual payment amount field, not `sdkResult.fee.originalValue`.** The `LightningSendRequest` type likely has a separate field for the sent amount (e.g., `sdkResult.amount.originalValue` or similar) distinct from `sdkResult.fee`.
                *   The mapping should look like (verify SDK fields):
                    ```typescript
                    // Assuming sdkResult is of type SDK.LightningSendRequest
                    const result: LightningPayment = {
                      payment: {
                        id: sdkResult.id,
                        paymentHash: sdkResult.paymentPreimage || 'unknown-hash', // SDK uses paymentPreimage
                        amountSats: sdkResult.amount?.originalValue || 0, // Example: check SDK for actual amount field
                        feeSats: sdkResult.fee?.originalValue || 0,
                        createdAt: sdkResult.createdAt ? Date.parse(sdkResult.createdAt) / 1000 : Math.floor(Date.now() / 1000),
                        status: sdkResult.status === 'SUCCESSFUL' ? 'SUCCESS' : (sdkResult.status === 'PENDING' ? 'PENDING' : 'FAILED'), // Map SDK status
                        destination: sdkResult.destinationNodePubkey || (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0,20) + '...' : 'unknown-destination') // Example, check SDK
                      }
                    };
                    ```
            *   **For `getBalance`:**
                *   The SDK's `wallet.getBalance` returns `Promise<{ balance: bigint; tokenBalances: Map<string, { balance: bigint; tokenInfo: SDK.TokenInfo }> }>`.
                *   Ensure your `BalanceInfo` interface and mapping for `tokenInfo` (e.g., `tokenId`, `name`, `symbol`, `decimals`) correctly uses fields from the SDK's `TokenInfo` type.
            *   **For `getSingleUseDepositAddress`:**
                *   This method returns `Promise<string>`. The current implementation is likely fine if it directly returns `sdkResult`.

3.  **Comprehensive SDK Error Mapping:**
    *   In the `catch` block of `Effect.tryPromise` for each SDK call, ensure you have `instanceof` checks for *all relevant error types* exported by `@buildonspark/spark-sdk/src/errors/types.ts` (e.g., `NetworkError`, `ValidationError`, `AuthenticationError`, `RPCError`, `ConfigurationError`, `NotImplementedError`, and the base `SparkSDKError`).
    *   Map each specific SDK error to its corresponding custom `Spark...Error` type (e.g., SDK's `ConfigurationError` to `SparkConfigError`).
    *   Ensure the `cause` and relevant `context` (from `e.context` if available on SDK errors, or operation parameters) are included in your custom errors.

4.  **Implement Resource Management for `SparkWallet` (if applicable):**
    *   **Check SDK:** Determine if `SparkWallet` instances have an explicit `close()` or `cleanupConnections()` method that should be called when the service is no longer needed. The mock `cleanupConnectionsMock` suggests this.
    *   **Modify `SparkServiceLive`:** If cleanup is needed, refactor `SparkServiceLive` to use `Layer.acquireRelease`:
        ```typescript
        export const SparkServiceLive = Layer.scoped(
          SparkService,
          Effect.acquireRelease(
            Effect.gen(function* (_) { // ACQUIRE LOGIC (current implementation)
              const sparkConfig = yield* _(SparkServiceConfigTag);
              const telemetry = yield* _(TelemetryService);
              // ... wallet initialization ...
              yield* _(telemetry.trackEvent(/* wallet_initialize_success */));
              // Return the service implementation object
              return { /* createLightningInvoice, payLightningInvoice, etc. */ };
            }),
            (serviceInstance, exit) => Effect.gen(function* (_) { // RELEASE LOGIC
              const telemetry = yield* _(TelemetryService); // Get TelemetryService again if needed for release logging
              // Assuming 'wallet' was accessible from the serviceInstance or captured in acquire's scope
              // This needs careful structuring. A common way is to make `wallet` part of the service object.
              // For simplicity here, let's assume `wallet` is available.
              // Example: if `wallet` is part of the returned service object in acquire:
              // const walletToClean = (serviceInstance as any)._internalWalletRef; // hypothetical
              // For now, we'll assume `wallet` from the acquire step is in scope.
              // This might require making `wallet` part of the object returned by the acquire Effect.
              // A simple way for now, if `wallet` is only used in the release:
              // In the acquire Effect, `wallet` is in scope.
              // The release function can be defined within the same scope as `wallet`.

              // This is tricky because `wallet` isn't directly on `serviceInstance`.
              // A better approach for Layer.scoped:
              // The acquire effect would return the `wallet` instance.
              // The layer would then map this `wallet` to the `SparkService` interface.
              // This example assumes a simplified direct release path for brevity.
              // For a more robust solution, the acquire step would yield the `wallet`
              // and the layer's mapping would construct the service methods around it.

              // Simplified approach: if `wallet` is accessible here (e.g., captured from acquire)
              // This is a conceptual placeholder for how you'd access the wallet.
              // The real `wallet` from the acquire step must be used.
              // This part of the instruction requires careful implementation of Layer.scoped
              // or passing the wallet instance if `SparkServiceLive` is refactored further.

              // Let's assume for now we re-fetch config/telemetry and re-initialize a *temporary* wallet
              // for cleanup if the original isn't easily accessible in release. This is NOT ideal.
              // The BEST way is Layer.acquireRelease where acquire yields the wallet and release uses it.
              //
              // For the sake of this instruction, let's assume `wallet` is accessible.
              // If `wallet.cleanupConnections` exists:
              // yield* _(Effect.tryPromise({
              //   try: () => wallet.cleanupConnections(),
              //   catch: (e) => new SparkConnectionError({ message: "Failed to cleanup SparkWallet connections", cause: e })
              // }));
              // yield* _(telemetry.trackEvent({ category: 'spark:dispose', action: 'wallet_cleanup', label: Exit.isSuccess(exit) ? 'success' : 'failure' }));
              // For now, without refactoring acquire/release significantly, this part is illustrative.
              // If the agent made `wallet` part of the returned service object, it would be:
              // if (typeof (serviceInstance as any)._internalWalletRef?.cleanupConnections === 'function') {
              //    yield* _(Effect.tryPromise(() => (serviceInstance as any)._internalWalletRef.cleanupConnections()));
              // }
              yield* _(Effect.logInfo("SparkServiceLive released. Conceptual cleanup executed."));
            })
          )
        );
        ```
        *   **Note to Agent:** This resource management part requires careful structuring of `Layer.acquireRelease`. The `acquire` effect should create and return the `SparkWallet` instance. The `release` effect will receive this instance. The `Layer.scoped` will then map this `SparkWallet` instance to the `SparkService` interface, providing the actual method implementations. If this is too complex, focus on input validation and type-safe responses first. The provided mock has `cleanupConnectionsMock = vi.fn().mockResolvedValue(undefined);`. If the actual SDK has this, it should be used.

**II. Modify `src/tests/unit/services/spark/SparkService.test.ts`:**

1.  **Add Tests for Input Validation Failures:**
    *   For `createLightningInvoice`:
        *   Add a test case where `amountSats` is zero or negative.
        *   Assert that the effect fails with `SparkValidationError`.
        *   Assert that `telemetry.trackEvent` is called with an appropriate failure event (e.g., `create_invoice_failure`) and that the `label` or `value` indicates a validation error.
        *   Assert that `wallet.createLightningInvoice` is **not** called.
        ```typescript
        it('should fail with SparkValidationError for invalid params (e.g., zero amountSats)', async () => {
          const invalidParams: CreateLightningInvoiceParams = { amountSats: 0, memo: 'Invalid' };
          const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invalidParams));
          const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));

          expect(Exit.isFailure(exit)).toBe(true);
          const error = getFailure(exit);
          expect(error).toBeInstanceOf(SparkValidationError);
          if (error instanceof SparkValidationError) {
            expect(error.message).toContain("Invalid parameters for createLightningInvoice");
          }
          expect(createLightningInvoiceMock).not.toHaveBeenCalled(); // Ensure SDK method wasn't called
          expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
            action: 'create_invoice_failure', // Or a more specific validation_failure action
            label: expect.stringContaining("Invalid parameters")
          }));
        });
        ```
    *   For `payLightningInvoice`:
        *   Add a test case where `invoice` is an empty string or `maxFeeSats` is negative.
        *   Assert failure with `SparkValidationError` and appropriate telemetry.
        *   Assert `wallet.payLightningInvoice` is not called.

2.  **Add Granular Tests for SDK Error Mapping:**
    *   For each service method (`createLightningInvoice`, `payLightningInvoice`, `getBalance`, `getSingleUseDepositAddress`):
        *   For each relevant SDK error type (e.g., `SDK.NetworkError`, `SDK.AuthenticationError`, `SDK.ConfigurationError`, `SDK.RPCError`, `SDK.NotImplementedError` as mocked in `./mockSdk.ts`):
            *   Create a test case where the corresponding mocked SDK method (e.g., `createLightningInvoiceMock`) is set to `mockRejectedValueOnce(new MockNetworkError('SDK Network Error'))`).
            *   Run the service method.
            *   Assert that the effect fails with the correct custom error type (e.g., `SparkConnectionError`).
            *   Assert that the `cause` of the custom error is the original SDK mock error.
            *   Assert telemetry tracks the failure correctly.
            *   Example for `createLightningInvoice` and `SDK.AuthenticationError`:
                ```typescript
                it('should map SDK AuthenticationError to SparkAuthenticationError for createLightningInvoice', async () => {
                  const sdkAuthError = new MockAuthError("SDK Auth Failed");
                  createLightningInvoiceMock.mockRejectedValueOnce(sdkAuthError);

                  const params: CreateLightningInvoiceParams = { amountSats: 1000 };
                  const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(params));
                  const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));

                  expect(Exit.isFailure(exit)).toBe(true);
                  const error = getFailure(exit);
                  expect(error).toBeInstanceOf(SparkAuthenticationError);
                  if (error instanceof SparkAuthenticationError) {
                    expect(error.cause).toBe(sdkAuthError);
                    expect(error.message).toBe("SDK Auth Failed"); // Or your mapped message
                  }
                  expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_failure' }));
                });
                ```
        *   Repeat this pattern for other SDK errors and other service methods.

3.  **Test Wallet Initialization Failure (if resource management is added):**
    *   If `Layer.acquireRelease` is used for `SparkServiceLive`:
        *   Add a test case where `SparkWallet.initialize` (via `initializeMock`) is mocked to `mockRejectedValueOnce(new MockConfigError('SDK Init Fail'))`.
        *   Attempt to build the `testLayerForLive` or run an effect that requires the `SparkService`.
        *   Assert that the effect fails with `SparkConfigError` (this error would come from the layer's acquire step).
        *   Assert telemetry tracks `wallet_initialize_failure`. (This might need telemetry to be available even if the main service layer fails to build fully, which can be tricky).

By implementing these changes, the `SparkService` will be more robust, type-safe, and adhere more closely to Effect-TS best practices. The tests will provide greater confidence in its correctness, especially concerning input handling and error mapping.The `SparkService` and its tests show a good adoption of Effect-TS principles but also reveal some areas where shortcuts were taken or where further refinement can improve robustness and adherence to "Effect-ified" patterns.

**Overall Analysis:**

*   **Effect-ification Level:** The service is largely "Effect-ified." It uses `Effect.Tag` for service definition, `Layer` for dependency injection, `Effect.gen` and `Effect.tryPromise` for asynchronous operations, and custom tagged errors (`Data.TaggedError`) for error handling. Telemetry is integrated within the Effect chain.
*   **Shortcuts Identified:**
    1.  **Missing Input Schema Validation:** While schemas like `CreateLightningInvoiceParamsSchema` are defined in `SparkService.ts`, the provided `SparkServiceImpl.ts` (from 22:00 agent instructions, which is the code to be improved) does not use them to validate input parameters at runtime. This relies solely on TypeScript for type safety, which is insufficient for data coming from external sources or through IPC.
    2.  **Type Unsafe SDK Response Handling:** The `SparkServiceImpl.ts` (22:00 version) uses `as SDKType` casts for SDK responses. This is a significant shortcut as it bypasses proper type checking and mapping from the SDK's actual response structure to the service's internal types. The agent's 22:07 log mentioned addressing this for `payLightningInvoice`, but the provided code file still needs this fix applied universally.
    3.  **Potentially Incomplete SDK Field Mapping:** Even if `as SDKType` is removed, careful mapping of all necessary fields from SDK responses to internal types is crucial. For instance, ensuring `amountSats` in `LightningPayment` correctly reflects the *actual paid amount* from the SDK, not just a fee component.
    4.  **Resource Management:** The `SparkWallet` is initialized, but if it has a cleanup method (e.g., `cleanupConnections` as seen in the mock SDK), this is not managed by the `SparkServiceLive` layer's lifecycle (e.g., using `Effect.acquireRelease`).
*   **Tests:** The tests in `SparkService.test.ts` (after 22:00 agent fixes) use a good hybrid approach, mocking dependencies correctly with `Layer.succeed` and testing both a simplified mock implementation of the service and the `SparkServiceLive` layer. Telemetry calls are also asserted.

**Areas for Improvement & Specific Instructions for Coding Agent:**

**Target Files:**
*   `src/services/spark/SparkServiceImpl.ts`
*   `src/tests/unit/services/spark/SparkService.test.ts`
*   `src/services/spark/SparkService.ts` (for potential type adjustments)

**I. Enhance `SparkServiceImpl.ts`:**

1.  **Implement Input Schema Validation:**
    *   **Instruction:** For each public method in `SparkServiceImpl.ts` that accepts parameters with a defined schema (e.g., `createLightningInvoice`, `payLightningInvoice`), add input validation using `Schema.decodeUnknown` at the beginning of the `Effect.gen` block. If validation fails, the Effect should fail with a `SparkValidationError`.
    *   **Example for `createLightningInvoice`:**
        ```typescript
        // At the start of the createLightningInvoice Effect.gen block:
        const validatedParams = yield* _(
          Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params),
          Effect.mapError((parseError) => new SparkValidationError({
            message: "Invalid parameters for createLightningInvoice",
            cause: parseError, // Include the actual ParseError for details
            context: { originalParams: params, errorDetails: parseError.errors } // Add error details
          }))
        );
        // Use `validatedParams` throughout the rest of the method.
        // Ensure telemetry logs `validatedParams` or a summary.
        ```
    *   **Action:** Apply this pattern to `createLightningInvoice` and `payLightningInvoice`. Update telemetry logging to use `validatedParams`.

2.  **Ensure Type-Safe and Accurate SDK Response Mapping:**
    *   **Instruction:** For all methods calling `SparkWallet` SDK methods (`createLightningInvoice`, `payLightningInvoice`, `getBalance`, `getSingleUseDepositAddress`):
        1.  Remove all `as SDKType` or `as any` casts when handling `sdkResult`.
        2.  Consult the actual Spark SDK type definitions in `node_modules/@buildonspark/spark-sdk/` (particularly `spark-wallet.ts` and `src/graphql/objects/`) for the precise structure of `LightningReceiveRequest`, `LightningSendRequest`, and the return type of `getBalance`.
        3.  Perform explicit and type-safe mapping from the SDK's response fields to your internal types defined in `src/services/spark/SparkService.ts` (`LightningInvoice`, `LightningPayment`, `BalanceInfo`).
        4.  **Crucially for `payLightningInvoice`:** The `LightningPayment.payment.amountSats` field *must* be mapped from the SDK's field representing the actual amount paid in the transaction, not from `sdkResult.fee.originalValue`. The SDK's `LightningSendRequest` should contain a field for the primary payment amount. Adjust the mapping in your 22:07 log's approach if it was incorrect.
        5.  **For `createLightningInvoice`:** Ensure `LightningInvoice.invoice.amountSats` is mapped from the corresponding field in the SDK's `LightningReceiveRequest.invoice.amount` (likely `originalValue` if it's a `CurrencyAmount`).
        6.  **For `getBalance`:** Confirm the structure of `sdkResult.tokenBalances` and `tokenInfo` from the SDK and map to your `BalanceInfo` accordingly. Your `BalanceInfo.tokenBalances.tokenInfo.tokenId` should probably come from `value.tokenInfo.tokenPublicKey` or a similar unique identifier from the SDK.
    *   **Example Snippet (Conceptual - verify SDK field names):**
        ```typescript
        // For payLightningInvoice, if SDK returns amount in `sdkResult.amountSent`:
        // const sdkResult = await wallet.payLightningInvoice({ invoice: validatedParams.invoice, maxFeeSats: validatedParams.maxFeeSats });
        // const result: LightningPayment = {
        //   payment: {
        //     id: sdkResult.id || 'unknown-id',
        //     paymentHash: sdkResult.paymentPreimage || 'unknown-hash',
        //     amountSats: sdkResult.amountSent?.originalValue || 0, // Ensure this is the actual payment amount
        //     feeSats: sdkResult.fee?.originalValue || 0,
        //     // ... other fields mapped correctly
        //   }
        // };
        ```
    *   **Action:** Review and refactor the SDK response mapping in all relevant methods. Adjust internal types in `SparkService.ts` if necessary to accurately reflect what can be reliably mapped from the SDK.

3.  **Comprehensive SDK Error Mapping:**
    *   **Instruction:** In the `catch` block of `Effect.tryPromise` for each SDK call, ensure you have `instanceof` checks for all relevant error types exported by `@buildonspark/spark-sdk/src/errors/types.ts`. This includes `NetworkError`, `ValidationError`, `AuthenticationError`, `RPCError`, `ConfigurationError` (from SDK), and `NotImplementedError`.
    *   Map each specific SDK error to its corresponding custom `Spark...Error` subtype. For SDK's `ConfigurationError`, map it to your `SparkConfigError`.
    *   Include the original SDK error as `cause` and add relevant `context` (from `e.context` if available on SDK errors, or operation parameters).
    *   **Action:** Review all `catch` blocks in `SparkServiceImpl.ts` and ensure comprehensive error mapping.

4.  **Resource Management for `SparkWallet` (Conditional):**
    *   **Instruction:** Check if the `SparkWallet` class in `node_modules/@buildonspark/spark-sdk/src/spark-wallet.ts` has an explicit cleanup method like `close()` or `cleanupConnections()`.
    *   If such a method exists:
        *   Refactor `SparkServiceLive` in `SparkServiceImpl.ts` to use `Layer.scoped`.
        *   The `acquire` effect within `Layer.scoped` should perform the `SparkWallet.initialize` call and yield the `wallet` instance.
        *   The `release` effect should call `wallet.cleanupConnections()` (or the equivalent method) on the acquired wallet instance.
        *   The layer will then map the acquired `wallet` instance to the `SparkService` interface methods.
    *   **Example Structure (Conceptual):**
        ```typescript
        // export const SparkServiceLive = Layer.scoped( // Changed from Layer.effect
        //   SparkService,
        //   Effect.acquireRelease(
        //     Effect.gen(function* (_) { // ACQUIRE
        //       const sparkConfig = yield* _(SparkServiceConfigTag);
        //       const telemetry = yield* _(TelemetryService);
        //       yield* _(telemetry.trackEvent(/* wallet_initialize_start */));
        //       const { wallet: initializedWallet } = await SparkWallet.initialize({ /* ... */ });
        //       yield* _(telemetry.trackEvent(/* wallet_initialize_success */));
        //       return initializedWallet; // Return the wallet instance
        //     }),
        //     (acquiredWallet, exit) => Effect.gen(function* (_) { // RELEASE
        //       const telemetry = yield* _(TelemetryService); // If logging needed for release
        //       if (typeof acquiredWallet.cleanupConnections === 'function') {
        //         yield* _(Effect.tryPromise({
        //           try: () => acquiredWallet.cleanupConnections(),
        //           catch: (e) => new SparkConnectionError({ message: "Failed to cleanup SparkWallet connections", cause: e })
        //         }));
        //       }
        //       yield* _(telemetry.trackEvent(/* wallet_cleanup */));
        //     })
        //   ).pipe(
        //     Layer.map(acquiredWallet => { // Map the acquired wallet to the service interface
        //       const telemetry = Effect.runSync(Effect.provide(Effect.service(TelemetryService), telemetryLayer)); // This is a bit of a hack to get telemetry here, better to pass it if map supports R
        //       return SparkService.of({
        //         createLightningInvoice: (params) => { /* implement using acquiredWallet and telemetry */ },
        //         payLightningInvoice: (params) => { /* implement using acquiredWallet and telemetry */ },
        //         // ... other methods
        //       });
        //     })
        //   )
        // );

        // A simpler Layer.scoped if wallet is part of the service object:
        export const SparkServiceLive = Layer.scoped(
          SparkService,
          Effect.gen(function* (_) {
            const sparkConfig = yield* _(SparkServiceConfigTag);
            const telemetry = yield* _(TelemetryService);

            yield* _(telemetry.trackEvent({ /* ... wallet_initialize_start ... */ }));

            const wallet = yield* _(
              Effect.tryPromise({ /* ... SparkWallet.initialize ... */ })
                // Error handling as before
            );

            yield* _(telemetry.trackEvent({ /* ... wallet_initialize_success ... */ }));

            // Return the service implementation, potentially including the wallet for release
            const serviceImplementation = {
              _walletInstanceForCleanup: wallet, // Store for release
              createLightningInvoice: (params: CreateLightningInvoiceParams) => { /* ... use wallet ... */ },
              payLightningInvoice: (params: PayLightningInvoiceParams) => { /* ... use wallet ... */ },
              getBalance: () => { /* ... use wallet ... */ },
              getSingleUseDepositAddress: () => { /* ... use wallet ... */ },
            };

            // Ensure the returned object conforms to SparkService
            // This is a bit of a type workaround if _walletInstanceForCleanup is not part of SparkService
            // A cleaner way might be to have the acquire effect return the wallet,
            // and the Layer.map construct the service.
            // For now, this shows the intent.

            yield* _(Effect.addFinalizer(() => Effect.gen(function* (_release) {
              const releaseTelemetry = yield* _release(TelemetryService); // Get TelemetryService for release logging
              if (typeof wallet.cleanupConnections === 'function') {
                yield* _release(Effect.tryPromise({
                  try: () => wallet.cleanupConnections(),
                  catch: (e) => new SparkConnectionError({ message: "Failed to cleanup SparkWallet connections", cause: e })
                }));
              }
              yield* _release(releaseTelemetry.trackEvent({ category: 'spark:dispose', action: 'wallet_cleanup', label: 'success' }));
            }).pipe(Effect.catchAllCause(cause =>
                Effect.flatMap(TelemetryService, ts => ts.trackEvent({category: 'spark:dispose', action: 'wallet_cleanup_failure', value: Cause.pretty(cause) }))
            ))));

            return serviceImplementation as SparkService; // Cast if necessary, ensure methods match
          })
        );
        ```
    *   **Action:** Investigate `SparkWallet` for a cleanup method. If it exists, implement resource management using `Layer.scoped` and `Effect.addFinalizer` as shown conceptually above. Ensure telemetry tracks the cleanup.

**II. Enhance `src/tests/unit/services/spark/SparkService.test.ts`:**

1.  **Add Tests for Input Validation Failures:**
    *   **Instruction:** For `createLightningInvoice` and `payLightningInvoice`, add tests that pass invalid parameters (e.g., zero/negative `amountSats`, empty `invoice` string).
    *   Assert that the service method fails with `SparkValidationError`.
    *   Assert that the `cause` of the `SparkValidationError` is a `ParseError` from `effect/Schema`.
    *   Assert that the corresponding SDK mock method (e.g., `createLightningInvoiceMock`) was **not** called.
    *   Assert that `mockTrackEvent` was called with a failure event indicating a validation error.
    *   **Action:** Write these new test cases. Example already provided in thought process.

2.  **Add Granular Tests for Each SDK Error Mapping:**
    *   **Instruction:** For each method in `SparkService` that interacts with the SDK:
        *   Create separate test cases for each relevant SDK error type (e.g., `MockNetworkError`, `MockAuthenticationError`, `MockConfigurationError` (SDK's version), `MockRPCError`, `MockNotImplementedError`).
        *   In each test, mock the specific SDK method (e.g., `createLightningInvoiceMock`) to `mockRejectedValueOnce` with an instance of the SDK error.
        *   Assert that the service method fails with the corresponding custom `SparkError` (e.g., `SDK.NetworkError` -> `SparkConnectionError`).
        *   Assert that `error.cause` is the original SDK mock error.
        *   Assert that telemetry tracks the failure.
    *   **Action:** Add these specific error mapping tests for all service methods and relevant SDK errors.

3.  **Add Test for Wallet Initialization Failure (if resource management via `Layer.scoped` is added):**
    *   **Instruction:** If `SparkServiceLive` is refactored to use `Layer.scoped` for resource management:
        *   Create a test where `initializeMock` (for `SparkWallet.initialize`) is set to `mockRejectedValueOnce(new MockConfigError('SDK Init Fail From Test'))`.
        *   Attempt to run an Effect that requires the `SparkService` (e.g., `Effect.flatMap(SparkService, s => s.getBalance())`).
        *   Assert that this Effect fails, and the error should be the `SparkConfigError` (or the error type you map to in the acquire step) that was thrown during the `SparkWallet.initialize` call. The error will propagate from the layer's build process.
        *   Optionally, assert that telemetry logs `wallet_initialize_failure`.
    *   **Action:** Add this test if resource management is implemented for `SparkWallet`.

By following these instructions, the Spark service will become more robust, type-safe, and fully leverage Effect-TS patterns, with comprehensive test coverage for its behavior, including error handling and input validation.
