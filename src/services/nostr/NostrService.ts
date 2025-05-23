/**
 * Placeholder NostrService - TYPE DEFINITIONS ONLY
 * This is only for passing type checks, not for actual functionality.
 */
import { Effect, Context, Data, Layer } from "effect";
import type { SimplePool } from "nostr-tools/pool";
// Define our own Sub type similar to nostr-tools
interface NostrToolsSub {
  unsub: () => void;
}

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

// --- NostrEvent Type (simplification of NostrToolsEvent) ---
export interface NostrEvent {
  id: string;
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
  sig: string;
}

// --- NostrFilter Type (simplification of NostrToolsFilter) ---
export interface NostrFilter {
  ids?: string[];
  kinds?: number[];
  authors?: string[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
  [key: `#${string}`]: string[] | undefined;
}

// --- Subscription Type ---
export interface Subscription {
  unsub: () => void;
}

// --- Service Configuration ---
export interface NostrServiceConfig {
  readonly relays: readonly string[];
  readonly requestTimeoutMs: number;
}

export const NostrServiceConfigTag =
  Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

// --- Default Configuration Layer ---
export const DefaultNostrServiceConfigLayer = Layer.succeed(
  NostrServiceConfigTag,
  {
    relays: [
      // "wss://purplepag.es/", // Blocked: only accepts kinds 0, 1, 3 and 10002
      "wss://nos.lol/",
      // "wss://relay.damus.io/", // Requires 28-bit PoW
      // "wss://relay.snort.social/", // Likely requires PoW
      // "wss://offchain.pub/", // Failed: no active subscription
      // "wss://nostr-pub.wellorder.net/", // Failed: connection issues
    ],
    requestTimeoutMs: 10000, // 10 seconds
  },
);

// --- Service Interface ---
export interface NostrService {
  getPool(): Effect.Effect<SimplePool, NostrPoolError, never>;
  listEvents(
    filters: NostrFilter[],
  ): Effect.Effect<NostrEvent[], NostrRequestError, never>;
  publishEvent(
    event: NostrEvent,
  ): Effect.Effect<void, NostrPublishError, never>;
  cleanupPool(): Effect.Effect<void, NostrPoolError, never>;

  /**
   * Subscribe to events matching the given filters
   * @param filters The filters to subscribe to
   * @param onEvent Callback for each event received
   * @param relays Optional list of relay URLs to use for this subscription (overrides default relays)
   * @param onEOSE Optional callback for when end of stored events is reached
   * @returns A subscription that can be used to unsubscribe
   */
  subscribeToEvents(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    relays?: readonly string[],
    onEOSE?: (relay: string) => void,
  ): Effect.Effect<Subscription, NostrRequestError, never>;
}

export const NostrService = Context.GenericTag<NostrService>("NostrService");
