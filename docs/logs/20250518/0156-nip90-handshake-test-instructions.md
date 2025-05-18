Okay, agent, we're going to implement tests for a full NIP-90 handshake. This will involve a 'requester' (customer) and a 'provider' (simulating a Data Vending Machine like one running Ollama).

**Standard Commands:**
*   Run tests: `pnpm test`
*   Run type checking: `pnpm t`

---

**Phase 1: Setup - Identities, Test File, and Required Services**

1.  **Create Test File:**
    *   Create the directory `src/tests/unit/services/nip90/` if it doesn't exist.
    *   Create the file `src/tests/unit/services/nip90/nip90Handshake.test.ts`.

2.  **Add Initial Content to `nip90Handshake.test.ts`:**
    This will set up identities and import necessary services.

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect, Layer, Exit } from 'effect'; // Removed Option, Cause as Exit handles them
    import {
        NostrEvent, // Assuming NostrEvent is exported from '@/services/nostr'
        type NostrFilter, // Assuming NostrFilter is exported from '@/services/nostr'
        NostrService,
        NostrServiceLive,
        DefaultNostrServiceConfigLayer
    } from '@/services/nostr';
    import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';
    import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
    import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
    import { finalizeEvent, generateSecretKey, getPublicKey as getPk, type EventTemplate } from 'nostr-tools/pure';
    // Removed unused hexToBytes, bytesToHex for now

    // --- Helper to run Effects with all necessary services ---
    const TestAppLayer = Layer.mergeAll(
      BIP39ServiceLive,
      BIP32ServiceLive,
      NIP19ServiceLive,
      NostrServiceLive.pipe(Layer.provide(DefaultNostrServiceConfigLayer))
    );

    const runTestEffect = <E, A>(
      effect: Effect.Effect<A, E, BIP39Service | BIP32Service | NIP19Service | NostrService>
    ) => {
      return Effect.runPromise(Effect.provide(effect, TestAppLayer));
    };

    const runTestEffectExit = <E, A>(
        effect: Effect.Effect<A, E, BIP39Service | BIP32Service | NIP19Service | NostrService>
      ) => {
        return Effect.runPromiseExit(Effect.provide(effect, TestAppLayer));
      };

    // --- Identity Setup ---
    let requesterSk: Uint8Array;
    let requesterPk: string;
    let providerSk: Uint8Array;
    let providerPk: string;

    // Mock SimplePool for NostrService interactions
    const mockPoolList = vi.fn();
    const mockPoolPublish = vi.fn();
    const mockPoolClose = vi.fn();

    // Explicitly type the mock implementation
    vi.mock('nostr-tools/pool', async (importOriginal) => {
      const originalModule = await importOriginal<typeof import('nostr-tools/pool')>();
      return {
        ...originalModule,
        SimplePool: vi.fn().mockImplementation(() => ({
          list: mockPoolList, // NostrServiceImpl uses pool.list
          publish: mockPoolPublish,
          close: mockPoolClose,
          // Add other methods if NostrService comes to use them e.g. querySync
          querySync: mockPoolList, // querySync is used by current NostrServiceImpl
        })),
      };
    });
    // Must import SimplePool *after* the mock is defined
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { SimplePool } = await import('nostr-tools/pool');


    describe('NIP-90 Full Handshake', () => {
      beforeEach(async () => {
        // Generate keys for requester and provider
        requesterSk = generateSecretKey();
        requesterPk = getPk(requesterSk);
        providerSk = generateSecretKey();
        providerPk = getPk(providerSk);

        // console.log(`Requester Pubkey: ${requesterPk}`);
        // console.log(`Provider Pubkey: ${providerPk}`);

        mockPoolList.mockClear();
        mockPoolPublish.mockClear();
        mockPoolClose.mockClear();
        // Reset SimplePool constructor mock calls
        vi.mocked(SimplePool).mockClear();
      });

      it('should generate valid requester and provider keys', () => {
        expect(requesterSk.length).toBe(32);
        expect(requesterPk.length).toBe(64);
        expect(providerSk.length).toBe(32);
        expect(providerPk.length).toBe(64);
      });
    });
    ```

3.  **Run Tests & Type Checks:**
    *   `pnpm test "nip90Handshake"`
    *   `pnpm t`
    *   **Expected:** The initial test `'should generate valid requester and provider keys'` should pass. Type checks should pass. Some console output for the keys is expected.

---

**Phase 2: Create and Publish NIP-90 Job Request Event**

1.  **Add Helper to Create Job Request in `nip90Handshake.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (existing code) ...

    function createNip90JobRequest(
      sk: Uint8Array,
      inputs: Array<[string, string, string?, string?, string?]>, // Array of 'i' tag parameters
      outputMimeType: string = 'text/plain',
      bidMillisats?: number, // Changed from satoshis to millisats
      jobKind: number = 5001 // Example: Text summarization
    ): NostrEvent {
      const template: EventTemplate = { // Use EventTemplate type from nostr-tools
        kind: jobKind,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          // Map inputs to 'i' tags
          ...inputs.map(inputParams => ['i', ...inputParams.filter(p => p !== undefined)] as [string, ...string[]]),
          ['output', outputMimeType],
        ],
        content: 'Job request content placeholder', // Optional content
      };

      if (bidMillisats !== undefined) {
        template.tags.push(['bid', bidMillisats.toString()]); // bid in millisats
      }

      return finalizeEvent(template, sk) as NostrEvent; // Cast to our NostrEvent type
    }

    describe('NIP-90 Full Handshake', () => {
      // ... (beforeEach and key generation test) ...

      it('should create and publish a NIP-90 job request', async () => {
        const jobInputData = "This is a long text that needs summarization.";
        const requestEvent = createNip90JobRequest(
            requesterSk,
            [[jobInputData, 'text']], // input: data, type
            'text/plain',
            100000 // 100 sats = 100,000 millisats
        );

        expect(requestEvent.kind).toBe(5001);
        expect(requestEvent.pubkey).toBe(requesterPk);
        expect(requestEvent.tags.some(t => t[0] === 'i' && t[1] === jobInputData && t[2] === 'text')).toBe(true);
        expect(requestEvent.tags.some(t => t[0] === 'bid' && t[1] === '100000')).toBe(true);

        // Mock successful publish: pool.publish returns an array of Promises.
        // NostrServiceImpl's config has 6 relays by default.
        const mockPublishResults = Array(6).fill(Promise.resolve('published_to_mock_relay' as any));
        mockPoolPublish.mockReturnValue(mockPublishResults);

        const publishEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(requestEvent))
        );

        const publishExit = await runTestEffectExit(publishEffect);
        expect(Exit.isSuccess(publishExit), `Publish failed: ${JSON.stringify(publishExit)}`).toBe(true);

        // SimplePool constructor should have been called by NostrService.getPool()
        expect(vi.mocked(SimplePool)).toHaveBeenCalledTimes(1);
        // pool.publish should have been called once by NostrService
        const poolInstance = vi.mocked(SimplePool).mock.results[0].value;
        expect(poolInstance.publish).toHaveBeenCalledTimes(1);
        expect(poolInstance.publish).toHaveBeenCalledWith(
            expect.arrayContaining(DefaultNostrServiceConfigLayer.context.get(NostrService.Config).relays),
            requestEvent
        );
      });
    });
    ```

2.  **Run Tests & Type Checks:**
    *   `pnpm test "nip90Handshake"`
    *   `pnpm t`
    *   **Expected:** New test passes.

---

**Phase 3: Provider Receives Job Request**

1.  **Add Test for Provider Receiving the Event in `nip90Handshake.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (existing code) ...

    describe('NIP-90 Full Handshake', () => {
      // ... (beforeEach, key gen test, publish test) ...

      it('provider should receive the job request', async () => {
        const jobInputData = "Text for provider to receive.";
        const requestEvent = createNip90JobRequest(requesterSk, [[jobInputData, 'text']]);

        // Simulate requester publishing
        mockPoolPublish.mockReturnValue(Array(6).fill(Promise.resolve('published' as any)));
        await runTestEffect(Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(requestEvent))
        ));

        // Simulate provider fetching/subscribing
        // NostrService.listEvents uses pool.querySync in the current impl.
        mockPoolQuerySync.mockResolvedValue([requestEvent]);

        const providerFilters: NostrFilter[] = [{ kinds: [5001], limit: 1 }];
        const listEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.listEvents(providerFilters))
        );
        const receivedEvents = await runTestEffect(listEffect);

        const poolInstance = vi.mocked(SimplePool).mock.results[0].value; // Pool used by listEvents
        expect(poolInstance.querySync).toHaveBeenCalledWith(
            expect.arrayContaining(DefaultNostrServiceConfigLayer.context.get(NostrService.Config).relays),
            providerFilters[0], // querySync takes a single filter object
            expect.anything() // options object with maxWait
        );
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0].id).toBe(requestEvent.id);
        expect(receivedEvents[0].pubkey).toBe(requesterPk);
      });
    });
    ```

2.  **Run Tests & Type Checks.** Expected: New test passes.

---

**Phase 4: Provider Processes Job and Creates Result Event**

1.  **Add Helper to Create Job Result Event in `nip90Handshake.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (existing code) ...

    function createNip90JobResult(
      providerSk: Uint8Array,          // Provider's secret key
      requestEvent: NostrEvent, // The original job request event
      outputContent: string,
      jobKindResult: number = 6001, // Default result for kind 5001
      status?: 'success' | 'error' | 'payment-required' | 'processing'
      // paymentAmountMillisats?: number, // Example for payment
      // paymentInvoice?: string
    ): NostrEvent {
      const template: EventTemplate = {
        kind: jobKindResult,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', requestEvent.id, '', 'request'], // NIP-90: Mark 'e' tag for request
          ['p', requestEvent.pubkey],
          ['request', JSON.stringify(requestEvent)], // NIP-90: Embed full request event
          // Add input tags from original request for reference, as per NIP-90
          ...requestEvent.tags.filter(tag => tag[0] === 'i'),
        ],
        content: outputContent,
      };

      if (status) {
        template.tags.push(['status', status]);
      }
      // Example: if (paymentAmountMillisats) template.tags.push(['amount', paymentAmountMillisats.toString(), paymentInvoice || '']);

      return finalizeEvent(template, providerSk) as NostrEvent;
    }

    describe('NIP-90 Full Handshake', () => {
      // ... (existing tests) ...

      it('provider should process job and create a result event', () => {
        const jobInputData = "Summarize this short text.";
        const requestEvent = createNip90JobRequest(requesterSk, [[jobInputData, 'text']]);

        // Simulate Ollama processing (mocked)
        const ollamaOutput = `Mocked Summary: ${jobInputData.substring(0, 10)}...`;

        const resultEvent = createNip90JobResult(providerSk, requestEvent, ollamaOutput);

        expect(resultEvent.kind).toBe(6001);
        expect(resultEvent.pubkey).toBe(providerPk);
        expect(resultEvent.content).toBe(ollamaOutput);

        const eTag = resultEvent.tags.find(t => t[0] === 'e' && t[3] === 'request');
        expect(eTag?.[1]).toBe(requestEvent.id);

        const pTag = resultEvent.tags.find(t => t[0] === 'p');
        expect(pTag?.[1]).toBe(requestEvent.pubkey);

        const requestTag = resultEvent.tags.find(t => t[0] === 'request');
        expect(JSON.parse(requestTag![1]).id).toBe(requestEvent.id);

        const iTag = resultEvent.tags.find(t => t[0] === 'i');
        expect(iTag?.[1]).toBe(jobInputData);
      });
    });
    ```

2.  **Run Tests & Type Checks.** Expected: New test passes.

---

**Phase 5: Requester Receives Job Result Event & Full Handshake Test**

1.  **Add Test for Requester Receiving the Result and a Full Handshake Test in `nip90Handshake.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (existing code) ...

    describe('NIP-90 Full Handshake', () => {
      // ... (existing tests) ...

      it('requester should receive the job result', async () => {
        const jobInputData = "Text for full handshake.";
        const requestEvent = createNip90JobRequest(requesterSk, [[jobInputData, 'text']]);
        const ollamaOutput = "Mocked result for: " + jobInputData;
        const resultEvent = createNip90JobResult(providerSk, requestEvent, ollamaOutput);

        // Simulate provider publishing the result
        mockPoolPublish.mockClear();
        mockPoolPublish.mockReturnValue(Array(6).fill(Promise.resolve('published_result' as any)));
        await runTestEffect(Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(resultEvent))
        ));

        // Simulate requester fetching/subscribing for results related to their request
        mockPoolQuerySync.mockClear(); // querySync is used by listEvents
        mockPoolQuerySync.mockResolvedValue([resultEvent]);

        const requesterFilters: NostrFilter[] = [
          { // NIP-90 results reference the request event in an 'e' tag
            kinds: [6001], // Result kind for 5001
            "#e": [requestEvent.id],
             // Optional: filter by provider's pubkey if known, or listen more broadly
            // authors: [providerPk]
          }
        ];
        const listEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.listEvents(requesterFilters))
        );
        const receivedResults = await runTestEffect(listEffect);

        const poolInstance = vi.mocked(SimplePool).mock.results[0].value;
        expect(poolInstance.querySync).toHaveBeenCalledWith(
            expect.arrayContaining(DefaultNostrServiceConfigLayer.context.get(NostrService.Config).relays),
            requesterFilters[0], // querySync takes a single filter
            expect.anything()
        );
        expect(receivedResults).toHaveLength(1);
        expect(receivedResults[0].id).toBe(resultEvent.id);
        expect(receivedResults[0].pubkey).toBe(providerPk);
        expect(receivedResults[0].content).toBe(ollamaOutput);
        expect(receivedResults[0].tags.find(t => t[0] === 'e' && t[1] === requestEvent.id && t[3] === 'request')).toBeDefined();
      });

      it('full handshake: requester makes request, provider fulfills, requester gets result', async () => {
        // 1. Requester creates and publishes job request
        const jobInputData = "Full handshake test input.";
        const requestEvent = createNip90JobRequest(
            requesterSk,
            [[jobInputData, 'text', '', 'marker_input1']], // data, type, relay_hint, marker
            'application/json', // output mime type
            50000, // 50 sats bid
            5002 // Kind: Text Moderation
        );
        console.log("[HANDSHAKE] Requester Request Event ID:", requestEvent.id);

        mockPoolPublish.mockClear();
        vi.mocked(SimplePool).mockClear(); // Clear constructor calls too
        mockPoolPublish.mockReturnValue(Array(6).fill(Promise.resolve('req_published' as any)));
        await runTestEffect(Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(requestEvent))
        ));
        const poolInstanceAfterReqPublish = vi.mocked(SimplePool).mock.results[0].value;
        expect(poolInstanceAfterReqPublish.publish).toHaveBeenCalledTimes(1);


        // 2. Provider subscribes and receives job request
        const providerFilters: NostrFilter[] = [{ kinds: [requestEvent.kind], limit: 1 }];
        mockPoolQuerySync.mockClear();
        mockPoolQuerySync.mockResolvedValue([requestEvent]); // Simulate relay returning the event

        const providerReceivedRequestEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.listEvents(providerFilters))
        );
        const providerReceivedEvents = await runTestEffect(providerReceivedRequestEffect);
        expect(providerReceivedEvents[0]?.id).toBe(requestEvent.id);
        const receivedRequestEvent = providerReceivedEvents[0]!; // Assert not undefined


        // 3. Provider processes (mocked) and creates/publishes result
        const inputTag = receivedRequestEvent.tags.find(t => t[0] === 'i' && t[3] === 'marker_input1');
        const ollamaOutput = JSON.stringify({
            moderation_result: `Mocked Ollama moderation for: ${inputTag?.[1]}`,
            status: "success"
        });
        const resultEvent = createNip90JobResult(
            providerSk,
            receivedRequestEvent,
            ollamaOutput,
            6002, // Corresponding result kind for 5002
            'success'
        );
        console.log("[HANDSHAKE] Provider Result Event ID:", resultEvent.id);

        mockPoolPublish.mockClear();
        // Assuming a new pool instance might be used or the same one.
        // If NostrService reuses the pool, SimplePool constructor won't be called again.
        // If a new service instance were used per call (not typical for Effect services from a layer), then it would.
        // Let's assume the same poolInstance is active from the layer.
        mockPoolPublish.mockReturnValue(Array(6).fill(Promise.resolve('res_published' as any)));
        await runTestEffect(Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(resultEvent))
        ));
        // Check publish on the *same* pool instance that should exist
        const poolInstanceAfterResPublish = vi.mocked(SimplePool).mock.results[0].value; // pool for NostrService provided by TestAppLayer
        expect(poolInstanceAfterResPublish.publish).toHaveBeenCalledTimes(1); // Called once for this publish operation


        // 4. Requester subscribes and receives job result
        const requesterResultFilters: NostrFilter[] = [{
          kinds: [resultEvent.kind],
          "#e": [requestEvent.id],
          authors: [providerPk]
        }];
        mockPoolQuerySync.mockClear();
        mockPoolQuerySync.mockResolvedValue([resultEvent]);

        const requesterReceivedResultEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.listEvents(requesterResultFilters))
        );
        const requesterReceivedResults = await runTestEffect(requesterReceivedResultEffect);

        expect(requesterReceivedResults[0]?.id).toBe(resultEvent.id);
        expect(requesterReceivedResults[0].content).toBe(ollamaOutput);
        const statusTag = requesterReceivedResults[0].tags.find(t => t[0] === 'status');
        expect(statusTag?.[1]).toBe('success');
        console.log("[HANDSHAKE] Requester received result successfully.");
      });
    });
    ```

2.  **Run All Tests & Type Checks.**
    *   `pnpm test "nip90Handshake"` (or `pnpm test` for all)
    *   `pnpm t`
    *   **Expected:** All tests pass.

This completes the implementation of tests for a NIP-90 handshake. The interactions with Nostr relays are mocked via the `NostrService`'s underlying `SimplePool` mock, and "Ollama processing" is also simulated. The tests focus on verifying the correct creation, tagging, publishing, and reception of NIP-90 job request and result events.
