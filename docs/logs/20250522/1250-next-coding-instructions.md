# Next Coding Agent Instructions - Effect AI Refactor Completion

## Context
The Effect AI upgrade from v0.2.0 to v0.16.5 has made significant progress. The core architectural issues have been resolved, and we've identified the root causes of remaining TypeScript errors. This document provides step-by-step instructions for completing the refactor.

## Current Status
- ✅ File casing conflicts resolved
- ✅ Core exports fixed  
- ✅ Service access patterns updated
- ✅ Provider implementations modernized
- ✅ Runtime layer composition fixed
- ⚠️ ~152 TypeScript errors remaining (down from 150+)
- ⚠️ 4 critical type inference issues identified

## Priority Tasks

### Task 1: Fix Ollama Provider Type Inference (HIGH PRIORITY)

**Location**: `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts:57`

**Problem**: 
```typescript
const provider = yield* _(aiModel); // TypeScript infers 'unknown'
```

**Solution**: Apply the fix documented in `docs/fixes/001-aimodel-provider-type-inference.md`

**Steps**:
1. Add import at top of file:
   ```typescript
   import type { Provider } from "@effect/ai/AiPlan";
   import type { AiLanguageModel } from "@effect/ai";
   ```

2. Replace line 57 with:
   ```typescript
   const provider = yield* _(
     aiModel as Effect.Effect<
       Provider<AiLanguageModel.AiLanguageModel>,
       never,
       never
     >
   );
   ```

3. Verify the fix by running: `pnpm run t 2>&1 | grep -B2 -A2 "OllamaAgentLanguageModelLive"`

**Expected Result**: The `'provider' is of type 'unknown'` errors should disappear.

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

1. **TypeScript Errors**: Reduced to <50 errors (from current ~152)
2. **Core Functionality**: No errors in main provider files
3. **Test Suite**: Modern Effect patterns used throughout
4. **Documentation**: All fixes documented in `docs/fixes/`

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

- **Task 1**: 15 minutes (critical fix)
- **Task 2**: 30 minutes (architectural change)
- **Task 3**: 10 minutes (simple rename)
- **Task 4**: 1-2 hours (create utilities + batch updates)
- **Task 5**: 30 minutes (cleanup)

**Total**: 2.5-3 hours to complete the refactor

## Final Notes

The hard work is done - these are primarily mechanical fixes now. Focus on the type inference issue first as it's blocking other providers. The ChatOrchestratorService fix is architectural but straightforward. Everything else is cleanup and modernization.

When complete, this codebase will be using modern @effect/ai patterns with full type safety.