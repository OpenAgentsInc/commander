# NIP-90 Payment Failure: Deep Analysis and Fix Instructions

## Executive Summary

The NIP-90 payment flow is failing due to three distinct bugs:
1. SparkService incorrectly reports successful payments as "FAILED"
2. NostrService only queries with the first filter when multiple are provided
3. Payment hash extraction uses the wrong field

These bugs compound to make it impossible for the provider to verify successful payments and process jobs.

## Detailed Analysis

### Bug 1: SparkService Payment Status Misreporting

**Location**: `src/services/spark/SparkServiceImpl.ts:528-532`

**Problem**: The SDK doesn't return a `status` field. When the code tries to read `sdkResult.status`, it gets `undefined`. The string conversion `String(undefined)` produces `"undefined"`, which doesn't contain "SUCCESS", so it defaults to "FAILED".

**Evidence**: Consumer balance decreases from 500 to 497 sats, proving the payment succeeded.

### Bug 2: NostrService Filter Array Handling

**Location**: `src/services/nostr/NostrServiceImpl.ts:106`

**Problem**: The `listEvents` method only uses the first filter from the array:
```typescript
pool.querySync(relayUrls, filters[0], {  // ← Only first filter!
```

**Impact**: When the provider tries to fetch its history with two filters:
- Filter 1: Result events (kinds 6000-6999)
- Filter 2: Feedback events (kind 7000 with success status)

Only the first filter is used, missing all feedback events.

### Bug 3: Payment Hash vs Preimage Confusion

**Location**: `src/services/spark/SparkServiceImpl.ts:509`

**Problem**: The code uses `paymentPreimage` as the `paymentHash`, but these are different:
- Payment hash: Used to create the invoice (publicly known)
- Payment preimage: Secret revealed upon successful payment

**Impact**: Returns "unknown-hash" when preimage is missing.

## Fix Instructions

### Fix 1: SparkService Payment Status

**File**: `src/services/spark/SparkServiceImpl.ts`

**Current Code** (lines 528-532):
```typescript
status: String(sdkResult.status).toUpperCase().includes("SUCCESS")
  ? "SUCCESS"
  : String(sdkResult.status).toUpperCase().includes("PEND")
    ? "PENDING"
    : "FAILED",
```

**Fixed Code**:
```typescript
// Determine status based on available SDK fields
// If we have a paymentPreimage, the payment succeeded
// If we have an error, it failed
// Otherwise it's pending
status: sdkResult.paymentPreimage
  ? "SUCCESS"
  : sdkResult.error || (sdkResult as any).failure
    ? "FAILED"
    : "PENDING",
```

**Alternative Fix** (if SDK has different success indicators):
```typescript
// Check multiple success indicators
status: (sdkResult.paymentPreimage || 
         sdkResult.amountMsat || 
         (sdkResult.fee && sdkResult.fee.originalValue > 0))
  ? "SUCCESS"
  : sdkResult.error
    ? "FAILED"
    : "PENDING",
```

### Fix 2: NostrService Multiple Filter Support

**File**: `src/services/nostr/NostrServiceImpl.ts`

**Current Code** (lines 103-114):
```typescript
const events = yield* _(
  Effect.tryPromise({
    try: () =>
      pool.querySync(relayUrls, filters[0], {
        maxWait: config.requestTimeoutMs / 2,
      }),
    catch: (error) =>
      new NostrRequestError({
        message: "Failed to fetch events from relays",
        cause: error,
      }),
  }),
```

**Fixed Code**:
```typescript
// Query each filter separately and combine results
const allEvents: NostrEvent[] = [];

for (const filter of filters) {
  const events = yield* _(
    Effect.tryPromise({
      try: () =>
        pool.querySync(relayUrls, filter, {
          maxWait: config.requestTimeoutMs / 2,
        }),
      catch: (error) =>
        new NostrRequestError({
          message: "Failed to fetch events from relays",
          cause: error,
        }),
    }),
  );
  allEvents.push(...events);
}

// Remove duplicates by event ID
const uniqueEvents = Array.from(
  new Map(allEvents.map(e => [e.id, e])).values()
);
```

### Fix 3: Payment Hash Extraction

**File**: `src/services/spark/SparkServiceImpl.ts`

**Current Code** (line 509):
```typescript
paymentHash: sdkResult.paymentPreimage || "unknown-hash",
```

**Fixed Code**:
```typescript
// Extract payment hash from the invoice or payment result
// The SDK might provide it in different fields
paymentHash: sdkResult.paymentHash || 
             (sdkResult as any).hash ||
             sdkResult.paymentPreimage || // Fallback to preimage if nothing else
             "unknown-hash",
```

**Note**: You'll need to inspect the actual SDK response to determine the correct field name for the payment hash.

## Testing Instructions

After implementing these fixes:

1. **Test SparkService**:
   ```bash
   pnpm vitest run SparkService.test.ts
   ```
   - Verify successful payments show status "SUCCESS"
   - Verify balance decreases correctly

2. **Test NostrService**:
   ```bash
   pnpm vitest run NostrService.test.ts
   ```
   - Add a test for `listEvents` with multiple filters
   - Verify all filters are queried

3. **Integration Test**:
   - Start provider DVM
   - Send a payment request from consumer
   - Verify payment succeeds
   - Verify provider processes the job

## Additional Recommendations

1. **Add Logging**: Add detailed logging to the SDK response in SparkService to understand its structure:
   ```typescript
   console.log("SDK Payment Result:", JSON.stringify(sdkResult, null, 2));
   ```

2. **Implement Fallback Payment Detection**: If history fetch continues to fail, implement an alternative payment verification method:
   - Store pending invoices locally
   - Periodically check invoice status directly
   - Process jobs when payment is confirmed

3. **Add Error Recovery**: Make the DVM more resilient:
   - Continue checking other invoices even if history fetch fails
   - Implement retry logic with exponential backoff
   - Add manual payment verification endpoint

## Priority

Fix in this order:
1. **Fix 1** (Payment Status) - Critical, prevents any payments from working
2. **Fix 2** (Multiple Filters) - Critical, prevents payment verification
3. **Fix 3** (Payment Hash) - Important for tracking but not blocking

All three fixes are required for the complete payment flow to work correctly.