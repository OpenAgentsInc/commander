# Fix: AiModel to Provider Type Inference Issue

## Problem

When using `@effect/ai-openai` with Effect's generator syntax, TypeScript fails to infer that yielding an `AiModel` produces a `Provider`:

```typescript
const aiModel = yield* _(configuredAiModelEffect);
const provider = yield* _(aiModel); // TypeScript infers 'unknown'
```

### Error Message
```
Type 'Provider<Tokenizer | AiLanguageModel>' is not assignable to type 'Effect<unknown, unknown, unknown>'
```

## Root Cause

TypeScript cannot infer through the inheritance chain:
- `AiModel` extends `AiPlan`
- `AiPlan` extends `Builder<Provides, Requires>`
- `Builder<Provides, Requires>` = `Effect<Provider<Provides>, never, Requires>`

Therefore, `AiModel` IS an `Effect` that produces a `Provider`, but TypeScript's inference engine can't see through these multiple levels of generic type inheritance.

## Solution

Add an explicit type cast to help TypeScript understand the inheritance:

```typescript
import type { Provider } from "@effect/ai/AiPlan";
import type { AiLanguageModel } from "@effect/ai";

// After getting the AiModel
const aiModel = yield* _(configuredAiModelEffect);

// Cast it to its Effect nature before yielding
const provider = yield* _(
  aiModel as Effect.Effect<
    Provider<AiLanguageModel.AiLanguageModel>,
    never,
    never
  >
);
```

### Why This Cast is Safe

1. `AiModel<Provides, Requires>` extends `Builder<Provides, Requires>` by definition
2. `Builder<Provides, Requires>` is a type alias for `Effect<Provider<Provides>, never, Requires>`
3. Therefore, any `AiModel` instance is also an `Effect` that yields a `Provider`
4. The cast merely helps TypeScript's inference engine understand what's already true at the type level

## Complete Example

```typescript
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const ollamaClient = yield* _(OllamaOpenAIClientTag);
  const configService = yield* _(ConfigurationService);
  const telemetry = yield* _(TelemetryService);

  const modelName = yield* _(
    configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "gemma3:1b")
    )
  );

  // Step 1: Create the AiModel definition
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

  // Step 2: Provide dependencies
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    ollamaClient
  );

  // Step 3: Get the AiModel instance
  const aiModel = yield* _(configuredAiModelEffect);

  // Step 4: Get the Provider with explicit cast
  const provider = yield* _(
    aiModel as Effect.Effect<
      Provider<AiLanguageModel.AiLanguageModel>,
      never,
      never
    >
  );

  // Now use the provider to implement AgentLanguageModel
  return makeAgentLanguageModel({
    generateText: (options) =>
      provider.generateText({
        prompt: options.prompt,
        // ... other options
      }),
    // ... other methods
  });
});
```

## Alternative Patterns

### Using Effect.flatMap

If you prefer to avoid the generator syntax for this specific operation:

```typescript
const provider = yield* _(
  configuredAiModelEffect.pipe(
    Effect.flatMap((aiModel) => 
      aiModel as Effect.Effect<Provider<AiLanguageModel.AiLanguageModel>, never, never>
    )
  )
);
```

### Type Helper

For reusability across multiple providers:

```typescript
type AsEffect<T> = T extends Effect.Effect<any, any, any> ? T : never;

const provider = yield* _(aiModel as AsEffect<typeof aiModel>);
```

## When to Apply This Fix

Apply this fix when:
1. You're yielding an `AiModel` instance from `@effect/ai`
2. TypeScript infers the result as `unknown` or shows type errors
3. The error mentions `Provider` not being assignable to `Effect`

## Related Issues

- Affects all providers using `@effect/ai-openai` or similar libraries
- More pronounced with union types (e.g., `AiLanguageModel | Tokenizer`)
- May appear in other Effect libraries with deep inheritance hierarchies