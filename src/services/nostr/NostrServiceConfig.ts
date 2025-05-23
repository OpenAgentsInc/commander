import { Schema } from "effect";
import { Context, Layer } from "effect";

export const RelayConfigSchema = Schema.Struct({
  url: Schema.String,
  powRequirement: Schema.optional(Schema.Number), // Difficulty bits required
});

export const NostrServiceConfigSchema = Schema.Struct({
  relays: Schema.Array(Schema.String), // Legacy format - will be converted to RelayConfig
  relayConfigs: Schema.optional(Schema.Array(RelayConfigSchema)), // New format with PoW
  defaultPublicKey: Schema.optional(Schema.String),
  defaultPrivateKey: Schema.optional(Schema.String),
  enablePoW: Schema.optional(Schema.Boolean), // Global PoW enable/disable
  defaultPowDifficulty: Schema.optional(Schema.Number), // Default difficulty when not specified
  requestTimeoutMs: Schema.Number, // Request timeout
});

export type NostrServiceConfig = Schema.Schema.Type<typeof NostrServiceConfigSchema>;
export type RelayConfig = Schema.Schema.Type<typeof RelayConfigSchema>;

export const NostrServiceConfig = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig,
  {
    relays: [], // Legacy - use relayConfigs instead
    relayConfigs: [
      { url: "wss://nostr.mom" }, // Public relay, no PoW
      { url: "wss://relay.primal.net" }, // Primal's public relay, no PoW
      { url: "wss://offchain.pub" }, // Public relay, no PoW
      // { url: "wss://nos.lol" }, // Unexpectedly requires PoW now
      // { url: "wss://relay.damus.io", powRequirement: 28 }, // Requires 28-bit PoW
      // { url: "wss://relay.nostr.band", powRequirement: 28 }, // Requires 28-bit PoW
    ],
    defaultPublicKey: undefined,
    defaultPrivateKey: undefined,
    enablePoW: true,
    defaultPowDifficulty: 0,
    requestTimeoutMs: 10000, // 10 seconds
  } as const
);
