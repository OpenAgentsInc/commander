import { Effect, Layer, Schema } from "effect";
import * as nip19 from "nostr-tools/nip19";
import { hexToBytes } from "@noble/hashes/utils"; // For converting hex private key to Uint8Array if needed
import {
  NIP19Service,
  type ProfilePointer,
  type EventPointer,
  type AddressPointer,
  type DecodedNIP19Result,
  NIP19EncodeError,
  NIP19DecodeError,
  ProfilePointerSchema, // Import schemas for validation
  EventPointerSchema,
  AddressPointerSchema
} from "./NIP19Service";

export function createNIP19Service(): NIP19Service {
  return {
    encodeNsec: (secretKey: Uint8Array): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.try({
        try: () => nip19.nsecEncode(secretKey),
        catch: (cause) => new NIP19EncodeError({ message: "Failed to encode nsec", cause }),
      }),

    encodeNpub: (publicKeyHex: string): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.try({
        try: () => nip19.npubEncode(publicKeyHex),
        catch: (cause) => new NIP19EncodeError({ message: "Failed to encode npub", cause }),
      }),

    encodeNote: (eventIdHex: string): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.try({
        try: () => nip19.noteEncode(eventIdHex),
        catch: (cause) => new NIP19EncodeError({ message: "Failed to encode note ID", cause }),
      }),

    encodeNprofile: (profile: ProfilePointer): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.gen(function*(_) {
        // Validate input using schema
        yield* _(Schema.decodeUnknown(ProfilePointerSchema)(profile), Effect.mapError(
          (e) => new NIP19EncodeError({ message: "Invalid profile pointer for nprofile encoding", cause: e })
        ));
        return yield* _(Effect.try({
          try: () => nip19.nprofileEncode(profile),
          catch: (cause) => new NIP19EncodeError({ message: "Failed to encode nprofile", cause }),
        }));
      }),

    encodeNevent: (event: EventPointer): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.gen(function*(_) {
        yield* _(Schema.decodeUnknown(EventPointerSchema)(event), Effect.mapError(
          (e) => new NIP19EncodeError({ message: "Invalid event pointer for nevent encoding", cause: e })
        ));
        return yield* _(Effect.try({
          try: () => nip19.neventEncode(event),
          catch: (cause) => new NIP19EncodeError({ message: "Failed to encode nevent", cause }),
        }));
      }),

    encodeNaddr: (address: AddressPointer): Effect.Effect<string, NIP19EncodeError, never> =>
      Effect.gen(function*(_) {
        yield* _(Schema.decodeUnknown(AddressPointerSchema)(address), Effect.mapError(
          (e) => new NIP19EncodeError({ message: "Invalid address pointer for naddr encoding", cause: e })
        ));
        return yield* _(Effect.try({
          try: () => nip19.naddrEncode(address),
          catch: (cause) => new NIP19EncodeError({ message: "Failed to encode naddr", cause }),
        }));
      }),

    decode: (nip19String: string): Effect.Effect<DecodedNIP19Result, NIP19DecodeError, never> =>
      Effect.try({
        try: () => nip19.decode(nip19String) as DecodedNIP19Result, // Cast to our defined union type
        catch: (cause) => new NIP19DecodeError({ message: `Failed to decode NIP-19 string: ${nip19String}`, cause }),
      }),
  };
}

export const NIP19ServiceLive = Layer.succeed(
  NIP19Service,
  createNIP19Service()
);