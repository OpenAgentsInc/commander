import { Effect, Layer, Schema } from "effect";
import * as bip32 from "@scure/bip32";
import {
  BIP32Service,
  BIP32NodeOptionsSchema,
  BIP32Node,
  BIP44AddressDetails,
  DerivePrivateNodeError,
  GetPublicKeyError,
  DeriveBIP44AddressError,
  type BIP32NodeOptions
} from "./BIP32Service";

/**
 * Create the BIP32 service implementation
 */
export function createBIP32Service(): BIP32Service {
  /**
   * Helper to serialize a bip32.HDKey to our BIP32Node format
   */
  const serializeNode = (node: bip32.HDKey, path: string): BIP32Node => {
    return {
      privateKey: node.privateKey ? Buffer.from(node.privateKey).toString('hex') : undefined,
      publicKey: Buffer.from(node.publicKey).toString('hex'),
      chainCode: Buffer.from(node.chainCode).toString('hex'),
      depth: node.depth,
      index: node.index,
      path
    };
  };

  /**
   * Derive a private key node from a seed
   */
  const derivePrivateNode = (
    seed: Uint8Array,
    options?: BIP32NodeOptions
  ): Effect.Effect<BIP32Node, DerivePrivateNodeError> => {
    return Effect.gen(function* (_) {
      // Validate options if provided
      const validatedOptions = options
        ? yield* _(
            Schema.decodeUnknown(BIP32NodeOptionsSchema)(options),
            Effect.mapError(error => new DerivePrivateNodeError("Invalid options format", error))
          )
        : {};

      // First create the master node from seed
      let node: bip32.HDKey;
      try {
        // Using debug logs to understand what's happening with the seed
        console.debug("BIP32: Seed length:", seed.length, "bytes");
        console.debug("BIP32: Seed hex:", Buffer.from(seed).toString('hex').substring(0, 32) + '...');
        node = bip32.HDKey.fromMasterSeed(seed);
      } catch (error) {
        console.error("BIP32 Error:", error);
        return yield* _(Effect.fail(
          new DerivePrivateNodeError("Failed to create master node from seed", error)
        ));
      }

      // If a path is provided, derive the node at that path
      if (validatedOptions.path) {
        try {
          node = node.derive(validatedOptions.path);
        } catch (error) {
          return yield* _(Effect.fail(
            new DerivePrivateNodeError(`Failed to derive node at path ${validatedOptions.path}`, error)
          ));
        }
      }

      // If an index is provided, derive a child node at that index
      if (validatedOptions.index !== undefined) {
        try {
          node = node.deriveChild(validatedOptions.index);
        } catch (error) {
          return yield* _(Effect.fail(
            new DerivePrivateNodeError(`Failed to derive child node at index ${validatedOptions.index}`, error)
          ));
        }
      }

      // Determine the final path
      const path = validatedOptions.path || "m";
      const finalPath = validatedOptions.index !== undefined ? 
        `${path}/${validatedOptions.index}` : 
        path;

      // Return the serialized node
      return serializeNode(node, finalPath);
    });
  };

  /**
   * Get a public key from a BIP32 node
   */
  const getPublicKey = (
    node: BIP32Node
  ): Effect.Effect<string, GetPublicKeyError> => {
    return Effect.gen(function* (_) {
      // The node already contains the public key in hex format
      if (!node.publicKey) {
        return yield* _(Effect.fail(
          new GetPublicKeyError("Node does not contain a public key")
        ));
      }

      return node.publicKey;
    });
  };

  /**
   * Derive a standard BIP44 address for Bitcoin
   * BIP44 path structure: m/44'/0'/account'/change/address_index
   */
  const deriveBIP44Address = (
    seed: Uint8Array,
    accountIndex: number = 0,
    addressIndex: number = 0,
    isChange: boolean = false
  ): Effect.Effect<BIP44AddressDetails, DeriveBIP44AddressError> => {
    return Effect.gen(function* (_) {
      // Construct the BIP44 path for Bitcoin
      // m/44'/0'/accountIndex'/isChange/addressIndex
      // The ' indicates a hardened derivation
      const changePath = isChange ? 1 : 0;
      const path = `m/44'/0'/${accountIndex}'/${changePath}/${addressIndex}`;

      // Create the master node and derive the path
      let node: bip32.HDKey;
      try {
        // Using debug logs to understand what's happening with the seed
        console.debug("BIP32 deriveBIP44: Seed length:", seed.length, "bytes");
        console.debug("BIP32 deriveBIP44: Seed hex:", Buffer.from(seed).toString('hex').substring(0, 32) + '...');
        console.debug("BIP32 deriveBIP44: Path:", path);
        
        node = bip32.HDKey.fromMasterSeed(seed);
        node = node.derive(path);
      } catch (error) {
        console.error("BIP32 deriveBIP44 Error:", error);
        return yield* _(Effect.fail(
          new DeriveBIP44AddressError(`Failed to derive BIP44 address at path ${path}`, error)
        ));
      }

      // Return the address details
      return {
        path,
        privateKey: node.privateKey ? Buffer.from(node.privateKey).toString('hex') : undefined,
        publicKey: Buffer.from(node.publicKey).toString('hex')
      };
    });
  };

  return {
    derivePrivateNode,
    getPublicKey,
    deriveBIP44Address
  };
}

/**
 * Live implementation of the BIP32 service
 */
export const BIP32ServiceLive = Layer.succeed(
  BIP32Service,
  createBIP32Service()
);