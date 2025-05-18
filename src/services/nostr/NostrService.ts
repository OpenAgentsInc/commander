import { Effect, Context, Data, Layer } from "effect";
import type { Event as NostrToolsEvent, EventTemplate as NostrToolsEventTemplate } from "nostr-tools/pure";
import type { Filter as NostrToolsFilter } from "nostr-tools/filter";
import type { SimplePool } from "nostr-tools/pool";

// --- Nostr Event Types (using nostr-tools types) ---
export type NostrEvent = NostrToolsEvent;
export type NostrFilter = NostrToolsFilter;
export type NostrEventTemplate = NostrToolsEventTemplate;

// --- Custom Error Types ---
export class NostrPoolError extends Data.TaggedError("NostrPoolError")<{
  message: string;
  cause?: unknown;
}> {}

export class NostrRequestError extends Data.TaggedError("NostrRequestError")<{
  message: string;
  cause?: unknown;
}> {}

export class NostrPublishError extends Data.TaggedError("NostrPublishError")<{
  message: string;
  cause?: unknown;
}> {}

// --- Service Configuration ---
export interface NostrServiceConfig {
  readonly relays: readonly string[];
  readonly requestTimeoutMs: number; // Timeout for requests like pool.list()
}
export const NostrServiceConfigTag = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

// --- Default Configuration Layer ---
export const DefaultNostrServiceConfigLayer = Layer.succeed(
  NostrServiceConfigTag,
  {
    relays: [
      "wss://purplepag.es/",
      "wss://nos.lol/",
      "wss://relay.damus.io/",
      "wss://relay.snort.social/",
      "wss://offchain.pub/",
      "wss://nostr-pub.wellorder.net/"
    ],
    requestTimeoutMs: 10000 // 10 seconds
  }
);

// --- Service Interface ---
export interface NostrService {
  /**
   * Initializes (if not already) and returns the SimplePool instance.
   * Manages a single pool instance for the service lifetime.
   */
  getPool(): Effect.Effect<SimplePool, NostrPoolError>;

  /**
   * Fetches a list of events from the configured relays based on filters.
   * Sorts events by created_at descending.
   */
  listEvents(
    filters: NostrFilter[]
  ): Effect.Effect<NostrEvent[], NostrRequestError, SimplePool | NostrServiceConfig>; // Requires pool and config

  /**
   * Publishes an event to the configured relays.
   * Note: Event signing should happen before calling this.
   */
  publishEvent(
    event: NostrEvent // nostr-tools Event is already signed and has an id
  ): Effect.Effect<void, NostrPublishError, SimplePool | NostrServiceConfig>; // Requires pool and config

  /**
   * Cleans up the pool, closing connections.
   */
  cleanupPool(): Effect.Effect<void, NostrPoolError>;
}
export const NostrService = Context.GenericTag<NostrService>("NostrService");