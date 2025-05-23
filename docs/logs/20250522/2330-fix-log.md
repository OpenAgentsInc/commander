# Fix Log: Resolving OpenAiLanguageModel Config Service Error

## Issue Summary
The persistent "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" error is caused by incorrectly treating the AiModel object as an Effect and trying to manipulate it with Effect combinators. The solution is to use the @effect/ai library's API correctly.

## Starting Tests
Let me first run the tests to see the current state:

Tests are passing but there are several skipped tests. Looking at the implementation, I can see the exact anti-pattern described in the analysis:

```typescript
// WRONG - Treating AiModel as an Effect
const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName as any, {
  temperature: modelConfig.temperature,
  max_tokens: modelConfig.max_tokens
});

// WRONG - Trying to provide services to it
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

## Fixing OllamaAgentLanguageModelLive

Fixed the implementation to use the AiModel API correctly:
1. Removed the anti-pattern of treating AiModel as an Effect
2. Used the proper pattern: create AiModel → build with client → use provider
3. Removed manual Config service provision
4. Simplified the Layer to just use the implementation directly

## Fixing OpenAIAgentLanguageModelLive

Applied the same fixes to the OpenAI implementation:
1. Removed Effect.provideService calls on AiModel
2. Used the correct AiModel → Provider pattern
3. Removed manual Config service management
4. Cleaned up unused imports

## Running Tests