import { Effect, Layer, Schema, Option, Cause, Fiber, Schedule, Duration } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService, TrackEventError } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError, LightningInvoice } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import { useDVMSettingsStore } from '@/stores/dvmSettingsStore';
import {
  NIP90Input,
  NIP90JobParam,
  NIP90InputType
} from '@/services/nip90';
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig,
  Kind5050DVMServiceConfigTag,
  DVMConfigError, 
  DVMConnectionError, 
  DVMJobRequestError, 
  DVMJobProcessingError, 
  DVMPaymentError, 
  DVMError
} from './Kind5050DVMService';
import type { JobHistoryEntry, JobStatistics } from '@/types/dvm';

/**
 * Helper to create NIP-90 feedback events (Kind 7000)
 */
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
    ["status", status]
  ];

  // Add content as status extra info if provided
  if (contentOrExtraInfo && (status === "error" || status === "processing" || status === "payment-required")) {
    tags.find(t => t[0] === "status")?.push(contentOrExtraInfo.substring(0, 256));
  }

  // Add amount tag if payment details are provided
  if (amountDetails) {
    const amountTag = ["amount", amountDetails.amountMillisats.toString()];
    if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
    tags.push(amountTag);
  }

  const template: EventTemplate = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    // Only include substantial content if it's a partial result or a long error message
    content: (status === "partial" || (status === "error" && contentOrExtraInfo && contentOrExtraInfo.length > 256)) 
      ? (contentOrExtraInfo || "") 
      : "",
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

/**
 * Helper to create NIP-90 job result events (Kind 6xxx)
 */
function createNip90JobResultEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  jobOutputContent: string,
  invoiceAmountMillisats: number,
  bolt11Invoice: string,
  outputIsEncrypted: boolean
): NostrEvent {
  const tags: string[][] = [
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
    ["amount", invoiceAmountMillisats.toString(), bolt11Invoice]
  ];

  // Mark as encrypted if needed
  if (outputIsEncrypted) tags.push(["encrypted"]);
  
  // Include original input tags for context
  requestEvent.tags.filter(t => t[0] === 'i').forEach(t => tags.push(t));

  // The result kind should be request kind + 1000 (e.g., 5100 -> 6100)
  const resultKind = requestEvent.kind + 1000;
  
  // Ensure the calculated kind is valid (6000-6999)
  if (resultKind < 6000 || resultKind > 6999) {
    console.error(`Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`);
  }

  const template: EventTemplate = {
    kind: Math.max(6000, Math.min(6999, resultKind)), // Clamp to valid range
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: jobOutputContent,
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

// Define a type for the invoice status result
interface InvoiceStatusResult {
  status: 'pending' | 'paid' | 'expired' | 'error';
  amountPaidMsats?: number;
  message?: string;
}

/**
 * Implementation of Kind5050DVMService
 * This service:
 * 1. Subscribes to NIP-90 job requests (kind 5000-5999) via NostrService
 * 2. Processes incoming requests by performing inference via OllamaService
 * 3. Creates invoices via SparkService
 * 4. Sends results with payment requests back to the original requester
 */
export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    // Get dependencies from the context
    const config = yield* _(Kind5050DVMServiceConfigTag); // For default fallbacks
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);
    
    // Local state for service
    let isActiveInternal = config.active || false;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex = useDVMSettingsStore.getState().getDerivedPublicKeyHex() || config.dvmPublicKeyHex;
    // Use more specific typing for the fiber
    let invoiceCheckFiber: Fiber.RuntimeFiber<void, never> | null = null;
    
    // Track service initialization
    yield* _(telemetry.trackEvent({
      category: 'dvm:init',
      action: 'kind5050_dvm_service_init',
      label: `Initial state: ${isActiveInternal ? 'active' : 'inactive'}`,
    }).pipe(Effect.ignoreLogged));
    
    /**
     * Helper to publish feedback events, ignoring errors (fire-and-forget)
     */
    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", 
            action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t => t[0] === 'e')?.[1]}`,
            value: err.message
          })
        ),
        Effect.ignoreLogged // Ignore errors for feedback, main flow continues
      );
    
    /**
     * Mock job history data function
     * This function returns mock job history data with various invoice statuses
     * Taking TelemetryService as a dependency through Effect context
     */
    const getJobHistoryStub = (
      options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }
    ): Effect.Effect<{ entries: JobHistoryEntry[]; totalCount: number }, DVMError | TrackEventError, TelemetryService> =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        
        yield* _(localTelemetry.trackEvent({ 
          category: 'dvm:history', 
          action: 'get_job_history_stub_called', 
          label: `Page: ${options.page}` 
        }).pipe(Effect.ignoreLogged));
        
        // Mock data for now - this will be replaced with actual persistence in a future task
        const mockHistory: JobHistoryEntry[] = [
          { 
            id: 'job1', 
            timestamp: Date.now() - 3600000, // 1 hour ago 
            jobRequestEventId: 'req1', 
            requesterPubkey: 'pk_requester1', 
            kind: 5100, 
            inputSummary: 'Translate to French: Hello world', 
            status: 'completed', 
            ollamaModelUsed: 'gemma2:latest', 
            tokensProcessed: 120, 
            invoiceAmountSats: 20, 
            invoiceBolt11: 'paid_invoice_stub_1',
            invoicePaymentHash: 'hash_for_paid_1',
            paymentReceivedSats: 20, 
            resultSummary: 'Bonjour le monde' 
          },
          { 
            id: 'job2', 
            timestamp: Date.now() - 7200000, // 2 hours ago
            jobRequestEventId: 'req2', 
            requesterPubkey: 'pk_requester2', 
            kind: 5100, 
            inputSummary: 'Summarize this article...', 
            status: 'error', 
            ollamaModelUsed: 'gemma2:latest', 
            errorDetails: 'Ollama connection failed' 
          },
          { 
            id: 'job3', 
            timestamp: Date.now() - 10800000, // 3 hours ago
            jobRequestEventId: 'req3', 
            requesterPubkey: 'pk_requester1', 
            kind: 5000, 
            inputSummary: 'Image generation: cat astronaut', 
            status: 'pending_payment', 
            ollamaModelUsed: 'dall-e-stub', 
            invoiceAmountSats: 100,
            invoiceBolt11: 'pending_invoice_stub_1',
            invoicePaymentHash: 'hash_for_pending_1' 
          },
          {
            id: 'job4',
            timestamp: Date.now() - 86400000, // 1 day ago
            jobRequestEventId: 'req4',
            requesterPubkey: 'pk_requester3',
            kind: 5100,
            inputSummary: 'Write a poem about technology',
            status: 'completed',
            ollamaModelUsed: 'llama3:instruct',
            tokensProcessed: 350,
            invoiceAmountSats: 50,
            invoiceBolt11: 'expired_invoice_stub_1',
            invoicePaymentHash: 'hash_for_expired_1',
            paymentReceivedSats: 50,
            resultSummary: 'Digital dreams in silicon sleep...'
          },
          {
            id: 'job5',
            timestamp: Date.now() - 172800000, // 2 days ago
            jobRequestEventId: 'req5',
            requesterPubkey: 'pk_requester2',
            kind: 5100,
            inputSummary: 'Debug this JavaScript code...',
            status: 'paid',
            ollamaModelUsed: 'codellama:latest',
            tokensProcessed: 420,
            invoiceAmountSats: 60,
            invoiceBolt11: 'paid_invoice_stub_2',
            invoicePaymentHash: 'hash_for_paid_2',
            paymentReceivedSats: 60,
            resultSummary: 'Found issue in line 42...'
          },
          {
            id: 'job6',
            timestamp: Date.now() - 43200000, // 12 hours ago
            jobRequestEventId: 'req6',
            requesterPubkey: 'pk_requester4',
            kind: 5100,
            inputSummary: 'Analyze this data structure',
            status: 'pending_payment',
            ollamaModelUsed: 'codellama:latest',
            tokensProcessed: 320,
            invoiceAmountSats: 40,
            invoiceBolt11: 'expired_invoice_stub_1',
            invoicePaymentHash: 'hash_for_expired_1'
          },
          {
            id: 'job7',
            timestamp: Date.now() - 21600000, // 6 hours ago
            jobRequestEventId: 'req7',
            requesterPubkey: 'pk_requester5',
            kind: 5100,
            inputSummary: 'Generate test cases for my API',
            status: 'pending_payment',
            ollamaModelUsed: 'llama3:instruct',
            tokensProcessed: 280,
            invoiceAmountSats: 35,
            invoiceBolt11: 'error_invoice_stub_1',
            invoicePaymentHash: 'hash_for_error_1'
          }
        ];
        
        // Very basic filtering (to be enhanced with real implementation)
        let filteredEntries = [...mockHistory];
        if (options.filters) {
          const filters = options.filters;
          filteredEntries = filteredEntries.filter(entry => {
            for (const [key, value] of Object.entries(filters)) {
              if (entry[key as keyof JobHistoryEntry] !== value) {
                return false;
              }
            }
            return true;
          });
        }
        
        // Pagination
        const paginatedEntries = filteredEntries.slice(
          (options.page - 1) * options.pageSize, 
          options.page * options.pageSize
        );
        
        return { entries: paginatedEntries, totalCount: filteredEntries.length };
      });
    
    /**
     * Periodically checks for invoices with pending payment status and updates their status
     * by checking with the Spark service. Refactored to not use 'this' and use proper typing.
     */
    const checkAndUpdateInvoiceStatuses = (): Effect.Effect<void, DVMError | TrackEventError, SparkService | TelemetryService> =>
      Effect.gen(function* (ctx) {
        // Get services from the effect context
        const localTelemetry = yield* ctx(TelemetryService);
        const localSpark = yield* ctx(SparkService);
        
        yield* _(localTelemetry.trackEvent({ 
          category: 'dvm:payment_check', 
          action: 'check_all_invoices_start' 
        }).pipe(Effect.ignoreLogged));
        
        // Get job history by calling our stub with TelemetryService provided
        const historyResult = yield* _(
          getJobHistoryStub({ page: 1, pageSize: 500 }).pipe(
            Effect.provideService(TelemetryService, localTelemetry)
          )
        );
        
        // Filter for jobs with pending_payment status and invoiceBolt11
        const pendingPaymentJobs = historyResult.entries.filter(
          job => job.status === 'pending_payment' && job.invoiceBolt11
        );

        if (pendingPaymentJobs.length === 0) {
          yield* _(localTelemetry.trackEvent({ 
            category: 'dvm:payment_check', 
            action: 'no_pending_invoices_found' 
          }).pipe(Effect.ignoreLogged));
          return;
        }

        yield* _(localTelemetry.trackEvent({ 
          category: 'dvm:payment_check', 
          action: 'checking_pending_invoices', 
          value: String(pendingPaymentJobs.length) 
        }).pipe(Effect.ignoreLogged));

        // Process each pending payment job
        for (const job of pendingPaymentJobs) {
          if (!job.invoiceBolt11) continue; // Should not happen due to filter, but checking anyway

          yield* _(localTelemetry.trackEvent({
            category: 'dvm:payment_check',
            action: 'check_invoice_attempt',
            label: `Job ID: ${job.id}`,
            value: job.invoiceBolt11.substring(0, 20) + '...'
          }).pipe(Effect.ignoreLogged));

          // Check invoice status via SparkService, handling errors individually
          // so one failure doesn't stop checking others
          const invoiceStatusResult: InvoiceStatusResult = yield* _(
            localSpark.checkInvoiceStatus(job.invoiceBolt11).pipe(
              Effect.catchAll((err) => {
                const sparkErr = err as SparkError;
                Effect.runFork(localTelemetry.trackEvent({
                  category: 'dvm:payment_check_error',
                  action: 'spark_check_invoice_failed',
                  label: `Job ID: ${job.id}, Invoice: ${job.invoiceBolt11?.substring(0,20)}...`,
                  value: sparkErr.message
                }));
                // Return a default error status, but don't fail the whole loop
                return Effect.succeed<InvoiceStatusResult>({ 
                  status: 'error' as const, 
                  message: sparkErr.message 
                });
              })
            )
          );

          // Handle paid invoices
          if (invoiceStatusResult.status === 'paid') {
            yield* _(localTelemetry.trackEvent({
              category: 'dvm:payment_check',
              action: 'invoice_paid',
              label: `Job ID: ${job.id}`,
              value: JSON.stringify({ amount: invoiceStatusResult.amountPaidMsats })
            }).pipe(Effect.ignoreLogged));
            
            // TODO: Update job status to 'paid' in job history.
            // For now, we just log it conceptually since we're using mock data
            console.log(`[DVM] Job ${job.id} invoice PAID. Amount: ${invoiceStatusResult.amountPaidMsats} msats. Conceptual update to status: 'paid'.`);
            
            // In a real implementation with persistence, we would update the job in storage
            // Example of what this would look like:
            // yield* _(updateJobInHistory(job.id, { 
            //   status: 'paid', 
            //   paymentReceivedSats: Math.floor((invoiceStatusResult.amountPaidMsats || 0) / 1000) 
            // }));
          } 
          // Handle expired or error invoices
          else if (invoiceStatusResult.status === 'expired' || invoiceStatusResult.status === 'error') {
            yield* _(localTelemetry.trackEvent({
              category: 'dvm:payment_check',
              action: `invoice_${invoiceStatusResult.status}`,
              label: `Job ID: ${job.id}`,
              value: invoiceStatusResult.status === 'error' 
                ? invoiceStatusResult.message 
                : undefined
            }).pipe(Effect.ignoreLogged));
            
            // TODO: Optionally update job status based on policy (e.g., to 'payment_failed' or 'cancelled')
            console.log(`[DVM] Job ${job.id} invoice ${invoiceStatusResult.status}.`);
          }
        }

        yield* _(localTelemetry.trackEvent({ 
          category: 'dvm:payment_check', 
          action: 'check_all_invoices_complete' 
        }).pipe(Effect.ignoreLogged));
      });
    
    /**
     * The main job processing logic
     * This handles the complete workflow for a job request:
     * 1. Parse and validate
     * 2. Send processing feedback
     * 3. Perform inference
     * 4. Generate invoice
     * 5. Send result with payment request
     * 6. Send success feedback
     */
    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        // Get effective config at the beginning of job processing
        // This ensures we're using the latest settings for each job
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;
        
        // Track job received
        yield* _(telemetry.trackEvent({ 
          category: "dvm:job", 
          action: "job_request_received", 
          label: jobRequestEvent.id, 
          value: `Kind: ${jobRequestEvent.kind}` 
        }).pipe(Effect.ignoreLogged));

        // 1. Parse and Validate Request
        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        // Check if request is encrypted
        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          
          // Decrypt the content using effective private key
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(
            dvmSkBytes, 
            jobRequestEvent.pubkey, 
            jobRequestEvent.content
          ).pipe(
            Effect.mapError(e => new DVMJobRequestError({ 
              message: "Failed to decrypt NIP-90 request content", 
              cause: e
            }))
          ));
          
          try {
            // Parse decrypted content as tags array
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ 
              message: "Failed to parse decrypted JSON tags", 
              cause: e
            })));
          }
        }

        // Extract inputs, params, and other request details
        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        let outputMimeType = "text/plain"; // Default
        let bidMillisats: number | undefined;

        // Parse all tags
        inputsSource.forEach(tag => {
          if (tag[0] === 'i' && tag.length >= 3) {
            // Ensure we have at least value and type
            const value = tag[1];
            const type = tag[2] as NIP90InputType;
            const opt1 = tag.length > 3 ? tag[3] : undefined;
            const opt2 = tag.length > 4 ? tag[4] : undefined;
            inputs.push([value, type, opt1, opt2] as NIP90Input);
          }
          if (tag[0] === 'param') paramsMap.set(tag[1], tag[2]);
          if (tag[0] === 'output') outputMimeType = tag[1] || outputMimeType;
          if (tag[0] === 'bid') bidMillisats = parseInt(tag[1], 10) || undefined;
        });

        // Validate inputs
        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHex, 
            jobRequestEvent, 
            "error", 
            "No inputs provided."
          );
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }

        // For text generation, require a text input
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHex, 
            jobRequestEvent, 
            "error", 
            "No 'text' input found for text generation job."
          );
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        // 2. Send "processing" Feedback
        const processingFeedback = createNip90FeedbackEvent(
          dvmPrivateKeyHex, 
          jobRequestEvent, 
          "processing"
        );
        yield* _(publishFeedback(processingFeedback));
        
        // Prepare Ollama request with parameters from request or defaults
        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false // DVMs don't stream results in NIP-90
        };
        
        // Log the parameters that would be used
        yield* _(telemetry.trackEvent({
          category: "dvm:job",
          action: "ollama_params_intended",
          label: `Job ID: ${jobRequestEvent.id}`,
          value: JSON.stringify({
            requestParams: Object.fromEntries(paramsMap),
            ollamaModelUsed: ollamaRequest.model,
            defaultJobConfigParams: {
              max_tokens: textGenConfig.max_tokens,
              temperature: textGenConfig.temperature,
              top_k: textGenConfig.top_k,
              top_p: textGenConfig.top_p,
              frequency_penalty: textGenConfig.frequency_penalty
            }
          })
        }).pipe(Effect.ignoreLogged));

        // Generate completion
        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        
        // Extract output and token count
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { 
          prompt_tokens: Math.ceil(prompt.length / 4), 
          completion_tokens: Math.ceil(ollamaOutput.length / 4), 
          total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) 
        };
        const totalTokens = usage.total_tokens;

        // 4. Generate Invoice (SparkService)
        // Calculate price based on token count and config
        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        // Create invoice via SparkService
        const invoiceParams: CreateLightningInvoiceParams = { 
          amountSats: priceSats, 
          memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0, 8)}` 
        };
        const invoiceResult = yield* _(spark.createLightningInvoice(invoiceParams).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceResult.invoice.encodedInvoice;

        // 5. Prepare final output content (encrypt if original was encrypted)
        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(
            dvmSkBytes, 
            jobRequestEvent.pubkey, 
            ollamaOutput
          ).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ 
              message: "Failed to encrypt NIP-90 job result", 
              cause: e 
            }))
          ));
        }

        // Create and publish job result event
        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex,
          jobRequestEvent,
          finalOutputContent,
          invoiceAmountMillisats,
          bolt11Invoice,
          isRequestEncrypted
        );
        
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ 
            message: "Failed to publish job result event", 
            cause: e 
          }))
        ));

        // 6. Send "success" Feedback
        const successFeedback = createNip90FeedbackEvent(
          dvmPrivateKeyHex, 
          jobRequestEvent, 
          "success",
          undefined,
          { amountMillisats: invoiceAmountMillisats, invoice: bolt11Invoice }
        );
        yield* _(publishFeedback(successFeedback));

        // Track successful job completion
        yield* _(telemetry.trackEvent({ 
          category: "dvm:job", 
          action: "job_request_processed_success", 
          label: jobRequestEvent.id 
        }).pipe(Effect.ignoreLogged));
      }).pipe(
        // Centralized error handling for job processing
        Effect.catchAllCause(cause => {
          // Get latest effective config for error handling
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig();
          const dvmPrivateKeyHexForError = effectiveConfigForError.dvmPrivateKeyHex;
          
          // Extract error or create a generic one
          const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
            new DVMJobProcessingError({ 
              message: "Unknown error during DVM job processing", 
              cause 
            })
          );

          // Send error feedback
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHexForError, 
            jobRequestEvent, 
            "error", 
            dvmError.message
          );
          
          // Fork feedback publish so it doesn't block the main error flow
          Effect.runFork(publishFeedback(feedback));

          // Track error and propagate it
          return telemetry.trackEvent({
            category: "dvm:error", 
            action: "job_request_processing_failure",
            label: jobRequestEvent.id, 
            value: dvmError.message
          }).pipe(
            Effect.ignoreLogged,
            Effect.andThen(Effect.fail(dvmError as DVMError))
          );
        })
      );

    // Return the service interface
    return {
      startListening: (): Effect.Effect<void, DVMConfigError | DVMConnectionError | TrackEventError, never> => 
        Effect.gen(function* (_) {
          // Check if already active
          if (isActiveInternal) {
            yield* _(telemetry.trackEvent({ 
              category: 'dvm:status', 
              action: 'start_listening_already_active' 
            }).pipe(Effect.ignoreLogged));
            return;
          }

          // Get effective settings from a single call
          const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
          currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;

          // Check for required config
          if (!effectiveConfig.dvmPrivateKeyHex) {
            return yield* _(Effect.fail(new DVMConfigError({ 
              message: "DVM private key not configured." 
            })));
          }
          
          if (effectiveConfig.relays.length === 0) {
            return yield* _(Effect.fail(new DVMConfigError({ 
              message: "No DVM relays configured." 
            })));
          }

          yield* _(telemetry.trackEvent({
            category: 'dvm:status',
            action: 'start_listening_attempt',
            label: `Relays: ${effectiveConfig.relays.join(', ')}, Kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
          }).pipe(Effect.ignoreLogged));

          // Create filter for job requests
          const jobRequestFilter: NostrFilter = {
            kinds: effectiveConfig.supportedJobKinds,
            since: Math.floor(Date.now() / 1000) - 300, // Look for recent jobs (last 5 mins)
          };

          // Subscribe to events with custom relays from effective config
          const sub = yield* _(nostr.subscribeToEvents(
            [jobRequestFilter],
            (event: NostrEvent) => {
              // Get latest config for this check to handle potential settings changes during runtime
              const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig();
              if (event.pubkey === latestConfig.dvmPublicKeyHex && 
                (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) {
                return;
              }
              
              // Fork job processing so it runs independently
              Effect.runFork(processJobRequestInternal(event));
            },
            effectiveConfig.relays, // Pass the effective relays from user settings
            () => { // onEOSE callback
              Effect.runFork(telemetry.trackEvent({
                category: "dvm:nostr",
                action: "subscription_eose",
                label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
              }).pipe(Effect.ignoreLogged));
            }
          ).pipe(
            Effect.mapError(e => new DVMConnectionError({ 
              message: "Failed to subscribe to Nostr for DVM requests", 
              cause: e 
            }))
          ));

          // Store subscription and update state
          currentSubscription = sub;
          isActiveInternal = true;
          
          // Create the invoice check effect with proper error handling
          const invoiceCheckLoopEffect = checkAndUpdateInvoiceStatuses().pipe(
            Effect.catchAllCause(cause => 
              telemetry.trackEvent({
                category: "dvm:error",
                action: "invoice_check_loop_error",
                label: "Error in periodic invoice check loop",
                value: Cause.pretty(cause)
              }).pipe(Effect.ignoreLogged)
            )
          );
          
          // Schedule the effect to run periodically (every 2 minutes)
          const scheduledInvoiceCheck = Effect.repeat(
            invoiceCheckLoopEffect,
            Schedule.spaced(Duration.minutes(2))
          );
          
          // Provide the required services to the scheduled effect
          const fullyProvidedCheck = scheduledInvoiceCheck.pipe(
            Effect.provideService(SparkService, spark),
            Effect.provideService(TelemetryService, telemetry)
          );
          
          // Fork the scheduled effect into its own fiber - properly typed now
          invoiceCheckFiber = Effect.runFork(fullyProvidedCheck) as Fiber.RuntimeFiber<void, never>;
          
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:status', 
            action: 'invoice_check_loop_started' 
          }).pipe(Effect.ignoreLogged));
          
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:status', 
            action: 'start_listening_success' 
          }).pipe(Effect.ignoreLogged));
        }),
      
      stopListening: (): Effect.Effect<void, DVMError | TrackEventError, never> => 
        Effect.gen(function* (_) {
          // Check if already inactive
          if (!isActiveInternal) {
            yield* _(telemetry.trackEvent({ 
              category: 'dvm:status', 
              action: 'stop_listening_already_inactive'
            }).pipe(Effect.ignoreLogged));
            return;
          }
          
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:status', 
            action: 'stop_listening_attempt'
          }).pipe(Effect.ignoreLogged));
          
          // Unsubscribe if we have a subscription
          if (currentSubscription) {
            try {
              currentSubscription.unsub();
              currentSubscription = null;
            } catch (e) {
              // Log error but continue (don't fail the stopListening)
              yield* _(telemetry.trackEvent({ 
                category: 'dvm:error', 
                action: 'stop_listening_unsub_failure', 
                label: e instanceof Error ? e.message : String(e) 
              }).pipe(Effect.ignoreLogged));
            }
          }
          
          // Interrupt the invoice checking fiber if active
          if (invoiceCheckFiber) {
            Effect.runFork(Fiber.interrupt(invoiceCheckFiber));
            invoiceCheckFiber = null;
            yield* _(telemetry.trackEvent({ 
              category: 'dvm:status', 
              action: 'invoice_check_loop_stopped' 
            }).pipe(Effect.ignoreLogged));
          }
          
          // Update state
          isActiveInternal = false;
          
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:status', 
            action: 'stop_listening_success'
          }).pipe(Effect.ignoreLogged));
        }),
      
      isListening: (): Effect.Effect<boolean, DVMError | TrackEventError, never> => 
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:status', 
            action: 'check_listening_status', 
            label: isActiveInternal ? 'active' : 'inactive'
          }).pipe(Effect.ignoreLogged));
          
          return isActiveInternal;
        }),

      getJobHistory: (options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }): Effect.Effect<{ entries: JobHistoryEntry[]; totalCount: number }, DVMError | TrackEventError, never> => 
        getJobHistoryStub(options).pipe(
          Effect.provideService(TelemetryService, telemetry)
        ),

      getJobStatistics: (): Effect.Effect<JobStatistics, DVMError | TrackEventError, never> => 
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:stats', 
            action: 'get_job_statistics_stub' 
          }).pipe(Effect.ignoreLogged));
          
          // Mock statistics (to be replaced with actual calculations in a future task)
          const mockStats: JobStatistics = {
            totalJobsProcessed: 125,
            totalSuccessfulJobs: 90,
            totalFailedJobs: 15,
            totalRevenueSats: 1850,
            jobsPendingPayment: 20,
            averageProcessingTimeMs: 3250,
            modelUsageCounts: { 
              "gemma2:latest": 70, 
              "llama3:instruct": 20, 
              "codellama:latest": 25,
              "other_model": 10 
            }
          };
          
          return mockStats;
        })
    };
  })
);