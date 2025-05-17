import { describe, it, expect, beforeAll } from 'vitest';
import { Effect, Layer, Schema, Exit, Option, Cause } from 'effect';
import { Buffer } from 'buffer';
import {
  BIP39Service,
  BIP39ServiceLive,
  GenerateMnemonicError,
  ValidateMnemonicError,
  MnemonicToSeedError
} from '@/services/bip39'; // Import from index file
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";

// Helper function for testing error types from Effect failures
function expectEffectFailure<E extends Error, T extends E>(
  effect: Effect.Effect<unknown, E, never>,
  ErrorClass: new (...args: any[]) => T,
  messagePattern?: string | RegExp,
): Promise<T> {
  return Effect.runPromise(
    Effect.flip(effect).pipe(
      Effect.filterOrFail(
        (cause): cause is T => cause instanceof ErrorClass,
        cause => new Error(`Expected error of type ${ErrorClass.name} but got ${String(cause?.constructor.name)}: ${String(cause)}`)
      ),
      Effect.tap(error => {
        if (messagePattern) {
          expect(error.message).toMatch(messagePattern);
        }
      })
    )
  );
}

describe('BIP39Service', () => {
  it('BIP39Service tag should be defined', () => {
    expect(BIP39Service).toBeDefined();
  });

  it('BIP39ServiceLive layer should be defined', () => {
    expect(BIP39ServiceLive).toBeDefined();
  });

  it('can access the service via the layer', async () => {
    const program = Effect.gen(function* (_) {
      const bip39Service = yield* _(BIP39Service);
      expect(bip39Service).toBeDefined();
      expect(bip39Service.generateMnemonic).toBeTypeOf('function');
      expect(bip39Service.validateMnemonic).toBeTypeOf('function');
      expect(bip39Service.mnemonicToSeed).toBeTypeOf('function');
      return "success";
    }).pipe(Effect.provide(BIP39ServiceLive));

    const result = await Effect.runPromise(program);
    expect(result).toBe("success");
  });

  describe('generateMnemonic', () => {
    it('should generate a 12-word mnemonic by default', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        return yield* _(bip39Service.generateMnemonic());
      }).pipe(Effect.provide(BIP39ServiceLive));

      const mnemonic = await Effect.runPromise(program);
      expect(typeof mnemonic).toBe('string');
      expect(mnemonic.split(' ')).toHaveLength(12);
    });

    it('should generate a 24-word mnemonic when strength is 256', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        return yield* _(bip39Service.generateMnemonic({ strength: 256 }));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const mnemonic = await Effect.runPromise(program);
      expect(mnemonic.split(' ')).toHaveLength(24);
    });

    it('should fail with GenerateMnemonicError for invalid options', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // @ts-expect-error Testing invalid strength value
        return yield* _(bip39Service.generateMnemonic({ strength: 100 }));
      }).pipe(Effect.provide(BIP39ServiceLive));

      await expectEffectFailure(
        program,
        GenerateMnemonicError,
        /Invalid options format|Failed to generate mnemonic/
      );
    });
  });

  describe('validateMnemonic', () => {
    it('should return true for a valid mnemonic', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // First generate a valid mnemonic
        const validMnemonic = yield* _(bip39Service.generateMnemonic());
        // Then validate it
        return yield* _(bip39Service.validateMnemonic(validMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const isValid = await Effect.runPromise(program);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid mnemonic (incorrect word)', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // Use a mnemonic with an invalid word
        const invalidMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon INVALID";
        return yield* _(bip39Service.validateMnemonic(invalidMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const isValid = await Effect.runPromise(program);
      expect(isValid).toBe(false);
    });

    it('should return false for an invalid mnemonic (wrong checksum)', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // Use a mnemonic with incorrect checksum
        const invalidMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
        return yield* _(bip39Service.validateMnemonic(invalidMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const isValid = await Effect.runPromise(program);
      expect(isValid).toBe(false);
    });

    it('should return false for mnemonic with incorrect word count', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // Use a mnemonic with too few words
        const shortMnemonic = "abandon abandon abandon";
        return yield* _(bip39Service.validateMnemonic(shortMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const isValid = await Effect.runPromise(program);
      expect(isValid).toBe(false);
    });

    it('should fail with ValidateMnemonicError for non-string input', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // @ts-expect-error Testing invalid input type
        return yield* _(bip39Service.validateMnemonic(12345));
      }).pipe(Effect.provide(BIP39ServiceLive));

      await expectEffectFailure(
        program,
        ValidateMnemonicError,
        /Failed to validate mnemonic/
      );
    });
  });

  describe('mnemonicToSeed', () => {
    it('should derive a 64-byte seed from a valid mnemonic', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // First generate a valid mnemonic
        const validMnemonic = yield* _(bip39Service.generateMnemonic());
        // Then convert to seed
        return yield* _(bip39Service.mnemonicToSeed(validMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const seed = await Effect.runPromise(program);
      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(64); // 512 bits = 64 bytes
    });

    it('should produce the official BIP39 test vector seed', async () => {
      // Official BIP39 test vector from the specification
      const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
      const testPassphrase = "TREZOR";
      const expectedSeedHex = "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04";

      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        return yield* _(bip39Service.mnemonicToSeed(testMnemonic, testPassphrase));
      }).pipe(Effect.provide(BIP39ServiceLive));

      const seed = await Effect.runPromise(program);
      const seedHex = Buffer.from(seed).toString('hex');
      expect(seedHex).toBe(expectedSeedHex);
    });

    it('should produce different seeds with different passphrases', async () => {
      const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
      
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        const seed1 = yield* _(bip39Service.mnemonicToSeed(mnemonic, "passphrase1"));
        const seed2 = yield* _(bip39Service.mnemonicToSeed(mnemonic, "passphrase2"));
        return { seed1, seed2 };
      }).pipe(Effect.provide(BIP39ServiceLive));

      const { seed1, seed2 } = await Effect.runPromise(program);
      const seed1Hex = Buffer.from(seed1).toString('hex');
      const seed2Hex = Buffer.from(seed2).toString('hex');
      
      expect(seed1Hex).not.toBe(seed2Hex);
    });

    it('should fail with MnemonicToSeedError for invalid mnemonic', async () => {
      const invalidMnemonic = "invalid mnemonic words that shouldn't work";
      
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        return yield* _(bip39Service.mnemonicToSeed(invalidMnemonic));
      }).pipe(Effect.provide(BIP39ServiceLive));

      await expectEffectFailure(
        program,
        MnemonicToSeedError,
        /Failed to convert mnemonic to seed/
      );
    });

    it('should fail with MnemonicToSeedError for non-string input', async () => {
      const program = Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        // @ts-expect-error Testing invalid input type
        return yield* _(bip39Service.mnemonicToSeed(12345));
      }).pipe(Effect.provide(BIP39ServiceLive));

      await expectEffectFailure(
        program,
        MnemonicToSeedError,
        /Failed to convert mnemonic to seed/
      );
    });
  });
});