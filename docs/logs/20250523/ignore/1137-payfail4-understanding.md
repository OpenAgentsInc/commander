# NIP-90 Payment Failure - Deep Understanding

## The Real Problem

After analyzing the telemetry logs and NIP-90 specification, the payment failure is NOT due to:
- ❌ Stale runtime references (already fixed correctly)
- ❌ Missing auto-payment logic (already implemented)
- ❌ Payment button not being clicked (auto-payment handles this)
- ❌ Effect service resolution issues (runtime is fresh)

The real problem is: **The consumer and DVM are talking past each other on different relays.**

## The Communication Breakdown

### What's Happening:

1. **Consumer sends job request** (Kind 5050) to relays A, B, C
2. **Consumer subscribes for updates** on relays A, B, C
3. **DVM receives job request** from one of those relays
4. **DVM publishes payment-required** (Kind 7000) to relays A, D, E
5. **Consumer never sees payment-required** because it might only succeed on relay D or E
6. **Payment flow never starts** because consumer doesn't know payment is required

### Specific Relay Mismatch:

**Consumer subscribes on:** 
- `wss://relay.damus.io`
- `wss://relay.snort.social` ⚠️
- `wss://nos.lol`

**DVM publishes to:**
- `wss://relay.damus.io`
- `wss://relay.nostr.band` ⚠️
- `wss://nos.lol`

The DVM's publish shows "partial failure: 1 succeeded, 2 failed". If the successful publish was to `relay.nostr.band`, the consumer completely misses it because it's listening on `relay.snort.social` instead.

## Why This Happens

### Current Flow:

1. **NIP90AgentLanguageModelLive** (in AI provider) creates job request
2. It calls `nip90Service.subscribeToJobUpdates()` without specifying relays
3. **NIP90ServiceImpl** uses default NostrService relays for subscription
4. But the DVM has its own configured relays from `dvmConfig.dvmRelays`
5. These relay sets don't fully overlap

### The Missing Link:

The consumer should subscribe to the **DVM's specific relays** when waiting for responses from that particular DVM, not just use the global default Nostr relays.

## What Must Change

### 1. **NIP90Service Interface**
Add optional `relays` parameter to `subscribeToJobUpdates`:
```typescript
subscribeToJobUpdates(
  jobRequestEventId: string,
  dvmPubkeyHex: string,
  decryptionKey: Uint8Array,
  onUpdate: (event: NIP90JobResult | NIP90JobFeedback) => void,
  relays?: readonly string[], // NEW: specify which relays to subscribe on
): Effect.Effect<...>
```

### 2. **NIP90ServiceImpl**
Pass the custom relays through to NostrService:
```typescript
const subscription = yield* _(
  nostr.subscribeToEvents(
    [resultFilter, feedbackFilter],
    (event) => { /* ... */ },
    customRelays, // Pass DVM-specific relays here
  ),
);
```

### 3. **NIP90AgentLanguageModelLive**
When subscribing, use the DVM's configured relays:
```typescript
const sub = yield* _(
  nip90Service.subscribeToJobUpdates(
    signedEvent.id,
    targetDvmPubkey,
    requesterSk,
    (eventData) => { /* ... */ },
    dvmConfig.dvmRelays, // Use DVM's specific relays!
  ),
);
```

## Why This Will Fix It

1. **Alignment**: Consumer will listen on the same relays the DVM publishes to
2. **No missed events**: Payment-required events will be received
3. **Auto-payment triggers**: The existing auto-payment logic will fire
4. **Payment completes**: The full flow will work as designed

## The Complete Flow (After Fix)

1. User sends message → `send_message_called`
2. Job request published to relays A, B, C
3. Consumer subscribes on **DVM's relays** D, E, F
4. DVM receives request, creates invoice
5. DVM publishes payment-required to relays D, E, F
6. **Consumer receives payment-required** ✅ (because it's listening on D, E, F)
7. Auto-payment triggers → `auto_payment_triggered`
8. Payment executes → `payment_attempt` → `payment_start` → `payment_success`
9. DVM receives payment, processes job
10. DVM publishes result
11. Consumer receives result

## Critical Insight

The telemetry clearly shows:
- Consumer: Successfully publishes job request, sets up subscription, then... silence
- Provider: Receives job, creates invoice, publishes payment-required, then... waits forever

The gap is in the middle - the events are being published to different relay sets. This is a classic distributed systems problem where two parties think they're communicating but are actually talking to different servers.

## Implementation Priority

This is a **single point of failure** that blocks the entire payment flow. No amount of payment handling improvements will help if the consumer never receives the payment request in the first place.

The fix is surgical and specific:
1. Update interface to accept relay parameter
2. Thread it through the implementation
3. Pass DVM relays when subscribing

This ensures consumer and DVM are communicating on the same channels, allowing the already-implemented payment flow to work correctly.