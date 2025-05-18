import { describe, it, expect, vi } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import type { NostrEvent } from '@/services/nostr';

vi.mock('nostr-tools/pure', () => ({
  generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
  getPublicKey: vi.fn(() => 'mocked-public-key'),
  finalizeEvent: vi.fn((template) => {
    return {
      ...template,
      id: 'mocked-event-id',
      pubkey: 'mocked-public-key',
      sig: 'mocked-signature',
    };
  }),
}));

describe('createNip90JobRequest', () => {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);

  it('should create a valid NIP-90 job request event', () => {
    const inputs: Array<[string, string, string?, string?, string?]> = [['Test input data', 'text']];
    const outputMimeType = 'text/plain';
    const bidMillisats = 1000;
    const jobKind = 5100;

    const event = createNip90JobRequest(sk, inputs, outputMimeType, bidMillisats, jobKind);

    expect(event.kind).toBe(jobKind);
    expect(event.pubkey).toBe(pk);
    expect(event.content).toBe('Job request content placeholder');
    expect(event.tags).toEqual(
      expect.arrayContaining([
        ['i', 'Test input data', 'text'],
        ['output', 'text/plain'],
        ['bid', '1000'],
      ])
    );
    expect(event.id).toBe('mocked-event-id');
    expect(event.sig).toBe('mocked-signature');
    expect(typeof event.created_at).toBe('number');
  });

  it('should create an event without a bid if not provided', () => {
    const inputs: Array<[string, string]> = [['Another input', 'url']];
    const event = createNip90JobRequest(sk, inputs, 'application/json', undefined, 5002);

    expect(event.tags.some(tag => tag[0] === 'bid')).toBe(false);
    expect(event.tags).toEqual(
      expect.arrayContaining([
        ['i', 'Another input', 'url'],
        ['output', 'application/json'],
      ])
    );
  });

  it('should create an event without a bid if zero', () => {
    const inputs: Array<[string, string]> = [['Another input', 'url']];
    const event = createNip90JobRequest(sk, inputs, 'application/json', 0, 5002);
    
    expect(event.tags.some(tag => tag[0] === 'bid')).toBe(false);
  });
});