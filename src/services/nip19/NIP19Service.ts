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
});

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
   * Encodes a public key as an npub string.
   * @param pubkeyHex - Public key in hex format.
   * @returns Effect with npub string.
   */
  encodeNpub(pubkeyHex: string): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Decodes an npub string to a public key.
   * @param npub - NIP-19 encoded npub string.
   * @returns Effect with public key in hex format.
   */
  decodeNpub(npub: string): Effect.Effect<string, NIP19DecodeError>;

  /**
   * Encodes an event id as a note string.
   * @param eventIdHex - Event ID in hex format.
   * @returns Effect with note string.
   */
  encodeNote(eventIdHex: string): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Decodes a note string to an event id.
   * @param note - NIP-19 encoded note string.
   * @returns Effect with event ID in hex format.
   */
  decodeNote(note: string): Effect.Effect<string, NIP19DecodeError>;

  /**
   * Encodes a profile pointer as an nprofile string.
   * @param profilePointer - Profile pointer object.
   * @returns Effect with nprofile string.
   */
  encodeNprofile(profilePointer: ProfilePointer): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Decodes an nprofile string to a profile pointer.
   * @param nprofile - NIP-19 encoded nprofile string.
   * @returns Effect with profile pointer object.
   */
  decodeNprofile(nprofile: string): Effect.Effect<ProfilePointer, NIP19DecodeError>;

  /**
   * Encodes an event pointer as an nevent string.
   * @param eventPointer - Event pointer object.
   * @returns Effect with nevent string.
   */
  encodeNevent(eventPointer: EventPointer): Effect.Effect<string, NIP19EncodeError>;

  /**
   * Decodes an nevent string to an event pointer.
   * @param nevent - NIP-19 encoded nevent string.
   * @returns Effect with event pointer object.
   */
  decodeNevent(nevent: string): Effect.Effect<EventPointer, NIP19DecodeError>;
}

// --- Service Tag ---
export const NIP19Service = Context.GenericTag<NIP19Service>("NIP19Service");