Okay, I've analyzed the telemetry and the provided context. The "1031 payfail" event, combined with the provider "sitting there waiting for payment," strongly suggests that the NIP-90 DVM (the provider) has correctly issued a payment request (likely a Kind 7000 event with a Lightning invoice), but the NIP-90 consumer (your app, when acting as a job requester) is failing to complete the payment.

The consumer-side telemetry (`1031-telemetry-payfail-consumer.md`) is particularly revealing:
1.  The runtime initially builds with a MOCK `SparkService`.
2.  Then, it reinitializes with the USER's mnemonic (`pyramid go...`).
3.  The `SparkService` initializes successfully with this user mnemonic.
4.  Crucially, the balance checks *after* this user wallet initialization are successful and show 500 sats.
5.  However, there are **no telemetry events from `useNip90ConsumerChat.ts` indicating an attempt to pay an invoice** (e.g., `payment_start`, `payment_success`, `payment_failure`).

This implies the payment process within `useNip90ConsumerChat.ts` is either not being triggered correctly, or it's failing very early, possibly due to using a stale or incorrect `SparkService` instance.

The root cause often lies in how Effect runtimes and services are scoped and accessed, especially in React components/hooks that might capture an older instance of the runtime. The fix in `docs/logs/20250523/0845-fix.md` for wallet display components (getting a fresh runtime for each query) is a key pattern that needs to be applied consistently.

## Analysis of Why "Payfail" Occurs (Handshake Failure)

1.  **Stale Runtime Instance in `useNip90ConsumerChat`:**
    *   The `useNip90ConsumerChat` hook likely captures the `mainRuntimeInstance` in a `useRef` or as a constant during its initial render.
    *   When the application starts, `globalWalletConfig.mnemonic` is `null`. The `FullAppLayer` in `runtime.ts` (as per the fix in `0845-fix.md`) correctly builds with `SparkServiceTestLive` (the mock). `useNip90ConsumerChat` captures this runtime.
    *   Later, when the user sets up their wallet (e.g., "pyramid go..."), `walletStore.ts` updates `globalWalletConfig.mnemonic` and calls `reinitializeRuntime()`. This creates a *new* `mainRuntimeInstance` globally, this time with the real `SparkServiceLive` configured with the user's mnemonic.
    *   **The Problem:** The `useNip90ConsumerChat` hook instance, which is already mounted and active for the NIP-90 consumer pane, *still holds a reference to the old runtime* that has the `SparkServiceTestLive` (mock) or a `SparkServiceLive` configured with no mnemonic/test mnemonic.
    *   When a DVM job requires payment and `handlePayment` in `useNip90ConsumerChat.ts` is triggered, it uses this stale runtime to resolve `SparkService.Tag`.
    *   Consequently, `payLightningInvoice` is called on the mock service or an unconfigured/test-mnemonic real service, not the user's actual funded wallet. The payment doesn't actually happen on the Lightning Network, or it happens on a test wallet.
    *   The DVM provider, checking its real invoice, never sees it paid.

2.  **Consequences:**
    *   The DVM (provider) correctly generates an invoice and sends a `payment-required` feedback (Kind 7000).
    *   The consumer UI might show the payment prompt.
    *   When the user attempts to pay, the action is routed through the stale runtime's `SparkService`.
        *   If it's `SparkServiceTestLive`, the mock `payLightningInvoice` might "succeed" locally within the mock, but no real payment occurs. The consumer UI might even incorrectly show "payment successful."
        *   If it's a `SparkServiceLive` instance that was somehow initialized with a test mnemonic (due to earlier bugs or fallback logic that might have existed), the payment would go to/from the test wallet.
    *   The DVM's invoice remains unpaid.
    *   The DVM "sits there waiting for payment" because its `checkInvoiceStatus` (for the real invoice) consistently returns "pending."
    *   The "handshake" (request -> payment-required -> payment -> result) breaks at the payment step.

## Instructions to the Coding Agent to Fix This

The core fix is to ensure that `useNip90ConsumerChat.ts` (and any other long-lived hooks or services that perform runtime-dependent actions) uses the *current* `mainRuntimeInstance` when executing Effects, especially for actions like payment.

**File: `src/hooks/useNip90ConsumerChat.ts`**

1.  **Remove `runtimeRef`:**
    *   Delete the line: `const runtimeRef = useRef(getMainRuntime());`

2.  **Modify `handlePayment` function:**
    *   Inside the `handlePayment` callback, get the runtime instance *dynamically* at the time of execution.

    **Current (Problematic):**
    ```typescript
    // ... inside useNip90ConsumerChat ...
    // const runtimeRef = useRef(getMainRuntime()); // This captures potentially stale runtime

    const handlePayment = useCallback(async (invoice: string, jobId: string) => {
      // ...
      const payEffect = Effect.gen(function* () {
        const spark = yield* SparkService; // Resolves from runtimeRef.current
        // ...
      });
      // Problem: runtimeRef.current might be stale here
      await Effect.runPromise(Effect.provide(payEffect, runtimeRef.current))
      // ...
    }, [runtimeRef.current, ...]); // Dependency on runtimeRef.current
    ```

    **Change To (Corrected):**
    ```typescript
    // ... inside useNip90ConsumerChat ...
    // REMOVE: const runtimeRef = useRef(getMainRuntime());

    const handlePayment = useCallback(async (invoice: string, jobId: string) => {
      const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance
      // ...
      const payEffect = Effect.gen(function* () {
        const spark = yield* SparkService;
        // ... telemetry ...
        const result = yield* spark.payLightningInvoice({
          invoice,
          maxFeeSats: 10, // Example max fee, make configurable if needed
          timeoutSeconds: 60 // Example timeout
        });
        // ... telemetry ...
        return result.payment;
      });

      // Provide the currentRuntime for this specific Effect execution
      const paymentResult = await Effect.runPromise(
        payEffect.pipe(Effect.provide(currentRuntime)) // Use currentRuntime
      );
      // ... rest of success/failure logic ...
    }, [addMessage, paymentState.amountSats]); // Remove runtimeRef.current from dependencies
    ```

3.  **Modify `sendMessage` function (and any other Effect-executing callbacks):**
    *   Apply the same pattern: get the runtime dynamically within the callback.

    **Current (Problematic in `sendMessage` for `createNip90JobRequest`):**
    ```typescript
    // ...
    // const runtime = runtimeRef.current; // At the top of sendMessage or hook
    // ...
    const jobRequestEffect = createNip90JobRequest(...);
    const jobRequestWithNip04 = Effect.provide(
      jobRequestEffect,
      NIP04ServiceLive, // This is fine if NIP04ServiceLive is stateless or from the same runtime
    );
    // Problem: 'runtime' here might be stale
    const signedEvent = await Effect.runPromise(Effect.provide(jobRequestWithNip04, runtime));
    // ...
    ```

    **Change To (Corrected in `sendMessage`):**
    ```typescript
    // ... inside sendMessage ...
    const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance

    const jobRequestEffect = createNip90JobRequest(
      skBytes,
      finalTargetDvmPkHexForEncryption,
      inputs,
      "text/plain",
      undefined, // No bid for now
      5050, // Kind 5050 for general text inference
      finalTargetDvmPkHexForPTag,
    );

    // Provide NIP04Service directly. If NIP04ServiceLive has its own dependencies,
    // they must be resolved from currentRuntime or be context-agnostic.
    // Better: Resolve NIP04Service from currentRuntime if it's part of FullAppLayer
    const resolvedNip04Service = Context.get(currentRuntime.context, NIP04Service);
    const jobRequestWithNip04 = Effect.provideService(
      jobRequestEffect,
      NIP04Service, // The Tag
      resolvedNip04Service // The live service from the current runtime
    );

    // Use currentRuntime for running the Effect
    const signedEvent = await Effect.runPromise(
      jobRequestWithNip04.pipe(Effect.provide(currentRuntime)) // Ensure all other deps are also from currentRuntime
    );
    // ...
    ```
    *   **Important Note for `createNip90JobRequest`:** The helper `createNip90JobRequest` itself uses `Effect.gen` and yields `NIP04Service`. When you call `Effect.provideService(jobEventEffect, NIP04Service, nip04_instance_from_stale_runtime)`, you're injecting potentially the wrong `NIP04Service`. It's better to ensure all services are resolved from the `currentRuntime` or that the helpers are refactored to take `Runtime<NIP04Service>` as an argument if they need to run effects internally.
        The corrected pattern in `sendMessage` above shows resolving `NIP04Service` from the `currentRuntime` and providing it.

4.  **Review `useEffect` in `useNip90ConsumerChat.ts`:**
    *   The `useEffect` that initializes the pool and sets up telemetry should also use `getMainRuntime()` if it runs Effects that depend on runtime services.
    *   **Current (Problematic):**
        ```typescript
        useEffect(() => {
          // ...
          Effect.runFork(
            getTelemetry().pipe( // getTelemetry() itself might capture a stale runtime if not careful
              Effect.flatMap((ts) => /* ... */),
              Effect.provide(runtimeRef.current) // Using potentially stale runtime
            ),
          );
          // ...
        }, [initialTargetDvmInput, runtimeRef.current]); // Dependency on runtimeRef.current
        ```
    *   **Change To (Corrected):**
        ```typescript
        useEffect(() => {
          const currentRuntime = getMainRuntime(); // Get fresh runtime
          // ...
          Effect.runFork(
            Effect.flatMap(TelemetryService, (ts) => /* ... */).pipe(
              Effect.provide(currentRuntime) // Use fresh runtime
            )
          );
          // ...
          // When subscribing to Nostr events, ensure the NIP04Service used for decryption
          // inside the subscription callback is also from the currentRuntime, or that the
          // decryption effect is provided with currentRuntime when run.
          sub.on("event", async (event: NostrEvent) => {
            const currentRuntimeForEvent = getMainRuntime(); // Get fresh runtime for THIS event
            // ...
            if (isEncrypted && nostrPrivateKeyHex) {
              const decryptEffect = decryptNip04Content(
                nostrPrivateKeyHex,
                event.pubkey,
                event.content,
              );
              // Provide NIP04Service from the current runtime
              const resolvedNip04 = Context.get(currentRuntimeForEvent.context, NIP04Service);
              const decryptExit = await Effect.runPromiseExit(
                decryptEffect.pipe(Effect.provideService(NIP04Service, resolvedNip04))
              );
              // ...
            }
          });
          // ...
        }, [initialTargetDvmInput, addMessage]); // Remove runtimeRef.current from dependencies
        ```
    *   Ensure that any helper functions like `getTelemetry()` are also designed to fetch the service from the *current* runtime if they are called within these dynamic contexts. A robust way is `Effect.flatMap(TelemetryService.Tag, ts => ts.trackEvent(...))`.

5.  **Verify All Effect Execution Points:**
    *   Audit `useNip90ConsumerChat.ts` for any other `Effect.runPromise`, `Effect.runPromiseExit`, or `Effect.runFork` calls. Ensure they are provided with `getMainRuntime()` fetched *at the point of execution* or within the immediate scope of the callback.
    *   The `runtime` argument to `useNip90ConsumerChat` is also problematic for the same reason. It should ideally not be passed as a prop, and the hook should always use `getMainRuntime()` internally. If it must be a prop, the parent component (`Nip90ConsumerChatPane`) needs to ensure it passes the *latest* runtime, which is difficult. It's better for the hook to be self-sufficient in obtaining the current runtime.

**Justification for the Fix:**

By consistently calling `getMainRuntime()` within the async callbacks (`handlePayment`, `sendMessage`, `useEffect` event handlers) just before an Effect program is run or provided with context, we ensure that the most up-to-date `mainRuntimeInstance` is used. This instance will contain the `SparkServiceLive` configured with the actual user's mnemonic (due to `reinitializeRuntime()`), allowing real payments to be attempted.

This change aligns with the pattern already identified as successful for the wallet display components (`BitcoinBalanceDisplay.tsx` and `WalletPane.tsx` in `0845-fix.md`) where "Get fresh runtime on each query" was part of the solution.

After applying these changes, the consumer-side telemetry should start showing `payment_start` and either `payment_success` or `payment_failure` events, and the DVM provider should observe its invoice status changing from "pending" to "paid" (or "expired" if the payment actually fails at the SDK level and takes too long).Okay, I've analyzed the telemetry and the provided context. The "1031 payfail" event, combined with the provider "sitting there waiting for payment," strongly suggests that the NIP-90 DVM (the provider) has correctly issued a payment request (likely a Kind 7000 event with a Lightning invoice), but the NIP-90 consumer (your app, when acting as a job requester) is failing to complete the payment.

The consumer-side telemetry (`1031-telemetry-payfail-consumer.md`) is particularly revealing:
1.  The runtime initially builds with a MOCK `SparkService`.
2.  Then, it reinitializes with the USER's mnemonic (`pyramid go...`).
3.  The `SparkService` initializes successfully with this user mnemonic.
4.  Crucially, the balance checks *after* this user wallet initialization are successful and show 500 sats.
5.  However, there are **no telemetry events from `useNip90ConsumerChat.ts` indicating an attempt to pay an invoice** (e.g., `payment_start`, `payment_success`, `payment_failure`).

This implies the payment process within `useNip90ConsumerChat.ts` is either not being triggered correctly, or it's failing very early, possibly due to using a stale or incorrect `SparkService` instance.

The root cause often lies in how Effect runtimes and services are scoped and accessed, especially in React components/hooks that might capture an older instance of the runtime. The fix in `docs/logs/20250523/0845-fix.md` for wallet display components (getting a fresh runtime for each query) is a key pattern that needs to be applied consistently.

## Analysis of Why "Payfail" Occurs (Handshake Failure)

1.  **Stale Runtime Instance in `useNip90ConsumerChat`:**
    *   The `useNip90ConsumerChat` hook likely captures the `mainRuntimeInstance` in a `useRef` or as a constant during its initial render.
    *   When the application starts, `globalWalletConfig.mnemonic` is `null`. The `FullAppLayer` in `runtime.ts` (as per the fix in `0845-fix.md`) correctly builds with `SparkServiceTestLive` (the mock). `useNip90ConsumerChat` captures this runtime.
    *   Later, when the user sets up their wallet (e.g., "pyramid go..."), `walletStore.ts` updates `globalWalletConfig.mnemonic` and calls `reinitializeRuntime()`. This creates a *new* `mainRuntimeInstance` globally, this time with the real `SparkServiceLive` configured with the user's mnemonic.
    *   **The Problem:** The `useNip90ConsumerChat` hook instance, which is already mounted and active for the NIP-90 consumer pane, *still holds a reference to the old runtime* that has the `SparkServiceTestLive` (mock) or a `SparkServiceLive` configured with no mnemonic/test mnemonic.
    *   When a DVM job requires payment and `handlePayment` in `useNip90ConsumerChat.ts` is triggered, it uses this stale runtime to resolve `SparkService.Tag`.
    *   Consequently, `payLightningInvoice` is called on the mock service or an unconfigured/test-mnemonic real service, not the user's actual funded wallet. The payment doesn't actually happen on the Lightning Network, or it happens on a test wallet.
    *   The DVM provider, checking its real invoice, never sees it paid.

2.  **Consequences:**
    *   The DVM (provider) correctly generates an invoice and sends a `payment-required` feedback (Kind 7000).
    *   The consumer UI might show the payment prompt.
    *   When the user attempts to pay, the action is routed through the stale runtime's `SparkService`.
        *   If it's `SparkServiceTestLive`, the mock `payLightningInvoice` might "succeed" locally within the mock, but no real payment occurs. The consumer UI might even incorrectly show "payment successful."
        *   If it's a `SparkServiceLive` instance that was somehow initialized with a test mnemonic (due to earlier bugs or fallback logic that might have existed), the payment would go to/from the test wallet.
    *   The DVM's invoice remains unpaid.
    *   The DVM "sits there waiting for payment" because its `checkInvoiceStatus` (for the real invoice) consistently returns "pending."
    *   The "handshake" (request -> payment-required -> payment -> result) breaks at the payment step.

## Instructions to the Coding Agent to Fix This

The core fix is to ensure that `useNip90ConsumerChat.ts` (and any other long-lived hooks or services that perform runtime-dependent actions) uses the *current* `mainRuntimeInstance` when executing Effects, especially for actions like payment.

**File: `src/hooks/useNip90ConsumerChat.ts`**

1.  **Remove `runtimeRef`:**
    *   Delete the line: `const runtimeRef = useRef(getMainRuntime());`
    *   Remove `runtimeRef.current` from the dependency array of `useEffect` and any `useCallback` hooks where it's listed.
    *   The `runtime` prop passed to `useNip90ConsumerChat` is also part of this stale reference problem. For the most robust fix, this prop should be removed, and the hook should *always* call `getMainRuntime()` internally.

2.  **Modify `handlePayment` function:**
    *   Inside the `handlePayment` callback, get the runtime instance *dynamically* at the time of execution.

    **Change:**
    ```typescript
    // At the beginning of useNip90ConsumerChat hook:
    // REMOVE: const runtimeRef = useRef(getMainRuntime());
    // REMOVE `runtime` from props if possible, or ensure parent passes updated runtime.
    // For this fix, we'll assume `runtime` prop is removed and we use getMainRuntime().

    // Inside handlePayment:
    const handlePayment = useCallback(async (invoice: string, jobId: string) => {
      const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance
      // ...
      const payEffect = Effect.gen(function* () {
        const spark = yield* SparkService; // Will be resolved from currentRuntime
        const telemetry = yield* TelemetryService; // Will be resolved from currentRuntime

        yield* telemetry.trackEvent({ /* ... */ });

        const result = yield* spark.payLightningInvoice({
          invoice,
          maxFeeSats: 10, // Example: make configurable or derive
          timeoutSeconds: 60 // Example timeout
        });

        yield* telemetry.trackEvent({ /* ... */ });
        return result.payment;
      });

      // Provide the currentRuntime for this specific Effect execution
      // Use Effect.runPromiseExit to handle potential errors from payEffect
      const paymentExit = await Effect.runPromiseExit(
        payEffect.pipe(Effect.provide(currentRuntime)) // Use currentRuntime
      );

      if (Exit.isSuccess(paymentExit)) {
        const paymentResult = paymentExit.value;
        setPaymentState(prev => ({ ...prev, status: 'paid' }));
        addMessage("system", `Payment successful! Hash: ${paymentResult.paymentHash.substring(0, 12)}...`);
         // Add telemetry for payment success here
      } else {
        const error = Cause.squash(paymentExit.cause);
        console.error("Payment error in handlePayment:", error);
        setPaymentState(prev => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error) || "Payment failed"
        }));
        addMessage("system", `Payment failed: ${error instanceof Error ? error.message : String(error) || "Unknown error"}`);
        // Add telemetry for payment failure here
      }
    }, [addMessage, paymentState.amountSats]); // Removed runtime from dependencies
    ```

3.  **Modify `sendMessage` function:**
    *   Apply the same pattern: get the runtime dynamically within the callback.
    *   Ensure services like `NIP04Service` are resolved from this fresh runtime.

    **Change:**
    ```typescript
    // ... inside sendMessage ...
    const sendMessage = useCallback(async () => {
      const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance
      const telemetry = Context.get(currentRuntime.context, TelemetryService); // Example of getting service directly
      // ... (rest of initial checks for userInput, keys, pool) ...

      telemetry.trackEvent({ /* ... */ }); // Use the resolved telemetry instance

      // ... (logic for finalTargetDvmPkHexForEncryption, finalTargetDvmPkHexForPTag) ...

      try {
        const skBytes = hexToBytes(nostrPrivateKeyHex!); // Added non-null assertion as it's checked above
        const inputs: Array<[string, string, string?, string?, string?]> = [
          [prompt, "text"],
        ];

        const jobRequestEffect = createNip90JobRequest( /* ... args ... */ );

        // Resolve NIP04Service from the currentRuntime
        const resolvedNip04Service = Context.get(currentRuntime.context, NIP04Service);
        const jobRequestWithNip04 = Effect.provideService(
          jobRequestEffect,
          NIP04Service, // The Tag
          resolvedNip04Service // The live service from the current runtime
        );

        // Use currentRuntime for running the Effect
        const signedEvent = await Effect.runPromise(
          jobRequestWithNip04.pipe(Effect.provide(currentRuntime)) // Ensure all other deps are also from currentRuntime
        );
        // ... (rest of publish and subscribe logic) ...

        // Inside the subscription event handler:
        sub.on("event", async (event: NostrEvent) => {
          const currentRuntimeForEvent = getMainRuntime(); // Get fresh runtime for THIS event
          const telemetryForEvent = Context.get(currentRuntimeForEvent.context, TelemetryService);
          telemetryForEvent.trackEvent({ /* ... */ });

          if (isEncrypted && nostrPrivateKeyHex) {
            const resolvedNip04ForEvent = Context.get(currentRuntimeForEvent.context, NIP04Service);
            const decryptEffect = decryptNip04Content(
              nostrPrivateKeyHex,
              event.pubkey,
              event.content,
            );
            const decryptExit = await Effect.runPromiseExit(
              Effect.provideService(decryptEffect, NIP04Service, resolvedNip04ForEvent)
            );
            // ...
          }
          // ...
        });

      } catch (error: any) { /* ... */ }
    }, [
      userInput, // Keep other relevant dependencies
      nostrPrivateKeyHex,
      nostrPublicKeyHex,
      initialTargetDvmInput,
      addMessage
      // REMOVE `runtime` or `runtimeRef.current` from dependencies
    ]);
    ```

4.  **Modify `useEffect` in `useNip90ConsumerChat.ts` (for initialization and cleanup):**
    *   The main `useEffect` that initializes the Nostr pool and potentially runs startup Effects should also use `getMainRuntime()` for any Effect executions.

    **Change (Conceptual - apply to relevant parts of `useEffect`):**
    ```typescript
    useEffect(() => {
      const currentRuntimeForEffect = getMainRuntime(); // Get fresh runtime
      // ...
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) => /* ... */)
        .pipe(Effect.provide(currentRuntimeForEffect)) // Use fresh runtime
      );
      // ...
      // For subscriptions:
      const subscribeEffect = Effect.flatMap(NIP28Service /* or NIP90Service */, (service) =>
        service.subscribeToChannelMessages(/* ...args... */) // Or equivalent NIP-90 sub
      ).pipe(Effect.provide(currentRuntimeForEffect)); // Provide runtime here for sub creation

      Effect.runPromiseExit(subscribeEffect).then((subExit) => {
        if (Exit.isSuccess(subExit)) {
          subscriptionRef.current = subExit.value;
        } else { /* handle error */ }
      });

      return () => {
        // Cleanup logic
      };
    }, [channelId /* or other relevant stable deps, NOT runtime */, addMessage, formatPubkeyForDisplay, mapEventToMessage, initialTargetDvmInput]);
    ```

5.  **Remove `runtime` Prop from `UseNip90ConsumerChatParams` (Recommended):**
    *   Modify `src/hooks/useNip90ConsumerChat.ts`:
        ```typescript
        interface UseNip90ConsumerChatParams {
          nostrPrivateKeyHex: string | null;
          nostrPublicKeyHex: string | null;
          targetDvmPubkeyHex?: string;
          // REMOVE: runtime: Runtime.Runtime<...>;
        }

        export function useNip90ConsumerChat({
          nostrPrivateKeyHex,
          nostrPublicKeyHex,
          targetDvmPubkeyHex: initialTargetDvmInput,
          // REMOVE: runtime,
        }: UseNip90ConsumerChatParams) {
          // ... all internal calls to Effect.provide or Effect.runPromise should use getMainRuntime()
        }
        ```
    *   Modify `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`:
        ```typescript
        // ...
        // REMOVE: const runtime = getMainRuntime(); // No longer needed to pass as prop

        const {
          // ...
        } = useNip90ConsumerChat({
          nostrPrivateKeyHex: walletState.privateKeyHex,
          nostrPublicKeyHex: walletState.publicKeyHex,
          targetDvmPubkeyHex: targetDvmInput.trim() || undefined,
          // REMOVE: runtime,
        });
        // ...
        ```

**Justification for the Fix:**

By consistently calling `getMainRuntime()` *within* the async callbacks (`handlePayment`, `sendMessage`) and `useEffect` blocks just before an Effect program is run or provided with context, we ensure that the most up-to-date `mainRuntimeInstance` is used. This instance will contain the `SparkServiceLive` configured with the actual user's mnemonic (due to `reinitializeRuntime()`), allowing real payments to be attempted with the user's funds.

This change aligns with the pattern already identified as successful for the wallet display components (`BitcoinBalanceDisplay.tsx` and `WalletPane.tsx` in `docs/logs/20250523/0845-fix.md`) where "Get fresh runtime on each query" was part of the solution.

After applying these changes, the consumer-side telemetry should start showing `payment_start` and either `payment_success` or `payment_failure` events, and the DVM provider should observe its invoice status changing from "pending" to "paid" (or "expired" if the payment actually fails at the SDK level and takes too long).
