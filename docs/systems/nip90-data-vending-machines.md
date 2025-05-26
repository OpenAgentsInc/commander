# NIP-90 Data Vending Machine (DVM) Provider Architecture

## Table of Contents
1.  [Overview](#1-overview)
2.  [Architecture Diagram](#2-architecture-diagram)
3.  [Component Breakdown](#3-component-breakdown)
    3.1.  [`Kind5050DVMService` & `Kind5050DVMServiceImpl.ts`](#31-kind5050dvmservice--kind5050dvmserviceimplts)
    3.2.  [`dvmSettingsStore.ts`](#32-dvmsettingsstorets)
    3.3.  [UI Components](#33-ui-components)
    3.4.  [Key Dependent Services](#34-key-dependent-services)
4.  [Data Model & Configuration](#4-data-model--configuration)
    4.1.  [`Kind5050DVMServiceConfig`](#41-kind5050dvmserviceconfig)
    4.2.  [`DVMUserSettings`](#42-dvmusersettings)
    4.3.  [`JobHistoryEntry` & `JobStatistics`](#43-jobhistoryentry--jobstatistics)
5.  [Operational Flow](#5-operational-flow)
    5.1.  [Service Initialization & Activation ("Go Online")](#51-service-initialization--activation-go-online)
    5.2.  [Job Request Reception and Initial Handling (Nostr Kind 5xxx)](#52-job-request-reception-and-initial-handling-nostr-kind-5xxx)
    5.3.  [Invoice Generation & Payment Request (Nostr Kind 7000)](#53-invoice-generation--payment-request-nostr-kind-7000)
    5.4.  [Payment Verification Loop](#54-payment-verification-loop)
    5.5.  [AI Inference and Result Publishing (Nostr Kind 6xxx)](#55-ai-inference-and-result-publishing-nostr-kind-6xxx)
    5.6.  [Service Deactivation ("Go Offline")](#56-service-deactivation-go-offline)
6.  [Concurrency and Parallelism](#6-concurrency-and-parallelism)
7.  [Error Handling Strategy](#7-error-handling-strategy)
8.  [Security Aspects](#8-security-aspects)
9.  [Telemetry Integration](#9-telemetry-integration)
10. [Testing Approach](#10-testing-approach)
11. [Future Work & Scalability](#11-future-work--scalability)

## 1. Overview

The NIP-90 Data Vending Machine (DVM) Provider system allows OpenAgents Commander users to "Sell Compute" by offering their local AI model inference capabilities (primarily via Ollama) as a service on the Nostr network. This system enables users to act as DVMs, processing job requests from other Nostr users and receiving payments in Bitcoin via the Lightning Network (facilitated by the Spark SDK).

The architecture is designed to be robust, leveraging Effect-TS for service management and error handling, Zustand for user-configurable settings, and integrating several core services for Nostr communication, AI processing, payment handling, and secure NIP-04 encryption/decryption.

**Key Functions:**
-   Listen for NIP-90 job requests (e.g., Kind 5050/5100 for text generation) on configured Nostr relays.
-   Validate incoming job requests and their parameters.
-   Decrypt NIP-04 encrypted job inputs.
-   Generate Lightning invoices using the user's Spark wallet.
-   Publish "payment-required" feedback to the requester.
-   Perform AI inference using the local `AgentLanguageModel` (backed by Ollama).
-   Verify invoice payments.
-   Encrypt and publish job results (Kind 6xxx) to the requester.
-   Provide UI for DVM activation, configuration, and monitoring of job history/statistics.

## 2. Architecture Diagram

```
+---------------------------------+      +--------------------------------+      +--------------------------------+
| User (via UI Components:        |----->| `useDVMSettingsStore`          |----->| `Kind5050DVMServiceConfig`     |
| `SellComputePane`,              |      | (Zustand: User DVM Settings,   |      | (Effective DVM configuration)  |
| `DVMSettingsDialog`)            |      |  PK/SK, Relays, Models, Pricing)|      +--------------------------------+
+---------------------------------+      +---------------------+----------+
                                                                | Derives
                                                                v
+-------------------------------------------------------------------------------------------------------------+
|                                         `Kind5050DVMServiceImpl.ts`                                         |
|                                  (Core DVM Logic - Effect-TS Service)                                       |
|                                                                                                             |
| - Manages DVM active state (Online/Offline)                                                                 |
| - Subscribes to/Unsubscribes from Nostr job requests                                                        |
| - Processes job events: Decryption, Validation, Inference, Encryption                                       |
| - Orchestrates interactions with dependent services                                                         |
| - Manages `pendingJobs` map for payment tracking                                                            |
| - Handles background payment verification loop                                                              |
+------------------------------------------------------+------------------------------------------------------+
         | (Nostr Events: Kind 5xxx, 6xxx, 7000)         | (AI Inference)               | (Invoice, Payment Status)
         v                                               v                              v
+---------------------+      +--------------------------+     +------------------------+     +--------------------------+
| `NostrService`      |<---->| `NIP04Service`           |     | `AgentLanguageModel`   |     | `SparkService`           |
| (Pub/Sub, Events)   |      | (Encryption/Decryption)  |     | (via Ollama provider)  |     | (Lightning Payments)     |
+---------------------+      +--------------------------+     +------------------------+     +--------------------------+
         |                                                                                              |
         | (Config data)                                                                                |
         v                                                                                              v
+---------------------+                                                                    +--------------------------+
| `ConfigurationService`|                                                                    | `TelemetryService`       |
| (App-wide settings) |                                                                    | (Logging & Diagnostics)  |
+---------------------+                                                                    +--------------------------+

Diagram Key:
---> Data/Action Flow
<----> Interaction/Dependency
```

## 3. Component Breakdown

### 3.1. `Kind5050DVMService` & `Kind5050DVMServiceImpl.ts`
-   **Location:** `src/services/dvm/Kind5050DVMService.ts` (interface, config types), `src/services/dvm/Kind5050DVMServiceImpl.ts` (implementation).
-   **Responsibilities:**
    -   This is the central service orchestrating the DVM provider functionality.
    -   Manages the DVM's online/offline state (`isActiveInternal`).
    -   Uses `NostrService` to subscribe to job requests (Kind 5xxx) on configured relays, filtered by the DVM's public key (`#p` tag) and supported job kinds.
    -   Handles incoming job events:
        -   Decrypts NIP-04 encrypted job inputs using `NIP04Service` and the DVM's private key.
        -   Parses and validates job parameters (input data, output format, bid).
    -   Interacts with `AgentLanguageModel` (configured for local Ollama) to perform AI inference.
    -   Calculates job pricing based on user-defined settings (from `dvmSettingsStore` merged with defaults) and estimated resource usage (e.g., token count).
    -   Uses `SparkService` to generate Lightning invoices for payment.
    -   Publishes NIP-90 feedback events (Kind 7000 - e.g., "payment-required", "processing", "success", "error") and job results (Kind 6xxx) via `NostrService`.
    -   Encrypts job results using `NIP04Service` if the original request was encrypted.
    -   Manages a map of `pendingJobs` awaiting payment.
    -   Runs a background Effect fiber (`invoiceCheckFiber`) to periodically check the status of pending invoices using `SparkService.checkInvoiceStatus`.
    -   Provides methods to get job history and statistics (currently using Nostr events as a data source, future persistence planned).
    -   Logs significant events and errors via `TelemetryService`.
    -   Reads its operational configuration (DVM private key, relays, model settings, pricing) from `dvmSettingsStore` (user settings) merged with `Kind5050DVMServiceConfigTag` (application defaults).

### 3.2. `dvmSettingsStore.ts`
-   **Location:** `src/stores/dvmSettingsStore.ts`.
-   **Responsibilities:**
    -   A Zustand store responsible for managing user-specific DVM configuration settings.
    -   Persists settings to `localStorage` (e.g., DVM private key, custom relays, supported job kinds, text generation parameters, pricing).
    -   Provides actions (`updateSettings`, `resetSettings`) to modify these settings.
    -   Exposes getter functions (`getEffectivePrivateKeyHex`, `getEffectiveRelays`, `getEffectiveConfig`, etc.) that merge user-defined settings with application defaults (from `defaultKind5050DVMServiceConfig`). `Kind5050DVMServiceImpl` uses these getters to obtain its operational parameters dynamically.

### 3.3. UI Components
-   **`SellComputePane.tsx`:**
    -   Main UI for activating/deactivating the DVM service.
    -   Displays connection status for Spark Wallet and Ollama (by calling their respective service check methods).
    -   Provides a "GO ONLINE" / "GO OFFLINE" button that calls `Kind5050DVMService.startListening()` or `stopListening()`.
    -   Reflects the actual DVM status by calling `Kind5050DVMService.isListening()`.
-   **`DVMSettingsDialog.tsx`:**
    -   A dialog component allowing users to configure all DVM settings managed by `dvmSettingsStore`.
    -   Includes fields for DVM identity (private key), relays, supported job kinds, AI model parameters, and pricing.
    -   Saves settings to `dvmSettingsStore`.
-   **`DvmJobHistoryPane.tsx`:**
    -   Dashboard UI for displaying DVM job statistics and a paginated history of processed jobs.
    -   Fetches data using `Kind5050DVMService.getJobStatistics()` and `getJobHistory()` via `useQuery`.

### 3.4. Key Dependent Services
-   **`NostrService`:** Used for subscribing to job requests and publishing results/feedback events. Relies on user-configured DVM relays.
-   **`AgentLanguageModel` (Ollama implementation):** Used to perform the actual AI inference for job requests.
-   **`SparkService`:** Used to generate Lightning invoices for payment requests and to check invoice payment statuses.
-   **`NIP04Service`:** Used for encrypting job results (if the request was encrypted) and decrypting incoming encrypted job requests.
-   **`TelemetryService`:** Used for logging all significant DVM operations, errors, and lifecycle events.
-   **`ConfigurationService`:** Although DVM-specific settings are in `dvmSettingsStore`, this service might be used for global app settings that could influence DVM behavior (less direct for DVM provider).

## 4. Data Model & Configuration

### 4.1. `Kind5050DVMServiceConfig`
-   **Source:** `src/services/dvm/Kind5050DVMService.ts`.
-   Defines the structure for application-default DVM settings.
-   Includes `active` (boolean), `dvmPrivateKeyHex`, `dvmPublicKeyHex`, `relays` (array), `supportedJobKinds` (array), and `defaultTextGenerationJobConfig` (object containing model params and pricing).
-   A `DefaultKind5050DVMServiceConfigLayer` provides default values.

### 4.2. `DVMUserSettings`
-   **Source:** `src/stores/dvmSettingsStore.ts`.
-   Defines the structure for settings that users can override via the `DVMSettingsDialog`.
-   Fields are optional (`dvmPrivateKeyHex?`, `relaysCsv?`, etc.), allowing users to configure only what they need, with defaults applied for unspecified fields.

### 4.3. `JobHistoryEntry` & `JobStatistics`
-   **Source:** `src/types/dvm.ts`.
-   `JobHistoryEntry`: Defines the structure for an entry in the DVM's job log. Includes IDs, timestamps, requester info, job kind, status, pricing details, and summaries.
-   `JobStatistics`: Defines aggregated metrics like total jobs, successful jobs, revenue, etc.
-   Currently, these are primarily populated using data fetched from Nostr relays, as persistent job history storage is a future enhancement. The `pendingJobs` map in `Kind5050DVMServiceImpl` holds live job data before it's considered "history."

## 5. Operational Flow

### 5.1. Service Initialization & Activation ("Go Online")
1.  User clicks "GO ONLINE" in `SellComputePane.tsx`.
2.  `Kind5050DVMService.startListening()` is invoked.
3.  The service retrieves its effective configuration by merging user settings from `dvmSettingsStore` with application defaults. This includes the DVM's Nostr private/public key, relays to monitor, supported job kinds, and AI model/pricing parameters.
4.  The DVM public key is logged prominently for user reference.
5.  It validates that a private key and relays are configured; otherwise, it returns a `DVMConfigError`.
6.  If not already active, it constructs `NostrFilter[]` based on supported kinds and the DVM's public key (`#p` tag) and a `since` timestamp to fetch recent requests.
7.  It calls `NostrService.subscribeToEvents()` using the user-configured DVM relays. The `onEvent` callback is set to `processJobRequestInternal` (or its new payment-first wrapper), and an `onEOSE` callback logs EOSE events.
8.  The `currentSubscription` is stored.
9.  `isActiveInternal` is set to `true`.
10. The background payment verification loop (`checkAndUpdateInvoiceStatuses`) is started as a separate, scheduled Effect fiber.

### 5.2. Job Request Reception and Initial Handling (Nostr Kind 5xxx)
1.  A new Nostr event matching the DVM's subscription filters is received by `NostrService` and passed to the `onEvent` callback in `Kind5050DVMServiceImpl`.
2.  `processJobRequestInternal` (or its wrapper) is invoked with the `jobRequestEvent`.
3.  Telemetry logs the reception of the job request.
4.  **Decryption (if applicable):** If the event has an `encrypted` tag, `NIP04Service.decrypt()` is used with the DVM's private key and the requester's public key to decrypt the `content` (which contains stringified job parameters like `i` and `param` tags). If unencrypted, `event.tags` are used directly as `inputsSource`.
5.  **Parameter Parsing:**
    *   Input tags (`i` tags: `[value, type, relay_hint?, marker?]`) are extracted.
    *   Parameter tags (`param` tags: `[key, value]`) are parsed into a map.
    *   `output` tag is checked for MIME type.
    *   `bid` tag is parsed for job budget.
6.  **Validation:**
    *   Checks for presence of inputs. If none, an error feedback is sent, and a `DVMJobRequestError` is raised.
    *   For text generation (e.g., Kind 5100), ensures a text input is present.
    *   Checks if the requested AI model (from `param` tag or DVM default) is available locally using `AgentLanguageModel.generateText` with a test prompt. If not, an error feedback is sent, and a `DVMJobProcessingError` is raised.

### 5.3. Invoice Generation & Payment Request (Nostr Kind 7000)
1.  **Pricing:** Based on the (decrypted) prompt and DVM's configured pricing (`minPriceSats`, `pricePer1kTokens`), an estimated token count is made (e.g., `prompt.length * 2 / 4`), and the `priceSats` is calculated.
2.  **Invoice Creation:** `SparkService.createLightningInvoice()` is called with `amountSats` and a descriptive memo.
3.  The returned `bolt11Invoice` and `paymentHash` are stored.
4.  **Store Pending Job:** The `jobRequestEvent`, `bolt11Invoice`, `paymentHash`, `amountSats`, `prompt`, `isEncrypted` status, and timestamps are stored in the `pendingJobs` map, keyed by the `jobRequestEvent.id`.
5.  **Feedback Publication:** A "payment-required" feedback event (Kind 7000) is created using `createNip90FeedbackEvent`. This event includes the `amountMillisats` (priceSats * 1000) and the `bolt11Invoice`. This event is published via `NostrService`.

### 5.4. Payment Verification Loop
1.  An Effect fiber running `checkAndUpdateInvoiceStatusesLogic` is scheduled to execute periodically (e.g., every `OVERALL_PENDING_JOBS_CHECK_INTERVAL_S` seconds).
2.  This loop iterates over a copy of the `pendingJobs` map.
3.  For each job:
    *   **Timeout Check:** If `Date.now() - job.createdAt > JOB_PAYMENT_TIMEOUT_MS`, the job is removed from `pendingJobs`, and an "error" (payment timed out) feedback is sent.
    *   **Backoff Polling:** If it's time to poll this specific job (based on `job.lastPolledAt` and an exponential backoff delay calculated from `job.pollAttempts`), its invoice status is checked.
    *   `job.lastPolledAt` and `job.pollAttempts` are updated.
    *   `SparkService.checkInvoiceStatus(job.invoice)` is called (with internal retries).
    *   **If "paid":**
        *   If `job.optimisticProcessingStarted` is true (see below), a "success" feedback is sent, and the job is removed from `pendingJobs`.
        *   Otherwise, `processPaidJob(job, false)` is invoked to perform AI inference and publish results.
    *   **If "expired":** The job is removed from `pendingJobs`, and an "error" (invoice expired) feedback is sent.
    *   **If "error" (from Spark check):** The job remains in `pendingJobs` for subsequent retries by the main loop.
    *   **If "pending":**
        *   **Optimistic Processing:** If `job.pollAttempts >= OPTIMISTIC_PROCESSING_ATTEMPT_THRESHOLD` and `job.optimisticProcessingStarted` is false, the job is marked as `optimisticProcessingStarted = true`, and `processPaidJob(job, true)` is invoked. The job remains in `pendingJobs` awaiting final payment confirmation.
        *   Otherwise, the job remains pending.

### 5.5. AI Inference and Result Publishing (Nostr Kind 6xxx)
Triggered by `processPaidJob(pendingJob, isOptimistic)`:
1.  A "processing" feedback (Kind 7000) is sent.
2.  Job parameters (model, temperature, etc.) are retrieved from the DVM's effective configuration, potentially overridden by `param` tags in the original job request.
3.  `AgentLanguageModel.generateText()` is called with the prompt and generation options.
4.  The `aiOutput` is obtained from the `AiResponse`.
5.  **Encryption (if applicable):** If `pendingJob.isEncrypted` is true, `NIP04Service.encrypt()` is used to encrypt `aiOutput` with the DVM's private key and the requester's public key.
6.  A job result event (Kind 6xxx, typically `jobRequestEvent.kind + 1000`) is created using `createNip90JobResultEvent`. This event includes the (potentially encrypted) `finalOutputContent`, the `invoiceAmountMillisats`, the `bolt11Invoice`, and mirrors relevant input tags from the original request.
7.  This result event is published via `NostrService`.
8.  **If not optimistic processing (`isOptimistic === false`):**
    *   A "success" feedback event (Kind 7000) is published.
    *   The job is removed from the `pendingJobs` map.
9.  **If optimistic processing (`isOptimistic === true`):**
    *   The job remains in `pendingJobs`. The payment verification loop will eventually confirm payment and send the final "success" feedback.
    *   Telemetry logs that an optimistic result was sent.

### 5.6. Service Deactivation ("Go Offline")
1.  User clicks "GO OFFLINE" in `SellComputePane.tsx`.
2.  `Kind5050DVMService.stopListening()` is invoked.
3.  If `currentSubscription` exists, `currentSubscription.unsub()` is called.
4.  `isActiveInternal` is set to `false`.
5.  The `invoiceCheckFiber` (for payment verification) is interrupted using `Fiber.interrupt()`.
6.  Telemetry logs the successful deactivation.

## 6. Concurrency and Parallelism

-   Each incoming NIP-90 job request (`onEvent` callback from `NostrService`) is processed in its own Effect fiber, forked via `Effect.runFork(processJobRequestInternal(...))`. This allows the DVM to handle multiple requests concurrently without blocking the Nostr subscription or other operations.
-   The payment verification loop (`checkAndUpdateInvoiceStatusesLogic`) runs as a separate, scheduled background Effect fiber (`invoiceCheckFiber`), managed independently.
-   All interactions with external services (Nostr, Spark, Ollama via AgentLanguageModel, NIP-04) are Effectful, allowing Effect-TS to manage their asynchronous nature and potential failures.

## 7. Error Handling Strategy

-   **Custom DVM Errors:** The system uses specific tagged errors (e.g., `DVMConfigError`, `DVMJobRequestError`, `DVMJobProcessingError`, `DVMPaymentError`) defined in `Kind5050DVMService.ts` to categorize failures.
-   **Feedback Events:** When processing errors occur (e.g., invalid input, AI inference failure, payment issue), an "error" feedback event (Kind 7000) is created and published to the original requester via `NostrService`. This feedback includes a brief error message in the `status` tag's extra info or in the event `content`.
-   **Effect-TS Error Channel:** All service methods return `Effect`s with well-defined error channels (e.g., `Effect.Effect<void, DVMError | TrackEventError, ...>`). Errors from dependent services (like `SparkError`, `AiProviderError`) are caught and mapped to appropriate `DVMError` types or handled.
-   **Telemetry:** All significant errors are logged via `TelemetryService` for diagnostics.
-   **Resilient Loops:** The payment verification loop uses `Effect.catchAllCause` to log unhandled errors within a cycle and continue, preventing the entire loop from crashing due to an issue with a single job's payment check.

## 8. Security Aspects

-   **DVM Private Key:** The DVM's Nostr private key is managed by `dvmSettingsStore` and retrieved by `Kind5050DVMServiceImpl` for signing events and NIP-04 decryption/encryption. Users are warned about the sensitivity of this key in the `DVMSettingsDialog`.
-   **NIP-04 Encryption:**
    -   The DVM decrypts job inputs if the request event has an `encrypted` tag, using its private key and the requester's public key.
    -   If the original request was encrypted, the DVM encrypts the job result using its private key and the requester's public key before publishing.
-   **Spark Wallet:** Interactions with `SparkService` (invoice creation, payment status checks) are encapsulated within the service. The DVM provider's mnemonic/seed for Spark is configured via the main application's wallet setup, not directly by the DVM settings.
-   **Input Validation:** Job request parameters (kinds, inputs, MIME types, bids) are validated. The model requested by a job is checked for availability on the DVM before processing.

## 9. Telemetry Integration

-   The `Kind5050DVMService` is heavily instrumented with `TelemetryService`.
-   Key events tracked include:
    -   Service initialization, start/stop listening.
    -   DVM public key logging.
    -   Job request reception, parsing, decryption.
    -   Model availability checks.
    -   Invoice creation, payment requests.
    -   Payment verification attempts, successes, failures, timeouts.
    -   AI inference parameters and outcomes.
    -   Result/feedback event publishing.
    -   Optimistic processing triggers.
    -   All errors and exceptions.
-   Telemetry events include categories like `dvm:init`, `dvm:admin`, `dvm:job`, `dvm:payment`, `dvm:error`, `dvm:history`, `dvm:stats`, `dvm:job_debug`, `dvm:job_lifecycle`.

## 10. Testing Approach

-   **Unit Tests for `Kind5050DVMServiceImpl.ts`:**
    -   Mock dependencies (`NostrService`, `AgentLanguageModel`, `SparkService`, `NIP04Service`, `TelemetryService`, `Kind5050DVMServiceConfigTag`).
    -   Test `startListening`/`stopListening` behavior and state changes.
    -   Test `processJobRequestInternal` (and its payment-first wrapper) with various scenarios:
        -   Unencrypted vs. encrypted requests.
        -   Valid vs. invalid inputs.
        -   Model available vs. unavailable.
        -   Successful AI inference vs. AI errors.
        -   Successful Spark invoice creation vs. errors.
        -   Successful Nostr publishing vs. errors.
    -   Test `checkAndUpdateInvoiceStatusesLogic` with different payment outcomes.
    -   Test `getJobHistory` and `getJobStatistics` against mock Nostr event data.
-   **Integration Tests:**
    -   Test interaction with a mock Nostr relay to simulate event flow.
    -   Test with a mock Spark service to simulate payment flows.
    -   Test with a mock `AgentLanguageModel` (Ollama) to simulate AI processing.
-   **E2E Tests:** (Future) Could involve setting up a test Nostr relay, a mock DVM client, and a real Ollama instance to test the full lifecycle.

## 11. Future Work & Scalability
(Adapted from `docs/SELLING_COMPUTE.md#Future Enhancements`)
-   **Job Queue Management:** Implement a proper job queue to handle request backlogs and prioritization.
-   **Persistent Job History & Statistics:** Store job data in the local PGlite database instead of relying solely on ephemeral Nostr events.
-   **Advanced Pricing Models:** Support more dynamic pricing based on model size, request priority, actual token count, etc.
-   **Resource Management:** Monitor DVM resource usage (CPU, GPU, memory) and potentially throttle requests.
-   **Reputation System Integration:** Incorporate Nostr-based reputation systems for DVMs and requesters.
-   **Enhanced Security Measures:** Implement rate limiting, more sophisticated request validation, and potentially API key authentication for DVMs.
-   **Support for More Job Kinds:** Extend beyond text generation (Kind 5100/5050) to other NIP-90 defined DVM tasks.

This architecture provides a solid foundation for users of OpenAgents Commander to participate in the decentralized AI economy as NIP-90 DVM providers.
