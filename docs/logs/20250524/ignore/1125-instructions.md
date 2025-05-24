Okay, Agent, based on the payment flow analysis (`docs/logs/20250524/1550-payment-flow-analysis.md`), the primary issue is that the DVM (provider) isn't detecting invoice payments in a timely manner, even though the consumer's wallet reports payment success. This is attributed to Lightning Network propagation delays or issues with payment detection timing on the provider's side.

Here are the specific coding instructions to implement fixes in `src/services/dvm/Kind5050DVMServiceImpl.ts`. These changes will make the DVM's payment checking more robust by adjusting polling intervals, implementing per-job backoff, and ensuring jobs time out gracefully.

**Target File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`

**Instructions:**

1.  **Add/Update Constants:**
    At the top of the file (or within the `Kind5050DVMServiceLive` scope if preferred for encapsulation), define or update these constants:

    ```typescript
    import { /* ..., */ Duration, Schedule } from "effect"; // Ensure Duration and Schedule are imported

    // ... other imports ...

    const JOB_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for a job to be paid
    const JOB_POLL_INITIAL_DELAY_MS = 5_000;     // Start polling a specific job after 5 seconds
    const JOB_POLL_MAX_DELAY_MS = 60_000;        // Max delay between polls for a specific job is 1 minute
    const JOB_POLL_FACTOR = 1.5;                 // Exponential backoff factor for a specific job
    const OVERALL_PENDING_JOBS_CHECK_INTERVAL_S = 15; // Overall loop to check all pending jobs every 15 seconds
    ```

2.  **Update `PendingJob` Interface/Type:**
    Locate the `PendingJob` interface (it's defined inline within `Kind5050DVMServiceLive`). Add `lastPolledAt` and `pollAttempts` fields:

    ```typescript
    // Inside Kind5050DVMServiceLive = Layer.scoped( ... Effect.gen(function* (_) { ...
    // ...
    interface PendingJob {
      requestEvent: NostrEvent;
      invoice: string;
      paymentHash: string; // Ensure this is present
      amountSats: number;
      createdAt: number;    // Timestamp when the job was added to pendingJobs
      prompt: string;
      isEncrypted: boolean;
      lastPolledAt: number; // Timestamp of the last poll attempt for this job
      pollAttempts: number; // Number of polling attempts for this job
    }
    const pendingJobs = new Map<string, PendingJob>();
    // ...
    ```

3.  **Update `processJobRequestInternal` (the payment-first version):**
    When a new job is added to the `pendingJobs` map, initialize the new polling fields:

    ```typescript
    // Inside processJobRequestInternal, when setting pendingJob:
    // ...
    pendingJobs.set(jobRequestEvent.id, {
      requestEvent: jobRequestEvent,
      invoice: bolt11Invoice,
      paymentHash: invoiceResult.invoice.paymentHash, // Make sure paymentHash is included
      amountSats: priceSats,
      createdAt: Date.now(),
      prompt: prompt,
      isEncrypted: isRequestEncrypted,
      lastPolledAt: 0, // Initialize to 0 to ensure the first check in the loop happens without delay
      pollAttempts: 0,
    });
    // ...
    ```

4.  **Refactor `checkAndUpdateInvoiceStatusesLogic` Function:**
    This function is called by the `invoiceCheckFiber`. Modify its logic as follows:

    ```typescript
    const checkAndUpdateInvoiceStatusesLogic = (): Effect.Effect<
      void,
      DVMError | TrackEventError,
      SparkService | TelemetryService | NostrService // Dependencies this function needs from its context
    > =>
      Effect.gen(function* (ctx) { // Add ctx to access services
        const localTelemetry = yield* ctx(TelemetryService);
        const localSpark = yield* ctx(SparkService);
        const localNostr = yield* ctx(NostrService); // For publishFeedback

        yield* _(localTelemetry.trackEvent({
          category: "dvm:payment_check",
          action: "check_all_invoices_start",
          label: `Checking ${pendingJobs.size} pending jobs`,
        }).pipe(Effect.ignoreLogged));

        if (pendingJobs.size === 0) {
          yield* _(localTelemetry.trackEvent({
            category: "dvm:payment_check",
            action: "no_pending_jobs_to_check",
          }).pipe(Effect.ignoreLogged));
          return; // Exit if no pending jobs
        }

        for (const [jobId, jobEntry] of pendingJobs.entries()) {
          // Use jobEntry which is a direct reference from the map for this iteration
          const now = Date.now();

          // 1. Check for overall job payment timeout
          if (now - jobEntry.createdAt > JOB_PAYMENT_TIMEOUT_MS) {
            pendingJobs.delete(jobId); // Remove from pending
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "job_payment_timeout",
              label: jobId,
              value: `Job timed out after ${JOB_PAYMENT_TIMEOUT_MS / 1000}s`,
            }).pipe(Effect.ignoreLogged));

            const timeoutFeedback = createNip90FeedbackEvent(
              useDVMSettingsStore.getState().getEffectiveConfig().dvmPrivateKeyHex,
              jobEntry.requestEvent,
              "error",
              "Payment timed out by DVM.",
              undefined,
              localTelemetry, // Pass telemetry from context
            );
            yield* _(publishFeedback(timeoutFeedback)); // publishFeedback uses the nostr service from outer scope
            continue; // Move to the next job
          }

          // 2. Check if it's time to poll this specific job based on its backoff
          const backoffDelay = Math.min(
            JOB_POLL_INITIAL_DELAY_MS * Math.pow(JOB_POLL_FACTOR, jobEntry.pollAttempts),
            JOB_POLL_MAX_DELAY_MS
          );

          if (jobEntry.pollAttempts > 0 && (now - jobEntry.lastPolledAt < backoffDelay)) {
            // Not time to poll this job yet (skip if pollAttempts is 0 for immediate first check logic)
            continue;
          }

          const currentPollAttempt = jobEntry.pollAttempts + 1;

          // Update lastPolledAt and pollAttempts for this job *before* the async call
          const updatedJobEntryForPoll = {
            ...jobEntry,
            lastPolledAt: now,
            pollAttempts: currentPollAttempt
          };
          pendingJobs.set(jobId, updatedJobEntryForPoll); // Update map immediately

          yield* _(localTelemetry.trackEvent({
            category: "dvm:payment_check",
            action: "individual_invoice_check_start",
            label: `Job ID: ${jobId}, Attempt: ${currentPollAttempt}`,
            value: `Invoice: ${jobEntry.invoice.substring(0,20)}...`,
          }).pipe(Effect.ignoreLogged));

          // Effect to check invoice status, with simple retry for NETWORK errors to spark server
          const checkStatusWithRetryEffect = localSpark.checkInvoiceStatus(jobEntry.invoice).pipe(
            Effect.retry(
              Schedule.recurs(2).pipe(Schedule.compose(Schedule.spaced(Duration.seconds(2))))
            ),
            Effect.catchTag("SparkError", (e) => {
              Effect.runFork(localTelemetry.trackEvent({
                category: "dvm:payment_check_error",
                action: "spark_check_invoice_failed_final",
                label: `Job ID: ${jobId}`,
                value: e.message
              }).pipe(Effect.ignoreLogged));
              return Effect.succeed({ status: "error" as const, message: e.message });
            })
          );

          const invoiceStatusResult = yield* _(checkStatusWithRetryEffect);

          if (invoiceStatusResult.status === "paid") {
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "invoice_paid_detected",
              label: jobId,
              value: `Sats: ${jobEntry.amountSats}, Paid msats: ${invoiceStatusResult.amountPaidMsats || 'N/A'}`,
            }).pipe(Effect.ignoreLogged));

            // processPaidJob now takes the specific job entry
            // It will remove the job from pendingJobs map upon successful processing.
            yield* _(processPaidJob(updatedJobEntryForPoll).pipe( // Pass the updated entry
              Effect.catchAllCause(cause => {
                Effect.runFork(localTelemetry.trackEvent({
                    category: "dvm:error",
                    action: "process_paid_job_failed_after_payment",
                    label: `Job ID: ${jobId}`,
                    value: Cause.pretty(cause)
                }).pipe(Effect.ignoreLogged));
                // If processing a paid job fails, it remains in pendingJobs and will be timed out.
                // Or, you might want specific error feedback here.
                return Effect.void;
              })
            ));
          } else if (invoiceStatusResult.status === "expired") {
            pendingJobs.delete(jobId);
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "invoice_expired_detected_by_dvm",
              label: jobId,
            }).pipe(Effect.ignoreLogged));

            const expiredFeedback = createNip90FeedbackEvent(
              useDVMSettingsStore.getState().getEffectiveConfig().dvmPrivateKeyHex,
              jobEntry.requestEvent,
              "error",
              "Payment invoice expired (checked by DVM).",
              undefined,
              localTelemetry,
            );
            yield* _(publishFeedback(expiredFeedback));
          } else if (invoiceStatusResult.status === "error") {
            // Error during checkInvoiceStatus (after retries)
            // Job remains in pendingJobs; pollAttempts already updated. It will be timed out eventually.
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment_check_error",
              action: "invoice_check_returned_error_status",
              label: `Job ID: ${jobId}`,
              value: `Attempt: ${currentPollAttempt}. Error: ${invoiceStatusResult.message || 'Unknown check error'}`,
            }).pipe(Effect.ignoreLogged));
          } else { // Still "pending"
            // Job remains in pendingJobs; pollAttempts already updated.
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment_check",
              action: "invoice_still_pending_after_check",
              label: `Job ID: ${jobId}`,
              value: `Attempt: ${currentPollAttempt}`,
            }).pipe(Effect.ignoreLogged));
          }
        } // end for loop
      });
    ```

5.  **Update `invoiceCheckFiber` Schedule:**
    Locate the `invoiceCheckFiber` initialization in `startListening` (or if it's at module scope, adjust its scheduling when `startListening` is called).

    ```typescript
    // Inside startListening(), where invoiceCheckFiber is managed:
    // ...
    if (!invoiceCheckFiber) { // Or if it's completed/interrupted
      const scheduledInvoiceChecks = Effect.repeat(
        checkAndUpdateInvoiceStatusesLogic().pipe(
          // Provide dependencies needed by checkAndUpdateInvoiceStatusesLogic
          Effect.provideService(SparkService, spark),
          Effect.provideService(NostrService, nostr),
          Effect.provideService(TelemetryService, telemetry),
          Effect.catchAllCause((cause) => {
            Effect.runFork(telemetry.trackEvent({ // Use telemetry from outer scope or pass via ctx
              category: "dvm:error",
              action: "invoice_check_loop_unhandled_error",
              value: Cause.pretty(cause),
            }).pipe(Effect.ignoreLogged));
            console.error("[Kind5050DVMServiceImpl] Unhandled error in main invoice check loop:", Cause.pretty(cause));
            return Effect.logInfo("Continuing invoice check loop despite unhandled error in one cycle.");
          }),
        ),
        // Update the schedule interval here:
        Schedule.spaced(Duration.seconds(OVERALL_PENDING_JOBS_CHECK_INTERVAL_S))
      );
      invoiceCheckFiber = Effect.runFork(scheduledInvoiceChecks);
    }
    // ...
    ```

6.  **Ensure `processPaidJob` Removes Job from `pendingJobs`:**
    At the end of the `processPaidJob` function, after successfully publishing the job result and success feedback, ensure the job is removed:

    ```typescript
    // Inside processPaidJob, after successful result publication and feedback:
    // ...
    // (Ensure jobRequestEvent is correctly scoped or passed if processPaidJob is refactored)
    // const jobRequestEvent = pendingJob.requestEvent; // If pendingJob is passed

    pendingJobs.delete(jobRequestEvent.id); // Use the ID from the event part of PendingJob

    yield* _(
      telemetry.trackEvent({ // telemetry from the Kind5050DVMServiceLive scope
        category: "dvm:job_lifecycle",
        action: "job_removed_from_pending_after_processing",
        label: jobRequestEvent.id,
      }).pipe(Effect.ignoreLogged),
    );
    ```

7.  **Ensure `paymentHash` is stored in `PendingJob`:**
    The `paymentHash` is crucial for some `checkInvoiceStatus` implementations. Update `processJobRequestInternal` to store it.

    ```typescript
    // Inside processJobRequestInternal, after creating invoiceResult:
    // const bolt11Invoice = invoiceResult.invoice.encodedInvoice;
    // const paymentHash = invoiceResult.invoice.paymentHash; // Get payment hash from invoiceResult
    // ...
    // pendingJobs.set(jobRequestEvent.id, {
    //   // ... other fields ...
    //   invoice: bolt11Invoice,
    //   paymentHash: paymentHash, // Store this
    //   // ...
    // });
    ```

These changes should make the DVM more resilient to Lightning Network payment propagation delays by checking more frequently overall, extending the total time it waits for a payment, and implementing a per-job backoff strategy for polling individual invoices.Okay, Agent, let's get this NIP-90 payment flow working reliably. Based on the analysis, the core issue is the DVM (provider) not detecting invoice payments in time due to Lightning Network propagation delays or insufficient polling on the DVM's side.

We will modify `src/services/dvm/Kind5050DVMServiceImpl.ts` to implement more robust payment checking.

**Target File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`

Here are the specific coding instructions:

1.  **Import `Duration` and `Schedule` from `effect`:**
    Make sure these are imported at the top of the file:
    ```typescript
    import { /* ..., */ Duration, Schedule } from "effect";
    ```

2.  **Define New Constants:**
    Place these constants near the top of the file, possibly after imports or before the `Kind5050DVMServiceLive` definition:
    ```typescript
    const JOB_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for a job to be paid
    const JOB_POLL_INITIAL_DELAY_MS = 5_000;     // Start polling a specific job's invoice after 5 seconds
    const JOB_POLL_MAX_DELAY_MS = 60_000;        // Max delay between polls for a specific job is 1 minute
    const JOB_POLL_FACTOR = 1.5;                 // Exponential backoff factor for a specific job
    const OVERALL_PENDING_JOBS_CHECK_INTERVAL_S = 15; // Overall loop to check all pending jobs every 15 seconds
    ```

3.  **Update `PendingJob` Interface Definition:**
    This interface is defined inline within the `Kind5050DVMServiceLive`'s `Effect.gen` scope. Add `lastPolledAt` and `pollAttempts` fields. Also ensure `paymentHash` is part of it.

    ```typescript
    // Inside Kind5050DVMServiceLive = Layer.scoped( ... Effect.gen(function* (_) { ...
    // ...
    interface PendingJob {
      requestEvent: NostrEvent;
      invoice: string;
      paymentHash: string; // Ensure this field is present
      amountSats: number;
      createdAt: number;    // Timestamp when the job was added to pendingJobs
      prompt: string;
      isEncrypted: boolean;
      lastPolledAt: number; // Timestamp of the last poll attempt for this job
      pollAttempts: number; // Number of polling attempts for this job
    }
    const pendingJobs = new Map<string, PendingJob>();
    // ...
    ```

4.  **Modify `processJobRequestInternal` (the payment-first version):**
    When adding a job to the `pendingJobs` map, initialize the new polling fields and ensure `paymentHash` is stored.

    ```typescript
    // Inside processJobRequestInternal, after creating invoiceResult:
    // ...
    const bolt11Invoice = invoiceResult.invoice.encodedInvoice;
    const paymentHash = invoiceResult.invoice.paymentHash; // Extract paymentHash from the invoice result

    pendingJobs.set(jobRequestEvent.id, {
      requestEvent: jobRequestEvent,
      invoice: bolt11Invoice,
      paymentHash: paymentHash, // Store the paymentHash
      amountSats: priceSats,
      createdAt: Date.now(),
      prompt: prompt,
      isEncrypted: isRequestEncrypted,
      lastPolledAt: 0, // Initialize to 0 to ensure the first check in the loop runs immediately
      pollAttempts: 0,
    });
    // ...
    ```

5.  **Refactor `checkAndUpdateInvoiceStatusesLogic` Function:**
    Replace the existing `checkAndUpdateInvoiceStatuses` function (or the logic inside the fiber if it's anonymous) with the following enhanced version. Ensure it's correctly typed to accept its dependencies from the context (`ctx`).

    ```typescript
    const checkAndUpdateInvoiceStatusesLogic = (): Effect.Effect<
      void,
      DVMError | TrackEventError, // Ensure DVMError includes all possible failure types from this logic
      SparkService | TelemetryService | NostrService // Explicitly list service dependencies
    > =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localSpark = yield* ctx(SparkService);
        const localNostr = yield* ctx(NostrService); // For publishFeedback

        yield* _(localTelemetry.trackEvent({
          category: "dvm:payment_check",
          action: "check_all_invoices_start",
          label: `Checking ${pendingJobs.size} pending jobs`,
        }).pipe(Effect.ignoreLogged));

        if (pendingJobs.size === 0) {
          yield* _(localTelemetry.trackEvent({
            category: "dvm:payment_check",
            action: "no_pending_jobs_to_check",
          }).pipe(Effect.ignoreLogged));
          return; // Exit if no pending jobs
        }

        for (const [jobId, currentJobEntry] of pendingJobs.entries()) {
          // Use a fresh copy from the map for each iteration's logic
          const jobToPoll = pendingJobs.get(jobId);
          if (!jobToPoll) { // Should not happen if iterating map.keys() or map.entries() directly
            continue;
          }

          const now = Date.now();

          // 1. Check for overall job payment timeout
          if (now - jobToPoll.createdAt > JOB_PAYMENT_TIMEOUT_MS) {
            pendingJobs.delete(jobId); // Remove from pending
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "job_payment_timeout",
              label: jobId,
              value: `Job timed out after ${JOB_PAYMENT_TIMEOUT_MS / 1000}s`,
            }).pipe(Effect.ignoreLogged));

            const timeoutFeedback = createNip90FeedbackEvent(
              useDVMSettingsStore.getState().getEffectiveConfig().dvmPrivateKeyHex,
              jobToPoll.requestEvent,
              "error",
              "Payment timed out by DVM.",
              undefined,
              localTelemetry,
            );
            yield* _(publishFeedback(timeoutFeedback));
            continue;
          }

          // 2. Check if it's time to poll this specific job based on its backoff
          const backoffDelay = Math.min(
            JOB_POLL_INITIAL_DELAY_MS * Math.pow(JOB_POLL_FACTOR, jobToPoll.pollAttempts),
            JOB_POLL_MAX_DELAY_MS
          );

          if (jobToPoll.pollAttempts > 0 && (now - jobToPoll.lastPolledAt < backoffDelay)) {
            continue; // Not time to poll this specific job yet
          }

          const nextPollAttempt = jobToPoll.pollAttempts + 1;

          // Update lastPolledAt and pollAttempts for this job *before* the async call
          const updatedJobEntryForPoll = {
            ...jobToPoll,
            lastPolledAt: now,
            pollAttempts: nextPollAttempt
          };
          pendingJobs.set(jobId, updatedJobEntryForPoll);

          yield* _(localTelemetry.trackEvent({
            category: "dvm:payment_check",
            action: "individual_invoice_check_start",
            label: `Job ID: ${jobId}, Attempt: ${nextPollAttempt}`,
            value: `Invoice: ${jobToPoll.invoice.substring(0,20)}...`,
          }).pipe(Effect.ignoreLogged));

          const checkStatusWithRetryEffect = localSpark.checkInvoiceStatus(jobToPoll.invoice).pipe(
            Effect.retry(
              Schedule.recurs(2).pipe(Schedule.compose(Schedule.spaced(Duration.seconds(2))))
            ),
            Effect.catchTag("SparkError", (e) => {
              Effect.runFork(localTelemetry.trackEvent({ // Fork telemetry to not affect main flow
                category: "dvm:payment_check_error",
                action: "spark_check_invoice_failed_final",
                label: `Job ID: ${jobId}`,
                value: e.message
              }).pipe(Effect.ignoreLogged));
              return Effect.succeed({ status: "error" as const, message: e.message });
            })
          );

          const invoiceStatusResult = yield* _(checkStatusWithRetryEffect);

          if (invoiceStatusResult.status === "paid") {
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "invoice_paid_detected",
              label: jobId,
              value: `Sats: ${jobToPoll.amountSats}, Paid Amount: ${invoiceStatusResult.amountPaidMsats || 'N/A'} msats`,
            }).pipe(Effect.ignoreLogged));

            yield* _(processPaidJob(updatedJobEntryForPoll).pipe(
              Effect.catchAllCause(cause => {
                Effect.runFork(localTelemetry.trackEvent({
                    category: "dvm:error",
                    action: "process_paid_job_failed_after_payment",
                    label: `Job ID: ${jobId}`,
                    value: Cause.pretty(cause)
                }).pipe(Effect.ignoreLogged));
                // Job remains in pendingJobs to be timed out if processing fails.
                return Effect.void;
              })
            ));
          } else if (invoiceStatusResult.status === "expired") {
            pendingJobs.delete(jobId);
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment",
              action: "invoice_expired_detected_by_dvm",
              label: jobId,
            }).pipe(Effect.ignoreLogged));

            const expiredFeedback = createNip90FeedbackEvent(
              useDVMSettingsStore.getState().getEffectiveConfig().dvmPrivateKeyHex,
              jobToPoll.requestEvent,
              "error",
              "Payment invoice expired (DVM check).",
              undefined,
              localTelemetry,
            );
            yield* _(publishFeedback(expiredFeedback));
          } else if (invoiceStatusResult.status === "error") {
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment_check_error",
              action: "invoice_check_returned_error_status",
              label: `Job ID: ${jobId}`,
              value: `Attempt: ${nextPollAttempt}. Error: ${invoiceStatusResult.message || 'Unknown check error'}`,
            }).pipe(Effect.ignoreLogged));
            // Job stays in pendingJobs, pollAttempts was updated.
          } else { // Still "pending"
            yield* _(localTelemetry.trackEvent({
              category: "dvm:payment_check",
              action: "invoice_still_pending_after_check",
              label: `Job ID: ${jobId}`,
              value: `Attempt: ${nextPollAttempt}`,
            }).pipe(Effect.ignoreLogged));
            // Job stays in pendingJobs, pollAttempts was updated.
          }
        }
      });
    ```

6.  **Update `invoiceCheckFiber` Schedule in `startListening`:**
    Modify the `Schedule.spaced` call for `scheduledInvoiceChecks`.

    ```typescript
    // Inside startListening(), where invoiceCheckFiber is initialized:
    // ...
    if (!invoiceCheckFiber) {
      const scheduledInvoiceChecks = Effect.repeat(
        checkAndUpdateInvoiceStatusesLogic().pipe(
          // Provide dependencies for checkAndUpdateInvoiceStatusesLogic itself
          // These services (spark, nostr, telemetry) are from the Kind5050DVMServiceLive's Effect.gen scope
          Effect.provideService(SparkService, spark),
          Effect.provideService(NostrService, nostr),
          Effect.provideService(TelemetryService, telemetry),
          Effect.catchAllCause((cause) => {
            Effect.runFork(telemetry.trackEvent({ // Use telemetry from the outer scope
              category: "dvm:error",
              action: "invoice_check_loop_unhandled_error",
              value: Cause.pretty(cause),
            }).pipe(Effect.ignoreLogged));
            console.error("[Kind5050DVMServiceImpl] Unhandled error in main invoice check loop:", Cause.pretty(cause));
            return Effect.logInfo("Continuing invoice check loop despite unhandled error in one cycle.");
          }),
        ),
        // Update the schedule interval here:
        Schedule.spaced(Duration.seconds(OVERALL_PENDING_JOBS_CHECK_INTERVAL_S))
      );
      invoiceCheckFiber = Effect.runFork(scheduledInvoiceChecks);
    }
    // ...
    ```

7.  **Ensure `processPaidJob` Removes Job from `pendingJobs`:**
    At the end of the `processPaidJob` function, after successfully publishing the job result event and the "success" feedback event, add the logic to remove the job from the `pendingJobs` map.

    ```typescript
    // Inside processPaidJob function:
    // ... (after yield* _(publishFeedback(successFeedback));) ...

    // Remove from pending jobs after successful processing and result publication
    pendingJobs.delete(jobRequestEvent.id); // jobRequestEvent is from pendingJob.requestEvent

    yield* _(
      telemetry.trackEvent({ // Ensure telemetry is from the correct scope (likely outer service scope)
        category: "dvm:job_lifecycle",
        action: "job_removed_from_pending_after_processing",
        label: jobRequestEvent.id,
      }).pipe(Effect.ignoreLogged),
    );
    ```

This concludes the immediate fixes based on the analysis. Test thoroughly to ensure the payment flow is now more resilient to timing issues.
