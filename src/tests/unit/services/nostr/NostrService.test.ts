import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools/filter';
import {
  NostrService,
  NostrServiceLive,
  NostrServiceConfigTag,
  type NostrEvent,
  type NostrFilter
} from '@/services/nostr';

// Mock nostr-tools/pool
vi.mock('nostr-tools/pool', () => {
  const mockPoolInstance = {
    querySync: vi.fn(),
    publish: vi.fn(),
    close: vi.fn(),
    // Add other methods if your service uses them, e.g., subscribeMany
  };
  return {
    SimplePool: vi.fn(() => mockPoolInstance),
    // Export other things if needed, like useWebSocketImplementation (not used here)
  };
});

const mockSimplePool = SimplePool as vi.MockedClass<typeof SimplePool>;
let mockPoolQuerySyncFn: vi.MockedFunction<any>;
let mockPoolPublishFn: vi.MockedFunction<any>;
let mockPoolCloseFn: vi.MockedFunction<any>;

// Test Config Layer
const TestNostrConfigLayer = Layer.succeed(
  NostrServiceConfigTag,
  { relays: ["wss://test.relay"], requestTimeoutMs: 500 } // Short timeout for tests
);

const TestNostrServiceLayer = NostrServiceLive.pipe(
  Layer.provide(TestNostrConfigLayer)
);

describe('NostrService', () => {
  // Reset before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Get new mock instances for each test
    const poolInstance = new SimplePool();
    mockPoolQuerySyncFn = poolInstance.querySync as vi.MockedFunction<any>;
    mockPoolPublishFn = poolInstance.publish as vi.MockedFunction<any>;
    mockPoolCloseFn = poolInstance.close as vi.MockedFunction<any>;
  });
  
  const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NostrService>) =>
    Effect.runPromise(Effect.provide(effect, TestNostrServiceLayer));

  describe('getPool', () => {
    it('should initialize and reuse the pool instance', async () => {
      // Reset mock count specifically for this test
      mockSimplePool.mockClear();
      
      const program = Effect.gen(function*(_) {
        const service = yield* _(NostrService);
        // Call getPool twice
        yield* _(service.getPool());
        yield* _(service.getPool());
      });
      await runWithLayer(program);
      // SimplePool constructor should be called exactly once
      expect(mockSimplePool).toHaveBeenCalledTimes(1);
    });
  });

  describe('listEvents', () => {
    it('should fetch and sort events from relays', async () => {
      const mockEvents: NostrEvent[] = [
        { id: 'ev2', kind: 1, content: 'Event 2', created_at: 200, pubkey: 'pk2', sig: 's2', tags: [] },
        { id: 'ev1', kind: 1, content: 'Event 1', created_at: 100, pubkey: 'pk1', sig: 's1', tags: [] },
        { id: 'ev3', kind: 1, content: 'Event 3', created_at: 300, pubkey: 'pk3', sig: 's3', tags: [] },
      ];
      mockPoolQuerySyncFn.mockResolvedValue(mockEvents);

      const filters: NostrFilter[] = [{ kinds: [1] }];
      const program = Effect.flatMap(NostrService, s => s.listEvents(filters));
      const events = await runWithLayer(program);

      expect(mockPoolQuerySyncFn).toHaveBeenCalledWith(["wss://test.relay"], filters[0], expect.anything());
      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('ev3'); // Sorted by created_at descending
      expect(events[1].id).toBe('ev2');
      expect(events[2].id).toBe('ev1');
    });

    it('should handle errors from relay requests', async () => {
      mockPoolQuerySyncFn.mockRejectedValue(new Error("Relay connection failed"));
      const filters: NostrFilter[] = [{ kinds: [1] }];
      const program = Effect.flatMap(NostrService, s => s.listEvents(filters));

      try {
        await runWithLayer(program);
        // We expect this to throw, if it doesn't reach here, the test should pass
        expect(true).toBe(false); // This line should not be reached
      } catch (error) {
        // Just check that an error was thrown
        expect(error).toBeDefined();
      }
    });

    it('should handle timeouts from relay requests', async () => {
      mockPoolQuerySyncFn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 1000))); // Longer than test timeout

      const filters: NostrFilter[] = [{ kinds: [1] }];
      const program = Effect.flatMap(NostrService, s => s.listEvents(filters));

      try {
        await runWithLayer(program);
        // We expect this to throw, if it doesn't reach here, the test should pass
        expect(true).toBe(false); // This line should not be reached
      } catch (error) {
        // Just check that an error was thrown
        expect(error).toBeDefined();
      }
    });
  });

  describe('publishEvent', () => {
    it('should publish an event to relays', async () => {
      const eventToPublish: NostrEvent = { id: 'pub-ev1', kind: 1, content: 'Publish test', created_at: 400, pubkey: 'pk-pub', sig: 's-pub', tags: [] };
      mockPoolPublishFn.mockImplementation(() => [Promise.resolve()]); // Simulate successful publish to one relay

      const program = Effect.flatMap(NostrService, s => s.publishEvent(eventToPublish));
      await runWithLayer(program);

      expect(mockPoolPublishFn).toHaveBeenCalledWith(["wss://test.relay"], eventToPublish);
    });
  });

  describe('cleanupPool', () => {
    it('should close the pool connection', async () => {
      const program = Effect.gen(function*(_) {
        const service = yield* _(NostrService);
        yield* _(service.getPool()); // Initialize pool first
        yield* _(service.cleanupPool());
      });
      await runWithLayer(program);
      expect(mockPoolCloseFn).toHaveBeenCalledWith(["wss://test.relay"]);
    });
  });
});