# NIP-90: Data Vending Machines in Commander

## Overview

Commander implements [NIP-90](https://github.com/nostr-protocol/nips/blob/master/90.md), which defines the Data Vending Machine (DVM) protocol for Nostr. This protocol enables clients to request data processing services from specialized nodes and pay for them using Lightning Network.

## Implementation Details

### Service Architecture

Our implementation follows a clean separation of concerns:

1. **NostrService**: Core Nostr relay communication
   - Relay connections
   - Basic pub/sub operations
   - Event publishing

2. **NIP90Service**: NIP-90 specific functionality
   - Creating and managing NIP-90 job requests
   - Processing results and feedback
   - Encrypting/decrypting content

3. **Kind5050DVMService**: Our specific DVM implementation
   - Listens for job requests matching supported kinds
   - Processes requests through Ollama
   - Handles Lightning Network payments via Spark

### Flow

1. Client creates a NIP-90 job request (kind 5000-5999)
2. DVM listens for requests with its public key in the 'p' tag
3. DVM responds with payment-required event
4. Client pays invoice via Lightning
5. DVM processes job and publishes result (kind 6000-6999)
6. Client optionally provides feedback (kind 7000)

## Usage

### Creating a Job Request

```typescript
// First get the NIP90Service
const nip90Service = getMainRuntime().context.get(NIP90Service);

// Create parameters for the job
const jobParams: CreateNIP90JobParams = {
  prompt: "Generate a description of Nostr",
  inputType: "text",
  outputFormat: "text/plain", 
  dvmPublicKey: "dvm_pubkey_hex",
};

// Create and send the job request
const result = await Effect.runPromise(
  nip90Service.createJob(jobParams)
);
```

### Listing Public NIP-90 Events

```typescript
// Get recent NIP-90 events from connected relays
const events = await Effect.runPromise(
  nip90Service.listPublicEvents(50) // Get last 50 events
);
```

### Running as a DVM

```typescript
// Get the DVM service
const dvmService = getMainRuntime().context.get(Kind5050DVMService);

// Start listening for job requests
await Effect.runPromise(
  dvmService.startListening()
);
```

## Testing

Tests for NIP-90 functionality are available in:
- `src/tests/unit/services/nip90/NIP90Service.test.ts`
- `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
- `src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx`

## References

- [NIP-90 Specification](https://github.com/nostr-protocol/nips/blob/master/90.md)
- [DVM Implementation Guide](https://github.com/nostr-protocol/nips/blob/master/90.md#dvm-implementation-guide)