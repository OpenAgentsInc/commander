# Payment Failure Fix - 1042

## Problem Analysis

From the telemetry logs and analysis, I identified the root cause of the payment failure:

1. **Consumer Side** (`1031-telemetry-payfail-consumer.md`):
   - Runtime initializes with MOCK SparkService
   - User enters mnemonic ("pyramid go...")
   - Runtime reinitializes with user's SparkService
   - Balance shows 500 sats correctly
   - BUT: No payment telemetry events (`payment_start`, `payment_success`, `payment_failure`)

2. **Provider Side** (`1031-telemetry-payfail-provider.md`):
   - DVM correctly receives job request
   - Creates invoice for 3 sats
   - Sends payment-required event (Kind 7000)
   - Waits for payment but invoice remains "pending"

3. **Root Cause**: The `useNip90ConsumerChat` hook captures a stale runtime reference that still has the mock SparkService. When `handlePayment` executes, it uses this stale runtime instead of the current one with the user's wallet.

## Solution Implemented

The fix follows the same pattern used in the wallet display fix (`0845-fix.md`): Always get a fresh runtime instance when executing Effects.

### Changes to `src/hooks/useNip90ConsumerChat.ts`:

1. **Removed runtime prop and stale references**:
   - Removed `runtime` from `UseNip90ConsumerChatParams` interface
   - No longer storing runtime in any refs or variables
   - Each Effect execution gets fresh runtime via `getMainRuntime()`

2. **Updated `handlePayment` function**:
   - Gets fresh runtime at execution time
   - Uses `Effect.runPromiseExit` for better error handling
   - Properly handles both success and failure cases

3. **Updated `sendMessage` function**:
   - Gets fresh runtime for each operation
   - Resolves services from current runtime context
   - Event handlers also get fresh runtime

4. **Updated `useEffect` initialization**:
   - Gets fresh runtime for telemetry operations
   - Removed runtime from dependency arrays

### Changes to `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`:

1. **Removed runtime prop passing**:
   - No longer gets runtime via `getMainRuntime()`
   - Hook is now self-sufficient in getting current runtime

## Key Pattern Applied

This fix establishes an important pattern for Effect runtime usage in React:

```typescript
// BAD: Capturing runtime at component mount
const runtime = getMainRuntime(); // Stale after reinitializeRuntime()
const handleAction = () => {
  Effect.runPromise(effect.pipe(Effect.provide(runtime))); // Uses stale runtime
};

// GOOD: Getting fresh runtime at execution time
const handleAction = () => {
  const currentRuntime = getMainRuntime(); // Always current
  Effect.runPromise(effect.pipe(Effect.provide(currentRuntime)));
};
```

## Expected Results

After this fix:
1. Consumer telemetry will show `payment_start` and `payment_success/failure` events
2. Provider will see invoice status change from "pending" to "paid"
3. DVM will process the job and return results
4. NIP-90 handshake will complete successfully

## Testing Strategy

1. Start with no wallet (should use mock SparkService)
2. Initialize wallet with seed phrase
3. Send job request to DVM requiring payment
4. Verify payment completes successfully
5. Check telemetry for proper payment events