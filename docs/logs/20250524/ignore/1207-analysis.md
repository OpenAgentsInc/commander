# NIP-90 Model Selection Issue Analysis
## May 24, 2025 - 12:07

## Problem Summary
Users are requesting `devstral` model via NIP-90 but receiving responses from `gemma3:1b` instead. The payment flow is working correctly with optimistic processing, but the wrong model is being used.

## Root Cause: DVM Ignoring Requested Model

### Evidence from Telemetry Logs

**Consumer Side (1205-tel-consumer.md):**
- ✅ **Correctly requesting devstral**: Line 62 shows `'get_provider_model_start', label: 'nip90_devstral', value: 'devstral'`
- ✅ **Correct NIP90 provider config**: Line 64 shows `Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827'}`
- ✅ **Job requests published successfully**: Lines 70-73 show successful NIP-90 job publication
- ❌ **Receiving gemma responses**: Line 157 shows response identifying as "I am Gemma, a large language model created by the Gemma team at Google DeepMind"

**Provider Side (1205-tel-provider.md):**
- ✅ **DVM receiving requests correctly**: Line 142 shows `'received_job_request', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7'`
- ✅ **Optimistic processing working**: Line 181 shows `'processing_optimistic'` triggered correctly
- ❌ **Using wrong model**: Lines 186, 243, 326, 409 ALL show `'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b'`

### Critical Issue Identified

**The DVM is NOT using the model specified in the NIP-90 request.** Instead, it's using the model from its local configuration service.

**Evidence:**
- **Both consumer and provider** show `'ollama_model_from_config_service', value: 'gemma3:1b'` in initialization (consumer line 11-12, provider line 11-12)
- **Provider is using local config model** instead of the requested `devstral` model from the NIP-90 job request

## Technical Analysis

### What Should Happen:
1. Consumer sends NIP-90 job request with `model: devstral` parameter
2. DVM receives request and extracts model parameter
3. DVM uses Ollama with the requested `devstral` model
4. Response comes from devstral

### What's Actually Happening:
1. Consumer sends NIP-90 job request with `model: devstral` parameter ✅
2. DVM receives request correctly ✅  
3. **DVM ignores model parameter and uses local config `gemma3:1b`** ❌
4. Response comes from gemma3:1b instead of devstral ❌

## Code Investigation Required

### Key Areas to Investigate:

1. **`Kind5050DVMServiceImpl.ts`** - Job processing logic:
   - How is the model parameter extracted from NIP-90 job requests?
   - Is the model parameter being passed to the AI service?

2. **NIP-90 Job Request Parsing**:
   - Are we correctly parsing the `model` field from the job request tags?
   - Is this model parameter being used or ignored?

3. **AI Service Integration**:
   - When the DVM processes a job, which AI provider/model is it using?
   - Is it using the requested model or falling back to local config?

### Likely Bug Location:

The bug is most likely in the DVM job processing logic where it should:
1. Extract the `model` parameter from the NIP-90 job request
2. Use that specific model for the AI response
3. NOT fall back to the local configuration model

## Impact Assessment

### Current State:
- ✅ **Payment flow**: Working correctly with optimistic processing
- ✅ **NIP-90 protocol**: Job requests and responses are properly formatted
- ✅ **Fast responses**: Optimistic processing provides quick user feedback
- ❌ **Model selection**: Completely broken - users cannot specify which model to use

### User Experience:
- Users pay for `devstral` but get `gemma3:1b` responses
- This is essentially **false advertising** - users are not getting what they paid for
- The system appears to work but provides incorrect service

## Next Steps

1. **Immediate Fix Required**: Investigate and fix the model parameter extraction/usage in `Kind5050DVMServiceImpl.ts`
2. **Test with real models**: Verify that requesting `devstral` actually uses devstral, not local config
3. **Add model validation**: Ensure the DVM only accepts models it can actually serve
4. **Enhanced telemetry**: Add logging to show which model is being used for each job

## Priority: HIGH
This is a critical bug that breaks the core value proposition of the NIP-90 system - users cannot choose which AI model to use.