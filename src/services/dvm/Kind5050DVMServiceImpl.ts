import { Effect, Layer, Schema, Option, Cause, Schedule, Duration } from 'effect';
import * as Fiber from 'effect/Fiber';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService, TrackEventError } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError, NostrRequestError } from '@/services/nostr';
import { AgentLanguageModel, type GenerateTextOptions } from '@/services/ai/core';
import { AIProviderError } from '@/services/ai/core/AIError';
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
import type { JobHistoryEntry, JobStatistics, JobStatus } from '@/types/dvm';

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
    const agentLanguageModel = yield* _(AgentLanguageModel);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);
    
    // Local state for service
    let isActiveInternal = config.active || false;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex = useDVMSettingsStore.getState().getDerivedPublicKeyHex() || config.dvmPublicKeyHex;
    // Use more specific typing for the fiber
    let invoiceCheckFiber: Fiber.RuntimeFiber<number, never> | null = null;
    
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
     * Real job history data function that fetches events from Nostr relays
     * Taking TelemetryService and NostrService as dependencies through Effect context
     */
    const getJobHistory = (
      options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }
    ): Effect.Effect<{ entries: JobHistoryEntry[]; totalCount: number }, DVMError | TrackEventError, TelemetryService | NostrService> =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localNostr = yield* ctx(NostrService);
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPk = effectiveConfig.dvmPublicKeyHex;

        if (!dvmPk) {
          yield* _(localTelemetry.trackEvent({ category: 'dvm:history', action: 'get_job_history_no_dvm_pk' }).pipe(Effect.ignoreLogged));
          return { entries: [], totalCount: 0 };
        }

        yield* _(localTelemetry.trackEvent({
          category: 'dvm:history',
          action: 'get_job_history_start',
          label: `Page: ${options.page}, DVM PK: ${dvmPk.substring(0,8)}...`
        }).pipe(Effect.ignoreLogged));

        const resultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
        const filters: NostrFilter[] = [
          { kinds: resultKinds, authors: [dvmPk], limit: options.pageSize * options.page }, // Fetch up to current page for sorting
          { kinds: [7000], authors: [dvmPk], "#s": ["success"], limit: options.pageSize * options.page }
        ];

        const fetchedEvents = yield* _(localNostr.listEvents(filters).pipe(
          Effect.mapError(e => new DVMConnectionError({ message: "Failed to fetch DVM history from relays", cause: e}))
        ));

        // Sort all fetched events by created_at descending
        const sortedEvents = fetchedEvents.sort((a, b) => b.created_at - a.created_at);

        // Paginate after sorting
        const paginatedEvents = sortedEvents.slice(
            (options.page - 1) * options.pageSize,
            options.page * options.pageSize
        );

        const entries: JobHistoryEntry[] = paginatedEvents.map(event => {
          const requestTag = event.tags.find(t => t[0] === 'e');
          const requesterTag = event.tags.find(t => t[0] === 'p');
          const amountTag = event.tags.find(t => t[0] === 'amount');

          let jobStatus: JobStatus = 'completed'; // Default for kind 6xxx
          if (event.kind === 7000) {
            const statusTag = event.tags.find(t => t[0] === 'status');
            jobStatus = statusTag?.[1] as JobStatus || 'completed'; // Assume 'success' maps to 'completed'
          }

          return {
            id: event.id,
            timestamp: event.created_at * 1000,
            jobRequestEventId: requestTag?.[1] || 'N/A',
            requesterPubkey: requesterTag?.[1] || 'N/A',
            kind: event.kind, // This is the result/feedback kind. Original request kind needs more work.
            inputSummary: 'N/A', // Requires fetching original request or different storage
            status: jobStatus,
            ollamaModelUsed: 'N/A', // Not available in 6xxx/7000 unless explicitly tagged
            tokensProcessed: undefined,
            invoiceAmountSats: amountTag?.[1] ? Math.floor(parseInt(amountTag[1], 10) / 1000) : undefined,
            invoiceBolt11: amountTag?.[2],
            resultSummary: event.content.substring(0, 100) + (event.content.length > 100 ? '...' : ''),
          };
        });

        yield* _(localTelemetry.trackEvent({
          category: 'dvm:history',
          action: 'get_job_history_success',
          value: `${entries.length} entries fetched`
        }).pipe(Effect.ignoreLogged));

        // For totalCount, we'd ideally query count from relay or fetch all and count.
        // For now, use the length of initially fetched (potentially larger than one page) sorted events as a proxy.
        return { entries, totalCount: sortedEvents.length };
      });

    /**
     * Real job statistics function that calculates metrics from fetched events
     * Taking TelemetryService and NostrService as dependencies through Effect context  
     */
    const getJobStatistics = (): Effect.Effect<JobStatistics, DVMError | TrackEventError, TelemetryService | NostrService> =>
      Effect.gen(function*(ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localNostr = yield* ctx(NostrService);
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPk = effectiveConfig.dvmPublicKeyHex;

        if (!dvmPk) {
          yield* _(localTelemetry.trackEvent({ category: 'dvm:stats', action: 'get_stats_no_dvm_pk' }).pipe(Effect.ignoreLogged));
          return { totalJobsProcessed: 0, totalSuccessfulJobs: 0, totalFailedJobs: 0, totalRevenueSats: 0, jobsPendingPayment: 0 };
        }

        yield* _(localTelemetry.trackEvent({ category: 'dvm:stats', action: 'get_job_statistics_start' }).pipe(Effect.ignoreLogged));

        const resultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
        const filters: NostrFilter[] = [
          { kinds: resultKinds, authors: [dvmPk], limit: 500 }, // Fetch more for stats
          { kinds: [7000], authors: [dvmPk], limit: 500 }        // Fetch all feedback
        ];
        const allEvents = yield* _(localNostr.listEvents(filters).pipe(
            Effect.mapError(e => new DVMConnectionError({ message: "Failed to fetch DVM stats from relays", cause: e}))
        ));

        const stats: JobStatistics = {
          totalJobsProcessed: 0,
          totalSuccessfulJobs: 0,
          totalFailedJobs: 0,
          totalRevenueSats: 0,
          jobsPendingPayment: 0,
          modelUsageCounts: {}
        };

        const processedJobRequestIds = new Set<string>();

        allEvents.forEach(event => {
          const requestTag = event.tags.find(t => t[0] === 'e');
          if (requestTag?.[1]) processedJobRequestIds.add(requestTag[1]);

          if (event.kind >= 6000 && event.kind <= 6999) {
            stats.totalSuccessfulJobs++; // Assume all 6xxx are successful results
            const amountTag = event.tags.find(t => t[0] === 'amount');
            if (amountTag?.[1]) {
              stats.totalRevenueSats += Math.floor(parseInt(amountTag[1], 10) / 1000);
            }
          } else if (event.kind === 7000) {
            const statusTag = event.tags.find(t => t[0] === 'status');
            if (statusTag?.[1] === 'success') {
              stats.totalSuccessfulJobs++;
              const amountTag = event.tags.find(t => t[0] === 'amount');
              if (amountTag?.[1]) {
                  stats.totalRevenueSats += Math.floor(parseInt(amountTag[1], 10) / 1000);
              }
            } else if (statusTag?.[1] === 'error') {
              stats.totalFailedJobs++;
            } else if (statusTag?.[1] === 'payment-required') {
              stats.jobsPendingPayment++;
            }
          }
        });
        stats.totalJobsProcessed = processedJobRequestIds.size;

        yield* _(localTelemetry.trackEvent({ category: 'dvm:stats', action: 'get_job_statistics_success', value: JSON.stringify(stats) }).pipe(Effect.ignoreLogged));
        return stats;
      });

    /** 
     * Check for invoice status updates and update job statuses
     * Runs periodically when DVM is active
     */
    const checkAndUpdateInvoiceStatuses = (): Effect.Effect<void, DVMError | TrackEventError, SparkService | TelemetryService | NostrService> =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localSpark = yield* ctx(SparkService);
        const localNostr = yield* ctx(NostrService);

        yield* _(localTelemetry.trackEvent({
          category: 'dvm:payment_check',
          action: 'check_all_invoices_start'
        }).pipe(Effect.ignoreLogged));

        const historyResult = yield* _(
          getJobHistory({ page: 1, pageSize: 500 }).pipe( // Use the real getJobHistory
            Effect.provideService(TelemetryService, localTelemetry),
            Effect.provideService(NostrService, localNostr)
          )
        );

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

        for (const job of pendingPaymentJobs) {
          if (!job.invoiceBolt11) continue;

          yield* _(localTelemetry.trackEvent({
            category: 'dvm:payment_check',
            action: 'check_invoice_attempt',
            label: `Job ID: ${job.id}`,
            value: job.invoiceBolt11.substring(0, 20) + '...'
          }).pipe(Effect.ignoreLogged));

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
                return Effect.succeed<InvoiceStatusResult>({
                  status: 'error' as const,
                  message: sparkErr.message
                });
              })
            )
          );

          if (invoiceStatusResult.status === 'paid') {
            yield* _(localTelemetry.trackEvent({
              category: 'dvm:payment_check',
              action: 'invoice_paid',
              label: `Job ID: ${job.id}`,
              value: JSON.stringify({ amount: invoiceStatusResult.amountPaidMsats })
            }).pipe(Effect.ignoreLogged));
            // TODO: Update job status to 'paid' in actual persistence.
            console.log(`[DVM] Job ${job.id} invoice PAID. Amount: ${invoiceStatusResult.amountPaidMsats} msats. Conceptual update to status: 'paid'.`);
          }
          else if (invoiceStatusResult.status === 'expired' || invoiceStatusResult.status === 'error') {
            yield* _(localTelemetry.trackEvent({
              category: 'dvm:payment_check',
              action: `invoice_${invoiceStatusResult.status}`,
              label: `Job ID: ${job.id}`,
              value: invoiceStatusResult.status === 'error'
                ? invoiceStatusResult.message
                : undefined
            }).pipe(Effect.ignoreLogged));
            console.log(`[DVM] Job ${job.id} invoice ${invoiceStatusResult.status}.`);
          }
        }

        yield* _(localTelemetry.trackEvent({
          category: 'dvm:payment_check',
          action: 'check_all_invoices_complete'
        }).pipe(Effect.ignoreLogged));
      });

    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        yield* _(telemetry.trackEvent({
          category: "dvm:job",
          action: "job_request_received",
          label: jobRequestEvent.id,
          value: `Kind: ${jobRequestEvent.kind}`
        }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
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
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({
              message: "Failed to parse decrypted JSON tags",
              cause: e
            })));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        let outputMimeType = "text/plain";
        let bidMillisats: number | undefined;

        inputsSource.forEach(tag => {
          if (tag[0] === 'i' && tag.length >= 3) {
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

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent( dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }

        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const aiModel = paramsMap.get("model") || textGenConfig.model;
        const generateOptions: GenerateTextOptions = {
          prompt: prompt,
          model: aiModel,
          temperature: textGenConfig.temperature,
          maxTokens: textGenConfig.max_tokens
        };

        yield* _(telemetry.trackEvent({
          category: "dvm:job",
          action: "ai_params_intended",
          label: `Job ID: ${jobRequestEvent.id}`,
          value: JSON.stringify({
            requestParams: Object.fromEntries(paramsMap),
            aiModelUsed: generateOptions.model,
            defaultJobConfigParams: {
              max_tokens: textGenConfig.max_tokens,
              temperature: textGenConfig.temperature,
              top_k: textGenConfig.top_k,
              top_p: textGenConfig.top_p,
              frequency_penalty: textGenConfig.frequency_penalty
            }
          })
        }).pipe(Effect.ignoreLogged));

        const aiResponse = yield* _(agentLanguageModel.generateText(generateOptions).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ 
            message: `AI inference failed: ${e instanceof Error ? e.message : String(e) || "Unknown error"}`, 
            cause: e 
          }))
        ));

        const aiOutput = aiResponse.text || "";
        // Estimate token usage since we don't get it directly from AgentLanguageModel
        const usage = {
          prompt_tokens: Math.ceil(prompt.length / 4),
          completion_tokens: Math.ceil(aiOutput.length / 4),
          total_tokens: Math.ceil((prompt.length + aiOutput.length) / 4)
        };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceParams: CreateLightningInvoiceParams = {
          amountSats: priceSats,
          memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0, 8)}`
        };
        const invoiceResult = yield* _(spark.createLightningInvoice(invoiceParams).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceResult.invoice.encodedInvoice;

        let finalOutputContent = aiOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(
            dvmSkBytes,
            jobRequestEvent.pubkey,
            aiOutput
          ).pipe(
            Effect.mapError(e => new DVMJobProcessingError({
              message: "Failed to encrypt NIP-90 job result",
              cause: e
            }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex,
          jobRequestEvent,
          finalOutputContent,
          invoiceAmountMillisats,
          bolt11Invoice,
          isRequestEncrypted
        );

        yield* _(telemetry.trackEvent({
          category: "dvm:job",
          action: "job_result_ready",
          label: `Job ID: ${jobRequestEvent.id}`,
          value: JSON.stringify({
            totalTokens,
            priceSats,
            outputLength: aiOutput.length,
            encrypted: isRequestEncrypted
          })
        }).pipe(Effect.ignoreLogged));

        // Publish result
        const publishResultEffect = nostr.publishEvent(jobResultEvent).pipe(
          Effect.tap(_ => {
            // Create a payment-required feedback after successful result publication
            const paymentRequiredFeedback = createNip90FeedbackEvent(
              dvmPrivateKeyHex,
              jobRequestEvent,
              "payment-required",
              `Payment requested: ${priceSats} sats (${totalTokens} tokens)`,
              { amountMillisats: invoiceAmountMillisats, invoice: bolt11Invoice }
            );
            // Publish payment-required feedback as fire-and-forget
            return publishFeedback(paymentRequiredFeedback);
          }),
          Effect.mapError(e => new DVMConnectionError({
            message: "Failed to publish NIP-90 job result", 
            cause: e
          }))
        );

        yield* _(publishResultEffect);

        yield* _(telemetry.trackEvent({
          category: "dvm:job",
          action: "job_result_published",
          label: `Job ID: ${jobRequestEvent.id}`,
          value: jobResultEvent.id
        }).pipe(Effect.ignoreLogged));
      });
    
    /**
     * Start listening for NIP-90 job requests from Nostr relays
     * Once started, the DVM will process incoming jobs automatically
     */
    const startListening = (): Effect.Effect<void, DVMError | TrackEventError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const dvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;
        const relays = effectiveConfig.relays;

        yield* _(telemetry.trackEvent({ 
          category: 'dvm:admin', 
          action: 'start_listening_attempt',
          label: dvmPublicKeyHex,
          value: `Relays: ${relays.length}`
        }).pipe(Effect.ignoreLogged));

        if (!dvmPrivateKeyHex) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:error', 
            action: 'start_listening_no_private_key'
          }).pipe(Effect.ignoreLogged));
          return yield* _(Effect.fail(new DVMConfigError({ 
            message: "No DVM private key specified. Set a key in DVM settings." 
          })));
        }

        if (relays.length === 0) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:error', 
            action: 'start_listening_no_relays'
          }).pipe(Effect.ignoreLogged));
          return yield* _(Effect.fail(new DVMConfigError({ 
            message: "No relays specified for DVM. Configure relays in DVM settings." 
          })));
        }

        // Only start listening if not already listening
        if (isActiveInternal && currentSubscription) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:admin', 
            action: 'already_listening_noop'
          }).pipe(Effect.ignoreLogged));
          return;
        }

        // Get supported job kinds from config
        const supportedKinds = effectiveConfig.supportedJobKinds;

        // Create subscription filter to listen for job requests
        const filters: NostrFilter[] = [
          { 
            kinds: supportedKinds,
            '#p': [dvmPublicKeyHex],
            since: Math.floor(Date.now() / 1000) - 60 // Last minute only
          }
        ];

        // Start the invoice check fiber if it's not already running or if it's completed
        // Since there's no direct isRunning method, we simply start a new fiber if needed
        if (!invoiceCheckFiber) {
          const scheduledInvoiceChecks = Effect.repeat(
            checkAndUpdateInvoiceStatuses().pipe(
              Effect.provideService(SparkService, spark),
              Effect.provideService(NostrService, nostr),
              Effect.provideService(TelemetryService, telemetry),
              Effect.catchAllCause(cause => {
                console.error("Invoice check error:", Cause.pretty(cause));
                return Effect.logInfo("Continuing with invoice checks despite error");
              })
            ),
            Schedule.spaced(Duration.seconds(60)) // Check every minute
          );

          invoiceCheckFiber = Effect.runFork(scheduledInvoiceChecks);
        }

        // Make subscription to Nostr relays
        const onEvent = (event: NostrEvent) => {
          if (isActiveInternal) {
            // Use Effect.runFork instead of yield* for non-generator callback
            Effect.runFork(telemetry.trackEvent({ 
              category: 'dvm:event', 
              action: 'received_job_request',
              label: event.id,
              value: `Kind: ${event.kind}` 
            }).pipe(Effect.ignoreLogged));
            Effect.runFork(processJobRequestInternal(event));
          }
        };

        const onEOSE = (relay: string) => {
          // Use Effect.runFork instead of yield* for non-generator callback
          Effect.runFork(telemetry.trackEvent({ 
            category: 'dvm:event', 
            action: 'eose_received',
            label: relay
          }).pipe(Effect.ignoreLogged));
        };

        try {
          const sub = yield* _(nostr.subscribeToEvents(filters, onEvent, relays, onEOSE).pipe(
            Effect.mapError(e => new DVMConnectionError({ message: "Failed to establish relay connection", cause: e }))
          ));
          currentSubscription = sub;
          isActiveInternal = true;
          currentDvmPublicKeyHex = dvmPublicKeyHex;

          yield* _(telemetry.trackEvent({ 
            category: 'dvm:admin', 
            action: 'start_listening_success',
            label: currentDvmPublicKeyHex,
            value: `Relays: ${relays.length}, Kinds: ${supportedKinds.join(',')}` 
          }).pipe(Effect.ignoreLogged));
        } catch (e) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:error', 
            action: 'start_listening_exception',
            value: String(e) 
          }).pipe(Effect.ignoreLogged));
          return yield* _(Effect.fail(new DVMConnectionError({ 
            message: "Failed to start listening for job requests", 
            cause: e 
          })));
        }
      });
    
    /**
     * Stop listening for NIP-90 job requests
     */
    const stopListening = (): Effect.Effect<void, DVMError | TrackEventError, never> => 
      Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ 
          category: 'dvm:admin', 
          action: 'stop_listening'
        }).pipe(Effect.ignoreLogged));

        if (!isActiveInternal || !currentSubscription) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:admin', 
            action: 'stop_listening_noop', 
            label: 'Not currently listening'
          }).pipe(Effect.ignoreLogged));
          return;
        }

        try {
          // Unsubscribe from events
          currentSubscription.unsub();
          currentSubscription = null;
          isActiveInternal = false;

          // Cancel invoice check fiber if it's running
          if (invoiceCheckFiber) {
            Fiber.interrupt(invoiceCheckFiber);
            invoiceCheckFiber = null;
          }
          
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:admin', 
            action: 'stop_listening_success'
          }).pipe(Effect.ignoreLogged));
        } catch (e) {
          yield* _(telemetry.trackEvent({ 
            category: 'dvm:error', 
            action: 'stop_listening_exception',
            value: String(e) 
          }).pipe(Effect.ignoreLogged));
          return yield* _(Effect.fail(new DVMConnectionError({ 
            message: "Failed to stop listening for job requests", 
            cause: e 
          })));
        }
      });
    
    /**
     * Check if the DVM is currently listening for job requests
     */
    const isListening = (): Effect.Effect<boolean, DVMError | TrackEventError, never> => 
      Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({ 
          category: 'dvm:admin', 
          action: 'check_listening_status',
          value: isActiveInternal ? "active" : "inactive"
        }).pipe(Effect.ignoreLogged));
        return isActiveInternal;
      });

    /**
     * Process a local test job without involving Nostr network
     * This method is used for testing the DVM functionality locally
     * 
     * @param prompt The text prompt to process
     * @param requesterPkOverride Optional: simulates a request from a specific pubkey
     * @returns The processed job result text
     */
    const processLocalTestJob = (
      prompt: string,
      requesterPkOverride?: string
    ): Effect.Effect<string, DVMError | AIProviderError | SparkError | NIP04EncryptError | NIP04DecryptError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const dvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        yield* _(telemetry.trackEvent({
          category: "dvm:local_test",
          action: "process_local_test_job",
          label: prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "")
        }).pipe(Effect.ignoreLogged));

        if (!dvmPrivateKeyHex || !dvmPublicKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ 
            message: "No DVM keypair available. Configure DVM settings first." 
          })));
        }

        // Create a simulated NIP-90 job request event
        const requesterPk = requesterPkOverride || "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
        const simulatedRequestEvent: NostrEvent = {
          id: "local_test_event_" + Date.now().toString(16),
          pubkey: requesterPk,
          created_at: Math.floor(Date.now() / 1000),
          kind: 5100, // Kind 5100 is a general text generation job
          tags: [
            ["i", prompt, "text"],
            ["output", "text/plain"]
          ],
          content: "", 
          sig: "simulated_signature_for_test_only"
        };

        // Process the job using existing logic
        const aiModel = textGenConfig.model;
        const generateOptions: GenerateTextOptions = {
          prompt: prompt,
          model: aiModel,
          temperature: textGenConfig.temperature,
          maxTokens: textGenConfig.max_tokens
        };

        const aiResponse = yield* _(agentLanguageModel.generateText(generateOptions).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ 
            message: `AI inference failed: ${e instanceof Error ? e.message : String(e) || "Unknown error"}`, 
            cause: e 
          }))
        ));

        const aiOutput = aiResponse.text || "";
        // Estimate token usage
        const usage = {
          prompt_tokens: Math.ceil(prompt.length / 4),
          completion_tokens: Math.ceil(aiOutput.length / 4),
          total_tokens: Math.ceil((prompt.length + aiOutput.length) / 4)
        };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceParams: CreateLightningInvoiceParams = {
          amountSats: priceSats,
          memo: `NIP-90 Local Test Job`
        };
        const invoiceResult = yield* _(spark.createLightningInvoice(invoiceParams).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceResult.invoice.encodedInvoice;

        yield* _(telemetry.trackEvent({
          category: "dvm:local_test",
          action: "local_test_job_complete",
          value: JSON.stringify({
            totalTokens,
            priceSats,
            outputLength: aiOutput.length
          })
        }).pipe(Effect.ignoreLogged));

        // Return the output directly for local test job
        return `${aiOutput}\n\n---\nTokens: ${totalTokens} | Price: ${priceSats} sats | Invoice: ${bolt11Invoice.substring(0, 20)}...`;
      });

    /**
     * Return the service interface with implementations of all methods
     */
    return {
      startListening: () => 
        startListening().pipe(
          Effect.catchAllCause(cause => {
            // Use Effect.runFork instead of yield* for non-generator callback
            Effect.runFork(telemetry.trackEvent({
              category: 'dvm:error',
              action: 'startListening_uncaught_error',
              value: Cause.pretty(cause)
            }).pipe(Effect.ignoreLogged));
            return Effect.failCause(cause);
          })
        ),

      stopListening: () => 
        stopListening().pipe(
          Effect.catchAllCause(cause => {
            // Use Effect.runFork instead of yield* for non-generator callback
            Effect.runFork(telemetry.trackEvent({
              category: 'dvm:error',
              action: 'stopListening_uncaught_error',
              value: Cause.pretty(cause)
            }).pipe(Effect.ignoreLogged));
            return Effect.failCause(cause);
          })
        ),

      isListening: () =>
        isListening().pipe(
          Effect.catchAllCause(cause => {
            // Use Effect.runFork instead of yield* for non-generator callback
            Effect.runFork(telemetry.trackEvent({
              category: 'dvm:error',
              action: 'isListening_uncaught_error',
              value: Cause.pretty(cause)
            }).pipe(Effect.ignoreLogged));
            return Effect.failCause(cause);
          })
        ),

      processLocalTestJob: (prompt, requesterPkOverride) =>
        processLocalTestJob(prompt, requesterPkOverride).pipe(
          Effect.catchAllCause(cause => {
            // Use Effect.runFork instead of yield* for non-generator callback
            Effect.runFork(telemetry.trackEvent({
              category: 'dvm:error',
              action: 'processLocalTestJob_uncaught_error',
              value: Cause.pretty(cause)
            }).pipe(Effect.ignoreLogged));
            return Effect.failCause(cause);
          })
        ),

      // Replace mock implementation with real implementation
      getJobHistory: (options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }): Effect.Effect<{ entries: JobHistoryEntry[]; totalCount: number }, DVMError | TrackEventError, never> => 
        getJobHistory(options).pipe(
          Effect.provideService(TelemetryService, telemetry),
          Effect.provideService(NostrService, nostr)
        ),

      // Replace mock implementation with real implementation
      getJobStatistics: (): Effect.Effect<JobStatistics, DVMError | TrackEventError, never> => 
        getJobStatistics().pipe(
          Effect.provideService(TelemetryService, telemetry),
          Effect.provideService(NostrService, nostr)
        ),
    };
  })
);