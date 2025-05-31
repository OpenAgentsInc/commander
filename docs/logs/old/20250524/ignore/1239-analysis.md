# Mock Invoice Issue Analysis

## May 24, 2025 - 12:39

## ✅ Model Selection Fixed!

The telemetry clearly shows the model selection fix is working:

- Line 177: `'ai_model_selected'... 'Using model: devstral (requested: devstral, default: gemma2:latest)'`
- Line 178: `'ollama_provider'... 'Using: devstral (requested: devstral, default: gemma3:1b)'`
- Line 179: `'ollama_adapter:nonstream', action: 'create_start', label: 'devstral'`

**The system is correctly using devstral as requested!**

## ❌ Mock Invoice Problem

**Issue**: DVM is creating mock invoices instead of real Lightning invoices.

**Evidence**:

- Line 148: `"lnbc3n1mock_invoice_1748108155829"`
- Consumer payment fails because it can't pay mock invoices

**Root Cause**:
The DVM is using `SparkServiceTestLive` (test implementation) instead of `SparkServiceLive` (real implementation).

**Runtime Logic**:

- If wallet mnemonic exists → Use real `SparkServiceLive`
- If no mnemonic → Use test `SparkServiceTestLive` (creates mock invoices)

**Problem**:
Provider log shows `"USER mnemonic: domain mam..."` which means it SHOULD be using real implementation, but DVM is somehow still using the test implementation.

**Likely Cause**:
The DVM service may be initialized with an old runtime context before the wallet is properly loaded, causing it to use the mock implementation even after the wallet is available.

## Fix Required:

1. Ensure DVM service is re-initialized when wallet becomes available
2. OR force DVM to always use real SparkService when wallet exists
3. OR check runtime layer composition order
