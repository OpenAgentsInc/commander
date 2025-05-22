import { Effect, Layer, Context, Cause } from "effect";
import { SimplePool } from "nostr-tools";
import {
  NostrService,
  NostrServiceConfigTag,
  type NostrServiceConfig,
  type NostrEvent,
  type NostrFilter,
  NostrPoolError,
  NostrRequestError,
  NostrPublishError,
} from "./NostrService";
import { TelemetryService, type TelemetryEvent } from "@/services/telemetry";

// Create an Effect that yields NostrService with TelemetryService as a dependency
export const createNostrServiceEffect = Effect.gen(function* (_) {
  const config = yield* _(NostrServiceConfigTag);
  const telemetry = yield* _(TelemetryService);

  let poolInstance: SimplePool | null = null;

  // Create a function to get or initialize the pool
  const getPoolEffect = Effect.try({
    try: () => {
      if (!poolInstance) {
        // Create a new SimplePool instance
        poolInstance = new SimplePool();

        // Log pool initialization via telemetry
        const initEvent: TelemetryEvent = {
          category: "log:info",
          action: "nostr_pool_initialize",
          label: "[Nostr] Pool initialized with relays",
          value: JSON.stringify(config.relays),
        };

        // Fire-and-forget telemetry using the injected service
        Effect.runFork(
          telemetry.trackEvent(initEvent).pipe(Effect.ignoreLogged),
        );
      }
      return poolInstance;
    },
    catch: (error) =>
      new NostrPoolError({
        message: "Failed to initialize Nostr pool",
        cause: error,
      }),
  });

  // List events from relays
  const listEvents = (
    filters: NostrFilter[],
  ): Effect.Effect<NostrEvent[], NostrRequestError, never> =>
    Effect.gen(function* (_) {
      // Track event fetching via telemetry
      yield* _(
        telemetry
          .trackEvent({
            category: "log:info",
            action: "nostr_fetch_begin",
            label: "[Nostr] Fetching events with filters",
            value: JSON.stringify(filters),
          })
          .pipe(Effect.ignoreLogged),
      );

      // Get the pool instance
      const pool = yield* _(
        getPoolEffect,
        Effect.mapError(
          (error) =>
            new NostrRequestError({
              message: `Failed to initialize pool: ${error.message}`,
              cause: error.cause,
            }),
        ),
      );

      try {
        // Use querySync to fetch events with timeout protection
        const events = yield* _(
          Effect.tryPromise({
            try: () =>
              pool.querySync(config.relays as string[], filters[0], {
                maxWait: config.requestTimeoutMs / 2,
              }),
            catch: (error) =>
              new NostrRequestError({
                message: "Failed to fetch events from relays",
                cause: error,
              }),
          }),
          Effect.timeout(config.requestTimeoutMs),
          Effect.mapError((e) => {
            if (e._tag === "TimeoutException") {
              return new NostrRequestError({
                message: `Relay request timed out after ${config.requestTimeoutMs}ms`,
              });
            }
            return e as NostrRequestError;
          }),
        );

        // Track fetch success via telemetry
        yield* _(
          telemetry
            .trackEvent({
              category: "log:info",
              action: "nostr_fetch_success",
              label: `[Nostr] Fetched ${events.length} events`,
            })
            .pipe(Effect.ignoreLogged),
        );

        // Sort events by created_at descending and return
        return events.sort(
          (a, b) => b.created_at - a.created_at,
        ) as NostrEvent[];
      } catch (error) {
        // Track error via telemetry
        yield* _(
          telemetry
            .trackEvent({
              category: "log:error",
              action: "nostr_fetch_error",
              label: "[Nostr] Error fetching events",
              value:
                error instanceof Error
                  ? JSON.stringify({
                      message: error.message,
                      stack: error.stack,
                    })
                  : String(error),
            })
            .pipe(Effect.ignoreLogged),
        );

        throw new NostrRequestError({
          message:
            error instanceof Error
              ? error.message
              : "Unknown error fetching events",
          cause: error,
        });
      }
    });

  // Publish an event to relays
  const publishEvent = (
    event: NostrEvent,
  ): Effect.Effect<void, NostrPublishError, never> =>
    Effect.gen(function* (_) {
      // 1. Handle No Relays Configured
      if (config.relays.length === 0) {
        yield* _(
          telemetry
            .trackEvent({
              category: "log:error",
              action: "nostr_publish_no_relays",
              label: "[Nostr] Cannot publish event: No relays configured.",
              value: `Event ID: ${event.id}`,
            })
            .pipe(Effect.ignoreLogged),
        );

        return yield* _(
          Effect.fail(
            new NostrPublishError({
              message: "Cannot publish event: No relays configured.",
            }),
          ),
        );
      }

      const pool = yield* _(
        getPoolEffect,
        Effect.mapError(
          (error) =>
            new NostrPublishError({
              message: `Failed to initialize pool: ${error.message}`,
              cause: error.cause,
            }),
        ),
      );

      // Track publish attempt via telemetry
      yield* _(
        telemetry
          .trackEvent({
            category: "log:info",
            action: "nostr_publish_begin",
            label: "[Nostr] Publishing event",
            value: event.id,
          })
          .pipe(Effect.ignoreLogged),
      );

      try {
        // Publish the event to all relays
        const results = yield* _(
          Effect.tryPromise({
            try: () =>
              Promise.allSettled(
                pool.publish(config.relays as string[], event),
              ),
            catch: (error) =>
              new NostrPublishError({
                message: "Failed to publish event",
                cause: error,
              }),
          }),
        );

        // 2. Analyze results and count successes/failures
        const successfulRelays = results.filter(
          (r) => r.status === "fulfilled",
        );
        const failedRelays = results.filter((r) => r.status === "rejected");
        const successfulCount = successfulRelays.length;
        const failedCount = failedRelays.length;

        // 3. Implement Conditional Success/Failure Based on Relay Responses

        // Scenario 1: All Relays Failed (Total Failure)
        if (successfulCount === 0 && failedCount > 0) {
          const totalFailureReasons = failedRelays
            .map((fr) => (fr as PromiseRejectedResult).reason)
            .join(", ");
          yield* _(
            telemetry
              .trackEvent({
                category: "log:error",
                action: "nostr_publish_total_failure",
                label: `[Nostr] Failed to publish event ${event.id} to all ${failedCount} configured relays.`,
                value: `Reasons: ${totalFailureReasons}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          return yield* _(
            Effect.fail(
              new NostrPublishError({
                message: `Failed to publish event ${event.id} to any of the ${config.relays.length} configured relays. All ${failedCount} attempts failed.`,
                cause: totalFailureReasons,
              }),
            ),
          );
        }
        // Scenario 2: Partial Success (Some Relays Failed, Some Succeeded)
        else if (successfulCount > 0 && failedCount > 0) {
          const partialFailureReasons = failedRelays
            .map((fr) => (fr as PromiseRejectedResult).reason)
            .join(", ");
          yield* _(
            telemetry
              .trackEvent({
                category: "log:warn",
                action: "nostr_publish_partial_failure",
                label: `[Nostr] Partially published event ${event.id}: ${successfulCount} succeeded, ${failedCount} failed.`,
                value: `Failures: ${partialFailureReasons}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          // IMPORTANT: Return success for partial success
          return;
        }
        // Scenario 3: Full Success (All Relays Succeeded)
        else if (successfulCount > 0 && failedCount === 0) {
          yield* _(
            telemetry
              .trackEvent({
                category: "log:info",
                action: "nostr_publish_success",
                label: `[Nostr] Successfully published event ${event.id} to all ${successfulCount} relays.`,
              })
              .pipe(Effect.ignoreLogged),
          );

          return;
        }
        // Scenario 4: Anomalous Result (e.g., no results from allSettled for other reasons)
        else {
          yield* _(
            telemetry
              .trackEvent({
                category: "log:error",
                action: "nostr_publish_anomalous_result",
                label: `[Nostr] Anomalous result for publishing event ${event.id}: 0 successful, 0 failed, with ${config.relays.length} relays configured.`,
              })
              .pipe(Effect.ignoreLogged),
          );

          return yield* _(
            Effect.fail(
              new NostrPublishError({
                message: `Anomalous result from publishing event ${event.id}: No successes or failures reported from ${config.relays.length} relays.`,
              }),
            ),
          );
        }
      } catch (error) {
        // Track error via telemetry
        yield* _(
          telemetry
            .trackEvent({
              category: "log:error",
              action: "nostr_publish_error",
              label: `[Nostr] Error during publish attempt for event ${event.id}`,
              value:
                error instanceof Error
                  ? JSON.stringify({
                      message: error.message,
                      stack: error.stack,
                    })
                  : String(error),
            })
            .pipe(Effect.ignoreLogged),
        );

        if (error instanceof NostrPublishError) {
          return yield* _(Effect.fail(error));
        }
        return yield* _(
          Effect.fail(
            new NostrPublishError({
              message: `Unexpected error publishing event ${event.id}`,
              cause: error,
            }),
          ),
        );
      }
    });

  // Subscribe to events
  const subscribeToEvents = (
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    customRelays?: readonly string[],
    onEOSE?: (relay: string) => void,
  ): Effect.Effect<{ unsub: () => void }, NostrRequestError, never> =>
    Effect.gen(function* (_) {
      const pool = yield* _(
        getPoolEffect,
        Effect.mapError(
          (error) =>
            new NostrRequestError({
              message: `Failed to initialize pool for subscription: ${error.message}`,
              cause: error.cause,
            }),
        ),
      );

      // Determine which relays to use
      const relaysToUse =
        customRelays && customRelays.length > 0 ? customRelays : config.relays;

      // Check if we have any relays to use
      if (relaysToUse.length === 0) {
        return yield* _(
          Effect.fail(
            new NostrRequestError({
              message:
                "No relays specified for subscription and no default relays configured.",
            }),
          ),
        );
      }

      try {
        // Create subscription parameters with event handlers
        const subParams = {
          onevent: (event: any) => {
            onEvent(event as NostrEvent);
          },
          oneose: onEOSE
            ? () => {
                // Track EOSE via telemetry
                Effect.runFork(
                  telemetry
                    .trackEvent({
                      category: "log:info",
                      action: "nostr_eose_received",
                      label: `[Nostr] EOSE received`,
                    })
                    .pipe(Effect.ignoreLogged),
                );

                // Call onEOSE with an empty string as the relay parameter
                // to maintain backwards compatibility
                onEOSE("");
              }
            : undefined,
        };

        // Convert array of filters to a single filter object
        const filter: NostrFilter = filters[0];
        const subCloser = pool.subscribe(
          relaysToUse as string[],
          filter,
          subParams,
        );

        // Create a telemetry event for subscription creation
        yield* _(
          telemetry
            .trackEvent({
              category: "log:info",
              action: "nostr_sub_created",
              label: "[Nostr] Created subscription",
              value: JSON.stringify({ filters, relays: relaysToUse }),
            })
            .pipe(Effect.ignoreLogged),
        );

        // Return a subscription object with an unsub function
        return {
          unsub: () => {
            // Track unsubscribe via telemetry
            Effect.runFork(
              telemetry
                .trackEvent({
                  category: "log:info",
                  action: "nostr_unsub",
                  label: "[Nostr] Unsubscribing from filters",
                })
                .pipe(Effect.ignoreLogged),
            );

            subCloser.close();
          },
        };
      } catch (error) {
        return yield* _(
          Effect.fail(
            new NostrRequestError({
              message: "Failed to create subscription",
              cause: error,
            }),
          ),
        );
      }
    });

  // Clean up resources
  const cleanupPool = (): Effect.Effect<void, NostrPoolError, never> =>
    Effect.try({
      try: () => {
        if (poolInstance) {
          poolInstance.close(config.relays as string[]);
          poolInstance = null;

          // Log pool closure via telemetry
          Effect.runFork(
            telemetry
              .trackEvent({
                category: "log:info",
                action: "nostr_pool_close",
                label: "[Nostr] Pool connections closed",
              })
              .pipe(Effect.ignoreLogged),
          );
        }
      },
      catch: (error) =>
        new NostrPoolError({
          message: "Failed to clean up Nostr pool",
          cause: error,
        }),
    });

  // Return the service implementation
  return NostrService.of({
    getPool: () => getPoolEffect,
    listEvents,
    publishEvent,
    subscribeToEvents,
    cleanupPool,
  });
});

// Live Layer for NostrService
export const NostrServiceLive = Layer.effect(
  NostrService,
  createNostrServiceEffect,
);
