# Selling Compute Power

This document describes the "Sell Compute" feature in Commander, which allows users to offer their computing resources to run AI inference via Nostr NIP-90 Data Vending Machine mechanics.

## Overview

The "Sell Compute" feature enables users to:

1. Connect their Spark wallet and Ollama instance
2. Go online as a Data Vending Machine (DVM) provider
3. Receive job requests via Nostr (kind 5050)
4. Process inference requests using Ollama
5. Generate Lightning invoices using Spark wallet
6. Send results (kind 6050) with payment requests back to requesters

## Architecture

The implementation follows a layered architecture:

### UI Layer
- **Hotbar**: A new UI component that provides quick access to key functions, including the "Sell Compute" feature
- **SellComputePane**: The main UI for the feature, showing wallet and Ollama connection status and the online/offline toggle

### Service Layer
- **Kind5050DVMService**: Core service that handles job requests and coordinates between Nostr, Ollama, and Spark
- **SparkService**: Extended with `checkWalletStatus()` method for wallet connectivity checking
- **OllamaService**: Extended with `checkOllamaStatus()` method for Ollama connectivity checking

### Store Layer
- **PaneStore**: Extended with `openSellComputePane()` action and 'sell_compute' pane type

## Nostr NIP-90 DVM Protocol

The NIP-90 Data Vending Machine protocol involves the following Nostr event kinds:

1. **Kind 5050**: Client sends an AI inference job request
   - Contains prompt and parameters for the AI model
   - May include payment details and max price willing to pay

2. **Kind 7000**: Provider sends job status updates (optional)
   - "processing" when job starts
   - "success" or "error" when job completes or fails

3. **Kind 6050**: Provider sends job results
   - Contains the AI-generated output/content
   - Includes a Lightning invoice for payment

## Current Implementation Status

### Completed
- ✅ UI components (Hotbar, SellComputePane)
- ✅ Service interfaces and basic implementations
- ✅ Status checking for Spark wallet and Ollama
- ✅ Store actions for opening the Sell Compute pane
- ✅ Basic DVM service structure with start/stop functionality
- ✅ Integration between UI and services

### Remaining Work
- ⬜ Full implementation of NIP-90 job handling in Kind5050DVMService
- ⬜ Subscription to kind 5050 events via NostrService
- ⬜ Processing of job requests using OllamaService
- ⬜ Generation of invoices using SparkService
- ⬜ Sending results with payment requests
- ⬜ UI for displaying job history and statistics
- ⬜ Settings for price configuration
- ⬜ Job queue management
- ⬜ Security measures (e.g., rate limiting, request validation)

## Technical Details

### DVM Configuration

The DVM is configured with:
- Private key for Nostr identity
- List of relays to monitor for job requests
- Default job configuration (model, pricing)

```typescript
interface Kind5050DVMServiceConfig {
  active: boolean;
  privateKey?: string;
  relays: string[];
  defaultJobConfig: {
    model: string;
    minPriceSats: number;
    maxPriceSats: number;
    pricePerToken: number;
  };
}
```

### Job Processing Flow

1. DVM subscribes to kind 5050 events via NostrService when "GO ONLINE" is clicked
2. When a job request is received:
   - DVM validates the request parameters
   - DVM sends a "processing" status update (kind 7000)
   - DVM runs the inference using OllamaService
   - DVM creates an invoice using SparkService
   - DVM sends the results with invoice (kind 6050)
   - DVM sends a "success" status update (kind 7000)

### Error Handling

The implementation uses Effect.js for robust error handling, with specific error types:
- `DVMConfigError`
- `DVMConnectionError`
- `DVMJobRequestError`
- `DVMJobProcessingError`
- `DVMPaymentError`
- `DVMInvocationError`

## Usage

To use the "Sell Compute" feature:

1. Ensure you have Spark wallet initialized and Ollama running
2. Open the "Sell Compute" pane by clicking its icon in the Hotbar
3. Wait for status checks to confirm connections
4. Click "GO ONLINE" to start listening for job requests
5. Process requests automatically as they arrive
6. Click "GO OFFLINE" to stop processing new requests

## Future Enhancements

- Support for multiple AI models
- Advanced pricing models based on token count, model size, etc.
- Job prioritization and queuing
- Analytics dashboard for earnings and request patterns
- Custom model fine-tuning offerings
- Reputation system integration

## Related Documentation

- [NIP-90 Specification](docs/nips/90.md)
- [Effect.js Documentation](https://effect.website/)
- [Spark Wallet Documentation](https://docs.spark.org/)
- [Ollama Documentation](https://ollama.ai/docs)