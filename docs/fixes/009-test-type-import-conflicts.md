# Fix 009: Test Type Import Conflicts

## Problem
In test files, importing both library types and custom types with the same name creates duplicate identifier conflicts, especially common when testing custom implementations that extend library types.

### Error Messages
```typescript
error TS2300: Duplicate identifier 'AiError'.
error TS1361: 'AiError' cannot be used as a value because it was imported using 'import type'.
```

## Root Cause
When testing custom implementations that extend or mirror library types:
1. Test files need the library type for type annotations (`import type { AiError } from "@effect/ai/AiError"`)
2. Test files also need the custom implementation as a value for instantiation (`import { AiError } from "@/services/ai/core/AiError"`)
3. TypeScript sees these as conflicting identifiers since they have the same name
4. Using `import type` makes the identifier only available as a type, not as a value for `instanceof` checks or constructors

## Solution
Use import aliasing to resolve the namespace conflict:

```typescript
// OLD: Conflicting imports
import type { AiError } from "@effect/ai/AiError";          // Type import
import { AiError } from "@/services/ai/core/AiError";       // Value import - CONFLICT!

// NEW: Aliased imports
import type { AiError as EffectAiError } from "@effect/ai/AiError";    // Type aliased
import { AiError, AiProviderError } from "@/services/ai/core/AiError"; // Value import - clear!
```

### Why This Pattern Works
1. **Namespace Separation**: `EffectAiError` vs `AiError` are distinct identifiers
2. **Type vs Value**: Library types stay as types, custom implementations stay as values
3. **Clear Intent**: The alias makes it obvious which is the library type vs custom implementation
4. **Runtime Safety**: Custom implementations can still be used for `instanceof` checks and constructors

## Complete Example

### Before (Problematic)
```typescript
import type { AiError } from "@effect/ai/AiError";
import { AiError } from "@/services/ai/core/AiError";  // ❌ Duplicate identifier

// This fails:
class MockAiError extends AiError {  // Which AiError?
  constructor() {
    super({ message: "test" });
  }
}

// This fails:
const error = new AiError({ message: "test" });  // Cannot use as value
```

### After (Clean)
```typescript
import type { AiError as EffectAiError } from "@effect/ai/AiError";
import { AiError, AiProviderError } from "@/services/ai/core/AiError";  // ✅ Clear!

// This works:
class MockAiError extends AiProviderError {  // Clearly the custom implementation
  constructor() {
    super({ 
      message: "test", 
      provider: "TestProvider",
      isRetryable: false 
    });
  }
}

// This works:
const error = new AiError({ message: "test" });  // Value available
```

## Extended Pattern for Response Types

This pattern is especially common with response types:

```typescript
// Multiple type conflicts
import type { AiResponse } from "@effect/ai/AiResponse";
import { AiResponse as CoreAiResponse } from "@/services/ai/core/AiResponse";

// Use the aliased imports clearly
const mockResponse = CoreAiResponse.fromSimple({ text: "test" });  // Custom implementation
// EffectAiError would be used for type annotations if needed
```

## When to Apply This Fix
- When test files import both library types and custom implementations with same names
- When you see "Duplicate identifier" errors in tests
- When `import type` prevents using identifiers as values for constructors
- When extending library types with custom implementations

## Testing Best Practices
1. **Import Custom Types as Values**: Use regular imports for your custom implementations
2. **Alias Library Types**: Use `import type { LibType as AliasedLibType }` for library types
3. **Prefer Custom Implementations in Tests**: Use your custom error/response types for mocking
4. **Use Factory Methods**: Leverage `fromSimple()` or similar factory methods for easy test data creation

## Related Issues
- [007 - Response Type Mapping Pattern](./007-response-type-mapping-pattern.md) - How to map between library and custom types
- [008 - Streaming Type Unification Pattern](./008-streaming-type-unification.md) - Unifying custom and library types
- Common in any codebase that extends or wraps library types with custom implementations