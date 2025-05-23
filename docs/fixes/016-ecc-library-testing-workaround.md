# Fix: ECC Library Testing Workaround Pattern

## Problem

When testing services that depend on cryptocurrency libraries (bitcoin/ECC), tests fail with cryptographic library initialization errors in Node.js environments.

### Error Messages
```
Error: ecc library invalid
```
```
Cannot read properties of undefined (reading 'bip32')
```
```
Module not found: Can't resolve 'secp256k1'
```

### Common Scenarios
This issue occurs when:
1. Testing services that use Bitcoin/Lightning Network libraries
2. Running unit tests with cryptocurrency SDK dependencies  
3. CI/CD environments without native cryptographic library support
4. Docker containers missing native binary dependencies

## Root Cause

Cryptocurrency libraries like `@spark-sdk/core`, `bitcoinjs-lib`, and `secp256k1` require:
1. **Native binary dependencies** that may not be available in test environments
2. **Platform-specific compilation** during npm install
3. **Runtime initialization** of cryptographic contexts that fail in isolated test environments
4. **WebAssembly or native extensions** that don't work reliably in Node.js test runners

The core issue is that these libraries are designed for production runtime environments, not isolated unit testing.

## Solution: Mock Service Implementation Pattern

Create complete mock implementations of services with cryptocurrency dependencies that provide the same interface without ECC library requirements.

### Step 1: Identify the Service Interface

```typescript
// Original service interface (example)
export interface SparkService {
  createLightningInvoice(params: CreateLightningInvoiceParams): Effect.Effect<LightningInvoice, SparkLightningError>;
  payLightningInvoice(params: PayLightningInvoiceParams): Effect.Effect<LightningPayment, SparkLightningError>;
  getBalance(): Effect.Effect<BalanceInfo, SparkBalanceError>;
  getSingleUseDepositAddress(): Effect.Effect<string, SparkConnectionError>;
  checkWalletStatus(): Effect.Effect<boolean, SparkConnectionError>;
  checkInvoiceStatus(invoiceBolt11: string): Effect.Effect<{status: string, amountPaidMsats?: number}, SparkValidationError>;
}
```

### Step 2: Create Mock Implementation

```typescript
// src/services/spark/SparkServiceTestImpl.ts
import { Context, Effect, Layer } from "effect";
import { SparkService, SparkServiceConfig, SparkServiceConfigTag } from "./SparkService";

export const SparkServiceTestLive = Layer.effect(
  SparkService,
  Effect.gen(function* (_) {
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);

    return SparkService.of({
      createLightningInvoice: (params: CreateLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Mock invoice creation - no real cryptography
          const mockInvoice: LightningInvoice = {
            invoice: {
              encodedInvoice: `lnbc${params.amountSats}n1mock_invoice_${Date.now()}`,
              paymentHash: `mock_hash_${Date.now()}`,
              amountSats: params.amountSats,
              createdAt: Date.now(),
              expiresAt: Date.now() + (params.expirySeconds || 3600) * 1000,
              memo: params.memo,
            }
          };

          yield* _(telemetry.trackEvent({
            category: "spark:lightning",
            action: "create_invoice_success",
            value: String(params.amountSats),
          }));

          return mockInvoice;
        }),

      payLightningInvoice: (params: PayLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Mock payment processing with conditional behavior for testing
          if (params.invoice.includes("fail")) {
            return yield* _(Effect.fail(
              new SparkLightningError({
                message: "Mock payment failed for testing",
                context: { invoice: params.invoice },
              })
            ));
          }

          // Successful mock payment
          const mockPayment: LightningPayment = {
            payment: {
              id: `mock_payment_${Date.now()}`,
              paymentHash: `mock_hash_${Date.now()}`,
              amountSats: 1000,
              feeSats: 10,
              createdAt: Date.now(),
              status: "SUCCESS",
              destination: "mock_destination",
            }
          };

          return mockPayment;
        }),

      getBalance: () =>
        Effect.succeed({
          balance: BigInt(100000), // 100k sats
          tokenBalances: new Map()
        }),

      // ... other methods with mock implementations
    });
  })
);
```

### Step 3: Create Test Configuration Layer

```typescript
// Test configuration that doesn't cause ECC issues
export const TestSparkServiceConfigLayer = Layer.succeed(
  SparkServiceConfigTag,
  {
    network: "REGTEST",
    mnemonicOrSeed: "test test test test test test test test test test test junk",
    accountNumber: 2,
    sparkSdkOptions: {
      grpcUrl: "http://localhost:8080",
      authToken: "test_token",
    },
  } satisfies SparkServiceConfig
);
```

### Step 4: Create Test Runtime

```typescript
// src/tests/helpers/test-runtime.ts
import { Layer } from "effect";
import { SparkServiceTestLive, TestSparkServiceConfigLayer } from "@/services/spark/SparkServiceTestImpl";

// Test runtime without ECC dependencies
export const TestRuntime = Layer.mergeAll(
  TelemetryServiceLive,
  ConfigurationServiceLive,
  TestSparkServiceConfigLayer,
  SparkServiceTestLive
  // ... other services
);

// Helper for creating minimal test layers
export const createMinimalTestLayer = () =>
  Layer.merge(
    TelemetryServiceLive,
    SparkServiceTestLive.pipe(
      Layer.provide(TestSparkServiceConfigLayer)
    )
  );
```

### Step 5: Use in Tests

```typescript
// Test file using mock service
import { TestRuntime } from "@/tests/helpers/test-runtime";

describe("Service Integration Tests", () => {
  it("should process Lightning payments without ECC library", async () => {
    const result = await Effect.gen(function* (_) {
      const sparkService = yield* _(SparkService);
      
      const invoice = yield* _(sparkService.createLightningInvoice({
        amountSats: 1000,
        memo: "Test payment"
      }));
      
      expect(invoice.invoice.amountSats).toBe(1000);
      expect(invoice.invoice.encodedInvoice).toContain("lnbc1000n1mock_invoice_");
      
      return invoice;
    }).pipe(
      Effect.provide(TestRuntime),
      Effect.runPromise
    );
  });

  it("should handle payment failures for testing", async () => {
    const result = await Effect.gen(function* (_) {
      const sparkService = yield* _(SparkService);
      
      // Use special "fail" invoice to trigger mock failure
      return yield* _(sparkService.payLightningInvoice({
        invoice: "lnbc_fail_test_invoice"
      }));
    }).pipe(
      Effect.provide(TestRuntime),
      Effect.runPromise,
      Effect.flip // Expect this to fail
    );

    expect(result._tag).toBe("SparkLightningError");
  });
});
```

## Key Design Principles

### 1. Complete Interface Coverage
The mock implementation must provide **every method** of the original service interface:
```typescript
// ✅ GOOD - Complete implementation
return SparkService.of({
  createLightningInvoice: mockImplementation,
  payLightningInvoice: mockImplementation,
  getBalance: mockImplementation,
  getSingleUseDepositAddress: mockImplementation,
  checkWalletStatus: mockImplementation,
  checkInvoiceStatus: mockImplementation
});

// ❌ BAD - Partial implementation causes runtime errors
return SparkService.of({
  createLightningInvoice: mockImplementation,
  // Missing other methods!
});
```

### 2. Realistic Mock Data
Mock responses should closely match real service responses:
```typescript
// ✅ GOOD - Realistic structure
const mockInvoice: LightningInvoice = {
  invoice: {
    encodedInvoice: `lnbc${params.amountSats}n1mock_invoice_${Date.now()}`,
    paymentHash: `mock_hash_${Date.now()}`,
    amountSats: params.amountSats,
    createdAt: Date.now(),
    expiresAt: Date.now() + (params.expirySeconds || 3600) * 1000,
    memo: params.memo,
  }
};

// ❌ BAD - Overly simplified mock
const mockInvoice = { invoice: "fake" };
```

### 3. Conditional Behavior for Testing
Enable specific test scenarios through input patterns:
```typescript
// Enable testing of error cases
if (params.invoice.includes("fail")) {
  return yield* _(Effect.fail(new SparkLightningError({
    message: "Mock payment failed for testing",
    context: { invoice: params.invoice },
  })));
}

// Enable testing of specific conditions  
if (invoiceBolt11.includes("paid")) {
  status = "paid";
  amountPaidMsats = 1000000;
} else if (invoiceBolt11.includes("expired")) {
  status = "expired";
}
```

### 4. Maintain Side Effects
Keep telemetry and logging for test validation:
```typescript
yield* _(telemetry.trackEvent({
  category: "spark:lightning",
  action: "create_invoice_success",
  value: String(params.amountSats),
}));
```

## When to Apply This Pattern

Apply this workaround when:
1. **Native Library Dependencies**: Service uses libraries with native binary requirements
2. **Cryptocurrency Libraries**: Bitcoin, Lightning, Ethereum, or other blockchain SDKs
3. **Platform-Specific Code**: Libraries that require specific OS or hardware features
4. **External Hardware**: Services that interact with hardware wallets or HSMs
5. **Network-Dependent Libraries**: Libraries that require specific network configurations

## Testing Strategy

### Mock Service Features to Test
1. **Interface Compliance**: All methods return expected types
2. **Error Handling**: Mock can simulate all error conditions
3. **Business Logic**: Core application logic works with mock data
4. **Integration Points**: Mock integrates correctly with other services

### What NOT to Test with Mocks
1. **Cryptographic Correctness**: Use integration tests with real libraries
2. **Network Protocol Compliance**: Use end-to-end tests
3. **Hardware Compatibility**: Use platform-specific tests
4. **Performance Characteristics**: Use benchmarks with real implementations

## Complete Example: Wallet Service Mock

```typescript
// src/services/wallet/WalletServiceTestImpl.ts
export const WalletServiceTestLive = Layer.effect(
  WalletService,
  Effect.gen(function* (_) {
    const bip39Service = yield* _(BIP39Service);
    const telemetry = yield* _(TelemetryService);

    return WalletService.of({
      generateMnemonic: () =>
        Effect.succeed("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"),

      createWalletFromMnemonic: (mnemonic: string) =>
        Effect.gen(function* (_) {
          // Mock wallet creation without ECC
          const mockWallet = {
            address: `mock_address_${Date.now()}`,
            publicKey: `mock_pubkey_${Date.now()}`,
            network: "regtest"
          };

          yield* _(telemetry.trackEvent({
            category: "wallet",
            action: "create_success",
            label: "Mock wallet created"
          }));

          return mockWallet;
        }),

      signTransaction: (tx: Transaction) =>
        Effect.gen(function* (_) {
          // Mock signing without real cryptography
          const mockSignature = `mock_signature_${Date.now()}`;
          
          yield* _(telemetry.trackEvent({
            category: "wallet",  
            action: "sign_transaction",
            label: `Mock signed: ${tx.id}`
          }));

          return mockSignature;
        }),
    });
  })
);
```

## Related Issues

- Closely related to [015 - Documentation Runtime Validation](./015-documentation-runtime-validation.md) for testing documented patterns
- Connected to [013 - Runtime Error Detection Testing](./013-runtime-error-detection-testing.md) for Effect runtime validation
- Prevents issues in [011 - Test Layer Composition Pattern](./011-test-layer-composition-pattern.md) when layers have problematic dependencies

## Resources

- [Effect Documentation - Testing](https://effect.website/docs/testing)
- [Node.js Native Addons](https://nodejs.org/api/addons.html)
- [Docker Multi-stage Builds for Native Dependencies](https://docs.docker.com/develop/dev-best-practices/)

## Key Lesson

**Isolate Dependencies**: When services have problematic external dependencies, create complete mock implementations that provide identical interfaces without the dependency issues. This enables comprehensive testing of business logic while avoiding infrastructure complexity.