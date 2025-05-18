/**
 * Placeholder NostrService - TYPE DEFINITIONS ONLY
 * This is only for passing type checks, not for actual functionality.
 */
import { Effect, Context, Data, Layer } from "effect";
import type { SimplePool } from "nostr-tools/pool";

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

// --- Service Configuration ---
export interface NostrServiceConfig {
  readonly relays: readonly string[];
  readonly requestTimeoutMs: number;
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
  getPool(): Effect.Effect<SimplePool, NostrPoolError, never>;
  listEvents(filters: NostrFilter[]): Effect.Effect<NostrEvent[], NostrRequestError, never>;
  publishEvent(event: NostrEvent): Effect.Effect<void, NostrPublishError, never>;
  cleanupPool(): Effect.Effect<void, NostrPoolError, never>;
}

export const NostrService = Context.GenericTag<NostrService>("NostrService");