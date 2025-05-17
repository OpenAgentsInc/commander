import { Effect, Layer, Schema } from "effect";
import * as bip39 from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";
import {
  BIP39Service,
  BIP39MnemonicOptionsSchema,
  type BIP39MnemonicOptions,
  GenerateMnemonicError,
  ValidateMnemonicError,
  MnemonicToSeedError
} from "./BIP39Service";

/**
 * Create the BIP39 service implementation
 */
export function createBIP39Service(): BIP39Service {
  /**
   * Generate a mnemonic phrase
   */
  const generateMnemonic = (options?: BIP39MnemonicOptions): Effect.Effect<string, GenerateMnemonicError> => {
    return Effect.gen(function* (_) {
      // Validate options if provided
      const validatedOptions = options 
        ? yield* _(
            Schema.decodeUnknown(BIP39MnemonicOptionsSchema)(options),
            Effect.mapError(error => new GenerateMnemonicError("Invalid options format", error))
          )
        : {};

      // Generate the mnemonic
      return yield* _(Effect.try({
        try: () => bip39.generateMnemonic(
          (validatedOptions.wordlist as string[] | undefined) ?? englishWordlist,
          validatedOptions.strength ?? 128
        ),
        catch: error => new GenerateMnemonicError("Failed to generate mnemonic", error)
      }));
    });
  };

  /**
   * Validate a mnemonic phrase
   */
  const validateMnemonic = (
    mnemonic: string,
    wordlist?: readonly string[]
  ): Effect.Effect<boolean, ValidateMnemonicError> => {
    return Effect.gen(function* (_) {
      // Validate inputs
      if (typeof mnemonic !== 'string') {
        return yield* _(Effect.fail(
          new ValidateMnemonicError("Failed to validate mnemonic: mnemonic must be a string", 
            new TypeError(`Expected string but got ${typeof mnemonic}`))
        ));
      }

      return yield* _(Effect.try({
        try: () => bip39.validateMnemonic(
          mnemonic,
          (wordlist as string[] | undefined) ?? englishWordlist
        ),
        catch: error => new ValidateMnemonicError("Failed to validate mnemonic", error)
      }));
    });
  };

  /**
   * Convert a mnemonic to a seed
   */
  const mnemonicToSeed = (
    mnemonic: string,
    passphrase?: string
  ): Effect.Effect<Uint8Array, MnemonicToSeedError> => {
    return Effect.gen(function* (_) {
      // Validate inputs
      if (typeof mnemonic !== 'string') {
        return yield* _(Effect.fail(
          new MnemonicToSeedError("Failed to convert mnemonic to seed: mnemonic must be a string", 
            new TypeError(`Expected string but got ${typeof mnemonic}`))
        ));
      }

      if (passphrase !== undefined && typeof passphrase !== 'string') {
        return yield* _(Effect.fail(
          new MnemonicToSeedError("Failed to convert mnemonic to seed: passphrase must be a string if provided", 
            new TypeError(`Expected string but got ${typeof passphrase}`))
        ));
      }

      // First validate the mnemonic using direct call to bip39 to avoid ValidateMnemonicError type issues
      const isValid = bip39.validateMnemonic(mnemonic, englishWordlist);
      if (!isValid) {
        return yield* _(Effect.fail(
          new MnemonicToSeedError("Failed to convert mnemonic to seed: invalid mnemonic", 
            new Error("Invalid mnemonic"))
        ));
      }

      return yield* _(Effect.tryPromise({
        try: () => bip39.mnemonicToSeed(mnemonic, passphrase),
        catch: error => new MnemonicToSeedError("Failed to convert mnemonic to seed", error)
      }));
    });
  };

  return {
    generateMnemonic,
    validateMnemonic,
    mnemonicToSeed
  };
}

/**
 * Live implementation of the BIP39 service
 */
export const BIP39ServiceLive = Layer.succeed(
  BIP39Service,
  createBIP39Service()
);