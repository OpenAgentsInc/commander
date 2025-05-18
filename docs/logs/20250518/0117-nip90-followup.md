Okay, it looks like the `NostrService.test.ts` file is still causing issues, specifically with how the Effect layers are being provided or composed. The error "Cannot read properties of undefined (reading 'locals')" often points to an issue with the Effect runtime or context not being correctly set up for the test environment when using layers.

Let's simplify the test setup for `NostrService.test.ts` to a more direct approach, similar to how other service tests in your project might be structured (e.g., `BIP39Service.test.ts` if that uses a direct service instance for testing). This will help isolate whether the issue is with the service logic itself or the layer composition in the test.

**Revised Instructions to Fix `NostrService.test.ts`:**

1.  **Modify `src/tests/unit/services/nostr/NostrService.test.ts`:**
    We'll change the test to directly instantiate and use `createNostrService` with a mock config, rather than relying on `Effect.provide` with the full `NostrServiceLive` layer for this basic check. This bypasses complex layer mechanics for a simple "is it defined" test.

    ```typescript
    // src/tests/unit/services/nostr/NostrService.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect } from 'effect'; // Only Effect might be needed for types or simple ops
    import { SimplePool } from 'nostr-tools/pool';
    import type { Filter as NostrToolsFilter } from "nostr-tools/filter"; // Corrected import
    import {
      NostrService as NostrServiceTag, // Renaming to avoid conflict with interface
      type NostrEvent,
      type NostrFilter,
      type NostrServiceConfig,
      // NostrServiceLive, // Not using the full live layer for this basic test
      // DefaultNostrServiceConfigLayer // Not using this either
    } from '@/services/nostr';
    import { createNostrService } from '@/services/nostr/NostrServiceImpl'; // Import the factory

    // Mock nostr-tools/pool
    vi.mock('nostr-tools/pool', () => {
      const mockPoolInstance = {
        querySync: vi.fn(),
        publish: vi.fn(),
        close: vi.fn(),
      };
      return {
        SimplePool: vi.fn(() => mockPoolInstance),
      };
    });

    const MockedSimplePool = SimplePool as vi.MockedClass<typeof SimplePool>;
    let mockPoolQuerySyncFn: vi.MockedFunction<any>;
    let mockPoolPublishFn: vi.MockedFunction<any>;
    let mockPoolCloseFn: vi.MockedFunction<any>;

    // Define a simple test configuration
    const testConfig: NostrServiceConfig = {
      relays: ["wss://test.relay"],
      requestTimeoutMs: 500
    };

    describe('NostrService', () => {
      let service: ReturnType<typeof createNostrService>;

      beforeEach(() => {
        vi.clearAllMocks();
        // Create a fresh service instance for each test using the factory
        service = createNostrService(testConfig);

        // Setup mocks on the SimplePool constructor's prototype or instance if needed
        // Since createNostrService initializes its own pool, we need to ensure
        // that new SimplePool() inside it gets the mocked methods.
        // This is often tricky. A simpler way if createNostrService accepted SimplePool
        // would be to pass a mock. For now, let's assume the global mock works.
        // Or, better, mock the instance methods *after* it's created by getPool.
        const poolInstance = new MockedSimplePool(); // This call will happen inside getPool
        mockPoolQuerySyncFn = poolInstance.querySync as vi.MockedFunction<any>;
        mockPoolPublishFn = poolInstance.publish as vi.MockedFunction<any>;
        mockPoolCloseFn = poolInstance.close as vi.MockedFunction<any>;
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
        expect(pool).toBeInstanceOf(MockedSimplePool);
        expect(MockedSimplePool).toHaveBeenCalledTimes(1); // Pool constructor called
      });

      it('getPool should reuse the same pool instance', async () => {
        MockedSimplePool.mockClear(); // Clear calls from previous test or beforeEach
        await Effect.runPromise(service.getPool());
        await Effect.runPromise(service.getPool());
        expect(MockedSimplePool).toHaveBeenCalledTimes(1);
      });

      describe('listEvents', () => {
        it('should fetch and sort events', async () => {
          const mockEventsData: NostrEvent[] = [
            { id: 'ev2', kind: 1, content: 'Event 2', created_at: 200, pubkey: 'pk2', sig: 's2', tags: [] },
            { id: 'ev1', kind: 1, content: 'Event 1', created_at: 100, pubkey: 'pk1', sig: 's1', tags: [] },
          ];
          // Ensure the mock for querySync is set up on the instance *that will be created*
          // This requires a bit more advanced mocking or refactoring createNostrService for testability.
          // For now, let's assume the mockPoolQuerySyncFn will be called.
          mockPoolQuerySyncFn.mockResolvedValue(mockEventsData);

          const filters: NostrFilter[] = [{ kinds: [1] }];
          const events = await Effect.runPromise(service.listEvents(filters));

          expect(mockPoolQuerySyncFn).toHaveBeenCalledWith(
            testConfig.relays,
            filters[0], // querySync takes a single filter
            { maxWait: testConfig.requestTimeoutMs / 2 }
          );
          expect(events.length).toBe(2);
          expect(events[0].id).toBe('ev2'); // Sorted
        });

        // Add more tests for listEvents error cases, publishEvent, and cleanupPool
        // similar to how they were structured before, but calling `service.method()`
        // and `Effect.runPromise` or `Effect.runPromiseExit`.
      });

      // Add publishEvent tests
      describe('publishEvent', () => {
        const eventToPublish: NostrEvent = { id: 'pub-ev1', kind: 1, content: 'Publish test', created_at: 400, pubkey: 'pk-pub', sig: 's-pub', tags: [] };
        it('should attempt to publish an event', async () => {
          // Mock to simulate all relays succeeding
          mockPoolPublishFn.mockReturnValue([Promise.resolve("wss://test.relay/success" as any)]);

          await Effect.runPromise(service.publishEvent(eventToPublish));
          expect(mockPoolPublishFn).toHaveBeenCalledWith(testConfig.relays, eventToPublish);
        });
      });

      // Add cleanupPool tests
      describe('cleanupPool', () => {
        it('should close pool connections', async () => {
          await Effect.runPromise(service.getPool()); // Ensure pool is created
          mockPoolCloseFn.mockClear(); // Clear calls from getPool if any

          await Effect.runPromise(service.cleanupPool());
          expect(mockPoolCloseFn).toHaveBeenCalledWith(testConfig.relays);
        });
      });
    });
    ```

2.  **Run `pnpm test "NostrService"` again.**
    The goal here is to see if the "TypeError: Effect.service is not a function" and related layer issues are resolved by this more direct testing approach. If these basic tests pass, it indicates the service logic itself is likely okay, and any remaining issues with UI integration would be related to how the `NostrServiceLive` layer is provided and used in the React components.

3.  **Address UI Integration for Real Data in `Nip90EventList.tsx`:**
    The previous version of `Nip90EventList.tsx` had a `try...catch` block around the main Effect program that might have been too broad or incorrectly placed, potentially swallowing errors or causing type mismatches. Let's ensure the Effect program is correctly structured.

    The `fetchNip90JobRequests` function should look like this:

    ```typescript
    // src/components/nip90/Nip90EventList.tsx

    // ... (imports remain the same, ensure NostrServiceLive and DefaultNostrServiceConfigLayer are imported) ...

    async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
      console.log("[Nip90Component] Fetching NIP-90 job requests...");

      const nip90RequestKinds = Array.from(
        { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
        (_, i) => NIP90_REQUEST_KINDS_MIN + i
      );
      const filters: NostrFilter[] = [{
        kinds: nip90RequestKinds,
        limit: 20
      }];

      // Define the Effect program
      const program = Effect.gen(function* (_) {
        const nostrService = yield* _(NostrServiceTag); // Use the Tag
        const events = yield* _(nostrService.listEvents(filters));
        console.log(`[Nip90Component] Fetched ${events.length} NIP-90 events`);
        return events;
      });

      // Compose and provide layers
      const fullLayer = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);

      // Run the program with all required layers
      // Use runPromiseExit to handle potential errors gracefully
      const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

      if (Exit.isSuccess(exit)) {
        return exit.value;
      } else {
        // Log the error cause for debugging
        console.error("[Nip90Component] Error fetching NIP-90 events:", Cause.pretty(exit.cause));
        // Rethrow or return an empty array, or handle as appropriate for your UI
        // For useQuery, throwing an error is often preferred so error state is populated
        throw Cause.squash(exit.cause); // This will make useQuery's `error` field be populated
      }
    }

    // ... (rest of the Nip90EventList component) ...
    ```

**Explanation of Changes:**

*   **`NostrService.test.ts`:**
    *   Removed the `runWithLayer` helper and `TestNostrServiceLayer` for the basic "is defined" test.
    *   Directly uses `createNostrService(testConfig)` to get a service instance.
    *   Calls service methods and wraps them in `Effect.runPromise` or `Effect.runPromiseExit` as needed.
    *   The key change is testing the service's factory function `createNostrService` more directly for initial checks, which simplifies debugging layer-related issues. More complex tests can still use `Effect.provide` if they need to test the full DI setup.
    *   Corrected `mockSimplePool` to `MockedSimplePool` for clarity.
    *   Cleaned up mock re-assignments in `beforeEach`.
    *   Adjusted `listEvents` mock to use `querySync` as per the service implementation.

*   **`Nip90EventList.tsx`:**
    *   Ensured `NostrServiceTag` is used with `yield* _()` to access the service from context.
    *   The `Effect.provide(program, fullLayer)` correctly provides the composed layer to the program.
    *   Changed `Effect.runPromise` to `Effect.runPromiseExit` in `fetchNip90JobRequests` to better handle and log errors. If an error occurs, it's now thrown so that `react-query` can catch it and populate its `error` state.

**Next Steps After These Fixes:**

1.  Run `pnpm test "NostrService"` again. The tests should ideally pass now, or provide more specific errors related to the service logic or mock setup rather than Effect layer composition.
2.  Run `pnpm run t` to catch any remaining TypeScript errors.
3.  If tests and type checks pass, run `pnpm start`. Observe the console and the UI. The NIP-90 event list should now attempt to fetch real data. If it fails, the console error from `fetchNip90JobRequests` (logged via `Cause.pretty`) should give a clear indication of what went wrong (e.g., relay connection issues, timeouts, data parsing errors).

This approach should help stabilize the testing environment and ensure the UI component correctly interacts with the Effect service.
