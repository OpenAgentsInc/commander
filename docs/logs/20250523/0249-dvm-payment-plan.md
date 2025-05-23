# DVM Payment Implementation Plan

## Current Status

Based on the telemetry logs:

### Working Components
1. **Communication Flow**: Consumer successfully sends job request to provider
2. **Provider Response**: Provider receives request, processes it, and sends back result 
3. **Invoice Generation**: Provider creates a 10 sat invoice (currently using REGTEST)
4. **Event Flow**: 
   - Consumer publishes kind 5050 job request
   - Provider publishes kind 7000 feedback with `payment-required` status
   - Provider publishes kind 6050 job result with invoice

### Issues Identified
1. **Network Mismatch**: Provider generates REGTEST invoices, but Spark is now on MAINNET
2. **Payment Not Required**: Consumer receives the result without paying (provider sends result immediately)
3. **No Payment Verification**: Provider doesn't check if invoice was paid before delivering result
4. **Fixed Price**: Currently hardcoded to 10 sats, need to change to 3 sats as requested

## Implementation Plan

### Phase 1: Fix Invoice Generation (Immediate)

1. **Update Invoice Amount** in `Kind5050DVMServiceImpl.ts`:
   ```typescript
   // Change from 10 to 3 sats
   const invoiceAmount = 3; // Previously: Math.max(10, Math.ceil(totalTokens / 100))
   ```

2. **Ensure MAINNET Invoices**:
   - Provider's Spark service should already be using MAINNET after previous changes
   - Verify invoice format starts with `lnbc` (mainnet) not `lnbcrt` (regtest)

### Phase 2: Implement Payment-First Flow

According to NIP-90, providers can choose their payment flow. We'll implement a "payment-required-first" approach:

1. **Modify Job Processing Flow** in `Kind5050DVMServiceImpl.ts`:
   ```typescript
   // Current flow:
   // 1. Receive request
   // 2. Process with AI
   // 3. Generate invoice
   // 4. Send result immediately (WRONG!)
   
   // New flow:
   // 1. Receive request
   // 2. Generate invoice (3 sats)
   // 3. Send kind:7000 feedback with status="payment-required" and bolt11
   // 4. Start monitoring for payment
   // 5. Only process with AI after payment confirmed
   // 6. Send kind:6050 result after payment
   ```

2. **Add Payment Monitoring**:
   - Use `SparkService.checkInvoiceStatus()` to poll invoice status
   - Store pending jobs in a map: `jobId -> { invoice, request, status }`
   - Check payment status every 5-10 seconds

### Phase 3: Consumer Payment Integration

1. **Update Consumer Flow** in `NIP90ServiceImpl.ts`:
   - Listen for kind:7000 feedback events with `payment-required` status
   - Extract bolt11 invoice from `amount` tag
   - Show payment UI to user

2. **Add Payment UI** in consumer chat:
   - Display "Payment Required: 3 sats" message
   - Show invoice and "Pay" button
   - Use `SparkService.payLightningInvoice()` to pay

3. **Handle Payment Confirmation**:
   - After payment, continue listening for kind:6050 result
   - Show "Payment sent, waiting for result..." status

### Phase 4: Error Handling

1. **No Payment Scenarios**:
   - Set timeout (e.g., 5 minutes) for payment
   - Send kind:7000 with status="error" and message "Payment timeout"
   - Clean up pending job from memory

2. **Insufficient Balance**:
   - Consumer should check balance before attempting payment
   - Show clear error: "Insufficient balance. Need 3 sats + fees"

3. **Payment Failures**:
   - Retry payment with exponential backoff
   - Allow manual retry button in UI

## Implementation Order

1. **Fix invoice amount to 3 sats** ✓ (Quick fix)
2. **Implement payment-first provider flow** 
3. **Add payment monitoring in provider**
4. **Update consumer to handle payment requests**
5. **Add payment UI components**
6. **Implement error handling**
7. **Add telemetry for payment events**

## Code Changes Required

### Provider Side (`Kind5050DVMServiceImpl.ts`)
- Change `processJobRequest` to send payment request first
- Add `pendingJobs` Map to track unpaid jobs
- Add `checkPendingPayments` method running on interval
- Only call AI service after payment confirmed

### Consumer Side (`NIP90ServiceImpl.ts`)
- Update `subscribeToJobUpdates` to handle kind:7000 payment-required
- Add payment state to job tracking
- Emit payment required events to UI

### UI Components
- Add `PaymentRequiredCard` component
- Update `useNip90ConsumerChat` hook to handle payment flow
- Add payment status indicators

### Services
- Ensure `SparkService` is available in consumer context
- Add payment-specific telemetry events

## Testing Plan

1. **Unit Tests**:
   - Test payment-first flow logic
   - Test invoice status checking
   - Test timeout handling

2. **Integration Tests**:
   - Full flow: request → payment required → pay → receive result
   - Test payment timeout scenario
   - Test insufficient balance scenario

3. **Manual Testing**:
   - Verify 3 sat invoices generated
   - Confirm no result delivered without payment
   - Test user experience of payment flow