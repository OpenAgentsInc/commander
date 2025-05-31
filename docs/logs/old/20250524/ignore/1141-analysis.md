# Payment Flow Analysis: Enhanced Polling Working but Payment Verification Still Failing
## May 24, 2025 - 11:41

## Executive Summary

The enhanced 1-second polling with exponential backoff is working perfectly, but payments are still not being detected by the DVM provider. The consumer successfully pays and shows balance deduction, but the provider's invoice status remains "pending" indefinitely. This points to a fundamental issue with the SparkService.checkInvoiceStatus() implementation.

## Detailed Analysis

### ✅ Enhanced Polling Working Correctly

Provider telemetry shows excellent polling behavior:
- **1-second global checks**: Lines 72-101 show rapid `check_all_invoices_start` every second
- **Per-job exponential backoff**: 
  - Attempt 1: Immediate check (line 116)
  - Attempt 2: ~8 seconds later (line 133)  
  - Attempt 3: ~12 seconds later (line 153)
  - Attempt 4: ~17 seconds later (line 182)
  - Attempt 5: ~26 seconds later (line 222)

### ❌ Payment Verification Failing

#### Consumer Side Evidence:
```
Line 91: pay_invoice_start
Line 96: pay_invoice_success (Payment status: PENDING)
Line 97: payment_success (hash: 9aa1a7b2127f2a5fc4d0c1e5c2c6baa29bdb590f6f1c009c9c657d22bc773859)
Balance: 494 → 488 → 494 → 491 sats (strange bounce, then settles)
```

#### Provider Side Evidence:
```
Line 111: create_invoice_success (hash: 9aa1a7b2127f2a5fc4d0c1e5c2c6baa29bdb590f6f1c009c9c657d22bc773859)
Lines 118, 135, 155, 184, 224: check_invoice_status_success (Invoice status: pending)
```

### 🔍 Critical Observations

1. **Payment hashes match**: Both sides show `9aa1a7b2127f2a5fc4d0c1e5c2c6baa29bdb590f6f1c009c9c657d22bc773859`
2. **Consumer balance deducted**: 494 → 491 sats (3 sats paid)
3. **Provider never sees payment**: All checks return "pending" status
4. **Different wallets**: Consumer "pyram...", Provider "domai..."

## Root Cause Analysis

The issue is NOT with polling frequency - that's working perfectly. The problem is with how `SparkService.checkInvoiceStatus()` is determining payment status.

### Hypothesis 1: Wrong Status Field Check (Most Likely)
The SparkServiceImpl might be checking the wrong field in the SDK response. Based on previous fixes, we know the SDK doesn't have a reliable `status` field and we should check `paymentPreimage` presence instead.

### Hypothesis 2: Invoice Lookup Issue
The provider might be checking the invoice status using the wrong identifier (invoice string vs payment hash).

### Hypothesis 3: Mock vs Real Implementation
Line 118 shows very fast response time (1ms) for invoice check, suggesting it might be using a mock implementation rather than real Spark SDK.

## Specific Code Investigation Instructions

### 1. Check SparkServiceImpl.checkInvoiceStatus() Implementation

**File**: `src/services/spark/SparkServiceImpl.ts`

Look for the `checkInvoiceStatus` method and verify:

```typescript
// Current implementation might be:
checkInvoiceStatus(invoice: string) {
  // ...
  return {
    status: sdkResult.status || "pending", // WRONG - status field unreliable
    // ...
  };
}

// Should be:
checkInvoiceStatus(invoice: string) {
  // ...
  return {
    status: sdkResult.paymentPreimage ? "paid" : "pending", // Check preimage presence
    amountPaidMsats: sdkResult.amountMsats,
    // ...
  };
}
```

### 2. Verify Invoice Lookup Method

Check if the provider is using the correct method to look up invoice status:

```typescript
// Might be using:
const result = await sdk.getInvoice(invoice); // Gets invoice details

// Should potentially use:
const result = await sdk.lookupInvoice(paymentHash); // Looks up by payment hash
// OR
const result = await sdk.listInvoices({ paymentHash }); // Lists invoices filtered by hash
```

### 3. Add Detailed Logging

Add comprehensive logging to understand the SDK response:

```typescript
checkInvoiceStatus(invoice: string) {
  const sdkResult = yield* _(/* SDK call */);
  
  // Log the ENTIRE SDK response
  yield* _(telemetry.trackEvent({
    category: "spark:debug",
    action: "invoice_sdk_response_full",
    label: invoice.substring(0, 20) + "...",
    value: JSON.stringify(sdkResult), // See EVERYTHING the SDK returns
  }));
  
  // Then determine status
  const status = sdkResult.paymentPreimage ? "paid" : 
                 sdkResult.state === "SETTLED" ? "paid" :
                 sdkResult.isPaid === true ? "paid" :
                 sdkResult.settledAt ? "paid" :
                 "pending";
}
```

### 4. Check for Mock Implementation

Verify the provider is using real SparkService:

```typescript
// In runtime.ts or service initialization
// Make sure it's not using SparkServiceTestLive or mock implementation
const spark = isTest ? SparkServiceTestLive : SparkServiceLive; // Should use Live
```

## Immediate Fix Instructions

### Step 1: Fix checkInvoiceStatus Logic

```typescript
// In SparkServiceImpl.ts
checkInvoiceStatus: (invoice: string) =>
  Effect.gen(function* (_) {
    // ... existing code ...
    
    const invoiceResponse = yield* _(
      Effect.tryPromise({
        try: () => sdk.xxx(invoice), // Find the actual SDK method being used
        catch: (error) => new SparkError({ /* ... */ }),
      }),
    );
    
    // Log for debugging
    console.log("[SparkService] Invoice check response:", invoiceResponse);
    
    // Check multiple fields for payment confirmation
    const isPaid = !!(
      invoiceResponse.paymentPreimage ||
      invoiceResponse.settledAt ||
      invoiceResponse.state === "SETTLED" ||
      invoiceResponse.isPaid === true ||
      invoiceResponse.amountPaidMsat > 0
    );
    
    return {
      status: isPaid ? "paid" : 
              invoiceResponse.state === "EXPIRED" ? "expired" : 
              "pending",
      amountPaidMsats: invoiceResponse.amountPaidMsat || 
                       invoiceResponse.amountMsat || 
                       0,
    };
  }),
```

### Step 2: Add Payment Hash Lookup Fallback

```typescript
// If invoice lookup fails, try payment hash
if (!isPaid && invoice.includes("lnbc")) {
  // Extract payment hash from bolt11 invoice
  const paymentHash = extractPaymentHashFromBolt11(invoice);
  
  const paymentLookup = yield* _(
    Effect.tryPromise({
      try: () => sdk.lookupPayment(paymentHash),
      catch: () => null, // Ignore errors
    }),
  );
  
  if (paymentLookup?.settled) {
    isPaid = true;
  }
}
```

### Step 3: Test with Mock Success (Temporary)

For immediate user experience improvement while debugging:

```typescript
// TEMPORARY: Auto-succeed after 15 seconds for testing
const timeSinceCreation = Date.now() - pendingJob.createdAt;
if (timeSinceCreation > 15000 && ENABLE_PAYMENT_BYPASS) {
  console.warn("[DVM] BYPASSING PAYMENT CHECK - Dev mode only!");
  return { status: "paid" as const, amountPaidMsats: pendingJob.amountSats * 1000 };
}
```

## Next Steps

1. **Immediate**: Fix SparkService.checkInvoiceStatus() to properly detect paid invoices
2. **Debug**: Add comprehensive logging to see exact SDK responses
3. **Test**: Verify with real Lightning payments between wallets
4. **Consider**: Implement webhook-based payment notifications for instant detection

The enhanced polling is working beautifully - we just need to fix what constitutes a "paid" invoice in the SparkService implementation.