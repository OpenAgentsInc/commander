# Fix: AiResponse Type Conflicts Between Core and @effect/ai

## Problem

When working with both custom AiResponse types and @effect/ai's AiResponse, TypeScript reports type conflicts:

```typescript
// Using our custom AiResponse where @effect/ai AiResponse is expected
return Stream.async<AiResponse, HttpClientError>(...); // Type error
```

### Error Message
```
Property '[TypeId]' is missing in type 'import(".../src/services/ai/core/AiResponse").AiResponse' but required in type 'import(".../node_modules/@effect/ai/dist/dts/AiResponse").AiResponse'
```

## Root Cause

There are two different `AiResponse` types in the codebase:

1. **Our Custom AiResponse** (`src/services/ai/core/AiResponse.ts`):
   ```typescript
   export class AiResponse extends Data.TaggedClass("AiResponse")<{
     text: string;
     toolCalls?: Array<{...}>;
     metadata?: {...};
   }> {}
   ```

2. **@effect/ai AiResponse** (`@effect/ai/AiResponse`):
   ```typescript
   export class AiResponse extends AiResponse_base {
     readonly [TypeId]: TypeId;
     parts: Array<TextPart | ToolCallPart | ...>;
   }
   ```

These types have different properties and different `TypeId` symbols, making them incompatible.

## Solution

Use the appropriate AiResponse type for each context:

### For @effect/ai Integration (Clients/Adapters)
```typescript
// Import @effect/ai's AiResponse
import * as AiResponse from "@effect/ai/AiResponse";

// Use in client implementations that need to return @effect/ai compatible types
export const streamClient = (params: StreamCompletionRequest) => {
  return Stream.async<AiResponse.AiResponse, HttpClientError>((emit) => {
    // ...
    const aiResponse = new AiResponse.AiResponse({
      parts: content ? [{
        _tag: "TextPart" as const,
        text: content
      }] : []
    });
    emit.single(aiResponse);
  });
};
```

### For Application Logic (Services/Components)
```typescript
// Import our custom AiResponse
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse";

// Use in application services that work with our domain model
export const generateText = (options: GenerateTextOptions) => {
  return Effect.gen(function* (_) {
    // ... call provider ...
    return new AiResponse({
      text: "Generated text",
      metadata: { usage: { totalTokens: 100 } }
    });
  });
};
```

### Type Conversion When Needed
```typescript
// Convert between types when crossing boundaries
const convertToOurAiResponse = (effectAiResponse: AiResponse.AiResponse): AiResponse => {
  return new AiResponse({
    text: effectAiResponse.text,
    // Map other properties as needed
  });
};

const convertToAiTextChunk = (effectAiResponse: AiResponse.AiResponse): AiTextChunk => {
  return new AiTextChunk({
    text: effectAiResponse.text
  });
};
```

## Namespace Import Pattern

When using @effect/ai's AiResponse, import it as a namespace to avoid conflicts:

```typescript
// ✅ Correct - namespace import
import * as AiResponse from "@effect/ai/AiResponse";

// Usage:
const response = new AiResponse.AiResponse({ parts: [...] });
const streamType: Stream<AiResponse.AiResponse, Error> = ...;

// ❌ Incorrect - creates naming conflict
import { AiResponse } from "@effect/ai"; // Conflicts with our AiResponse
```

## Complete Example: Ollama Client

```typescript
// File: OllamaAsOpenAIClientLive.ts
// This file implements an OpenAI-compatible client for @effect/ai
import * as AiResponse from "@effect/ai/AiResponse"; // Use @effect/ai's type

export const OllamaAsOpenAIClientLive = Layer.succeed(
  OpenAiClient.OpenAiClient,
  {
    // Stream method must return @effect/ai's AiResponse
    stream: (params: StreamCompletionRequest) => {
      return Stream.async<AiResponse.AiResponse, HttpClientError>((emit) => {
        // Process chunks and emit @effect/ai compatible responses
        const content = chunk.choices?.[0]?.delta?.content || "";
        const aiResponse = new AiResponse.AiResponse({
          parts: content ? [{
            _tag: "TextPart" as const,
            text: content
          }] : []
        });
        emit.single(aiResponse);
      });
    }
  }
);
```

## Complete Example: Application Service

```typescript
// File: AgentLanguageModelLive.ts  
// This file implements our application's AI service interface
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse"; // Use our types

export const AgentLanguageModelLive = Effect.gen(function* (_) {
  // ...
  return makeAgentLanguageModel({
    generateText: (options) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(AiLanguageModel);
          // @effect/ai returns its AiResponse, we convert to ours
          const effectAiResponse = yield* _(languageModel.generateText(options));
          return new AiResponse({
            text: effectAiResponse.text,
            // Map additional properties from effectAiResponse if needed
          });
        })
      ),

    streamText: (options) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(AiLanguageModel);
            return languageModel.streamText(options).pipe(
              // Convert @effect/ai's AiResponse to our AiTextChunk
              Stream.map((effectAiResponse) => new AiTextChunk({ 
                text: effectAiResponse.text 
              }))
            );
          })
        )
      )
  });
});
```

## Import Guidelines

### Client/Adapter Layer (talks to @effect/ai)
```typescript
import * as AiResponse from "@effect/ai/AiResponse";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";
import { OpenAiClient } from "@effect/ai-openai";
```

### Application/Service Layer (uses our domain types)
```typescript
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse";
import { AgentLanguageModel } from "@/services/ai/core";
```

### UI/Component Layer (uses our domain types)
```typescript
import { AiResponse, AiTextChunk } from "@/services/ai/core/AiResponse";
// UI components work with our simplified types
```

## When to Apply This Fix

Apply this pattern when:
1. You see `[TypeId]` missing errors between AiResponse types
2. Working on client adapters that interface with @effect/ai
3. Implementing application services that wrap @effect/ai providers  
4. Converting between streaming and non-streaming AI responses
5. Building UI components that consume AI responses

## Related Issues

- Essential for clean architecture: separate @effect/ai integration from domain logic
- Prevents type leakage from third-party libraries into application code
- Related to [002-provider-service-access-pattern.md](./002-provider-service-access-pattern.md) for accessing providers
- Common in AI applications that wrap multiple providers behind a unified interface