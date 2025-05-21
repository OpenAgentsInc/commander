import { Effect, Context, Data, Schema } from "effect";
import type * as NostrToolsNIP19 from "nostr-tools/nip19"; // For type reuse

// --- NIP-19 Data Structures (re-export or mirror from nostr-tools for clarity) ---
export type ProfilePointer = NostrToolsNIP19.ProfilePointer;
export const ProfilePointerSchema = Schema.Struct({
  pubkey: Schema.String,
  relays: Schema.optional(Schema.Array(Schema.String)),
});

export type EventPointer = NostrToolsNIP19.EventPointer;
export const EventPointerSchema = Schema.Struct({
  id: Schema.String,
  relays: Schema.optional(Schema.Array(Schema.String)),
  author: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.Number),
});

export type AddressPointer = NostrToolsNIP19.AddressPointer;
export const AddressPointerSchema = Schema.Struct({
  identifier: Schema.String,
  pubkey: Schema.String,
  kind: Schema.Number,
  relays: Schema.optional(Schema.Array(Schema.String)),
});

export type DecodedNIP19Result =
  | { type: "nprofile"; data: ProfilePointer }
  | { type: "nevent"; data: EventPointer }
  | { type: "naddr"; data: AddressPointer }
  | { type: "npub"; data: string }
  | { type: "nsec"; data: Uint8Array }
  | { type: "note"; data: string };

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
  /**
   * Encodes a secret key as an nsec string.
   * @param secretKey - Secret key as Uint8Array.
   * @returns Effect with nsec string.
   */
  encodeNsec(secretKey: Uint8Array): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Encodes a public key as an npub string.
   * @param pubkeyHex - Public key in hex format.
   * @returns Effect with npub string.
   */
  encodeNpub(pubkeyHex: string): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Encodes an event id as a note string.
   * @param eventIdHex - Event ID in hex format.
   * @returns Effect with note string.
   */
  encodeNote(eventIdHex: string): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Encodes a profile pointer as nprofile string.
   * @param profile - Profile pointer object.
   * @returns Effect with nprofile string.
   */
  encodeNprofile(
    profile: ProfilePointer,
  ): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Encodes an event pointer as nevent string.
   * @param event - Event pointer object.
   * @returns Effect with nevent string.
   */
  encodeNevent(event: EventPointer): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Encodes an address pointer as naddr string.
   * @param address - Address pointer object.
   * @returns Effect with naddr string.
   */
  encodeNaddr(address: AddressPointer): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Decodes any NIP-19 string.
   * @param nip19String - NIP-19 encoded string.
   * @returns Effect with decoded result.
   */
  decode(
    nip19String: string,
  ): Effect.Effect<DecodedNIP19Result, NIP19DecodeError>;
}

// --- Service Tag ---
export const NIP19Service = Context.GenericTag<NIP19Service>("NIP19Service");
