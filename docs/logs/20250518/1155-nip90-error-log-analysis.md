# NIP-90 Error Analysis

## Issue Summary

The error logs show a partial failure when attempting to publish a NIP-90 request event to Nostr relays. Specifically:

```
TelemetryServiceImpl.ts:98 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Failed to publish to 2 relays', value: 'Error: blocked: Purple Pages only accepts kind 0, 3 and 10002., Error: no active subscription', timestamp: 1747587408365}
```

This is followed by:

```
TelemetryServiceImpl.ts:98 [Telemetry] {category: 'log:error', action: 'nip90_publish_failure', label: 'Publishing NIP-90 request failed: Failed to publish to 2 out of 6 relays', value: 'NostrPublishError: Failed to publish to 2 out of 6…/nostr/NostrServiceImpl.ts?t=1747587218016:143:39', timestamp: 1747587408365}
```

## Root Cause Analysis

1. **Partial Relay Rejection**: The application is treating a partial relay failure as a complete failure, which is preventing NIP-90 requests from being submitted successfully.

2. **Specific Relay Restrictions**: Some relays in our default relay list have restrictions:

   - Purple Pages (`wss://purplepag.es/`) explicitly rejects event kinds outside of 0, 3, and 10002
   - Another relay reported "no active subscription" error

3. **Error Handling Issue**: Our current implementation in `NostrServiceImpl.ts` fails the entire publish operation if ANY relay fails, instead of considering it successful as long as SOME relays accepted the event.

## Solution Recommendation

1. **Modify Publish Success Criteria**: Update the `publishEvent` method in `NostrServiceImpl.ts` to consider the operation successful if at least one relay accepts the event:

```typescript
// Instead of returning a failure if any relay fails:
if (failedRelays.length > 0 && failedRelays.length < config.relays.length) {
  // Log warning but don't fail if at least one relay succeeded
  const publishWarningEvent: TelemetryEvent = {
    category: "log:warn",
    action: "nostr_publish_partial_failure",
    label: `[Nostr] Failed to publish to ${failedRelays.length} relays`,
    value: failedRelays
      .map((fr) => (fr as PromiseRejectedResult).reason)
      .join(", "),
  };

  // Fire-and-forget telemetry event
  Effect.gen(function* (_) {
    const telemetryService = yield* _(TelemetryService);
    yield* _(telemetryService.trackEvent(publishWarningEvent));
  }).pipe(/* existing implementation */);

  // Continue with success path, don't return failure
}
```

2. **Relay List Filtering**: Consider implementing relay filtering based on event kind:

   - Maintain a mapping of known relay restrictions
   - Filter the relay list for each publish operation based on event kind

3. **Relay Selection Refinement**: Update `DefaultNostrServiceConfigLayer` to remove or replace problematic relays:
   - Remove Purple Pages from the default relay list for NIP-90 events
   - Add more reliable relays that accept NIP-90 events

## Implementation Plan

1. **Immediate Fix**: Update `NostrServiceImpl.ts` to accept partial successes as valid publishes for NIP-90 events
2. **Medium-term**: Implement relay filtering based on event kinds
3. **Long-term**: Consider implementing a dynamic relay reputation system that tracks relay behavior and adjusts relay selection accordingly

## Testing Strategy

1. After implementing the fix, test publishing NIP-90 requests to verify they succeed even with partial relay failures
2. Verify telemetry still logs partial failures as warnings
3. Ensure the application correctly handles events published to a subset of relays
