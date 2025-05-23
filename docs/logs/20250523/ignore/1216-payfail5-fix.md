# Payment Failure Fix: NIP-13 Proof of Work Blocking Events

## Problem Summary

The NIP-90 payment failure was caused by **Proof of Work (PoW) requirements** on relays, not missing payment logic.

## Root Cause Analysis

### Telemetry Evidence
**Consumer Log**:
```
Partially published event b25df1104dd65b4a…: 1 succeeded, 2 failed.
Failures: Error: pow: 28 bits needed. (2), Error: no active subscription
```

**Provider Log**:
```
Partially published event 99fe277ddb69f737…: 1 succeeded, 2 failed.
Failures: Error: pow: 28 bits needed. (2), Error: no active subscription
```

Both consumer and provider show **"pow: 28 bits needed"** errors for 2/3 relays.

### NIP-13 Analysis

According to [NIP-13 Proof of Work](../nips/13.md):
- Relays can require computational proof of work to prevent spam
- `difficulty` = number of leading zero bits in event ID
- Events rejected if they don't meet the required difficulty threshold

### Relay Status Analysis

**DVM Configuration Relays**:
- `wss://relay.damus.io` ❌ **Requires 28-bit PoW**
- `wss://relay.nostr.band` ❌ **Requires 28-bit PoW**  
- `wss://nos.lol` ✅ **No PoW requirement**

### The Fatal Flow

1. **Consumer publishes job request** → Only accepted by `nos.lol`
2. **Provider receives job** → Creates payment request
3. **Provider publishes payment event** → Only accepted by `nos.lol` 
4. **Consumer subscribes to DVM relays** → `relay.damus.io` and `relay.nostr.band`
5. **Payment event never reaches consumer** → Both PoW relays rejected it

**Result**: Consumer listens on PoW-required relays, but payment events only exist on `nos.lol`.

## Solution: Remove PoW Relays

### Immediate Fix
**Before**:
```json
["wss://relay.damus.io", "wss://relay.nostr.band"]
```

**After**:
```json  
["wss://nos.lol"]
```

### Rationale
1. **Eliminate PoW barrier** - Events can be published and received
2. **Ensure consistency** - Both consumer and provider use same relay
3. **Functional payments** - Payment events reach the consumer
4. **Temporary solution** - Until NIP-13 PoW support is implemented

## Future Work: NIP-13 Implementation

To support PoW-required relays, we need to implement:

### 1. PoW Mining for Events
```typescript
interface PoWOptions {
  targetDifficulty: number; // e.g., 28 bits
  maxAttempts?: number;     // prevent infinite mining
  updateCreatedAt?: boolean; // update timestamp during mining
}

function mineEvent(event: NostrEvent, options: PoWOptions): NostrEvent {
  let nonce = 0;
  let minedEvent = { ...event };
  
  while (nonce < (options.maxAttempts || 1000000)) {
    minedEvent.tags = [
      ...event.tags,
      ["nonce", nonce.toString(), options.targetDifficulty.toString()]
    ];
    
    if (options.updateCreatedAt) {
      minedEvent.created_at = Math.floor(Date.now() / 1000);
    }
    
    const eventId = calculateEventId(minedEvent);
    const difficulty = countLeadingZeroBits(eventId);
    
    if (difficulty >= options.targetDifficulty) {
      minedEvent.id = eventId;
      return minedEvent;
    }
    
    nonce++;
  }
  
  throw new Error(`Failed to mine event with ${options.targetDifficulty} bits in ${options.maxAttempts} attempts`);
}
```

### 2. Relay PoW Detection
```typescript
interface RelayPoWInfo {
  relay: string;
  requiresPoW: boolean;
  minimumDifficulty?: number;
}

async function detectRelayPoWRequirements(relays: string[]): Promise<RelayPoWInfo[]> {
  // Test publish with low-difficulty event
  // Analyze rejection messages for PoW requirements
  // Return relay capabilities
}
```

### 3. Adaptive PoW Strategy
```typescript
async function publishWithAdaptivePoW(event: NostrEvent, relays: string[]): Promise<PublishResult[]> {
  const relayInfo = await detectRelayPoWRequirements(relays);
  const maxDifficulty = Math.max(...relayInfo.map(r => r.minimumDifficulty || 0));
  
  let publishEvent = event;
  if (maxDifficulty > 0) {
    publishEvent = mineEvent(event, { targetDifficulty: maxDifficulty });
  }
  
  return publishToRelays(publishEvent, relays);
}
```

### 4. Configuration Options
```typescript
interface NostrServiceConfig {
  enablePoW: boolean;
  maxPoWDifficulty: number;
  poWTimeoutMs: number;
  fallbackToNonPoWRelays: boolean;
}
```

## Testing Strategy

### Current Test (No PoW)
1. Send message to DVM
2. Expect payment request on `nos.lol`
3. Verify auto-payment triggers
4. Confirm DVM processes request

### Future Test (With PoW)
1. Configure PoW-required relays
2. Send message to DVM  
3. Verify events are mined with required difficulty
4. Confirm payment flow works on PoW relays

## Performance Considerations

### PoW Mining Impact
- **CPU intensive** - 28-bit difficulty requires ~268 million hash attempts
- **Battery drain** - Significant on mobile devices
- **Latency** - Mining can take seconds to minutes
- **User experience** - Need progress indicators

### Optimization Strategies
1. **Web Workers** - Offload mining to background threads
2. **Difficulty caching** - Remember relay requirements
3. **Delegated PoW** - Use external mining services for mobile
4. **Selective mining** - Only mine for critical events

## Related Issues

- **Mobile performance** - PoW mining drains battery
- **User experience** - Long delays for event publishing
- **Relay diversity** - Limited to non-PoW relays currently
- **Spam prevention** - PoW helps prevent abuse

## References

- [NIP-13: Proof of Work](../nips/13.md)
- [NIP-01: Basic protocol flow](../nips/01.md) 
- [Nostr Tools PoW implementation](https://github.com/nbd-wtf/nostr-tools)

## Conclusion

Removing PoW-required relays immediately fixes the payment failure issue. The consumer and provider can now communicate successfully on `nos.lol`, enabling automatic micropayments for NIP-90 DVM services.

Future NIP-13 implementation will restore access to PoW-required relays while maintaining the payment functionality.