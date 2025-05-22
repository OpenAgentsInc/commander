# Fix: Provider Service Access Pattern for @effect/ai

## Problem

When working with `Provider<AiLanguageModel>` from @effect/ai, direct method access fails:

```typescript
const provider = yield* _(/* ... */);
// This doesn't work:
provider.generateText({ prompt: "..." }); // Property 'generateText' does not exist
```

### Error Message
```
Property 'generateText' does not exist on type 'Provider<AiLanguageModel | Tokenizer>'
```

## Root Cause

The `Provider<T>` interface from @effect/ai doesn't expose service methods directly. It's a dependency injection container that provides services through its `use` method:

```typescript
interface Provider<Provides> {
  readonly use: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>;
}
```

The `Provider` wraps the service and requires explicit service access to call methods like `generateText` or `streamText`.

## Solution

Use the `provider.use()` method with `Effect.gen` to access the service:

```typescript
// For generateText (returns Effect)
generateText: (options: GenerateTextOptions) =>
  provider.use(
    Effect.gen(function* (_) {
      const languageModel = yield* _(AiLanguageModel);
      return yield* _(languageModel.generateText({
        prompt: options.prompt,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences
      }).pipe(
        Effect.mapError((error) => new AiProviderError({
          message: `Provider generateText error: ${error instanceof Error ? error.message : String(error)}`,
          isRetryable: true,
          cause: error
        }))
      ));
    })
  ),

// For streamText (returns Stream - needs Stream.unwrap)
streamText: (options: StreamTextOptions) =>
  Stream.unwrap(
    provider.use(
      Effect.gen(function* (_) {
        const languageModel = yield* _(AiLanguageModel);
        return languageModel.streamText({
          prompt: options.prompt,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          signal: options.signal
        }).pipe(
          Stream.map((aiResponse) => new AiTextChunk({ text: aiResponse.text })),
          Stream.mapError((error) => new AiProviderError({
            message: `Provider streamText error: ${error instanceof Error ? error.message : String(error)}`,
            isRetryable: true,
            cause: error
          }))
        );
      })
    )
  ),
```

### Why This Pattern is Correct

1. **Provider Pattern**: `Provider` is a dependency injection container, not a service itself
2. **Service Access**: The actual service (`AiLanguageModel`) is accessed through `yield* _(AiLanguageModel)`
3. **Effect Composition**: `provider.use()` provides the service to the Effect that needs it
4. **Stream Handling**: Streams returned from services need `Stream.unwrap()` to be extracted from Effects

## Complete Example

```typescript
export const ProviderAgentLanguageModelLive = Effect.gen(function* (_) {
  // ... setup code to get provider ...
  
  const provider = yield* _(
    (aiModel as unknown) as Effect.Effect<
      Provider<AiLanguageModel | Tokenizer>,
      never,
      never
    >
  );

  return makeAgentLanguageModel({
    generateText: (options: GenerateTextOptions) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(AiLanguageModel);
          return yield* _(languageModel.generateText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          }));
        })
      ),

    streamText: (options: StreamTextOptions) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(AiLanguageModel);
            return languageModel.streamText({
              prompt: options.prompt,
              model: options.model,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              signal: options.signal
            }).pipe(
              Stream.map((aiResponse) => new AiTextChunk({ text: aiResponse.text }))
            );
          })
        )
      ),

    generateStructured: (options: GenerateStructuredOptions) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported",
          isRetryable: false
        })
      )
  });
});
```

## Key Points for Stream vs Effect

### Effect Methods (generateText)
- Return `Effect<AiResponse, Error, never>`
- Use `provider.use()` directly
- Wrap with error handling

### Stream Methods (streamText)  
- Return `Stream<AiResponse, Error, never>` 
- Need `Stream.unwrap()` to extract from the Effect returned by `provider.use()`
- Convert `AiResponse` to `AiTextChunk` if needed
- Use `Stream.mapError()` for error handling

## When to Apply This Fix

Apply this pattern when:
1. Working with `Provider<AiLanguageModel>` from @effect/ai
2. Getting "Property does not exist" errors on provider methods
3. Implementing AgentLanguageModel wrappers around @effect/ai providers
4. Converting between different response types (AiResponse → AiTextChunk)

## Related Issues

- Affects all providers using @effect/ai (OpenAI, Ollama, etc.)
- Common when wrapping @effect/ai providers with custom interfaces
- Related to [001-aimodel-provider-type-inference.md](./001-aimodel-provider-type-inference.md) for getting the Provider instance