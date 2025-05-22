import { Schema } from "effect";
import { Context, Layer } from "effect";

export const NostrServiceConfigSchema = Schema.struct({
  relays: Schema.array(Schema.string),
  defaultPublicKey: Schema.optional(Schema.string),
  defaultPrivateKey: Schema.optional(Schema.string),
});

export type NostrServiceConfig = Schema.Schema.To<typeof NostrServiceConfigSchema>;

export const NostrServiceConfig = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig,
  {
    relays: ["wss://relay.damus.io", "wss://relay.snort.social"],
    defaultPublicKey: undefined,
    defaultPrivateKey: undefined,
  }
);
