// src/services/nip04/NIP04Service.ts
import { Effect, Context, Data } from "effect";

// --- Custom Error Types ---
export class NIP04EncryptError extends Data.TaggedError("NIP04EncryptError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export class NIP04DecryptError extends Data.TaggedError("NIP04DecryptError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

// --- Service Interface ---
export interface NIP04Service {
  /**
   * Encrypts plaintext using NIP-04.
   * @param ourSk - Our secret key (Uint8Array).
   * @param theirPkHex - Their public key (hex string).
   * @param plaintext - The text to encrypt.
   * @returns Effect with the NIP-04 encrypted string (ciphertext?iv=iv_base64).
   */
  encrypt(
    ourSk: Uint8Array,
    theirPkHex: string,
    plaintext: string
  ): Effect.Effect<string, NIP04EncryptError>;

  /**
   * Decrypts NIP-04 ciphertext.
   * @param ourSk - Our secret key (Uint8Array).
   * @param theirPkHex - Their public key (hex string).
   * @param ciphertextWithIv - The NIP-04 encrypted string (ciphertext?iv=iv_base64).
   * @returns Effect with the decrypted plaintext string.
   */
  decrypt(
    ourSk: Uint8Array,
    theirPkHex: string,
    ciphertextWithIv: string
  ): Effect.Effect<string, NIP04DecryptError>;
}

// --- Service Tag ---
export const NIP04Service = Context.GenericTag<NIP04Service>("NIP04Service");