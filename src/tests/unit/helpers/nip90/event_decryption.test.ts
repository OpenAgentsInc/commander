import { describe, it, expect, vi } from 'vitest';
import { decryptNip04Content } from '@/helpers/nip90/event_decryption';

// Mock dependencies
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual as any,
    nip04: {
      decrypt: vi.fn().mockResolvedValue('{"decrypted":"content"}')
    }
  };
});

vi.mock('@noble/hashes/utils', () => ({
  hexToBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
}));

describe('decryptNip04Content', () => {
  it('module can be imported', () => {
    expect(typeof decryptNip04Content).toBe('function');
  });

  // Since we're fully mocking the dependencies, this test mostly validates
  // that our function correctly uses the underlying libraries rather than 
  // testing actual cryptographic operations
  it('should return decrypted content from nip04.decrypt', async () => {
    const result = await decryptNip04Content(
      'mock-secret-key-hex',
      'mock-public-key-hex',
      'mock-encrypted-content'
    );
    
    expect(result).toBe('{"decrypted":"content"}');
  });
});