# NIP90 Consumer-Provider Communication Analysis

**Date**: 2025-05-23  
**Issue**: Consumer successfully publishes job requests but provider shows no indication of receiving them  
**Evidence**: Two telemetry logs from consumer and provider sides  

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The consumer is NOT p-tagging the provider in the job request. The provider is filtering for events with `#p` tag containing its pubkey, but the consumer is using a placeholder DVM pubkey and likely not including the correct p-tag at all.

## Root Cause Analysis

### The Real Problem: P-Tag Filtering

According to NIP-01 and NIP-90:
- **NIP-90**: Job requests MAY include `["p", "<service-provider-pubkey>"]` tags to indicate which providers the customer is interested in
- **NIP-01**: Relays can filter events by tags using `#p` filters
- **Provider's Filter**: `{"kinds":[5050,5100],"#p":["74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e"]}`

The provider is **ONLY** listening for events that have a p-tag with their specific pubkey!

### Evidence from Telemetry

#### Consumer Side Issues:
1. **Line 51**: `[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('YOUR_DEVSTRAL_DVM_PUBKEY_HEX'). Sending unencrypted request.`
   - Consumer is using placeholder pubkey `"YOUR_DEVSTRAL_DVM_PUBKEY_HEX"`
   - This means the consumer likely isn't p-tagging the real provider

2. **Consumer publishes successfully** to relays but without proper p-tag
3. **Event ID**: `884d2101750e7f3653d8b30542af3fb0ede91b02abc81e137c8029565b8e78e3`

#### Provider Side Subscription:
```json
{
  "filters": [{
    "kinds": [5050, 5100],
    "#p": ["74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e"]
  }]
}
```

**The provider will NEVER see events that don't have this specific p-tag!**

### Why Relay Analysis Was Wrong

I initially focused on relay mismatch, but this was incorrect because:
1. Both consumer and provider share 3 relays: `relay.damus.io`, `relay.nostr.band`, `nos.lol`
2. Consumer successfully published to "3 succeeded" - likely these shared relays
3. Events ARE on the shared relays, but provider's filter excludes them

## Technical Flow

### What's Happening:
1. Consumer creates job request (kind 5050)
2. Consumer uses placeholder DVM pubkey: `"YOUR_DEVSTRAL_DVM_PUBKEY_HEX"`
3. Consumer likely creates event WITHOUT p-tag (or with wrong p-tag)
4. Event publishes successfully to relays
5. Provider subscribes with filter requiring `#p` tag = `74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e`
6. **Event doesn't match filter** → Provider never sees it

### What Should Happen:
1. Consumer should p-tag the provider's real pubkey in the job request
2. Event structure should include: `["p", "74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e"]`
3. Provider's filter would then match and receive the event

## Solutions

### Immediate Fix: Update Consumer Configuration

```typescript
// Replace placeholder with real provider pubkey
AI_PROVIDER_DEVSTRAL_DVM_PUBKEY = "74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e"
```

### Code Fix Required: Event Creation

Check `event_creation.ts` to ensure the p-tag is properly included:
```typescript
// Job request should include p-tag
tags: [
  ["p", targetDvmPubkeyHex], // This MUST be the real provider pubkey
  ["i", input, "text"],
  ["output", "text/plain"],
  // ... other tags
]
```

### Alternative Solution: Provider Filter Adjustment

Provider could listen WITHOUT p-tag filter to catch all kind 5050 events:
```json
{
  "filters": [{
    "kinds": [5050, 5100]
    // Remove: "#p": ["..."]
  }]
}
```
But this is less efficient and not recommended for production.

## Verification Steps

1. **Check Event Structure**: Use a Nostr client to fetch event `884d2101750e7f3653d8b30542af3fb0ede91b02abc81e137c8029565b8e78e3` and verify if it has p-tags
2. **Update Configuration**: Replace placeholder DVM pubkey with real provider pubkey
3. **Test Again**: Send new job request and check if provider receives it

## Conclusion

The NIP90 implementation is correct on both sides, but the consumer is misconfigured. The provider's p-tag filter is working as designed - it's only listening for events specifically targeted to it. The consumer needs to:

1. Use the real provider pubkey instead of placeholder
2. Ensure job requests include proper p-tag
3. Target the specific DVM it wants to use

This is NOT a relay issue - it's a targeting/filtering issue. The events are on the network but invisible to the provider due to filter mismatch.