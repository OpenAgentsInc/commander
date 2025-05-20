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
- ✅ Service interfaces and complete implementations
- ✅ Status checking for Spark wallet and Ollama
- ✅ Store actions for opening the Sell Compute pane
- ✅ Full DVM service implementation with start/stop functionality
- ✅ Integration between UI and services
- ✅ Loading states for DVM operations
- ✅ Full implementation of NIP-90 job handling in Kind5050DVMService
- ✅ Subscription to job request events via NostrService
- ✅ Processing of job requests using OllamaService
- ✅ Generation of invoices using SparkService
- ✅ Sending results with payment requests
- ✅ Error handling and telemetry
- ✅ NIP-04 encryption/decryption support for private requests
- ✅ Automatic status updating with checkDVMStatus

### Remaining Work
- ⬜ UI for displaying job history and statistics
- ⬜ Settings for price configuration
- ⬜ Job queue management
- ⬜ Security measures (e.g., rate limiting, request validation)
- ⬜ Payment verification and handling

## Technical Details

### DVM Configuration

The DVM is configured with:
- Private and public key for Nostr identity
- List of relays to monitor for job requests
- Supported job kinds (e.g., 5100 for text generation)
- Comprehensive text generation configuration

```typescript
export interface DefaultTextGenerationJobConfig {
  model: string;               // e.g., "LLaMA-2" or a model available via OllamaService
  max_tokens: number;          // e.g., 512
  temperature: number;         // e.g., 0.5
  top_k: number;               // e.g., 50
  top_p: number;               // e.g., 0.7
  frequency_penalty: number;   // e.g., 1
  // Pricing related
  minPriceSats: number;        // Minimum price in satoshis for any job
  pricePer1kTokens: number;    // Price per 1000 tokens (input + output) in satoshis
}

export interface Kind5050DVMServiceConfig {
  active: boolean;                             // Whether the DVM is active (listening for job requests)
  dvmPrivateKeyHex: string;                    // DVM's Nostr private key (hex)
  dvmPublicKeyHex: string;                     // DVM's Nostr public key (hex), derived from privateKey
  relays: string[];                            // Relays to listen on and respond to
  supportedJobKinds: number[];                 // e.g., [5100] for text generation
  defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
}
```

### Job Processing Flow

1. DVM subscribes to job request events (kind 5000-5999) via NostrService when "GO ONLINE" is clicked
2. When a job request is received:
   - DVM validates the request parameters and extracts inputs and params
   - If request is encrypted, DVM decrypts it using NIP-04
   - DVM sends a "processing" status update (kind 7000)
   - DVM runs the inference using OllamaService with the provided prompt
   - DVM calculates price based on token count using configured rates
   - DVM creates a Lightning invoice using SparkService
   - If original request was encrypted, DVM encrypts results using NIP-04
   - DVM sends the results with the Lightning invoice (kind 6xxx)
   - DVM sends a "success" status update (kind 7000)
3. All steps include comprehensive error handling with feedback to the client
4. Each job request is processed in its own Effect.js fiber for concurrent processing

### Error Handling

The implementation uses Effect.js for robust error handling, with specific error types:
- `DVMConfigError`: Configuration-related errors (e.g., missing required config)
- `DVMConnectionError`: Connection-related errors (e.g., relay subscription failures)
- `DVMJobRequestError`: Request validation errors (e.g., missing inputs, invalid params)
- `DVMJobProcessingError`: Processing errors (e.g., Ollama inference failures)
- `DVMPaymentError`: Payment-related errors (e.g., invoice creation failures)
- `DVMInvocationError`: General service invocation errors

Each error includes:
- Descriptive message
- Original cause (if applicable)
- Optional context data

All errors are handled within the `processJobRequestInternal` function, which ensures:
1. Error feedback is sent to the client
2. Errors are logged via telemetry
3. Operation state is properly maintained
4. Resources are cleaned up appropriately

## Usage

To use the "Sell Compute" feature:

1. Ensure you have Spark wallet initialized and Ollama running
2. Open the "Sell Compute" pane by clicking its icon in the Hotbar
3. Wait for status checks to confirm connections (indicated by green status)
4. Click "GO ONLINE" to start listening for job requests
   - Button will show a loading state during DVM startup
   - Once active, button will change to "GO OFFLINE"
5. The DVM will automatically process requests as they arrive:
   - Listens for NIP-90 job requests on configured relays
   - Process requests in parallel using Ollama
   - Generates invoices for clients using Spark
   - Sends results back with payment requests
6. Click "GO OFFLINE" to stop processing new requests
   - Button will show a loading state during DVM shutdown
   - Once inactive, button will change back to "GO ONLINE"

You can check the status at any time by looking at the button state, which accurately reflects the actual DVM service state.

## Future Enhancements

- UI dashboard for DVM history and performance metrics
- Settings interface for configuring DVM parameters
- Support for additional AI model types beyond text generation
- Advanced pricing models based on token count, model size, priority, etc.
- Job prioritization and queuing system
- Analytics dashboard for earnings and request patterns
- Payment verification and receipt handling
- Custom model fine-tuning offerings
- Reputation system integration
- Rate limiting and additional request validation
- Resource usage monitoring and throttling

## Implementation Notes

The implementation leverages several key design patterns and technologies:

1. **Effect.js**: All operations use Effect.js for functional composition and robust error handling
2. **Telemetry**: Comprehensive event tracking for service operations, errors, and performance
3. **Stateful Service**: The DVM service maintains internal state but exposes it via Effect-based APIs
4. **Concurrent Processing**: Multiple job requests are handled concurrently using Effect fibers
5. **Dependency Injection**: All services are injected via Effect context for testability
6. **Clean UI State Sync**: UI component always re-verifies the actual DVM state after operations

## Related Documentation

- [NIP-90 Specification](docs/nips/90.md)
- [Effect.js Documentation](https://effect.website/)
- [Spark Wallet Documentation](https://docs.spark.org/)
- [Ollama Documentation](https://ollama.ai/docs)
- [NIP-04 Encryption](docs/nips/04.md)
- [Lightning Network Invoices](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)