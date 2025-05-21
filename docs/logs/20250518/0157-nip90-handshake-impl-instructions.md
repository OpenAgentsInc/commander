Okay, agent, we're now going to implement a **full, non-mocked integration test** for the NIP-90 handshake. This test will involve a 'requester' (customer) and a 'provider' (simulating a Data Vending Machine that uses a real Ollama instance).

**Prerequisites for Running This Test:**

1.  **Ollama Must Be Running:** Ensure you have an Ollama instance running locally.
2.  **Model Availability:** The `gemma3:1b` model (or the default model configured in `OllamaService`) must be pulled and available in your Ollama instance (e.g., `ollama pull gemma3:1b`).
3.  **Network Access:** The test will make real connections to Nostr relays. Ensure your network allows WebSocket connections to these relays.
4.  **Test Duration:** This test will take longer than unit tests due to network latency and Ollama processing. Default Vitest timeouts should be okay, but be mindful.

**Standard Commands:**

- Run tests: `pnpm test`
- Run type checking: `pnpm t`

---

**Phase 1: Test File Setup and Identities**

1.  **Use Existing Test File:** We will continue working in `src/tests/unit/services/nip90/nip90Handshake.test.ts`.

    - **Remove Mocking:** Delete or comment out all `vi.mock('nostr-tools/pool', ...)` and any other explicit mocking related to `NostrService` or `OllamaService`. We want to use the real implementations.
    - Ensure `SimplePool` is imported normally: `import { SimplePool } from 'nostr-tools/pool';` (though it won't be directly used in the test logic, `NostrService` uses it).

2.  **Update Test File Content (`nip90Handshake.test.ts`):**
    Refine the initial setup. We will need `OllamaService` and its dependencies.

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    import { describe, it, expect, beforeEach, afterAll } from "vitest"; // Added afterAll
    import { Effect, Layer, Exit, Cause, Option } from "effect"; // Keep Cause, Option for detailed error inspection
    import { NodeHttpClient } from "@effect/platform-node"; // For OllamaService dependency

    import {
      NostrEvent,
      type NostrFilter,
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer, // Use default public relays
      NostrServiceConfigTag,
      NostrPoolError, // For cleanup
    } from "@/services/nostr";
    import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
    import { BIP32Service, BIP32ServiceLive } from "@/services/bip32";
    import { NIP19Service, NIP19ServiceLive } from "@/services/nip19";
    import {
      OllamaService,
      OllamaServiceLive,
      UiOllamaConfigLive, // Use UI default config for Ollama endpoint
      OllamaServiceConfigTag,
      type OllamaChatCompletionRequest,
    } from "@/services/ollama";
    import {
      finalizeEvent,
      generateSecretKey,
      getPublicKey as getPk,
      type EventTemplate,
    } from "nostr-tools/pure";

    // --- Helper to run Effects with all necessary services ---
    const FullAppLayer = Layer.mergeAll(
      BIP39ServiceLive,
      BIP32ServiceLive,
      NIP19ServiceLive,
      NostrServiceLive.pipe(Layer.provide(DefaultNostrServiceConfigLayer)),
      OllamaServiceLive.pipe(
        Layer.provide(
          Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer), // OllamaService needs HttpClient and its config
        ),
      ),
    );

    // For running effects within the test, ensuring all layers are provided
    const runFullTestEffect = <E, A>(
      effect: Effect.Effect<
        A,
        E,
        | BIP39Service
        | BIP32Service
        | NIP19Service
        | NostrService
        | OllamaService
      >,
    ) => {
      return Effect.runPromise(Effect.provide(effect, FullAppLayer));
    };

    const runFullTestEffectExit = <E, A>(
      effect: Effect.Effect<
        A,
        E,
        | BIP39Service
        | BIP32Service
        | NIP19Service
        | NostrService
        | OllamaService
      >,
    ) => {
      return Effect.runPromiseExit(Effect.provide(effect, FullAppLayer));
    };

    // --- Identities ---
    let requesterSk: Uint8Array;
    let requesterPk: string;
    let providerSk: Uint8Array;
    let providerPk: string;

    // --- Service Instances (to manage cleanup) ---
    // We'll fetch these from the layer within tests when needed,
    // but keep references if we need to call service-specific cleanup.
    // For NostrService, cleanupPool is important.
    let nostrServiceInstance: NostrService | null = null;

    // --- Helper Functions (from previous phases, ensure they are present) ---
    function createNip90JobRequest(
      sk: Uint8Array,
      inputs: Array<[string, string, string?, string?, string?]>,
      outputMimeType: string = "text/plain",
      bidMillisats?: number,
      jobKind: number = 5001,
    ): NostrEvent {
      // ... (implementation from previous phase)
      const template: EventTemplate = {
        kind: jobKind,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ...inputs.map(
            (inputParams) =>
              ["i", ...inputParams.filter((p) => p !== undefined)] as [
                string,
                ...string[],
              ],
          ),
          ["output", outputMimeType],
        ],
        content: "Job request content for NIP-90 handshake test",
      };

      if (bidMillisats !== undefined) {
        template.tags.push(["bid", bidMillisats.toString()]);
      }

      return finalizeEvent(template, sk) as NostrEvent;
    }

    function createNip90JobResult(
      providerSkInternal: Uint8Array, // Renamed to avoid conflict with global providerSk
      requestEvent: NostrEvent,
      outputContent: string,
      jobKindResult: number = 6001,
      status?: "success" | "error" | "payment-required" | "processing",
    ): NostrEvent {
      // ... (implementation from previous phase)
      const template: EventTemplate = {
        kind: jobKindResult,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", requestEvent.id, "", "request"],
          ["p", requestEvent.pubkey],
          ["request", JSON.stringify(requestEvent)],
          ...requestEvent.tags.filter((tag) => tag[0] === "i"),
        ],
        content: outputContent,
      };

      if (status) {
        template.tags.push(["status", status]);
      }
      return finalizeEvent(template, providerSkInternal) as NostrEvent;
    }

    describe("NIP-90 Full Integration Handshake", () => {
      beforeEach(async () => {
        requesterSk = generateSecretKey();
        requesterPk = getPk(requesterSk);
        providerSk = generateSecretKey();
        providerPk = getPk(providerSk);

        // Fetch the NostrService instance for potential cleanup later
        // This ensures the pool is created before tests that use it.
        const getServiceEffect = Effect.service(NostrService).pipe(
          Effect.tap((service) => (nostrServiceInstance = service)),
          Effect.flatMap((service) => service.getPool()), // Ensure pool is initialized
        );
        await runFullTestEffectExit(getServiceEffect); // Run and wait
      });

      afterAll(async () => {
        // Cleanup Nostr pool connections
        if (nostrServiceInstance) {
          console.log("[TEST CLEANUP] Cleaning up Nostr pool...");
          const cleanupEffect = nostrServiceInstance.cleanupPool();
          const exit = await runFullTestEffectExit(cleanupEffect);
          if (Exit.isFailure(exit)) {
            // Check if it's the expected error for already closed pool.
            const cause = Cause.failureOption(exit.cause).pipe(
              Option.getOrElse(() => ({}) as any),
            );
            if (
              !(
                cause instanceof NostrPoolError &&
                cause.message.includes("Failed to cleanup Nostr pool")
              )
            ) {
              // Adjust if message changes
              console.error(
                "[TEST CLEANUP] Error cleaning up Nostr pool:",
                Cause.pretty(exit.cause),
              );
            }
          } else {
            console.log("[TEST CLEANUP] Nostr pool cleaned up.");
          }
        }
      });

      it("should generate valid requester and provider keys", () => {
        expect(requesterSk.length).toBe(32);
        expect(requesterPk.length).toBe(64);
        expect(providerSk.length).toBe(32);
        expect(providerPk.length).toBe(64);
      });

      // More tests will be added here
    });
    ```

3.  **Run Tests & Type Checks:**
    - `pnpm test "nip90Handshake"`
    - `pnpm t`
    - **Expected:** The `key generation` test passes. No mocks should be active. The `beforeEach` will initialize the Nostr pool.

---

**Phase 2: The Full Handshake Test Case**

This test will be more complex and involve polling for events.

1.  **Add Polling Helper Function in `nip90Handshake.test.ts`:**
    This function will try to fetch events repeatedly until a condition is met or a timeout occurs.

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (outside describe block, after runFullTestEffectExit) ...

    async function pollForEvents(
      description: string,
      filters: NostrFilter[],
      condition: (events: NostrEvent[]) => boolean,
      maxAttempts = 15, // Increased attempts for real network
      delayMs = 2000, // Increased delay for real network
    ): Promise<NostrEvent[]> {
      console.log(
        `[POLL ${description}] Starting polling with filters:`,
        JSON.stringify(filters),
      );
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(
          `[POLL ${description}] Attempt ${attempt}/${maxAttempts}...`,
        );
        const listEffect = Effect.service(NostrService).pipe(
          Effect.flatMap((nostr) => nostr.listEvents(filters)),
        );
        const events = await runFullTestEffect(listEffect); // Use runFullTestEffect for real service call

        if (events.length > 0) {
          console.log(
            `[POLL ${description}] Attempt ${attempt}: Found ${events.length} event(s). First event kind: ${events[0]?.kind}, ID: ${events[0]?.id.substring(0, 6)}`,
          );
        } else {
          console.log(
            `[POLL ${description}] Attempt ${attempt}: No events found yet.`,
          );
        }

        if (condition(events)) {
          console.log(
            `[POLL ${description}] Condition met with ${events.length} event(s).`,
          );
          return events;
        }
        if (attempt < maxAttempts)
          await Effect.runPromise(Effect.sleep(`${delayMs} millis`));
      }
      console.warn(
        `[POLL ${description}] Max attempts reached. Condition not met.`,
      );
      throw new Error(
        `Polling for "${description}" timed out after ${maxAttempts} attempts.`,
      );
    }
    ```

2.  **Add the Full Handshake Test Case:**

    ```typescript
    // src/tests/unit/services/nip90/nip90Handshake.test.ts
    // ... (inside describe('NIP-90 Full Integration Handshake', ...)) ...

      it('full handshake: requester publishes, provider processes with Ollama, requester receives result', async () => {
        const JOB_KIND = 5100; // Kind: Text Generation
        const RESULT_KIND = JOB_KIND + 1000;
        const jobInputText = "Write a very short story about an electron.";
        const ollamaModelToUse = "gemma3:1b"; // Ensure this model is pulled in Ollama

        // 1. Requester creates and publishes job request
        console.log("[HANDSHAKE_TEST] Step 1: Requester creating and publishing job request...");
        const requestEvent = createNip90JobRequest(
          requesterSk,
          [[jobInputText, 'text']], // input: data, type
          'text/plain',             // output mime type
          10000,                    // 10 sats bid
          JOB_KIND
        );
        console.log(`[HANDSHAKE_TEST] Requester Request Event (Kind ${requestEvent.kind}, ID: ${requestEvent.id.substring(0,6)}...) published by ${requesterPk.substring(0,6)}...`);

        const publishRequestEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(requestEvent))
        );
        await runFullTestEffect(publishRequestEffect);
        console.log("[HANDSHAKE_TEST] Requester job request published.");

        // 2. Provider "listens" for the job request (polling)
        console.log("[HANDSHAKE_TEST] Step 2: Provider listening for job request...");
        const providerFilters: NostrFilter[] = [{ kinds: [JOB_KIND], authors: [requesterPk], limit: 5 }]; // More specific filter

        let receivedRequestEvent: NostrEvent | undefined;
        try {
            const foundRequests = await pollForEvents(
                "Provider finding request",
                providerFilters,
                (events) => events.some(e => e.id === requestEvent.id)
            );
            receivedRequestEvent = foundRequests.find(e => e.id === requestEvent.id);
            expect(receivedRequestEvent).toBeDefined();
            expect(receivedRequestEvent?.pubkey).toBe(requesterPk);
            console.log(`[HANDSHAKE_TEST] Provider received job request ID: ${receivedRequestEvent?.id.substring(0,6)}`);
        } catch (e) {
            console.error("Provider polling for request failed:", e);
            throw e; // Fail test if request not found
        }
        if (!receivedRequestEvent) throw new Error("Provider did not receive the request event.");


        // 3. Provider processes the job using Ollama and creates result event
        console.log("[HANDSHAKE_TEST] Step 3: Provider processing job with Ollama...");
        const inputDataTag = receivedRequestEvent.tags.find(t => t[0] === 'i' && t[2] === 'text');
        expect(inputDataTag).toBeDefined();
        const inputText = inputDataTag![1];

        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModelToUse,
          messages: [{ role: 'user', content: `Job: ${inputText}. Provide only the generated text.` }],
          stream: false // Non-streaming for simplicity in test
        };

        const ollamaEffect = Effect.service(OllamaService).pipe(
          Effect.flatMap(ollama => ollama.generateChatCompletion(ollamaRequest))
        );
        const ollamaResult = await runFullTestEffect(ollamaEffect); // Real Ollama call
        expect(ollamaResult.choices[0].message.content).toBeDefined();
        const ollamaOutput = ollamaResult.choices[0].message.content;
        console.log(`[HANDSHAKE_TEST] Ollama output received: "${ollamaOutput.substring(0, 30)}..."`);

        const resultEvent = createNip90JobResult(
          providerSk,
          receivedRequestEvent,
          ollamaOutput,
          RESULT_KIND,
          'success'
        );
        console.log(`[HANDSHAKE_TEST] Provider Result Event (Kind ${resultEvent.kind}, ID: ${resultEvent.id.substring(0,6)}...) published by ${providerPk.substring(0,6)}...`);

        const publishResultEffect = Effect.service(NostrService).pipe(
          Effect.flatMap(nostr => nostr.publishEvent(resultEvent))
        );
        await runFullTestEffect(publishResultEffect);
        console.log("[HANDSHAKE_TEST] Provider job result published.");

        // 4. Requester "listens" for the job result (polling)
        console.log("[HANDSHAKE_TEST] Step 4: Requester listening for job result...");
        const requesterResultFilters: NostrFilter[] = [{
          kinds: [RESULT_KIND],
          authors: [providerPk],
          "#e": [requestEvent.id], // Critically important filter
          limit: 1
        }];

        let receivedResultEvent: NostrEvent | undefined;
        try {
            const foundResults = await pollForEvents(
                "Requester finding result",
                requesterResultFilters,
                (events) => events.some(e => e.tags.some(t => t[0] === 'e' && t[1] === requestEvent.id && t[3] === 'request'))
            );
            receivedResultEvent = foundResults.find(e => e.tags.some(t => t[0] === 'e' && t[1] === requestEvent.id && t[3] === 'request'));
            expect(receivedResultEvent).toBeDefined();
            expect(receivedResultEvent?.pubkey).toBe(providerPk);
            expect(receivedResultEvent?.content).toBe(ollamaOutput);
            const statusTag = receivedResultEvent?.tags.find(t => t[0] === 'status');
            expect(statusTag?.[1]).toBe('success');
            console.log(`[HANDSHAKE_TEST] Requester received job result ID: ${receivedResultEvent?.id.substring(0,6)}`);
        } catch (e) {
            console.error("Requester polling for result failed:", e);
            throw e; // Fail test if result not found
        }

        console.log("[HANDSHAKE_TEST] Full handshake successful!");
      }, 45000); // Increased timeout for this integration test (e.g., 45 seconds)
    });
    ```

3.  **Review and Refine:**

    - **Timeout:** The `it` block for the full handshake has an increased timeout (e.g., `45000` ms) because real network and Ollama calls can be slow. Adjust as needed.
    - **Polling Logic:** The `pollForEvents` helper is basic. In a real application, persistent WebSocket subscriptions (`pool.subscribeMany`) would be used by the provider. For this test, polling is a simpler way to manage the async flow.
    - **Filters:** Ensure filters are specific enough to find the target events but not so narrow that they miss them due to minor variations if relays are inconsistent. Filtering by `authors` and specific event IDs or `#e` tags is crucial.
    - **Error Messages in Test:** Add more `console.log` statements with identifiers (like `[REQUESTER]`, `[PROVIDER]`) to trace the flow during test execution, especially if it fails.
    - **NostrService `cleanupPool`:** The `afterAll` hook now attempts to clean up the pool.

4.  **Run Tests & Type Checks:**
    - `pnpm test "nip90Handshake"`
    - `pnpm t`
    - **Expected:**
      - The "full handshake" test will take some time to run.
      - It should pass if Ollama is running, the model is available, and Nostr relays are responsive.
      - Console logs will show the steps.
      - Type checks should pass.

This setup provides a robust integration test for the NIP-90 flow using your actual services. Remember that external dependencies (network, relays, Ollama) can make tests flaky; this is inherent in integration testing. If issues arise, the console logs added should help pinpoint where the communication breaks down.
