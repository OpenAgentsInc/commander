# Fix: AiModel API Misuse - Treating AiModel as Effect

## Problem

When using `@effect/ai-openai`, developers may incorrectly treat the return value of `OpenAiLanguageModel.model()` as an Effect that can be manipulated with Effect combinators, leading to persistent "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" errors at runtime.

### Error Message
```
Error: Service not found: @effect/ai-openai/OpenAiLanguageModel/Config (defined at ...)
```

### Common Anti-Pattern (DO NOT USE)
```typescript
// WRONG - Treating AiModel as an Effect
const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, {
  temperature: 0.7,
  max_tokens: 2048
});

// WRONG - Trying to provide services to it
const configuredAiModelEffect = Effect.provideService(
  aiModelEffectDefinition,
  OpenAiClient.OpenAiClient, 
  ollamaClient
);

// WRONG - Yielding it as if it returns a provider
const provider = yield* _(configuredAiModelEffect);
```

## Root Cause

`OpenAiLanguageModel.model()` returns an `AiModel` object, NOT an Effect. An `AiModel` is:
1. A configuration blueprint for creating a language model
2. Has internal methods like `buildContext` that handle service creation
3. NOT an Effect that can be yielded or manipulated with Effect combinators

The Config service error occurs because:
- The AiModel expects to manage its own Config service internally
- When misused as an Effect, the proper context building never happens
- The library's internal calls to `yield* Config` fail because the service was never created

## Solution

Use the AiModel API as designed by the @effect/ai library:

```typescript
// CORRECT - Following the library's intended usage pattern
const main = Effect.gen(function*() {
  // Step 1: Create an AiModel (just configuration)
  const Gpt4o = OpenAiLanguageModel.model("gpt-4o", {
    temperature: 0.7,
    max_tokens: 2048
  });
  
  // Step 2: Build it to get a Provider (this is where Config is created)
  const gpt4o = yield* Gpt4o;
  
  // Step 3: Use the provider to run programs
  const response = yield* gpt4o.use(
    AiLanguageModel.generateText({
      prompt: "Hello, world!"
    })
  );
});
```

### Why This Pattern Works

1. **Proper Context Building**: Yielding the AiModel triggers its `buildContext` method
2. **Internal Service Management**: The library creates its own Config service
3. **Provider Pattern**: Returns a Provider with a `.use()` method for running programs
4. **No Manual Service Provision**: The library handles all service dependencies internally

## Complete Example

```typescript
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const ollamaClient = yield* _(OllamaAsOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    
    const modelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(
        Effect.orElseSucceed(() => "gemma3:1b")
      )
    );

    // Create the AiModel properly
    const ollamaModel = OpenAiLanguageModel.model(modelName, {
      temperature: 0.7,
      max_tokens: 2048
    });

    // Build it with the necessary client service
    const provider = yield* _(
      ollamaModel.pipe(
        Effect.provide(Layer.succeed(OpenAiClient.OpenAiClient, ollamaClient))
      )
    );

    // Use the provider to implement our service
    return makeAgentLanguageModel({
      generateText: (options) => 
        provider.use(
          AiLanguageModel.generateText({
            prompt: options.prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens
          })
        ).pipe(
          Effect.map(response => new AiResponse({
            parts: response.parts
          })),
          Effect.mapError(error => new AiProviderError({
            message: `Ollama error: ${error}`,
            provider: "Ollama",
            isRetryable: true,
            cause: error
          }))
        ),

      streamText: (options) =>
        Stream.unwrap(
          provider.use(
            Effect.map(
              AiLanguageModel.streamText({
                prompt: options.prompt,
                model: options.model,
                temperature: options.temperature,
                maxTokens: options.maxTokens
              }),
              stream => Stream.map(stream, chunk => new AiResponse({
                parts: chunk.parts
              }))
            )
          )
        ).pipe(
          Stream.mapError(error => new AiProviderError({
            message: `Ollama stream error: ${error}`,
            provider: "Ollama",
            isRetryable: true,
            cause: error
          }))
        )
    });
  })
);
```

## Alternative: Direct Client Usage

If you don't need the AiModel abstraction, use the OpenAI client directly:

```typescript
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const client = yield* _(OllamaAsOpenAIClientTag);
  const modelName = yield* _(/* get model name */);

  return makeAgentLanguageModel({
    generateText: (options) => Effect.gen(function* (_) {
      const response = yield* _(client.client.createChatCompletion({
        model: modelName,
        messages: formatMessages(options.prompt),
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }));
      return mapResponseToAiResponse(response);
    }),
    
    streamText: (options) => 
      Stream.unwrap(
        Effect.map(
          client.stream({
            model: modelName,
            messages: formatMessages(options.prompt),
            temperature: options.temperature,
            max_tokens: options.maxTokens
          }),
          stream => Stream.map(stream, mapChunkToAiResponse)
        )
      )
  });
});
```

## When to Apply This Fix

Apply this pattern when:
1. You see "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" errors
2. You're using `OpenAiLanguageModel.model()` or similar provider model functions
3. You're trying to use Effect combinators on the model object
4. The error persists despite attempts to provide the Config service manually

## Related Issues

- Builds on [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md)
- Related to [002 - Provider Service Access Pattern](./002-provider-service-access-pattern.md)
- Part of broader AI provider integration patterns
- Understanding library APIs before integration is crucial

## Key Lesson

**Read the API documentation carefully**: Libraries often have specific usage patterns that must be followed. The @effect/ai library uses an AiModel → Provider → use() pattern that cannot be circumvented by treating objects as Effects when they're not.