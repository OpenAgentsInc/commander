# Fix: OpenAiLanguageModel Config Service Context Isolation

## Problem

Even when attempting to provide the `OpenAiLanguageModel.Config` service at multiple levels (runtime, layer, direct provision), the "Service not found" error persists during streaming operations because the @effect/ai-openai library creates isolated execution contexts that don't inherit services from parent contexts.

### Error Message
```
Error: Service not found: @effect/ai-openai/OpenAiLanguageModel/Config (defined at ...)
```

This error typically occurs during:
- `languageModel.streamText()` calls
- `languageModel.generateText()` calls
- Any operation inside `provider.use()`

### Failed Attempts That Don't Work
```typescript
// Attempt 1: Runtime provision (DOESN'T WORK)
Effect.runFork(Effect.provide(program, runtimeWithConfig))

// Attempt 2: Layer-level provision (DOESN'T WORK)
Layer.effect(Tag, Effect.gen(function* (_) {
  const config = { model: "gpt-4", temperature: 0.7 };
  return yield* _(Effect.provideService(impl, OpenAiLanguageModel.Config, config));
}))

// Attempt 3: Direct provision to streams (DOESN'T WORK)
languageModel.streamText(options).pipe(
  Stream.provideService(OpenAiLanguageModel.Config, config)
)
```

## Root Cause

The @effect/ai-openai library's architecture involves multiple execution contexts:

1. **AiModel Creation**: `OpenAiLanguageModel.model()` returns an AiModel with `buildContext` method
2. **Context Building**: The `buildContext` method creates the Config service internally
3. **Provider Pattern**: `provider.use()` creates a new execution context
4. **Context Isolation**: Each new context doesn't automatically inherit services from parent contexts

The library expects the Config service to be created through its own internal mechanisms, not provided externally.

## Solution

Stop trying to provide the Config service manually. Instead, use the library's API correctly:

### Option 1: Use AiModel API Properly
```typescript
const CorrectPattern = Effect.gen(function* (_) {
  // Let the library manage its own Config service
  const model = OpenAiLanguageModel.model("gpt-4", {
    temperature: 0.7,
    max_tokens: 2048
  });
  
  // The library creates Config internally when building
  const provider = yield* model;
  
  // Use through the provider interface
  return yield* provider.use(
    AiLanguageModel.generateText({ prompt: "Hello" })
  );
});
```

### Option 2: Bypass AiModel Abstraction
```typescript
const DirectClientPattern = Effect.gen(function* (_) {
  const client = yield* _(OpenAiClient.OpenAiClient);
  
  // Use the client directly without AiModel abstraction
  const response = yield* _(client.client.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello" }],
    temperature: 0.7,
    max_tokens: 2048
  }));
  
  return response;
});
```

## Complete Example: Correct Layer Implementation

```typescript
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const ollamaClient = yield* _(OllamaAsOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    
    const modelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(
        Effect.orElseSucceed(() => "llama2")
      )
    );

    // Option 1: Use AiModel correctly
    const ollamaModel = OpenAiLanguageModel.model(modelName, {
      temperature: 0.7,
      max_tokens: 2048
    });

    // Provide only the client service the model actually needs
    const provider = yield* _(
      ollamaModel.pipe(
        Effect.provide(Layer.succeed(OpenAiClient.OpenAiClient, ollamaClient))
      )
    );

    // Implement using provider.use()
    return {
      generateText: (options) => 
        provider.use(
          Effect.gen(function* (_) {
            const model = yield* _(AiLanguageModel.AiLanguageModel);
            return yield* _(model.generateText({
              messages: options.messages,
              model: options.model
            }));
          })
        ),
      
      streamText: (options) =>
        Stream.unwrap(
          provider.use(
            Effect.gen(function* (_) {
              const model = yield* _(AiLanguageModel.AiLanguageModel);
              return model.streamText({
                messages: options.messages,
                model: options.model
              });
            })
          )
        )
    };
  })
);

// Option 2: Direct client implementation (simpler)
export const OllamaAgentLanguageModelDirectLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const client = yield* _(OllamaAsOpenAIClientTag);
    const modelName = yield* _(/* get model name */);

    return {
      generateText: (options) => 
        Effect.gen(function* (_) {
          const response = yield* _(client.client.createChatCompletion({
            model: modelName,
            messages: options.messages,
            temperature: options.temperature
          }));
          return mapToAgentResponse(response);
        }),
      
      streamText: (options) =>
        Stream.unwrap(
          Effect.map(
            client.stream({
              model: modelName,
              messages: options.messages,
              temperature: options.temperature
            }),
            stream => Stream.map(stream, mapToAgentResponse)
          )
        )
    };
  })
);
```

## Why Manual Config Provision Fails

The library's internal code does:
```typescript
// Inside OpenAiLanguageModel
const makeRequest = Effect.gen(function* (_) {
  const config = yield* Config;  // Expects Config in its own context
  // ...
});
```

This happens in a context created by `provider.use()`, which is isolated from:
- Your runtime context
- Your layer context  
- Any services you try to provide externally

## When to Apply This Fix

Apply this understanding when:
1. Config service errors persist despite multiple provision attempts
2. You're trying to manually provide internal library services
3. The error occurs during streaming or generation operations
4. You've tried runtime, layer, and direct provision without success

## Related Issues

- Caused by misunderstanding documented in [019 - AiModel API Misuse](./019-aimodel-api-misuse.md)
- Related to Effect's context isolation patterns
- Similar to other library integration issues where internal service management is expected

## Key Lessons

1. **Library Design Matters**: Some libraries manage their own services internally
2. **Context Isolation**: Effect's execution contexts don't always inherit parent services
3. **API Over Implementation**: Use the library's public API rather than trying to manipulate its internals
4. **When in Doubt, Simplify**: If the abstraction fights you, consider using lower-level APIs directly