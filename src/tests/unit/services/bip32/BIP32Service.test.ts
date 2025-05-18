import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';

// Helper function to run Effects with both BIP32ServiceLive and BIP39ServiceLive
const runWithServices = <T, E>(effect: Effect.Effect<T, E, BIP32Service>): Promise<T> => {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(BIP32ServiceLive),
      Effect.provide(BIP39ServiceLive)
    )
  );
};

describe('BIP32Service', () => {
  // Known test vectors for deterministic testing
  const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  
  // Helper function to convert Uint8Array to hex string (browser-safe replacement for Buffer)
  const toHexString = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Helper function to create a seed from the test mnemonic
  const createSeedFromMnemonic = async (): Promise<Uint8Array> => {
    return Effect.runPromise(
      Effect.gen(function* (_) {
        const bip39Service = yield* _(BIP39Service);
        return yield* _(bip39Service.mnemonicToSeed(TEST_MNEMONIC));
      }).pipe(
        Effect.provide(BIP39ServiceLive)
      )
    );
  };
  
  // Path constants for BIP44
  const BIP44_PATH_BASE = "m/44'/0'";
  const ACCOUNT_INDEX = 0;
  const ADDRESS_INDEX = 0;
  
  describe('derivePrivateNode', () => {
    it('should derive a master node from a seed', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      // Log the seed for debugging
      console.log('Seed type:', Object.prototype.toString.call(seed));
      console.log('Seed length:', seed.length);
      console.log('Seed buffer:', toHexString(seed).substring(0, 64) + '...');
      
      const node = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          return yield* _(bip32Service.derivePrivateNode(seed));
        })
      );
      
      expect(node).toBeDefined();
      expect(node.privateKey).toBeDefined();
      expect(node.publicKey).toBeDefined();
      expect(node.chainCode).toBeDefined();
      expect(node.path).toBe('m');
    });
    
    it('should derive a node at a specific path', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      const node = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          return yield* _(bip32Service.derivePrivateNode(seed, {
            path: `${BIP44_PATH_BASE}/${ACCOUNT_INDEX}'/0/${ADDRESS_INDEX}`
          }));
        })
      );
      
      expect(node).toBeDefined();
      expect(node.path).toBe(`${BIP44_PATH_BASE}/${ACCOUNT_INDEX}'/0/${ADDRESS_INDEX}`);
    });
  });
  
  describe('getPublicKey', () => {
    it('should return the public key from a node', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      const publicKey = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          const node = yield* _(bip32Service.derivePrivateNode(seed));
          return yield* _(bip32Service.getPublicKey(node));
        })
      );
      
      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(publicKey.length).toBeGreaterThan(0);
    });
  });
  
  describe('deriveBIP44Address', () => {
    it('should derive a BIP44 address for Bitcoin (account 0, address 0)', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      const address = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          return yield* _(bip32Service.deriveBIP44Address(seed, 0, 0, false));
        })
      );
      
      expect(address).toBeDefined();
      expect(address.path).toBe(`m/44'/0'/0'/0/0`);
      expect(address.publicKey).toBeDefined();
      expect(address.privateKey).toBeDefined();
    });
    
    it('should derive a different address for a change path', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      const [regularAddress, changeAddress] = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          const regular = yield* _(bip32Service.deriveBIP44Address(seed, 0, 0, false));
          const change = yield* _(bip32Service.deriveBIP44Address(seed, 0, 0, true));
          return [regular, change];
        })
      );
      
      expect(regularAddress.path).toBe(`m/44'/0'/0'/0/0`);
      expect(changeAddress.path).toBe(`m/44'/0'/0'/1/0`);
      expect(regularAddress.publicKey).not.toBe(changeAddress.publicKey);
      expect(regularAddress.privateKey).not.toBe(changeAddress.privateKey);
    });
    
    it('should derive different addresses for different indices', async () => {
      // Create a seed from the mnemonic
      const seed = await createSeedFromMnemonic();
      
      const [address0, address1] = await runWithServices(
        Effect.gen(function* (_) {
          const bip32Service = yield* _(BIP32Service);
          const addr0 = yield* _(bip32Service.deriveBIP44Address(seed, 0, 0, false));
          const addr1 = yield* _(bip32Service.deriveBIP44Address(seed, 0, 1, false));
          return [addr0, addr1];
        })
      );
      
      expect(address0.path).toBe(`m/44'/0'/0'/0/0`);
      expect(address1.path).toBe(`m/44'/0'/0'/0/1`);
      expect(address0.publicKey).not.toBe(address1.publicKey);
    });
  });
});