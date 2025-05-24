import { Effect, Layer, Context, Cause } from "effect";
import { SimplePool } from "nostr-tools";
import {
  NostrService,
  type NostrEvent,
  type NostrFilter,
  NostrPoolError,
  NostrRequestError,
  NostrPublishError,
} from "./NostrService";
import { 
  NostrServiceConfig as NostrServiceConfigTag, 
  type NostrServiceConfig,
  type RelayConfig 
} from "./NostrServiceConfig";
import { TelemetryService, type TelemetryEvent } from "@/services/telemetry";
import { NIP13Service } from "@/services/nip13";

// Create an Effect that yields NostrService with TelemetryService and NIP13Service as dependencies
export const createNostrServiceEffect = Effect.gen(function* (_) {
  const config = yield* _(NostrServiceConfigTag);
  const telemetry = yield* _(TelemetryService);
  const nip13Service = yield* _(NIP13Service);

  // Helper function to convert legacy relay array to RelayConfig array
  const getRelayConfigs = (): RelayConfig[] => {
    if (config.relayConfigs && config.relayConfigs.length > 0) {
      return [...config.relayConfigs]; // Convert readonly to mutable
    }
    // Convert legacy format
    return config.relays.map(url => ({ url }));
  };

  let poolInstance: SimplePool | null = null;

  // Create a function to get or initialize the pool
  const getPoolEffect = Effect.try({
    try: () => {
      if (!poolInstance) {
        // Create a new SimplePool instance
        poolInstance = new SimplePool();

        const relayConfigs = getRelayConfigs();
        const relayUrls = relayConfigs.map(r => r.url);

        // Log pool initialization via telemetry
        const initEvent: TelemetryEvent = {
          category: "log:info",
          action: "nostr_pool_initialize",
          label: "[Nostr] Pool initialized with relays",
          value: JSON.stringify(relayUrls),
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
        // Get relay URLs from config
        const relayConfigs = getRelayConfigs();
        const relayUrls = relayConfigs.map(r => r.url);
        
        // Query each filter separately and combine results
        const allEvents: NostrEvent[] = [];

        for (const filter of filters) {
          const events = yield* _(
            Effect.tryPromise({
              try: () =>
                pool.querySync(relayUrls, filter, {
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
          allEvents.push(...events);
        }

        // Remove duplicates by event ID
        const events = Array.from(
          new Map(allEvents.map(e => [e.id, e])).values()
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
      const relayConfigs = getRelayConfigs();
      
      // 1. Handle No Relays Configured
      if (relayConfigs.length === 0) {
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

      // 2. Determine maximum PoW requirement
      let maxPowRequired = 0;
      const powRequiredRelays: string[] = [];
      
      if (config.enablePoW !== false) { // Default to enabled
        for (const relayConfig of relayConfigs) {
          if (relayConfig.powRequirement && relayConfig.powRequirement > 0) {
            maxPowRequired = Math.max(maxPowRequired, relayConfig.powRequirement);
            powRequiredRelays.push(relayConfig.url);
          }
        }
      }

      // 3. Mine PoW if required
      let finalEvent = event;
      if (maxPowRequired > 0) {
        yield* _(
          telemetry
            .trackEvent({
              category: "log:info",
              action: "nostr_pow_mining_start",
              label: `[Nostr] Mining PoW for event ${event.id}`,
              value: `Target difficulty: ${maxPowRequired} bits`,
            })
            .pipe(Effect.ignoreLogged),
        );

        const minedEvent = yield* _(
          nip13Service.mineEvent(event, {
            targetDifficulty: maxPowRequired,
            maxIterations: 5_000_000, // 5M iterations max
            timeoutMs: 60_000, // 1 minute timeout
            onProgress: (iterations, currentBest) => {
              if (iterations % 100000 === 0) { // Log every 100k iterations
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "log:info",
                    action: "nostr_pow_mining_progress",
                    label: `[Nostr] Mining progress: ${iterations} iterations`,
                    value: `Current best: ${currentBest}/${maxPowRequired} bits`,
                  }).pipe(Effect.ignoreLogged)
                );
              }
            }
          }),
          Effect.mapError(error => 
            new NostrPublishError({
              message: `PoW mining failed: ${error.message}`,
              cause: error
            })
          )
        );

        finalEvent = minedEvent;

        yield* _(
          telemetry
            .trackEvent({
              category: "log:info",
              action: "nostr_pow_mining_success",
              label: `[Nostr] PoW mining completed for event ${finalEvent.id}`,
              value: `Difficulty: ${nip13Service.calculateDifficulty(finalEvent.id)} bits, Iterations: ${minedEvent.miningMetadata?.iterations || 0}`,
            })
            .pipe(Effect.ignoreLogged),
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
            value: finalEvent.id,
          })
          .pipe(Effect.ignoreLogged),
      );

      try {
        // Publish the event to all relays
        const relayUrls = relayConfigs.map(r => r.url);
        const results = yield* _(
          Effect.tryPromise({
            try: () =>
              Promise.allSettled(
                pool.publish(relayUrls, finalEvent),
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
                label: `[Nostr] Failed to publish event ${finalEvent.id} to all ${failedCount} configured relays.`,
                value: `Reasons: ${totalFailureReasons}`,
              })
              .pipe(Effect.ignoreLogged),
          );

          return yield* _(
            Effect.fail(
              new NostrPublishError({
                message: `Failed to publish event ${finalEvent.id} to any of the ${relayConfigs.length} configured relays. All ${failedCount} attempts failed.`,
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
                label: `[Nostr] Partially published event ${finalEvent.id}: ${successfulCount} succeeded, ${failedCount} failed.`,
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
                label: `[Nostr] Successfully published event ${finalEvent.id} to all ${successfulCount} relays.`,
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
                label: `[Nostr] Anomalous result for publishing event ${event.id}: 0 successful, 0 failed, with ${relayConfigs.length} relays configured.`,
              })
              .pipe(Effect.ignoreLogged),
          );

          return yield* _(
            Effect.fail(
              new NostrPublishError({
                message: `Anomalous result from publishing event ${event.id}: No successes or failures reported from ${relayConfigs.length} relays.`,
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
      const relayConfigs = getRelayConfigs();
      const defaultRelayUrls = relayConfigs.map(r => r.url);
      const relaysToUse =
        customRelays && customRelays.length > 0 ? customRelays : defaultRelayUrls;

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

        // Handle multiple filters by creating separate subscriptions for each
        const subscriptions: Array<{ close: () => void }> = [];
        
        // Subscribe to each filter separately
        for (const filter of filters) {
          const subCloser = pool.subscribe(
            relaysToUse as string[],
            filter,
            subParams,
          );
          subscriptions.push(subCloser);
          
          // Track each filter subscription
          yield* _(
            telemetry
              .trackEvent({
                category: "log:info",
                action: "nostr_sub_filter_created",
                label: `[Nostr] Created subscription for filter`,
                value: JSON.stringify({ filter, relays: relaysToUse }),
              })
              .pipe(Effect.ignoreLogged),
          );
        }

        // Create a telemetry event for overall subscription creation
        yield* _(
          telemetry
            .trackEvent({
              category: "log:info",
              action: "nostr_sub_created",
              label: `[Nostr] Created ${filters.length} subscriptions`,
              value: JSON.stringify({ filters, relays: relaysToUse }),
            })
            .pipe(Effect.ignoreLogged),
        );

        // Return a subscription object that unsubscribes from all filters
        return {
          unsub: () => {
            // Track unsubscribe via telemetry
            Effect.runFork(
              telemetry
                .trackEvent({
                  category: "log:info",
                  action: "nostr_unsub",
                  label: `[Nostr] Unsubscribing from ${subscriptions.length} filters`,
                })
                .pipe(Effect.ignoreLogged),
            );

            // Close all subscriptions
            for (const sub of subscriptions) {
              sub.close();
            }
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
          const relayConfigs = getRelayConfigs();
          const relayUrls = relayConfigs.map(r => r.url);
          poolInstance.close(relayUrls);
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
