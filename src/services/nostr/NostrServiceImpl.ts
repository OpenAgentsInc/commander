import { Effect, Layer, Context } from "effect";
import { SimplePool } from "nostr-tools/pool";
import type { Event as NostrToolsEvent } from "nostr-tools/pure";
import type { Filter as NostrToolsFilter } from "nostr-tools/filter";
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

// Helper to ensure correct event type compatibility if needed
const asNostrEventArray = (events: NostrToolsEvent[]): NostrEvent[] => events as NostrEvent[];

export function createNostrService(config: NostrServiceConfig): NostrService {
  let poolInstance: SimplePool | null = null;

  const getPoolEffect = Effect.try({
    try: () => {
      if (!poolInstance) {
        // nostr-tools SimplePool defaults
        poolInstance = new SimplePool();
      }
      return poolInstance;
    },
    catch: (error) => new NostrPoolError({ message: "Failed to initialize Nostr pool", cause: error }),
  });

  return {
    getPool: () => getPoolEffect,

    listEvents: (filters: NostrFilter[]) =>
      Effect.gen(function*(_) {
        const pool = yield* _(getPoolEffect);
        // Using querySync instead of list (list doesn't exist in SimplePool type)
        const events = yield* _(
          Effect.tryPromise({
            try: () => pool.querySync(config.relays as string[], filters[0], { maxWait: config.requestTimeoutMs / 2 }),
            catch: (error) => new NostrRequestError({ message: "Failed to list events from relays", cause: error }),
          }),
          Effect.timeout(config.requestTimeoutMs), // Apply timeout
          Effect.mapError((e) => { // Handle timeout error specifically
            if (e._tag === "TimeoutException") {
              return new NostrRequestError({ message: `Relay request timed out after ${config.requestTimeoutMs}ms` });
            }
            return e as NostrRequestError; // Should already be NostrRequestError if not timeout
          })
        );

        // Sort events by created_at descending before returning
        return asNostrEventArray(events).sort((a, b) => b.created_at - a.created_at);
      }),

    publishEvent: (event: NostrEvent) =>
      Effect.gen(function*(_) {
        const pool = yield* _(getPoolEffect);
        // pool.publish returns Promise<void>[] in some versions, Promise<string>[] in others.
        // We'll assume Promise<string>[] where string is relay URL if successful, or throws.
        // nostr-tools: await Promise.any(pool.publish(relays, event)) -> resolves on first success, rejects if all fail.
        // Let's try to publish to all and report specific errors if any, or a general one.
        const results = yield* _(Effect.tryPromise({
          try: () => Promise.allSettled(pool.publish(config.relays as string[], event)),
          catch: (error) => new NostrPublishError({ message: "Failed to publish event", cause: error }),
        }));

        const failedRelays = results.filter(r => r.status === 'rejected');
        if (failedRelays.length > 0) {
          // Simplified error, could be more granular
          return yield* _(Effect.fail(new NostrPublishError({
            message: `Failed to publish to ${failedRelays.length} relays.`,
            cause: failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ")
          })));
        }
      }),

    cleanupPool: () =>
      Effect.try({
        try: () => {
          if (poolInstance) {
            poolInstance.close(config.relays as string[]);
            poolInstance = null;
          }
        },
        catch: (error) => new NostrPoolError({ message: "Failed to cleanup Nostr pool", cause: error }),
      }),
  };
}

// Live Layer for NostrService
export const NostrServiceLive = Layer.effect(
  NostrService,
  Effect.flatMap(NostrServiceConfigTag, (config) => Effect.succeed(createNostrService(config)))
);