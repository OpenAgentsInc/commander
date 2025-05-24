# 1631 No Hardcode Implementation Log - Remove Hardcoded DVM Dependencies

## Objective
Remove hardcoded DVM (Data Vending Machine) pubkey dependencies from the consumer side to enable interaction with any DVM on the Nostr network, while maintaining the provider side's configurable identity system.

## Files Modified

### 1. `src/components/nip90/Nip90RequestForm.tsx`

**Changes Made:**
- **Removed hardcoded DVM pubkey**: Deleted `const OUR_DVM_PUBKEY_HEX = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"`
- **Added dynamic target DVM input field**:
  - Added `targetDvmPkInput` state with useState hook
  - Added new input field in JSX for "Target DVM Pubkey (npub or hex, optional for broadcast)"
  - Input supports both npub and hex formats with validation
- **Updated handlePublishRequest logic**:
  - Added npub decoding using `nip19.decode()` from nostr-tools
  - Added validation for 64-char hex format
  - Set `finalTargetDvmPkHexForEncryption` and `finalTargetDvmPkHexForPTag` variables
  - Updated `jobParams` to use dynamic values instead of hardcoded pubkey
- **Added imports**: `import type { ChangeEvent } from "react"` and `import * as nip19 from "nostr-tools/nip19"`

### 2. `src/services/nip90/NIP90Service.ts`

**Changes Made:**
- **Extended CreateNIP90JobParamsSchema**: Added `targetDvmPkHexForPTag: Schema.optional(Schema.String)` for separate p-tag targeting
- **Updated CreateNIP90JobParams type**: Automatically updated to include the new optional field

### 3. `src/services/nip90/NIP90ServiceImpl.ts`

**Changes Made:**
- **Updated createJobRequest method**: Modified the call to `createNip90JobRequest` helper to pass `validatedParams.targetDvmPkHexForPTag` as the p-tag parameter instead of reusing the encryption target

### 4. `src/stores/ai/agentChatStore.ts`

**Changes Made:**
- **Added custom NIP-90 DVM provider support**:
  - Added `Option` import from effect
  - Added logic in `loadAvailableProviders` to check for `USER_NIP90_ENABLED` config
  - If enabled and `USER_NIP90_DVM_PUBKEY` is configured, adds "nip90_custom" provider to available providers
  - Uses configurable name and model identifier from `USER_NIP90_NAME` and `USER_NIP90_MODEL_IDENTIFIER`

### 5. `src/services/ai/orchestration/ChatOrchestratorService.ts`

**Changes Made:**
- **Added custom NIP-90 DVM case**: 
  - Added `Option` and `DEFAULT_RELAYS_ARRAY` imports
  - Added new `case "nip90_custom"` in `getProviderLanguageModel` switch statement
  - Fetches all USER_NIP90_* configuration values from ConfigurationService
  - Validates that DVM pubkey is configured, fails with AiConfigurationError if missing
  - Builds NIP90ProviderConfig with user-supplied values and defaults
  - Creates and returns NIP90AgentLanguageModel instance with custom configuration

### 6. `src/services/configuration/ConfigurationServiceImpl.ts`

**Changes Made:**
- **Added default placeholders for custom NIP-90 DVM**:
  - `USER_NIP90_DVM_PUBKEY`: Empty (user must fill)
  - `USER_NIP90_RELAYS`: Default to ["wss://relay.damus.io", "wss://nostr.wine"]
  - `USER_NIP90_REQUEST_KIND`: "5050"
  - `USER_NIP90_REQUIRES_ENCRYPTION`: "false" (easier testing)
  - `USER_NIP90_USE_EPHEMERAL_REQUESTS`: "true"
  - `USER_NIP90_MODEL_IDENTIFIER`: "default_user_model"
  - `USER_NIP90_NAME`: "My Custom NIP-90 DVM"
  - `USER_NIP90_ENABLED`: "false" (disabled by default)

### 7. `src/helpers/nip90/event_creation.ts`

**Changes Made:**
- **Refined p-tag logic** in `createNip90JobRequest`:
  - Enhanced encryption and p-tag handling to support both `targetDvmPkHexForEncryption` and `targetDvmPkHexForPTag`
  - For encrypted requests: uses encryption target as primary p-tag, adds secondary p-tag if different routing target specified
  - For unencrypted requests: uses `targetDvmPkHexForPTag` if provided
  - Added better error logging for invalid encryption targets
  - Supports advanced scenario where encryption and routing targets differ

## Impact

**Consumer Side (No Hardcoding):**
- ✅ `Nip90RequestForm.tsx` now accepts any DVM pubkey (npub or hex) or broadcasts to all DVMs
- ✅ `AgentChatPane` can use user-configured custom NIP-90 DVMs in addition to predefined ones
- ✅ AI backend supports dynamic targeting of any NIP-90 DVM via configuration
- ✅ Event creation helper properly handles both encryption and routing targets

**Provider Side (Maintained):**
- ✅ DVM provider components continue to use configurable identity via `DVMSettingsDialog.tsx`
- ✅ `SellComputePane` and related DVM services maintain user-overridable defaults

**New Configuration System:**
- ✅ Added comprehensive `USER_NIP90_*` configuration keys for custom DVM targeting
- ✅ Configuration supports all necessary DVM connection parameters (pubkey, relays, encryption, etc.)
- ✅ Graceful fallbacks and validation for malformed configuration

## Technical Implementation Details

**Dynamic DVM Targeting Flow:**
1. User inputs DVM pubkey in form (npub or hex) or leaves blank for broadcast
2. Input validation and conversion to hex format
3. Separate handling of encryption target vs p-tag target for advanced routing scenarios
4. Event creation with appropriate encryption and p-tags based on targets

**Custom DVM Provider Flow:**
1. User configures `USER_NIP90_*` settings in ConfigurationService
2. AgentChatStore detects enabled custom DVM and adds to available providers
3. ChatOrchestratorService builds NIP90ProviderConfig from user settings
4. Creates NIP90AgentLanguageModel instance with custom configuration
5. AI system can seamlessly use custom DVM alongside predefined ones

**Backwards Compatibility:**
- All existing functionality preserved (Devstral DVM, Ollama local models)
- Provider side DVM identity system unchanged
- Default configurations ensure system works out-of-box

## Next Steps

1. **UI for Configuration Management**: Create user interface for managing `USER_NIP90_*` settings
2. **DVM Discovery**: Implement automatic DVM discovery mechanisms
3. **Advanced Routing**: Expand support for complex p-tag routing scenarios
4. **Testing**: Comprehensive testing with various real-world DVMs on the network

This implementation successfully removes hardcoded DVM dependencies while maintaining system functionality and adding powerful new configuration capabilities for targeting any DVM on the Nostr network.