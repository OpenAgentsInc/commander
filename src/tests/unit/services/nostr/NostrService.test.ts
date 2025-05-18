import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter as NostrToolsFilter } from "nostr-tools/filter"; // Corrected import
import {
  NostrService as NostrServiceTag, // Renaming to avoid conflict with interface
  type NostrEvent,
  type NostrFilter,
  type NostrServiceConfig,
} from '@/services/nostr';
import { createNostrService } from '@/services/nostr/NostrServiceImpl'; // Import the factory

// Mock SimplePool's methods
const mockQuerySync = vi.fn();
const mockPublish = vi.fn();
const mockClose = vi.fn();

// Mock the SimplePool constructor
vi.mock('nostr-tools/pool', () => ({
  SimplePool: vi.fn().mockImplementation(() => ({
    querySync: mockQuerySync,
    publish: mockPublish,
    close: mockClose
  }))
}));

// Define a simple test configuration
const testConfig: NostrServiceConfig = {
  relays: ["wss://test.relay"],
  requestTimeoutMs: 500
};

describe('NostrService', () => {
  let service: ReturnType<typeof createNostrService>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh service instance for each test
    service = createNostrService(testConfig);
  });

  it('should be creatable and have defined methods', async () => {
    expect(service).toBeDefined();
    expect(typeof service.getPool).toBe('function');
    expect(typeof service.listEvents).toBe('function');
    expect(typeof service.publishEvent).toBe('function');
    expect(typeof service.cleanupPool).toBe('function');
  });

  it('getPool should return a pool instance', async () => {
    const pool = await Effect.runPromise(service.getPool());
    expect(pool).toBeDefined();
    expect(pool).toHaveProperty('querySync');
    expect(pool).toHaveProperty('publish');
    expect(pool).toHaveProperty('close');
    expect(SimplePool).toHaveBeenCalledTimes(1);
  });

  it('getPool should reuse the same pool instance', async () => {
    vi.mocked(SimplePool).mockClear();
    await Effect.runPromise(service.getPool());
    await Effect.runPromise(service.getPool());
    expect(SimplePool).toHaveBeenCalledTimes(1);
  });

  describe('listEvents', () => {
    it('should fetch and sort events', async () => {
      const mockEventsData: NostrEvent[] = [
        { id: 'ev2', kind: 1, content: 'Event 2', created_at: 200, pubkey: 'pk2', sig: 's2', tags: [] },
        { id: 'ev1', kind: 1, content: 'Event 1', created_at: 100, pubkey: 'pk1', sig: 's1', tags: [] },
      ];
      mockQuerySync.mockResolvedValue(mockEventsData);

      const filters: NostrFilter[] = [{ kinds: [1] }];
      const events = await Effect.runPromise(service.listEvents(filters));

      expect(mockQuerySync).toHaveBeenCalledWith(
        testConfig.relays,
        filters[0],
        { maxWait: testConfig.requestTimeoutMs / 2 }
      );
      expect(events.length).toBe(2);
      expect(events[0].id).toBe('ev2'); // Sorted by created_at descending
    });
  });

  describe('publishEvent', () => {
    const eventToPublish: NostrEvent = { 
      id: 'pub-ev1', 
      kind: 1, 
      content: 'Publish test', 
      created_at: 400, 
      pubkey: 'pk-pub', 
      sig: 's-pub', 
      tags: [] 
    };
    
    it('should attempt to publish an event', async () => {
      // Mock to simulate all relays succeeding
      mockPublish.mockReturnValue([Promise.resolve("wss://test.relay/success" as any)]);

      await Effect.runPromise(service.publishEvent(eventToPublish));
      expect(mockPublish).toHaveBeenCalledWith(testConfig.relays, eventToPublish);
    });
  });

  describe('cleanupPool', () => {
    it('should close pool connections', async () => {
      await Effect.runPromise(service.getPool()); // Ensure pool is created
      mockClose.mockClear(); // Clear calls from getPool if any

      await Effect.runPromise(service.cleanupPool());
      expect(mockClose).toHaveBeenCalledWith(testConfig.relays);
    });
  });
});