Okay, I will provide specific instructions to fix the TypeScript errors and the failing unit test based on the provided Code Quality Report and context files.

**Overall Strategy:**

1.  **Address TypeScript Errors First:** Start with module resolution issues, then type mismatches, property errors, and finally more complex Effect-TS related errors.
2.  **Fix Failing Test:** Once TypeScript errors are resolved, address the failing unit test by ensuring the mock implementation correctly simulates the behavior of the `NIP90Service`.
3.  **Adhere to Project Conventions:** Follow Effect-TS patterns, use `TelemetryService` for logging, and respect NIP specifications.

---

**I. TypeScript Error Fixes**

**Instruction Set 1: Module Resolution and Basic Type Fixes**

1.  **File:** `src/hooks/useConfigurationService.ts`
    *   **Error:** `(10,29): error TS2339: Property 'get' does not exist on type 'Runtime<FullAppContext>'.`
    *   **Instruction:** Change line 10 from `const service = runtime.get(ConfigurationService);` to `const service = runtime.context.get(ConfigurationService);`.

2.  **File:** `src/services/ai/providers/nip90/NIP90ProviderConfig.ts`
    *   **Error:** `(1,24): error TS2307: Cannot find module '@effect/schema' or its corresponding type declarations.`
    *   **Instruction:** Modify the import for `Schema`. Change line 1 `import { Schema } from "@effect/schema";` to `import { Schema } from "effect";`.

3.  **File:** `src/services/nostr/NostrServiceConfig.ts`
    *   **Error:** `(1,24): error TS2307: Cannot find module '@effect/schema' or its corresponding type declarations.`
    *   **Instruction:** Modify the import for `Schema`. Change line 1 `import { Schema } from "@effect/schema";` to `import { Schema } from "effect";`.

4.  **File:** `src/utils/nostr.ts`
    *   **Error:** `(1,10): error TS2305: Module '"nostr-tools/pure"' has no exported member 'generatePrivateKey'.`
    *   **Instruction:** Change the import on line 1 from `generatePrivateKey` to `generateSecretKey`. The line should be: `import { generateSecretKey, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";`.
    *   **Error:** `(10,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Uint8Array<ArrayBufferLike>'.` (This error seems misattributed by the compiler after the above change. The `getPublicKey` function in `nostr-tools/pure` expects a hex string private key. My wrapper `getPublicKey` correctly converts `Uint8Array` to hex before calling it. This error should resolve once `generatePrivateKey` is corrected to `generateSecretKey` in its usage sites, or if it's a linting artifact after fixing other issues.)
    *   **Instruction:** No change needed for this specific line in `src/utils/nostr.ts` if `getPublicKey` from `nostr-tools/pure` is indeed called with a hex string. Focus on the `generatePrivateKey` import fix. If this error persists, it implies `getPkNostrTools` (which is `getPublicKey` from `nostr-tools/pure`) is typed incorrectly or used incorrectly elsewhere.
        *Update for `generatePrivateKey` in `MockDVM.ts` (which affects `utils/nostr.ts` indirectly):*
        In `src/tests/integration/services/nip90/MockDVM.ts`:
        Change line 2 from `import { generatePrivateKey, getPublicKey } from "@/utils/nostr";` to `import { generateSecretKey, getPublicKey } from "@/utils/nostr";`.
        Change line 11 from `this.privateKey = generatePrivateKey();` to `this.privateKey = generateSecretKey();`. (The return type of my `generateSecretKey` is already `Uint8Array`).
        Change line 12 from `this.publicKey = getPublicKey(this.privateKey);` to `this.publicKey = getPublicKey(this.privateKey);` (This is now correct as my `getPublicKey` takes `Uint8Array`).

**Instruction Set 2: Orchestration Service Errors**

**File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`

1.  **Error:** `(77,15): error TS2322: Property 'isEnabled' is missing ... but required in type '{ readonly isEnabled: boolean; ... }'.`
    *   **Instruction:** In the `case "nip90":` block, inside the `createAiModelLayer` (or similarly named function if it's refactored), ensure the `nip90Config` object includes the `isEnabled` property.
        ```typescript
        // Inside createAiModelLayer (or getResolvedAiModelProvider), case "nip90"
        // After fetching dvmPubkey, dvmRelays, modelName etc.
        const devstralEnabledStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_ENABLED").pipe(Effect.orElseSucceed(() => "true")));
        const nip90Config: NIP90ProviderConfig = {
          dvmPubkey,
          dvmRelays,
          requestKind: 5050, // Or from config
          requiresEncryption: true, // Or from config
          useEphemeralRequests: true, // Or from config
          modelIdentifier: modelName, // modelName is DVM's model identifier
          modelName: modelName, // This is the user-facing model name for BaseProviderConfig
          isEnabled: devstralEnabledStr === "true", // ADD THIS
          temperature: 0.7, // Or from config
          maxTokens: 2048, // Or from config
        };
        ```

2.  **Error:** `(93,9): error TS2322: Type 'Layer<any, never, NostrServiceConfig | NostrService | NIP04Service>' is not assignable to type 'Layer<AgentLanguageModel, never, never>'. Type 'NostrServiceConfig | NostrService | NIP04Service' is not assignable to type 'never'.`
    *   **Instruction:** The `ChatOrchestratorService.ts` is trying to dynamically build `AgentLanguageModel` layers, which is complex. The `AI-PHASE06.md` document's `ChatOrchestratorServiceLive` implementation (Task 6.3) simplifies this by assuming a single, pre-configured `AgentLanguageModel` is available in its context.
        Modify `src/services/ai/orchestration/ChatOrchestratorService.ts` to align with this simpler approach:
        1.  Remove the `createAiModelLayer` (or `getResolvedAiModelProvider` if that's the current name) helper function.
        2.  The `ChatOrchestratorServiceLive` should directly `yield* _(AgentLanguageModel)` to get the *currently active* `AgentLanguageModel` instance (which is configured in `FullAppLayer`).
        3.  The `AiPlan.make` call will use this single `agentLM` instance. This means, for now, the orchestrator won't dynamically switch between OpenAI, Anthropic, Ollama, NIP-90 based on `preferredProvider.key` for its plan steps unless `FullAppLayer` itself is reconfigured and the app restarted. The `preferredProvider` param will effectively select which model *within* the active `AgentLanguageModel` provider is used, or it might be ignored if the active provider is NIP-90 and model is fixed by DVM config.
        ```typescript
        // src/services/ai/orchestration/ChatOrchestratorService.ts
        // Remove createAiModelLayer / getResolvedAiModelProvider function

        export const ChatOrchestratorServiceLive = Layer.effect(
          ChatOrchestratorService,
          Effect.gen(function* (_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);
            const agentLM = yield* _(AgentLanguageModel); // Get the globally configured AgentLanguageModel
            // ... other dependencies if needed by ChatOrchestratorService itself

            return ChatOrchestratorService.of({
              _tag: "ChatOrchestratorService",
              streamConversation: ({ messages, preferredProvider, options }) => {
                // ...
                // For AiPlan.make, use the single 'agentLM'
                const plan = AiPlan.make({
                  // The 'model' property of AiPlan.make expects Effect<Provider<Service>, E, R_Client>
                  // AgentLanguageModel is already a Provider<Service>-like interface.
                  // We need to wrap it in Effect.succeed if it's an instance.
                  model: Effect.succeed(agentLM as AiProvider.Provider<AgentLanguageModel>), // Cast as AiProvider.Provider
                  attempts: 3, // Example
                  schedule: Schedule.exponential("100 millis"), // Example
                  // ... 'while' predicate for retries ...
                });
                // ... rest of streamConversation logic using this plan ...
              },
              generateConversationResponse: ({ messages, preferredProvider, options }) => {
                // Similar simplification: use the single 'agentLM' directly for now
                return agentLM.generateText({
                  prompt: JSON.stringify({ messages }), // Ensure prompt is formatted correctly for generateText
                  model: preferredProvider.modelName, // Pass modelName from preferredProvider
                  ...options
                }).pipe(
                  Effect.map((aiResponse) => aiResponse.text) // Assuming generateText returns AiResponse
                );
              },
            });
          }),
        );
        ```
    *   **Note:** This simplification means true multi-provider fallback via `AiPlan` based on `preferredProvider.key` is deferred. The orchestrator will use whatever `AgentLanguageModel` is active in `FullAppLayer`.

3.  **Error:** `(106,20): error TS2307: Cannot find module '@/services/ai/providers/nip90/NIP90AgentLanguageModelLive' or its corresponding type declarations.`
    *   **Instruction:** Check the import path in `src/services/ai/orchestration/ChatOrchestratorService.ts`. Ensure the path is correct and the filename `NIP90AgentLanguageModelLive.ts` has matching casing. If the dynamic import was part of the removed `createAiModelLayer`, this error will disappear. If it's still needed for some reason (unlikely with the simplification), verify the path: `import("@/services/ai/providers/nip90/NIP90AgentLanguageModelLive")`.

**Instruction Set 3: NIP-90 Provider Errors (`NIP90AgentLanguageModelLive.ts`)**

**File:** `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`

1.  **Error:** `(92,31): error TS2339: Property 'getPublicKey' does not exist on type 'NostrService'.`
    *   **Instruction:** In the `generateEphemeralKeyPair` function, change `const pk = nostrService.getPublicKey(sk);` to `const pk = getPublicKeyNostrTools(sk);`. Ensure `getPublicKey` is aliased from `nostr-tools/pure`: `import { getPublicKey as getPublicKeyNostrTools } from "nostr-tools/pure";`. Remove the `nostrService` dependency if this was its only use within this specific function, but it's likely used by `nip90Service`.

2.  **Error:** `(122,15): error TS2322: Type 'string[][]' is not assignable to type 'readonly (readonly [string, "text" | "event" | "url" | "job", ...])[]'.` (generateText)
    *   **Instruction:** The `inputs` for `nip90Service.createJobRequest` must conform to `ReadonlyArray<readonly [string, NIP90InputType, (string | undefined)?, (string | undefined)?]>`.
        In `generateText`, ensure `inputs` is correctly typed:
        ```typescript
        // Inside generateText's Effect.gen block
        const inputsForNip90: ReadonlyArray<readonly [string, NIP90InputType, (string | undefined)?, (string | undefined)?]> =
          [[formattedPrompt, "text" as const]]; // Use "text" as const

        const paramsForNip90: Array<["param", string, string]> = [];
        if (dvmConfig.modelIdentifier) {
          paramsForNip90.push(["param", "model", dvmConfig.modelIdentifier]);
        }
        // ... add other params like temperature, maxTokens ...

        const jobRequest = yield* _(
          nip90Service.createJobRequest({
            // ... other params ...
            inputs: inputsForNip90, // Use the correctly typed array
            params: paramsForNip90.length > 0 ? paramsForNip90 : undefined, // Pass as 'params'
            // ...
          })
        );
        ```
        Ensure `NIP90InputType` is imported from `NIP90Service.ts`.

3.  **Error:** `(124,15): error TS2322: Type 'string | Uint8Array<ArrayBufferLike>' is not assignable to type 'Uint8Array<ArrayBuffer>'.` (generateText)
    *   **Instruction:** The `requesterSk` passed to `nip90Service.createJobRequest` and `getJobResult` must be `Uint8Array`.
        In `generateText`'s `Effect.gen` block:
        ```typescript
        let requestSkBytes: Uint8Array;
        if (dvmConfig.useEphemeralRequests) {
            const ephemeralPair = generateEphemeralKeyPair(); // This function should directly return { sk: Uint8Array, pk: string }
            requestSkBytes = ephemeralPair.sk;
        } else {
            // TODO: Implement logic to get user's main Nostr SK as Uint8Array
            // For now, to pass type checks, or if this path is not yet supported:
            // return yield* _(Effect.fail(new AIProviderError({ message: "Non-ephemeral NIP-90 requests not yet supported", provider: "NIP90" })));
            // Or, default to ephemeral for now if that's acceptable:
            console.warn("[NIP90Provider] Non-ephemeral requests not implemented, using ephemeral keys.");
            requestSkBytes = generateEphemeralKeyPair().sk;
        }
        // ... use requestSkBytes for createJobRequest and getJobResult ...
        ```
        Modify `generateEphemeralKeyPair` in this file to:
        ```typescript
        const generateEphemeralKeyPair = (): { sk: Uint8Array; pk: string } => {
          const skBytes = generateSecretKey(); // from nostr-tools/pure, returns Uint8Array
          const pkHex = getPublicKeyNostrTools(skBytes); // from nostr-tools/pure, takes Uint8Array, returns hex
          return { sk: skBytes, pk: pkHex };
        };
        ```
        And update its usage: `const { sk: requestSkBytes, pk: requestPkHex } = dvmConfig.useEphemeralRequests ...`

4.  **Error:** `(131,39): error TS2345: Argument of type '{...}' is not assignable to parameter of type 'string'.` (getJobResult)
    *   **Instruction:** Change the call to `nip90Service.getJobResult`. It expects positional arguments: `(jobRequestEventId: string, dvmPubkeyHex?: string, decryptionKey?: Uint8Array, relays?: string[])`. The current `NIP90Service` interface for `getJobResult` in `NIP90Service.ts` only has 3 params, and `relays` is not one of them.
        ```typescript
        // Inside generateText, after jobRequest
        const result = yield* _(
          nip90Service.getJobResult(
            jobRequest.id,
            dvmConfig.dvmPubkey, // Optional DVM pubkey
            requestSkBytes        // Optional decryption key
          )
        );
        ```

5.  **Error:** `(140,35): error TS18047: 'result' is possibly 'null'.` (generateText)
    *   **Instruction:** Add a null check for `result` before accessing `result.content`:
        ```typescript
        // Inside generateText, after getJobResult
        if (!result) {
          return yield* _(Effect.fail(new AIProviderError({ message: "NIP-90 job result not found", provider: "NIP90" })));
        }
        return createAiResponse(result.content || ""); // Default to empty string if content is null/undefined
        ```

6.  **Errors:** `(174,17)` and `(176,17)` (streamText `inputs` and `requesterSk`)
    *   **Instruction:** Apply the same fixes as for `generateText` (points 2 and 3 above) to the `streamText` method regarding `inputsForNip90` and `requestSkBytes`.

7.  **Error:** `(183,28): error TS2554: Expected 4 arguments, but got 1.` (subscribeToJobUpdates)
    *   **Instruction:** The `nip90Service.subscribeToJobUpdates` method in `NIP90Service.ts` expects `(jobRequestEventId: string, dvmPubkeyHex: string, decryptionKey: Uint8Array, onUpdate: (event: NIP90JobResult | NIP90JobFeedback) => void)`. The implementation in `NIP90AgentLanguageModelLive.ts` passes an object.
        Correct the call in `streamText`:
        ```typescript
        // Inside streamText's program
        const unsubscribeEffect = nip90Service.subscribeToJobUpdates(
          jobRequest.id,
          dvmConfig.dvmPubkey, // dvmPubkeyHex
          requestSkBytes,     // decryptionKey
          (eventUpdate: NIP90JobResult | NIP90JobFeedback) => { // onUpdate callback
            // ... existing logic for onFeedback, onResult, onError from the original instructions ...
            // This logic should use emit.single, emit.fail, emit.end from Stream.asyncScoped
            if (eventUpdate.kind >= 6000 && eventUpdate.kind < 7000) { // Job Result
              const result = eventUpdate as NIP90JobResult;
              if (result.content) {
                emit.single({ text: result.content });
              }
              emit.end();
            } else if (eventUpdate.kind === 7000) { // Job Feedback
              const feedback = eventUpdate as NIP90JobFeedback;
              if (feedback.status === "partial" && feedback.content) {
                emit.single({ text: feedback.content });
              } else if (feedback.status === "error") {
                emit.fail(
                  new AIProviderError({
                    message: `NIP-90 DVM error: ${feedback.content || "Unknown error"}`,
                    provider: "NIP90",
                    context: { jobId: jobRequest.id, status: feedback.status },
                  })
                );
              }
            }
          }
        );
        const unsubscribe = yield* _(unsubscribeEffect);
        return unsubscribe; // For Stream.asyncScoped cleanup
        ```
        Also, `Stream.asyncScoped` is the correct Effect stream constructor here, not `Stream.asyncInterrupt`.

8.  **Error:** `(151,65): error TS2345: Argument of type '...' is not assignable to parameter of type '...AIProviderError...'. Property 'provider' is missing in type 'NostrRequestError'`
    *   **Instruction:** Ensure the `program` Effect within `Stream.asyncScoped` in `streamText` maps its errors to `AIProviderError`.
        ```typescript
        // In streamText, wrap the program Effect passed to Stream.asyncScoped
        const program = Effect.gen(function* (_) {
            // ... existing logic ...
        }).pipe(
            Effect.mapError(err => {
                if (err instanceof AIProviderError) return err;
                return new AIProviderError({
                    message: `NIP-90 stream setup error: ${err instanceof Error ? err.message : String(err)}`,
                    provider: "NIP90",
                    cause: err
                });
            })
        );
        // Pass this 'program' to Stream.asyncScoped
        ```
        And ensure `emit.fail(...)` calls within the `onUpdate` callback also use `AIProviderError`.

**Instruction Set 4: Store Error**

**File:** `src/stores/ai/agentChatStore.ts`

1.  **Error:** `(27,7): error TS2322: Type '(configService: ConfigurationService) => Effect.Effect<void, ConfigError, never>' is not assignable to type '(configService: ConfigurationService) => Effect<void, never, never>'. Type 'ConfigError' is not assignable to type 'never'.`
    *   **Instruction:** Modify `loadAvailableProviders` to handle `ConfigError` from `configService.get` calls. Use `Effect.orElseSucceed` or `Effect.option` for each `configService.get` call that might fail, and then handle the `Option` or default value.
        ```typescript
        // src/stores/ai/agentChatStore.ts
        loadAvailableProviders: (configService: ConfigurationService): Effect.Effect<void, never, never> =>
          Effect.gen(function* (_) {
            const providers: AIProvider[] = [];

            // Helper to safely get config or default, logging errors
            const safeGetConfig = (key: string, defaultValue: string) =>
              configService.get(key).pipe(
                Effect.catchTag("ConfigError", (e) => {
                  console.warn(`Config key '${key}' not found or error: ${e.message}. Using default: '${defaultValue}'.`);
                  // Optionally log to telemetry here as well
                  return Effect.succeed(defaultValue);
                })
              );

            const ollamaEnabledStr = yield* _(safeGetConfig("OLLAMA_MODEL_ENABLED", "true"));
            if (ollamaEnabledStr === "true") {
              const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
              providers.push({ key: "ollama_gemma3_1b", name: "Ollama (Local)", type: "ollama", modelName: ollamaModelName });
            }

            const devstralEnabledStr = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_ENABLED", "true"));
            if (devstralEnabledStr === "true") {
              const devstralModelName = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_MODEL_NAME", "Devstral (NIP-90)"));
              const modelIdentifier = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER", "devstral"));
              providers.push({
                key: "nip90_devstral",
                name: devstralModelName,
                type: "nip90",
                configKey: "AI_PROVIDER_DEVSTRAL",
                modelName: modelIdentifier,
              });
            }
            set({ availableProviders: providers });
            return Effect.void; // Explicitly return void
          }).pipe(
            Effect.catchAll((unexpectedError) => { // Catch any other unexpected errors from the Effect.gen itself
              console.error("Unexpected error in loadAvailableProviders:", unexpectedError);
              return Effect.void;
            })
          ),
        ```

**Instruction Set 5: Integration Test Errors (`NIP90AgentLanguageModelLive.integration.test.ts`)**

1.  **Mock `NIP90Service` Return Types (various lines):**
    *   **Instruction:** In `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`, refactor all `mockNIP90Service` methods to return `Effect`s instead of `Promise`s. Use `Effect.succeed` for success cases and `Effect.fail` for error cases.
        ```typescript
        // Example for createJobRequest:
        mockNIP90Service.createJobRequest = vi.fn().mockImplementation((params) =>
          Effect.succeed({ /* ... mock NostrEvent ... */ })
        );
        // Example for getJobResult:
        mockNIP90Service.getJobResult = vi.fn().mockImplementation((jobId) =>
          Effect.succeed({ /* ... mock NIP90JobResult ... */ })
        );
        // Example for subscribeToJobUpdates:
        mockNIP90Service.subscribeToJobUpdates = vi.fn().mockImplementation(
          (jobId, pubkey, sk, onUpdate) => {
            // Simulate calling onUpdate as needed for the test
            return Effect.succeed({ unsub: vi.fn() }); // Return the Subscription structure
          }
        );
        ```

2.  **`NIP90AgentLanguageModelLive.integration.test.ts(50,7): Property 'unsub' is missing...`**
    *   **Instruction:** In the mock for `subscribeToJobUpdates`, ensure the returned object is `{ unsub: () => {} }` (lowercase `unsub`). This matches the `Subscription` interface.

3.  **`NIP90AgentLanguageModelLive.integration.test.ts(115,5): 'getPublicKey' does not exist in type 'NostrService'.`**
    *   **Instruction:** Remove `getPublicKey: vi.fn().mockReturnValue("mock-public-key"),` from the `mockNostrService` object definition.

4.  **`NIP90AgentLanguageModelLive.integration.test.ts` Effect `any` / `R` channel errors:**
    *   **Instruction:** For all `Effect.runPromise` calls in this test file, ensure the `Effect.provide(testLayer)` is piped to the program *before* `Effect.runPromise`. Example: `Effect.runPromise(program.pipe(Effect.provide(testLayer)))`.

5.  **`chunks.map` and `chunks.length` Errors:**
    *   **Instruction:** If `Stream.runCollect` returns `Chunk<AiTextChunk>`, convert it to an array before using array methods: `const collectedArray = Chunk.toArray(chunks); const response = collectedArray.map(...).join("");`.

**Instruction Set 6: Unit Test Mock Completeness (`NIP90AgentLanguageModelLive.test.ts`)**

1.  **`NIP90AgentLanguageModelLive.test.ts(21,5): 'dvmPublicKey' does not exist... did you mean 'dvmPubkey'?`**
    *   **Instruction:** In `mockConfig` within `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`, change `dvmPublicKey` to `dvmPubkey`.

2.  **`NIP90AgentLanguageModelLive.test.ts(57,57), (58,57), (61,73): Incomplete mocks...`**
    *   **Instruction:** Complete the mock objects for `NIP90Service`, `NostrService`, and `ConfigurationService` by adding all missing methods from their interfaces. These can be simple `vi.fn()` returning `Effect.void` or basic successful effects.
        Example for `NostrService`:
        ```typescript
        mockNostrService = {
          publishEvent: vi.fn(() => Effect.void),
          listEvents: vi.fn(() => Effect.succeed([])),
          getPool: vi.fn(() => Effect.succeed({} as any)),
          cleanupPool: vi.fn(() => Effect.void),
          subscribeToEvents: vi.fn(() => Effect.succeed({ unsub: vi.fn() })),
          getPublicKey: vi.fn((sk) => getPublicKeyNostrTools(sk)) // If this was a real method on NostrService
        };
        ```

3.  **`NIP90AgentLanguageModelLive.test.ts(159,11)` and `(187,11): updateCallback does not exist...`**
    *   **Instruction:** Refactor the `mockNIP90Service.subscribeToJobUpdates` in this unit test. The SUT (`NIP90AgentLanguageModelLive`) passes an `onUpdate` callback. The mock needs to accept this and call it to simulate DVM events.
        ```typescript
        // In NIP90AgentLanguageModelLive.test.ts
        mockNIP90Service.subscribeToJobUpdates.mockImplementation(
          (_jobId, _dvmPkHex, _decryptionKey, onUpdateCallback) => {
            // Simulate DVM emitting feedback and results by calling onUpdateCallback
            const mockFeedbackStream: Array<NIP90JobFeedback | NIP90JobResult> = [
              { id: 'fb1', kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: 0, tags: [['status', 'partial']], content: "First", sig: '', status: 'partial' as NIP90JobFeedbackStatus },
              { id: 'res1', kind: mockConfig.requestKind + 1000, pubkey: mockConfig.dvmPubkey, created_at: 2, tags: [], content: "Final", sig: '' },
            ];
            mockFeedbackStream.forEach(event => onUpdateCallback(event));
            return Effect.succeed({ unsub: vi.fn() });
          }
        );
        ```

---

**II. Failing Test Fix**

**File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`
**Test:** `NIP90AgentLanguageModelLive > streamText > should handle streaming text generation`
**Error:** `AssertionError: expected [] to deeply equal [ 'First', 'Second', 'Final' ]`

1.  **Instruction:** The primary fix for this test is covered by **Instruction Set 6, Point 3** above. The mock for `subscribeToJobUpdates` needs to correctly invoke the `onUpdateCallback` passed by `NIP90AgentLanguageModelLive`.
    Modify the test implementation:
    ```typescript
    // In src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts
    it("should handle streaming text generation", async () => {
      const updates: string[] = [];
      const mockJobId = "job-stream-123";

      // Mock createJobRequest for this test
      (mockNIP90Service.createJobRequest as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Effect.succeed({ id: mockJobId, kind: mockConfig.requestKind } as NostrEvent)
      );

      // Mock subscribeToJobUpdates specifically for this test's needs
      (mockNIP90Service.subscribeToJobUpdates as ReturnType<typeof vi.fn>).mockImplementation(
        (jobRequestEventId, dvmPubkeyHex, decryptionKey, onUpdateCb) => {
          expect(jobRequestEventId).toBe(mockJobId);

          // Simulate DVM emitting events by calling the onUpdateCb
          process.nextTick(() => { // Use process.nextTick to simulate async behavior
            onUpdateCb({
              id: "feedback1", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000,
              tags: [["status", "partial"]], content: "First", sig: "sig1", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCb({
              id: "feedback2", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000 + 1,
              tags: [["status", "partial"]], content: "Second", sig: "sig2", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCb({
              id: "result1", kind: mockConfig.requestKind + 1000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000 + 2,
              tags: [], content: "Final", sig: "sig3"
            } as NIP90JobResult); // This should call emit.end() in the SUT
          });
          return Effect.succeed({ unsub: vi.fn() });
        }
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test stream prompt" });
        yield* _(
          Stream.runForEach(stream, (chunk) => Effect.sync(() => updates.push(chunk.text)))
        );
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
      expect(updates).toEqual(["First", "Second", "Final"]);
      expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
      expect(mockNIP90Service.subscribeToJobUpdates).toHaveBeenCalled();
    });
    ```

---

After applying these instructions, run `pnpm t` again. Address any new, minor TypeScript errors that might arise due to these changes. The goal is to achieve a clean TypeScript build and pass all unit tests.Okay, I will implement the fixes based on your instructions.

```typescript
// src/hooks/useConfigurationService.ts
import { useEffect, useState } from "react";
import { ConfigurationService } from "@/services/configuration/ConfigurationService";
import { getMainRuntime } from "@/services/runtime";
import { Runtime } from "effect/Runtime";
import { FullAppContext } from "@/services/runtime";

export function useConfigurationService(): ConfigurationService {
  const [configService, setConfigService] =
    useState<ConfigurationService | null>(null);

  useEffect(() => {
    const runtime: Runtime<FullAppContext> = getMainRuntime();
    const service = runtime.context.get(ConfigurationService);
    setConfigService(service);
  }, []);

  if (!configService) {
    throw new Error("ConfigurationService not initialized");
  }

  return configService;
}
```

```typescript
// src/services/ai/providers/nip90/NIP90ProviderConfig.ts
import { Schema } from "effect"; // Changed from @effect/schema
import { Context } from "effect";
import { BaseProviderConfigSchema, NIP90ProviderConfig as CoreNIP90ProviderConfig } from "@/services/ai/core/ProviderConfig"; // Use core type

// Re-export the core NIP90ProviderConfig type
export type NIP90ProviderConfig = CoreNIP90ProviderConfig;

/**
 * Context Tag for NIP90ProviderConfig
 * This tag is used by NIP90AgentLanguageModelLive to get its specific DVM configuration.
 */
export const NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>("NIP90ProviderConfig");

```

```typescript
// src/services/nostr/NostrServiceConfig.ts
import { Schema } from "effect"; // Changed from @effect/schema
import { Context, Layer } from "effect";

export const NostrServiceConfigSchema = Schema.Struct({
  relays: Schema.Array(Schema.String),
  defaultPublicKey: Schema.optional(Schema.String),
  defaultPrivateKey: Schema.optional(Schema.String),
});

export type NostrServiceConfig = Schema.Schema.To<typeof NostrServiceConfigSchema>;

export const NostrServiceConfig = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig

[cut off]
```
