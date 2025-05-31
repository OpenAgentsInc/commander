# Payment Failure Analysis #14 - Updated Architecture Understanding

## Executive Summary

We've been modifying the wrong code! The agent chat uses `NIP90AgentLanguageModelLive` (Effect service), not `useNip90ConsumerChat` (React hook). This explains why our telemetry additions never appeared.

## Architecture Discovery

### Two Parallel NIP-90 Consumer Implementations

1. **Effect-based Service (NIP90AgentLanguageModelLive)** ✅ USED IN AGENT CHAT
   - Location: `src/services/ai/providers/nip90/`
   - Purpose: Implements `AgentLanguageModel` interface for AI orchestration
   - Used by: `ChatOrchestratorService` for agent chat
   - Features:
     - Creates ephemeral keypairs for privacy
     - Uses `NIP90Service.subscribeToJobUpdates()`
     - Auto-pays amounts ≤ 10 sats
     - Integrates with SparkService for payments
   - **THIS IS THE CODE PATH IN THE FAILING TEST**

2. **React Hook (useNip90ConsumerChat)** ❌ NOT USED IN AGENT CHAT
   - Location: `src/hooks/`
   - Purpose: Direct UI component integration
   - Used by: Standalone NIP-90 consumer chat panes
   - Features:
     - Manual payment approval UI
     - Direct NostrService usage (after our refactor)
   - **We've been modifying this, but it's not used in agent chat!**

## The Real Issue

### Critical Bug Found: Invoice Extraction

In `NIP90AgentLanguageModelLive.ts` line 287:
```typescript
// CURRENT (WRONG)
const invoice = amountTag[1];

// SHOULD BE (per NIP-90 spec)
const invoice = amountTag[2];
```

The NIP-90 spec clearly states the amount tag format is:
```
["amount", "millisats-amount", "optional-bolt11-invoice"]
```

So `amountTag[2]` contains the invoice, not `amountTag[1]`.

### Why Subscriptions Appear Correct But Don't Work

The `NIP90ServiceImpl.subscribeToJobUpdates` correctly:
1. Creates filters for both result (6000-6999) and feedback (7000) events
2. Uses the same NostrService that works for the provider
3. Passes the correct job ID and author filters

But events never reach the handler, likely due to:
1. The invoice extraction bug preventing payment
2. Context isolation in Effect execution
3. Possible relay configuration mismatches

## Recommendations for Next Coding Agent

### 1. Immediate Fix: Invoice Extraction
Fix line 287 in `NIP90AgentLanguageModelLive.ts`:
```typescript
const invoice = amountTag[2]; // Not amountTag[1]
```

### 2. Add Telemetry to the Right Place
Add comprehensive telemetry to `NIP90ServiceImpl.subscribeToJobUpdates`:
```typescript
// After line 449 (when subscription is created)
yield* _(telemetry.trackEvent({
  category: "nip90:subscription",
  action: "filters_created",
  label: jobRequestEventId,
  value: `Result: ${JSON.stringify(resultFilter)} | Feedback: ${JSON.stringify(feedbackFilter)}`
}).pipe(Effect.ignoreLogged));

// Inside the event handler (line 453)
telemetry.trackEvent({
  category: "nip90:subscription",
  action: "event_received",
  label: event.id,
  value: `Kind: ${event.kind} | Job: ${jobRequestEventId}`
});
```

### 3. Verify Relay Configuration
Check that both consumer and provider use the same relays:
- Consumer: Uses `dvmConfig.dvmRelays` (passed from config)
- Provider: Uses `NIP90_DVM_RELAYS`
- These must match for events to flow

### 4. Architecture Consolidation (Your Goal)
Since you want everything in Effect:
1. **Keep**: `NIP90AgentLanguageModelLive` as the primary implementation
2. **Deprecate**: `useNip90ConsumerChat` hook (or refactor to use Effect services)
3. **Create**: Thin React components that consume Effect services via runtime
4. **Benefit**: Single source of truth, consistent behavior, full Effect benefits

### 5. Debug NostrService Level
If the above doesn't fix it, add logging to `NostrServiceImpl`:
- Log when subscriptions are created
- Log when WebSocket messages arrive
- Log filter matching logic
- Verify event handler registration

## Why This Architecture Makes Sense

Your desire for "everything in Effect" aligns with:
- **Effect Services**: Business logic, state management, side effects
- **React Components**: Pure UI rendering, user interaction
- **Runtime Bridge**: Clean separation between Effect world and React world

The current dual implementation (Effect service + React hook) creates confusion and maintenance burden. Consolidating to Effect-only with thin React wrappers is the right approach.

## Next Steps Priority

1. **Fix the invoice bug** in `NIP90AgentLanguageModelLive.ts`
2. **Add telemetry** to `NIP90ServiceImpl.subscribeToJobUpdates`
3. **Test the fix** with agent chat
4. **Plan consolidation** of the two implementations

The good news: we now understand the architecture and know exactly where to fix the issue!