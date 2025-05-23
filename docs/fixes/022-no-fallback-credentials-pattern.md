# Fix: No Fallback Credentials Pattern

## Problem

Using fallback values with the `||` operator for sensitive credentials creates critical security vulnerabilities where all users share the same test credentials.

### Error Symptom
```
User reports: "I entered my seed phrase but still see 48 sats balance"
Telemetry shows: Runtime built with user mnemonic, then rebuilt with test mnemonic
All users see the same wallet balance from shared test credentials
```

### Code Pattern That Causes Issues
```typescript
// DANGEROUS PATTERN - DO NOT USE
const userMnemonic = globalWalletConfig.mnemonic || "test test test test test test test test test test test junk";
const apiKey = config.apiKey || "test_api_key_12345";
const privateKey = userConfig.privateKey || "0x1234567890abcdef...";
```

## Root Cause

1. **Runtime Initialization Timing**: Services often initialize before user configuration is loaded
2. **Store Rehydration**: Persisted stores load after initial runtime creation
3. **Fallback Convenience**: Developers use `|| "test value"` for easier development/testing
4. **Hidden State Sharing**: All instances use the same fallback, creating shared state

## Solution

### Pattern 1: Use Mock Services for No-Credential State
```typescript
// GOOD: Use different service implementations based on credential availability
let serviceLayer: Layer.Layer<MyService, any, Dependencies>;

if (globalConfig.credentials) {
  // Real service with user credentials
  serviceLayer = RealServiceLive.pipe(
    Layer.provide(Layer.succeed(ConfigTag, {
      credentials: globalConfig.credentials
    }))
  );
} else {
  // Mock service that returns safe defaults
  serviceLayer = MockServiceLive.pipe(
    Layer.provide(Layer.succeed(ConfigTag, {
      credentials: "mock_no_credentials"
    }))
  );
}
```

### Pattern 2: Fail Fast with Clear Errors
```typescript
// GOOD: Fail explicitly when credentials are missing
const configLayer = globalConfig.apiKey 
  ? Layer.succeed(ApiKeyTag, globalConfig.apiKey)
  : Layer.fail(new ConfigError({ 
      message: "API key required - please configure in settings" 
    }));
```

### Pattern 3: Lazy Initialization
```typescript
// GOOD: Defer credential checks until actual use
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* (_) {
    // Don't check credentials here in Layer construction
    
    return MyService.of({
      doOperation: () => Effect.gen(function* (_) {
        // Check credentials at method invocation time
        const credentials = globalConfig.credentials;
        if (!credentials) {
          return yield* _(Effect.fail(new NoCredentialsError()));
        }
        
        // Proceed with operation
        return yield* _(performOperation(credentials));
      })
    });
  })
);
```

## Complete Example: Wallet Service

```typescript
// walletConfig.ts
export interface WalletConfig {
  mnemonic: string | null; // Explicitly nullable, no defaults
}

export const globalWalletConfig: WalletConfig = {
  mnemonic: null,
};

// runtime.ts
function buildAppLayer() {
  let sparkLayer: Layer.Layer<SparkService, any, TelemetryService>;
  
  if (globalWalletConfig.mnemonic) {
    // Real wallet service with user's mnemonic
    console.log("[Runtime] Building SparkService with user wallet");
    
    const configLayer = Layer.succeed(SparkServiceConfigTag, {
      network: "MAINNET",
      mnemonicOrSeed: globalWalletConfig.mnemonic,
      accountNumber: 2,
    });
    
    sparkLayer = SparkServiceLive.pipe(
      Layer.provide(Layer.merge(configLayer, telemetryLayer))
    );
  } else {
    // Mock wallet service for no-wallet state
    console.log("[Runtime] Building SparkService with mock (no wallet)");
    
    sparkLayer = SparkServiceTestLive.pipe(
      Layer.provide(Layer.merge(
        Layer.succeed(SparkServiceConfigTag, {
          network: "MAINNET", 
          mnemonicOrSeed: "mock_no_wallet",
          accountNumber: 0,
        }),
        telemetryLayer
      ))
    );
  }
  
  return Layer.mergeAll(sparkLayer, /* other layers */);
}

// SparkServiceTestImpl.ts
export const SparkServiceTestLive = Layer.effect(
  SparkService,
  Effect.gen(function* (_) {
    const config = yield* _(SparkServiceConfigTag);
    
    return SparkService.of({
      getBalance: () => Effect.gen(function* (_) {
        // Return appropriate balance for mock state
        const isNoWallet = config.mnemonicOrSeed === "mock_no_wallet";
        return {
          balance: isNoWallet ? BigInt(0) : BigInt(100000),
          tokenBalances: new Map()
        };
      }),
      // ... other methods
    });
  })
);
```

## When to Apply This Pattern

1. **Any credential or secret configuration**: API keys, private keys, mnemonics, tokens
2. **User-specific configuration**: Account IDs, personal settings, authentication
3. **Service initialization**: When building Effect Layers or runtime configuration
4. **Environment-specific values**: Database URLs, service endpoints (use proper env config instead)

## Security Implications

### What Can Go Wrong
1. **Shared State**: All users share the same test account/wallet/API quota
2. **Fund Loss**: Real money sent to test wallets is accessible by anyone
3. **Data Leakage**: Test accounts may accumulate real user data
4. **Rate Limiting**: Shared API keys hit rate limits affecting all users
5. **Audit Trail**: Cannot distinguish between different users' actions

### Best Practices
1. **Never hardcode credentials**: Not even for "development convenience"
2. **Use environment variables**: For development-specific values
3. **Mock services for tests**: Don't use real credentials in test suites
4. **Fail fast**: Better to show clear error than silently use test credentials
5. **Log safely**: Never log even partial credentials (e.g., first 10 chars of mnemonic)

## Testing Strategy

```typescript
describe("Service with credentials", () => {
  it("should use mock service when no credentials", async () => {
    globalConfig.credentials = null;
    const runtime = buildRuntime();
    
    const result = await Effect.runPromise(
      Effect.provide(
        MyService.pipe(Effect.flatMap(s => s.getBalance())),
        runtime
      )
    );
    
    expect(result.balance).toBe(0n); // Mock returns 0
  });
  
  it("should use real service with credentials", async () => {
    globalConfig.credentials = "user_mnemonic";
    const runtime = buildRuntime();
    
    // Test would use test credentials, not hardcoded fallback
  });
});
```

## Related Issues

- [016 - ECC Library Testing Workaround](./016-ecc-library-testing-workaround.md) - Creating mock services for testing
- [018 - Runtime Initialization Resilience](./018-runtime-initialization-resilience.md) - Deferred initialization patterns
- Services that commonly have this issue:
  - Wallet/payment services (Bitcoin, Lightning, Ethereum)
  - API client services (OpenAI, Stripe, Twilio)
  - Database connection services
  - Authentication services

## Key Lesson

**Never use `|| "test_value"` for credentials**. The convenience during development is not worth the security risk in production. Use proper mock services, environment configuration, or explicit error handling instead.