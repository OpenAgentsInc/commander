// src/services/nip04/NIP04ServiceImpl.ts
import { Effect, Layer } from "effect";
import { nip04 } from "nostr-tools";
import {
  NIP04Service,
  NIP04EncryptError,
  NIP04DecryptError,
} from "./NIP04Service";

export function createNIP04Service(): NIP04Service {
  return {
    encrypt: (ourSk: Uint8Array, theirPkHex: string, plaintext: string) =>
      Effect.tryPromise({
        try: () => nip04.encrypt(ourSk, theirPkHex, plaintext),
        catch: (cause) => new NIP04EncryptError({ message: "NIP-04 encryption failed", cause }),
      }),

    decrypt: (ourSk: Uint8Array, theirPkHex: string, ciphertextWithIv: string) =>
      Effect.tryPromise({
        try: () => nip04.decrypt(ourSk, theirPkHex, ciphertextWithIv),
        catch: (cause) => new NIP04DecryptError({ message: "NIP-04 decryption failed", cause }),
      }),
  };
}

export const NIP04ServiceLive = Layer.succeed(
  NIP04Service,
  createNIP04Service()
);