# TypeScript Test Errors Guide

## Overview

This guide helps future coding agents understand and fix the recurring TypeScript errors in the test suite, particularly around Effect.js service dependencies.

## Common Test Errors

### 1. TelemetryService Type Errors in Tests

**Error Pattern:**
```typescript
error TS2345: Argument of type 'Effect<void, never, TelemetryService>' is not assignable to parameter of type 'Effect<void, never, never>'.
  Type 'TelemetryService' is not assignable to type 'never'.
```

**Root Cause:**
Tests are not providing the TelemetryService dependency when running Effects that require it.

**Fix:**
Add TelemetryService to the test layer or provide it when running the Effect:

```typescript
// Option 1: Add to test layer
const testLayer = Layer.mergeAll(
  TelemetryServiceLive,
  // ... other services
);

// Option 2: Provide when running Effect
await Effect.runPromise(
  someEffect.pipe(
    Effect.provide(TelemetryServiceLive)
  )
);
```

### 2. SparkServiceConfig Dependency Errors

**Error Pattern:**
```typescript
Type 'TelemetryService | SparkServiceConfig' is not assignable to type 'never'.
```

**Root Cause:**
The SparkService requires configuration that isn't being provided in tests.

**Fix:**
Provide SparkServiceConfig or use the mock implementation:

```typescript
// For tests that don't need real Spark functionality
const testLayer = Layer.mergeAll(
  SparkServiceMockLive,
  TelemetryServiceLive
);

// For tests that need real Spark
const testLayer = Layer.mergeAll(
  SparkServiceLive,
  SparkServiceConfigLive,
  TelemetryServiceLive
);
```

### 3. ECC Library Errors

**Error Pattern:**
```typescript
Error: ecc library invalid
```

**Root Cause:**
The bitcoinjs-lib library needs the ECC (Elliptic Curve Cryptography) library to be initialized before use.

**Fix:**
Initialize the ECC library in test setup:

```typescript
// In test setup or beforeAll
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';

beforeAll(() => {
  initEccLib(ecc);
});
```

## Architecture Insights

### Effect.js Service Dependencies

The codebase uses Effect.js for dependency injection. Key services include:

1. **TelemetryService** - Required by almost all services for logging
2. **NostrService** - Depends on NostrServiceConfig, TelemetryService, NIP13Service
3. **NIP90Service** - Depends on NostrService, NIP04Service, TelemetryService
4. **SparkService** - Depends on SparkServiceConfig, TelemetryService
5. **ConfigurationService** - Core service for app configuration

### Service Layer Composition

When creating test layers, dependencies must be provided in the correct order:

```typescript
// Correct order (dependencies first)
const testLayer = Layer.mergeAll(
  ConfigurationServiceLive,     // No dependencies
  TelemetryServiceLive,         // Depends on ConfigurationService
  NIP13ServiceLive,             // Depends on TelemetryService
  NostrServiceConfigLive,       // Configuration layer
  NostrServiceLive,             // Depends on all above
  NIP04ServiceLive,             // Depends on TelemetryService
  NIP90ServiceLive              // Depends on Nostr, NIP04, Telemetry
);
```

### Mock vs Live Services

For unit tests, prefer mock services to avoid external dependencies:

- `SparkServiceMockLive` - Simulates wallet without real Bitcoin operations
- `TelemetryServiceTestLive` - Collects telemetry in memory for assertions
- `NostrServiceMockLive` - Simulates Nostr relay connections

For integration tests, use live services but provide test configurations.

## Test File Patterns

### Unit Test Pattern

```typescript
describe('MyService', () => {
  it('should do something', async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.someMethod();
    });

    const testLayer = Layer.mergeAll(
      // Add all required service dependencies
      TelemetryServiceLive,
      ConfigurationServiceLive,
      MyServiceLive
    );

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toBe(expected);
  });
});
```

### Integration Test Pattern

```typescript
describe('Integration Test', () => {
  let runtime: Runtime.Runtime<MyService | TelemetryService>;

  beforeAll(async () => {
    const layer = Layer.mergeAll(
      ConfigurationServiceLive,
      TelemetryServiceLive,
      // ... other dependencies
      MyServiceLive
    );

    runtime = await Effect.runPromise(
      Layer.toRuntime(layer)
    );
  });

  afterAll(async () => {
    await Effect.runPromise(
      Runtime.dispose(runtime)
    );
  });

  it('should integrate correctly', async () => {
    const result = await Effect.runPromise(
      myEffect.pipe(Effect.provide(runtime))
    );
    
    expect(result).toBeDefined();
  });
});
```

## Common Mistakes to Avoid

1. **Missing Dependencies**: Always check what services an Effect requires
2. **Wrong Dependency Order**: Dependencies must be provided before dependents
3. **Using Live Services in Unit Tests**: Prefer mocks for isolation
4. **Not Disposing Runtimes**: Always dispose of runtimes in afterAll
5. **Forgetting ECC Initialization**: Required for any Bitcoin-related operations

## Debugging Tips

1. **Check Effect Requirements**: Look at the service's Effect.gen function to see what it yields
2. **Use Effect.provideSomeLayer**: To provide only missing dependencies
3. **Enable Debug Logging**: Set environment variable `DEBUG=effect:*`
4. **Check Service Construction**: Ensure all services are properly constructed in their Live implementations

## Quick Reference

### Essential Test Imports

```typescript
import { Effect, Layer, Runtime } from "effect";
import { TelemetryServiceLive } from "@/services/telemetry";
import { ConfigurationServiceLive } from "@/services/configuration";
import * as ecc from 'tiny-secp256k1';
import { initEccLib } from 'bitcoinjs-lib';
```

### Minimal Test Layer

```typescript
const minimalTestLayer = Layer.mergeAll(
  ConfigurationServiceLive,
  TelemetryServiceLive
);
```

### Full Test Layer (with all services)

```typescript
const fullTestLayer = Layer.mergeAll(
  ConfigurationServiceLive,
  TelemetryServiceLive,
  BIP39ServiceLive,
  BIP32ServiceLive,
  NIP13ServiceLive,
  NIP04ServiceLive,
  NIP19ServiceLive,
  NostrServiceConfigLive,
  NostrServiceLive,
  NIP28ServiceLive,
  NIP90ServiceLive,
  SparkServiceMockLive
);
```

## Final Notes

The test errors are primarily about missing service dependencies. The Effect.js architecture requires explicit dependency injection, which is powerful but requires careful attention to service composition. When in doubt, check what services an Effect yields from and ensure all are provided in the test layer.