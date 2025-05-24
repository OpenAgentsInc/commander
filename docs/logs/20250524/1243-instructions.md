Okay, Agent, the analysis in `docs/logs/20250524/1239-analysis.md` correctly identifies that the DVM (`Kind5050DVMServiceImpl`) is using the mock `SparkServiceTestLive` (which creates "mock_invoice...") even when a user mnemonic is present and the runtime *should* have initialized the real `SparkServiceLive`.

This is a classic stale reference issue, detailed in `docs/fixes/023-effect-runtime-stale-references.md`. The DVM service, or components/hooks interacting with it, are likely capturing an old runtime instance.

Here are the specific instructions to solve this:

**Overall Principle:** Ensure that any Effect program which depends on services that might be re-initialized (like `SparkService` after wallet setup) is provided with the *current* `mainRuntimeInstance` at the *time of its execution*, not with a runtime instance captured earlier.

---

**I. Modify UI Components and Hooks to Fetch Fresh Runtime:**

**1. File: `src/components/sell-compute/SellComputePane.tsx`**
   *   **Problem:** The `runtime` constant is likely captured at component mount, before `reinitializeRuntime` (triggered by wallet setup) might have occurred. This stale `runtime` is then used in `Effect.provide(dvmAction, runtime)`.
   *   **Fix:** Modify all Effect-running functions (`checkWalletStatus`, `checkOllamaStatus`, `checkDVMStatus`, and critically `handleGoOnlineToggle`) to call `getMainRuntime()` *inside* the function body, right before the `Effect.provide` or `runPromiseExit` call.

   ```typescript
   // src/components/sell-compute/SellComputePane.tsx

   // REMOVE this line:
   // const runtime = getMainRuntime(); // <<< Stale if captured at mount

   const checkWalletStatus = useCallback(async () => {
     setStatusLoading((s) => ({ ...s, wallet: true }));
     const currentRuntime = getMainRuntime(); // <<< GET FRESH RUNTIME
     const walletProgram = Effect.flatMap(SparkService, (s) =>
       s.checkWalletStatus(),
     );
     runPromiseExit(Effect.provide(walletProgram, currentRuntime)).then( /* ... */ );
   }, []); // No runtime in deps

   // Apply similar pattern to checkOllamaStatus (if it were using Effect directly)
   // and checkDVMStatus:
   const checkDVMStatus = useCallback(async () => {
     setIsDvmLoading(true);
     const currentRuntime = getMainRuntime(); // <<< GET FRESH RUNTIME
     const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) =>
       s.isListening(),
     );
     runPromiseExit(Effect.provide(dvmStatusProgram, currentRuntime)).then( /* ... */ );
   }, []); // No runtime in deps

   const handleGoOnlineToggle = async () => {
     // ... (initial checks) ...
     setIsDvmLoading(true);
     const currentRuntime = getMainRuntime(); // <<< GET FRESH RUNTIME
     const dvmAction = isOnline
       ? Effect.flatMap(Kind5050DVMService, (s) => s.stopListening())
       : Effect.flatMap(Kind5050DVMService, (s) => s.startListening());
     const exit = await runPromiseExit(
       Effect.provide(dvmAction, currentRuntime), // <<< USE FRESH RUNTIME
     );
     // ... (rest of the logic, ensure checkDVMStatus also uses fresh runtime if called) ...
     // Instead of: await checkDVMStatus();
     // Call it such that it gets a fresh runtime, or ensure its internal runtime call is fresh.
     // The checkDVMStatus already gets fresh runtime due to previous fix.
     const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) => s.isListening());
     runPromiseExit(Effect.provide(dvmStatusProgram, getMainRuntime())).then((statusExit) => {
        if (Exit.isSuccess(statusExit)) setIsOnline(statusExit.value);
        else setIsOnline(false);
        setIsDvmLoading(false);
     });
   };

   // For the useEffect that calls status checks on mount:
   useEffect(() => {
     // The check functions themselves now get fresh runtimes
     checkWalletStatus();
     const timer = setTimeout(checkOllamaStatus, 1000);
     checkDVMStatus();
     return () => clearTimeout(timer);
   }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]); // Dependencies are the memoized functions
   ```

**2. File: `src/hooks/ai/useAgentChat.ts`**
   *   **Problem:** `runtimeRef.current` captures the runtime at hook initialization. The `runTelemetry` helper and the main `program` in `sendMessage` use this potentially stale `runtimeRef.current`.
   *   **Fix:**
        *   Modify `runTelemetry` to accept the runtime as an argument or fetch it internally.
        *   In `sendMessage`, fetch `getMainRuntime()` *inside* `sendMessage` before creating and running the `program`.

   ```typescript
   // src/hooks/ai/useAgentChat.ts

   // Change runTelemetry to get runtime dynamically or accept it
   const runTelemetry = useCallback((event: TelemetryEvent) => {
     Effect.runFork(
       Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)).pipe(
         Effect.provide(getMainRuntime()), // <<< GET FRESH RUNTIME
       ),
     );
   }, []); // No runtimeRef in deps

   const sendMessage = useCallback(
     async (promptText: string) => {
       // ... (user message setup, telemetry via runTelemetry which is now fixed) ...
       const currentRuntime = getMainRuntime(); // <<< GET FRESH RUNTIME

       const program = Effect.gen(function* (_) { /* ... */ })
         .pipe(
           Effect.provide(currentRuntime) // <<< USE FRESH RUNTIME
         );
       Effect.runFork(program); // Effect.runFork inherits the context provided to `program`
     },
     [messages, initialSystemMessage, runTelemetry, selectedProviderKey], // Ensure no stale runtime in deps
   );

   // Ensure useEffect cleanup also uses fresh runtime if it runs Effects
   useEffect(() => {
     return () => {
       if (streamAbortControllerRef.current) {
         // ... abort logic ...
         // If runTelemetry is called here, it's already fixed to use fresh runtime
         runTelemetry({ /* ... */ });
       }
     };
   }, [runTelemetry]); // runTelemetry is stable
   ```

**3. File: `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx` & `src/hooks/useNip90ConsumerChat.ts`**
   *   **Apply the same pattern as `useAgentChat.ts`**:
        *   `initializeWallet` in `Nip90ConsumerChatPane.tsx` needs to use `getMainRuntime()` inside itself for its `Effect.provide`.
        *   `useNip90ConsumerChat.ts`:
            *   The `useEffect` for `telemetry.trackEvent({ category: "nip90_consumer", action: "hook_init", ... })` and its cleanup must use `getMainRuntime()` for their `Effect.provide`.
            *   `sendMessage` must use `getMainRuntime()` for its `Effect.provide`.
            *   `handlePayment` must use `getMainRuntime()` for its `Effect.provide`.
            *   The `handleEvent` callback within `useEffect` (for subscriptions) must use `getMainRuntime()` when it runs Effects (e.g., for `nip04.decrypt` or telemetry).

**Example for `handlePayment` in `useNip90ConsumerChat.ts`:**
```typescript
// src/hooks/useNip90ConsumerChat.ts
const handlePayment = useCallback(async (invoice: string, jobId: string) => {
  const currentRuntime = getMainRuntime(); // <<< GET FRESH RUNTIME
  const telemetryService = Context.get(currentRuntime.context, TelemetryService); // Get from fresh runtime
  // ... (telemetryService.trackEvent call) ...
  try {
    // ...
    const payEffect = Effect.gen(function* () { /* ... */ });
    const paymentExit = await Effect.runPromiseExit(
      payEffect.pipe(Effect.provide(currentRuntime)) // <<< USE FRESH RUNTIME
    );
    // ...
  } catch (error: any) { /* ... */ }
}, [paymentState.amountSats, addMessage]); // No runtime in deps
```

---

**II. Modify Long-Running Service Fibers to Use Fresh Runtime Context Internally:**

**1. File: `src/services/dvm/Kind5050DVMServiceImpl.ts`**
   *   **Problem:** The `invoiceCheckFiber` is forked with the initial runtime context. Its repeating effect, `checkAndUpdateInvoiceStatusesLogic`, might be closing over stale service instances from that initial context.
   *   **Fix:** Ensure `checkAndUpdateInvoiceStatusesLogic` resolves `SparkService`, `TelemetryService`, and `NostrService` from the *current* `getMainRuntime().context` *on each iteration* of its loop, rather than using instances captured when the fiber was forked or passed via a `(ctx)` argument that becomes stale.

   ```typescript
   // src/services/dvm/Kind5050DVMServiceImpl.ts
   // ... inside Kind5050DVMServiceLive Layer.scoped ...

   // THIS FUNCTION RUNS REPEATEDLY IN A FIBER. IT MUST GET FRESH SERVICES EACH TIME.
   const checkAndUpdateInvoiceStatusesLogic = (): Effect.Effect<void, DVMError | TrackEventError, never> => // Dependencies will be resolved internally
     Effect.gen(function* (_) {
       const currentRuntime = getMainRuntime(); // Get fresh runtime on each iteration

       // Resolve services from the fresh runtime
       const localTelemetry = yield* _(Effect.provide(TelemetryService, currentRuntime));
       const localSpark = yield* _(Effect.provide(SparkService, currentRuntime));
       const localNostr = yield* _(Effect.provide(NostrService, currentRuntime));

       // ... rest of checkAndUpdateInvoiceStatusesLogic using localTelemetry, localSpark, localNostr ...
       // Ensure any nested Effects also correctly receive context if they need these services.
       // For example, if getJobHistory is called, it's an Effect that needs Telemetry and Nostr.
       // It's better if getJobHistory is self-contained or also resolves its deps from getMainRuntime.

       // Let's assume getJobHistory and getJobStatistics are refactored to fetch their own runtime or
       // are provided the current one correctly.
       const historyResult = yield* _(
         getJobHistory({ page: 1, pageSize: 500 }) // This is `this.getJobHistory` if it's a method
           .pipe(Effect.provide(currentRuntime)) // Or provide current runtime here too
       );
       // ...
     });

   // The fiber that runs the above logic:
   // ... inside startListening ...
   if (!invoiceCheckFiber) {
     const scheduledInvoiceChecks = Effect.repeat(
       checkAndUpdateInvoiceStatusesLogic(), // This Effect now resolves its own deps freshly each time.
       Schedule.spaced(Duration.seconds(OVERALL_PENDING_JOBS_CHECK_INTERVAL_S))
     );
     // The fiber is forked with the initial runtime context of startListening,
     // but checkAndUpdateInvoiceStatusesLogic itself is designed to be independent of that initial context
     // for its core service dependencies by calling getMainRuntime().
     invoiceCheckFiber = Effect.runFork(scheduledInvoiceChecks);
   }

   // For the onEvent callback in Nostr subscription:
   const onEvent = (event: NostrEvent) => {
     if (isActiveInternal) {
       // CRITICAL: Provide the current runtime to processJobRequestInternal
       // processJobRequestInternal itself should then resolve its dependencies (like SparkService)
       // from this fresh runtime, or be structured to get them.
       Effect.runFork(processJobRequestInternal(event).pipe(Effect.provide(getMainRuntime())));
     }
   };
   ```
   And ensure `processJobRequestInternal` and `processPaidJob` are also structured to use `getMainRuntime()` for their `SparkService` and other critical dependencies if they are not already getting them from a fresh context. The current structure for these looks like they are invoked within an Effect chain that *should* get the fresh DVM service instance (which itself is built with fresh dependencies). The `onEvent` handler is the most critical one to ensure it uses a fresh runtime for `processJobRequestInternal`.

---

**Summary of Changes:**

*   **React Components/Hooks (`SellComputePane`, `useAgentChat`, `useNip90ConsumerChat`, etc.):**
    *   Any function that directly runs an Effect (`Effect.runPromiseExit`, `Effect.runFork`, `Effect.runPromise`) and needs services that might change due to runtime reinitialization must call `getMainRuntime()` *inside that function* to get the current runtime and provide it to the Effect.
    *   Do not store `getMainRuntime()` result in `useRef` or `useState` if that reference is used later to provide context to Effects that need up-to-date services.
*   **Long-running Service Fibers (`Kind5050DVMServiceImpl`'s `invoiceCheckFiber`):**
    *   The Effect that is repeatedly executed by the fiber (`checkAndUpdateInvoiceStatusesLogic`) must resolve its critical service dependencies (like `SparkService`) from `getMainRuntime()` *on each iteration*.
*   **Event Handlers in Services (`Kind5050DVMServiceImpl`'s `onEvent` for Nostr):**
    *   The callback (`onEvent`) itself, when it triggers further Effectful operations (like `processJobRequestInternal`), must ensure those operations are provided with the current `getMainRuntime()`.

These changes ensure that stale runtime instances (and thus stale service implementations like the mock `SparkService`) are not used after `reinitializeRuntime` has been called.

**Final Verification Step (Mental or Actual):**
Trace the flow:
1. App starts -> `mainRuntimeInstance` has `SparkServiceTestLive`.
2. `SellComputePane` mounts, `handleGoOnlineToggle` is defined but not yet called. `Kind5050DVMServiceLive` (if resolved early by another pane or eager init) would have `SparkServiceTestLive`.
3. User enters seed phrase -> `walletStore._initializeServices` calls `globalWalletConfig.mnemonic = ...` then `reinitializeRuntime()`.
4. `reinitializeRuntime()` builds a *new* `FullAppLayer` where `sparkLayer` is now `SparkServiceLive` (real). `mainRuntimeInstance` is updated to this new runtime.
5. User clicks "GO ONLINE" in `SellComputePane`.
6. `handleGoOnlineToggle` is called.
7. It calls `getMainRuntime()`. This *must* return the *new* `mainRuntimeInstance`.
8. This new runtime is provided to `Effect.flatMap(Kind5050DVMService, (s) => s.startListening())`.
9. When `Kind5050DVMService` is resolved from this new runtime, its `Layer.scoped` effect runs. It yields `SparkService`. This `SparkService` *must* be the real `SparkServiceLive` from the new runtime.
10. The `processJobRequestInternal` (called from `onEvent`) and `checkAndUpdateInvoiceStatusesLogic` (run by `invoiceCheckFiber`) should now use this real `SparkService`.

The fix `023` is the most direct way to ensure step 7-9 behave correctly. The modifications to `Kind5050DVMServiceImpl.ts` for its internal looping fiber `checkAndUpdateInvoiceStatusesLogic` are crucial because that fiber, once forked, might not automatically pick up a new runtime context unless its *repeated effect* is designed to do so.Okay, Agent, the analysis in `docs/logs/20250524/1239-analysis.md` is spot on. The DVM (`Kind5050DVMServiceImpl`) is incorrectly using `SparkServiceTestLive` (which creates mock invoices) instead of `SparkServiceLive` when a user wallet is initialized. This is a classic stale runtime reference problem, as detailed in `docs/fixes/023-effect-runtime-stale-references.md`.

Here are the definitive instructions to fix this issue:

**Core Principle:** Adhere to `docs/fixes/023-effect-runtime-stale-references.md`. Any part of the application (React components, hooks, or Effect services with long-lived processes) that executes Effects depending on potentially re-initialized services (like `SparkService`) MUST obtain the `mainRuntimeInstance` freshly at the moment of Effect execution.

---

**I. Modify UI Components and Hooks to Fetch Fresh Runtime Instance:**

**1. File: `src/components/sell-compute/SellComputePane.tsx`**

   *   **Action:** In all asynchronous handler functions that run Effects (`checkWalletStatus`, `checkOllamaStatus`, `checkDVMStatus`, and most importantly `handleGoOnlineToggle`), call `getMainRuntime()` *inside* these functions just before you need to provide the runtime to an Effect. Do not rely on a `runtime` constant captured at the component's top-level or during `useEffect` if that `useEffect` runs only on mount.

   ```typescript
   // src/components/sell-compute/SellComputePane.tsx

   // REMOVE any top-level: const runtime = getMainRuntime();

   const checkWalletStatus = useCallback(async () => {
     setStatusLoading((s) => ({ ...s, wallet: true }));
     const currentRuntime = getMainRuntime(); // <<< FIX: Get fresh runtime
     const walletProgram = Effect.flatMap(SparkService, (s) => s.checkWalletStatus());
     runPromiseExit(Effect.provide(walletProgram, currentRuntime)).then( /* ... */ );
   }, []); // Dependencies should not include a stale runtime

   const checkOllamaStatus = useCallback(async () => {
     // ... (similar logic for Ollama if it were Effect-based, currently uses window.electronAPI) ...
     // If using Effect for Ollama in future, apply same fresh runtime pattern.
     // For now, it's okay as is for Ollama IPC.
     setStatusLoading((s) => ({ ...s, ollama: true }));
     try {
       // ... IPC logic ...
     } catch (error) { /* ... */ }
     finally { setStatusLoading((s) => ({ ...s, ollama: false })); }
   }, []);

   const checkDVMStatus = useCallback(async () => {
     setIsDvmLoading(true);
     const currentRuntime = getMainRuntime(); // <<< FIX: Get fresh runtime
     const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) => s.isListening());
     runPromiseExit(Effect.provide(dvmStatusProgram, currentRuntime)).then((exit) => {
       if (Exit.isSuccess(exit)) {
         setIsOnline(exit.value);
       } else {
         console.error("Failed to check DVM status:", Cause.squash(exit.cause));
         setIsOnline(false);
       }
       setIsDvmLoading(false);
     });
   }, []); // Dependencies should not include a stale runtime

   const handleGoOnlineToggle = async () => {
     if ((!isWalletConnected || !isOllamaConnected) && !isOnline) {
       alert("Please ensure your wallet and Ollama are connected to go online.");
       return;
     }
     setIsDvmLoading(true);
     const currentRuntime = getMainRuntime(); // <<< FIX: Get fresh runtime
     const dvmAction = isOnline
       ? Effect.flatMap(Kind5050DVMService, (s) => s.stopListening())
       : Effect.flatMap(Kind5050DVMService, (s) => s.startListening());
     const exit = await runPromiseExit(
       Effect.provide(dvmAction, currentRuntime), // <<< FIX: Use fresh runtime
     );

     if (Exit.isSuccess(exit)) {
       // Re-check DVM status using the fresh runtime pattern
       const currentRuntimeForStatusCheck = getMainRuntime();
       const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) => s.isListening());
       runPromiseExit(Effect.provide(dvmStatusProgram, currentRuntimeForStatusCheck)).then((statusExit) => {
         if (Exit.isSuccess(statusExit)) setIsOnline(statusExit.value);
         else setIsOnline(false);
         setIsDvmLoading(false);
       });
       console.log(`DVM Service ${isOnline ? "stop" : "start"} command successful.`);
     } else {
       // ... (error handling) ...
       const currentRuntimeForStatusCheck = getMainRuntime();
       const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) => s.isListening());
       runPromiseExit(Effect.provide(dvmStatusProgram, currentRuntimeForStatusCheck)).then((statusExit) => {
         if (Exit.isSuccess(statusExit)) setIsOnline(statusExit.value);
         else setIsOnline(false);
         setIsDvmLoading(false);
       });
     }
   };

   // The useEffect that calls these on mount is fine as the callbacks themselves are now fixed.
   useEffect(() => {
     checkWalletStatus();
     const timer = setTimeout(checkOllamaStatus, 1000);
     checkDVMStatus();
     return () => clearTimeout(timer);
   }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);
   ```

**2. File: `src/hooks/ai/useAgentChat.ts`**

   *   **Action:** Remove the `runtimeRef`. In `sendMessage` and any other Effects, call `getMainRuntime()` directly before `Effect.provide()`. The `runTelemetry` helper must also be adapted or called with a fresh runtime.

   ```typescript
   // src/hooks/ai/useAgentChat.ts

   // REMOVE: const runtimeRef = useRef(getMainRuntime());

   const runTelemetry = useCallback((event: TelemetryEvent) => {
     Effect.runFork(
       Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)).pipe(
         Effect.provide(getMainRuntime()), // <<< FIX: Get fresh runtime
       ),
     );
   }, []); // No runtimeRef in deps

   const sendMessage = useCallback(
     async (promptText: string) => {
       if (!promptText.trim()) return;
       // ... (user message setup, telemetry via runTelemetry which is now fixed) ...
       const currentRuntime = getMainRuntime(); // <<< FIX: Get fresh runtime

       const program = Effect.gen(function* (_) {
         const orchestrator = yield* _(ChatOrchestratorService);
         // ... (rest of orchestrator logic) ...
       }).pipe(
         Effect.provide(currentRuntime) // <<< FIX: Use fresh runtime
       );
       Effect.runFork(program);
     },
     [messages, initialSystemMessage, runTelemetry, selectedProviderKey],
   );

   useEffect(() => {
     // This cleanup runs when the component unmounts or dependencies change.
     // If runTelemetry here internally calls getMainRuntime(), it's fine.
     return () => {
       if (streamAbortControllerRef.current) {
         streamAbortControllerRef.current.abort();
         runTelemetry({ /* ... */ });
       }
     };
   }, [runTelemetry]);
   ```

**3. File: `src/hooks/useNip90ConsumerChat.ts`**

   *   **Action:** Similar to `useAgentChat.ts`. Remove any stored runtime reference. All functions that run Effects (`initializeWallet`, `sendMessage`, `handlePayment`, and the `handleEvent` callback within the subscription `useEffect`) must call `getMainRuntime()` to get the current runtime instance for `Effect.provide()`.

   ```typescript
   // src/hooks/useNip90ConsumerChat.ts

   // REMOVE: const runtimeRef = useRef(getMainRuntime());

   const initializeWallet = useCallback(async () => {
     const currentRuntime = getMainRuntime(); // <<< FIX
     // ...
     const fullProgram = Effect.provide(program, Layer.mergeAll( /* ... other layers ... */ ));
     const exit = await Effect.runPromiseExit(
        fullProgram.pipe(Effect.provide(currentRuntime)) // <<< FIX: Provide the *current* runtime for the Effect that uses services
     );
     // ...
   }, []);

   const sendMessage = useCallback(async () => {
     const currentRuntime = getMainRuntime(); // <<< FIX
     // ...
     // Example:
     // const jobRequestWithNip04 = Effect.provideService(jobRequestEffect, NIP04Service, Context.get(currentRuntime.context, NIP04Service));
     // const signedEvent = await Effect.runPromise(jobRequestWithNip04.pipe(Effect.provide(currentRuntime)));
     // const publishEffect = nostrService.publishEvent(signedEvent);
     // await Effect.runPromise(publishEffect.pipe(Effect.provide(currentRuntime)));
     // Refactor to:
     const program = Effect.gen(function*(_) {
        const nip04Service = yield* _(NIP04Service);
        const nostrService = yield* _(NostrService);
        // ... create jobRequestEffect using nip04Service ...
        const jobEvent = yield* _(jobRequestEffect);
        yield* _(nostrService.publishEvent(jobEvent));
        return jobEvent;
     }).pipe(Effect.provide(currentRuntime));
     const signedEvent = await Effect.runPromise(program); // Assuming this simplified structure after refactor
     // ... then subscribe, ensuring handleEvent uses fresh runtime ...
   }, [/* ... */]);

   const handlePayment = useCallback(async (invoice: string, jobId: string) => {
     const currentRuntime = getMainRuntime(); // <<< FIX
     const telemetryService = Context.get(currentRuntime.context, TelemetryService);
     // ...
     const payEffect = Effect.gen(function* () { /* ... */ });
     const paymentExit = await Effect.runPromiseExit(
       payEffect.pipe(Effect.provide(currentRuntime)) // <<< FIX
     );
     // ...
   }, [/* ... */]);

   useEffect(() => {
     // ...
     const handleEvent = async (event: NostrEvent) => {
       const currentRuntimeForEvent = getMainRuntime(); // <<< FIX
       const telemetryForEvent = Context.get(currentRuntimeForEvent.context, TelemetryService);
       // ...
       if (isEncrypted && nostrPrivateKeyHex) {
         const resolvedNip04ForEvent = Context.get(currentRuntimeForEvent.context, NIP04Service);
         const decryptEffect = decryptNip04Content(/* ... */);
         const decryptExit = await Effect.runPromiseExit(
           Effect.provideService(decryptEffect, NIP04Service, resolvedNip04ForEvent)
             .pipe(Effect.provide(currentRuntimeForEvent)) // Also provide current runtime to the whole chain
         );
         // ...
       }
     };
     // ...
   }, [/* ... */]);
   ```

**II. Modify Long-Running Service Fibers in `Kind5050DVMServiceImpl.ts`:**

**1. File: `src/services/dvm/Kind5050DVMServiceImpl.ts`**

   *   **Action for `checkAndUpdateInvoiceStatusesLogic`:** This function is called repeatedly by `invoiceCheckFiber`. It must resolve its dependent services (`SparkService`, `TelemetryService`, `NostrService`) from `getMainRuntime()` on *each iteration*, not from a `(ctx)` argument if that context is from the fiber's initial fork time.

   ```typescript
   // src/services/dvm/Kind5050DVMServiceImpl.ts
   // ... inside Kind5050DVMServiceLive = Layer.scoped(...) ...

   const checkAndUpdateInvoiceStatusesLogic = (): Effect.Effect<void, DVMError | TrackEventError, never> => // R = never
     Effect.gen(function* (_) {
       const currentRuntime = getMainRuntime(); // <<< FIX: Get fresh runtime on each iteration

       // Resolve services from the fresh runtime for this iteration
       const localTelemetry = yield* _(Effect.provide(TelemetryService, currentRuntime));
       const localSpark = yield* _(Effect.provide(SparkService, currentRuntime));
       const localNostr = yield* _(Effect.provide(NostrService, currentRuntime));

       // ... (rest of checkAndUpdateInvoiceStatusesLogic using these 'local' services) ...
       // Example: const invoiceStatusResult = yield* _(localSpark.checkInvoiceStatus(jobToPoll.invoice).pipe(...));
       // Example: yield* _(localTelemetry.trackEvent(...).pipe(Effect.ignoreLogged));
       // If getJobHistory is called, it must also be provided with currentRuntime or use it internally.
       // For example:
       // const historyResult = yield* _(
       //   getJobHistory({ page: 1, pageSize: 500 }) // This function needs to resolve its deps freshly too or be passed currentRuntime
       //     .pipe(Effect.provide(currentRuntime)) // Assuming getJobHistory is an Effect needing a runtime context
       // );
     });

   // The invoiceCheckFiber setup in startListening():
   // ...
   if (!invoiceCheckFiber) {
     const scheduledInvoiceChecks = Effect.repeat(
       checkAndUpdateInvoiceStatusesLogic(), // This Effect will now resolve services freshly.
       Schedule.spaced(Duration.seconds(OVERALL_PENDING_JOBS_CHECK_INTERVAL_S))
     );
     // The fiber is forked with the runtime context of when `startListening` was called,
     // but the `checkAndUpdateInvoiceStatusesLogic` Effect itself dynamically fetches the fresh runtime.
     invoiceCheckFiber = Effect.runFork(scheduledInvoiceChecks);
   }
   // ...
   ```

   *   **Action for `onEvent` callback (Nostr subscription handler):** When `processJobRequestInternal` is called from `onEvent`, it *must* be provided with the current/fresh runtime.

   ```typescript
   // src/services/dvm/Kind5050DVMServiceImpl.ts
   // ... inside startListening ...
   const onEvent = (event: NostrEvent) => {
     if (isActiveInternal) {
       // Provide the fresh runtime to processJobRequestInternal
       Effect.runFork(processJobRequestInternal(event).pipe(Effect.provide(getMainRuntime()))); // <<< FIX
     }
   };
   // ...
   currentSubscription = yield* _(
     nostr.subscribeToEvents(filters, onEvent, relays, onEOSE)
     // ...
   );
   ```

   *   **Action for `processJobRequestInternal` and `processPaidJob`:** These functions are more complex. They are already `Effect.gen` functions. The simplest way to ensure they use fresh services is to make them resolve `SparkService` (and other re-initializable services) internally from `getMainRuntime()` at the start of their execution, similar to `checkAndUpdateInvoiceStatusesLogic`.

   ```typescript
   // src/services/dvm/Kind5050DVMServiceImpl.ts
   // (Conceptual change, adapt carefully to existing structure)

   const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
     Effect.gen(function* (_) {
       const currentRuntime = getMainRuntime(); // <<< FIX
       const localSpark = yield* _(Effect.provide(SparkService, currentRuntime)); // Get fresh SparkService
       const localNip04 = yield* _(Effect.provide(NIP04Service, currentRuntime));
       const localTelemetry = yield* _(Effect.provide(TelemetryService, currentRuntime));
       // Get config from store or pass as param, as it might change too
       const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
       // ...
       // Use localSpark, localNip04, localTelemetry and effectiveConfig throughout this function
       // For example:
       // const invoiceResult = yield* _(
       //   localSpark.createLightningInvoice(invoiceParams).pipe(Effect.mapError(...))
       // );
     });

   // Apply similar pattern to processPaidJob
   const processPaidJob = (pendingJob: PendingJob, isOptimistic: boolean = false): Effect.Effect<void, DVMError, never> =>
     Effect.gen(function* (_) {
       const currentRuntime = getMainRuntime(); // <<< FIX
       const localAgentLM = yield* _(Effect.provide(AgentLanguageModel.Tag, currentRuntime));
       const localNostr = yield* _(Effect.provide(NostrService, currentRuntime));
       const localNip04 = yield* _(Effect.provide(NIP04Service, currentRuntime));
       const localTelemetry = yield* _(Effect.provide(TelemetryService, currentRuntime));
       // ...
       // Use localAgentLM, localNostr, localNip04, localTelemetry throughout
     });
   ```

**III. Final Review of `src/services/runtime.ts`:**

*   **Action:** No direct changes seem necessary here based on the fix, as `reinitializeRuntime` already rebuilds `FullAppLayer` using the current `globalWalletConfig.mnemonic`. The issue is that consumers of the runtime were not picking up the *new* `mainRuntimeInstance` or its reconfigured services.

---

By systematically applying this "fetch fresh runtime at point of execution" pattern, especially in React components/hooks and in the service layer for long-running or callback-triggered Effects, the DVM should now correctly use the real `SparkServiceLive` when a user wallet is initialized, thus creating real Lightning invoices.
