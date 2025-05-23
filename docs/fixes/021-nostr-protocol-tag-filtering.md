# Fix: Nostr Protocol Tag Filtering and Timing Issues

## Problem

When implementing Nostr-based protocols (like NIP-90 DVMs), developers often misunderstand:
1. How tag filtering works (especially p-tags as hints vs access control)
2. The impact of `since` filters on event visibility
3. The importance of author filtering for response handling

This leads to:
- Random services responding to "targeted" requests
- Provider services not seeing events due to timing filters
- Confusion when external services respond with unexpected messages

### Error Symptoms
- "I can't decrypt this message" errors from unknown sources
- Provider telemetry shows no events received despite correct configuration
- Consumer receives responses from unintended service providers

## Root Cause

### 1. Protocol Design Misunderstanding
In protocols like NIP-90:
- Events are PUBLIC by design to enable marketplace competition
- P-tags are hints/preferences, NOT access control
- ANY service can choose to process ANY request

### 2. Timing Filter Issues
```typescript
// PROBLEMATIC: Only sees events from last 60 seconds
const filters: NostrFilter[] = [{
  kinds: [5050],
  "#p": [targetPubkey],
  since: Math.floor(Date.now() / 1000) - 60, // <-- Causes silent event loss!
}];
```

### 3. Missing Response Filtering
```typescript
// WRONG: Accepting responses from anyone
subscribeToEvents(filters, (event) => {
  processResponse(event); // Processes responses from ANY service!
});
```

## Solution

### 1. Remove Restrictive Timing Filters
```typescript
// CORRECT: See all events for this service
const filters: NostrFilter[] = [{
  kinds: [5050],
  "#p": [targetPubkey],
  // No 'since' filter - let the service see all relevant events
}];
```

### 2. Always Filter Responses by Author
```typescript
// CORRECT: Only process responses from intended service
const responseFilters: NostrFilter[] = [{
  kinds: [6050], // Response kinds
  "#e": [requestEventId],
  authors: [intendedServicePubkey], // Critical!
}];

subscribeToEvents(responseFilters, (event) => {
  // Now only processes responses from the intended service
  processResponse(event);
});
```

### 3. Add Telemetry at Event Reception
```typescript
const onEvent = (event: NostrEvent) => {
  // Log IMMEDIATELY when event arrives
  telemetry.trackEvent({
    category: "protocol:event",
    action: "received",
    label: event.id,
    value: `Kind: ${event.kind}`,
  });
  
  // Then process
  processEvent(event);
};
```

## Complete Example

```typescript
// Service Provider Implementation
const startListening = () => {
  const filters: NostrFilter[] = [{
    kinds: supportedKinds,
    "#p": [myServicePubkey],
    // NO 'since' filter - see all events targeted to us
  }];

  const subscription = nostr.subscribeToEvents(
    filters,
    (event) => {
      // Log reception immediately
      telemetry.trackEvent({
        category: "service:event",
        action: "job_received",
        label: event.id,
      });
      
      processJobRequest(event);
    }
  );
};

// Consumer Implementation
const subscribeToResponses = (jobId: string, providerPubkey: string) => {
  const filters: NostrFilter[] = [
    {
      kinds: [6000, 6001, 6002], // Response kinds
      "#e": [jobId],
      authors: [providerPubkey], // Only our chosen provider!
    },
    {
      kinds: [7000], // Feedback
      "#e": [jobId],
      authors: [providerPubkey], // Only our chosen provider!
    }
  ];

  return nostr.subscribeToEvents(filters, handleResponse);
};
```

## When to Apply This Fix

You need this fix when:
1. Services aren't receiving events despite correct configuration
2. Receiving responses from unexpected/unknown services
3. Telemetry shows no "event received" logs
4. Error messages appear that aren't in your codebase

## Debugging Checklist

1. **Check for timing filters**: Remove `since` filters during debugging
2. **Verify author filters**: Ensure response subscriptions filter by author
3. **Add reception telemetry**: Log immediately when events arrive
4. **Check relay overlap**: Ensure consumer and provider use same relays
5. **Search for error text**: If error isn't in codebase, it's external

## Related Issues

- Missing events due to relay propagation delays
- Confusion about p-tag semantics in Nostr protocols
- External services interfering with "private" communications
- Telemetry gaps hiding root causes

## Key Lessons

1. **P-tags are NOT access control** - they're hints for preferred providers
2. **Always filter responses** - don't accept responses from random services
3. **Timing filters can hide events** - be very careful with `since` filters
4. **Telemetry at reception point** - log events as soon as they arrive
5. **External services exist** - if an error isn't in your code, it's from outside