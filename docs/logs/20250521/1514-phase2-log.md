# AI Phase 2 Implementation - TypeScript Fixes

## Overview

I'm working on the implementation of Phase 2 of the AI roadmap, specifically fixing TypeScript errors in the OpenAI provider implementation.

## Reading the Instructions

I've read the specific instructions from `docs/logs/20250521/1514-phase2-instructions.md`, which outlines the exact fixes needed to resolve TypeScript errors. The key fixes are:

1. Modify the `AgentLanguageModel` interface to use `AIProviderError` instead of `AiError` from `@effect/ai`
2. Fix the Redacted API key handling in `OpenAIClientLive`
3. Fix test file issues (naming, mocking, and Effect usage patterns)

## Implementation Progress

I've started implementing the fixes as instructed:

### 1. AgentLanguageModel Interface Updates

Modified `src/services/ai/core/AgentLanguageModel.ts` to:
- Remove the import and re-export of `AiError` from `@effect/ai/AiError`
- Add import of `AIProviderError` from our custom error types
- Change all method signatures to use `AIProviderError` instead of `AiError`:
  - `generateText`: `Effect.Effect<AiResponse, AIProviderError>`
  - `streamText`: `Stream.Stream<AiTextChunk, AIProviderError>`
  - `generateStructured`: `Effect.Effect<AiResponse, AIProviderError>`

### 2. OpenAIClientLive Fixes

Updated `src/services/ai/providers/openai/OpenAIClientLive.ts` to:
- Replace the custom `Redacted` class with the proper import from `effect`
- Use `Redacted.make(apiKey)` instead of `new Redacted(apiKey)`

### 3. OpenAIAgentLanguageModelLive Fixes

Updated `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts` to:
- Remove the import of `AiError` since it's no longer needed
- Update the mock OpenAiLanguageModel implementation to use AIProviderError instead of AiError

### 4. Runtime Tests Fixes

Updated `src/tests/unit/services/runtime.test.ts` to:
- Remove the `runPromiseAny` helper function
- Fix the Effect.provide syntax in tests using the correct pattern
- Use `Effect.runPromise` directly on Effects

## Type Checking Progress

Running `pnpm run t` to check the TypeScript types. We still have several errors:

1. In the main OpenAIAgentLanguageModelLive.ts file:
   - The mock implementation was using the old AiError type - fixed now by changing to AIProviderError

2. In the test files:
   - OpenAIClientLive.test.ts: Missing/wrong variable names (mockConfigService, mockTelemetryService)
   - OpenAIAgentLanguageModelLive.test.ts: Wrong usage of AgentLanguageModel.Tag
   - Various Effect type problems with the R channel not resolving to never

I'll continue working on these issues according to the instructions.

## Next Steps

1. Complete the fixes for the test files with the exact changes shown in the instructions
2. Run TypeScript type checking again to verify fixes
3. Run tests to ensure everything works as expected

I'll document the results and any challenges in the next update.