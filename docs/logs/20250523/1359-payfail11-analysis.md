# Payment Failure Analysis #11 - Timing and Subscription Issue

## Overview
Despite fixing the SimplePool subscription method and invoice extraction, the consumer is STILL not receiving payment-required events. This analysis examines the timing of events and subscription behavior.

## Timeline Analysis

### Consumer Timeline
1. **1748026663715** - Job request published to relays
2. **1748026664447** - Job successfully published (732ms delay)
3. **1748026664447** - IMMEDIATELY starts subscribing for updates
4. **1748026664448** - Subscription created (1ms later)
5. **Waiting...** - No events received despite active subscription

### Provider Timeline  
1. **1748026658217** - DVM starts listening for job requests
2. **1748026658963** - EOSE received (initial sync complete)
3. **1748026664335** - Receives job request (5.4 seconds after starting)
4. **1748026664336** - Processing job request
5. **1748026666999** - Creates payment feedback event (2.7 seconds later)
6. **1748026667008** - Publishing payment event
7. **1748026667190** - Payment event published successfully

## Critical Timing Discovery

The provider publishes the payment-required event at **1748026667190**, which is **2.7 seconds AFTER** the consumer created its subscription at **1748026664448**.

This means the subscription WAS active when the payment event was published. The timing is NOT the issue.

## Key Observations

### 1. Subscription Filter Analysis
Consumer subscription filter (line 77):
```json
{
  "filters": [
    {
      "kinds": [6000,6001,6002,6003,6004,6005,6006,6007,6008,6009,6010,6999,7000],
      "#e": ["527b1f694c23dbc0e88d82ee540b4411ddb4eb9c8a5bf4c5ec2f93c970c955a5"],
      "authors": ["714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"],
      "since": 1748026658, // 5 seconds before job created_at
      "limit": 5
    },
    // Second filter for kind 7000 with limit 10
  ]
}
```

### 2. Payment Event Structure
Provider creates event (line 80):
```json
[
  ["e","527b1f694c23dbc0e88d82ee540b4411ddb4eb9c8a5bf4c5ec2f93c970c955a5"],
  ["p","3551283dde1c27a0e5a43a71f93727db47c0187a1a73b95c7a1786f52569bb19"],
  ["status","payment-required","Please pay 3 sats to process your request"],
  ["amount","3000","lnbc30n1p5rp3f2pp5cf..."]
]
```

### 3. Event Matching Requirements
For the consumer to receive the event:
- ✅ Event kind must be 7000 (feedback)
- ✅ Event must have `e` tag with job ID: `527b1f694c...`
- ✅ Event author must be DVM pubkey: `714617896896f2...`
- ✅ Event created_at must be >= `since` value

All requirements are met! The event SHOULD match the filter.

## The Real Problem - Missing "job_update_received" Log

The consumer has our fix that should log "job_update_received" when ANY event is received in the `onevent` callback. But this log NEVER appears.

This means either:
1. The subscription is not actually working (despite being created)
2. The relays are not delivering the event
3. The `onevent` callback is not being triggered

## Hypothesis: SimplePool Subscription API Issue

Looking at our fix, we changed to:
```typescript
const sub = poolRef.current.subscribeMany(
  DEFAULT_RELAYS,
  filters,
  {
    onevent: async (event: NostrEvent) => {
      // This should log but never does
    },
    oneose: () => {
      // This should also log
    }
  }
);
```

But we never see the EOSE log either! This suggests the subscription callbacks aren't being registered properly.

## NostrServiceImpl Comparison

The NostrServiceImpl uses a different pattern (line 486):
```typescript
const filter: NostrFilter = filters[0];  // Only uses first filter!
const subCloser = pool.subscribe(
  relaysToUse as string[],
  filter,
  subParams,
);
```

It uses `subscribe()` not `subscribeMany()` and only passes a single filter, not an array.

## Root Cause

The issue appears to be that:
1. We're using `subscribeMany()` with multiple filters
2. The callbacks might not be properly attached
3. We never receive ANY events (not even EOSE)

## Missing Events in Subscription

Another critical issue: When a subscription is created AFTER events have been published, it should still receive those events if they match the filter and are within the `since` timestamp. 

The consumer's `since` value is set to 5 seconds before the job was created, which should include any events published after that time. Yet it receives nothing.

## Additional Discovery - EOSE Never Received

Looking at the consumer logs, we NEVER see the "subscription_eose" telemetry event that should be logged in the `oneose` callback. This is a critical clue - it means the subscription callbacks aren't being triggered at all.

In contrast, the provider DOES receive EOSE at line 69:
```
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748026658963}
```

## The Real Issue - Callback Registration

After examining the subscribeMany implementation, it appears to be calling subscribeMap internally. The issue might be that our callback structure is incorrect or the subscription isn't being properly established.

## Critical Difference with NostrServiceImpl

NostrServiceImpl pattern:
- Uses `pool.subscribe()` (singular)
- Passes only ONE filter
- Has working callbacks

Consumer pattern (our fix):
- Uses `pool.subscribeMany()` 
- Passes array of filters
- Callbacks never fire

## Recommended Fix

The consumer should match the working pattern from NostrServiceImpl:

1. **Use `subscribe()` for each filter separately** instead of `subscribeMany()`
2. **Create two separate subscriptions** - one for result events (6xxx) and one for feedback events (7000)
3. **Ensure the subscription object is properly stored** and can be closed later

Example fix:
```typescript
// Subscribe to feedback events (kind 7000)
const feedbackSub = poolRef.current.subscribe(
  DEFAULT_RELAYS,
  filters[1], // The feedback filter
  {
    onevent: async (event: NostrEvent) => {
      // Handle events
    },
    oneose: () => {
      // Handle EOSE
    }
  }
);

// Subscribe to result events separately if needed
const resultSub = poolRef.current.subscribe(
  DEFAULT_RELAYS,
  filters[0], // The result filter
  { /* ... */ }
);
```

The core issue is that `subscribeMany` with our callback structure isn't working as expected, while the simpler `subscribe` pattern used in NostrServiceImpl does work.