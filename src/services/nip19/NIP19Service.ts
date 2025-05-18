import { Effect, Context, Data, Schema } from "effect";
import type * as NostrToolsNIP19 from "nostr-tools/nip19"; // For type reuse

// --- NIP-19 Data Structures (re-export or mirror from nostr-tools for clarity) ---
export type ProfilePointer = NostrToolsNIP19.ProfilePointer;
export const ProfilePointerSchema = Schema.Struct({
    pubkey: Schema.String,
    relays: Schema.optional(Schema.Array(Schema.String))
});

export type EventPointer = NostrToolsNIP19.EventPointer;
export const EventPointerSchema = Schema.Struct({
    id: Schema.String,
    relays: Schema.optional(Schema.Array(Schema.String)),
    author: Schema.optional(Schema.String),
    kind: Schema.optional(Schema.Number)
});

export type AddressPointer = NostrToolsNIP19.AddressPointer;
export const AddressPointerSchema = Schema.Struct({
    identifier: Schema.String,
    pubkey: Schema.String,
    kind: Schema.Number,
    relays: Schema.optional(Schema.Array(Schema.String))
});

// Define a more specific type for the decoded result
export type DecodedNIP19Result =
  | { type: "nprofile"; data: ProfilePointer }
  | { type: "nevent"; data: EventPointer }
  | { type: "naddr"; data: AddressPointer }
  | { type: "npub"; data: string } // hex
  | { type: "nsec"; data: Uint8Array }
  | { type: "note"; data: string }; // hex

// --- Custom Error Types ---
export class NIP19EncodeError extends Data.TaggedError("NIP19EncodeError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export class NIP19DecodeError extends Data.TaggedError("NIP19DecodeError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

// --- Service Interface ---
export interface NIP19Service {
  encodeNsec(secretKey: Uint8Array): Effect.Effect<string, NIP19EncodeError>;
  encodeNpub(publicKeyHex: string): Effect.Effect<string, NIP19EncodeError>;
  encodeNote(eventIdHex: string): Effect.Effect<string, NIP19EncodeError>;
  encodeNprofile(profile: ProfilePointer): Effect.Effect<string, NIP19EncodeError>;
  encodeNevent(event: EventPointer): Effect.Effect<string, NIP19EncodeError>;
  encodeNaddr(address: AddressPointer): Effect.Effect<string, NIP19EncodeError>;
  decode(nip19String: string): Effect.Effect<DecodedNIP19Result, NIP19DecodeError>;
}

// --- Service Tag ---
export const NIP19Service = Context.GenericTag<NIP19Service>("NIP19Service");