# Next Coding Agent Instructions - Effect AI Refactor Completion

## Context
The Effect AI upgrade from v0.2.0 to v0.16.5 has made significant progress. The core architectural issues have been resolved, and we've identified the root causes of remaining TypeScript errors. This document provides step-by-step instructions for completing the refactor.

## Current Status
- ✅ File casing conflicts resolved
- ✅ Core exports fixed  
- ✅ Service access patterns updated
- ✅ Provider implementations modernized
- ✅ Runtime layer composition fixed
- ⚠️ **167 TypeScript errors** (increased due to Ollama provider changes)
- ⚠️ **4 test files failing** (20 failed tests out of 238)
- ⚠️ Critical issues in Ollama provider using wrong AiLanguageModel.make pattern

## Priority Tasks

### Task 1: Revert Ollama Provider to Working Implementation (CRITICAL PRIORITY)

**Location**: `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`

**Problem**: A previous coding agent changed the Ollama provider to use `AiLanguageModel.make()` directly, which broke the established @effect/ai patterns and introduced multiple type errors:
- Using wrong API (`createChatCompletion` doesn't exist on the client)
- AiResponse type mismatch (our AiResponse vs @effect/ai AiResponse)  
- Wrong options interface (`AiLanguageModelOptions` vs our options)
- Increased TypeScript errors from 152 to 167

**Current Errors**:
```
Property 'createChatCompletion' does not exist on type 'Service'
Property '[TypeId]' is missing in type 'AiResponse' but required in type 'AiResponse'
Property 'model' does not exist on type 'AiLanguageModelOptions'
```

**Solution**: **REVERT** the recent changes and restore the working pattern that matches the OpenAI provider

**Critical Note**: The OpenAI provider uses the correct @effect/ai pattern. We need to use the same pattern for Ollama, not bypass it with direct `AiLanguageModel.make()` calls.

**Steps**:
1. Replace the entire `OllamaAgentLanguageModelLive` implementation with the proven pattern:
   ```typescript
   export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
     const ollamaClient = yield* _(OllamaOpenAIClientTag);
     const configService = yield* _(ConfigurationService);
     const telemetry = yield* _(TelemetryService);

     const modelName = yield* _(
       configService.get("OLLAMA_MODEL_NAME").pipe(
         Effect.orElseSucceed(() => "gemma3:1b"),
         Effect.tap((name) =>
           telemetry.trackEvent({
             category: "ai:config",
             action: "ollama_model_name_resolved",
             value: name,
           })
         )
       )
     );

     // Step 1: Get the AiModel definition Effect
     const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

     // Step 2: Provide the client dependency
     const configuredAiModelEffect = Effect.provideService(
       aiModelEffectDefinition,
       OpenAiClient.OpenAiClient,
       ollamaClient
     );

     // Step 3: Get the AiModel instance
     const aiModel = yield* _(configuredAiModelEffect);

     // Step 4: Build the provider with type cast
     const provider = yield* _(
       aiModel as Effect.Effect<
         Provider<AiLanguageModel.AiLanguageModel>,
         never,
         never
       >
     );

     yield* _(
       telemetry.trackEvent({
         category: "ai:config",
         action: "ollama_language_model_created",
         value: modelName,
       })
     );

     return makeAgentLanguageModel({
       generateText: (options: GenerateTextOptions) =>
         provider.generateText({
           prompt: options.prompt,
           model: options.model,
           temperature: options.temperature,
           maxTokens: options.maxTokens,
           stopSequences: options.stopSequences
         }).pipe(
           Effect.mapError((error) =>
             new AiProviderError({
               message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
               isRetryable: true,
               cause: error
             })
           )
         ),

       streamText: (options: StreamTextOptions) =>
         provider.streamText({
           prompt: options.prompt,
           model: options.model,
           temperature: options.temperature,
           maxTokens: options.maxTokens,
           signal: options.signal
         }).pipe(
           Stream.mapError((error) =>
             new AiProviderError({
               message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
               isRetryable: true,
               cause: error
             })
           )
         ),

       generateStructured: (options: GenerateStructuredOptions) =>
         Effect.fail(
           new AiProviderError({
             message: "generateStructured not supported by Ollama provider",
             isRetryable: false
           })
         )
     });
   });
   ```

2. Add necessary imports:
   ```typescript
   import { OpenAiLanguageModel } from "@effect/ai-openai";
   import type { Provider } from "@effect/ai/AiPlan";
   import type { AiLanguageModel } from "@effect/ai";
   ```

3. Verify the fix: `pnpm run t 2>&1 | grep -A5 -B5 "OllamaAgentLanguageModelLive"`

**Expected Result**: Should reduce TypeScript errors significantly (~15-20 errors eliminated)

### Task 2: Fix ChatOrchestratorService Stream/Effect Mixing (HIGH PRIORITY)

**Location**: `src/services/ai/orchestration/ChatOrchestratorService.ts:56-57`

**Problem**: Using `Effect.retry` on a Stream instead of an Effect
```typescript
return Stream.unwrap(
  Effect.retry(
    activeAgentLM.streamText(streamOptions), // Returns Stream, not Effect
    retrySchedule
  )
)
```

**Solution**: 
1. Replace the problematic `streamConversation` implementation with:
   ```typescript
   streamConversation: ({ messages, preferredProvider, options }) => {
     runTelemetry({ 
       category: "orchestrator", 
       action: "stream_conversation_start", 
       label: preferredProvider.key 
     });

     const streamOptions: StreamTextOptions = {
       ...options,
       prompt: JSON.stringify({ messages }),
       model: preferredProvider.modelName,
     };

     // Use Stream.retry instead of Effect.retry
     return activeAgentLM.streamText(streamOptions).pipe(
       Stream.retry(
         Schedule.intersect(
           Schedule.recurs(preferredProvider.key === "ollama" ? 2 : 0),
           Schedule.exponential("100 millis")
         ).pipe(
           Schedule.whileInput((err: AiProviderError | AiConfigurationError) =>
             err._tag === "AiProviderError" && err.isRetryable === true
           )
         )
       ),
       Stream.tapError((err) => runTelemetry({
         category: "orchestrator",
         action: "stream_error", 
         label: (err as Error).message
       }))
     );
   }
   ```

2. Verify by checking: `pnpm run t 2>&1 | grep -B2 -A2 "ChatOrchestratorService"`

### Task 3: Fix NIP90 Provider Naming Collision (MEDIUM PRIORITY)

**Location**: `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts:261`

**Problem**: Layer export has same name as the Effect, causing confusion

**Steps**:
1. Rename the Effect (keep it internal):
   ```typescript
   const nip90AgentLanguageModelEffect = Effect.gen(function* (_) {
     // ... existing implementation
   });

   export const NIP90AgentLanguageModelLive = Layer.effect(
     AgentLanguageModel.Tag,
     nip90AgentLanguageModelEffect
   );
   ```

2. Update any imports that might reference the old naming

### Task 4: Create Test Utilities and Fix Test Files (MEDIUM PRIORITY)

**Create Test Helper**: `src/tests/helpers/effect-test-utils.ts`
```typescript
import { Effect, Layer, Context } from "effect";

/**
 * Helper for providing layers in tests - replaces Effect.provideLayer
 */
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, any>,
  layer: Layer.Layer<any, any, any>
) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

/**
 * Mock service creator helper
 */
export const mockService = <I, S>(
  tag: Context.Tag<I, S>,
  implementation: S
): Layer.Layer<I, never, never> => 
  Layer.succeed(tag, implementation);

/**
 * Helper for service access in tests
 */
export const getService = <I, S>(tag: Context.Tag<I, S>) =>
  Effect.service(tag);
```

**Update Test Pattern**: For each test file with `Effect.provideLayer` errors:

1. **Find and Replace Pattern**:
   ```bash
   # Find files with the old pattern
   find src/tests -name "*.ts" -exec grep -l "Effect.provideLayer" {} \;
   
   # Replace pattern
   Effect.provideLayer(layer) → Effect.provide(layer)
   ```

2. **Service Access Pattern**:
   ```typescript
   // Old: yield* _(ServiceTag)
   // New: yield* _(ServiceTag.Tag)
   ```

3. **Error Construction Pattern**:
   ```typescript
   // Old: ErrorClass.of(...)
   // New: new ErrorClass(...)
   ```

### Task 5: Batch Fix Remaining Issues (LOW PRIORITY)

**Missing Exports**: Fix any remaining `TS2305` errors by updating index.ts files

**Service Access**: Fix any remaining `AgentLanguageModel` → `AgentLanguageModel.Tag` issues

**Error References**: Fix any remaining `AIProviderError` → `AiProviderError` issues

## Verification Steps

After each task, run these checks:

1. **Type Check**: `pnpm run t 2>&1 | wc -l` (should decrease)
2. **Specific File**: `pnpm run t 2>&1 | grep "filename"` 
3. **Build Check**: `pnpm run lint`
4. **Test Run**: `pnpm test` (once major errors are fixed)

## Success Criteria

1. **TypeScript Errors**: Reduced to <50 errors (from current 167)
2. **Core Functionality**: No errors in main provider files (especially Ollama)
3. **Test Suite**: All tests passing (currently 20 failing tests)
4. **Modern Effect patterns**: Used throughout the codebase
5. **Documentation**: All fixes documented in `docs/fixes/`

## Common Pitfalls to Avoid

1. **Don't use `as any`** - Use specific type assertions as shown in fixes
2. **Don't mix Stream and Effect retry patterns** - Use Stream.retry for streams
3. **Remember Layer vs Effect** - Layers create services, Effects use them
4. **Check variance** - `in out` types require exact matching
5. **Service Tags** - Always use `.Tag` for service access

## Resources

- **Fix Documentation**: `docs/fixes/README.md`
- **Type Analysis**: `docs/logs/20250522/1228-next-steps-analysis.md`
- **Previous Progress**: `docs/logs/20250522/1202-effect-refactor-log.md`
- **Effect Docs**: https://effect.website/docs/requirements-management/layers/

## Estimated Time

- **Task 1**: 30 minutes (critical Ollama provider fix)
- **Task 2**: 30 minutes (ChatOrchestratorService architectural change)
- **Task 3**: 10 minutes (NIP90 naming collision)
- **Task 4**: 1-2 hours (create utilities + batch test updates)
- **Task 5**: 30 minutes (cleanup remaining issues)

**Total**: 3-3.5 hours to complete the refactor

## Critical Notes for Task 1

The Ollama provider was recently changed to use `AiLanguageModel.make()` directly, but this bypasses the established @effect/ai patterns and creates type mismatches. The proven working pattern is:

1. Use `OpenAiLanguageModel.model()` to create an AiModel
2. Provide dependencies with `Effect.provideService()`
3. Yield the AiModel to get a Provider
4. Use the Provider to implement our AgentLanguageModel interface

This pattern works in the OpenAI provider and should be used consistently across all providers.

## Final Notes

The hard work is done - these are primarily mechanical fixes now. Focus on the type inference issue first as it's blocking other providers. The ChatOrchestratorService fix is architectural but straightforward. Everything else is cleanup and modernization.

When complete, this codebase will be using modern @effect/ai patterns with full type safety.