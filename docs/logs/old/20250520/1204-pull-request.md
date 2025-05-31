# Add NIP-90 Data Vending Machine Service Layer

## Summary

This PR implements a complete NIP-90 Data Vending Machine (DVM) service layer with proper Effect-TS integration and type-safety. It enables encrypted job requests, result handling, and feedback management following the NIP-90 specification.

## Features

- New `NIP90Service` interface for creating job requests, retrieving results, and handling feedback
- Comprehensive schema validation with Effect-TS Schema
- Proper error typing and handling for all operations
- Secure request encryption using NIP-04
- Correct Effect-TS dependency injection pattern with `R = never`
- Full test coverage with mocked dependencies

## Implementation Details

1. **Service Layer Structure**

   - Created `NIP90Service` interface with clearly typed methods
   - Implemented `NIP90ServiceLive` with proper dependency injection
   - All methods use Effect-TS for proper error handling and context management

2. **Schema & Type Definitions**

   - Created typed schemas for job requests, results, and feedback events
   - Properly modeled optional parameters and variant fields
   - Full type-safety for all service operations

3. **Encryption & Security**

   - Implemented encrypted job requests using the NIP-04 standard
   - Proper key management for request/response encryption
   - Secure parsing and handling of encrypted content

4. **Test Coverage**

   - Unit tests for all service methods
   - Mock layers for NostrService, NIP04Service, and TelemetryService
   - Testing both success and error paths

5. **UI Integration**
   - Form component for creating NIP-90 job requests
   - Event list for viewing job requests and results
   - Local storage for preserving ephemeral keys for decryption

## Architectural Patterns

- Proper use of Effect-TS `Schema` for runtime validation
- Correct modeling of Effect context requirements (`R = never` pattern)
- Service implementations properly manage internal dependencies
- Consistent error handling and telemetry throughout
- Type-safe tuple handling for complex data structures

## Technical Challenges Solved

- Fixed Effect-TS context typing issues with Schema.Tuple usage
- Correctly handled dependency injection for helper functions
- Proper error propagation through Effect-TS channels
- Ensured type safety with complex tuple structures
- Structured error handling for validation, encryption, and API failures

## Testing

All unit tests pass, verifying:

- Request creation and validation
- Result retrieval and parsing
- Feedback handling
- Error cases (validation, encryption, network)
- FiberFailure wrapping in Effect-TS

## Next Steps

- Add result polling/subscription mechanism for long-running jobs
- Implement custom status display for different feedback states
- Add support for multi-input jobs with different input types
