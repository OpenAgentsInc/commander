Okay, I see the test failures and the TypeScript errors. The primary issues seem to be:

1.  **Test Failures**: The schema validation tests are failing because the telemetry for operation failure (e.g., `create_invoice_failure`) is not being called as expected when schema validation fails. Instead, only `wallet_initialize_start` and `wallet_initialize_success` are logged by telemetry. This indicates an issue in how errors from schema validation are propagated or how telemetry is logged on such failures within `SparkServiceImpl.ts`.
2.  **TypeScript Errors in `SparkServiceImpl.ts`**:
    - The `Effect.addFinalizer` block is not correctly typed. The finalizer effect must have an error channel of `never`. The current `Effect.gen` used within it might introduce an error channel if `releaseTelemetry.trackEvent` or `Effect.promise(() => wallet.cleanupConnections())` can fail.
    - The `Effect.catchAllCause` within that finalizer is also incorrectly typed or used.
3.  **TypeScript Errors in `SparkService.test.ts`**: Multiple `TS2345` errors where an `Effect` is expected to have an `R` (environment) channel of `never` but is inferred as `unknown`. This usually means that the `testLayerForLive` is not fully satisfying all dependencies of `SparkServiceLive`, or there's a type mismatch in how the Effect program is constructed or provided.

Let's address these step by step.

**I. Fix TypeScript Errors in `SparkServiceImpl.ts` (Finalizer)**

The finalizer must return an `Effect<any, never, R2>`. The agent's previous log (`docs/logs/20250519/2233-log.md`) correctly identified that using `Effect.sync` for the finalizer's core logic and `console.log` for telemetry (as a fallback if `TelemetryService` cannot be reliably used during shutdown) is a robust way to achieve this.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Modify the Effect.addFinalizer block:
yield *
  _(
    Effect.addFinalizer(() => {
      // Use Effect.sync to ensure the finalizer itself doesn't have a typed error channel
      return Effect.sync(() => {
        if (typeof wallet.cleanupConnections === "function") {
          try {
            wallet
              .cleanupConnections()
              .then(() => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
                console.log(
                  "[SparkService Finalizer] Wallet connections cleaned up successfully.",
                );
                // Attempt to use telemetry via Effect.runFork (fire-and-forget)
                // This should ideally use the 'telemetry' instance captured by SparkServiceLive's Effect.gen
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "spark:dispose",
                    action: "wallet_cleanup_success",
                    label: `Network: ${sparkConfig.network}`,
                  }),
                );
              })
              .catch((error) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
                console.error(
                  "[SparkService Finalizer] Failed to cleanup wallet connections:",
                  error,
                );
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "spark:dispose",
                    action: "wallet_cleanup_failure",
                    label:
                      error instanceof Error
                        ? error.message
                        : "Unknown cleanup error",
                    value: String(error),
                  }),
                );
              });
          } catch (e) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
            console.error(
              "[SparkService Finalizer] Critical error during wallet.cleanupConnections sync call:",
              e,
            );
          }
        }
        return undefined; // Effect.sync requires a return value
      });
    }),
  );
```

**II. Fix Telemetry Logic for Schema Validation Failures in `SparkServiceImpl.ts`**

The schema validation should fail the main effect, and this failure should be caught by an outer `Effect.tapError` which then logs the appropriate failure telemetry. The `operation_start` telemetry should only be logged _after_ successful validation.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Example for createLightningInvoice:
createLightningInvoice: (params: CreateLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService); // Get telemetry from service context

    // 1. Validate params
    const validatedParams = yield* _(
        Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for createLightningInvoice",
                cause: parseError, // Keep the original ParseError for better diagnostics
                context: { originalParams: params, errorDetails: (parseError as any).errors } // Add more details if available
            }))
        )
    ); // If this fails, the whole Effect.gen fails with SparkValidationError

    // 2. Log operation start *after* validation
    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_start',
      label: `Amount: ${validatedParams.amountSats} sats`,
      value: JSON.stringify(validatedParams)
    }));

    // 3. Perform SDK call
    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => {
        return await wallet.createLightningInvoice(validatedParams);
      },
      // Map SDK errors
      catch: (e) => {
        const context = { params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context }); // SDK's ConfigurationError
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning invoice creation', cause: e, context });
        return new SparkLightningError({ message: 'Failed to create Lightning invoice via SparkSDK', cause: e, context });
      }
    }));

    // Map SDK result to our interface type
    const result: LightningInvoice = {
      invoice: {
        encodedInvoice: sdkResult.invoice.encodedInvoice,
        paymentHash: sdkResult.invoice.paymentHash,
        amountSats: sdkResult.invoice.amount?.originalValue ?? validatedParams.amountSats,
        createdAt: sdkResult.invoice.createdAt ? Date.parse(sdkResult.invoice.createdAt) / 1000 : Math.floor(Date.now() / 1000),
        expiresAt: sdkResult.invoice.expiresAt ? Date.parse(sdkResult.invoice.expiresAt) / 1000 : Math.floor(Date.now() / 1000) + (validatedParams.expirySeconds || 3600),
        memo: sdkResult.invoice.memo || validatedParams.memo
      }
    };

    // Log success
    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_success',
      label: `Invoice created: ${result.invoice.encodedInvoice.substring(0, 20)}...`,
      value: result.invoice.paymentHash
    }));

    return result;
  }).pipe(
    Effect.tapError(err =>
      // Use the telemetry instance from the main Effect.gen's context for logging the final failure
      // This ensures it uses the same TelemetryService instance provided to SparkServiceLive
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:lightning',
          action: 'create_invoice_failure', // Generic failure action for this operation
          label: err.message,
          value: JSON.stringify({
            errorMessage: err.message,
            errorName: (err as Error).name,
            errorContext: (err as SparkError).context,
            errorCause: String((err as SparkError).cause)
          })
        }).pipe(Effect.catchAllCause(() => Effect.void)) // Catch & ignore errors from telemetry itself
      )() // Immediately invoke the returned Effect
    )
  ),

// Apply similar logic to payLightningInvoice:
payLightningInvoice: (params: PayLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);

    const validatedParams = yield* _(
        Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for payLightningInvoice",
                cause: parseError,
                context: { originalParams: params, errorDetails: (parseError as any).errors }
            }))
        )
    );

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'pay_invoice_start',
      label: `Invoice: ${validatedParams.invoice.substring(0, 20)}...`,
      value: JSON.stringify({ maxFeeSats: validatedParams.maxFeeSats, timeoutSeconds: validatedParams.timeoutSeconds })
    }));

    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => {
        return await wallet.payLightningInvoice({
          invoice: validatedParams.invoice,
          maxFeeSats: validatedParams.maxFeeSats
        });
      },
      catch: (e) => {
        const invoicePrefix = validatedParams.invoice.substring(0, 20) + '...';
        const context = { invoice: invoicePrefix, params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context });
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning payment', cause: e, context });
        return new SparkLightningError({ message: 'Failed to pay Lightning invoice via SparkSDK', cause: e, context });
      }
    }));

    const result: LightningPayment = {
      payment: {
        id: sdkResult.id || 'unknown-id',
        paymentHash: sdkResult.paymentPreimage || 'unknown-hash',
        amountSats: sdkResult.amount?.originalValue || sdkResult.transfer?.totalAmount?.originalValue || 0,
        feeSats: sdkResult.fee?.originalValue || 0,
        createdAt: sdkResult.createdAt ? Date.parse(sdkResult.createdAt) / 1000 : Math.floor(Date.now() / 1000),
        status: String(sdkResult.status).toUpperCase().includes('SUCCESS') ? 'SUCCESS' : (String(sdkResult.status).toUpperCase().includes('PEND') ? 'PENDING' : 'FAILED'),
        destination: sdkResult.destinationNodePubkey || sdkResult.transfer?.sparkId || (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0, 20) + '...' : 'unknown-destination')
      }
    };

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'pay_invoice_success',
      label: `Payment status: ${result.payment.status}`,
      value: `Amount: ${result.payment.amountSats}, Fee: ${result.payment.feeSats}`
    }));

    return result;
  }).pipe(
    Effect.tapError(err =>
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:lightning',
          action: 'pay_invoice_failure',
          label: err.message,
          value: JSON.stringify({
            errorMessage: err.message,
            errorName: (err as Error).name,
            errorContext: (err as SparkError).context,
            errorCause: String((err as SparkError).cause)
          })
        }).pipe(Effect.catchAllCause(() => Effect.void))
      )()
    )
  ),
// Apply the same .pipe(Effect.tapError(...)) structure to getBalance and getSingleUseDepositAddress,
// adjusting category and action names accordingly.
```

**III. Fix TypeScript Errors in `SparkService.test.ts`**

The `safeRunEffect` helper casts the `R` channel to `never`. This should be acceptable if `testLayerForLive` correctly provides all dependencies. The TS errors (`TS2345`) were likely stemming from the `Effect.addFinalizer` issue in `SparkServiceImpl.ts` which affected the inferred type of `SparkServiceLive`. With the finalizer fixed, these test-level errors might resolve, or `safeRunEffect` will continue to bridge the gap. For now, leave `safeRunEffect` as is.

**IV. Run Type Checks and Tests**

After applying the above changes to `SparkServiceImpl.ts`:

1.  Run `pnpm t` to check for TypeScript errors.
2.  Run `pnpm test src/tests/unit/services/spark/SparkService.test.ts`.

**Expected Outcome:**

- TypeScript errors in `SparkServiceImpl.ts` related to the finalizer should be resolved.
- The two failing tests related to schema validation should now pass because:
  - Schema validation errors will cause the main `Effect.gen` block of the service method to fail.
  - The `operation_start` telemetry will be skipped.
  - The SDK mock (`createLightningInvoiceMock` or `payLightningInvoiceMock`) will not be called.
  - The outer `Effect.tapError` will catch the `SparkValidationError` and log a `*_failure` event (e.g., `create_invoice_failure`), which the test asserts. The telemetry payload should now include the detailed error context.

If new TypeScript errors arise in the test file due to `testLayerForLive` and `R` channel mismatches after the `SparkServiceImpl.ts` fixes, those will need to be addressed by ensuring the `SparkServiceLive` layer is correctly typed and all its dependencies are satisfied by `testLayerForLive` without needing the `unknown` cast in `safeRunEffect`. However, the `safeRunEffect` cast is a common pattern in tests when dealing with complex layers.Okay, I've reviewed the errors and the instructions. The core issues are:

1.  **TypeScript errors in `SparkServiceImpl.ts` related to the `Effect.addFinalizer` block**: The finalizer's effect must have an error channel of `never`.
2.  **TypeScript errors in `SparkService.test.ts`**: The `R` channel (environment) of effects being run is inferred as `unknown` instead of `never`, causing `TS2345` errors. This typically means that `testLayerForLive` isn't seen by TypeScript as fully satisfying all dependencies of `SparkServiceLive`.
3.  **Test Failures**: The schema validation tests are failing because the telemetry isn't logging the expected `*_invoice_failure` action when validation fails. Instead, only `wallet_initialize_start` and `wallet_initialize_success` are seen. This implies that the error handling and telemetry logging for schema validation failures within the service methods (`createLightningInvoice`, `payLightningInvoice`) are not working as intended.

Let's fix these.

**Step 1: Fix TypeScript Errors in `SparkServiceImpl.ts` (Finalizer)**

I'll apply the `Effect.sync` approach for the finalizer, ensuring its error channel is `never`, and use `Effect.runFork` for telemetry as it's a fire-and-forget operation that shouldn't affect the finalizer's success.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Inside SparkServiceLive, replace the Effect.addFinalizer block with:
yield *
  _(
    Effect.addFinalizer(() => {
      // Use Effect.sync to ensure the finalizer itself doesn't have a typed error channel of its own.
      // The operations inside (like wallet.cleanupConnections() or telemetry.trackEvent)
      // will be run, but their success/failure won't make the finalizer itself fail in a typed way.
      return Effect.sync(() => {
        if (typeof wallet.cleanupConnections === "function") {
          wallet
            .cleanupConnections()
            .then(() => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.log(
                `[SparkService Finalizer] Wallet connections cleaned up successfully for network: ${sparkConfig.network}.`,
              );
              // Attempt to use telemetry via Effect.runFork (fire-and-forget)
              Effect.runFork(
                telemetry.trackEvent({
                  category: "spark:dispose",
                  action: "wallet_cleanup_success",
                  label: `Network: ${sparkConfig.network}`,
                }),
              );
            })
            .catch((error) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.error(
                `[SparkService Finalizer] Failed to cleanup wallet connections for network: ${sparkConfig.network}:`,
                error,
              );
              Effect.runFork(
                telemetry.trackEvent({
                  category: "spark:dispose",
                  action: "wallet_cleanup_failure",
                  label:
                    error instanceof Error
                      ? error.message
                      : "Unknown cleanup error",
                  value: String(error),
                  context: { network: sparkConfig.network },
                }),
              );
            });
        }
        return undefined; // Effect.sync requires a return value
      });
    }),
  );
```

**Step 2: Fix Telemetry Logic for Schema Validation Failures in `SparkServiceImpl.ts`**

The schema validation errors need to be caught, and appropriate failure telemetry logged. The operation-specific `_start` telemetry should not run if validation fails.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// For createLightningInvoice method:
createLightningInvoice: (params: CreateLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);

    // 1. Validate params. If this fails, the Effect.gen fails here.
    const validatedParams = yield* _(
        Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for createLightningInvoice",
                cause: parseError,
                context: { originalParams: params, errorDetails: (parseError as any).errors }
            }))
        )
    );

    // 2. Log operation start *only after* successful validation.
    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_start',
      label: `Amount: ${validatedParams.amountSats} sats`,
      value: JSON.stringify(validatedParams)
    }));

    // 3. Perform SDK call
    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => {
        return await wallet.createLightningInvoice(validatedParams);
      },
      catch: (e) => { // mapSDKErrorToSparkError equivalent logic
        const context = { params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context });
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning invoice creation', cause: e, context });
        return new SparkLightningError({ message: 'Failed to create Lightning invoice via SparkSDK', cause: e, context });
      }
    }));

    const result_createInvoice: LightningInvoice = { /* ... mapping ... */ }; // As previously defined

    // Log success
    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_success',
      label: `Invoice created: ${result_createInvoice.invoice.encodedInvoice.substring(0, 20)}...`,
      value: result_createInvoice.invoice.paymentHash
    }));

    return result_createInvoice;
  }).pipe(
    // This outer tapError handles *any* error from the Effect.gen,
    // including SparkValidationError from schema check or mapped SDK errors.
    Effect.tapError(err =>
      // Use Effect.serviceFunctionEffect to correctly manage context for telemetry
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:lightning',
          action: 'create_invoice_failure', // This matches the test expectation
          label: err.message,
          value: JSON.stringify({
            errorMessage: err.message,
            errorName: (err as Error).name,
            errorContext: (err as SparkError).context,
            errorCauseString: String((err as SparkError).cause) // Keep it simple for IPC
          })
        }).pipe(Effect.catchAllCause(() => Effect.void)) // Catch & ignore errors from telemetry itself
      )() // Immediately invoke the returned Effect
    )
  ),

// Apply the same structure to payLightningInvoice method:
payLightningInvoice: (params: PayLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);

    const validatedParams = yield* _(
        Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for payLightningInvoice",
                cause: parseError,
                context: { originalParams: params, errorDetails: (parseError as any).errors }
            }))
        )
    );

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'pay_invoice_start',
      label: `Invoice: ${validatedParams.invoice.substring(0, 20)}...`,
      value: JSON.stringify({ maxFeeSats: validatedParams.maxFeeSats, timeoutSeconds: validatedParams.timeoutSeconds })
    }));

    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => {
        return await wallet.payLightningInvoice({
          invoice: validatedParams.invoice,
          maxFeeSats: validatedParams.maxFeeSats
        });
      },
      catch: (e) => { // mapSDKErrorToSparkError equivalent
        const invoicePrefix = validatedParams.invoice.substring(0, 20) + '...';
        const context = { invoice: invoicePrefix, params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        // ... other error mappings as in createLightningInvoice ...
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context });
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning payment', cause: e, context });
        return new SparkLightningError({ message: 'Failed to pay Lightning invoice via SparkSDK', cause: e, context });
      }
    }));

    const result_payInvoice: LightningPayment = { /* ... mapping ... */ }; // As previously defined

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'pay_invoice_success',
      label: `Payment status: ${result_payInvoice.payment.status}`,
      value: `Amount: ${result_payInvoice.payment.amountSats}, Fee: ${result_payInvoice.payment.feeSats}`
    }));

    return result_payInvoice;
  }).pipe(
    Effect.tapError(err =>
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:lightning',
          action: 'pay_invoice_failure',
          label: err.message,
          value: JSON.stringify({
            errorMessage: err.message,
            errorName: (err as Error).name,
            errorContext: (err as SparkError).context,
            errorCauseString: String((err as SparkError).cause)
          })
        }).pipe(Effect.catchAllCause(() => Effect.void))
      )()
    )
  ),

// Apply a similar .pipe(Effect.tapError(...)) to getBalance and getSingleUseDepositAddress
// Adjust category and action:
// For getBalance: category 'spark:balance', action 'get_balance_failure'
// For getSingleUseDepositAddress: category 'spark:deposit', action 'get_deposit_address_failure'
```

_(Self-correction: The `errorDetails: (parseError as any).errors` was removed as it might be too complex for simple stringification in telemetry. The stringification of the cause in the final telemetry log should be simplified to `String(err.cause)` to avoid issues with complex objects)._

**Step 3: Address TypeScript Errors in `SparkService.test.ts`**

The `safeRunEffect` helper in `SparkService.test.ts` uses `as Effect.Effect<A, E, never>`. This cast should ideally not be needed if `testLayerForLive` correctly provides all dependencies, making the resulting `R` channel `never`.
The `testLayerForLive` composition:
`Layer.provide(SparkServiceLive, dependenciesLayerForLiveTests)`
where `dependenciesLayerForLiveTests` is `Layer.merge(MockSparkConfigLayer, TelemetryTestLayer)`.
And `SparkServiceLive` is `Layer.scoped(SparkService, Effect.gen(...))`.
The methods returned by the `Effect.gen` inside `SparkServiceLive` should inherently have their `R` channel (which includes `SparkServiceConfigTag` and `TelemetryService`) satisfied by the `Effect.gen`'s context. Thus, when `SparkService` (Tag) is resolved, the methods on the service instance should have `R = never`.

The errors `TS2345: Argument of type 'Effect<..., unknown>' is not assignable to parameter of type 'Effect<..., never>'` suggest that TypeScript is not inferring `R` as `never` for the provided effects in the tests. This usually happens when a Layer doesn't fully satisfy the requirements of the Effect it's being provided to, or if there's a Tag that hasn't been given a concrete service.

Given `SparkServiceLive` has `RIn = SparkServiceConfig | TelemetryService` (which ultimately means `SparkServiceConfigTag | TelemetryServiceConfigTag`), and `dependenciesLayerForLiveTests` provides these, `testLayerForLive` should be `Layer<SparkService, SparkConfigError, never>`.
Then `program.pipe(Effect.provide(testLayerForLive))` should yield an `Effect<A, E | SparkConfigError, never>`.
This is compatible with `Effect.runPromiseExit`.

The use of `Effect.serviceFunctionEffect` inside `tapError` in `SparkServiceImpl.ts` ensures that `TelemetryService` is properly scoped for that telemetry call. This is a good pattern.

It's possible the `unknown` in tests comes from the type of `program` itself:
`const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invalidParams));`
If `s.createLightningInvoice` is correctly typed as `Effect<LightningInvoice, SparkError | TrackEventError, never>`, then `program` should be `Effect<LightningInvoice, SparkError | TrackEventError, SparkService>`.
Providing `testLayerForLive` (which is `Layer<SparkService, SparkConfigError, never>`) should result in `Effect<LightningInvoice, SparkError | TrackEventError | SparkConfigError, never>`.

The `safeRunEffect` helper should remain for now, as it helps bypass potential complex type inference issues in the test environment with Vitest and Effect. The primary goal is to fix the runtime test failures by correcting the service logic.

**Step 4: Run Type Checks and Tests**

After applying the above changes to `SparkServiceImpl.ts`:

1.  Run `pnpm t`.
2.  Run `pnpm test src/tests/unit/services/spark/SparkService.test.ts`.

The TypeScript error for the finalizer in `SparkServiceImpl.ts` should be gone. The test failures should be resolved because the telemetry for validation failures will now be logged correctly, and the SDK methods will not be called when schema validation fails. The `mockTrackEvent` will see the `create_invoice_failure` (or `pay_invoice_failure`) as the first relevant event after initialization logs.

Let's apply the fixes.

```typescript
// File: src/services/spark/SparkServiceImpl.ts
// (Changes outlined above for finalizer and method telemetry)
// Ensure all service methods (getBalance, getSingleUseDepositAddress) also have the
// .pipe(Effect.tapError(err => Effect.serviceFunctionEffect(TelemetryService, telemetryService => ...)))
// structure for consistent failure telemetry.

// Example for getBalance:
getBalance: () =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);
    yield* _(telemetryFromContext.trackEvent({ /* get_balance_start */ }));
    // ... SDK call and success telemetry ...
    return sdk_mapped_balance_result;
  }).pipe(
    Effect.tapError(err =>
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:balance',
          action: 'get_balance_failure',
          label: err.message,
          value: JSON.stringify({ /* error details */ })
        }).pipe(Effect.catchAllCause(() => Effect.void))
      )()
    )
  ),

// Example for getSingleUseDepositAddress:
getSingleUseDepositAddress: () =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);
    yield* _(telemetryFromContext.trackEvent({ /* get_deposit_address_start */ }));
    // ... SDK call and success telemetry ...
    return sdk_address_result;
  }).pipe(
    Effect.tapError(err =>
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:deposit',
          action: 'get_deposit_address_failure',
          label: err.message,
          value: JSON.stringify({ /* error details */ })
        }).pipe(Effect.catchAllCause(() => Effect.void))
      )()
    )
  ),

```

I will proceed with these modifications.Okay, I'll address the TypeScript errors and test failures.

**I. Fix TypeScript Errors in `SparkServiceImpl.ts` (Finalizer)**

The finalizer's effect must have an error channel of `never`. The previous attempt to use `Effect.gen` with `yield* _release(...)` inside `Effect.addFinalizer` was incorrect because those yielded effects could fail, violating the finalizer's type signature. The agent's `2233-log.md` correctly identified that `Effect.sync` is a good way to ensure this. We will use `Effect.runFork` for telemetry as it's a fire-and-forget operation.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// Inside SparkServiceLive Layer.scoped, replace the Effect.addFinalizer block:
yield *
  _(
    Effect.addFinalizer(() =>
      // Use Effect.sync to ensure the finalizer itself doesn't have a typed error channel.
      Effect.sync(() => {
        // The 'telemetry' instance is captured from the outer scope of SparkServiceLive's Effect.gen
        // The 'sparkConfig' is also captured.
        if (typeof wallet.cleanupConnections === "function") {
          wallet
            .cleanupConnections()
            .then(() => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.log(
                `[SparkService Finalizer] Wallet connections cleaned up successfully for network: ${sparkConfig.network}.`,
              );
              // Attempt to use telemetry via Effect.runFork (fire-and-forget)
              // This runs the telemetry effect in a new fiber that doesn't affect the finalizer's type.
              Effect.runFork(
                telemetry.trackEvent({
                  category: "spark:dispose",
                  action: "wallet_cleanup_success",
                  label: `Network: ${sparkConfig.network}`,
                }),
              );
            })
            .catch((error) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.error(
                `[SparkService Finalizer] Failed to cleanup wallet connections for network: ${sparkConfig.network}:`,
                error,
              );
              Effect.runFork(
                telemetry.trackEvent({
                  category: "spark:dispose",
                  action: "wallet_cleanup_failure",
                  label:
                    error instanceof Error
                      ? error.message
                      : "Unknown cleanup error",
                  value: String(error), // Keep value simple for stringification
                  context: { network: sparkConfig.network },
                }),
              );
            });
        }
        return undefined; // Effect.sync requires a return value.
      }),
    ),
  );
```

**II. Fix Telemetry Logic for Schema Validation Failures in `SparkServiceImpl.ts`**

The schema validation should occur first. If it fails, the main effect for the operation fails, and an outer `Effect.tapError` logs the failure. The operation-specific `_start` telemetry should only log _after_ successful validation.

```typescript
// File: src/services/spark/SparkServiceImpl.ts

// For createLightningInvoice method:
createLightningInvoice: (params: CreateLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);

    const validatedParams = yield* _(
        Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for createLightningInvoice",
                cause: parseError,
                context: { originalParams: params, errorDetailsString: String((parseError as any).errors) }
            }))
        )
    );

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_start',
      label: `Amount: ${validatedParams.amountSats} sats`,
      value: JSON.stringify(validatedParams)
    }));

    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => await wallet.createLightningInvoice(validatedParams),
      catch: (e) => {
        const context = { params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context });
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning invoice creation', cause: e, context });
        return new SparkLightningError({ message: 'Failed to create Lightning invoice via SparkSDK', cause: e, context });
      }
    }));

    const result_createInvoice: LightningInvoice = {
      invoice: {
        encodedInvoice: sdkResult.invoice.encodedInvoice,
        paymentHash: sdkResult.invoice.paymentHash,
        amountSats: sdkResult.invoice.amount?.originalValue ?? validatedParams.amountSats,
        createdAt: sdkResult.invoice.createdAt ? Date.parse(sdkResult.invoice.createdAt) / 1000 : Math.floor(Date.now() / 1000),
        expiresAt: sdkResult.invoice.expiresAt ? Date.parse(sdkResult.invoice.expiresAt) / 1000 : Math.floor(Date.now() / 1000) + (validatedParams.expirySeconds || 3600),
        memo: sdkResult.invoice.memo || validatedParams.memo
      }
    };

    yield* _(telemetryFromContext.trackEvent({
      category: 'spark:lightning',
      action: 'create_invoice_success',
      label: `Invoice created: ${result_createInvoice.invoice.encodedInvoice.substring(0, 20)}...`,
      value: result_createInvoice.invoice.paymentHash
    }));

    return result_createInvoice;
  }).pipe(
    Effect.tapError(err =>
      Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
        telemetryService.trackEvent({
          category: 'spark:lightning',
          action: 'create_invoice_failure',
          label: err.message,
          value: JSON.stringify({
            errorMessage: err.message,
            errorName: (err as Error).name,
            errorContext: (err as SparkError).context,
            errorCauseString: String((err as SparkError).cause)
          })
        }).pipe(Effect.catchAllCause(() => Effect.void))
      )()
    )
  ),

// Apply the same .pipe(Effect.tapError(...)) structure to payLightningInvoice, getBalance, and getSingleUseDepositAddress
// In payLightningInvoice:
payLightningInvoice: (params: PayLightningInvoiceParams) =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);
    const validatedParams = yield* _(
        Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params).pipe(
            Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for payLightningInvoice",
                cause: parseError,
                context: { originalParams: params, errorDetailsString: String((parseError as any).errors) }
            }))
        )
    );
    yield* _(telemetryFromContext.trackEvent({ /* pay_invoice_start */ }));
    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => await wallet.payLightningInvoice({ invoice: validatedParams.invoice, maxFeeSats: validatedParams.maxFeeSats }),
      catch: (e) => { /* error mapping as before */
        const invoicePrefix = validatedParams.invoice.substring(0, 20) + '...';
        const context = { invoice: invoicePrefix, params: validatedParams, sdkErrorName: (e as Error).name };
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context });
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context });
        if (e instanceof SparkSDKError) return new SparkLightningError({ message: 'SDK error during Lightning payment', cause: e, context });
        return new SparkLightningError({ message: 'Failed to pay Lightning invoice via SparkSDK', cause: e, context });
      }
    }));
    const result_payInvoice: LightningPayment = {
      payment: {
        id: sdkResult.id || 'unknown-id',
        paymentHash: sdkResult.paymentPreimage || 'unknown-hash',
        amountSats: sdkResult.amount?.originalValue || sdkResult.transfer?.totalAmount?.originalValue || 0,
        feeSats: sdkResult.fee?.originalValue || 0,
        createdAt: sdkResult.createdAt ? Date.parse(sdkResult.createdAt) / 1000 : Math.floor(Date.now() / 1000),
        status: String(sdkResult.status).toUpperCase().includes('SUCCESS') ? 'SUCCESS' : (String(sdkResult.status).toUpperCase().includes('PEND') ? 'PENDING' : 'FAILED'),
        destination: sdkResult.destinationNodePubkey || sdkResult.transfer?.sparkId || (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0, 20) + '...' : 'unknown-destination')
      }
    };
    yield* _(telemetryFromContext.trackEvent({ /* pay_invoice_success */ }));
    return result_payInvoice;
  }).pipe(
    Effect.tapError(err => Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
      telemetryService.trackEvent({ category: 'spark:lightning', action: 'pay_invoice_failure', label: err.message, value: JSON.stringify({errorMessage: err.message, errorName: (err as Error).name,errorContext: (err as SparkError).context,errorCauseString: String((err as SparkError).cause)})
      }).pipe(Effect.catchAllCause(() => Effect.void)))())
  ),

// For getBalance:
getBalance: () =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);
    yield* _(telemetryFromContext.trackEvent({ category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance' }));
    const sdkResult = yield* _(Effect.tryPromise({
      try: async () => await wallet.getBalance(),
      catch: (e) => { /* error mapping */
        const errorContext = {sdkErrorName: (e as Error).name};
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context: errorContext});
        if (e instanceof SparkSDKError) return new SparkBalanceError({ message: 'SDK error fetching balance', cause: e, context: errorContext });
        return new SparkBalanceError({ message: 'Failed to get balance via SparkSDK', cause: e, context: errorContext });
      }
    }));
    const result_balance: BalanceInfo = { /* mapping */ balance: sdkResult.balance, tokenBalances: new Map() /* simplified */ };
     if (sdkResult.tokenBalances) {
        for (const [key, value] of sdkResult.tokenBalances.entries()) {
            result_balance.tokenBalances.set(key, {
                balance: value.balance,
                tokenInfo: {
                    tokenId: value.tokenInfo.tokenPublicKey || key,
                    name: value.tokenInfo.tokenName || 'Unknown Token',
                    symbol: value.tokenInfo.tokenSymbol || 'UNK',
                    decimals: value.tokenInfo.tokenDecimals || 0
                }
            });
        }
    }
    yield* _(telemetryFromContext.trackEvent({ category: 'spark:balance', action: 'get_balance_success', label: `Balance: ${result_balance.balance} sats` }));
    return result_balance;
  }).pipe(
    Effect.tapError(err => Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
      telemetryService.trackEvent({ category: 'spark:balance', action: 'get_balance_failure', label: err.message, value: JSON.stringify({errorMessage: err.message, errorName: (err as Error).name,errorContext: (err as SparkError).context,errorCauseString: String((err as SparkError).cause)})
      }).pipe(Effect.catchAllCause(() => Effect.void)))())
  ),

// For getSingleUseDepositAddress:
getSingleUseDepositAddress: () =>
  Effect.gen(function* (_) {
    const telemetryFromContext = yield* _(TelemetryService);
    yield* _(telemetryFromContext.trackEvent({ category: 'spark:deposit', action: 'get_deposit_address_start', label: 'Generating new address' }));
    const address = yield* _(Effect.tryPromise({
      try: () => wallet.getSingleUseDepositAddress(),
      catch: (e) => { /* error mapping */
        const errorContext = {sdkErrorName: (e as Error).name};
        if (e instanceof NetworkError) return new SparkConnectionError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof AuthenticationError) return new SparkAuthenticationError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof RPCError) return new SparkRPCError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof ValidationError) return new SparkValidationError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof NotImplementedError) return new SparkNotImplementedError({ message: e.message, cause: e, context: errorContext });
        if (e instanceof ConfigurationError) return new SparkConfigError({ message: e.message, cause: e, context: errorContext});
        if (e instanceof SparkSDKError) return new SparkTransactionError({ message: 'SDK error generating deposit address', cause: e, context: errorContext });
        return new SparkTransactionError({ message: 'Failed to generate deposit address via SparkSDK', cause: e, context: errorContext });
      }
    }));
    yield* _(telemetryFromContext.trackEvent({ category: 'spark:deposit', action: 'get_deposit_address_success', label: `Address: ${address.substring(0, 10)}...` }));
    return address;
  }).pipe(
    Effect.tapError(err => Effect.serviceFunctionEffect(TelemetryService, telemetryService =>
      telemetryService.trackEvent({ category: 'spark:deposit', action: 'get_deposit_address_failure', label: err.message, value: JSON.stringify({errorMessage: err.message, errorName: (err as Error).name,errorContext: (err as SparkError).context,errorCauseString: String((err as SparkError).cause)})
      }).pipe(Effect.catchAllCause(() => Effect.void)))())
  ),
```

**III. Update Tests in `src/tests/unit/services/spark/SparkService.test.ts`**

The `safeRunEffect` helper will continue to be used. The tests for schema validation should now pass due to the corrected telemetry logic in the service.

```typescript
// File: src/tests/unit/services/spark/SparkService.test.ts

// No changes needed here if the schema validation tests were already expecting `*_invoice_failure`.
// The key change is that `SparkServiceImpl.ts` now correctly logs this action
// when schema validation fails, and *before* attempting to log `*_invoice_start`.
// The existing assertions like:
// expect(createLightningInvoiceMock).not.toHaveBeenCalled();
// expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_failure', ... }));
// should now pass.
```

After these changes, run `pnpm t` and `pnpm test src/tests/unit/services/spark/SparkService.test.ts`.

The TypeScript errors related to the finalizer should be resolved.
The test failures related to schema validation telemetry should be resolved.
The TypeScript errors in the test file related to the `R` channel (if they were indeed caused by the finalizer's incorrect typing affecting `SparkServiceLive`'s inferred type) might also be resolved. If they persist, `safeRunEffect` will handle them for the test execution.
