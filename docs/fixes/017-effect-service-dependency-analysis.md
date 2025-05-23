# Fix: Effect Service Dependency Analysis Pattern

## Problem

Effect services often require multiple dependencies that aren't obvious from the API surface. Missing dependencies cause runtime "Service not found" errors that pass TypeScript compilation but fail at execution time.

### Error Messages
```
Service not found: @effect/ai-openai/OpenAiLanguageModel/Config
Service not found: SomeService.Tag
Context.Tag not found in environment
```

### Real Example
During this session, we discovered that `OpenAiLanguageModel.model()` requires **two services**, not just one:
1. `OpenAiClient.OpenAiClient` (obvious from the API)
2. `OpenAiLanguageModel.Config` (hidden internal dependency)

## Root Cause

Effect libraries often have:
1. **Hidden Service Dependencies**: Internal services not documented in the main API
2. **Nested Service Requirements**: Services that depend on other services transitively
3. **Configuration Services**: Parameter objects that need to be provided as services
4. **Runtime Discovery**: Dependencies only revealed when services are actually used

## Solution: Systematic Dependency Discovery

### Step 1: API Surface Analysis

Start with the obvious dependencies from the API:

```typescript
// Looking at the API:
OpenAiLanguageModel.model(modelName, options)
```

This suggests you need:
- A model name (string parameter)
- Options object (configuration parameter)

### Step 2: Effect Chain Analysis

Trace what services the Effect chain requires:

```typescript
const aiModelEffect = OpenAiLanguageModel.model(modelName, options);
// This returns Effect<Provider<AiLanguageModel>, ServiceErrors, RequiredServices>
```

The `RequiredServices` type parameter tells you what services are needed.

### Step 3: Runtime Error Discovery

When you get "Service not found" errors, they tell you exactly what's missing:

```typescript
// Error: Service not found: @effect/ai-openai/OpenAiLanguageModel/Config
// This means you need to provide OpenAiLanguageModel.Config service
```

### Step 4: Complete Service Provision

Provide ALL required services:

```typescript
// INCOMPLETE (causes runtime error)
const configuredEffect = Effect.provideService(
  aiModelEffect,
  OpenAiClient.OpenAiClient,  // Only providing one of two required services
  client
);

// COMPLETE (works correctly)  
const configuredEffect = Effect.provideService(
  aiModelEffect,
  OpenAiLanguageModel.Config,  // First required service
  { 
    model: modelName, 
    temperature: 0.7, 
    max_tokens: 2048 
  }
).pipe(
  Effect.provideService(OpenAiClient.OpenAiClient, client)  // Second required service
);
```

## Complete Discovery Process

### 1. Start with Documentation

```typescript
// Read the library docs to understand the basic pattern
const modelEffect = SomeLibrary.createModel(params);
```

### 2. Check Type Signatures

```typescript
// Look at the Effect type signature
// Effect<SuccessType, ErrorType, RequiredEnvironment>
//                                 ^^^^^^^^^^^^^^^^^^^^
//                                 This tells you dependencies
```

### 3. Implement Minimal Version

```typescript
const testImplementation = Effect.gen(function* (_) {
  // Try the simplest possible implementation
  const model = yield* _(SomeLibrary.createModel(params));
  return model;
});
```

### 4. Run and Collect Errors

```typescript
// Execute and see what services are missing
const result = await Effect.runPromise(
  testImplementation.pipe(Effect.provide(yourCurrentLayer))
);
// Error: Service not found: SomeService.Tag
```

### 5. Add Missing Services

```typescript
const completeImplementation = Effect.gen(function* (_) {
  const model = yield* _(SomeLibrary.createModel(params));
  return model;
}).pipe(
  Effect.provideService(MissingService.Tag, serviceImplementation),
  Effect.provideService(AnotherMissingService.Tag, anotherImplementation)
);
```

### 6. Verify Complete Resolution

```typescript
// Test that all dependencies are satisfied
const verificationTest = Effect.gen(function* (_) {
  const model = yield* _(completeImplementation);
  // Try to use the model to ensure it's fully configured
  const result = yield* _(model.someMethod());
  return result;
});
```

## Systematic Service Analysis Template

```typescript
// Template for analyzing Effect service dependencies

// Step 1: Identify the main service creation
const primaryEffect = LibraryName.createService(params);

// Step 2: Discover all required services through runtime testing
const discoveryTest = Effect.gen(function* (_) {
  try {
    const service = yield* _(primaryEffect);
    return { success: true, service };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}).pipe(
  Effect.provide(minimalTestLayer),  // Start with minimal dependencies
  Effect.runPromise
);

// Step 3: Build complete service provision chain
const completeServiceEffect = primaryEffect.pipe(
  Effect.provideService(FirstRequiredService.Tag, firstImplementation),
  Effect.provideService(SecondRequiredService.Tag, secondImplementation),
  // Add more services as discovered through runtime errors
);

// Step 4: Validate complete implementation
const validationTest = Effect.gen(function* (_) {
  const service = yield* _(completeServiceEffect);
  
  // Test actual usage, not just creation
  const operationResult = yield* _(service.performOperation());
  
  return { service, operationResult };
});
```

## Common Hidden Dependencies

### Configuration Services
Many libraries expect configuration to be provided as services:

```typescript
// Common pattern: options become services
const service = Library.create(modelName, options);  // API surface

// But internally requires:
Effect.provideService(Library.Config, options)  // Hidden requirement
```

### Client Services  
Network-based services often need client dependencies:

```typescript
// Obvious: HTTP client
Effect.provideService(HttpClient.Tag, httpClient)

// Less obvious: Authentication service, retry service, telemetry service
Effect.provideService(AuthService.Tag, authService)
Effect.provideService(RetryService.Tag, retryConfig)
```

### Platform Services
Some services need platform-specific dependencies:

```typescript
// File system services
Effect.provideService(FileSystem.Tag, fileSystemImpl)

// Logging services  
Effect.provideService(Logger.Tag, loggerImpl)

// Time services
Effect.provideService(Clock.Tag, clockImpl)
```

## Testing Strategy for Service Dependencies

### 1. Dependency Discovery Tests

```typescript
describe("Service Dependency Discovery", () => {
  it("should identify all required services for [ServiceName]", async () => {
    const missingDependencies: string[] = [];
    
    const testEffect = Effect.gen(function* (_) {
      try {
        const service = yield* _(ServiceCreationEffect);
        return service;
      } catch (error) {
        if (String(error).includes("Service not found")) {
          missingDependencies.push(String(error));
        }
        throw error;
      }
    });

    // Try with minimal layer and collect missing services
    await expect(
      Effect.runPromise(testEffect.pipe(Effect.provide(minimalLayer)))
    ).rejects.toThrow();

    // Document what services are actually required
    expect(missingDependencies).toMatchSnapshot();
  });
});
```

### 2. Complete Service Provision Tests

```typescript
describe("Complete Service Provision", () => {
  it("should provide all required services for [ServiceName]", async () => {
    const result = await Effect.gen(function* (_) {
      const service = yield* _(CompleteServiceEffect);
      
      // Test actual usage
      const operationResult = yield* _(service.performOperation());
      
      return { service, operationResult };
    }).pipe(
      Effect.provide(completeServiceLayer),
      Effect.runPromise
    );

    expect(result.service).toBeDefined();
    expect(result.operationResult).toBeDefined();
  });
});
```

## Real-World Example: OpenAI Service Dependencies

```typescript
// What the API suggests you need:
const aiModel = OpenAiLanguageModel.model("gpt-4");

// What you actually need to provide:
const completeImplementation = Effect.gen(function* (_) {
  const aiModelEffect = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });

  // Runtime discovery revealed these services are required:
  const configuredEffect = Effect.provideService(
    aiModelEffect,
    OpenAiLanguageModel.Config,     // Hidden dependency #1
    { 
      model: modelName, 
      temperature: 0.7, 
      max_tokens: 2048 
    }
  ).pipe(
    Effect.provideService(
      OpenAiClient.OpenAiClient,    // Obvious dependency #2
      openAiClient
    )
  );

  const provider = yield* _(configuredEffect);
  return provider;
});
```

## When to Apply This Analysis

Use this systematic approach when:

1. **Integrating New Libraries**: Any new Effect-based library integration
2. **Service Creation Errors**: When you get "Service not found" runtime errors
3. **Complex Service Chains**: Services that depend on other services
4. **Library Upgrades**: When upgrading libraries that might have new dependencies
5. **Documentation Gaps**: When library documentation doesn't clearly specify dependencies

## Prevention Strategies

### 1. Service Dependency Documentation

Document discovered dependencies:

```typescript
/**
 * Creates configured OpenAI language model provider
 * 
 * Required Services:
 * - OpenAiLanguageModel.Config: Model configuration (model name, temperature, etc.)
 * - OpenAiClient.OpenAiClient: HTTP client for OpenAI API
 * 
 * @param modelName - Model to use (e.g., "gpt-4")
 * @param client - Configured OpenAI HTTP client
 */
export const createOpenAiProvider = (modelName: string, client: OpenAiClient) => {
  // Implementation...
};
```

### 2. Service Layer Testing

Create comprehensive tests for all service layers:

```typescript
// Test that service layers provide all required dependencies
describe("Service Layer Completeness", () => {
  it("should provide all dependencies for AI services", async () => {
    const testAllAiServices = Effect.gen(function* (_) {
      // Test each AI service can be created
      const ollama = yield* _(OllamaService);
      const openai = yield* _(OpenAIService); 
      const nip90 = yield* _(NIP90Service);
      
      return { ollama, openai, nip90 };
    });

    const result = await Effect.runPromise(
      testAllAiServices.pipe(Effect.provide(completeAiLayer))
    );

    expect(result.ollama).toBeDefined();
    expect(result.openai).toBeDefined();
    expect(result.nip90).toBeDefined();
  });
});
```

## Related Patterns

- [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md): After discovering dependencies, you need correct type patterns
- [013 - Runtime Error Detection Testing](./013-runtime-error-detection-testing.md): Runtime tests catch missing dependencies
- [015 - Documentation Runtime Validation](./015-documentation-runtime-validation.md): Validate that documented patterns include all dependencies

## Key Lessons

1. **Service Dependencies Are Hidden**: API surfaces don't always reveal all required services
2. **Runtime Discovery Is Essential**: The only reliable way to find all dependencies is runtime testing
3. **Documentation Is Incomplete**: Library docs often omit internal service requirements
4. **Systematic Approach Scales**: This discovery process works for any Effect-based library
5. **Test Early, Test Often**: Dependency issues are easier to fix during integration than in production

This systematic approach ensures that Effect service integrations are complete and reliable.