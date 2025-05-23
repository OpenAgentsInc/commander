# Why Random DVMs Are Responding - NIP-90 Protocol Analysis

**Date**: 2025-05-23  
**Issue**: Random DVMs responding to our job requests despite p-tagging

## The Fundamental Issue

You're absolutely right to be concerned! Here's what's happening:

### NIP-90 Protocol Design

According to NIP-90 specification:
- Job requests (kind 5000-5999) are **public events** on the Nostr network
- The `p` tag is a **hint/preference**, not access control
- ANY DVM can choose to process ANY job request they see

From NIP-90 docs:
> `p`: Service Providers the customer is interested in. Other SPs MIGHT still choose to process the job

### Current Behavior

1. **We ARE p-tagging correctly**:
   - Line 221 in NIP90ServiceImpl.ts adds p-tag with target DVM pubkey
   - Line 73 in event_creation.ts confirms p-tag is added when encrypted

2. **But p-tags don't prevent other DVMs**:
   - P-tags are just "preferred providers"
   - Any DVM can ignore the p-tag and respond anyway
   - This is by design for marketplace competition

3. **Our encryption makes it worse**:
   - We encrypt the job content
   - Random DVMs see encrypted content
   - They can't decrypt it (different keys)
   - They respond with "I can't decrypt this message"

## The Real Problem

**NIP-90 doesn't provide private job requests!** The protocol is designed for:
- Open marketplace where DVMs compete
- Customers can hint preferences with p-tags
- But can't prevent other DVMs from trying

## Solutions

### Option 1: Accept the Protocol Design
- Ignore responses from unknown DVMs
- Filter responses by DVM pubkey on client side
- Only process responses from our preferred DVM

### Option 2: Use Encryption as Access Control
- Keep using encryption (current approach)
- Random DVMs can't process encrypted requests
- But we'll keep getting "can't decrypt" errors

### Option 3: Direct Communication (Not NIP-90)
- Use NIP-04 encrypted DMs directly to DVM
- Bypass NIP-90 public job request system
- Lose marketplace benefits but gain privacy

### Option 4: Custom Protocol Extension
- Define a new kind for "private job requests"
- Only compatible DVMs would respect it
- Not standard NIP-90 anymore

## Recommended Fix

Since we're already using encryption, the immediate fix is to:

1. **Filter responses by pubkey**:
```typescript
// In subscribeToJobUpdates callback
if (eventUpdate.pubkey !== dvmConfig.dvmPubkey) {
  // Ignore responses from other DVMs
  return;
}
```

2. **Remove author filter comments** in NIP90ServiceImpl.ts:
```typescript
// Lines 644-653: Re-enable author filter
authors: [dvmPubkeyHex], // Only listen to our DVM's responses
```

This way:
- Job requests are still public (per protocol)
- But we only process responses from our chosen DVM
- Random DVMs can try to respond but we ignore them

## Why This Happened

The previous developer commented out author filters thinking it would help, but actually made it worse by accepting responses from ANY DVM. The correct approach is to:
1. Send p-tagged requests (we do)
2. Only accept responses from that specific DVM (we don't currently)

The "can't decrypt" message is actually helpful - it shows other DVMs are trying to serve us but can't because we encrypted for a specific provider!