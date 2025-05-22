import { Schema } from "effect";
import { Context, Layer } from "effect";

export const NostrServiceConfigSchema = Schema.Struct({
  relays: Schema.Array(Schema.String),
  defaultPublicKey: Schema.optional(Schema.String),
  defaultPrivateKey: Schema.optional(Schema.String),
});

export type NostrServiceConfig = Schema.Schema.Type<typeof NostrServiceConfigSchema>;

export const NostrServiceConfig = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig,
  {
    relays: ["wss://relay.damus.io", "wss://relay.snort.social"],
    defaultPublicKey: undefined,
    defaultPrivateKey: undefined,
  }
);
