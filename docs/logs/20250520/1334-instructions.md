Okay, Agent, we are now moving to the core logic of the "Sell Compute" feature: implementing the `Kind5050DVMService`. This service will be responsible for listening to NIP-90 job requests (kind 5000-5999), processing them using Ollama and Spark, and responding with results and feedback.

**I. Refine `Kind5050DVMService` Configuration and Identity**

1.  **File: `src/services/dvm/Kind5050DVMService.ts`**
    *   Update `Kind5050DVMServiceConfig` to include `dvmPrivateKeyHex` (this will be the DVM's identity) and `dvmPublicKeyHex` (derived from the private key).
    *   Update `defaultJobConfig` within `Kind5050DVMServiceConfig` to be more specific for text generation, referencing `docs/dvm-kind-5050.md` for parameters.
    *   Adjust `DefaultKind5050DVMServiceConfigLayer` to provide a default development private key and derive the public key.

    ```typescript
    // src/services/dvm/Kind5050DVMService.ts
    import { Context, Effect, Data, Schema, Layer } from 'effect';
    import { TelemetryService } from '@/services/telemetry';
    import { TrackEventError } from '@/services/telemetry/TelemetryService';
    import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'; // For default key generation
    import { bytesToHex } from '@noble/hashes/utils'; // For converting Uint8Array to hex

    // DVM service errors (as previously defined)
    export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{ /* ... */ }> {}
    export class DVMConfigError extends DVMServiceError {}
    export class DVMConnectionError extends DVMServiceError {}
    export class DVMJobRequestError extends DVMServiceError {}
    export class DVMJobProcessingError extends DVMServiceError {}
    export class DVMPaymentError extends DVMServiceError {}
    export class DVMInvocationError extends DVMServiceError {}
    export type DVMError = DVMConfigError | DVMConnectionError | DVMJobRequestError | DVMJobProcessingError | DVMPaymentError | DVMInvocationError;

    // Default Text Generation Job Parameters based on docs/dvm-kind-5050.md
    export interface DefaultTextGenerationJobConfig {
      model: string;        // e.g., "LLaMA-2" or a model available via OllamaService
      max_tokens: number;   // e.g., 512
      temperature: number;  // e.g., 0.5
      top_k: number;        // e.g., 50
      top_p: number;        // e.g., 0.7
      frequency_penalty: number; // e.g., 1
      // Pricing related
      minPriceSats: number;
      pricePer1kTokens: number; // Price per 1000 tokens (input + output) in satoshis
    }

    export interface Kind5050DVMServiceConfig {
      active: boolean;
      dvmPrivateKeyHex: string; // DVM's Nostr private key (hex)
      dvmPublicKeyHex: string;  // DVM's Nostr public key (hex), derived from privateKey
      relays: string[];
      supportedJobKinds: number[]; // e.g., [5100] for text generation
      defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
    }

    export const Kind5050DVMServiceConfigTag = Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

    // Generate a default dev keypair
    const devDvmSkBytes = generateSecretKey();
    const devDvmSkHex = bytesToHex(devDvmSkBytes);
    const devDvmPkHex = getPublicKey(devDvmSkBytes);

    export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
      Kind5050DVMServiceConfigTag,
      {
        active: false,
        dvmPrivateKeyHex: devDvmSkHex, // Use a default development SK
        dvmPublicKeyHex: devDvmPkHex,   // Corresponding PK
        relays: ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"],
        supportedJobKinds: [5100], // Example: Text Generation as per docs/dvm-kind-5050.md
        defaultTextGenerationJobConfig: {
          model: "gemma2:latest", // Default model for Ollama
          max_tokens: 512,
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          frequency_penalty: 0.5,
          minPriceSats: 10,       // Minimum sats for any job
          pricePer1kTokens: 2,    // e.g., 2 sats per 1000 tokens
        }
      }
    );

    export interface Kind5050DVMService {
      startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;
    }
    export const Kind5050DVMService = Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");
    ```

**II. Implement Core DVM Logic in `Kind5050DVMServiceImpl.ts`**

*   Implement `startListening`, `stopListening`, `isListening`.
*   Create a private `processJobRequestInternal(event: NostrEvent)` method that will contain the main job processing workflow.

```typescript
// File: src/services/dvm/Kind5050DVMServiceImpl.ts
import { Effect, Layer, Schema, Option, Cause, Fiber, Schedule, Duration } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate, type NostrEventUnsigned } from 'nostr-tools/pure';
import { TelemetryService } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import { NIP90Service, NIP90Input, NIP90JobParam, NIP90InputType, NIP90JobResultSchema, NIP90JobFeedbackSchema } from '@/services/nip90'; // For types/schemas
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig,
  Kind5050DVMServiceConfigTag,
  DefaultKind5050DVMServiceConfigLayer, // Import for providing if needed
  DVMConfigError, DVMConnectionError, DVMJobRequestError, DVMJobProcessingError, DVMPaymentError, DVMInvocationError, DVMError
} from './Kind5050DVMService';
import * as ParseResult from "@effect/schema/ParseResult"; // For formatting schema errors


// Define a helper to create NIP-90 feedback events (Kind 7000)
function createNip90FeedbackEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  status: "payment-required" | "processing" | "error" | "success" | "partial",
  content?: string, // For error messages or partial results
  amountDetails?: { amountMillisats: number; invoice?: string }
): NostrEvent {
  const tags: string[][] = [
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
    ["status", status]
  ];

  if (content) {
    // Add extra info to status tag if content is for an error message or simple status update
    if (status === "error" || status === "processing" || status === "payment-required") {
      tags.find(t => t[0] === "status")?.push(content.substring(0, 100)); // Add content as extra info
    }
  }

  if (amountDetails) {
    const amountTag = ["amount", amountDetails.amountMillisats.toString()];
    if (amountDetails.invoice) {
      amountTag.push(amountDetails.invoice);
    }
    tags.push(amountTag);
  }

  const template: EventTemplate = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: (status === "partial" || (status === "error" && content && content.length > 100)) ? (content || "") : "", // Only put substantial content if partial or long error
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

// Define a helper to create NIP-90 job result events (Kind 6xxx)
function createNip90JobResultEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  jobOutputContent: string,
  invoiceAmountMillisats: number,
  bolt11Invoice: string,
  outputIsEncrypted: boolean
): NostrEvent {
  const tags: string[][] = [
    ["request", JSON.stringify(requestEvent)],
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
    ["amount", invoiceAmountMillisats.toString(), bolt11Invoice]
  ];

  if (outputIsEncrypted) {
    tags.push(["encrypted"]);
  }
  // Add original 'i' tags for context
  requestEvent.tags.filter(t => t[0] === 'i').forEach(t => tags.push(t));


  const resultKind = requestEvent.kind + 1000;
  if (resultKind < 6000 || resultKind > 6999) {
    throw new Error(`Calculated result kind ${resultKind} is out of NIP-90 range.`);
  }

  const template: EventTemplate = {
    kind: resultKind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: jobOutputContent,
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}


export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    const config = yield* _(Kind5050DVMServiceConfigTag);
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActive = config.active || false;
    let currentSubscription: Subscription | null = null;

    // Helper to publish feedback, ignoring errors for fire-and-forget
    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapError(err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: Cause.pretty(err)
          })
        ),
        Effect.ignoreLogged // Ignore errors for feedback, main flow continues
      );

    // The main job processing logic
    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, NIP04Service | OllamaService | SparkService | NostrService | TelemetryService> =>
      Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: JSON.stringify(jobRequestEvent.kind) }));

        // 1. Parse and Validate Request
        let inputs: NIP90Input[] = [];
        let params: NIP90JobParam[] = [];
        let outputMimeType = "text/plain"; // Default
        let bidMillisats: number | undefined;
        let isRequestEncrypted = false;
        let requesterPubkey = jobRequestEvent.pubkey;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));

          try {
            const decryptedTags = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
            decryptedTags.forEach(tag => {
              if (tag[0] === 'i') inputs.push(tag.slice(1) as unknown as NIP90Input);
              if (tag[0] === 'param') params.push(tag as unknown as NIP90JobParam);
            });
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        } else {
          jobRequestEvent.tags.forEach(tag => {
            if (tag[0] === 'i') inputs.push(tag.slice(1) as unknown as NIP90Input);
            if (tag[0] === 'param') params.push(tag as unknown as NIP90JobParam);
            if (tag[0] === 'output') outputMimeType = tag[1] || outputMimeType;
            if (tag[0] === 'bid') bidMillisats = parseInt(tag[1], 10) || undefined;
          });
        }

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided in job request.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }

        // For now, assume first text input is the prompt for text generation
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", "No text input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        // 2. Send "processing" Feedback
        const processingFeedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        // 3. Perform Inference (OllamaService)
        const ollamaModel = params.find(p => p[1] === "model")?.[2] || config.defaultTextGenerationJobConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false, // DVMs generally don't stream results in NIP-90 results, but via Kind 7000 partials
        };
        // TODO: Map other NIP-90 params to Ollama params (max_tokens, temperature etc.)

        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const totalTokens = ollamaResult.usage?.total_tokens || (prompt.length + ollamaOutput.length) / 4; // Rough estimate

        // 4. Generate Invoice (SparkService)
        const priceSats = Math.max(
          config.defaultTextGenerationJobConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * config.defaultTextGenerationJobConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoice = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));

        // 5. Send Job Result (Kind 6xxx)
        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, requesterPubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          config.dvmPrivateKeyHex,
          jobRequestEvent,
          finalOutputContent,
          invoiceAmountMillisats,
          invoice.invoice.encodedInvoice,
          isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        // 6. Send "success" Feedback
        const successFeedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "success");
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }));
      }).pipe(
        Effect.catchAllCause(cause => {
          // Centralized error handling for the job processing
          const dvmError = Cause.failureOption(cause).pipe(Option.getOrElse(() =>
            new DVMJobProcessingError({ message: "Unknown error during job processing", cause })
          ));

          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", dvmError.message);
          // Fork feedback publish so it doesn't block/fail the main error logging
          Effect.runFork(publishFeedback(feedback));

          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: Cause.pretty(cause)
          }).pipe(Effect.andThen(Effect.fail(dvmError))); // Fail the original effect with DVMError
        })
      );


    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActive) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_already_active' }).pipe(Effect.ignoreLogged));
          return;
        }
        if (!config.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }

        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_attempt', label: `Relays: ${config.relays.join(', ')}` }).pipe(Effect.ignoreLogged));

        const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex); // For NIP-04 if needed, and signing
        // DVM public key already in config

        const jobRequestFilter: NostrFilter = {
          kinds: config.supportedJobKinds, // e.g., [5100]
          // Optional: Filter for requests not authored by self, or directly tagging DVM
          // authors: { not: [config.dvmPublicKeyHex] } // Example
          // "#p": [config.dvmPublicKeyHex] // Example for direct requests
          since: Math.floor(Date.now() / 1000) - 300, // Look for recent jobs (last 5 mins) to avoid backlog on start
        };

        try {
          currentSubscription = yield* _(nostr.subscribeToEvents(
            [jobRequestFilter],
            (event: NostrEvent) => {
              // Fork the processing of each job request
              Effect.runFork(
                Effect.provideService( // Provide the DVM service config to the job processor if its helpers need it implicitly
                    processJobRequestInternal(event),
                    Kind5050DVMServiceConfigTag,
                    config
                )
              );
            }
          ));
        } catch (error) {
            const dvmError = new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: error });
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'start_listening_subscribe_failure', label: dvmError.message }).pipe(Effect.ignoreLogged));
            return yield* _(Effect.fail(dvmError));
        }

        isActive = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActive) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_already_inactive'}).pipe(Effect.ignoreLogged));
          return;
        }
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));

        if (currentSubscription) {
          try {
            currentSubscription.unsub();
            currentSubscription = null;
          } catch(e) {
            const dvmError = new DVMConnectionError({ message: "Error unsubscribing from Nostr", cause: e });
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: dvmError.message }).pipe(Effect.ignoreLogged));
            // Don't fail the whole stopListening for this, just log it.
          }
        }
        isActive = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActive),
    };
  })
);
```

**III. Update `src/services/runtime.ts`**

*   Ensure `Kind5050DVMServiceLive` is added to `FullAppLayer` and its dependencies (like `DefaultKind5050DVMServiceConfigLayer`) are correctly provided.

```typescript
// src/services/runtime.ts
// ... (existing imports)
import { Kind5050DVMService, Kind5050DVMServiceLive, DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm';

export type FullAppContext =
  // ... (existing services)
  Kind5050DVMService; // Add Kind5050DVMService

// ... (individual service layers as before)

// Add Kind5050DVMService Layer
const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
  layerProvide(layerMergeAll(
    DefaultKind5050DVMServiceConfigLayer, // Provides the default DVM config
    nostrLayer,
    ollamaLayer,
    sparkLayer,
    nip04Layer, // Added NIP04Service as it's used for decryption in DVM
    telemetryLayer
  ))
);

const FullAppLayer = layerMergeAll(
  // ... (existing layers)
  nip90Layer, // NIP90Service for sending requests
  kind5050DVMLayer // Kind5050DVMService for receiving/processing requests
);

// ... (rest of runtime.ts as before)
```

**IV. Testing Considerations (Conceptual - for next steps)**

*   Create `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`.
*   Mock all dependencies (`NostrService`, `OllamaService`, `SparkService`, `NIP04Service`, `TelemetryService`, `Kind5050DVMServiceConfig`).
*   Test `startListening` successfully subscribes (mock `nostr.subscribeToEvents`).
*   Test `stopListening` successfully unsubscribes.
*   Test `processJobRequestInternal` with:
    *   A valid unencrypted NIP-90 kind 5100 request. Verify correct calls to Ollama, Spark, and Nostr for feedback/results.
    *   A valid encrypted NIP-90 kind 5100 request. Verify NIP-04 decryption and encrypted response.
    *   Invalid request (e.g., missing inputs) -> verify "error" feedback.
    *   Ollama service failure -> verify "error" feedback.
    *   Spark service failure -> verify "error" feedback.

**Notes:**

*   The `processJobRequestInternal` is complex. It's implemented as an Effect pipeline. `Effect.runFork` is used in `startListening` to process each job request concurrently without blocking the subscription handler.
*   Error handling within `processJobRequestInternal` aims to send a NIP-90 "error" feedback event to the requester if any step fails.
*   The DVM's private key is currently hardcoded in the default config for development. This would need secure management in a production app.
*   The pricing model in the default config is very basic.
*   The implementation assumes the DVM supports text generation (e.g., kind 5100) and uses `OllamaService.generateChatCompletion`. More sophisticated job type handling would require dispatch logic based on `event.kind`.
*   The `createNip90FeedbackEvent` and `createNip90JobResultEvent` helpers are defined within `Kind5050DVMServiceImpl.ts` for now. They could be moved to a shared helper file if `NIP90Service` (for sending requests) also needs to create similar event structures for some reason (though less likely for these specific kinds).
*   The `OUR_DVM_PUBKEY_HEX_FALLBACK` constant in `NIP90ServiceImpl.ts` was removed as `targetDvmPubkeyHex` is now explicitly handled with `|| ""` in `createNip90JobRequest` if the DVM itself makes requests (which it doesn't in this service). For processing incoming requests, the DVM's pubkey comes from its config.

This phase implements the main structure and logic for the `Kind5050DVMService`. The next phase would be to thoroughly test this service and then integrate more UI elements for DVM management, job history, and configuration.Okay, Agent, we're diving into the core logic of the "Sell Compute" feature by implementing the `Kind5050DVMService`. This service will listen for NIP-90 job requests, process them, and respond.

**I. Refine `Kind5050DVMService` Configuration and Identity**

1.  **File: `src/services/dvm/Kind5050DVMService.ts`**
    *   Update `Kind5050DVMServiceConfig` to include `dvmPrivateKeyHex` and `dvmPublicKeyHex`.
    *   Refine `defaultJobConfig` for text generation.
    *   Update `DefaultKind5050DVMServiceConfigLayer` to provide a default dev keypair.

**II. Implement Core DVM Logic in `Kind5050DVMServiceImpl.ts`**

1.  **Structure:**
    *   Inject dependencies (`NostrService`, `OllamaService`, `SparkService`, `NIP04Service`, `TelemetryService`, `Kind5050DVMServiceConfig`).
    *   Manage internal state: `isActive`, `currentSubscription`.
2.  **Implement `startListening()`:**
    *   Check for active state and `dvmPrivateKeyHex`.
    *   Subscribe to `kind:5000-5999` events (using `config.supportedJobKinds`) via `NostrService`.
    *   The `onEvent` callback will trigger `processJobRequestInternal`.
3.  **Implement `stopListening()`:**
    *   Unsubscribe from Nostr events.
4.  **Implement `isListening()`:**
    *   Return `isActive` state.
5.  **Implement `processJobRequestInternal(jobRequestEvent: NostrEvent)`:**
    *   This will be the main workflow:
        *   Parse/Validate Request (including NIP-04 decryption if needed).
        *   Send "processing" feedback (Kind 7000).
        *   Perform Inference via `OllamaService`.
        *   Generate Invoice via `SparkService`.
        *   Send Job Result (Kind 6xxx, encrypted if original was).
        *   Send "success" or "error" feedback (Kind 7000).
    *   Use `Effect.runFork` in `startListening` to process each job concurrently.
6.  **Helper Functions for Event Creation:**
    *   `createNip90FeedbackEvent` (Kind 7000).
    *   `createNip90JobResultEvent` (Kind 6xxx).

**III. Update `src/services/runtime.ts`**

1.  Add `Kind5050DVMServiceLive` and `DefaultKind5050DVMServiceConfigLayer` to the `FullAppLayer`.

```typescript
// File: src/services/dvm/Kind5050DVMService.ts
import { Context, Effect, Data, Schema, Layer } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { TrackEventError } from '@/services/telemetry/TelemetryService';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';

// DVM service errors
export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}
export class DVMConfigError extends DVMServiceError {}
export class DVMConnectionError extends DVMServiceError {}
export class DVMJobRequestError extends DVMServiceError {}
export class DVMJobProcessingError extends DVMServiceError {}
export class DVMPaymentError extends DVMServiceError {}
export class DVMInvocationError extends DVMServiceError {}
export type DVMError = DVMConfigError | DVMConnectionError | DVMJobRequestError | DVMJobProcessingError | DVMPaymentError | DVMInvocationError;

export interface DefaultTextGenerationJobConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_k: number;
  top_p: number;
  frequency_penalty: number;
  minPriceSats: number;
  pricePer1kTokens: number;
}

export interface Kind5050DVMServiceConfig {
  active: boolean;
  dvmPrivateKeyHex: string;
  dvmPublicKeyHex: string;
  relays: string[];
  supportedJobKinds: number[];
  defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
}

export const Kind5050DVMServiceConfigTag = Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

const devDvmSkBytes = generateSecretKey();
const devDvmSkHex = bytesToHex(devDvmSkBytes);
const devDvmPkHex = getPublicKey(devDvmSkBytes);

export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
  Kind5050DVMServiceConfigTag,
  {
    active: false,
    dvmPrivateKeyHex: devDvmSkHex,
    dvmPublicKeyHex: devDvmPkHex,
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"],
    supportedJobKinds: [5100], // Kind for Text Generation
    defaultTextGenerationJobConfig: {
      model: "gemma2:latest", // Ensure this matches an available Ollama model
      max_tokens: 512,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      frequency_penalty: 0.5,
      minPriceSats: 10,
      pricePer1kTokens: 2,
    }
  }
);

export interface Kind5050DVMService {
  startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
  stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
  isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;
}
export const Kind5050DVMService = Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
import { Effect, Layer, Schema, Option, Cause, Fiber, Schedule, Duration } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError, LightningInvoice } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import {
  NIP90Input,
  NIP90JobParam,
  NIP90InputType,
  NIP90InputSchema, // Import NIP90InputSchema
  NIP90JobParamSchema // Import NIP90JobParamSchema
} from '@/services/nip90'; // Assuming these are correctly defined in NIP90Service.ts
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig,
  Kind5050DVMServiceConfigTag,
  DVMConfigError, DVMConnectionError, DVMJobRequestError, DVMJobProcessingError, DVMPaymentError, DVMError
} from './Kind5050DVMService';
import * as ParseResult from "@effect/schema/ParseResult";

// Helper to create NIP-90 feedback events (Kind 7000)
function createNip90FeedbackEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  status: "payment-required" | "processing" | "error" | "success" | "partial",
  contentOrExtraInfo?: string,
  amountDetails?: { amountMillisats: number; invoice?: string }
): NostrEvent {
  const tags: string[][] = [
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
  ];

  const statusTagPayload = [status];
  if (contentOrExtraInfo && (status === "error" || status === "processing" || status === "payment-required")) {
    statusTagPayload.push(contentOrExtraInfo.substring(0, 256)); // Add as extra info
  }
  tags.push(statusTagPayload);

  if (amountDetails) {
    const amountTag = ["amount", amountDetails.amountMillisats.toString()];
    if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
    tags.push(amountTag);
  }

  const template: EventTemplate = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: (status === "partial" || (status === "error" && contentOrExtraInfo && contentOrExtraInfo.length > 256)) ? (contentOrExtraInfo || "") : "",
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

// Helper to create NIP-90 job result events (Kind 6xxx)
function createNip90JobResultEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  jobOutputContent: string,
  invoiceAmountMillisats: number,
  bolt11Invoice: string,
  outputIsEncrypted: boolean
): NostrEvent {
  const tags: string[][] = [
    ["request", JSON.stringify(requestEvent)],
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
    ["amount", invoiceAmountMillisats.toString(), bolt11Invoice]
  ];

  if (outputIsEncrypted) tags.push(["encrypted"]);
  requestEvent.tags.filter(t => t[0] === 'i').forEach(t => tags.push(t));

  const resultKind = requestEvent.kind + 1000;
  if (resultKind < 6000 || resultKind > 6999) {
    // This should ideally not happen if requestEvent.kind is validated
    console.error(`Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`);
    // Defaulting to a generic result kind in range or throw error
    // throw new Error(`Calculated result kind ${resultKind} is out of NIP-90 range.`);
  }

  const template: EventTemplate = {
    kind: Math.max(6000, Math.min(6999, resultKind)), // Clamp to valid range
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: jobOutputContent,
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    const config = yield* _(Kind5050DVMServiceConfigTag);
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActiveInternal = config.active || false; // Internal state for listening
    let currentSubscription: Subscription | null = null;

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: Cause.pretty(err)
          })
        ),
        Effect.ignoreLogged
      );

    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> => // R should be never here
      Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: JSON.stringify(jobRequestEvent.kind) }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let contentSource = jobRequestEvent.content;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
            contentSource = ""; // Original content was the encrypted tags, not needed further
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        let outputMimeType = "text/plain";
        let bidMillisats: number | undefined;

        inputsSource.forEach(tag => {
            if (tag[0] === 'i') inputs.push(tag.slice(1) as NIP90Input);
            if (tag[0] === 'param') paramsMap.set(tag[1], tag[2]);
            if (tag[0] === 'output') outputMimeType = tag[1] || outputMimeType;
            if (tag[0] === 'bid') bidMillisats = parseInt(tag[1], 10) || undefined;
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }

        // For text generation, expect a text input.
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const jobConfig = config.defaultTextGenerationJobConfig;
        const ollamaModel = paramsMap.get("model") || jobConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          options: { // Map NIP-90 params to Ollama options
            num_predict: paramsMap.has("max_tokens") ? parseInt(paramsMap.get("max_tokens")!) : jobConfig.max_tokens,
            temperature: paramsMap.has("temperature") ? parseFloat(paramsMap.get("temperature")!) : jobConfig.temperature,
            top_k: paramsMap.has("top_k") ? parseInt(paramsMap.get("top_k")!) : jobConfig.top_k,
            top_p: paramsMap.has("top_p") ? parseFloat(paramsMap.get("top_p")!) : jobConfig.top_p,
            frequency_penalty: paramsMap.has("frequency_penalty") ? parseFloat(paramsMap.get("frequency_penalty")!) : jobConfig.frequency_penalty,
          }
        };

        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        // Ensure usage is defined, provide default values if not.
        const usage = ollamaResult.usage || { prompt_tokens: prompt.length / 4, completion_tokens: ollamaOutput.length / 4, total_tokens: (prompt.length + ollamaOutput.length) / 4 };
        const totalTokens = usage.total_tokens;


        const priceSats = Math.max(
          jobConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * jobConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;


        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          config.dvmPrivateKeyHex, jobRequestEvent, finalOutputContent,
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "success");
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));
      }).pipe(
        Effect.catchAllCause(cause => {
          const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
            new DVMJobProcessingError({ message: "Unknown error during DVM job processing", cause })
          );
          const feedback = createNip90FeedbackEvent(config.dvmPrivateKeyHex, jobRequestEvent, "error", dvmError.message);
          Effect.runFork(publishFeedback(feedback));
          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: Cause.pretty(cause)
          }).pipe(Effect.andThen(Effect.fail(dvmError as DVMError)));
        })
      );

    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_already_active' }).pipe(Effect.ignoreLogged));
          return;
        }
        if (!config.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }

        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_attempt', label: `Relays: ${config.relays.join(', ')}` }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: config.supportedJobKinds,
          since: Math.floor(Date.now() / 1000) - 300, // Look for recent jobs (last 5 mins)
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            // Ensure the DVM doesn't process its own feedback or result events if they accidentally match filters
            if (event.pubkey === config.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) {
                return;
            }
            Effect.runFork(processJobRequestInternal(event));
          }
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_already_inactive'}).pipe(Effect.ignoreLogged));
          return;
        }
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));

        if (currentSubscription) {
          try {
            currentSubscription.unsub();
            currentSubscription = null;
          } catch(e) {
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: e instanceof Error ? e.message : String(e) }).pipe(Effect.ignoreLogged));
          }
        }
        isActiveInternal = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActiveInternal),
    };
  })
);

// File: src/services/dvm/index.ts
export * from './Kind5050DVMService';
export * from './Kind5050DVMServiceImpl';

// File: src/services/runtime.ts
// ... (existing imports)
import { Kind5050DVMService, Kind5050DVMServiceLive, DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm';

export type FullAppContext =
  // ... (existing services)
  Kind5050DVMService; // Add Kind5050DVMService

// ... (individual service layers as before)

// Add Kind5050DVMService Layer
const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
  layerProvide(layerMergeAll(
    DefaultKind5050DVMServiceConfigLayer,
    nostrLayer,
    ollamaLayer,
    sparkLayer,
    nip04Layer,
    telemetryLayer
  ))
);

const FullAppLayer = layerMergeAll(
  // ... (existing layers)
  nip90Layer,
  kind5050DVMLayer
);

// ... (rest of runtime.ts as before)
```
