import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer } from '@/services/nostr';

describe('NostrService', () => {
  it('should have a working service implementation', async () => {
    // Basic test to make sure the service can be provided
    const program = Effect.gen(function*(_) {
      const service = yield* _(NostrService);
      // Just verify we can access the service
      expect(service).toBeDefined();
      expect(typeof service.getPool).toBe('function');
      expect(typeof service.listEvents).toBe('function');
      expect(typeof service.publishEvent).toBe('function');
      expect(typeof service.cleanupPool).toBe('function');
    });
    
    // Run the program with the service layer
    await Effect.runPromise(
      Effect.provide(
        program,
        NostrServiceLive.pipe(Effect.provide(DefaultNostrServiceConfigLayer))
      )
    );
  });
});