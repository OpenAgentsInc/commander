import { describe, it, expect, vi } from 'vitest';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { nip04 } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools/pure';

// Mock dependencies
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual as any,
    nip04: {
      encrypt: vi.fn().mockResolvedValue('mock-encrypted-content')
    }
  };
});

vi.mock('nostr-tools/pure', async () => {
  const actual = await vi.importActual('nostr-tools/pure');
  return {
    ...actual as any,
    finalizeEvent: vi.fn().mockReturnValue({
      id: 'mock-event-id',
      pubkey: 'mock-pubkey',
      sig: 'mock-signature',
      kind: 5100,
      created_at: 1234567890,
      tags: [],
      content: 'mock-encrypted-content'
    })
  };
});

describe('createNip90JobRequest', () => {
  it('module can be imported', () => {
    expect(typeof createNip90JobRequest).toBe('function');
  });

  it('should create an encrypted NIP-90 event', async () => {
    const mockSk = new Uint8Array(32); // 32 bytes of zeros
    const mockDvmPk = '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245';
    const mockInputs = [['test input', 'text']];
    const mockOutputMimeType = 'text/plain';
    const mockBid = 1000;
    const mockJobKind = 5100;

    const result = await createNip90JobRequest(
      mockSk,
      mockDvmPk,
      mockInputs,
      mockOutputMimeType,
      mockBid,
      mockJobKind
    );

    // Verify the result structure
    expect(result).toHaveProperty('id', 'mock-event-id');
    expect(result).toHaveProperty('pubkey', 'mock-pubkey');
    expect(result).toHaveProperty('sig', 'mock-signature');
    expect(result).toHaveProperty('content', 'mock-encrypted-content');
    
    // We can't directly test the template since we mocked finalizeEvent,
    // but we can verify that the functions were called
    expect(nip04.encrypt).toHaveBeenCalled();
    expect(finalizeEvent).toHaveBeenCalled();
  });
});