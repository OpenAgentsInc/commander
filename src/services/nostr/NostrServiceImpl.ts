import { Effect, Layer, Context } from "effect";
import { SimplePool } from "nostr-tools/pool";
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
        console.log("[Nostr] Pool initialized with relays:", config.relays);
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
        const pool = yield* _(getPoolEffect);
        
        console.log("[Nostr] Fetching events with filters:", JSON.stringify(filters));
        
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
          
          console.log(`[Nostr] Fetched ${events.length} events`);
          
          // Sort events by created_at descending and return
          return events.sort((a, b) => b.created_at - a.created_at) as NostrEvent[];
        } catch (error) {
          console.error("[Nostr] Error fetching events:", error);
          throw new NostrRequestError({ 
            message: error instanceof Error ? error.message : "Unknown error fetching events",
            cause: error
          });
        }
      }),

    // Publish an event to relays
    publishEvent: (event: NostrEvent) =>
      Effect.gen(function*(_) {
        const pool = yield* _(getPoolEffect);
        
        console.log("[Nostr] Publishing event:", event.id);
        
        try {
          // Publish the event to all relays
          const results = yield* _(Effect.tryPromise({
            try: () => Promise.allSettled(pool.publish(config.relays as string[], event)),
            catch: (error) => new NostrPublishError({ message: "Failed to publish event", cause: error }),
          }));

          // Check if there were any failures
          const failedRelays = results.filter(r => r.status === 'rejected');
          if (failedRelays.length > 0) {
            console.warn(`[Nostr] Failed to publish to ${failedRelays.length} relays`);
            return yield* _(Effect.fail(new NostrPublishError({
              message: `Failed to publish to ${failedRelays.length} out of ${config.relays.length} relays`,
              cause: failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ")
            })));
          }
          
          console.log("[Nostr] Successfully published event to all relays");
        } catch (error) {
          console.error("[Nostr] Error publishing event:", error);
          throw new NostrPublishError({ 
            message: error instanceof Error ? error.message : "Unknown error publishing event",
            cause: error
          });
        }
      }),

    // Clean up resources
    cleanupPool: () =>
      Effect.try({
        try: () => {
          if (poolInstance) {
            poolInstance.close(config.relays as string[]);
            poolInstance = null;
            console.log("[Nostr] Pool connections closed");
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