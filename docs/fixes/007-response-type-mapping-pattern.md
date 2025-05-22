# Fix: Response Type Mapping Pattern for @effect/ai Integration

## Problem

When implementing custom language model services that wrap @effect/ai providers, you need to convert between @effect/ai's AiResponse type and your application's AiResponse type. Direct constructor calls fail because the types have different structures and requirements.

### Error Message
```
Type 'AiResponse' is missing the following properties from type 'AiResponse': toolCalls, metadata
```

Or:
```
Object literal may only specify known properties, and 'text' does not exist in type '{ readonly parts: readonly (TextPart | ReasoningPart | ...) }'
```

## Root Cause

@effect/ai v0.16.5 changed AiResponse from a simple object constructor to a Schema-based class that requires `parts` instead of direct properties:

```typescript
// ❌ Old pattern (doesn't work)
new AiResponse({
  text: "Generated text",
  metadata: { usage: { totalTokens: 100 } }
})

// ✅ New pattern (required)
new AiResponse({ 
  parts: [
    new TextPart({ text: "Generated text", annotations: [] }),
    new FinishPart({ 
      usage: new Usage({ totalTokens: 100, ... }),
      reason: "stop" 
    })
  ] 
})
```

Additionally, when extending @effect/ai's AiResponse for application use, you need proper response mapping between the library type and your custom type.

## Solution

### Strategy 1: Extend @effect/ai's AiResponse (Recommended)

Create your custom AiResponse by extending @effect/ai's base class and adding convenience methods:

```typescript
import { AiResponse as EffectAiResponse, TypeId as EffectAiResponseTypeId, TextPart, FinishPart, Usage } from "@effect/ai/AiResponse";

export class AiResponse extends EffectAiResponse {
  readonly [EffectAiResponseTypeId]: typeof EffectAiResponseTypeId = EffectAiResponseTypeId;

  // Convenience getters for backward compatibility
  get text(): string {
    return this.parts
      .filter((part): part is typeof TextPart.Type => part._tag === "TextPart")
      .map(part => part.text)
      .join("");
  }

  get toolCalls(): Array<{id: string; name: string; arguments: Record<string, unknown>}> {
    return this.parts
      .filter((part): part is typeof ToolCallPart.Type => part._tag === "ToolCallPart")
      .map(part => ({
        id: part.id,
        name: part.name,
        arguments: part.params as Record<string, unknown>
      }));
  }

  // Factory method for easy construction
  static fromSimple(props: {
    text: string;
    toolCalls?: Array<{id: string; name: string; arguments: Record<string, unknown>}>;
    metadata?: {usage?: {promptTokens: number; completionTokens: number; totalTokens: number}};
  }): AiResponse {
    const parts: any[] = [];
    
    if (props.text) {
      parts.push(new TextPart({ text: props.text, annotations: [] }));
    }
    
    if (props.toolCalls) {
      for (const toolCall of props.toolCalls) {
        parts.push({
          _tag: "ToolCallPart" as const,
          [PartTypeId]: PartTypeId,
          id: toolCall.id,
          name: toolCall.name,
          params: toolCall.arguments
        });
      }
    }
    
    parts.push(new FinishPart({
      reason: "unknown" as FinishReason,
      usage: new Usage({
        inputTokens: props.metadata?.usage?.promptTokens || 0,
        outputTokens: props.metadata?.usage?.completionTokens || 0,
        totalTokens: props.metadata?.usage?.totalTokens || 0,
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      }),
      providerMetadata: {}
    }));
    
    return new AiResponse({ parts });
  }
}
```

### Strategy 2: Provider Response Mapping Pattern

In provider implementations, map from @effect/ai's AiResponse to your custom AiResponse:

```typescript
// Inside your provider implementation
generateText: (options: GenerateTextOptions) =>
  provider.use(
    Effect.gen(function* (_) {
      const languageModel = yield* _(AiLanguageModel);
      const effectAiResponse = yield* _(languageModel.generateText({
        prompt: options.prompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      }));
      
      // Map @effect/ai AiResponse to your custom AiResponse
      return AiResponse.fromSimple({
        text: effectAiResponse.text,
        toolCalls: effectAiResponse.toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.params as Record<string, unknown>
        })),
        metadata: {
          usage: {
            promptTokens: 0, // Extract from effectAiResponse metadata if available
            completionTokens: effectAiResponse.text.length,
            totalTokens: effectAiResponse.text.length
          }
        }
      });
    })
  ),

streamText: (options: StreamTextOptions) =>
  Stream.unwrap(
    provider.use(
      Effect.gen(function* (_) {
        const languageModel = yield* _(AiLanguageModel);
        return languageModel.streamText({
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          signal: options.signal
        }).pipe(
          // Map each chunk from @effect/ai's AiResponse to your AiResponse
          Stream.map((effectAiResponse) => AiResponse.fromSimple({
            text: effectAiResponse.text,
            toolCalls: effectAiResponse.toolCalls?.map(tc => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.params as Record<string, unknown>
            })),
            metadata: {
              usage: {
                promptTokens: 0,
                completionTokens: effectAiResponse.text.length,
                totalTokens: effectAiResponse.text.length
              }
            }
          }))
        );
      })
    )
  )
```

### Strategy 3: Update Interface Consistency

If you have interface mismatches (AiTextChunk vs AiResponse), update to use AiResponse consistently:

```typescript
// ❌ Before: Mixed types
export interface AgentLanguageModel {
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never>;
  streamText(options: StreamTextOptions): Stream.Stream<AiTextChunk, AiProviderError, never>; // Inconsistent
}

// ✅ After: Consistent types
export interface AgentLanguageModel {
  generateText(options: GenerateTextOptions): Effect.Effect<AiResponse, AiProviderError, never>;
  streamText(options: StreamTextOptions): Stream.Stream<AiResponse, AiProviderError, never>; // Consistent
}
```

## Complete Migration Example

### Before: Direct Constructor (Broken)
```typescript
const createAiResponse = (text: string): AiResponse => {
  return new AiResponse({
    text,
    metadata: {
      usage: {
        promptTokens: 0,
        completionTokens: text.length,
        totalTokens: text.length
      }
    }
  });
};
```

### After: Factory Method (Working)
```typescript
const createAiResponse = (text: string): AiResponse => {
  return AiResponse.fromSimple({
    text,
    metadata: {
      usage: {
        promptTokens: 0,
        completionTokens: text.length,
        totalTokens: text.length
      }
    }
  });
};
```

## Why This Pattern is Essential

1. **Library Compatibility**: Maintains compatibility with @effect/ai's evolving type system
2. **Backward Compatibility**: Preserves existing application code through convenience getters
3. **Type Safety**: Ensures correct type mapping between library and application boundaries
4. **Consistency**: Enables unified response handling across all providers
5. **Future-Proof**: Adapts to library changes without breaking application interfaces

## When to Apply This Pattern

Apply this pattern when:
1. Upgrading @effect/ai and seeing AiResponse constructor errors
2. Building custom language model services that wrap @effect/ai providers
3. Converting between different response types in streaming vs non-streaming contexts
4. Seeing "missing properties" errors between library and application AiResponse types
5. Implementing provider mappers that convert external responses to internal types

## Migration Checklist

When migrating existing code:

1. **✅ Update AiResponse class**: Extend @effect/ai's AiResponse instead of Data.TaggedClass
2. **✅ Add factory method**: Create `fromSimple()` for backward compatibility  
3. **✅ Find constructor calls**: Use `grep "new AiResponse\(\{.*text:"` to find old patterns
4. **✅ Update constructors**: Replace with `AiResponse.fromSimple()` calls
5. **✅ Update interfaces**: Use AiResponse consistently instead of mixing with AiTextChunk
6. **✅ Update providers**: Add proper mapping from @effect/ai types to custom types
7. **✅ Test boundaries**: Verify type compatibility at provider and service boundaries

## Related Issues

- Often occurs during @effect/ai version upgrades
- Related to [004-airesponse-type-conflicts.md](./004-airesponse-type-conflicts.md) for type boundary management
- Related to [002-provider-service-access-pattern.md](./002-provider-service-access-pattern.md) for provider usage
- Common when implementing unified interfaces across multiple AI providers
- Affects streaming and non-streaming response handling equally