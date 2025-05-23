# Fix: AiModel to Provider Type Inference Issue (CORRECTED)

## Problem

When using `@effect/ai-openai` with Effect's generator syntax, you might think you need to yield the provider instance again after getting it from the configured effect. This leads to runtime errors.

### Error Message
```
TypeError: yield* (intermediate value)(intermediate value)(intermediate value) is not iterable
```

### Common Anti-Pattern (DO NOT USE)
```typescript
// WRONG - This causes runtime errors:
const aiModel = yield* _(configuredAiModelEffect);      // Gets provider
const provider = yield* _(aiModel as Effect);           // ERROR: Double yield!
```

## Root Cause

The `configuredAiModelEffect` already returns the provider directly. Attempting to yield it again treats a provider instance as if it were an Effect, causing runtime errors.

The confusion arises because:
1. `OpenAiLanguageModel.model()` returns an Effect that produces a Provider
2. After providing dependencies with `Effect.provideService()`, the result is still an Effect
3. Yielding this configured Effect gives you the **provider directly** - no further yielding needed

## Solution

Get the provider directly from the configured Effect - **no double yielding**:

```typescript
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel } from "@effect/ai/AiLanguageModel";

// Step 1: Create the configured Effect
const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
  temperature: 0.7,
  max_tokens: 2048
});

const configuredAiModelEffect = Effect.provideService(
  aiModelEffectDefinition,
  OpenAiClient.OpenAiClient,
  client
);

// Step 2: Get the provider directly (CORRECT)
const provider = yield* _(configuredAiModelEffect);
```

### Why This Pattern is Correct

1. **Single Yield**: The configured Effect produces a Provider when yielded
2. **No Type Casting**: No complex type assertions needed
3. **Runtime Safe**: Provider instances are not Effects and cannot be yielded again
4. **Clear Intent**: Code directly expresses what it's doing

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

  // Step 1: Create the AiModel definition with options
  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
    temperature: 0.7,
    max_tokens: 2048
  });

  // Step 2: Provide dependencies
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    ollamaClient
  );

  // Step 3: Get the provider directly (CORRECTED)
  const provider = yield* _(configuredAiModelEffect);

  // Now use the provider to implement AgentLanguageModel
  return makeAgentLanguageModel({
    generateText: (options: GenerateTextOptions) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(AiLanguageModel);
          const effectAiResponse = yield* _(languageModel.generateText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          }));
          // Map to application AiResponse type
          return new AiResponse({
            parts: effectAiResponse.parts
          });
        })
      ).pipe(
        Effect.mapError((error) =>
          new AiProviderError({
            message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
            provider: "Ollama",
            isRetryable: true,
            cause: error
          })
        )
      ),
    // ... other methods using provider.use() pattern
  });
});
```

## Runtime Validation

✅ **Tested in**: `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.runtime.test.ts`  
✅ **Integration**: Validated in actual application startup  
✅ **Negative test**: Confirmed double yield pattern fails with "yield* not iterable" error

## Anti-Pattern Examples (DO NOT USE)

```typescript
// WRONG - Double yield causes runtime error
const aiModel = yield* _(configuredAiModelEffect);
const provider = yield* _(aiModel as Effect);  // ERROR!

// WRONG - Complex type casting that's unnecessary  
const provider = yield* _(
  (aiModel as unknown) as Effect.Effect<Provider<...>, never, never>
);
```

## When to Apply This Fix

Apply this pattern when:
1. Working with `@effect/ai-openai` or similar provider libraries
2. You get runtime errors like "yield* not iterable" 
3. You're tempted to yield a provider instance as an Effect
4. TypeScript compilation passes but runtime fails

## Related Issues

- Closely related to [014 - Double Yield Provider Error](./014-double-yield-provider-error.md)
- Connected to [002 - Provider Service Access Pattern](./002-provider-service-access-pattern.md) for using the provider correctly
- Prevented by [013 - Runtime Error Detection Testing](./013-runtime-error-detection-testing.md) testing strategies

## Key Lesson

**Trust but verify**: Even if TypeScript compiles and documentation suggests a pattern, runtime testing is essential to validate Effect generator patterns work correctly.