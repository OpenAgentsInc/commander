// src/services/nip90/NIP90ServiceImpl.ts
import { Effect, Layer, Schema } from "effect";
import { NostrEvent, NostrFilter, NostrPublishError, NostrRequestError, NostrService, Subscription } from '@/services/nostr';
import { NIP04Service, NIP04EncryptError, NIP04DecryptError } from '@/services/nip04';
import { TelemetryService } from '@/services/telemetry';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import {
  NIP90Service,
  CreateNIP90JobParams,
  CreateNIP90JobParamsSchema,
  NIP90JobResult,
  NIP90JobResultSchema,
  NIP90JobFeedback,
  NIP90JobFeedbackSchema,
  NIP90RequestError,
  NIP90ResultError,
  NIP90ValidationError,
  NIP90JobFeedbackStatus
} from './NIP90Service';

// Layer for NIP90Service with dependencies on NostrService, NIP04Service, and TelemetryService
export const NIP90ServiceLive = Layer.effect(
  NIP90Service,
  Effect.gen(function* (_) {
    const nostr = yield* _(NostrService);
    const nip04 = yield* _(NIP04Service);
    const telemetry = yield* _(TelemetryService);

    return {
      createJobRequest: (params) => 
        Effect.gen(function* (_) {
          // Track start of createJobRequest
          yield* _(telemetry.trackEvent({
            category: "feature",
            action: "nip90_create_job_request",
            label: `Creating job request of kind: ${params.kind}`,
          }));

          // Validate params against schema
          try {
            Schema.decodeUnknown(CreateNIP90JobParamsSchema)(params);
          } catch (error) {
            // Track validation failure
            yield* _(telemetry.trackEvent({
              category: "error",
              action: "nip90_validation_error",
              label: `Job request validation error: ${error instanceof Error ? error.message : String(error)}`,
            }));
            
            return yield* _(Effect.fail(new NIP90ValidationError({
              message: "Invalid NIP-90 job request parameters",
              cause: error
            })));
          }

          try {
            // Use existing helper to create the job request event
            const jobEvent = yield* _(createNip90JobRequest(
              params.requesterSk,
              params.targetDvmPubkeyHex || "", // Empty string if not provided, helper handles it
              params.inputs as Array<[string, string, string?, string?, string?]>,
              params.outputMimeType || "text/plain",
              params.bidMillisats,
              params.kind,
              params.additionalParams as Array<['param', string, string]> | undefined
            ));

            // Publish the job request event
            yield* _(nostr.publishEvent(jobEvent));

            // Track success
            yield* _(telemetry.trackEvent({
              category: "feature",
              action: "nip90_job_request_published",
              label: `Published job request with ID: ${jobEvent.id}`,
              value: `Kind: ${jobEvent.kind}`
            }));

            return jobEvent;
          } catch (error) {
            // Track error
            yield* _(telemetry.trackEvent({
              category: "error",
              action: "nip90_create_job_request_error",
              label: `Failed to create or publish job request: ${error instanceof Error ? error.message : String(error)}`,
            }));

            if (error instanceof NIP04EncryptError) {
              return yield* _(Effect.fail(error));
            }
            if (error instanceof NostrPublishError) {
              return yield* _(Effect.fail(error));
            }
            
            return yield* _(Effect.fail(new NIP90RequestError({
              message: "Failed to create or publish NIP-90 job request",
              cause: error
            })));
          }
        }),

      getJobResult: (jobRequestEventId, dvmPubkeyHex, decryptionKey) =>
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "feature",
            action: "nip90_get_job_result",
            label: `Fetching job result for request: ${jobRequestEventId}`,
          }));

          try {
            // Create filter for job result events
            const filter: NostrFilter = { 
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i), // 6000-6999
              "#e": [jobRequestEventId],
              limit: 1
            };

            // Add author filter if DVM pubkey is provided
            if (dvmPubkeyHex) {
              filter.authors = [dvmPubkeyHex];
            }

            // Fetch events
            const events = yield* _(nostr.listEvents([filter]));

            if (events.length === 0) {
              yield* _(telemetry.trackEvent({
                category: "info",
                action: "nip90_no_job_result",
                label: `No job result found for request: ${jobRequestEventId}`,
              }));
              return null;
            }

            // Get the most recent result
            const resultEvent = events[0];
            
            // Process the event into a NIP90JobResult
            let jobResult: NIP90JobResult = {
              ...resultEvent,
              parsedRequest: undefined,
              paymentAmount: undefined,
              paymentInvoice: undefined,
              isEncrypted: false
            };

            // Parse request tag if present
            const requestTag = resultEvent.tags.find(t => t[0] === "request");
            if (requestTag && requestTag[1]) {
              try {
                const parsedRequest = JSON.parse(requestTag[1]);
                // Create a new object with the updated field
                jobResult = { ...jobResult, parsedRequest };
              } catch (e) {
                // Silently fail on JSON parse, this is just a convenience field
              }
            }

            // Parse amount tag if present
            const amountTag = resultEvent.tags.find(t => t[0] === "amount");
            if (amountTag && amountTag[1]) {
              const paymentAmount = parseInt(amountTag[1], 10) || undefined;
              const paymentInvoice = amountTag[2];
              // Create a new object with the updated fields
              jobResult = { ...jobResult, paymentAmount, paymentInvoice };
            }

            // Check if content is encrypted
            const isEncrypted = resultEvent.tags.some(t => t[0] === "encrypted");
            // Create a new object with the updated field
            jobResult = { ...jobResult, isEncrypted };

            // Attempt decryption if necessary and possible
            if (isEncrypted && decryptionKey && resultEvent.pubkey) {
              try {
                const decryptedContent = yield* _(nip04.decrypt(
                  decryptionKey,
                  resultEvent.pubkey,
                  resultEvent.content
                ));
                
                // Return a new object with decrypted content
                const decryptedResult = {
                  ...jobResult,
                  content: decryptedContent
                };

                yield* _(telemetry.trackEvent({
                  category: "feature",
                  action: "nip90_job_result_decrypted",
                  label: `Successfully decrypted job result for request: ${jobRequestEventId}`,
                }));

                return decryptedResult;
              } catch (error) {
                yield* _(telemetry.trackEvent({
                  category: "error",
                  action: "nip90_decryption_error",
                  label: `Failed to decrypt job result: ${error instanceof Error ? error.message : String(error)}`,
                }));
                
                if (error instanceof NIP04DecryptError) {
                  return yield* _(Effect.fail(error));
                }
                
                return yield* _(Effect.fail(new NIP90ResultError({
                  message: "Failed to decrypt NIP-90 job result",
                  cause: error
                })));
              }
            }

            yield* _(telemetry.trackEvent({
              category: "feature",
              action: "nip90_job_result_fetched",
              label: `Successfully fetched job result for request: ${jobRequestEventId}`,
            }));

            return jobResult;
          } catch (error) {
            yield* _(telemetry.trackEvent({
              category: "error",
              action: "nip90_get_job_result_error",
              label: `Failed to fetch job result: ${error instanceof Error ? error.message : String(error)}`,
            }));

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }
            
            return yield* _(Effect.fail(new NIP90ResultError({
              message: "Failed to fetch NIP-90 job result",
              cause: error
            })));
          }
        }),

      listJobFeedback: (jobRequestEventId, dvmPubkeyHex, decryptionKey) =>
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "feature",
            action: "nip90_list_job_feedback",
            label: `Fetching job feedback for request: ${jobRequestEventId}`,
          }));

          try {
            // Create filter for job feedback events (kind 7000)
            const filter: NostrFilter = { 
              kinds: [7000],
              "#e": [jobRequestEventId]
            };

            // Add author filter if DVM pubkey is provided
            if (dvmPubkeyHex) {
              filter.authors = [dvmPubkeyHex];
            }

            // Fetch events
            const events = yield* _(nostr.listEvents([filter]));

            if (events.length === 0) {
              yield* _(telemetry.trackEvent({
                category: "info",
                action: "nip90_no_job_feedback",
                label: `No job feedback found for request: ${jobRequestEventId}`,
              }));
              return [];
            }

            // Process the events into NIP90JobFeedback objects
            const feedbackEvents: NIP90JobFeedback[] = [];

            for (const event of events) {
              let feedbackEvent: NIP90JobFeedback = {
                ...event,
                kind: 7000, // Ensure it's the right kind
                parsedRequest: undefined,
                paymentAmount: undefined,
                paymentInvoice: undefined,
                isEncrypted: false,
                status: undefined,
                statusExtraInfo: undefined
              };

              // Parse status tag if present
              const statusTag = event.tags.find(t => t[0] === "status");
              if (statusTag && statusTag[1]) {
                // Validate against known status values
                const status = statusTag[1] as NIP90JobFeedbackStatus;
                if (["payment-required", "processing", "error", "success", "partial"].includes(status)) {
                  // Create a new object with the updated fields
                  feedbackEvent = { 
                    ...feedbackEvent, 
                    status, 
                    statusExtraInfo: statusTag[2] // Optional extra info
                  };
                }
              }

              // Parse amount tag if present
              const amountTag = event.tags.find(t => t[0] === "amount");
              if (amountTag && amountTag[1]) {
                const paymentAmount = parseInt(amountTag[1], 10) || undefined;
                const paymentInvoice = amountTag[2];
                // Create a new object with the updated fields
                feedbackEvent = { ...feedbackEvent, paymentAmount, paymentInvoice };
              }

              // Check if content is encrypted
              const isEncrypted = event.tags.some(t => t[0] === "encrypted");
              // Create a new object with the updated field
              feedbackEvent = { ...feedbackEvent, isEncrypted };

              // Attempt decryption if necessary and possible
              if (isEncrypted && decryptionKey && event.pubkey) {
                try {
                  const decryptedContent = yield* _(nip04.decrypt(
                    decryptionKey,
                    event.pubkey,
                    event.content
                  ));
                  
                  // Create a new object with the updated field
                  feedbackEvent = { ...feedbackEvent, content: decryptedContent };
                } catch (error) {
                  // If decryption fails, log but don't fail the entire operation
                  // as we might have other feedback events that are valid
                  console.error("Failed to decrypt feedback content:", error);
                  yield* _(telemetry.trackEvent({
                    category: "error",
                    action: "nip90_feedback_decryption_error",
                    label: `Failed to decrypt feedback content: ${error instanceof Error ? error.message : String(error)}`,
                  }));
                }
              }

              feedbackEvents.push(feedbackEvent);
            }

            yield* _(telemetry.trackEvent({
              category: "feature",
              action: "nip90_job_feedback_fetched",
              label: `Successfully fetched ${feedbackEvents.length} job feedback events for request: ${jobRequestEventId}`,
            }));

            return feedbackEvents;
          } catch (error) {
            yield* _(telemetry.trackEvent({
              category: "error",
              action: "nip90_list_job_feedback_error",
              label: `Failed to fetch job feedback: ${error instanceof Error ? error.message : String(error)}`,
            }));

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }
            
            return yield* _(Effect.fail(new NIP90ResultError({
              message: "Failed to fetch NIP-90 job feedback",
              cause: error
            })));
          }
        }),

      subscribeToJobUpdates: (jobRequestEventId, dvmPubkeyHex, decryptionKey, onUpdate) =>
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "feature",
            action: "nip90_subscribe_job_updates",
            label: `Subscribing to updates for job request: ${jobRequestEventId}`,
          }));

          try {
            // Create filters for both result (6xxx) and feedback (7000) events
            const resultFilter: NostrFilter = { 
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i), // 6000-6999
              "#e": [jobRequestEventId],
              authors: [dvmPubkeyHex]
            };

            const feedbackFilter: NostrFilter = { 
              kinds: [7000],
              "#e": [jobRequestEventId],
              authors: [dvmPubkeyHex]
            };

            // Subscribe to both event types
            const subscription = yield* _(nostr.subscribeToEvents(
              [resultFilter, feedbackFilter],
              (event) => {
                try {
                  // Determine if it's a result (6xxx) or feedback (7000) event
                  if (event.kind === 7000) {
                    // Process as feedback
                    let feedbackEvent: NIP90JobFeedback = {
                      ...event,
                      kind: 7000,
                      parsedRequest: undefined,
                      paymentAmount: undefined,
                      paymentInvoice: undefined,
                      isEncrypted: false,
                      status: undefined,
                      statusExtraInfo: undefined
                    };

                    // Parse status tag if present
                    const statusTag = event.tags.find(t => t[0] === "status");
                    if (statusTag && statusTag[1]) {
                      const status = statusTag[1] as NIP90JobFeedbackStatus;
                      if (["payment-required", "processing", "error", "success", "partial"].includes(status)) {
                        // Create a new object with updated fields
                        feedbackEvent = { 
                          ...feedbackEvent, 
                          status, 
                          statusExtraInfo: statusTag[2] 
                        };
                      }
                    }

                    // Parse amount tag if present
                    const amountTag = event.tags.find(t => t[0] === "amount");
                    if (amountTag && amountTag[1]) {
                      // Create a new object with updated fields
                      feedbackEvent = {
                        ...feedbackEvent,
                        paymentAmount: parseInt(amountTag[1], 10) || undefined,
                        paymentInvoice: amountTag[2]
                      };
                    }

                    // Check for encryption
                    const isEncrypted = event.tags.some(t => t[0] === "encrypted");
                    feedbackEvent = { ...feedbackEvent, isEncrypted };

                    // Handle encrypted content
                    if (isEncrypted) {
                      // Use runSync for immediate execution in the callback context
                      Effect.runSync(Effect.gen(function* (_) {
                        try {
                          const decryptedContent = yield* _(nip04.decrypt(
                            decryptionKey,
                            event.pubkey,
                            event.content
                          ));
                          // Create final updated object and pass to callback
                          const updatedFeedbackEvent = { ...feedbackEvent, content: decryptedContent };
                          onUpdate(updatedFeedbackEvent);
                        } catch (error) {
                          console.error("Failed to decrypt feedback content in subscription:", error);
                        }
                      }));
                    } else {
                      // Not encrypted, send as is
                      onUpdate(feedbackEvent);
                    }
                  } else if (event.kind >= 6000 && event.kind <= 6999) {
                    // Process as result
                    let resultEvent: NIP90JobResult = {
                      ...event,
                      parsedRequest: undefined,
                      paymentAmount: undefined,
                      paymentInvoice: undefined,
                      isEncrypted: false
                    };

                    // Parse request tag if present
                    const requestTag = event.tags.find(t => t[0] === "request");
                    if (requestTag && requestTag[1]) {
                      try {
                        const parsedRequest = JSON.parse(requestTag[1]);
                        resultEvent = { ...resultEvent, parsedRequest };
                      } catch (e) {
                        // Silently fail on JSON parse
                      }
                    }

                    // Parse amount tag if present
                    const amountTag = event.tags.find(t => t[0] === "amount");
                    if (amountTag && amountTag[1]) {
                      resultEvent = {
                        ...resultEvent,
                        paymentAmount: parseInt(amountTag[1], 10) || undefined,
                        paymentInvoice: amountTag[2]
                      };
                    }

                    // Check for encryption
                    const isEncrypted = event.tags.some(t => t[0] === "encrypted");
                    resultEvent = { ...resultEvent, isEncrypted };

                    // Handle encrypted content
                    if (isEncrypted) {
                      // Use runSync for immediate execution in the callback context
                      Effect.runSync(Effect.gen(function* (_) {
                        try {
                          const decryptedContent = yield* _(nip04.decrypt(
                            decryptionKey,
                            event.pubkey,
                            event.content
                          ));
                          const updatedResultEvent = { ...resultEvent, content: decryptedContent };
                          onUpdate(updatedResultEvent);
                        } catch (error) {
                          console.error("Failed to decrypt result content in subscription:", error);
                        }
                      }));
                    } else {
                      // Not encrypted, send as is
                      onUpdate(resultEvent);
                    }
                  }
                } catch (error) {
                  console.error("Error processing subscription event:", error);
                }
              }
            ));

            return subscription;
          } catch (error) {
            yield* _(telemetry.trackEvent({
              category: "error",
              action: "nip90_subscribe_job_updates_error",
              label: `Failed to subscribe to job updates: ${error instanceof Error ? error.message : String(error)}`,
            }));

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }
            
            return yield* _(Effect.fail(new NIP90ResultError({
              message: "Failed to subscribe to NIP-90 job updates",
              cause: error
            })));
          }
        })
    };
  })
);