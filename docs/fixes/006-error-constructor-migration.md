# Fix: Error Constructor Migration Pattern

## Problem

When adding required properties to existing `Data.TaggedError` classes, all constructor calls throughout the codebase must be updated, or compilation fails immediately. Missing even one constructor call causes TypeScript errors.

### Error Message
```
Property 'provider' is missing in type '{ message: string; isRetryable: true; }' but required in type '{ readonly message: string; readonly cause?: unknown; readonly isRetryable: boolean; readonly provider: string; readonly context?: Record<string, any> | undefined; }'.
```

## Root Cause

When you modify a `Data.TaggedError` class to add required properties:

```typescript
// Before
export class AiProviderError extends Data.TaggedError("AiProviderError")<{
  message: string;
  isRetryable: boolean;
}> { }

// After
export class AiProviderError extends Data.TaggedError("AiProviderError")<{
  message: string;
  isRetryable: boolean;
  provider: string; // New required property
}> { }
```

All existing constructor calls become invalid:

```typescript
// This now fails compilation
new AiProviderError({
  message: "Some error",
  isRetryable: true
  // Missing: provider
});
```

## Solution

### Step 1: Update the Error Class Definition
Add the new required property to the type definition.

### Step 2: Find ALL Constructor Calls
Use systematic search to find every constructor call:

```bash
# Find all constructor calls for the error type
grep -r "new AiProviderError" src/
grep -r "AiProviderError\.of" src/  # For static factory methods
```

### Step 3: Update Constructor Calls Systematically
Update each call to include the new required property:

```typescript
// Before
new AiProviderError({
  message: "Ollama generateText error",
  isRetryable: true,
  cause: err
})

// After  
new AiProviderError({
  message: "Ollama generateText error",
  provider: "Ollama", // Add required property
  isRetryable: true,
  cause: err
})
```

### Step 4: Update Helper Functions
If you have error mapping functions, update their signatures:

```typescript
// Before
export const mapToAiProviderError = (
  error: unknown,
  contextAction: string,
  modelName: string,
  isRetryable = false
): AiProviderError => {
  return new AiProviderError({
    message: `Provider ${contextAction} error for model ${modelName}`,
    cause: error,
    isRetryable
  });
};

// After
export const mapToAiProviderError = (
  error: unknown,
  providerName: string, // Changed parameter
  modelName: string,
  isRetryable = false
): AiProviderError => {
  return new AiProviderError({
    message: `Provider error for model ${modelName} (${providerName})`,
    provider: providerName, // Add required property
    cause: error,
    isRetryable,
    context: { model: modelName, originalError: String(error) }
  });
};
```

## Complete Example

### Error Class Update
```typescript
export class AiProviderError extends Data.TaggedError("AiProviderError")<{
  message: string;
  cause?: unknown;
  isRetryable: boolean;
  provider: string; // New required property
  context?: Record<string, any>; // Optional additional property
}> { }
```

### Search and Replace Pattern
```bash
# 1. Find all constructor calls
grep -r "new AiProviderError" src/ > error_calls.txt

# 2. For each file, update the constructor calls:
# Add: provider: "ProviderName"
```

### Systematic Update Example
```typescript
// File: OllamaProvider.ts
// Before:
Effect.mapError(err => new AiProviderError({
  message: `Ollama error: ${err.message}`,
  isRetryable: true,
  cause: err
}))

// After:
Effect.mapError(err => new AiProviderError({
  message: `Ollama error: ${err.message}`,
  provider: "Ollama", // Added
  isRetryable: true,
  cause: err
}))
```

## Why This Pattern is Critical

1. **Compile-time Safety**: TypeScript ensures all required properties are provided
2. **Breaking Changes**: Missing ANY constructor call breaks the entire build
3. **Systematic Approach**: Search-and-replace is more reliable than manual hunting
4. **Helper Function Updates**: Don't forget utility functions that create these errors

## When to Apply This Pattern

Apply this pattern when:
1. Adding required properties to existing `Data.TaggedError` classes
2. Seeing "Property 'X' is missing" errors after error class changes
3. Refactoring error handling to include more context
4. Migrating from old error patterns to new structured error types

## Related Issues

- Often occurs during library upgrades that change error interfaces
- Can affect multiple providers/services if they use the same error types
- Test files often need updates too if they create mock errors
- Helper functions and error mapping utilities need signature updates

## Search Patterns for Different Scenarios

```bash
# Direct constructor calls
grep -r "new ErrorClassName" src/

# Static factory methods (if used)
grep -r "ErrorClassName\.of\|ErrorClassName\.create" src/

# Error mapping in pipes
grep -r "mapError.*ErrorClassName" src/

# Effect.fail with error construction
grep -r "Effect\.fail.*new ErrorClassName" src/
```