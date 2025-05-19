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

          // Check if there were any failures
          const failedRelays = results.filter(r => r.status === 'rejected');
          if (failedRelays.length > 0) {
            // Log warning via telemetry
            const publishWarningEvent: TelemetryEvent = {
              category: "log:warn",
              action: "nostr_publish_partial_failure",
              label: `[Nostr] Failed to publish to ${failedRelays.length} relays`,
              value: failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ")
            };
            
            // Fire-and-forget telemetry event
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(publishWarningEvent));
            }).pipe(
              Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
              })
            );
            
            return yield* _(Effect.fail(new NostrPublishError({
              message: `Failed to publish to ${failedRelays.length} out of ${config.relays.length} relays`,
              cause: failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ")
            })));
          }
          
          // Log success via telemetry
          const publishSuccessEvent: TelemetryEvent = {
            category: "log:info",
            action: "nostr_publish_success",
            label: "[Nostr] Successfully published event to all relays"
          };
          
          // Fire-and-forget telemetry event
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(publishSuccessEvent));
          }).pipe(
            Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
        } catch (error) {
          // Log error via telemetry
          const publishErrorEvent: TelemetryEvent = {
            category: "log:error",
            action: "nostr_publish_error",
            label: "[Nostr] Error publishing event",
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
          
          throw new NostrPublishError({ 
            message: error instanceof Error ? error.message : "Unknown error publishing event",
            cause: error
          });
        }
      }),

    // Subscribe to events
    subscribeToEvents: (filters, onEvent, onEOSE) => 
      Effect.gen(function* (_) {
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrRequestError({ 
            message: `Failed to initialize pool for subscription: ${error.message}`, 
            cause: error.cause 
          }))
        );
        
        try {
          // Create a subscription to the relays
          console.log(`[NostrServiceImpl] Subscribing to filters:`, filters, "on relays:", config.relays);
          const sub = pool.subscribe(config.relays as string[], filters as any[]);
          
          // Create a telemetry event for subscription creation
          const subTelemetryEvent: TelemetryEvent = {
            category: "log:info",
            action: "nostr_sub_created",
            label: "[Nostr] Created subscription",
            value: JSON.stringify({ filters, relays: config.relays })
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
          
          // Set up the event handler
          sub.on('event', (event: any) => {
            console.log(`[NostrServiceImpl] Received event:`, event.id);
            onEvent(event as NostrEvent);
          });
          
          // Set up the EOSE handler if provided
          if (onEOSE) {
            sub.on('eose', () => {
              console.log(`[NostrServiceImpl] EOSE (End of Stored Events) reached`);
              onEOSE();
            });
          }
          
          // Return a subscription object
          return { 
            unsub: () => {
              console.log(`[NostrServiceImpl] Unsubscribing from filters:`, filters);
              sub.unsub();
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