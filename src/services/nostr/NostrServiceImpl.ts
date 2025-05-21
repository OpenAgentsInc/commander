import { Effect, Layer, Context, Cause } from "effect";
import { runPromise } from "effect/Effect";
import { provide } from "effect/Layer";
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, type TelemetryEvent } from "@/services/telemetry";
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

// Real implementation that connects to actual Nostr relays
export function createNostrService(config: NostrServiceConfig): NostrService {
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
          value: JSON.stringify(config.relays)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(initEvent));
        }).pipe(
          Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
      }
      return poolInstance;
    },
    catch: (error) => new NostrPoolError({ message: "Failed to initialize Nostr pool", cause: error }),
  });

  return {
    // Return the pool instance
    getPool: () => getPoolEffect,
    
    // List recent NIP-90 events (kinds 5000-5999, 6000-6999, 7000) from connected relays
    listPublicNip90Events: (limit = 50) => 
      Effect.gen(function*(_) {
        // Generate arrays of kinds for NIP-90 requests (5000-5999) and results (6000-6999)
        const nip90RequestKinds = Array.from({ length: 1000 }, (_, i) => 5000 + i);
        const nip90ResultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
        
        // Create filter including all NIP-90 related kinds with the specified limit
        const filters: NostrFilter[] = [{
          kinds: [...nip90RequestKinds, ...nip90ResultKinds, 7000],
          limit: limit,
        }];
        
        // Use the existing listEvents method which handles telemetry and sorting
        return yield* _(this.listEvents(filters));
      }),

    // List events from relays
    listEvents: (filters: NostrFilter[]) =>
      Effect.gen(function*(_) {
        // Get the pool instance
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrRequestError({ 
            message: `Failed to initialize pool: ${error.message}`, 
            cause: error.cause 
          }))
        );
        
        // Log event fetching via telemetry outside the Effect chain
        // to avoid adding TelemetryService dependency
        const fetchingEvent: TelemetryEvent = {
          category: "log:info",
          action: "nostr_fetch_begin",
          label: "[Nostr] Fetching events with filters",
          value: JSON.stringify(filters)
        };
        
        // Fire-and-forget telemetry event
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(fetchingEvent));
        }).pipe(
          Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        try {
          // Use querySync to fetch events with timeout protection
          const events = yield* _(
            Effect.tryPromise({
              try: () => pool.querySync(config.relays as string[], filters[0], { maxWait: config.requestTimeoutMs / 2 }),
              catch: (error) => new NostrRequestError({ message: "Failed to fetch events from relays", cause: error }),
            }),
            Effect.timeout(config.requestTimeoutMs),
            Effect.mapError((e) => {
              if (e._tag === "TimeoutException") {
                return new NostrRequestError({ message: `Relay request timed out after ${config.requestTimeoutMs}ms` });
              }
              return e as NostrRequestError;
            })
          );
          
          // Log fetch success via telemetry
          const fetchSuccessEvent: TelemetryEvent = {
            category: "log:info",
            action: "nostr_fetch_success",
            label: `[Nostr] Fetched ${events.length} events`
          };
          
          // Fire-and-forget telemetry event
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(fetchSuccessEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          // Sort events by created_at descending and return
          return events.sort((a, b) => b.created_at - a.created_at) as NostrEvent[];
        } catch (error) {
          // Log error via telemetry
          const fetchErrorEvent: TelemetryEvent = {
            category: "log:error",
            action: "nostr_fetch_error",
            label: "[Nostr] Error fetching events",
            value: error instanceof Error ? 
              JSON.stringify({ message: error.message, stack: error.stack }) : 
              String(error)
          };
          
          // Fire-and-forget telemetry event
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(fetchErrorEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          throw new NostrRequestError({ 
            message: error instanceof Error ? error.message : "Unknown error fetching events",
            cause: error
          });
        }
      }),

    // Publish an event to relays
    publishEvent: (event: NostrEvent) =>
      Effect.gen(function*(_) {
        // 1. Handle No Relays Configured
        if (config.relays.length === 0) {
          const noRelaysEvent: TelemetryEvent = {
            category: "log:error",
            action: "nostr_publish_no_relays",
            label: "[Nostr] Cannot publish event: No relays configured.",
            value: `Event ID: ${event.id}`
          };
          
          // Fire-and-forget telemetry call
          Effect.gen(function* (_telem) {
            const telemetryService = yield* _telem(TelemetryService);
            yield* _telem(telemetryService.trackEvent(noRelaysEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent for no_relays failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          return yield* _(Effect.fail(new NostrPublishError({ 
            message: "Cannot publish event: No relays configured." 
          })));
        }
        
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrPublishError({ 
            message: `Failed to initialize pool: ${error.message}`, 
            cause: error.cause 
          }))
        );
        
        // Log publish attempt via telemetry
        const publishEventTelemetry: TelemetryEvent = {
          category: "log:info",
          action: "nostr_publish_begin",
          label: "[Nostr] Publishing event",
          value: event.id
        };
        
        // Fire-and-forget telemetry event
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(publishEventTelemetry));
        }).pipe(
          Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        try {
          // Publish the event to all relays
          const results = yield* _(Effect.tryPromise({
            try: () => Promise.allSettled(pool.publish(config.relays as string[], event)),
            catch: (error) => new NostrPublishError({ message: "Failed to publish event", cause: error }),
          }));

          // 2. Analyze results and count successes/failures
          const successfulRelays = results.filter(r => r.status === 'fulfilled');
          const failedRelays = results.filter(r => r.status === 'rejected');
          const successfulCount = successfulRelays.length;
          const failedCount = failedRelays.length;
          
          // 3. Implement Conditional Success/Failure Based on Relay Responses
          
          // Scenario 1: All Relays Failed (Total Failure)
          if (successfulCount === 0 && failedCount > 0) {
            const totalFailureReasons = failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ");
            const totalFailureEvent: TelemetryEvent = {
              category: "log:error",
              action: "nostr_publish_total_failure",
              label: `[Nostr] Failed to publish event ${event.id} to all ${failedCount} configured relays.`,
              value: `Reasons: ${totalFailureReasons}`
            };
            
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(totalFailureEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for total_failure failed:", err instanceof Error ? err.message : String(err));
              })
            );
            
            return yield* _(Effect.fail(new NostrPublishError({
              message: `Failed to publish event ${event.id} to any of the ${config.relays.length} configured relays. All ${failedCount} attempts failed.`,
              cause: totalFailureReasons
            })));
          } 
          // Scenario 2: Partial Success (Some Relays Failed, Some Succeeded)
          else if (successfulCount > 0 && failedCount > 0) {
            const partialFailureReasons = failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ");
            const publishWarningEvent: TelemetryEvent = {
              category: "log:warn",
              action: "nostr_publish_partial_failure",
              label: `[Nostr] Partially published event ${event.id}: ${successfulCount} succeeded, ${failedCount} failed.`,
              value: `Failures: ${partialFailureReasons}`
            };
            
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(publishWarningEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for partial_failure failed:", err instanceof Error ? err.message : String(err));
              })
            );
            
            // IMPORTANT: Return success for partial success
            return Effect.void;
          } 
          // Scenario 3: Full Success (All Relays Succeeded)
          else if (successfulCount > 0 && failedCount === 0) {
            const publishSuccessEvent: TelemetryEvent = {
              category: "log:info",
              action: "nostr_publish_success",
              label: `[Nostr] Successfully published event ${event.id} to all ${successfulCount} relays.`
            };
            
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(publishSuccessEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for success failed:", err instanceof Error ? err.message : String(err));
              })
            );
            
            return Effect.void;
          } 
          // Scenario 4: Anomalous Result (e.g., no results from allSettled for other reasons)
          else {
            const anomalousEvent: TelemetryEvent = {
              category: "log:error",
              action: "nostr_publish_anomalous_result",
              label: `[Nostr] Anomalous result for publishing event ${event.id}: 0 successful, 0 failed, with ${config.relays.length} relays configured.`
            };
            
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(anomalousEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for anomalous_result failed:", err instanceof Error ? err.message : String(err));
              })
            );
            
            return yield* _(Effect.fail(new NostrPublishError({ 
              message: `Anomalous result from publishing event ${event.id}: No successes or failures reported from ${config.relays.length} relays.` 
            })));
          }
        } catch (error) {
          // Log error via telemetry
          const publishErrorEvent: TelemetryEvent = {
            category: "log:error",
            action: "nostr_publish_error",
            label: `[Nostr] Error during publish attempt for event ${event.id}`,
            value: error instanceof Error ? 
              JSON.stringify({ message: error.message, stack: error.stack }) : 
              String(error)
          };
          
          // Fire-and-forget telemetry event
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(publishErrorEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          if (error instanceof NostrPublishError) {
            return yield* _(Effect.fail(error));
          }
          return yield* _(Effect.fail(new NostrPublishError({ 
            message: `Unexpected error publishing event ${event.id}`,
            cause: error
          })));
        }
      }),

    // Subscribe to events
    subscribeToEvents: (filters, onEvent, customRelays, onEOSE) => 
      Effect.gen(function* (_) {
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrRequestError({ 
            message: `Failed to initialize pool for subscription: ${error.message}`, 
            cause: error.cause 
          }))
        );
        
        // Determine which relays to use
        const relaysToUse = (customRelays && customRelays.length > 0) ? customRelays : config.relays;
        
        // Check if we have any relays to use
        if (relaysToUse.length === 0) {
          return yield* _(Effect.fail(new NostrRequestError({
            message: "No relays specified for subscription and no default relays configured."
          })));
        }
        
        try {
          // Create a subscription to the relays
          console.log(`[NostrServiceImpl] Subscribing to filters:`, filters, "on relays:", relaysToUse);
          
          // Create subscription parameters with event handlers
          const subParams = {
            onevent: (event: any) => {
              console.log(`[NostrServiceImpl] Received event:`, event.id);
              onEvent(event as NostrEvent);
            },
            oneose: onEOSE ? () => {
              console.log(`[NostrServiceImpl] EOSE (End of Stored Events) reached`);
              onEOSE();
            } : undefined
          };
          
          // Use the subscribe method with the required parameters
          // Convert array of filters to a single filter object with the proper type signature 
          // including the `#${string}` index signature
          const filter: NostrFilter = filters[0];
          const subCloser = pool.subscribe(relaysToUse as string[], filter, subParams);
          
          // Create a telemetry event for subscription creation
          const subTelemetryEvent: TelemetryEvent = {
            category: "log:info",
            action: "nostr_sub_created",
            label: "[Nostr] Created subscription",
            value: JSON.stringify({ filters, relays: relaysToUse })
          };
          
          // Fire-and-forget telemetry
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(subTelemetryEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          // Return a subscription object with an unsub function
          return { 
            unsub: () => {
              console.log(`[NostrServiceImpl] Unsubscribing from filters:`, filters);
              subCloser.close();
            } 
          };
        } catch (error) {
          return yield* _(Effect.fail(new NostrRequestError({ 
            message: "Failed to create subscription", 
            cause: error 
          })));
        }
      }),
      
    // Clean up resources
    cleanupPool: () =>
      Effect.try({
        try: () => {
          if (poolInstance) {
            poolInstance.close(config.relays as string[]);
            poolInstance = null;
            
            // Log pool closure via telemetry
            const poolCloseEvent: TelemetryEvent = {
              category: "log:info",
              action: "nostr_pool_close",
              label: "[Nostr] Pool connections closed"
            };
            
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(poolCloseEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
              })
            );
          }
        },
        catch: (error) => new NostrPoolError({ message: "Failed to clean up Nostr pool", cause: error }),
      }),
  };
}

// Live Layer for NostrService
export const NostrServiceLive = Layer.effect(
  NostrService,
  Effect.flatMap(NostrServiceConfigTag, (config) => Effect.succeed(createNostrService(config)))
);