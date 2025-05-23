# NIP-13 Proof of Work Implementation Plan

## Overview
Implement NIP-13 (Proof of Work) support to allow events to be published to relays that require PoW, such as relay.damus.io and relay.nostr.band which require 28-bit difficulty.

## Implementation Tasks

### 1. Create NIP13Service Interface and Implementation
- `src/services/nip13/NIP13Service.ts` - Service interface
- `src/services/nip13/NIP13ServiceImpl.ts` - Implementation
- `src/services/nip13/index.ts` - Exports

#### Interface Methods:
- `mineEvent(event: NostrEvent, targetDifficulty: number): Effect<MinedEvent, NIP13Error>`
- `calculateDifficulty(eventId: string): number`
- `validatePoW(event: NostrEvent, requiredDifficulty: number): boolean`
- `addNonceTag(event: NostrEvent, targetDifficulty: number): NostrEvent`

### 2. Core Mining Logic
- Implement the counting leading zeroes algorithm from the spec
- Add nonce tag to events: `["nonce", "<nonce_value>", "<target_difficulty>"]`
- Recalculate event ID after each nonce increment
- Update created_at timestamp periodically during mining

### 3. Integration Points
- Update NostrService to use NIP13Service before publishing events
- Add configuration for:
  - Whether to enable PoW
  - Default difficulty levels per relay
  - Mining timeout/max iterations
  - Whether to delegate PoW (future enhancement)

### 4. Testing
- Unit tests for:
  - Difficulty calculation
  - Mining algorithm
  - Event validation
- Integration tests with actual relay requirements

### 5. Performance Considerations
- Mining should be done in a Web Worker to avoid blocking UI
- Add progress callbacks for long-running mining operations
- Implement cancellation support

## File Structure
```
src/services/nip13/
├── NIP13Service.ts          # Interface definition
├── NIP13ServiceImpl.ts      # Implementation
├── NIP13ServiceError.ts     # Error types
└── index.ts                 # Exports

src/tests/unit/services/nip13/
├── NIP13Service.test.ts     # Unit tests
└── difficulty.test.ts       # Difficulty calculation tests
```

## Implementation Order
1. Create service interface and error types
2. Implement difficulty calculation
3. Implement basic mining algorithm
4. Add service to runtime
5. Integrate with NostrService
6. Add tests
7. Update relay configurations with PoW requirements