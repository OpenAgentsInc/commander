# Fix 008: Streaming Type Unification Pattern

## Problem
When upgrading @effect/ai libraries, custom streaming types (like `AiTextChunk`) create widespread type conflicts with the library's standardized `AiResponse` type used in streaming operations.

### Error Messages
```
error TS2345: Argument of type 'Stream<AiResponse, AiProviderError, never>' is not assignable to parameter of type 'Stream<AiTextChunk, AiProviderError, never>'.
  Property '_tag' is missing in type 'AiResponse' but required in type 'AiTextChunk'.

error TS2322: Type 'AiTextChunk' is missing the following properties from type 'AiResponse': toolCalls, metadata, [EffectAiResponseTypeId], finishReason, and 2 more.
```

## Root Cause
The issue occurs when:
1. Custom streaming chunk types (`AiTextChunk`) exist alongside standard response types (`AiResponse`)
2. Provider implementations return different types for streaming vs non-streaming operations
3. The @effect/ai library standardizes on `AiResponse` for both individual responses and stream chunks
4. Interface mismatches create cascading type conflicts across the entire streaming pipeline

## Solution
**Eliminate custom streaming types and unify on the standard library type**:

### Step 1: Remove Custom Streaming Type
```typescript
// REMOVE this custom type
export class AiTextChunk extends Data.TaggedClass("AiTextChunk")<{
  text: string;
}> { }
```

### Step 2: Update Interface Signatures
```typescript
// OLD: Mixed types
interface AgentLanguageModel {
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never>;
  streamText(options: StreamTextOptions): Stream.Stream<AiTextChunk, AiProviderError, never>; // ❌
}

// NEW: Unified types  
interface AgentLanguageModel {
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never>;
  streamText(options: StreamTextOptions): Stream.Stream<AiResponse, AiProviderError, never>; // ✅
}
```

### Step 3: Update Provider Implementations
```typescript
// OLD: Custom chunk creation
streamText: (options: StreamTextOptions) => 
  Stream.map(libraryStream, (chunk) => new AiTextChunk({ text: chunk.text })) // ❌

// NEW: Direct library type usage
streamText: (options: StreamTextOptions) =>
  Stream.map(libraryStream, (effectAiResponse) => 
    new AiResponse({ parts: effectAiResponse.parts }) // ✅
  )
```

### Step 4: Update Consumers
```typescript
// OLD: Type-specific handling
Stream.runForEach(textStream, (chunk: AiTextChunk) => 
  Effect.sync(() => updateUI(chunk.text)) // ❌
)

// NEW: Unified type handling
Stream.runForEach(textStream, (chunk: AiResponse) => 
  Effect.sync(() => updateUI(chunk.text)) // ✅
)
```

## Why This Pattern is Safe
1. **Type Consistency**: Single type eliminates interface mismatches
2. **Library Alignment**: Follows @effect/ai's standardized approach
3. **Future Compatibility**: Reduces breaking changes when upgrading libraries
4. **Simplified Mental Model**: One type for all AI responses, whether streamed or not

## Complete Example

### Before (Problematic)
```typescript
// Multiple response types
export class AiResponse { /* full response */ }
export class AiTextChunk { text: string; }

// Mixed interface
interface AgentLanguageModel {
  generateText(): Effect<AiResponse, ...>     // Different type
  streamText(): Stream<AiTextChunk, ...>      // Different type
}

// Provider confusion
streamText: () => 
  libraryStream.pipe(
    Stream.map(libResponse => new AiTextChunk({ text: libResponse.text })) // Data loss!
  )
```

### After (Clean)
```typescript
// Single response type (extends @effect/ai's AiResponse)
export class AiResponse extends EffectAiResponse { /* ... */ }

// Unified interface
interface AgentLanguageModel {
  generateText(): Effect<AiResponse, ...>     // Same type
  streamText(): Stream<AiResponse, ...>       // Same type
}

// Provider clarity
streamText: () => 
  libraryStream.pipe(
    Stream.map(libResponse => new AiResponse({ parts: libResponse.parts })) // Full data!
  )
```

## When to Apply This Fix
- When upgrading @effect/ai or similar libraries
- When you see streaming type conflicts across providers
- When custom chunk types exist alongside standard response types
- When provider implementations have inconsistent return types

## Related Issues
- [007 - Response Type Mapping Pattern](./007-response-type-mapping-pattern.md) - How to properly map @effect/ai responses
- [004 - AiResponse Type Conflicts](./004-airesponse-type-conflicts.md) - Managing library vs custom types

## Impact Assessment
- **High Impact Fix**: Eliminates 10+ cascading type errors
- **Files Affected**: All providers, streaming interfaces, consumer hooks
- **Breaking Change**: Yes, but necessary for library compatibility
- **Test Updates**: All streaming tests need type updates