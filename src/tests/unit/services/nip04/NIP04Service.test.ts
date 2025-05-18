// src/tests/unit/services/nip04/NIP04Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Cause, Option, Layer } from 'effect';
import { nip04 } from 'nostr-tools'; // To mock
import { NIP04Service, NIP04ServiceLive, NIP04EncryptError, NIP04DecryptError } from '@/services/nip04';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'; // For generating test keys

// Mock nostr-tools's nip04 module
vi.mock('nostr-tools', async (importOriginal) => {
  const original = await importOriginal<typeof import('nostr-tools')>();
  return {
    ...original,
    nip04: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  };
});

// Typed mock functions
const mockNip04Encrypt = nip04.encrypt as vi.MockedFunction<typeof nip04.encrypt>;
const mockNip04Decrypt = nip04.decrypt as vi.MockedFunction<typeof nip04.decrypt>;

describe('NIP04Service', () => {
  const ourSk = generateSecretKey();
  const theirPkHex = getPublicKey(generateSecretKey());
  const plaintext = "Hello, Nostr!";
  const ciphertextWithIv = "encryptedText?iv=someIv";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NIP04Service>) =>
    Effect.runPromiseExit(Effect.provide(effect, NIP04ServiceLive));

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', async () => {
      mockNip04Encrypt.mockResolvedValue(ciphertextWithIv);

      const program = Effect.flatMap(NIP04Service, service => 
        service.encrypt(ourSk, theirPkHex, plaintext)
      );
      const exit = await runWithLayer(program);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe(ciphertextWithIv);
      }
      expect(mockNip04Encrypt).toHaveBeenCalledWith(ourSk, theirPkHex, plaintext);
    });

    it('should return NIP04EncryptError on encryption failure', async () => {
      const errorCause = new Error("Encryption library error");
      mockNip04Encrypt.mockRejectedValue(errorCause);

      const program = Effect.service(NIP04Service).pipe(
        Effect.flatMap(service => service.encrypt(ourSk, theirPkHex, plaintext))
      );
      const exit = await runWithLayer(program);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
        expect(error).toBeInstanceOf(NIP04EncryptError);
        expect(error.message).toBe("NIP-04 encryption failed");
        expect(error.cause).toBe(errorCause);
      }
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', async () => {
      mockNip04Decrypt.mockResolvedValue(plaintext);

      const program = Effect.service(NIP04Service).pipe(
        Effect.flatMap(service => service.decrypt(ourSk, theirPkHex, ciphertextWithIv))
      );
      const exit = await runWithLayer(program);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toBe(plaintext);
      }
      expect(mockNip04Decrypt).toHaveBeenCalledWith(ourSk, theirPkHex, ciphertextWithIv);
    });

    it('should return NIP04DecryptError on decryption failure', async () => {
      const errorCause = new Error("Decryption library error");
      mockNip04Decrypt.mockRejectedValue(errorCause);

      const program = Effect.service(NIP04Service).pipe(
        Effect.flatMap(service => service.decrypt(ourSk, theirPkHex, ciphertextWithIv))
      );
      const exit = await runWithLayer(program);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
        expect(error).toBeInstanceOf(NIP04DecryptError);
        expect(error.message).toBe("NIP-04 decryption failed");
        expect(error.cause).toBe(errorCause);
      }
    });
  });
});