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

Okay, I will continue implementing the fixes.

```typescript
// src/services/nostr/NostrServiceConfig.ts
import { Schema } from "effect"; // Changed from @effect/schema
import { Context, Layer } from "effect";

export const NostrServiceConfigSchema = Schema.Struct({
  relays: Schema.Array(Schema.String),
  defaultPublicKey: Schema.optional(Schema.String),
  defaultPrivateKey: Schema.optional(Schema.String),
});

export type NostrServiceConfig = Schema.Schema.Type<typeof NostrServiceConfigSchema>;

export const NostrServiceConfig = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

export const NostrServiceConfigLive = Layer.succeed(
  NostrServiceConfig,
  {
    relays: ["wss://relay.damus.io", "wss://relay.snort.social"],
    // defaultPublicKey: undefined, // This makes it optional
    // defaultPrivateKey: undefined, // This makes it optional
  }
);
```

```typescript
// src/utils/nostr.ts
import { generateSecretKey, getPublicKey as getNostrPublicKey } from "nostr-tools/pure"; // Changed generatePrivateKey to generateSecretKey
import { hexToBytes as nobleHexToBytes, bytesToHex as nobleBytesToHex } from "@noble/hashes/utils"; // aliased for clarity

export function generateSecretKey(): Uint8Array {
  return nobleHexToBytes(generateSecretKey()); // nostr-tools generateSecretKey returns hex, convert to Uint8Array
}

export function getPublicKey(privateKey: Uint8Array): string {
  const privateKeyHex = nobleBytesToHex(privateKey);
  return getNostrPublicKey(privateKeyHex);
}

// Helper functions for hex/byte conversion (if not already available globally or via noble/hashes)
// These are effectively what nobleHexToBytes and nobleBytesToHex do.
// If you are using noble/hashes consistently, these local functions can be removed.
// For now, keeping them for clarity in case noble/hashes utils are not directly used elsewhere in this specific manner.

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(bytes[i/2])) { // Add validation for invalid hex characters
      throw new Error(`Invalid hex character at position ${i} or ${i+1}`);
    }
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

```typescript
// src/tests/integration/services/nip90/MockDVM.ts
import { EventEmitter } from "events";
import { generateSecretKey, getPublicKey } from "@/utils/nostr"; // Uses our utils
import type { NIP90JobResult, NIP90JobFeedback, NIP90JobFeedbackStatus } from "@/services/nip90"; // Added NIP90JobFeedbackStatus
import { bytesToHex } from "@noble/hashes/utils"; // For converting sk to hex if needed by other parts of the mock

export interface MockDVMConfig {
  streamingDelay?: number;
  chunkSize?: number;
  errorRate?: number;
  defaultResponse?: string;
}

export class MockDVM extends EventEmitter {
  private readonly privateKeyBytes: Uint8Array; // Store as bytes
  public readonly publicKey: string; // Store as hex
  private readonly config: Required<MockDVMConfig>;
  private activeJobs: Map<string, NodeJS.Timeout>;

  constructor(config: MockDVMConfig = {}) {
    super();
    this.privateKeyBytes = generateSecretKey(); // Returns Uint8Array from our util
    this.publicKey = getPublicKey(this.privateKeyBytes); // Expects Uint8Array, returns hex from our util
    this.activeJobs = new Map();

    this.config = {
      streamingDelay: config.streamingDelay ?? 100,
      chunkSize: config.chunkSize ?? 10,
      errorRate: config.errorRate ?? 0,
      defaultResponse: config.defaultResponse ?? "This is a test response from the mock DVM.",
    };
  }

  // ... (rest of the MockDVM class remains the same, assuming NIP90JobFeedbackStatus is imported and used) ...
  // Ensure emitFeedback uses the NIP90JobFeedbackStatus type for its status parameter
  private emitFeedback(jobId: string, status: NIP90JobFeedbackStatus, content: string) {
    const feedback: NIP90JobFeedback = {
      id: jobId, // Re-using jobId for simplicity, in reality feedback events have their own IDs
      kind: 7000,
      content,
      status, // This should be one of the NIP90JobFeedbackStatus literals
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      pubkey: this.publicKey,
      sig: "mock-sig",
    };
    this.emit("feedback", feedback);
  }
  public async handleJobRequest(
    jobId: string,
    input: string,
    isEncrypted: boolean = false
  ): Promise<void> {
    if (Math.random() < this.config.errorRate) {
      this.emitError(jobId, "Random error occurred");
      return;
    }
    const response = this.generateResponse(input);
    if (this.config.streamingDelay <= 0) {
      this.emitResult(jobId, response);
      return;
    }
    await this.streamResponse(jobId, response);
  }

  public cancelJob(jobId: string): void {
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
      this.emitFeedback(jobId, "error", "Job cancelled");
    }
  }

  private generateResponse(input: string): string {
    if (input.toLowerCase().includes("error")) {
      throw new Error("Requested error");
    }
    if (input.toLowerCase().includes("long")) {
      return "This is a longer response that will be streamed in multiple chunks. ".repeat(5);
    }
    return this.config.defaultResponse;
  }

  private async streamResponse(jobId: string, response: string): Promise<void> {
    const chunks = this.splitIntoChunks(response, this.config.chunkSize);
    let chunkIndex = 0;
    const sendNextChunk = () => {
      if (chunkIndex < chunks.length) {
        this.emitFeedback(jobId, "partial", chunks[chunkIndex]);
        chunkIndex++;
        const timeout = setTimeout(sendNextChunk, this.config.streamingDelay);
        this.activeJobs.set(jobId, timeout);
      } else {
        this.activeJobs.delete(jobId);
        this.emitResult(jobId, response);
      }
    };
    sendNextChunk();
  }

  private splitIntoChunks(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private emitResult(jobId: string, content: string) {
    const result: NIP90JobResult = {
      id: jobId, // Re-using jobId, real results have their own IDs
      kind: 6050, // Example result kind
      content,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      pubkey: this.publicKey,
      sig: "mock-sig",
    };
    this.emit("result", result);
  }
  private emitError(jobId: string, error: string) {
    this.emitFeedback(jobId, "error", error);
  }
}

export function createMockDVM(config?: MockDVMConfig): MockDVM {
  return new MockDVM(config);
}
```

```typescript
// src/hooks/ai/useAgentChat.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { Effect, Stream, Cause } from "effect";
import {
  // AgentLanguageModel, // No longer directly used if ChatOrchestratorService is the primary interface
  type AiTextChunk,
  type AgentChatMessage,
  type AIProviderError,
  type StreamTextOptions,
  AIConfigurationError, // Import for error handling
} from "@/services/ai/core";
import { getMainRuntime } from "@/services/runtime";
import { TelemetryService, type TelemetryEvent } from "@/services/telemetry";
import { useAgentChatStore } from "@/stores/ai/agentChatStore"; // For provider selection
import { ChatOrchestratorService, PreferredProviderConfig } from "@/services/ai/orchestration"; // Import orchestrator

interface UseAgentChatOptions {
  initialSystemMessage?: string;
}

export interface UIAgentChatMessage extends AgentChatMessage {
  id: string;
  _updateId?: number;
  isStreaming?: boolean;
  timestamp: number;
  providerInfo?: { name: string; type: string; model?: string }; // Added this property
  nip90EventData?: any;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { initialSystemMessage = "You are a helpful AI assistant." } = options;

  const systemMessageInstance: UIAgentChatMessage = {
    id: `system-${Date.now()}`,
    role: "system",
    content: initialSystemMessage,
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState<UIAgentChatMessage[]>([
    systemMessageInstance,
  ]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AIProviderError | AIConfigurationError | null>(null); // Allow AIConfigurationError

  const runtimeRef = useRef(getMainRuntime());
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

  const { selectedProviderKey } = useAgentChatStore(); // Get selected provider

  const runTelemetry = useCallback((event: TelemetryEvent) => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)).pipe(
        Effect.provide(runtimeRef.current),
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return;

      const userMessage: UIAgentChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: promptText.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setCurrentInput("");
      setIsLoading(true);
      setError(null);
      runTelemetry({ /* ... */ });

      const conversationHistoryForLLM: AgentChatMessage[] = messages
        .filter(m => m.id !== currentAssistantMessageIdRef.current && m.role !== "system")
        .map(({ id: _id, _updateId, isStreaming, timestamp, providerInfo, nip90EventData, ...coreMsg }) => coreMsg) // Strip UI specific fields
        .concat([{ role: "user", content: userMessage.content }]);

      const assistantMsgId = `assistant-${Date.now()}`;
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        // ... telemetry ...
      }
      streamAbortControllerRef.current = new AbortController();
      const signal = streamAbortControllerRef.current.signal;
      currentAssistantMessageIdRef.current = assistantMsgId;

      const currentProviderConfig = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);
      const providerNameForUI = currentProviderConfig?.name || "Unknown Provider";
      const providerTypeForUI = (currentProviderConfig?.type as "local" | "network") || "network"; // Default to network if type is unknown
      const modelNameForUI = currentProviderConfig?.modelName || "default";


      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          isStreaming: true,
          timestamp: Date.now(),
          providerInfo: { name: providerNameForUI, type: providerTypeForUI, model: modelNameForUI }, // Add provider info
        },
      ]);

      // Determine preferred provider configuration
      const preferredProvider: PreferredProviderConfig = {
        key: selectedProviderKey, // From Zustand store
        // modelName can be passed if specific models within a provider type are selectable
        // For NIP-90, modelName might be the DVM's modelIdentifier
        modelName: currentProviderConfig?.modelName || undefined
      };


      const streamParams = {
        messages: [
          { role: "system" as const, content: initialSystemMessage },
          ...conversationHistoryForLLM,
        ],
        preferredProvider,
        options: { /* temperature, maxTokens from AgentChatStore or component state */ }
      };

      const program = Effect.gen(function* (_) {
        const orchestrator = yield* _(ChatOrchestratorService); // Use orchestrator
        const textStream = orchestrator.streamConversation(streamParams);

        yield* _(
          Stream.runForEach(textStream, (chunk: AiTextChunk) => // chunk is AiTextChunk from core
            Effect.sync(() => {
              if (signal.aborted) { /* ... */ return; }
              setMessages((prevMsgs) =>
                prevMsgs.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                      ...msg,
                      content: (msg.content || "") + chunk.text,
                      _updateId: Date.now(),
                      // providerInfo and nip90EventData might be updated here if chunk contains them
                    }
                    : msg,
                ),
              );
            }),
          // { signal } // Pass signal if runForEach supports it
          ),
        );
      }).pipe(
        Effect.provide(runtimeRef.current),
        Effect.tapErrorCause((cause) => Effect.sync(() => { /* ... error handling ... */
            const squashedError = Cause.squash(cause) as AIProviderError | AIConfigurationError;
            setError(squashedError);
        })),
        Effect.ensuring(Effect.sync(() => { /* ... cleanup ... */ })),
      );

      Effect.runFork(program);
    },
    [messages, initialSystemMessage, runTelemetry, selectedProviderKey],
  );

  useEffect(() => {
    return () => {
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        runTelemetry({ /* ... */ });
      }
    };
  }, [runTelemetry]);

  return { messages, currentInput, setCurrentInput, isLoading, error, sendMessage };
}
```

```typescript
// src/services/ai/orchestration/ChatOrchestratorService.ts
import { Context, Effect, Stream, Layer, Schedule, Cause, Option } from "effect";
import {
  AgentChatMessage,
  AiTextChunk,
  AIProviderError,
  AIConfigurationError,
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  NIP90ProviderConfig, // Ensure this is the correct type from core
} from "@/services/ai/core";
import type { AiModel, Provider as AiProvider } from "@effect/ai";
import { ConfigurationService, ConfigError } from "@/services/configuration";
import { HttpClient } from "@effect/platform";
import { AiPlan } from "@effect/ai";
import { TelemetryService } from "@/services/telemetry";

// Import provider specific layers and tags
import { OpenAIProvider } from "@/services/ai/providers/openai";
import { OllamaProvider } from "@/services/ai/providers/ollama";
import { NIP90Provider } from "@/services/ai/providers/nip90";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

export interface PreferredProviderConfig {
  key: string;
  modelName?: string;
}

export interface ChatOrchestratorService {
  readonly _tag: "ChatOrchestratorService";
  streamConversation(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<StreamTextOptions, "prompt">>;
  }): Stream.Stream<AiTextChunk, AIProviderError | AIConfigurationError>;
  generateConversationResponse(params: {
    messages: AgentChatMessage[];
    preferredProvider: PreferredProviderConfig;
    options?: Partial<Omit<GenerateTextOptions, "prompt">>;
  }): Effect.Effect<string, AIProviderError | AIConfigurationError>;
}

export const ChatOrchestratorService = Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService");

export const ChatOrchestratorServiceLive = Layer.effect(
  ChatOrchestratorService,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    // Get all available AgentLanguageModel providers (assuming they are uniquely tagged or this is handled upstream)
    // For this simplified approach, we get the one active AgentLanguageModel from the context.
    const activeAgentLM = yield* _(AgentLanguageModel);

    const runTelemetry = (event: any) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));


    return ChatOrchestratorService.of({
      _tag: "ChatOrchestratorService",
      streamConversation: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "stream_conversation_start", label: preferredProvider.key });

        // Simplified plan: Use the single active AgentLanguageModel
        // True multi-provider AiPlan would require resolving specific AiModel instances.
        const plan = AiPlan.make({
          model: Effect.succeed(activeAgentLM as AiProvider.Provider<AgentLanguageModel>), // Cast for AiPlan
          attempts: 3,
          schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(2)),
          while: (err: AIProviderError | AIConfigurationError) =>
            err._tag === "AIProviderError" && err.isRetryable === true,
        });

        const streamOptions: StreamTextOptions = {
          ...options,
          prompt: JSON.stringify({ messages }), // Ensure prompt is stringified if AgentLanguageModel expects it
          model: preferredProvider.modelName, // Pass model name if provider supports it
        };

        return Stream.unwrap(
          plan.pipe(
            Effect.flatMap(builtPlan => builtPlan.streamText(streamOptions)),
            Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "ai_plan_execution_error", label: (err as Error).message }))
          )
        );
      },
      generateConversationResponse: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "generate_conversation_start", label: preferredProvider.key });

        const generateOptions: GenerateTextOptions = {
          ...options,
          prompt: JSON.stringify({ messages }),
          model: preferredProvider.modelName,
        };

        // Simplified: use the single active AgentLanguageModel
        return activeAgentLM.generateText(generateOptions).pipe(
          Effect.map(aiResponse => aiResponse.text),
          Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "generate_conversation_error", label: (err as Error).message }))
        );
      },
    });
  })
);
```

```typescript
// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
import { Layer, Effect, Stream, Option } from "effect";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
  type AgentChatMessage,
  type AIProviderError, // Import our specific error type
} from "@/services/ai/core";
import { createAiResponse } from "@/services/ai/core/AiResponse"; // Import helper

import {
  NIP90Service,
  type NIP90InputType,
  type NIP90JobResult,
  type NIP90JobFeedback,
  type NIP90JobFeedbackStatus
} from "@/services/nip90";
import { NostrService } from "@/services/nostr"; // Keep this, it's a dep of NIP90ServiceLive
import { NIP04Service } from "@/services/nip04"; // Keep this
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "./NIP90ProviderConfig";
import { generateSecretKey, getPublicKey as getPublicKeyNostrTools } from "nostr-tools/pure"; // Import nostr-tools getPublicKey
import { bytesToHex, hexToBytes } from "@noble/hashes/utils"; // For key conversions

console.log("Loading NIP90AgentLanguageModelLive module");

export const NIP90AgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    const nip90Service = yield* _(NIP90Service);
    // const nostrService = yield* _(NostrService); // Not directly used in generateEphemeralKeyPair
    const telemetry = yield* _(TelemetryService);
    const dvmConfig = yield* _(NIP90ProviderConfigTag);

    const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
      try {
        const parsed = JSON.parse(promptString);
        if (parsed && Array.isArray(parsed.messages)) return parsed.messages as AgentChatMessage[];
      } catch (e) { /* fallback */ }
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    const formatPromptForDVM = (messages: AgentChatMessage[]): string =>
      messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n\n");

    const generateEphemeralKeyPair = (): { sk: Uint8Array; pk: string } => {
      const skBytes = generateSecretKey(); // returns Uint8Array
      const pkHex = getPublicKeyNostrTools(skBytes); // nostr-tools getPublicKey takes Uint8Array and returns hex
      return { sk: skBytes, pk: pkHex };
    };

    const mapError = (err: unknown, contextAction: string, jobId?: string): AIProviderError => {
      const baseError = err instanceof Error ? err : new Error(String(err));
      return new AIProviderError({
        message: `NIP-90 ${contextAction} error: ${baseError.message}`,
        provider: "NIP90",
        cause: baseError,
        context: { jobId, dvmPubkey: dvmConfig.dvmPubkey },
      });
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",
      generateText: (params: GenerateTextOptions) => Effect.gen(function* (_) {
        const messagesPayload = parsePromptMessages(params.prompt);
        const formattedPrompt = formatPromptForDVM(messagesPayload);

        let requestSkBytes: Uint8Array;
        if (dvmConfig.useEphemeralRequests) {
          requestSkBytes = generateEphemeralKeyPair().sk;
        } else {
          // TODO: Handle non-ephemeral case (get user's main SK)
          console.warn("[NIP90Provider] Non-ephemeral requests not implemented, using ephemeral keys.");
          requestSkBytes = generateEphemeralKeyPair().sk;
        }

        const inputsForNip90: ReadonlyArray<readonly [string, NIP90InputType, (string | undefined)?, (string | undefined)?]> =
          [[formattedPrompt, "text" as const]];

        const paramsForNip90: Array<["param", string, string]> = [];
        if (dvmConfig.modelIdentifier) paramsForNip90.push(["param", "model", dvmConfig.modelIdentifier]);
        if (params.temperature !== undefined) paramsForNip90.push(["param", "temperature", params.temperature.toString()]);
        if (params.maxTokens !== undefined) paramsForNip90.push(["param", "max_tokens", params.maxTokens.toString()]);

        const jobRequest = yield* _(
          nip90Service.createJobRequest({
            kind: dvmConfig.requestKind,
            inputs: inputsForNip90,
            params: paramsForNip90.length > 0 ? paramsForNip90 : undefined,
            requesterSk: requestSkBytes,
            targetDvmPubkeyHex: dvmConfig.requiresEncryption ? dvmConfig.dvmPubkey : undefined,
            relays: dvmConfig.dvmRelays,
            requiresEncryption: dvmConfig.requiresEncryption, // Added this to CreateNIP90JobParams
          }).pipe(Effect.mapError(err => mapError(err, "createJobRequest")))
        );

        const result = yield* _(
          nip90Service.getJobResult(
            jobRequest.id,
            dvmConfig.dvmPubkey,
            dvmConfig.requiresEncryption ? requestSkBytes : undefined // Only pass decryptionKey if encrypted
          ).pipe(Effect.mapError(err => mapError(err, "getJobResult", jobRequest.id)))
        );

        if (!result) return yield* _(Effect.fail(mapError("NIP-90 job result not found", "getJobResult", jobRequest.id)));
        return createAiResponse(result.content || "");
      }),

      streamText: (params: StreamTextOptions) => Stream.asyncScoped<AiTextChunk, AIProviderError>(emit =>
        Effect.gen(function* (_) {
          const messagesPayload = parsePromptMessages(params.prompt);
          const formattedPrompt = formatPromptForDVM(messagesPayload);

          let requestSkBytes: Uint8Array;
          if (dvmConfig.useEphemeralRequests) {
            requestSkBytes = generateEphemeralKeyPair().sk;
          } else {
            console.warn("[NIP90Provider] Non-ephemeral requests not implemented, using ephemeral keys.");
            requestSkBytes = generateEphemeralKeyPair().sk;
          }

          const inputsForNip90: ReadonlyArray<readonly [string, NIP90InputType, (string | undefined)?, (string | undefined)?]> =
            [[formattedPrompt, "text" as const]];
          const paramsForNip90: Array<["param", string, string]> = [];
          if (dvmConfig.modelIdentifier) paramsForNip90.push(["param", "model", dvmConfig.modelIdentifier]);
          // ... add other params ...

          const jobRequest = yield* _(
            nip90Service.createJobRequest({
              kind: dvmConfig.requestKind,
              inputs: inputsForNip90,
              params: paramsForNip90.length > 0 ? paramsForNip90 : undefined,
              requesterSk: requestSkBytes,
              targetDvmPubkeyHex: dvmConfig.requiresEncryption ? dvmConfig.dvmPubkey : undefined,
              relays: dvmConfig.dvmRelays,
              requiresEncryption: dvmConfig.requiresEncryption,
            })
          );

          const onUpdateCallback = (eventUpdate: NIP90JobResult | NIP90JobFeedback) => {
            if (eventUpdate.kind >= 6000 && eventUpdate.kind < 7000) {
              const result = eventUpdate as NIP90JobResult;
              if (result.content) emit.single({ text: result.content });
              emit.end();
            } else if (eventUpdate.kind === 7000) {
              const feedback = eventUpdate as NIP90JobFeedback;
              if (feedback.status === "partial" && feedback.content) emit.single({ text: feedback.content });
              else if (feedback.status === "error") emit.fail(mapError(feedback.content || "Unknown DVM error", "feedbackError", jobRequest.id));
            }
          };

          const unsubscribeEffect = nip90Service.subscribeToJobUpdates(
            jobRequest.id,
            dvmConfig.dvmPubkey,
            dvmConfig.requiresEncryption ? requestSkBytes : undefined, // Only pass decryptionKey if encrypted
            onUpdateCallback
          );
          const subscription = yield* _(unsubscribeEffect);
          return subscription.unsub; // Return the cleanup function for Stream.asyncScoped
        }).pipe(Effect.mapError(err => mapError(err, "streamSetup"))) // Map errors from the setup Effect
      ),
      generateStructured: (_params) => Effect.fail(mapError("generateStructured not supported", "generateStructured")),
    });
  })
);
```

```typescript
// src/stores/ai/agentChatStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // Ensure createJSONStorage is imported
import { Effect } from "effect";
import { ConfigurationService, ConfigError } from "@/services/configuration"; // Import ConfigError

export interface AIProvider {
  key: string;
  name: string;
  type: "ollama" | "nip90" | "openai" | "anthropic";
  configKey?: string;
  modelName?: string;
}

interface AgentChatState {
  selectedProviderKey: string;
  availableProviders: AIProvider[];
  setSelectedProviderKey: (key: string) => void;
  loadAvailableProviders: (configService: ConfigurationService) => Effect.Effect<void, never, never>; // Corrected R and E types
}

export const useAgentChatStore = create<AgentChatState>()(
  persist(
    (set) => ({
      selectedProviderKey: "ollama_gemma3_1b",
      availableProviders: [],
      setSelectedProviderKey: (key: string) => set({ selectedProviderKey: key }),
      loadAvailableProviders: (configService: ConfigurationService): Effect.Effect<void, never, never> =>
        Effect.gen(function* (_) {
          const providers: AIProvider[] = [];

          const safeGetConfig = (key: string, defaultValue: string) =>
            configService.get(key).pipe(
              Effect.catchAll((_error: ConfigError) => { // Explicitly type error if needed, or use unknown
                // Optionally log this error to telemetry or console
                // console.warn(`Config key '${key}' not found or error: ${_error.message}. Using default: '${defaultValue}'.`);
                return Effect.succeed(defaultValue);
              })
            );

          const ollamaEnabledStr = yield* _(safeGetConfig("OLLAMA_MODEL_ENABLED", "true"));
          if (ollamaEnabledStr === "true") {
            const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
            providers.push({
              key: "ollama_gemma3_1b",
              name: "Ollama (Local)",
              type: "ollama",
              modelName: ollamaModelName,
            });
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
          Effect.catchAll((unexpectedError) => {
            console.error("Unexpected error in loadAvailableProviders:", unexpectedError);
            return Effect.void;
          })
        ),
    }),
    {
      name: "agent-chat-store",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : (undefined as any))), // Ensure storage is defined for non-browser
    },
  ),
);
```

```typescript
// src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, pipe, Stream, Chunk, Exit } from "effect"; // Added Exit
import { AgentLanguageModel, type AiTextChunk, AIProviderError } from "@/services/ai/core";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90Service, type NIP90JobResult, type NIP90JobFeedback, NIP90JobFeedbackStatus } from "@/services/nip90";
import { NostrService, type NostrEvent } from "@/services/nostr"; // type NostrEvent
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag, NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
// Removed generatePrivateKey, getPublicKey from "@/utils/nostr" as they are not used here.

describe("NIP90AgentLanguageModelLive Integration", () => {
  const mockDvmPubkey = "mock-dvm-pubkey-hex"; // Ensure it's hex
  const mockConfig: NIP90ProviderConfig = { // Use the actual type
    isEnabled: true,
    modelName: "test-dvm-model",
    dvmPubkey: mockDvmPubkey,
    dvmRelays: ["wss://mock.relay"],
    requestKind: 5050,
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: "test-dvm-model-id",
    temperature: 0.7,
    maxTokens: 1000,
  };

  let mockNIP90Service: NIP90Service;
  let mockNostrService: NostrService;
  let mockNIP04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<AgentLanguageModel, never, NIP90Service | NostrService | NIP04Service | TelemetryService | NIP90ProviderConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNIP90Service = {
      createJobRequest: vi.fn().mockImplementation((params) =>
        Effect.succeed({
          id: "mock-job-id",
          kind: params.kind,
          content: "mock-request-content",
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          pubkey: "mock-requester-pubkey",
          sig: "mock-request-sig",
        } as NostrEvent)
      ),
      getJobResult: vi.fn().mockImplementation((jobId) =>
        Effect.succeed({
          id: "result-for-" + jobId,
          kind: mockConfig.requestKind + 1000,
          content: "mock-result-content",
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          pubkey: mockDvmPubkey,
          sig: "mock-result-sig",
        } as NIP90JobResult)
      ),
      subscribeToJobUpdates: vi.fn().mockImplementation(
        (jobRequestEventId, _dvmPubkeyHex, _decryptionKey, onUpdate) =>
          Effect.succeed({ // Return Effect<Subscription, ...>
            unsub: () => { /* mock unsub */ },
          })
      ),
      listJobFeedback: vi.fn().mockImplementation(() => Effect.succeed([])),
      listPublicEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
    };

    mockNostrService = { // Provide all methods of NostrService
      publishEvent: vi.fn().mockReturnValue(Effect.void),
      listEvents: vi.fn().mockReturnValue(Effect.succeed([])),
      getPool: vi.fn().mockReturnValue(Effect.succeed({} as any)),
      cleanupPool: vi.fn().mockReturnValue(Effect.void),
      subscribeToEvents: vi.fn().mockReturnValue(Effect.succeed({ unsub: vi.fn() })),
      // getPublicKey is not part of NostrService interface
    };

    mockNIP04Service = {
      encrypt: vi.fn().mockReturnValue(Effect.succeed("encrypted-payload")),
      decrypt: vi.fn().mockReturnValue(Effect.succeed("decrypted-payload")),
    };

    mockTelemetryService = {
      trackEvent: vi.fn(() => Effect.void),
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn((_enabled: boolean) => Effect.void),
    };

    const nip90ServiceLayer = Layer.succeed(NIP90Service, mockNIP90Service);
    const nostrServiceLayer = Layer.succeed(NostrService, mockNostrService);
    const nip04ServiceLayer = Layer.succeed(NIP04Service, mockNIP04Service);
    const telemetryServiceLayer = Layer.succeed(TelemetryService, mockTelemetryService);
    const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, mockConfig);

    testLayer = NIP90AgentLanguageModelLive.pipe(
      Layer.provide(nip90ServiceLayer),
      Layer.provide(nostrServiceLayer), // NIP90AgentLanguageModelLive doesn't directly use this, but NIP90Service might
      Layer.provide(nip04ServiceLayer),   // Same as above
      Layer.provide(telemetryServiceLayer),
      Layer.provide(nip90ConfigLayer)
    );
  });


  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(model.generateText({ prompt: "Test prompt" }));
        expect(response.text).toBe("mock-result-content");
      });
      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle errors from createJobRequest", async () => {
        mockNIP90Service.createJobRequest = vi.fn().mockImplementationOnce(() =>
            Effect.fail(new AIProviderError({ message: "Create job failed", provider: "NIP90" }))
        );
        const program = Effect.gen(function* (_) {
            const model = yield* _(AgentLanguageModel);
            return yield* _(Effect.either(model.generateText({ prompt: "Test prompt" })));
        });
        const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
            expect(result.left.message).toContain("Create job failed");
        }
    });
  });

  describe("streamText", () => {
    it("should handle streaming text generation", async () => {
       (mockNIP90Service.subscribeToJobUpdates as ReturnType<typeof vi.fn>).mockImplementation(
        (_jobId, _dvmPk, _sk, onUpdateCb) => {
          process.nextTick(() => onUpdateCb({ kind: 7000, content: "First ", status: "partial" } as NIP90JobFeedback));
          process.nextTick(() => onUpdateCb({ kind: 7000, content: "second chunk. ", status: "partial" } as NIP90JobFeedback));
          process.nextTick(() => onUpdateCb({ kind: mockConfig.requestKind + 1000, content: "Final content." } as NIP90JobResult));
          return Effect.succeed({ unsub: vi.fn() });
        }
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test stream prompt" });
        const chunks = yield* _(Stream.runCollect(stream));
        const collectedArray = Chunk.toArray(chunks);
        const response = collectedArray.map(chunk => chunk.text).join("");
        expect(response).toBe("First second chunk. Final content.");
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle stream interruption correctly", async () => {
        const program = Effect.gen(function* (_) {
            const model = yield* _(AgentLanguageModel);
            const stream = model.streamText({ prompt: "Test interruption" });
            // Attempt to take only one item from the stream then interrupt
            const fiber = yield* _(Stream.runCollect(stream).pipe(Effect.fork));
            yield* _(Effect.sleep(50)); // Allow some time for subscription if it's async
            yield* _(Fiber.interrupt(fiber));
            const exit = yield* _(Fiber.await(fiber));
            expect(Exit.isInterrupted(exit)).toBe(true);
        });
        await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });
});
```

```typescript
// src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, pipe, Stream, Chunk } from "effect";
import { AgentLanguageModel, AIProviderError } from "@/services/ai/core";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90Service, type NIP90JobResult, type NIP90JobFeedback, type CreateNIP90JobParams, NIP90JobFeedbackStatus } from "@/services/nip90";
import { NostrService, type NostrEvent } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration"; // Keep if NIP90ProviderConfigTag depends on it
import { NIP90ProviderConfigTag, NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

// Mock nostr-tools/pure as it's used by the SUT
vi.mock("nostr-tools/pure", () => ({
  generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Returns Uint8Array
  getPublicKey: vi.fn((skBytes: Uint8Array) => { // Takes Uint8Array, returns hex
    // Simple mock, doesn't need to be cryptographically correct for this test
    return Array.from(skBytes).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
  }),
}));


describe("NIP90AgentLanguageModelLive", () => {
  const mockDvmPubkey = "dvm_pubkey_hex_string_64_chars_long_aaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const mockConfig: NIP90ProviderConfig = {
    isEnabled: true,
    modelName: "test-dvm-model-from-config",
    dvmPubkey: mockDvmPubkey,
    dvmRelays: ["wss://mock.relay.test"],
    requestKind: 5100,
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: "dvm-model-id-from-config",
    temperature: 0.7,
    maxTokens: 500,
  };

  let mockNIP90Service: NIP90Service;
  let mockNostrService: NostrService;
  let mockNIP04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let mockConfigurationService: ConfigurationService;
  let TestLayer: Layer.Layer<AgentLanguageModel, never, NIP90Service | NostrService | NIP04Service | TelemetryService | ConfigurationService | NIP90ProviderConfig>;


  beforeEach(() => {
    vi.clearAllMocks();

    mockNIP90Service = {
      createJobRequest: vi.fn(),
      getJobResult: vi.fn(),
      subscribeToJobUpdates: vi.fn(),
      listJobFeedback: vi.fn(() => Effect.succeed([])),
      listPublicEvents: vi.fn(() => Effect.succeed([])),
    };

    mockNostrService = {
      publishEvent: vi.fn(() => Effect.void),
      listEvents: vi.fn(() => Effect.succeed([])),
      getPool: vi.fn(() => Effect.succeed({} as any)),
      cleanupPool: vi.fn(() => Effect.void),
      subscribeToEvents: vi.fn(() => Effect.succeed({ unsub: vi.fn() })),
      // getPublicKey is not part of NostrService; it's from nostr-tools/pure
    };

    mockNIP04Service = {
      encrypt: vi.fn((_sk, _pk, pt) => Effect.succeed(`encrypted(${pt})`)),
      decrypt: vi.fn((_sk, _pk, ct) => Effect.succeed(ct.replace("encrypted(", "").replace(")", ""))),
    };

    mockTelemetryService = {
      trackEvent: vi.fn(() => Effect.void),
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn(() => Effect.void),
    };

    mockConfigurationService = {
      get: vi.fn((key: string) => {
        if (key === "USER_NOSTR_SK_HEX") return Effect.succeed("user_sk_hex_for_non_ephemeral_if_needed");
        return Effect.fail({ _tag: "ConfigError", message: `Config key ${key} not found` } as any);
      }),
      getSecret: vi.fn(() => Effect.fail({ _tag: "SecretNotFoundError", message: "Secret not found", keyName: "" } as any)),
      set: vi.fn(() => Effect.void),
      delete: vi.fn(() => Effect.void),
    };

    const NIP90ServiceLayer = Layer.succeed(NIP90Service, mockNIP90Service);
    const NostrServiceLayer = Layer.succeed(NostrService, mockNostrService);
    const NIP04ServiceLayer = Layer.succeed(NIP04Service, mockNIP04Service);
    const TelemetryServiceLayer = Layer.succeed(TelemetryService, mockTelemetryService);
    const ConfigurationServiceLayer = Layer.succeed(ConfigurationService, mockConfigurationService);
    const NIP90ProviderConfigLayer = Layer.succeed(NIP90ProviderConfigTag, mockConfig);

    TestLayer = NIP90AgentLanguageModelLive.pipe(
      Layer.provide(NIP90ServiceLayer),
      Layer.provide(NostrServiceLayer),
      Layer.provide(NIP04ServiceLayer),
      Layer.provide(TelemetryServiceLayer),
      Layer.provide(ConfigurationServiceLayer), // NIP90ProviderConfig might need this if it reads from global config
      Layer.provide(NIP90ProviderConfigLayer)
    );
  });

  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      const mockJobId = "job-gen-123";
      (mockNIP90Service.createJobRequest as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Effect.succeed({ id: mockJobId, kind: mockConfig.requestKind } as NostrEvent)
      );
      (mockNIP90Service.getJobResult as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Effect.succeed({ content: "Test DVM response" } as NIP90JobResult)
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(model.generateText({ prompt: "A test prompt" }));
        expect(response.text).toBe("Test DVM response");
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
      expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
      expect(mockNIP90Service.getJobResult).toHaveBeenCalledWith(mockJobId, mockConfig.dvmPubkey, expect.any(Uint8Array));
    });
  });

  describe("streamText", () => {
    it("should handle streaming text generation", async () => {
      const updates: string[] = [];
      const mockJobId = "job-stream-123";

      (mockNIP90Service.createJobRequest as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Effect.succeed({ id: mockJobId, kind: mockConfig.requestKind } as NostrEvent)
      );

      (mockNIP90Service.subscribeToJobUpdates as ReturnType<typeof vi.fn>).mockImplementation(
        (_jobRequestEventId, _dvmPubkeyHex, _decryptionKey, onUpdateCallback) => {
          process.nextTick(() => {
            onUpdateCallback({
              id: "feedback1", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000,
              tags: [["status", "partial"]], content: "First", sig: "sig1", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCallback({
              id: "feedback2", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000 + 1,
              tags: [["status", "partial"]], content: "Second", sig: "sig2", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCallback({
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
  });
});

```

This completes the application of the fixes from "Instruction Set 6" and addresses the failing unit test. The key changes involved:

-   Correcting mock implementations to return `Effect`s.
-   Ensuring `Effect.provide` is used correctly.
-   Completing mock objects with all necessary methods.
-   Refining the `subscribeToJobUpdates` mock in the unit test to accurately simulate the DVM's behavior and trigger the SUT's internal callbacks.
-   Fixing type mismatches for NIP-90 inputs and secret keys.
-   Addressing `null` or `undefined` possibilities for job results.
-   Simplifying the dynamic layer building in `ChatOrchestratorService` to use the active `AgentLanguageModel` for now, which resolves the complex `Layer` type errors.
-   Using `Schema` from `effect` instead of `@effect/schema`.

After these, a `pnpm t` should yield better results. Further iterations might be needed if new errors surface or if tests reveal deeper logic issues.
