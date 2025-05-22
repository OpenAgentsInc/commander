Okay, Agent, the next phase for the `SELLING_COMPUTE` plan is "Payment verification and handling". This involves enabling the DVM to track invoices it has sent and verify if they've been paid using the `SparkService`.

Here are the specific instructions:

**I. Enhance Data Structures and `Kind5050DVMService` for Payment Tracking**

1.  **File: `src/types/dvm.ts`**

    - Modify the `JobHistoryEntry` interface to include fields for storing invoice details:
      - Add `invoiceBolt11?: string;`
      - Add `invoicePaymentHash?: string;`

    ```typescript
    // src/types/dvm.ts
    // ... (JobStatus type remains the same) ...

    export interface JobHistoryEntry {
      id: string;
      timestamp: number;
      jobRequestEventId: string;
      requesterPubkey: string;
      kind: number;
      inputSummary: string;
      status: JobStatus;
      ollamaModelUsed?: string;
      tokensProcessed?: number;
      invoiceAmountSats?: number;
      invoiceBolt11?: string; // <-- ADDED: The BOLT11 invoice string sent to the client
      invoicePaymentHash?: string; // <-- ADDED: The payment hash of the invoice
      paymentReceivedSats?: number;
      resultSummary?: string;
      errorDetails?: string;
    }

    // ... (JobStatistics interface remains the same) ...
    ```

2.  **File: `src/services/dvm/Kind5050DVMServiceImpl.ts`**

    - **Modify `processJobRequestInternal`:**
      - After successfully creating a Lightning invoice with `spark.createLightningInvoice`, ensure the `bolt11Invoice` (from `invoiceSDKResult.invoice.encodedInvoice`) and `paymentHash` (from `invoiceSDKResult.invoice.paymentHash`) are stored in the conceptual `JobHistoryEntry` for this job.
      - The initial status of the job at this point (after sending the Kind 6xxx result) should be set to `'pending_payment'`.
      - **Note:** Since job history is currently mocked, these updates will be conceptual for now, preparing for when persistence is added. For testing this phase, you might need to temporarily add these fields to the mock data structure if `getJobHistory` relies on it.
    - **Add a new private member for the invoice checking fiber:**
      ```typescript
      let invoiceCheckFiber: Fiber.RuntimeFiber<void, never> | null = null;
      ```
    - **Create a new private method `checkAndUpdateInvoiceStatuses()`:**

      - This method will be an `Effect.Effect<void, DVMError | TrackEventError, Kind5050DVMService | SparkService | TelemetryService>`.
      - It should:
        1.  Log a telemetry event: `dvm:payment_check_start`.
        2.  Call `getJobHistory({ page: 1, pageSize: 100 })` (or a large enough pageSize to get all relevant jobs for now) on itself (`this` service instance, or directly if within the same Effect scope).
        3.  Filter these history entries for jobs with `status === 'pending_payment'` AND a non-empty `invoiceBolt11`.
        4.  For each such job:
            - Log a telemetry event: `dvm:payment_check_invoice_attempt`, with `jobId` and `invoiceBolt11`.
            - Call `spark.checkInvoiceStatus(job.invoiceBolt11)`.
            - If the `checkInvoiceStatus` returns `{ status: 'paid', amountPaidMsats?: number }`:
              - Update the job's status to `'paid'` (conceptually, for now, this means logging it or preparing data for a future `updateJobHistoryEntry` method).
              - If `amountPaidMsats` is available, update `paymentReceivedSats` (convert msats to sats).
              - Log a telemetry event: `dvm:payment_check_invoice_paid`.
            - If status is `'expired'` or `'error'`:
              - Log a telemetry event: `dvm:payment_check_invoice_failed_or_expired`, with details.
              - Optionally, update job status to `'error'` or a new status like `'payment_failed'` if desired (for now, leaving it as `'pending_payment'` if not explicitly paid is fine).
            - Handle errors from `checkInvoiceStatus` with telemetry.
        5.  Log a telemetry event: `dvm:payment_check_complete`.

    - **Modify `startListening()`:**

      - After successfully starting the Nostr subscription and setting `isActiveInternal = true;`:
      - Create a scheduled effect that runs `checkAndUpdateInvoiceStatuses()` periodically (e.g., every 2 minutes).

        ```typescript
        // Inside startListening, after isActiveInternal = true;
        const invoiceCheckEffect = this.checkAndUpdateInvoiceStatuses().pipe(
          // Assuming 'this' context works, or pass dependencies
          Effect.catchAllCause(
            (cause) =>
              telemetry
                .trackEvent({
                  category: "dvm:error",
                  action: "invoice_check_loop_error",
                  label: "Error in periodic invoice check loop",
                  value: Cause.pretty(cause),
                })
                .pipe(Effect.ignoreLogged), // Log and ignore to keep the loop running
          ),
        );

        // Schedule the effect to run periodically
        const scheduledInvoiceCheck = Effect.repeat(
          invoiceCheckEffect,
          Schedule.spaced(Duration.minutes(2)), // Check every 2 minutes
        );

        // Fork the scheduled effect into its own fiber
        invoiceCheckFiber = Effect.runFork(
          // Provide necessary services to the checkAndUpdateInvoiceStatuses effect
          // This requires careful dependency management.
          // If checkAndUpdateInvoiceStatuses is a method of the service instance,
          // it implicitly has access to `this.spark`, `this.telemetry`, etc.
          // If it's a standalone Effect, dependencies must be provided.
          // For now, let's assume it's a method that can access injected services.
          scheduledInvoiceCheck,
        );
        yield *
          _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "invoice_check_loop_started",
              })
              .pipe(Effect.ignoreLogged),
          );
        ```

    - **Modify `stopListening()`:**
      - If `invoiceCheckFiber` is active, interrupt it:
        ```typescript
        // Inside stopListening, before setting isActiveInternal = false;
        if (invoiceCheckFiber) {
          Effect.runFork(Fiber.interrupt(invoiceCheckFiber)); // Interrupt the fiber
          invoiceCheckFiber = null;
          yield *
            _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "invoice_check_loop_stopped",
                })
                .pipe(Effect.ignoreLogged),
            );
        }
        ```

**II. Enhance `SparkService` for Invoice Status Checking**

1.  **File: `src/services/spark/SparkService.ts`**

    - Add a new method definition to the `SparkService` interface:
      ```typescript
      checkInvoiceStatus(invoiceBolt11: string): Effect.Effect<{ status: 'pending' | 'paid' | 'expired' | 'error', amountPaidMsats?: number }, SparkError | TrackEventError, never>;
      ```

2.  **File: `src/services/spark/SparkServiceImpl.ts`**

    - Implement the `checkInvoiceStatus` method:
      - This method will call the appropriate Spark SDK function. Since the exact SDK method is not specified, you'll create a plausible interaction.
        - **Assumption:** The SDK has a method like `wallet.getInvoiceStatus({ invoice: string })` or `wallet.lookupInvoice({ paymentHash: string })`. If it uses payment hash, you'll need to parse the BOLT11 invoice to get the payment hash first (this might be complex, so for now, assume the SDK can check by BOLT11 string directly or a simplified payment hash retrieval).
      - The implementation should map the SDK's response statuses to `'pending' | 'paid' | 'expired' | 'error'`.
      - Include telemetry logging for the check attempt, success (with status), and failure.

    ```typescript
    // src/services/spark/SparkServiceImpl.ts
    // ... (imports) ...

    // Inside the object returned by Effect.gen in SparkServiceLive:
        // ... (existing methods) ...

        checkInvoiceStatus: (invoiceBolt11: string) =>
          Effect.gen(function* (_) {
            yield* _(telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'check_invoice_status_start',
              label: `Checking invoice: ${invoiceBolt11.substring(0, 20)}...`
            }));

            // Placeholder for actual SDK interaction
            // const paymentHash = yield* _(Effect.tryPromise({
            //   try: async () => { /* TODO: Parse invoiceBolt11 to get payment_hash if SDK needs it */ return "derived_payment_hash"; },
            //   catch: (e) => new SparkValidationError({ message: "Failed to parse invoice for payment hash", cause: e })
            // }));

            const sdkResult = yield* _(Effect.tryPromise({
              try: async () => {
                // ---- SDK STUB ----
                // Assume SDK has a method like this. Replace with actual SDK call.
                // This is a MOCK of what the SDK might return.
                if (invoiceBolt11.includes("paid_invoice_stub")) {
                  return { status: "PAID", amount_paid_msat: 100000 }; // Example paid status
                } else if (invoiceBolt11.includes("expired_invoice_stub")) {
                  return { status: "EXPIRED" };
                } else if (invoiceBolt11.includes("error_invoice_stub")) {
                  throw new MockRPCError("SDK error checking invoice"); // Use a mock SDK error
                }
                return { status: "PENDING" }; // Default to pending
                // ---- END SDK STUB ----
              },
              catch: (e) => {
                // Map SDK errors to SparkError types
                if (e instanceof MockRPCError) { // Replace with actual SparkSDK RPCError if available
                    return new SparkRPCError({ message: "Spark SDK RPC error checking invoice status", cause: e });
                }
                return new SparkLightningError({ message: "Failed to check invoice status via SparkSDK", cause: e });
              }
            }));

            let status: 'pending' | 'paid' | 'expired' | 'error' = 'pending';
            let amountPaidMsats: number | undefined = undefined;

            // Map SDK status to our defined status
            switch (sdkResult.status?.toUpperCase()) {
              case 'PAID':
              case 'COMPLETED': // Some LSPs might use 'COMPLETED'
                status = 'paid';
                amountPaidMsats = sdkResult.amount_paid_msat;
                break;
              case 'EXPIRED':
                status = 'expired';
                break;
              case 'PENDING':
              case 'UNPAID': // Some LSPs might use 'UNPAID'
                status = 'pending';
                break;
              default:
                status = 'error'; // Or treat unknown as pending/error
                yield* _(telemetry.trackEvent({
                  category: 'spark:lightning',
                  action: 'check_invoice_status_unknown_sdk_status',
                  label: `Unknown SDK status: ${sdkResult.status}`,
                  value: invoiceBolt11
                }));
                break;
            }

            yield* _(telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'check_invoice_status_success',
              label: `Invoice status: ${status}`,
              value: JSON.stringify({ invoice: invoiceBolt11.substring(0,20)+'...', amountPaidMsats })
            }));

            return { status, amountPaidMsats };
          }).pipe(
            Effect.tapError(err => telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'check_invoice_status_failure',
              label: err.message,
              value: JSON.stringify({ invoice: invoiceBolt11.substring(0,20)+'...' })
            }))
          ),
    ```

**III. UI Updates for Payment Status (Conceptual - DvmJobHistoryPane)**

- The `DvmJobHistoryPane.tsx` already displays job status using a badge. Ensure the `getStatusBadgeVariant` correctly handles the `'paid'` status (e.g., mapping it to the "default" success-like variant).
- If a job is `'paid'`, the `invoiceAmountSats` (or a new `paymentReceivedSats` if different and available) should accurately reflect what was paid.
- The "Refresh" button in `DvmJobHistoryPane.tsx` will indirectly show updated payment statuses because it refetches the job history, which should include any jobs whose statuses were updated by the DVM's periodic check.

**IV. Testing Considerations**

- **`Kind5050DVMServiceImpl.test.ts`:**
  - Add tests for `checkAndUpdateInvoiceStatuses`:
    - Mock `getJobHistory` to return jobs in `pending_payment` state with mock invoice details.
    - Mock `SparkService.checkInvoiceStatus` to simulate different outcomes (paid, pending, error).
    - Verify that job statuses are conceptually updated (e.g., by checking arguments to a mock `updateJobStatusInHistory` function if you were to implement one, or by checking telemetry logs).
  - Test that `startListening` correctly starts the invoice checking loop and `stopListening` interrupts it.
- **`SparkService.test.ts`:**
  - Add tests for the new `checkInvoiceStatus` method, mocking various SDK responses and ensuring correct mapping to `status` and `amountPaidMsats`, and that telemetry is logged.

This completes the instructions for implementing payment verification and handling. The DVM will now be able to track and attempt to verify payments for the jobs it processes.```typescript
// File: src/types/dvm.ts

export type JobStatus = 'pending_payment' | 'processing' | 'paid' | 'completed' | 'error' | 'cancelled';

export interface JobHistoryEntry {
id: string; // Unique ID for the history entry (e.g., could be derived from jobRequestEventId or a UUID)
timestamp: number; // Unix timestamp of when the job request was received or processed
jobRequestEventId: string; // ID of the original NIP-90 job request event (kind 5xxx)
requesterPubkey: string; // Pubkey of the user who requested the job
kind: number; // Original job kind (e.g., 5100)
inputSummary: string; // A brief summary of the job input (e.g., first 50 chars of a prompt)
status: JobStatus;
ollamaModelUsed?: string; // Model used for processing
tokensProcessed?: number; // If applicable, e.g., for text generation
invoiceAmountSats?: number; // Amount in sats requested
invoiceBolt11?: string; // <-- ADDED
invoicePaymentHash?: string; // <-- ADDED
paymentReceivedSats?: number; // Amount in sats actually received (for future payment verification)
resultSummary?: string; // Brief summary of the result or "N/A"
errorDetails?: string; // If status is 'error', details of the error
}

export interface JobStatistics {
totalJobsProcessed: number;
totalSuccessfulJobs: number;
totalFailedJobs: number;
totalRevenueSats: number; // Sum of `paymentReceivedSats` for paid/completed jobs
jobsPendingPayment: number;
averageProcessingTimeMs?: number; // Optional: For future calculation
modelUsageCounts?: Record<string, number>; // e.g., { "gemma2:latest": 50, "llama3": 20 }
}

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
import { Effect, Layer, Schema, Option, Cause, Fiber, Schedule, Duration } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService, TrackEventError } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError, LightningInvoice } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import { useDVMSettingsStore } from '@/stores/dvmSettingsStore';
import {
NIP90Input,
NIP90JobParam,
NIP90InputType
} from '@/services/nip90';
import {
Kind5050DVMService,
Kind5050DVMServiceConfig,
Kind5050DVMServiceConfigTag,
DVMConfigError,
DVMConnectionError,
DVMJobRequestError,
DVMJobProcessingError,
DVMPaymentError,
DVMError
} from './Kind5050DVMService';
import type { JobHistoryEntry, JobStatistics, JobStatus } from '@/types/dvm'; // Import JobStatus
// import \* as ParseResult from "@effect/schema/ParseResult"; // Not used for now

// Helper function createNip90FeedbackEvent remains the same
function createNip90FeedbackEvent(
dvmPrivateKeyHex: string,
requestEvent: NostrEvent,
status: "payment-required" | "processing" | "error" | "success" | "partial",
contentOrExtraInfo?: string,
amountDetails?: { amountMillisats: number; invoice?: string }
): NostrEvent {
const tags: string[][] = [
["e", requestEvent.id],
["p", requestEvent.pubkey],
];

const statusTagPayload = [status];
if (contentOrExtraInfo && (status === "error" || status === "processing" || status === "payment-required")) {
statusTagPayload.push(contentOrExtraInfo.substring(0, 256));
}
tags.push(statusTagPayload);

if (amountDetails) {
const amountTag = ["amount", amountDetails.amountMillisats.toString()];
if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
tags.push(amountTag);
}

const template: EventTemplate = {
kind: 7000,
created_at: Math.floor(Date.now() / 1000),
tags,
content: (status === "partial" || (status === "error" && contentOrExtraInfo && contentOrExtraInfo.length > 256)) ? (contentOrExtraInfo || "") : "",
};
return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

// Helper function createNip90JobResultEvent remains the same
function createNip90JobResultEvent(
dvmPrivateKeyHex: string,
requestEvent: NostrEvent,
jobOutputContent: string,
invoiceAmountMillisats: number,
bolt11Invoice: string,
outputIsEncrypted: boolean
): NostrEvent {
const tags: string[][] = [
["request", JSON.stringify(requestEvent)],
["e", requestEvent.id],
["p", requestEvent.pubkey],
["amount", invoiceAmountMillisats.toString(), bolt11Invoice]
];

if (outputIsEncrypted) tags.push(["encrypted"]);
requestEvent.tags.filter(t => t[0] === 'i').forEach(t => tags.push(t));

const resultKind = requestEvent.kind + 1000;
if (resultKind < 6000 || resultKind > 6999) {
console.error(`Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`);
}

const template: EventTemplate = {
kind: Math.max(6000, Math.min(6999, resultKind)),
created_at: Math.floor(Date.now() / 1000),
tags,
content: jobOutputContent,
};
return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

export const Kind5050DVMServiceLive = Layer.scoped(
Kind5050DVMService,
Effect.gen(function* (\_) {
const defaultConfig = yield* _(Kind5050DVMServiceConfigTag);
const telemetry = yield\* _(TelemetryService);
const nostr = yield* \_(NostrService);
const ollama = yield* _(OllamaService);
const spark = yield\* _(SparkService);
const nip04 = yield\* \_(NIP04Service);

    let isActiveInternal = useDVMSettingsStore.getState().getEffectiveConfig().active;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex = useDVMSettingsStore.getState().getDerivedPublicKeyHex() || defaultConfig.dvmPublicKeyHex;
    let invoiceCheckFiber: Fiber.RuntimeFiber<void, never> | null = null; // <-- ADDED

    yield* _(telemetry.trackEvent({
      category: 'dvm:init',
      action: 'kind5050_dvm_service_init',
      label: `Initial state: ${isActiveInternal ? 'active' : 'inactive'}`,
    }).pipe(Effect.ignoreLogged));

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: err.message
          })
        ),
        Effect.ignoreLogged
      );

    // New method for checking and updating invoice statuses
    const checkAndUpdateInvoiceStatuses = (): Effect.Effect<void, DVMError | TrackEventError, Kind5050DVMService | SparkService | TelemetryService> => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ category: 'dvm:payment_check', action: 'check_all_invoices_start' }).pipe(Effect.ignoreLogged));

        // Access `getJobHistory` through the service instance itself, available in this Effect's context if `this` service is provided.
        // However, to avoid `this` issues in nested Effects or callbacks, it's safer to ensure Kind5050DVMService is in the context.
        // For now, assuming it's accessible or we pass it.
        // A cleaner way would be to define this function to accept dependencies explicitly or ensure it's always run in a context that has Kind5050DVMService.
        // Let's assume it's run within a context that has all services.
        const dvmServiceInstance = yield* _(Kind5050DVMService); // Get the service itself from context
        const sparkServiceInstance = yield* _(SparkService);
        const telemetryServiceInstance = yield* _(TelemetryService);

        const historyResult = yield* _(dvmServiceInstance.getJobHistory({ page: 1, pageSize: 500 })); // Get a large page to find pending ones
        const pendingPaymentJobs = historyResult.entries.filter(
            job => job.status === 'pending_payment' && job.invoiceBolt11
        );

        if (pendingPaymentJobs.length === 0) {
            yield* _(telemetryServiceInstance.trackEvent({ category: 'dvm:payment_check', action: 'no_pending_invoices_found' }).pipe(Effect.ignoreLogged));
            return;
        }

        yield* _(telemetryServiceInstance.trackEvent({ category: 'dvm:payment_check', action: 'checking_pending_invoices', value: String(pendingPaymentJobs.length) }).pipe(Effect.ignoreLogged));

        for (const job of pendingPaymentJobs) {
            if (!job.invoiceBolt11) continue; // Should not happen due to filter

            yield* _(telemetryServiceInstance.trackEvent({
                category: 'dvm:payment_check',
                action: 'check_invoice_attempt',
                label: `Job ID: ${job.id}`,
                value: job.invoiceBolt11.substring(0, 20) + '...'
            }).pipe(Effect.ignoreLogged));

            const invoiceStatusResult = yield* _(
                sparkServiceInstance.checkInvoiceStatus(job.invoiceBolt11).pipe(
                    Effect.catchTag("SparkError", (err) => { // Catch SparkService specific errors
                        Effect.runFork(telemetryServiceInstance.trackEvent({
                            category: 'dvm:payment_check_error',
                            action: 'spark_check_invoice_failed',
                            label: `Job ID: ${job.id}, Invoice: ${job.invoiceBolt11?.substring(0,20)}`,
                            value: err.message
                        }));
                        // Return an Effect indicating an error for this specific invoice check, but don't fail the whole loop
                        return Effect.succeed({ status: 'error' as const, message: err.message });
                    })
                )
            );

            if (invoiceStatusResult.status === 'paid') {
                yield* _(telemetryServiceInstance.trackEvent({
                    category: 'dvm:payment_check',
                    action: 'invoice_paid',
                    label: `Job ID: ${job.id}`,
                    value: JSON.stringify({ amount: invoiceStatusResult.amountPaidMsats })
                }).pipe(Effect.ignoreLogged));
                // TODO: Update job status to 'paid' in job history.
                // This will require a new method like `updateJobHistoryEntry(jobId: string, updates: Partial<JobHistoryEntry>)`
                // For now, log the conceptual update:
                console.log(`[DVM] Job ${job.id} invoice PAID. Amount: ${invoiceStatusResult.amountPaidMsats} msats. Conceptual update to status: 'paid'.`);
            } else if (invoiceStatusResult.status === 'expired' || invoiceStatusResult.status === 'error') {
                 yield* _(telemetryServiceInstance.trackEvent({
                    category: 'dvm:payment_check',
                    action: `invoice_${invoiceStatusResult.status}`,
                    label: `Job ID: ${job.id}`,
                    value: invoiceStatusResult.status === 'error' ? (invoiceStatusResult as any).message : undefined
                }).pipe(Effect.ignoreLogged));
                 // TODO: Optionally update job status to 'payment_failed' or 'cancelled'.
                 console.log(`[DVM] Job ${job.id} invoice ${invoiceStatusResult.status}.`);
            }
        }
        yield* _(telemetryServiceInstance.trackEvent({ category: 'dvm:payment_check', action: 'check_all_invoices_complete' }).pipe(Effect.ignoreLogged));
    }).pipe(Effect.provideService(TelemetryService, telemetry)); // Provide telemetry directly as it's in scope


    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        // ... (existing parsing and validation logic) ...
        // Ensure that when the invoice is created and the Kind 6xxx event is sent,
        // the conceptual job history entry is marked with status 'pending_payment'
        // and the invoiceBolt11 and invoicePaymentHash are stored.
        // For example, after:
        // const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;
        // const paymentHash = invoiceSDKResult.invoice.paymentHash; // Assuming SDK provides this
        // Conceptually:
        // updateJobHistoryEntry(jobRequestEvent.id, {
        //   status: 'pending_payment',
        //   invoiceBolt11: bolt11Invoice,
        //   invoicePaymentHash: paymentHash, // Store payment hash if available and SDK uses it for status check
        //   invoiceAmountSats: priceSats
        // });
        // This part is more about data handling for persistence, which is future work.
        // The important part is that the invoice is generated.
        // For now, the mock `getJobHistory` should include some jobs with `status: 'pending_payment'` and invoice details.

        // --- Start of snippet from previous log ---
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: `Kind: ${jobRequestEvent.kind}` }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        inputsSource.forEach(tag => {
            if (tag[0] === 'i' && tag.length >= 2) {
              const value = tag[1];
              const type = tag[2] as NIP90InputType;
              const opt1 = tag.length > 3 ? tag[3] : undefined;
              const opt2 = tag.length > 4 ? tag[4] : undefined;
              inputs.push([value, type, opt1, opt2] as NIP90Input);
            }
            if (tag[0] === 'param' && tag.length >= 3) paramsMap.set(tag[1], tag[2]);
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };
        yield* _(telemetry.trackEvent({
            category: "dvm:job", action: "ollama_params_intended",
            label: `Job ID: ${jobRequestEvent.id}`, value: JSON.stringify({
                requestParams: Object.fromEntries(paramsMap),
                ollamaModelUsed: ollamaRequest.model,
                defaultJobConfigParams: textGenConfig
            })
        }).pipe(Effect.ignoreLogged));

        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(ollamaOutput.length / 4), total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;
        // const paymentHash = invoiceSDKResult.invoice.paymentHash; // Assuming SDK gives paymentHash

        // CONCEPTUAL: Update job history with invoice details and set status to 'pending_payment'
        // e.g., yield* _(this.updateJobInHistory(jobRequestEvent.id, { status: 'pending_payment', invoiceBolt11, paymentHash, invoiceAmountSats: priceSats }));
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "invoice_created_for_job", label: jobRequestEvent.id, value: bolt11Invoice.substring(0,30) }).pipe(Effect.ignoreLogged));


        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex, jobRequestEvent, finalOutputContent,
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "success", undefined, {amountMillisats: invoiceAmountMillisats, invoice: bolt11Invoice});
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));
        // --- End of snippet from previous log ---
      }).pipe(
        Effect.catchAllCause(cause => {
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig();
          const dvmPrivateKeyHexForError = effectiveConfigForError.dvmPrivateKeyHex;
          const dvmError = Option.getOrElse(Cause.failureOption(cause), () => new DVMJobProcessingError({ message: "Unknown error during DVM job processing", cause }));
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHexForError, jobRequestEvent, "error", dvmError.message);
          Effect.runFork(publishFeedback(feedback));
          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: dvmError.message
          }).pipe(Effect.ignoreLogged, Effect.andThen(Effect.fail(dvmError as DVMError)));
        })
      );

    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActiveInternal) { /* ... */ return; }
        // ... (existing startListening logic) ...
        // After successfully starting the Nostr subscription and setting isActiveInternal = true:
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;
        if (!effectiveConfig.dvmPrivateKeyHex) return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        if (effectiveConfig.relays.length === 0) return yield* _(Effect.fail(new DVMConfigError({ message: "No DVM relays configured." })));

        yield* _(telemetry.trackEvent({
          category: 'dvm:status',
          action: 'start_listening_attempt',
          label: `Relays: ${effectiveConfig.relays.join(', ')}, Kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
        }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: effectiveConfig.supportedJobKinds,
          since: Math.floor(Date.now() / 1000) - 300,
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig();
            if (event.pubkey === latestConfig.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) return;
            Effect.runFork(processJobRequestInternal(event));
          },
          effectiveConfig.relays,
          () => {
            Effect.runFork(telemetry.trackEvent({
              category: "dvm:nostr",
              action: "subscription_eose",
              label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
            }).pipe(Effect.ignoreLogged));
          }
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));

        // Start the periodic invoice check
        const invoiceCheckLoopEffect = checkAndUpdateInvoiceStatuses().pipe(
          Effect.catchAllCause(cause =>
            telemetry.trackEvent({
              category: "dvm:error",
              action: "invoice_check_loop_error",
              label: "Error in periodic invoice check loop",
              value: Cause.pretty(cause)
            }).pipe(Effect.ignoreLogged)
          )
        );
        const scheduledInvoiceCheck = Effect.repeat(invoiceCheckLoopEffect, Schedule.spaced(Duration.minutes(2)));
        invoiceCheckFiber = Effect.runFork(scheduledInvoiceCheck); // No need to provide context again if checkAndUpdateInvoiceStatuses uses `this` or already has it.
                                                                // But if it's a standalone Effect requiring services, provide them here.
                                                                // For simplicity, assuming the `yield* _(Kind5050DVMService)` etc. inside the method works.
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'invoice_check_loop_started' }).pipe(Effect.ignoreLogged));

      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActiveInternal) { /* ... */ return; }
        // ... (existing stopListening logic for Nostr subscription) ...
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));
        if (currentSubscription) {
          try { currentSubscription.unsub(); currentSubscription = null; }
          catch(e) { yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: e instanceof Error ? e.message : String(e) }).pipe(Effect.ignoreLogged)); }
        }

        // Interrupt the invoice checking fiber
        if (invoiceCheckFiber) {
          Effect.runFork(Fiber.interrupt(invoiceCheckFiber));
          invoiceCheckFiber = null;
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'invoice_check_loop_stopped' }).pipe(Effect.ignoreLogged));
        }

        isActiveInternal = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActiveInternal),

      // ... (getJobHistory and getJobStatistics stubs from previous step)
      getJobHistory: (options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }) => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ category: 'dvm:history', action: 'get_job_history_stub', label: `Page: ${options.page}` }).pipe(Effect.ignoreLogged));
        const mockHistory: JobHistoryEntry[] = [
          { id: 'job1', timestamp: Date.now() - 3600000, jobRequestEventId: 'req1', requesterPubkey: 'pk_requester1', kind: 5100, inputSummary: 'Translate to French: Hello world', status: 'completed', ollamaModelUsed: 'gemma2:latest', tokensProcessed: 120, invoiceAmountSats: 20, invoiceBolt11: "paid_invoice_stub_1", paymentReceivedSats: 20, resultSummary: 'Bonjour le monde' },
          { id: 'job2', timestamp: Date.now() - 7200000, jobRequestEventId: 'req2', requesterPubkey: 'pk_requester2', kind: 5100, inputSummary: 'Summarize this article...', status: 'error', ollamaModelUsed: 'gemma2:latest', errorDetails: 'Ollama connection failed' },
          { id: 'job3', timestamp: Date.now() - 10800000, jobRequestEventId: 'req3', requesterPubkey: 'pk_requester1', kind: 5000, inputSummary: 'Image generation: cat astronaut', status: 'pending_payment', ollamaModelUsed: 'dall-e-stub', invoiceAmountSats: 100, invoiceBolt11: "pending_invoice_stub_1" },
          { id: 'job4', timestamp: Date.now() - 11800000, jobRequestEventId: 'req4', requesterPubkey: 'pk_requester3', kind: 5100, inputSummary: 'Another pending task', status: 'pending_payment', ollamaModelUsed: 'gemma2:latest', invoiceAmountSats: 50, invoiceBolt11: "expired_invoice_stub_1" },
        ];
        const paginatedEntries = mockHistory.slice((options.page - 1) * options.pageSize, options.page * options.pageSize);
        return { entries: paginatedEntries, totalCount: mockHistory.length };
      }),

      getJobStatistics: () => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ category: 'dvm:stats', action: 'get_job_statistics_stub' }).pipe(Effect.ignoreLogged));
        const mockStats: JobStatistics = {
          totalJobsProcessed: 125, totalSuccessfulJobs: 90, totalFailedJobs: 15,
          totalRevenueSats: 1850, jobsPendingPayment: 20,
          modelUsageCounts: { "gemma2:latest": 70, "llama3:instruct": 20, "codellama:latest": 25, "other_model": 10 },
        };
        return mockStats;
      }),
    };

})
);

// File: src/services/spark/SparkService.ts
// ... (existing interfaces and types) ...
export interface SparkService {
// ... (existing methods) ...
checkInvoiceStatus(invoiceBolt11: string): Effect.Effect<{ status: 'pending' | 'paid' | 'expired' | 'error', amountPaidMsats?: number }, SparkError | TrackEventError, never>;
}
// ...

// File: src/services/spark/SparkServiceImpl.ts
// ... (existing imports and SparkServiceLive implementation) ...
// Add the new checkInvoiceStatus method to the returned object in SparkServiceLive

    // ... (existing methods createLightningInvoice, payLightningInvoice, getBalance, getSingleUseDepositAddress, checkWalletStatus) ...
    checkInvoiceStatus: (invoiceBolt11: string) =>
      Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({
          category: 'spark:lightning',
          action: 'check_invoice_status_start',
          label: `Checking invoice: ${invoiceBolt11.substring(0, 20)}...`
        }));

        const sdkResult = yield* _(Effect.tryPromise({
          try: async () => {
            // ---- SDK STUB ----
            // This is a MOCK of what the SDK might return.
            // TODO: Replace with actual SDK call, e.g., wallet.getInvoiceStatus({ encodedInvoice: invoiceBolt11 })
            // or wallet.lookupPayment({ paymentHash: extracted_payment_hash_from_invoice })
            if (invoiceBolt11.includes("paid_invoice_stub")) {
              return { status: "PAID", amountPaidMsat: 100000, payment_hash: "hash_for_paid" };
            } else if (invoiceBolt11.includes("expired_invoice_stub")) {
              return { status: "EXPIRED", payment_hash: "hash_for_expired" };
            } else if (invoiceBolt11.includes("error_invoice_stub")) {
              throw new MockRPCError("SDK error checking invoice"); // Example error
            }
            return { status: "PENDING", payment_hash: "hash_for_pending" }; // Default to pending
            // ---- END SDK STUB ----
          },
          catch: (e) => {
            if (e instanceof MockRPCError) { // Replace with actual SparkSDK RPCError
                return new SparkRPCError({ message: "Spark SDK RPC error checking invoice status", cause: e });
            }
            return new SparkLightningError({ message: "Failed to check invoice status via SparkSDK", cause: e });
          }
        }));

        let status: 'pending' | 'paid' | 'expired' | 'error' = 'pending';
        let amountPaidMsats: number | undefined = undefined;

        switch (sdkResult.status?.toUpperCase()) {
          case 'PAID':
          case 'COMPLETED':
            status = 'paid';
            amountPaidMsats = sdkResult.amountPaidMsat; // Assuming this field name from SDK
            break;
          case 'EXPIRED':
            status = 'expired';
            break;
          case 'PENDING':
          case 'UNPAID':
            status = 'pending';
            break;
          default:
            status = 'error';
            yield* _(telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'check_invoice_status_unknown_sdk_status',
              label: `Unknown SDK status: ${sdkResult.status}`,
              value: invoiceBolt11
            }).pipe(Effect.ignoreLogged));
            break;
        }

        yield* _(telemetry.trackEvent({
          category: 'spark:lightning',
          action: 'check_invoice_status_success',
          label: `Invoice status: ${status}`,
          value: JSON.stringify({ invoice: invoiceBolt11.substring(0,20)+'...', amountPaidMsats })
        }));

        return { status, amountPaidMsats };
      }).pipe(
        Effect.tapError(err => telemetry.trackEvent({
          category: 'spark:lightning',
          action: 'check_invoice_status_failure',
          label: err.message,
          value: JSON.stringify({ invoice: invoiceBolt11.substring(0,20)+'...' })
        }))
      ),

// ... (rest of the service methods) ...

```

**Note for `Kind5050DVMServiceImpl.ts` -> `processJobRequestInternal`:**
When you modify `processJobRequestInternal` to store `invoiceBolt11` and `invoicePaymentHash`, the `paymentHash` would typically come from the `invoiceSDKResult`. For example, if `invoiceSDKResult.invoice` has a `paymentHash` field, you'd use that. If the SDK requires you to parse the BOLT11 invoice for the payment hash, that's a more complex step that might be beyond the scope of *this* phase, but acknowledge it if so. For now, the stub in `SparkServiceImpl.checkInvoiceStatus` doesn't use the payment hash, it just checks the `invoiceBolt11` string for keywords.

**Testing Strategy:**
*   Ensure `SparkService.test.ts` has new tests for `checkInvoiceStatus`, mocking SDK responses.
*   In `Kind5050DVMService.test.ts`, test the `checkAndUpdateInvoiceStatuses` logic by mocking `getJobHistory` and `SparkService.checkInvoiceStatus`. Verify that telemetry is logged correctly and that the conceptual updates to job history entries (e.g., status to 'paid') would occur. Test that the periodic checking fiber is started and stopped correctly.
*   The `DvmJobHistoryPane.tsx` component should naturally reflect these changes once real data (or updated mock data reflecting payment) is available.

This will implement the payment verification logic using the (stubbed for now) Spark SDK interaction.
```
