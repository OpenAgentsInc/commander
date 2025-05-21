import { Effect, Context, Schema } from "effect";

// --- Schema Definitions ---
export const BIP39MnemonicOptionsSchema = Schema.Struct({
  strength: Schema.optional(
    Schema.Union(
      Schema.Literal(128),
      Schema.Literal(160),
      Schema.Literal(192),
      Schema.Literal(224),
      Schema.Literal(256),
    ),
  ),
  wordlist: Schema.optional(Schema.Array(Schema.String)),
});

export type BIP39MnemonicOptions = Schema.Schema.Type<
  typeof BIP39MnemonicOptionsSchema
>;

// Schemas for mnemonicToSeed parameters
export const MnemonicSchema = Schema.String;
export type MnemonicType = Schema.Schema.Type<typeof MnemonicSchema>;

export const PassphraseSchema = Schema.String;
export type PassphraseType = Schema.Schema.Type<typeof PassphraseSchema>;

// --- Custom Error Types ---
export class BIP39Error extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BIP39Error";
  }
}

export class GenerateMnemonicError extends BIP39Error {
  readonly _tag = "GenerateMnemonicError";
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message, cause);
    this.name = "GenerateMnemonicError";
  }
}

export class ValidateMnemonicError extends BIP39Error {
  readonly _tag = "ValidateMnemonicError";
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ValidateMnemonicError";
  }
}

export class MnemonicToSeedError extends BIP39Error {
  readonly _tag = "MnemonicToSeedError";
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message, cause);
    this.name = "MnemonicToSeedError";
  }
}

// --- Service Interface ---
export interface BIP39Service {
  /**
   * Generates a BIP39 mnemonic phrase
   * @param options Optional configuration with strength and wordlist
   * @returns Effect with the generated mnemonic string or an error
   */
  generateMnemonic(
    options?: BIP39MnemonicOptions,
  ): Effect.Effect<string, GenerateMnemonicError>;

  /**
   * Validates a BIP39 mnemonic phrase
   * @param mnemonic The mnemonic to validate
   * @param wordlist Optional wordlist to use for validation
   * @returns Effect with a boolean indicating if the mnemonic is valid
   */
  validateMnemonic(
    mnemonic: string,
    wordlist?: readonly string[],
  ): Effect.Effect<boolean, ValidateMnemonicError>;

  /**
   * Converts a mnemonic to a seed
   * @param mnemonic The mnemonic to convert
   * @param passphrase Optional passphrase for additional security
   * @returns Effect with the seed as a Uint8Array
   */
  mnemonicToSeed(
    mnemonic: string,
    passphrase?: string,
  ): Effect.Effect<Uint8Array, MnemonicToSeedError>;
}

// --- Service Tag ---
export const BIP39Service = Context.GenericTag<BIP39Service>("BIP39Service");
