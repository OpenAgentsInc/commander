# Payment Failure 7 Analysis: PoW Mining Timeout

## Executive Summary

The payment failure persists because **28-bit PoW mining is computationally infeasible in the browser**. The consumer starts mining but never completes, preventing the job request from ever being published. This is a fundamental performance limitation, not a bug.

## DEEPDIVE: The Real Problem

### 1. PoW Difficulty Reality Check

**28 bits of difficulty means finding a hash with 28 leading zero bits**. The probability of finding such a hash is:
- Probability per attempt: 1 / 2^28 = 1 / 268,435,456
- Expected iterations: ~268 million attempts
- At 100k iterations/second (optimistic JS performance): ~45 minutes
- In reality, browser JS achieves ~10-50k iterations/second: **90-450 minutes**

### 2. Current Implementation Analysis

From the telemetry:
```
[Nostr] Mining PoW for event 587da2d24e21ac7f4e3a657a88e884195005cadfec4f4ec0a63f5b00aed9915a
Target difficulty: 28 bits
```

Then... nothing. The consumer is stuck mining for the entire 34-second log duration.

### 3. Why This Breaks Everything

```
Consumer → [Mining PoW...] → ⏳ (stuck forever) → ❌ Never publishes
                                                          ↓
Provider → [Listening...] → 😴 (never receives anything) ← ┘
```

The provider is working perfectly - it's listening on wss://nos.lol and ready to process requests. But it never receives anything because the consumer can't complete the PoW.

## Root Cause Analysis

### 1. Relay Configuration Issue

Looking at `NostrServiceConfig.ts`:
```typescript
relayConfigs: [
  { url: "wss://nos.lol" }, // No PoW required
  { url: "wss://relay.damus.io", powRequirement: 28 }, // Requires 28-bit PoW
  { url: "wss://relay.nostr.band", powRequirement: 28 }, // Requires 28-bit PoW
]
```

**THE CRITICAL BUG**: The NostrService is using the MAXIMUM PoW requirement across ALL relays, even when publishing to non-PoW relays!

### 2. Code Logic Flaw

In `NostrServiceImpl.ts`:
```typescript
// Determine maximum PoW requirement
let maxPowRequired = 0;
for (const relayConfig of relayConfigs) {
  if (relayConfig.powRequirement && relayConfig.powRequirement > 0) {
    maxPowRequired = Math.max(maxPowRequired, relayConfig.powRequirement);
  }
}

// Mine PoW if required
if (maxPowRequired > 0) {
  // MINES FOR ALL RELAYS EVEN IF ONLY PUBLISHING TO NON-POW RELAY!
}
```

This is wrong! It should only mine PoW for the relays it's actually publishing to.

### 3. Consumer Using Wrong Relays

The consumer should ONLY use wss://nos.lol (no PoW) for testing, but it's configured with all relays, triggering unnecessary 28-bit mining.

## CODING INSTRUCTIONS FOR NEXT AGENT

### Fix 1: Smart Relay Selection (PRIORITY)

**File**: `src/services/nostr/NostrServiceImpl.ts`

**Current** (WRONG):
```typescript
// Uses ALL configured relays and mines for MAX difficulty
const relayConfigs = getRelayConfigs();
let maxPowRequired = 0;
for (const relayConfig of relayConfigs) {
  if (relayConfig.powRequirement && relayConfig.powRequirement > 0) {
    maxPowRequired = Math.max(maxPowRequired, relayConfig.powRequirement);
  }
}
```

**Change to**:
```typescript
// Add optional relay filter parameter to publishEvent
const publishEvent = (
  event: NostrEvent,
  targetRelays?: string[] // NEW: optional relay URLs to publish to
): Effect.Effect<void, NostrPublishError, never> =>
  Effect.gen(function* (_) {
    const allRelayConfigs = getRelayConfigs();
    
    // Filter to only requested relays if specified
    const relayConfigs = targetRelays 
      ? allRelayConfigs.filter(r => targetRelays.includes(r.url))
      : allRelayConfigs;
    
    // Only mine for relays we're actually using
    let maxPowRequired = 0;
    for (const relayConfig of relayConfigs) {
      if (relayConfig.powRequirement && relayConfig.powRequirement > 0) {
        maxPowRequired = Math.max(maxPowRequired, relayConfig.powRequirement);
      }
    }
    
    // Continue with existing mining logic...
```

### Fix 2: NIP90Service Relay Override

**File**: `src/services/nip90/NIP90ServiceImpl.ts`

Find where events are published and add relay override:
```typescript
// When publishing NIP-90 events, use specific relays
yield* _(nostrService.publishEvent(jobRequestEvent, ["wss://nos.lol"])); // NO POW!
```

### Fix 3: Update Mining Timeout

**File**: `src/services/nostr/NostrServiceImpl.ts`

Change mining parameters for testing:
```typescript
const minedEvent = yield* _(
  nip13Service.mineEvent(event, {
    targetDifficulty: maxPowRequired,
    maxIterations: 1_000_000, // Reduce from 5M for faster failure
    timeoutMs: 30_000, // 30 seconds instead of 60
    onProgress: (iterations, currentBest) => {
      if (iterations % 10000 === 0) { // Log every 10k instead of 100k
        // Add timeout warning
        if (iterations > 500000) {
          console.warn(`PoW mining taking too long: ${iterations} iterations, best: ${currentBest}/${maxPowRequired}`);
        }
      }
    }
  })
);
```

### Fix 4: Temporary Testing Configuration

**File**: `src/services/nostr/NostrServiceConfig.ts`

For testing, use ONLY non-PoW relays:
```typescript
export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig,
  {
    relays: [], 
    relayConfigs: [
      { url: "wss://nos.lol" }, // NO POW - USE ONLY THIS FOR NOW
      // COMMENT OUT HIGH-POW RELAYS FOR TESTING
      // { url: "wss://relay.damus.io", powRequirement: 28 },
      // { url: "wss://relay.nostr.band", powRequirement: 28 },
    ],
    defaultPublicKey: undefined,
    defaultPrivateKey: undefined,
    enablePoW: true,
    defaultPowDifficulty: 0,
    requestTimeoutMs: 10000,
  } as const
);
```

### Fix 5: Add PoW Bypass for Development

**File**: `src/services/nip13/NIP13ServiceImpl.ts`

Add development bypass:
```typescript
mineEvent: (event: NostrEvent, options: MiningOptions): Effect.Effect<MinedEvent, NIP13Error> => {
  // TEMPORARY: Skip mining in development for high difficulty
  if (options.targetDifficulty >= 20 && process.env.NODE_ENV === 'development') {
    console.warn(`BYPASSING PoW mining for ${options.targetDifficulty} bits in development`);
    return Effect.succeed({
      ...event,
      tags: [...event.tags, ["nonce", "0", options.targetDifficulty.toString()]],
      miningMetadata: {
        difficulty: 0,
        iterations: 0,
        timeMs: 0
      }
    });
  }
  
  // Continue with actual mining...
```

## Implementation Priority

1. **IMMEDIATE**: Fix relay selection logic (Fix 1) - Only mine for relays actually being used
2. **IMMEDIATE**: Comment out high-PoW relays in config (Fix 4)
3. **QUICK**: Add relay override to NIP90Service (Fix 2)
4. **OPTIONAL**: Add mining timeout warnings (Fix 3)
5. **DEVELOPMENT**: Add PoW bypass for testing (Fix 5)

## Expected Outcome

After implementing these fixes:
1. Consumer will ONLY use wss://nos.lol (no PoW required)
2. No mining will occur for non-PoW relays
3. Job requests will publish immediately
4. Provider will receive requests and process payments

## Long-term Solution

For production use with PoW relays:
1. Implement Web Worker mining (non-blocking)
2. Use delegated PoW services
3. Pre-mine events during idle time
4. Implement progressive relay fallback (try non-PoW first, then PoW)

## Verification Steps

After fixes:
1. Check telemetry for "nostr_pow_mining_start" - should NOT appear when using nos.lol
2. Verify "nostr_publish_begin" happens immediately
3. Confirm provider receives job request
4. Verify payment flow completes

The core issue is that we're trying to mine 28-bit PoW in the browser for ALL publishes, even to non-PoW relays. This is both unnecessary and impossible. Fix the relay selection logic and the payments will work.