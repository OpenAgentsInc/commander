# Immediate Fix Instructions: Get Messages Showing ASAP
## May 24, 2025

The user wants **fast responses** - "err on the side of showing fast responses to the user, even if we need to 'trust' the payment went through." Let's fix this NOW with a two-pronged approach.

## Part 1: Fix SparkService Payment Detection (Quick Win)

**File: `src/services/spark/SparkServiceImpl.ts`**

Find the `checkInvoiceStatus` method and fix it to properly detect paid invoices:

```typescript
// CURRENT (likely broken):
checkInvoiceStatus: (invoice: string) =>
  Effect.gen(function* (_) {
    // ... SDK call ...
    return {
      status: sdkResult.status || "pending", // WRONG - status field unreliable
      // ...
    };
  }),

// FIXED:
checkInvoiceStatus: (invoice: string) =>
  Effect.gen(function* (_) {
    const sdk = yield* _(getWalletSDK());
    
    // Try multiple SDK methods to check payment
    const invoiceResult = yield* _(
      Effect.tryPromise({
        try: async () => {
          // First try direct invoice lookup
          const inv = await sdk.getInvoice?.(invoice);
          if (inv) return inv;
          
          // Fallback: try listing recent invoices
          const recent = await sdk.listInvoices?.({ limit: 100 });
          return recent?.find(i => i.bolt11 === invoice || i.invoice === invoice);
        },
        catch: (error) => new SparkError({ /* ... */ }),
      }),
    );
    
    // Log the FULL response for debugging
    console.log("[SparkService] checkInvoiceStatus raw response:", JSON.stringify(invoiceResult));
    
    // Check MULTIPLE fields that indicate payment
    const isPaid = !!(
      invoiceResult?.paymentPreimage ||     // Has preimage = paid
      invoiceResult?.settled ||             // Settled flag
      invoiceResult?.settledAt ||           // Has settlement time
      invoiceResult?.state === "SETTLED" || // State field
      invoiceResult?.isPaid === true ||     // Direct paid flag
      invoiceResult?.amountPaidMsat > 0 ||  // Has paid amount
      invoiceResult?.status === "PAID" ||   // Status field
      invoiceResult?.paid === true          // Another paid flag variant
    );
    
    return {
      status: isPaid ? "paid" : 
              invoiceResult?.state === "EXPIRED" ? "expired" :
              invoiceResult?.expired ? "expired" :
              "pending",
      amountPaidMsats: invoiceResult?.amountPaidMsat || 
                       invoiceResult?.amountMsat || 
                       invoiceResult?.amount_msat ||
                       0,
    };
  }),
```

## Part 2: Implement FAST Optimistic Processing

**File: `src/services/dvm/Kind5050DVMServiceImpl.ts`**

### Step 1: Add Constant (line ~58)
```typescript
const OPTIMISTIC_PROCESSING_ATTEMPT_THRESHOLD = 2; // Process after just 2 checks (~5-10 seconds)
```

### Step 2: Update PendingJob Interface (line ~264)
```typescript
interface PendingJob {
  requestEvent: NostrEvent;
  invoice: string;
  paymentHash: string;
  amountSats: number;
  createdAt: number;
  prompt: string;
  isEncrypted: boolean;
  lastPolledAt: number;
  pollAttempts: number;
  optimisticProcessingStarted: boolean; // NEW
}
```

### Step 3: Initialize Field (line ~1217)
```typescript
pendingJobs.set(jobRequestEvent.id, {
  // ... existing fields ...
  optimisticProcessingStarted: false, // NEW
});
```

### Step 4: Update processPaidJob (line ~1253)
Add parameter and conditional logic:
```typescript
const processPaidJob = (
  pendingJob: PendingJob,
  isOptimistic: boolean = false // NEW parameter
): Effect.Effect<void, DVMError, never> =>
  Effect.gen(function* (_) {
    // ... existing setup ...
    
    yield* _(telemetry.trackEvent({
      category: "dvm:job",
      action: isOptimistic ? "processing_optimistic" : "processing_paid_job",
      label: jobRequestEvent.id,
      value: `${pendingJob.amountSats} sats ${isOptimistic ? '(FAST MODE)' : '(confirmed)'}`,
    }).pipe(Effect.ignoreLogged));

    // Send "processing" feedback immediately for better UX
    const processingFeedback = createNip90FeedbackEvent(
      dvmPrivateKeyHex,
      jobRequestEvent,
      "processing",
      isOptimistic ? "Processing your request..." : "Payment received, processing...",
      undefined,
      telemetry,
    );
    yield* _(publishFeedback(processingFeedback));

    // ... existing AI processing logic ...
    
    // After publishing result:
    if (!isOptimistic) {
      // Normal flow: send success and remove from pending
      const successFeedback = createNip90FeedbackEvent(
        dvmPrivateKeyHex,
        jobRequestEvent,
        "success",
        "Job completed successfully",
        undefined,
        telemetry,
      );
      yield* _(publishFeedback(successFeedback));
      
      pendingJobs.delete(jobRequestEvent.id);
    } else {
      // Optimistic: keep in pending for final confirmation
      yield* _(telemetry.trackEvent({
        category: "dvm:job",
        action: "optimistic_result_sent_awaiting_payment",
        label: jobRequestEvent.id,
      }).pipe(Effect.ignoreLogged));
    }
  });
```

### Step 5: Add Optimistic Logic to checkAndUpdateInvoiceStatusesLogic (line ~650)
In the status check results handling:

```typescript
if (invoiceStatusResult.status === "paid") {
  // Payment confirmed - process normally or clean up if already optimistic
  yield* _(localTelemetry.trackEvent({
    category: "dvm:payment",
    action: "invoice_paid_detected",
    label: jobId,
    value: `Sats: ${jobToPoll.amountSats}`,
  }).pipe(Effect.ignoreLogged));

  if (updatedJobEntryForPoll.optimisticProcessingStarted) {
    // Already processed optimistically - just send success and clean up
    const successFeedback = createNip90FeedbackEvent(
      useDVMSettingsStore.getState().getEffectiveConfig().dvmPrivateKeyHex,
      updatedJobEntryForPoll.requestEvent,
      "success",
      "Payment confirmed - job completed successfully",
      undefined,
      localTelemetry,
    );
    yield* _(publishFeedback(successFeedback));
    pendingJobs.delete(jobId);
  } else {
    // Normal processing
    yield* _(processPaidJob(updatedJobEntryForPoll, false).pipe(/* ... */));
  }
  
} else if (invoiceStatusResult.status === "pending") {
  // NEW: Check for optimistic processing threshold
  if (!updatedJobEntryForPoll.optimisticProcessingStarted && 
      updatedJobEntryForPoll.pollAttempts >= OPTIMISTIC_PROCESSING_ATTEMPT_THRESHOLD) {
    
    yield* _(localTelemetry.trackEvent({
      category: "dvm:payment",
      action: "OPTIMISTIC_PROCESSING_TRIGGERED",
      label: jobId,
      value: `After ${updatedJobEntryForPoll.pollAttempts} attempts - FAST MODE`,
    }).pipe(Effect.ignoreLogged));
    
    // Mark as optimistic and process
    pendingJobs.set(jobId, { 
      ...updatedJobEntryForPoll, 
      optimisticProcessingStarted: true 
    });
    
    yield* _(processPaidJob(updatedJobEntryForPoll, true).pipe(
      Effect.catchAllCause(cause => {
        // If processing fails, log but keep trying
        Effect.runFork(localTelemetry.trackEvent({
          category: "dvm:error",
          action: "optimistic_processing_failed",
          label: jobId,
          value: Cause.pretty(cause)
        }).pipe(Effect.ignoreLogged));
        return Effect.void;
      })
    ));
  } else {
    yield* _(localTelemetry.trackEvent({
      category: "dvm:payment_check",
      action: "invoice_still_pending",
      label: jobId,
      value: `Attempt: ${nextPollAttempt}`,
    }).pipe(Effect.ignoreLogged));
  }
}
```

## Part 3: Emergency Bypass (If Needed)

If payments still aren't working after the above fixes, add this **temporary bypass** for immediate testing:

```typescript
// In checkAndUpdateInvoiceStatusesLogic, before the regular status check:
const timeSinceCreation = now - jobToPoll.createdAt;
if (timeSinceCreation > 8000 && process.env.PAYMENT_BYPASS === "true") {
  console.warn(`[DVM] BYPASSING PAYMENT for job ${jobId} - DEV MODE`);
  invoiceStatusResult = { status: "paid" as const, amountPaidMsats: jobToPoll.amountSats * 1000 };
}
```

## Testing Order

1. **First**: Fix SparkService.checkInvoiceStatus() - this might solve everything
2. **Then**: Test if payments are detected within 2-3 checks
3. **If still slow**: The optimistic processing will kick in after 2 attempts (~10 seconds)
4. **Emergency**: Use bypass for immediate development/testing

## Key Success Metrics

- User sees AI response within 15 seconds of payment
- DVM processes after 2 pending checks if wallet is slow
- Payment confirmation still happens in background
- No jobs get stuck indefinitely

The goal is **FAST USER EXPERIENCE** - we process quickly and verify payment later!