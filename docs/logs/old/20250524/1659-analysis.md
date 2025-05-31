# Telemetry Failure Analysis - 1659

## Problem Summary

The telemetry consumer shows a NIP-90 payment failure that appears to be unrelated to PR #57 (hardcode removal). The core issue is a Lightning payment failure when trying to pay a DVM invoice, followed by an AI model resolution error.

## Root Cause Analysis

### Primary Issue: Lightning Payment Failures

From the telemetry logs, there are **two distinct payment failures**:

1. **First Failure (line 509-510):**

   ```
   pay_invoice_failure: Failed to pay Lightning invoice via SparkSDK
   payment_error: Failed to pay Lightning invoice via SparkSDK
   ```

2. **Second Failure (line 599-600):**
   ```
   pay_invoice_failure: Invalid Lightning invoice format
   payment_error: Invalid Lightning invoice format
   ```

The first error occurs in `SparkServiceImpl.ts:495` which is the fallback error handler for unknown exceptions during Lightning payment attempts.

### Secondary Issue: AI Model Resolution Error

After the payment failures, there's an AI model error (line 620-621):

```
ollama_adapter:nonstream:error: Ollama API Error: 404 - {"error": "model 'devstral' not found"}
dvm:error: optimistic_processing_failed - AI inference failed: Ollama generation failed
```

The DVM is trying to use model `devstral` which doesn't exist in the local Ollama installation.

## PR #57 Impact Assessment

**Verdict: PR #57 is NOT the cause of this failure.**

### Why PR #57 is not responsible:

1. **Configuration intact:** The `AI_PROVIDER_DEVSTRAL_*` configuration that drives the failing NIP-90 provider was not modified by PR #57:

   - `src/services/configuration/ConfigurationServiceImpl.ts:114-121` still contains the devstral DVM configuration
   - The devstral provider setup in `ChatOrchestratorService.ts:69-122` uses these existing config values

2. **Payment flow unchanged:** PR #57 only added _new_ `USER_NIP90_*` configuration options and the `nip90_custom` provider case. The existing `nip90_devstral` provider flow remains identical.

3. **Error location:** The Lightning payment errors occur in `SparkServiceImpl.ts:495` which wasn't touched by PR #57.

## System Context (v0.0.4 Release)

From `docs/release-notes/004.md`, this is an alpha pre-release with:

- Full NIP-90 integration for consuming DVM services
- Bitcoin Lightning payments for AI services
- Requirement for funded Spark wallet

## Technical Details

### Payment Failure Flow

1. **User sends message:** "hi does this work" → triggers NIP-90 inference
2. **Job request successful:** DVM responds with payment request (3 sats)
3. **Auto-payment triggered:** System attempts Lightning payment
4. **Payment fails:** SparkSDK throws unknown error → fallback to generic "Failed to pay Lightning invoice via SparkSDK"
5. **Second payment attempt:** Different invoice format issue → "Invalid Lightning invoice format"
6. **DVM processing:** Despite payment failures, DVM attempts optimistic processing
7. **Model error:** DVM tries to use non-existent `devstral` model → fails

### Configuration Analysis

The system is using these defaults from `ConfigurationServiceImpl.ts`:

- `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY`: `714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827`
- `AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER`: `devstral`
- Provider enabled and configured for mainnet operation

## Likely Root Causes

### 1. Wallet/Lightning Issues

- **Empty wallet:** Balance shows 0 sats → can't pay 3 sat invoice
- **Network connectivity:** Possible connection issues to Lightning network
- **Invoice format:** Mock invoices may have incorrect format for mainnet
- **Spark wallet setup:** May not be properly configured for mainnet operations

### 2. DVM Model Configuration

- **Missing model:** The DVM is configured to use `devstral` model but Ollama only has `gemma3:1b` installed
- **Model availability:** DVM should check model availability before accepting jobs

## Recommended Actions

### Immediate Fixes

1. **Check Spark wallet setup:** Ensure wallet is funded and properly connected
2. **Install devstral model:** `ollama pull devstral` or configure DVM to use available models
3. **Validate invoice format:** Check if mock invoices are properly formatted for mainnet

### System Improvements

1. **Better error handling:** Improve payment error messages to be more specific
2. **Model validation:** DVM should validate model availability before processing
3. **Graceful degradation:** Better fallback when payments fail

## Conclusion

The telemetry failure is a legitimate runtime issue with the Lightning payment system and DVM model configuration, not a regression from PR #57. The hardcode removal changes are working correctly and didn't introduce any breaking changes to the existing devstral DVM provider flow.
