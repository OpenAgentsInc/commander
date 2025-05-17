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
});