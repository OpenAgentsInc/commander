# The OpenAiLanguageModel.Config Service Resolution Saga - FINAL FIX

## The Problem

The error "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" persisted through multiple fix attempts, occurring specifically during streaming operations in the Agent Chat feature.

## Why Previous Fixes Failed

### Fix 1: Runtime Context (useAgentChat.ts)
```typescript
Effect.runFork(Effect.provide(program, runtimeRef.current))
```
**Why it failed**: This provided the runtime context to the initial Effect, but not to the execution contexts created later by `provider.use()`.

### Fix 2: Layer-Level Service Provision
```typescript
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    // Create Config service at Layer level
    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: 0.7,
      max_tokens: 2048,
    };
    return yield* _(Effect.provideService(
      OllamaAgentLanguageModelLive, 
      OpenAiLanguageModel.Config, 
      openAiModelConfigServiceValue
    ));
  })
);
```
**Why it failed**: This made the Config service available during service construction, but not in the execution context created by `provider.use()`.

### Fix 3: Model Effect Service Provision
```typescript
const configuredAiModelEffect = Effect.provideService(
  Effect.provideService(
    aiModelEffectDefinition,
    OpenAiLanguageModel.Config,
    modelConfig
  ),
  OpenAiClient.OpenAiClient, 
  ollamaClient
);
```
**Why it failed**: This provided the Config service to the model creation effect, but again, not to the execution context created by `provider.use()`.

## The Root Cause

The @effect/ai-openai library uses a pattern where:

1. `OpenAiLanguageModel.model()` creates a model provider
2. The provider has a `use()` method that creates a NEW execution context
3. Inside that context, `languageModel.streamText()` is called
4. The `languageModel.streamText()` method needs the `OpenAiLanguageModel.Config` service

The key insight: **`provider.use()` creates a new execution context that doesn't inherit services from the parent context**.

## The Final Solution

Provide the Config service directly to the Effect created inside `provider.use()`:

```typescript
streamText: (options: StreamTextOptions) =>
  Stream.unwrap(
    provider.use(
      Effect.gen(function* (_) {
        const languageModel = yield* _(AiLanguageModel);
        return languageModel.streamText({
          // ... options
        }).pipe(
          // ... stream transformations
        );
      }).pipe(
        // THE FIX: Provide Config service to THIS execution context
        Effect.provideService(OpenAiLanguageModel.Config, modelConfig)
      )
    )
  ),
```

## Why This Works

1. `provider.use()` creates a new execution context
2. The generator function runs in that context
3. Before the generator runs, we pipe it through `Effect.provideService()` 
4. This ensures the Config service is available when `languageModel.streamText()` needs it

## Lessons Learned

1. **Context Isolation**: Effect's `provider.use()` pattern creates isolated execution contexts
2. **Service Propagation**: Services must be explicitly provided to each execution context
3. **Library Internals**: Understanding how third-party Effect libraries use services internally is crucial
4. **Multiple Contexts**: A single operation can involve multiple execution contexts that each need their own service provisions

## Testing the Fix

The fix was validated by:
1. All 259 unit tests passing
2. Manual testing in the Electron app confirming streaming works
3. No more "Service not found" errors in telemetry

## Future Considerations

When working with Effect libraries that use the provider pattern:
1. Always check if `provider.use()` is creating new contexts
2. Provide required services to each execution context explicitly
3. Test streaming operations separately from non-streaming ones
4. Add debug telemetry to track service resolution at each level