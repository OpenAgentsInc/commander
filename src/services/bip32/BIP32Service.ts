import { Effect, Context, Schema } from "effect";

// --- Schema Definitions ---
export const BIP32NodeOptionsSchema = Schema.Struct({
  path: Schema.optional(Schema.String),
  index: Schema.optional(Schema.Number)
});

export type BIP32NodeOptions = Schema.Schema.Type<typeof BIP32NodeOptionsSchema>;

// --- Custom Error Types ---
export class BIP32Error extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "BIP32Error";
  }
}

export class DerivePrivateNodeError extends BIP32Error {
  readonly _tag = "DerivePrivateNodeError";
  constructor(message: string, readonly cause?: unknown) {
    super(message, cause);
    this.name = "DerivePrivateNodeError";
  }
}

export class GetPublicKeyError extends BIP32Error {
  readonly _tag = "GetPublicKeyError";
  constructor(message: string, readonly cause?: unknown) {
    super(message, cause);
    this.name = "GetPublicKeyError";
  }
}

export class DeriveBIP44AddressError extends BIP32Error {
  readonly _tag = "DeriveBIP44AddressError";
  constructor(message: string, readonly cause?: unknown) {
    super(message, cause);
    this.name = "DeriveBIP44AddressError";
  }
}

// --- Service Interface ---
export interface BIP32Service {
  /**
   * Derive a private key node from a seed
   * @param seed The seed bytes from which to derive the node
   * @param options Optional derivation options including path and index
   * @returns Effect with the derived node as a serializable object
   */
  derivePrivateNode(
    seed: Uint8Array,
    options?: BIP32NodeOptions
  ): Effect.Effect<BIP32Node, DerivePrivateNodeError>;

  /**
   * Get a public key from a BIP32 node
   * @param node The BIP32 node
   * @returns Effect with the public key as a hex string
   */
  getPublicKey(
    node: BIP32Node
  ): Effect.Effect<string, GetPublicKeyError>;

  /**
   * Derive a standard BIP44 address for Bitcoin
   * @param seed The seed bytes from which to derive the address
   * @param accountIndex The account index (default: 0)
   * @param addressIndex The address index (default: 0)
   * @param isChange Whether to use the change path (default: false)
   * @returns Effect with the address details including path, public key, and private key
   */
  deriveBIP44Address(
    seed: Uint8Array, 
    accountIndex?: number,
    addressIndex?: number,
    isChange?: boolean
  ): Effect.Effect<BIP44AddressDetails, DeriveBIP44AddressError>;
}

// --- Data Models ---
export interface BIP32Node {
  privateKey?: string;
  publicKey: string;
  chainCode: string;
  depth: number;
  index: number;
  path: string;
}

export interface BIP44AddressDetails {
  path: string;
  publicKey: string;
  privateKey?: string;
}

// --- Service Tag ---
export const BIP32Service = Context.GenericTag<BIP32Service>("BIP32Service");