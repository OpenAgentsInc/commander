# NIP90 Implementation TODOs

**Date**: 2025-05-23  
**Context**: Consumer appears to receive a decryption error response, but provider telemetry shows no events received  

## CRITICAL DISCOVERIES

### 1. Decryption Error Message NOT in Our Codebase
- **Searched for**: "I can't decrypt this message without the correct private key"
- **Result**: NOT FOUND in any .ts, .tsx, or .js files
- **Implication**: This is likely an ACTUAL DVM response from somewhere on the network!

### 2. Provider Telemetry Shows NO Events
- **Provider Logs (0109-telemetry-provider.md)**: 
  - Line 85-86: Successfully subscribed to kinds [5050, 5100] with p-tag filter
  - Line 92-93: EOSE received (End of Stored Events)
  - **NO event reception telemetry between subscription and EOSE**
- **Consumer Logs (0120-telemetry-decryptwat.md)**:
  - Line 66-67: Received response with decryption error message
  - Event ID: `7997c8085b5eb93e85f19a8096fa1f487460ecabbec67e95c3e2355a5c02a534`

### 3. Configuration Now Correct
- **Line 56 in consumer log**: Shows correct DVM pubkey `74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e`
- **P-tag should be working** based on configuration

## Critical Issues to Investigate

### 1. Provider Not Receiving Events
- **Evidence**: Provider telemetry shows NO incoming events despite being subscribed with correct filters
- **TODO**: Add more verbose logging to provider's event handler to confirm if ANY events are hitting the subscription
- **TODO**: Use a Nostr client to manually check if event `7997c8085b5eb93e85f19a8096fa1f487460ecabbec67e95c3e2355a5c02a534` exists on the shared relays

### 2. Source of Decryption Error Message
- **TODO**: Search codebase for the exact string: "I can't decrypt this message without the correct private key"
- **TODO**: Check if this is a hardcoded error message in our client code
- **TODO**: Verify if this is actually coming from a DVM response or generated locally

### 3. NIP-04 Encryption Implementation

#### Check NIP-90 Specification for NIP-04 Usage
According to NIP-90 (Section: Encrypted Params):
- Encrypted requests use NIP-04 encryption
- Uses customer's private key + service provider's public key for shared secret
- Encrypted content goes in the `content` field
- Must include `["encrypted"]` tag
- Must include `["p", "<service-provider-pubkey>"]` tag

#### Our Implementation Review
- **TODO**: Check `src/helpers/nip90/event_creation.ts`:
  - Is it properly using NIP04Service for encryption?
  - Is it including the `["encrypted"]` tag when encrypting?
  - Is the p-tag being included correctly?

- **TODO**: Check `src/services/nip04/NIP04Service.ts`:
  - Verify encrypt/decrypt methods match NIP-04 spec
  - Check if we're using the correct key derivation

- **TODO**: Review test files:
  - `src/tests/unit/helpers/nip90/event_creation.test.ts`
  - `src/tests/unit/services/nip04/NIP04Service.test.ts`
  - Verify tests cover encrypted job request creation

### 4. Configuration Issues
- **Current Config (from ConfigurationServiceImpl.ts)**:
  ```typescript
  AI_PROVIDER_DEVSTRAL_DVM_PUBKEY: "74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e"
  AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION: "true"
  AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS: "true"
  ```
- **TODO**: Test with encryption disabled:
  ```typescript
  AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION: "false"
  AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS: "false"
  ```
- **TODO**: Verify if DVM actually supports/requires encryption

### 5. Possible Explanations for the Discrepancy
1. **Another DVM is responding**: There might be another DVM on the network that:
   - Listens for ALL kind 5050 events (no p-tag filter)
   - Saw our encrypted request and responded with the decryption error
   - This DVM is NOT the one we're monitoring in provider telemetry

2. **Relay-side response**: Some relays might generate error responses for malformed events

3. **Our provider isn't seeing p-tagged events**: Despite correct configuration, the filter might not be working as expected

### 5. Event Publishing Verification
- **TODO**: Add telemetry after publishing to verify event was actually stored on relays
- **TODO**: Implement a "fetch own event" check to confirm publication success
- **TODO**: Check if the 1 successful relay (from "1 succeeded, 2 failed") is actually one of the shared relays

## Code Connection Points to Verify

### NIP-04 Integration in NIP-90
1. **event_creation.ts**:
   - Check `createNip90JobRequest` function
   - Verify it calls NIP04Service.encrypt when `targetDvmPkHexForEncryption` is provided
   - Ensure proper tag structure for encrypted events

2. **NIP90AgentLanguageModelLive.ts**:
   - Check how it handles encryption configuration
   - Verify ephemeral key generation if enabled

3. **NIP90ServiceImpl.ts**:
   - Check `subscribeToJobUpdates` for decryption handling
   - Verify it attempts to decrypt responses when `["encrypted"]` tag is present

## Test Plan

1. **Immediate**: Disable encryption and test if provider receives unencrypted events
2. **Debug**: Add console.log in provider's event handler to confirm reception
3. **Verify**: Use external Nostr client to check event propagation
4. **Fix**: Based on findings, either:
   - Fix p-tag/filter mismatch if events aren't reaching provider
   - Fix encryption implementation if that's the issue
   - Update configuration if DVM doesn't support encryption

## Current NIP-04 Implementation Status

### Our Implementation CORRECTLY Follows NIP-90 Spec:

1. **event_creation.ts Analysis (Lines 58-92)**:
   ```typescript
   // When targetDvmPkHexForEncryption is valid (64 chars):
   - Calls nip04Service.encrypt(requesterSk, targetDvmPkHexForEncryption, stringifiedParams)
   - Adds ["p", targetDvmPkHexForEncryption] tag
   - Adds ["encrypted"] tag
   - Sets encrypted content as event content
   
   // When encryption key invalid/missing:
   - Sends unencrypted (stringifiedParams as content)
   - Still adds p-tag if targetDvmPkHexForPTag provided
   - Logs warning about invalid encryption key
   ```

2. **Test Coverage Confirms Proper Implementation**:
   - `event_creation.test.ts` verifies encrypted event creation
   - Confirms ["encrypted"] tag is added
   - Confirms p-tag is included
   - Confirms input data is NOT in plaintext tags when encrypted

### Key Code Flow for Encrypted Requests:

1. **NIP90AgentLanguageModelLive.ts** → creates job request with ephemeral keys
2. **NIP90ServiceImpl.ts** → calls createNip90JobRequest with encryption params
3. **event_creation.ts** → uses NIP04Service to encrypt, adds proper tags
4. **NostrService** → publishes encrypted event to relays

## Expected Outcomes

After implementing these TODOs:
1. **Identify the Mystery DVM**: Find out which DVM is actually responding with the decryption error
2. **Fix Provider Reception**: Ensure our monitored provider receives p-tagged events
3. **Test Unencrypted Flow**: Verify basic communication works without encryption
4. **Debug Encryption**: If needed, fix ephemeral key usage or encryption targeting

## Next Session Starting Point

1. **First Priority**: Use a Nostr client to fetch event `7997c8085b5eb93e85f19a8096fa1f487460ecabbec67e95c3e2355a5c02a534` and see:
   - What relays it's on
   - Its exact structure (tags, content)
   - Any responses linked to it

2. **Second Priority**: Disable encryption in config and test if provider receives unencrypted events

3. **Third Priority**: Add debug logging to provider's subscription handler to see ALL events, not just matching ones