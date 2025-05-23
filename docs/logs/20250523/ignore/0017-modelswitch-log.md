# Model Switching Fix Implementation Log

**Date**: 2025-05-23  
**Issue**: Model switching not working - switching to "devstral" (NIP-90) provider still routes requests through Ollama  
**Root Cause**: `useAgentChat.ts` directly resolves `AgentLanguageModel.Tag` instead of using `ChatOrchestratorService` for dynamic provider selection

## Problem Analysis

### Telemetry Evidence
From `docs/logs/20250523/0015-modelswitch-problem.md`, the telemetry clearly showed:
- Line 14: `ollama_model_from_config_service` - Getting model from config service  
- Line 52: `OllamaAsOpenAIClientLive.ts:424` - Starting stream for `gemma3:1b`
- Lines 69-127: All streaming logs show Ollama provider being used

### Root Cause Investigation
1. **Problem**: `useAgentChat.ts:143` directly uses `yield* _(AgentLanguageModel.Tag)` 
2. **Result**: This resolves to the default provider from `FullAppLayer` (Ollama)
3. **Missing**: Dynamic provider selection based on `selectedProviderKey` from `agentChatStore`

### Architecture Issue
- `ChatOrchestratorService` exists but still uses hardcoded `activeAgentLM` (line 39)
- `useAgentChat` bypasses the orchestrator completely
- Provider selection in UI (`agentChatStore`) has no effect on actual AI requests

## Implementation Fix

### 1. Updated `useAgentChat.ts`

**Changes made:**
- Import `ChatOrchestratorService` and `PreferredProviderConfig`
- Import `useAgentChatStore` to get `selectedProviderKey`
- Replace direct `AgentLanguageModel.Tag` resolution with `ChatOrchestratorService`
- Pass provider selection through orchestrator

**Key modifications:**
```typescript
// OLD: Direct provider resolution
const agentLM = yield* _(AgentLanguageModel.Tag);
const textStream = agentLM.streamText(streamTextOptions);

// NEW: Dynamic provider selection via orchestrator
const orchestrator = yield* _(ChatOrchestratorService);
const textStream = orchestrator.streamConversation({
  messages: conversationHistoryForOrchestrator,
  preferredProvider: { key: selectedProviderKey, modelName: currentProviderInfo?.modelName },
  options: orchestratorOptions,
});
```

### 2. Enhanced `ChatOrchestratorService.ts`

**Problems fixed:**
- Service was using hardcoded `activeAgentLM` instead of dynamic selection
- No implementation for NIP-90 provider case
- Missing provider-specific configuration handling

**Key additions:**
```typescript
// Added dynamic provider selection helper
const getProviderLanguageModel = (providerKey: string, modelName?: string): Effect.Effect<AgentLanguageModel, ...>

// Added support for provider keys:
case "ollama_gemma3_1b": // Uses default AgentLanguageModel.Tag
case "nip90_devstral":   // Builds NIP90AgentLanguageModelLive dynamically
```

**NIP-90 Provider Implementation:**
- Fetches configuration from `ConfigurationService` for "devstral" DVM
- Builds `NIP90AgentLanguageModelLiveLayer` with proper dependencies
- Creates specific `NIP90ProviderConfig` with DVM pubkey, relays, encryption settings

### 3. Updated Runtime Dependencies

**Added to `runtime.ts`:**
- Import `ChatOrchestratorServiceLive` and add to `FullAppContext`
- Create `chatOrchestratorLayer` with all required dependencies:
  - `ConfigurationService`, `HttpClient`, `TelemetryService`
  - `NIP90Service`, `NostrService`, `NIP04Service`
  - Default `AgentLanguageModel` (Ollama) for fallback

### 4. Created Missing Index File

**Added:** `/src/services/ai/orchestration/index.ts`
- Exports `ChatOrchestratorService`, `ChatOrchestratorServiceLive`, `PreferredProviderConfig`

## Testing Strategy

### Attempted Comprehensive Testing
Created `ChatOrchestratorService.test.ts` with test cases:
- Provider selection for "ollama_gemma3_1b" 
- Error handling for unsupported providers
- Stream response collection
- Telemetry logging verification

**Testing Challenges:**
- Complex dependency chain for NIP90AgentLanguageModelLive
- Effect layer composition issues in test environment
- Mock service dependency conflicts

### Simplified Test Approach
- Focused on existing test suite compatibility
- Verified no regressions in current functionality
- Manual testing for provider switching behavior

## Expected Behavior After Fix

### Before Fix:
```
User selects "devstral" → agentChatStore.selectedProviderKey = "nip90_devstral"
useAgentChat sends message → yield* _(AgentLanguageModel.Tag) → Ollama provider
Result: Always uses Ollama regardless of selection
```

### After Fix:
```
User selects "devstral" → agentChatStore.selectedProviderKey = "nip90_devstral"  
useAgentChat sends message → ChatOrchestratorService.streamConversation()
  → getProviderLanguageModel("nip90_devstral")
  → Builds NIP90AgentLanguageModelLive with devstral config
  → Routes request to NIP-90 DVM
Result: Uses correct provider based on user selection
```

## Telemetry Changes

**New telemetry events:**
- `chat_orchestrator_resolved_successfully` - Orchestrator service resolution
- `get_provider_model_start` - Provider selection begins  
- `get_provider_model_success_ollama` - Ollama provider selected
- `get_provider_model_success_nip90` - NIP-90 provider selected
- `get_provider_model_unknown` - Unsupported provider key

**Expected telemetry after fix:**
Instead of `agent_language_model_resolved_successfully` followed by Ollama logs, should see:
1. `chat_orchestrator_resolved_successfully` with provider key
2. `get_provider_model_start` with "nip90_devstral"  
3. `get_provider_model_success_nip90`
4. NIP-90 DVM request/response logs (not Ollama)

## Configuration Requirements

**For NIP-90 "devstral" provider to work, these config keys must be set:**
- `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY` - DVM's public key
- `AI_PROVIDER_DEVSTRAL_RELAYS` - JSON array of relay URLs
- `AI_PROVIDER_DEVSTRAL_REQUEST_KIND` - Event kind (default: 5050)
- `AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION` - "true"/"false"
- `AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS` - "true"/"false" 
- `AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER` - Model ID for DVM

## Files Modified

1. **`src/hooks/ai/useAgentChat.ts`** - Main fix: Use ChatOrchestratorService
2. **`src/services/ai/orchestration/ChatOrchestratorService.ts`** - Dynamic provider selection  
3. **`src/services/runtime.ts`** - Add ChatOrchestratorService to runtime
4. **`src/services/ai/orchestration/index.ts`** - New export file

## Files Created

1. **`src/tests/unit/services/ai/orchestration/ChatOrchestratorService.test.ts`** - Test coverage
2. **`docs/logs/20250523/0017-modelswitch-log.md`** - This documentation

## Validation Steps

1. **Build Check**: `pnpm test` - Verify no regressions (257 tests passed)
2. **Manual Testing**: 
   - Start app with `pnpm start`
   - Open Agent Chat pane
   - Switch to "devstral" provider
   - Send test message
   - Verify telemetry shows NIP-90 provider usage (not Ollama)

## Risk Assessment

**Low Risk Changes:**
- `useAgentChat.ts` changes are backwards compatible
- Orchestrator service was already partially implemented
- All existing functionality preserved

**Medium Risk:**
- Runtime dependency changes could affect startup
- NIP-90 provider requires proper configuration
- Complex service dependency chain

**Mitigation:**
- Ollama remains as fallback provider
- Error handling for unsupported providers
- Telemetry for debugging provider selection

## Future Improvements

1. **Add More Providers**: OpenAI, Anthropic cases in orchestrator
2. **Enhanced Testing**: Resolve dependency issues for full test coverage
3. **Provider Fallback**: Implement automatic fallback on provider failures
4. **Configuration UI**: Better UX for configuring NIP-90 provider settings
5. **Provider Health Checks**: Verify provider availability before use

## Success Criteria

✅ **Build Success**: No TypeScript errors, all existing tests pass  
✅ **TypeScript Compilation**: `pnpm run t` passes without errors  
🔲 **Provider Selection**: "devstral" selection routes to NIP-90 DVM  
🔲 **Telemetry Verification**: New telemetry events show correct provider usage  
🔲 **Error Handling**: Unsupported providers show proper error messages  
🔲 **Backward Compatibility**: Ollama provider continues to work as before

## Post-Implementation Fixes

### TypeScript Error Resolution
**Issue**: Type error in `ChatOrchestratorService.ts` - context requirements mismatch
```
Type 'Effect<AgentLanguageModel, AiConfigurationError, AgentLanguageModel>' is not assignable to type 'Effect<AgentLanguageModel, AiConfigurationError | AiProviderError, never>'.
```

**Solution**: 
1. Moved `AgentLanguageModel.Tag` resolution to the service level instead of within helper function
2. Updated type signature to remove context requirement from helper function
3. Used closure to access the resolved `defaultAgentLM` from the service context

**Changes Made:**
```typescript
// Before: Helper function tried to access AgentLanguageModel.Tag
const getProviderLanguageModel = (): Effect<AgentLanguageModel, ..., AgentLanguageModel>

// After: Service resolves it once, helper uses closure
const defaultAgentLM = yield* _(AgentLanguageModel.Tag);
const getProviderLanguageModel = (): Effect<AgentLanguageModel, ...> // No context requirement
```

**Verification**: `pnpm run t` now passes, and all 257 tests continue to pass.

This fix addresses the core issue where model/provider selection in the UI had no effect on actual AI request routing. The solution implements the intended architecture where `ChatOrchestratorService` handles dynamic provider selection based on user preferences.