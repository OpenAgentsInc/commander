# NIP90 Kind 5050 Event Listening Fix - Log

## Started: Reading telemetry and handshake problem logs

### Initial Analysis from logs/20250523/0017-modelswitch-log.md and 0045-handshake-problem.md

**Key Issue Identified**: Consumer is successfully creating kind 5050 events and publishing them, but **only subscribing to event kinds 6000+** instead of listening for 5050 responses.

From the telemetry in 0045-handshake-problem.md:
- Line 373: `nip90_job_request_published` - Job request published with Kind: 5050
- Line 375: `nostr_sub_created` - Subscription created with filters: `[{"kinds":[6000,6001,6002,6003,6004,600...]}`

**Problem**: We're publishing 5050 requests but only listening for 6000+ responses. Missing subscription to kind 5050 responses from DVMs.

## Analysis of Current NIP90 Implementation

### Key Files Analyzed:
1. `NIP90ServiceImpl.ts:638-653` - `subscribeToJobUpdates` method
2. `NIP90AgentLanguageModelLive.ts:198-230` - Streaming implementation
3. DVM specification from data-vending-machines.org

### Current Subscription Pattern (CORRECT):
- `resultFilter.kinds: Array.from({length: 1000}, (_, i) => 6000 + i)` - Result events (6000-6999)
- `feedbackFilter.kinds: [7000]` - Feedback events

### Key Discovery:
According to NIP-90 spec, **5050 is a REQUEST kind, not a response kind**. The proper flow is:
1. Consumer sends **kind 5050** request (what we're doing correctly)
2. DVM responds with **kind 6050** result (what we're listening for correctly)
3. DVM can send **kind 7000** feedback (what we're listening for correctly)

**The issue is NOT the subscription kinds - they are correct.**

## Deep Investigation: Subscription Filter Analysis

Looking at the telemetry, I need to identify the real problem. Let me examine the exact subscription being created:

From line 375: `nostr_sub_created` with filters: `[{"kinds":[6000,6001,6002,6003,6004,600...]}`

### Potential Issues to Investigate:
1. **DVM Public Key Filter**: Are we filtering by the correct DVM author?
2. **Event Reference Filter**: Are we using the correct `#e` tag to reference our job request?
3. **Relay Coverage**: Is the DVM publishing to the same relays we're subscribed to?
4. **Missing 5050 in Response Chain**: Does the DVM know how to respond to our specific 5050 request?

### Next Steps:
- Check the exact subscription filters being created
- Verify DVM configuration (public key, relays)
- Test if DVM is online and responding to any requests

## CRITICAL DISCOVERY: Root Cause Found

**The issue is the placeholder DVM public key!**

In `ConfigurationServiceImpl.ts:113`:
```typescript
yield* _(configService.set("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY", "YOUR_DEVSTRAL_DVM_PUBKEY_HEX"));
```

From the telemetry logs line 19 and 478:
```
[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('YOUR_DEVSTRAL_DVM_PUBKEY_HEX'). Sending unencrypted request.
```

### The Real Problem:
1. We're using a **placeholder DVM public key** `"YOUR_DEVSTRAL_DVM_PUBKEY_HEX"`
2. This means our subscription filter `authors: [dvmPubkeyHex]` is filtering for events from a non-existent DVM
3. No real DVM has this public key, so we'll never receive responses
4. We need to update the configuration with a **real DVM public key**

### Solution:
Replace the placeholder with an actual working DVM public key that provides text generation services.

## Research: Finding Working DVM Public Keys

### From Web Search Results:
- NIP-90 DVMs are actively developed for 2024-2025
- Example shows using nak's default pubkey: `79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798`
- DVMs advertise capabilities via kind 31990 events
- They specify their own relay selections

### Current Status:
The codebase is correctly implementing NIP-90 protocol, but using placeholder configuration. We need either:
1. A real working DVM public key 
2. Or remove the author filter to listen for ANY DVM responses to our requests

## Implementation Options

### Option 1: Remove Author Filter (Recommended for Testing)
Modify the subscription to not filter by specific DVM author, allowing any DVM to respond:

```typescript
const resultFilter: NostrFilter = {
  kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i),
  "#e": [jobRequestEventId],
  // Remove: authors: [dvmPubkeyHex], 
};
```

### Option 2: Use Known Working DVM
Replace placeholder with real DVM public key (requires finding active DVM)

## IMPLEMENTATION: Fix Applied

### Changes Made to `NIP90ServiceImpl.ts`:

1. **Line 643**: Commented out author filter in `subscribeToJobUpdates` result filter
2. **Line 650**: Commented out author filter in `subscribeToJobUpdates` feedback filter  
3. **Line 305-307**: Commented out author filter in `getJobResult`
4. **Line 477-479**: Commented out author filter in `listJobFeedback`

### Rationale:
- **Root Cause**: Placeholder DVM pubkey `"YOUR_DEVSTRAL_DVM_PUBKEY_HEX"` was filtering out all real DVM responses
- **Fix**: Remove author filter temporarily to allow ANY DVM on the network to respond to our requests
- **Security**: Still filtering by event reference (`"#e": [jobRequestEventId]`) so only responses to our specific requests are received
- **Next Step**: Later replace with real working DVM public key and restore author filters

### Expected Result:
- NIP90 text generation requests should now receive responses from any DVM on the network
- Should see kind 6050 result events in telemetry instead of timeout
- Streaming should work with incremental responses

## VERIFICATION: Build and Tests Pass

### TypeScript Compilation: ✅ PASSED
```bash
pnpm run t
> tsc --noEmit
```
No TypeScript errors.

### Test Suite: ✅ PASSED  
```bash
pnpm test
Test Files  35 passed | 7 skipped (42)
Tests  257 passed | 14 skipped (271)
```

All tests passing - no regressions introduced.

## FIX SUMMARY

**Root Cause**: Placeholder DVM public key `"YOUR_DEVSTRAL_DVM_PUBKEY_HEX"` was filtering out all real DVM responses.

**Solution**: Temporarily removed author filters from all NIP90 subscription methods to allow ANY DVM to respond to our requests while maintaining security through event reference filtering (`#e` tag).

**Files Modified**: 
- `src/services/nip90/NIP90ServiceImpl.ts` (4 locations)

**Result**: NIP90 text generation should now work with any online DVM on the network. The issue was NOT with event kind 5050 listening - the codebase correctly implements NIP-90 protocol. The problem was overly restrictive author filtering with invalid DVM pubkey.

**Next Steps**: In production, replace placeholder configuration with real working DVM public keys and restore author filters for security.
