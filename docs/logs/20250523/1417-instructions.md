# Payment Fix Instructions - Replace Consumer's SimplePool with NostrService

## Problem Summary

The consumer's NIP-90 payment flow is broken because it uses its own SimplePool instance for subscriptions, which never receives events. Meanwhile, NostrService (used by the provider and for publishing) works perfectly.

**Evidence:**
- Consumer's SimplePool subscription callbacks NEVER fire (no "job_update_received" or "subscription_eose" logs)
- NostrService successfully creates subscriptions (logs show "nostr_sub_created")
- Provider using NostrService works flawlessly
- Consumer uses NostrService for publishing (works) but SimplePool for subscribing (broken)

## Solution: Replace SimplePool with NostrService

### Approach: Refactor, Don't Remove

**DO NOT remove the `useNip90ConsumerChat` hook entirely.** Instead, refactor it to use NostrService for subscriptions while maintaining the same external API.

**Why refactor instead of remove:**
1. The hook encapsulates complex payment logic and state management
2. It handles encryption/decryption, auto-payment, and UI updates
3. Removing it would require rewriting significant consumer logic
4. The issue is ONLY with the subscription mechanism, not the hook's purpose

## Specific Implementation Instructions

### Step 1: Import NostrService in useNip90ConsumerChat.ts

Add NostrService import and remove SimplePool dependency:

```typescript
// Remove:
import { SimplePool } from "nostr-tools";

// Add:
import { NostrService } from "@/services/nostr";
import { getMainRuntime } from "@/services/runtime";
```

### Step 2: Replace SimplePool with NostrService

**Remove these lines:**
```typescript
const poolRef = useRef<SimplePool | null>(null);
// ...
poolRef.current = new SimplePool();
```

**Replace the subscription logic:**

Instead of:
```typescript
const resultSub = poolRef.current.subscribe(
  DEFAULT_RELAYS,
  filters[0],
  { onevent: handleEvent, oneose: () => handleEose("result") }
);

const feedbackSub = poolRef.current.subscribe(
  DEFAULT_RELAYS,
  filters[1], 
  { onevent: handleEvent, oneose: () => handleEose("feedback") }
);
```

**Use this pattern:**
```typescript
// Get NostrService from runtime
const currentRuntime = getMainRuntime();
const nostrService = Context.get(currentRuntime.context, NostrService);

// Subscribe using NostrService (similar to how publishing works)
const subscribeEffect = Effect.gen(function* () {
  const resultSub = yield* nostrService.subscribeToEvents(
    [filters[0]], // Result filter
    handleEvent,
    DEFAULT_RELAYS,
    () => handleEose("result")
  );
  
  const feedbackSub = yield* nostrService.subscribeToEvents(
    [filters[1]], // Feedback filter  
    handleEvent,
    DEFAULT_RELAYS,
    () => handleEose("feedback")
  );
  
  return { resultSub, feedbackSub };
});

const subscriptions = await Effect.runPromise(
  subscribeEffect.pipe(Effect.provide(currentRuntime))
);

// Store subscriptions for cleanup
activeSubsRef.current.set(signedEvent.id + "_result", subscriptions.resultSub);
activeSubsRef.current.set(signedEvent.id + "_feedback", subscriptions.feedbackSub);
```

### Step 3: Update Publishing (Already Works)

The publishing logic already uses NostrService correctly:
```typescript
const publishPromises = poolRef.current.publish(DEFAULT_RELAYS, signedEvent);
```

**Replace with NostrService publishing:**
```typescript
// This should already be using Effect-based publishing via createNip90JobRequest
// If not, update to use NostrService.publishEvent()
```

### Step 4: Update Cleanup Logic

Update the useEffect cleanup:
```typescript
return () => {
  activeSubsRef.current.forEach((sub) => sub.unsub()); // Keep existing cleanup method
  activeSubsRef.current.clear();
  // Remove SimplePool cleanup since we're not using it anymore
};
```

### Step 5: Handle Publishing Consistency

Ensure publishing also uses NostrService (it should already):
```typescript
// The createNip90JobRequest should handle this, but verify it's using
// NostrService.publishEvent() and not poolRef.current.publish()
```

## Expected Results

After this refactor:
1. ✅ Consumer will receive "subscription_eose" events  
2. ✅ Consumer will receive "job_update_received" events
3. ✅ Payment-required events will reach the consumer
4. ✅ Auto-payment will trigger successfully
5. ✅ Invoice extraction from `amountTag[2]` will work
6. ✅ Payment flow will complete end-to-end

## Key Implementation Notes

1. **Maintain the same hook API** - Other components using `useNip90ConsumerChat` should not need changes
2. **Use Effect.runPromise for async operations** - Follow the existing pattern used for publishing
3. **Keep all existing payment logic** - The auto-pay, encryption, state management remains unchanged
4. **Use getMainRuntime() consistently** - Follow the pattern used elsewhere in the hook
5. **Preserve telemetry logging** - Keep all existing telemetry events

## Testing Validation

After implementation, the consumer logs should show:
- "subscription_eose" telemetry events 
- "job_update_received" telemetry events when payment events arrive
- Successful auto-payment flow completion

This fix addresses the root cause: using broken SimplePool instead of working NostrService infrastructure.