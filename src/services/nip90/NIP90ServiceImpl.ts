// src/services/nip90/NIP90ServiceImpl.ts
import { Effect, Layer, Schema } from "effect";
import {
  NostrEvent,
  NostrFilter,
  NostrPublishError,
  NostrRequestError,
  NostrService,
  Subscription,
} from "@/services/nostr";
import {
  NIP04Service,
  NIP04EncryptError,
  NIP04DecryptError,
} from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
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
  NIP90ServiceError,
  NIP90JobFeedbackStatus,
  NIP90InputType,
} from "./NIP90Service";

// Layer for NIP90Service with dependencies on NostrService, NIP04Service, and TelemetryService
export const NIP90ServiceLive = Layer.effect(
  NIP90Service,
  Effect.gen(function* (_) {
    const nostr = yield* _(NostrService);
    const nip04 = yield* _(NIP04Service);
    const telemetry = yield* _(TelemetryService);

    const listPublicEvents = (
      limit: number = 50,
    ): Effect.Effect<
      NostrEvent[],
      NostrRequestError | NIP90ServiceError,
      never
    > =>
      Effect.gen(function* (_) {
        yield* _(
          telemetry
            .trackEvent({
              category: "nip90:fetch",
              action: "list_public_events_start",
              value: String(limit),
            })
            .pipe(Effect.ignoreLogged),
        );

        const nip90RequestKinds = Array.from(
          { length: 1000 },
          (_, i) => 5000 + i,
        );
        const nip90ResultKinds = Array.from(
          { length: 1000 },
          (_, i) => 6000 + i,
        );
        const filters: NostrFilter[] = [
          {
            kinds: [...nip90RequestKinds, ...nip90ResultKinds, 7000],
            limit: limit,
          },
        ];

        // Use the NostrService dependency
        const events = yield* _(
          nostr.listEvents(filters).pipe(
            Effect.mapError((err) => {
              // Track failure
              Effect.runFork(
                telemetry
                  .trackEvent({
                    category: "nip90:error",
                    action: "list_public_events_failure",
                    label: err.message,
                  })
                  .pipe(Effect.ignoreLogged),
              );

              return err;
            }),
          ),
        );

        yield* _(
          telemetry
            .trackEvent({
              category: "nip90:fetch",
              action: "list_public_events_success",
              label: `Fetched ${events.length} NIP-90 events`,
            })
            .pipe(Effect.ignoreLogged),
        );

        return events;
      }).pipe(
        Effect.catchAll((err) => {
          const errorToReport =
            err instanceof NostrRequestError
              ? err
              : new NIP90ServiceError({
                  message: "Failed to list NIP-90 public events",
                  cause: err,
                });

          return Effect.flatMap(
            telemetry
              .trackEvent({
                category: "nip90:error",
                action: "list_public_events_failure",
                label: errorToReport.message,
              })
              .pipe(Effect.ignoreLogged),
            () => Effect.fail(errorToReport),
          );
        }),
      );

    return {
      listPublicEvents,
      createJobRequest: (params) =>
        Effect.gen(function* (_) {
          // Track start of createJobRequest
          yield* _(
            telemetry
              .trackEvent({
                category: "feature",
                action: "nip90_create_job_request",
                label: `Creating job request of kind: ${params.kind}`,
              })
              .pipe(Effect.ignoreLogged),
          ); // Use ignoreLogged to handle TrackEventError

          // Replace the try-catch with Effect-native validation
          const validatedParams = yield* _(
            Schema.decodeUnknown(CreateNIP90JobParamsSchema)(params).pipe(
              Effect.mapError((parseError) => {
                // Track validation failure telemetry - fire and forget
                Effect.runFork(
                  telemetry
                    .trackEvent({
                      category: "error",
                      action: "nip90_validation_error",
                      label: `Job request validation error: ${parseError._tag}`,
                      value: JSON.stringify({
                        error: parseError._tag,
                        message: parseError.message,
                      }),
                    })
                    .pipe(Effect.ignoreLogged),
                );

                // Import and use ParseResult if needed for more detailed error information
                // import { ParseResult } from "@effect/schema/ParseResult";
                // value: JSON.stringify(ParseResult.format(parseError))

                return new NIP90ValidationError({
                  message: "Invalid NIP-90 job request parameters", // This message should match test expectation
                  cause: parseError,
                  context: { params: "validation failed" },
                });
              }),
            ),
          );

          try {
            // Convert readonly arrays/tuples to mutable ones
            const mutableInputs = validatedParams.inputs.map((inputTuple) => {
              // Make sure we handle empty arrays appropriately
              if (inputTuple.length < 2) {
                throw new NIP90ValidationError({
                  message:
                    "Invalid NIP-90 job request input: requires at least value and type",
                  context: { inputTuple },
                });
              }
              const [value, type, ...rest] = inputTuple;
              return [value, type, ...rest] as [
                string,
                NIP90InputType,
                (string | undefined)?,
                (string | undefined)?,
              ];
            });

            const mutableAdditionalParams =
              validatedParams.additionalParams?.map((paramTuple) => {
                if (paramTuple.length < 3) {
                  throw new NIP90ValidationError({
                    message:
                      "Invalid NIP-90 job request parameter: requires param identifier and two values",
                    context: { paramTuple },
                  });
                }
                return ["param", paramTuple[1], paramTuple[2]] as [
                  "param",
                  string,
                  string,
                ];
              });

            // Use existing helper to create the job request event with validated params
            // Create the effect for the job request creation
            const jobEventEffect = createNip90JobRequest(
              validatedParams.requesterSk,
              validatedParams.targetDvmPubkeyHex, // Can be undefined, helper handles it
              mutableInputs,
              validatedParams.outputMimeType || "text/plain",
              validatedParams.bidMillisats,
              validatedParams.kind,
              validatedParams.targetDvmPubkeyHex, // Using the same value for p-tag by default
              mutableAdditionalParams as
                | Array<[string, string, string]>
                | undefined,
            );

            // Provide NIP04Service from the closure
            const jobEventWithServiceProvided = Effect.provideService(
              jobEventEffect,
              NIP04Service,
              nip04,
            );

            // Now yield the effect that has the service provided
            const jobEvent = yield* _(jobEventWithServiceProvided);

            // Publish the job request event
            yield* _(nostr.publishEvent(jobEvent));

            // Track success - use ignoreLogged for telemetry
            yield* _(
              telemetry
                .trackEvent({
                  category: "feature",
                  action: "nip90_job_request_published",
                  label: `Published job request with ID: ${jobEvent.id}`,
                  value: `Kind: ${jobEvent.kind}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            return jobEvent;
          } catch (error) {
            // Track error - use ignoreLogged for telemetry
            yield* _(
              telemetry
                .trackEvent({
                  category: "error",
                  action: "nip90_create_job_request_error",
                  label: `Failed to create or publish job request: ${error instanceof Error ? error.message : String(error)}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            if (error instanceof NIP04EncryptError) {
              return yield* _(Effect.fail(error));
            }
            if (error instanceof NostrPublishError) {
              return yield* _(Effect.fail(error));
            }

            return yield* _(
              Effect.fail(
                new NIP90RequestError({
                  message: "Failed to create or publish NIP-90 job request",
                  cause: error,
                }),
              ),
            );
          }
        }),

      getJobResult: (jobRequestEventId, dvmPubkeyHex, decryptionKey) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "feature",
                action: "nip90_get_job_result",
                label: `Fetching job result for request: ${jobRequestEventId}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          try {
            // Create filter for job result events
            const filter: NostrFilter = {
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i), // 6000-6999
              "#e": [jobRequestEventId],
              limit: 1,
            };

            if (dvmPubkeyHex) {
              filter.authors = [dvmPubkeyHex];
            }

            // Fetch events
            const events = yield* _(nostr.listEvents([filter]));

            if (events.length === 0) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "info",
                    action: "nip90_no_job_result",
                    label: `No job result found for request: ${jobRequestEventId}`,
                  })
                  .pipe(Effect.ignoreLogged),
              );
              return null;
            }

            // Get the most recent result
            const resultEvent = events[0];

            // Process the event into a NIP90JobResult - make it let so we can update it immutably
            let jobResult: NIP90JobResult = {
              ...resultEvent,
              parsedRequest: undefined,
              paymentAmount: undefined,
              paymentInvoice: undefined,
              isEncrypted: false,
            };

            // Parse request tag if present
            const requestTag = resultEvent.tags.find((t) => t[0] === "request");
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
            const amountTag = resultEvent.tags.find((t) => t[0] === "amount");
            if (amountTag && amountTag[1]) {
              const paymentAmount = parseInt(amountTag[1], 10) || undefined;
              const paymentInvoice = amountTag[2];
              // Create a new object with the updated fields
              jobResult = { ...jobResult, paymentAmount, paymentInvoice };
            }

            // Check if content is encrypted
            const isEncrypted = resultEvent.tags.some(
              (t) => t[0] === "encrypted",
            );
            // Create a new object with the updated field
            jobResult = { ...jobResult, isEncrypted };

            // Attempt decryption if necessary and possible
            if (isEncrypted && decryptionKey && resultEvent.pubkey) {
              try {
                const decryptedContent = yield* _(
                  nip04.decrypt(
                    decryptionKey,
                    resultEvent.pubkey,
                    resultEvent.content,
                  ),
                );

                // Return a new object with decrypted content
                const decryptedResult = {
                  ...jobResult,
                  content: decryptedContent,
                };

                yield* _(
                  telemetry
                    .trackEvent({
                      category: "feature",
                      action: "nip90_job_result_decrypted",
                      label: `Successfully decrypted job result for request: ${jobRequestEventId}`,
                    })
                    .pipe(Effect.ignoreLogged),
                );

                return decryptedResult;
              } catch (error) {
                yield* _(
                  telemetry
                    .trackEvent({
                      category: "error",
                      action: "nip90_decryption_error",
                      label: `Failed to decrypt job result: ${error instanceof Error ? error.message : String(error)}`,
                    })
                    .pipe(Effect.ignoreLogged),
                );

                if (error instanceof NIP04DecryptError) {
                  return yield* _(Effect.fail(error));
                }

                return yield* _(
                  Effect.fail(
                    new NIP90ResultError({
                      message: "Failed to decrypt NIP-90 job result",
                      cause: error,
                    }),
                  ),
                );
              }
            }

            yield* _(
              telemetry
                .trackEvent({
                  category: "feature",
                  action: "nip90_job_result_fetched",
                  label: `Successfully fetched job result for request: ${jobRequestEventId}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            return jobResult;
          } catch (error) {
            yield* _(
              telemetry
                .trackEvent({
                  category: "error",
                  action: "nip90_get_job_result_error",
                  label: `Failed to fetch job result: ${error instanceof Error ? error.message : String(error)}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }

            return yield* _(
              Effect.fail(
                new NIP90ResultError({
                  message: "Failed to fetch NIP-90 job result",
                  cause: error,
                }),
              ),
            );
          }
        }),

      listJobFeedback: (jobRequestEventId, dvmPubkeyHex, decryptionKey) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "feature",
                action: "nip90_list_job_feedback",
                label: `Fetching job feedback for request: ${jobRequestEventId}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          try {
            // Create filter for job feedback events (kind 7000)
            const filter: NostrFilter = {
              kinds: [7000],
              "#e": [jobRequestEventId],
            };

            if (dvmPubkeyHex) {
              filter.authors = [dvmPubkeyHex];
            }

            // Fetch events
            const events = yield* _(nostr.listEvents([filter]));

            if (events.length === 0) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "info",
                    action: "nip90_no_job_feedback",
                    label: `No job feedback found for request: ${jobRequestEventId}`,
                  })
                  .pipe(Effect.ignoreLogged),
              );
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
                statusExtraInfo: undefined,
              };

              // Parse status tag if present
              const statusTag = event.tags.find((t) => t[0] === "status");
              if (statusTag && statusTag[1]) {
                // Validate against known status values
                const status = statusTag[1] as NIP90JobFeedbackStatus;
                if (
                  [
                    "payment-required",
                    "processing",
                    "error",
                    "success",
                    "partial",
                  ].includes(status)
                ) {
                  // Create a new object with the updated fields
                  feedbackEvent = {
                    ...feedbackEvent,
                    status,
                    statusExtraInfo: statusTag[2], // Optional extra info
                  };
                }
              }

              // Parse amount tag if present
              const amountTag = event.tags.find((t) => t[0] === "amount");
              if (amountTag && amountTag[1]) {
                const paymentAmount = parseInt(amountTag[1], 10) || undefined;
                const paymentInvoice = amountTag[2];
                // Create a new object with the updated fields
                feedbackEvent = {
                  ...feedbackEvent,
                  paymentAmount,
                  paymentInvoice,
                };
              }

              // Check if content is encrypted
              const isEncrypted = event.tags.some((t) => t[0] === "encrypted");
              // Create a new object with the updated field
              feedbackEvent = { ...feedbackEvent, isEncrypted };

              // Attempt decryption if necessary and possible
              if (isEncrypted && decryptionKey && event.pubkey) {
                try {
                  const decryptedContent = yield* _(
                    nip04.decrypt(decryptionKey, event.pubkey, event.content),
                  );

                  // Create a new object with the updated field
                  feedbackEvent = {
                    ...feedbackEvent,
                    content: decryptedContent,
                  };
                } catch (error) {
                  // If decryption fails, log but don't fail the entire operation
                  // as we might have other feedback events that are valid
                  console.error("Failed to decrypt feedback content:", error);
                  yield* _(
                    telemetry
                      .trackEvent({
                        category: "error",
                        action: "nip90_feedback_decryption_error",
                        label: `Failed to decrypt feedback content: ${error instanceof Error ? error.message : String(error)}`,
                      })
                      .pipe(Effect.ignoreLogged),
                  );
                }
              }

              feedbackEvents.push(feedbackEvent);
            }

            yield* _(
              telemetry
                .trackEvent({
                  category: "feature",
                  action: "nip90_job_feedback_fetched",
                  label: `Successfully fetched ${feedbackEvents.length} job feedback events for request: ${jobRequestEventId}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            return feedbackEvents;
          } catch (error) {
            yield* _(
              telemetry
                .trackEvent({
                  category: "error",
                  action: "nip90_list_job_feedback_error",
                  label: `Failed to fetch job feedback: ${error instanceof Error ? error.message : String(error)}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }

            return yield* _(
              Effect.fail(
                new NIP90ResultError({
                  message: "Failed to fetch NIP-90 job feedback",
                  cause: error,
                }),
              ),
            );
          }
        }),

      subscribeToJobUpdates: (
        jobRequestEventId,
        dvmPubkeyHex,
        decryptionKey,
        onUpdate,
        relays,
      ) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "feature",
                action: "nip90_subscribe_job_updates",
                label: `Subscribing to updates for job request: ${jobRequestEventId}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          try {
            // Use DVM-specific relays if provided, otherwise use default relays
            const subscriptionRelays = relays || [];
            
            // Log which relays we're using for this subscription
            yield* _(
              telemetry
                .trackEvent({
                  category: "nip90:consumer", 
                  action: "subscription_relays",
                  label: `Using ${subscriptionRelays.length} DVM relays`,
                  value: JSON.stringify(subscriptionRelays),
                })
                .pipe(Effect.ignoreLogged),
            );

            // Create filters for both result (6xxx) and feedback (7000) events
            const resultFilter: NostrFilter = {
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i), // 6000-6999
              "#e": [jobRequestEventId],
              authors: [dvmPubkeyHex],
            };

            const feedbackFilter: NostrFilter = {
              kinds: [7000],
              "#e": [jobRequestEventId],
              authors: [dvmPubkeyHex],
            };

            // Subscribe to both event types using DVM-specific relays
            const subscription = yield* _(
              nostr.subscribeToEvents(
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
                        statusExtraInfo: undefined,
                      };

                      // Parse status tag if present
                      const statusTag = event.tags.find(
                        (t) => t[0] === "status",
                      );
                      if (statusTag && statusTag[1]) {
                        const status = statusTag[1] as NIP90JobFeedbackStatus;
                        if (
                          [
                            "payment-required",
                            "processing",
                            "error",
                            "success",
                            "partial",
                          ].includes(status)
                        ) {
                          // Create a new object with updated fields
                          feedbackEvent = {
                            ...feedbackEvent,
                            status,
                            statusExtraInfo: statusTag[2],
                          };
                        }
                      }

                      // Parse amount tag if present
                      const amountTag = event.tags.find(
                        (t) => t[0] === "amount",
                      );
                      if (amountTag && amountTag[1]) {
                        // Create a new object with updated fields
                        feedbackEvent = {
                          ...feedbackEvent,
                          paymentAmount:
                            parseInt(amountTag[1], 10) || undefined,
                          paymentInvoice: amountTag[2],
                        };
                      }

                      // Check for encryption
                      const isEncrypted = event.tags.some(
                        (t) => t[0] === "encrypted",
                      );
                      feedbackEvent = { ...feedbackEvent, isEncrypted };

                      // Handle encrypted content
                      if (isEncrypted) {
                        // Use runSync for immediate execution in the callback context
                        Effect.runSync(
                          Effect.gen(function* (_) {
                            try {
                              const decryptedContent = yield* _(
                                nip04.decrypt(
                                  decryptionKey,
                                  event.pubkey,
                                  event.content,
                                ),
                              );
                              // Create final updated object and pass to callback
                              const updatedFeedbackEvent = {
                                ...feedbackEvent,
                                content: decryptedContent,
                              };
                              onUpdate(updatedFeedbackEvent);
                            } catch (error) {
                              console.error(
                                "Failed to decrypt feedback content in subscription:",
                                error,
                              );
                            }
                          }),
                        );
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
                        isEncrypted: false,
                      };

                      // Parse request tag if present
                      const requestTag = event.tags.find(
                        (t) => t[0] === "request",
                      );
                      if (requestTag && requestTag[1]) {
                        try {
                          const parsedRequest = JSON.parse(requestTag[1]);
                          resultEvent = { ...resultEvent, parsedRequest };
                        } catch (e) {
                          // Silently fail on JSON parse
                        }
                      }

                      // Parse amount tag if present
                      const amountTag = event.tags.find(
                        (t) => t[0] === "amount",
                      );
                      if (amountTag && amountTag[1]) {
                        resultEvent = {
                          ...resultEvent,
                          paymentAmount:
                            parseInt(amountTag[1], 10) || undefined,
                          paymentInvoice: amountTag[2],
                        };
                      }

                      // Check for encryption
                      const isEncrypted = event.tags.some(
                        (t) => t[0] === "encrypted",
                      );
                      resultEvent = { ...resultEvent, isEncrypted };

                      // Handle encrypted content
                      if (isEncrypted) {
                        // Use runSync for immediate execution in the callback context
                        Effect.runSync(
                          Effect.gen(function* (_) {
                            try {
                              const decryptedContent = yield* _(
                                nip04.decrypt(
                                  decryptionKey,
                                  event.pubkey,
                                  event.content,
                                ),
                              );
                              const updatedResultEvent = {
                                ...resultEvent,
                                content: decryptedContent,
                              };
                              onUpdate(updatedResultEvent);
                            } catch (error) {
                              console.error(
                                "Failed to decrypt result content in subscription:",
                                error,
                              );
                            }
                          }),
                        );
                      } else {
                        // Not encrypted, send as is
                        onUpdate(resultEvent);
                      }
                    }
                  } catch (error) {
                    console.error(
                      "Error processing subscription event:",
                      error,
                    );
                  }
                },
                subscriptionRelays, // Use DVM-specific relays
              ),
            );

            return subscription;
          } catch (error) {
            yield* _(
              telemetry
                .trackEvent({
                  category: "error",
                  action: "nip90_subscribe_job_updates_error",
                  label: `Failed to subscribe to job updates: ${error instanceof Error ? error.message : String(error)}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            if (error instanceof NostrRequestError) {
              return yield* _(Effect.fail(error));
            }

            return yield* _(
              Effect.fail(
                new NIP90ResultError({
                  message: "Failed to subscribe to NIP-90 job updates",
                  cause: error,
                }),
              ),
            );
          }
        }),
    };
  }),
);
