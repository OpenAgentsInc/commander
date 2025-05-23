# Consumer Payment Implementation TODO

## Current State Summary

### What's Been Completed (Provider Side) ✅

1. **Price Change**: Changed minimum invoice amount from 10 sats to 3 sats in `Kind5050DVMService.ts`

2. **Payment-First Flow Implemented**:
   - Modified `Kind5050DVMServiceImpl.ts` to require payment before AI processing
   - Added `PendingJob` interface to track unpaid jobs
   - Created new `processJobRequestInternal` that generates invoice FIRST
   - Created `processPaidJob` method that only runs after payment confirmed
   - Updated `checkAndUpdateInvoiceStatuses` to monitor pending jobs and process them when paid

3. **Flow Changes**:
   - OLD: Receive request → Process AI → Generate invoice → Send result immediately
   - NEW: Receive request → Generate invoice → Send payment-required → Wait for payment → Process AI → Send result

4. **Testing**: Created comprehensive tests in `Kind5050DVMPaymentFlow.test.ts` (all passing)

5. **TypeScript Fixes**: Fixed all compilation errors in both implementation and tests

### What Needs to Be Done (Consumer Side) 🚧

The consumer currently doesn't handle the payment flow. It needs to be updated to:

## 1. Handle Payment-Required Feedback Events

The consumer already subscribes to kind:7000 feedback events in `NIP90ServiceImpl.ts` (line 643):
```typescript
const feedbackFilter: NostrFilter = {
  kinds: [7000],
  "#e": [jobRequestEventId],
  authors: [dvmPubkeyHex],
};
```

But it needs to handle the "payment-required" status specifically.

### Files to Modify:

#### A. `src/hooks/useNip90ConsumerChat.ts`
This hook needs to:
1. Parse feedback events with status="payment-required"
2. Extract the bolt11 invoice from the "amount" tag
3. Update UI state to show payment is required
4. Trigger payment flow

#### B. `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
This component needs to:
1. Show payment UI when payment is required
2. Display invoice details (amount, bolt11)
3. Add "Pay" button
4. Show payment status (pending/paid/failed)

## 2. Integrate Spark Wallet for Payments

The consumer needs to use SparkService to pay invoices:

```typescript
// When payment-required feedback is received:
const paymentResult = yield* _(
  spark.payLightningInvoice({
    invoice: bolt11Invoice,
    maxFeeSats: 10, // Reasonable fee limit
  })
);
```

### Key Integration Points:

1. **Add SparkService to Consumer Context**:
   - Currently not available in consumer chat context
   - Need to provide it in the component/hook

2. **Payment State Management**:
   ```typescript
   interface PaymentState {
     required: boolean;
     invoice?: string;
     amountSats?: number;
     status: 'none' | 'pending' | 'paying' | 'paid' | 'failed';
     error?: string;
   }
   ```

3. **Update Flow**:
   - User sends message
   - Receive payment-required feedback
   - Show payment UI
   - User clicks "Pay"
   - Call SparkService.payLightningInvoice
   - Continue listening for result
   - Show result when received

## 3. UI Components Needed

### PaymentRequiredCard Component
```typescript
interface PaymentRequiredCardProps {
  invoice: string;
  amountSats: number;
  onPay: () => void;
  isPaying: boolean;
  error?: string;
}
```

Should display:
- Lightning bolt icon
- "Payment Required: 3 sats"
- Invoice string (truncated)
- "Pay" button
- Loading state while paying
- Error message if payment fails

## 4. Error Handling

Handle these scenarios:
1. **Insufficient Balance**: Check balance before payment attempt
2. **Payment Timeout**: Invoice expiration
3. **Payment Failure**: Network errors, etc.
4. **No Spark Wallet**: User hasn't set up wallet

## 5. Testing Requirements

Create tests for:
1. Payment-required feedback parsing
2. Invoice extraction from feedback
3. Payment UI rendering
4. SparkService integration
5. Error scenarios

## Code Locations Reference

### Key Files:
- Consumer hook: `/src/hooks/useNip90ConsumerChat.ts`
- Consumer UI: `/src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
- NIP90 Service: `/src/services/nip90/NIP90ServiceImpl.ts`
- Types: `/src/services/nip90/NIP90Service.ts` (has NIP90JobFeedbackStatus type)

### Existing Patterns to Follow:
- SparkService usage: See `/src/services/dvm/Kind5050DVMServiceImpl.ts` lines 773-785
- Feedback parsing: See `/src/services/nip90/NIP90ServiceImpl.ts` lines 490-510
- Effect error handling: Follow patterns in existing services

## Next Steps

1. Start with updating `useNip90ConsumerChat.ts` to handle payment-required feedback
2. Add payment state to the hook
3. Create PaymentRequiredCard component
4. Integrate SparkService
5. Test the full flow

## Important Notes

- The provider is already sending payment-required feedback with bolt11 invoice
- The consumer is already subscribing to feedback events
- Just need to connect the pieces and add payment handling
- Remember to handle both encrypted and unencrypted job requests