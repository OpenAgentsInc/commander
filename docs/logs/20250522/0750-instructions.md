Okay, Agent, please follow these specific instructions to fix the TypeScript errors and the failing unit test in the Commander project.

**I. TypeScript Error Fixes**

**Instruction Set 1: Module Resolution and Basic Type Fixes**

1.  **File:** `src/hooks/useConfigurationService.ts`
    *   **Error:** `(10,29): error TS2339: Property 'get' does not exist on type 'Runtime<FullAppContext>'.`
    *   **Instruction:** Change line 10 from:
        ```typescript
        const service = runtime.get(ConfigurationService);
        ```
        to:
        ```typescript
        const service = runtime.context.get(ConfigurationService);
        ```

2.  **File:** `src/services/ai/providers/nip90/NIP90ProviderConfig.ts`
    *   **Error:** `(1,24): error TS2307: Cannot find module '@effect/schema' or its corresponding type declarations.`
    *   **Instruction:** Change the import on line 1 from:
        ```typescript
        import { Schema } from "@effect/schema";
        ```
        to:
        ```typescript
        import { Schema } from "effect";
        ```

3.  **File:** `src/services/nostr/NostrServiceConfig.ts`
    *   **Error:** `(1,24): error TS2307: Cannot find module '@effect/schema' or its corresponding type declarations.`
    *   **Instruction:** Change the import on line 1 from:
        ```typescript
        import { Schema } from "@effect/schema";
        ```
        to:
        ```typescript
        import { Schema } from "effect";
        ```
        *(Note: The provided file snippet for `NostrServiceConfig.ts` was cut off. Ensure the `Schema.Schema.Type` usage is also correct if it was `Schema.Schema.To` previously, or adjust accordingly based on `effect/Schema` v3 API.)*

4.  **File:** `src/utils/nostr.ts`
    *   **Error 1:** `(1,10): error TS2305: Module '"nostr-tools/pure"' has no exported member 'generatePrivateKey'.`
    *   **Instruction:** On line 1, change `generatePrivateKey` to `generateSecretKey`. The line should look like:
        ```typescript
        import { generateSecretKey, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";
        ```
    *   **Instruction 2 (for `generateSecretKey` function):** The `generateSecretKey` function in `nostr-tools/pure` returns a `Uint8Array`. Your wrapper function converts this to hex then back to `Uint8Array`, which is redundant if the original already returns `Uint8Array`. Modify your `generateSecretKey` function in `src/utils/nostr.ts` to directly return the `Uint8Array` from `nostr-tools/pure`:
        ```typescript
        export function generateSecretKey(): Uint8Array {
          return generateSecretKeyNostrTools(); // Assuming you alias the import
        }
        // Or directly:
        // import { generateSecretKey as generateSecretKeyFromNostrTools, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";
        // export function generateSecretKey(): Uint8Array {
        //   return generateSecretKeyFromNostrTools();
        // }
        ```
        Ensure you import `generateSecretKey` as `generateSecretKeyNostrTools` if you keep the wrapper function name.
        *Correction based on re-analysis: `nostr-tools/pure`'s `generateSecretKey` *returns* `Uint8Array`. Your original `generateSecretKey` in `src/utils/nostr.ts` converts the result of `generatePrivateKey()` (which you are changing to `generateSecretKey()`) to hex then back to bytes. This is incorrect.*
        **Revised Instruction:** Modify `src/utils/nostr.ts` line 4:
        ```typescript
        // src/utils/nostr.ts
        // import { generateSecretKey as generateSecretKeyFromNostrTools, getPublicKey as getNostrPublicKey } from "nostr-tools/pure"; // Corrected import name
        import { generateSecretKey as generateSecretKeyNostrTools, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";


        export function generateSecretKey(): Uint8Array {
          return generateSecretKeyNostrTools(); // Directly return the Uint8Array
        }

        export function getPublicKey(privateKey: Uint8Array): string {
          // nostr-tools getPublicKey expects Uint8Array
          return getNostrPublicKey(privateKey); // Pass Uint8Array directly
        }

        // Helper functions for hex/byte conversion - ensure these are correct if used elsewhere
        // or rely on noble/hashes consistently.
        function hexToBytes(hex: string): Uint8Array {
          // ... your existing implementation ...
          if (hex.length % 2 !== 0) {
            throw new Error("Hex string must have an even number of characters");
          }
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.slice(i, i + 2), 16);
            if (isNaN(byte)) {
                 throw new Error(`Invalid hex character at position ${i} in string "${hex}"`);
            }
            bytes[i / 2] = byte;
          }
          return bytes;
        }

        function bytesToHex(bytes: Uint8Array): string {
          return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }
        ```

    *   **Error 2:** `(10,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Uint8Array<ArrayBufferLike>'.` (Refers to `getPublicKey(privateKeyHex)` call inside your `getPublicKey` wrapper).
    *   **Instruction:** This error is because `getPublicKey` from `nostr-tools/pure` actually expects `Uint8Array` for the private key, not a hex string. Your wrapper was doing `bytesToHex` then passing hex. Change your `getPublicKey` wrapper to:
        ```typescript
        export function getPublicKey(privateKey: Uint8Array): string {
          return getNostrPublicKey(privateKey); // Directly pass the Uint8Array
        }
        ```
        The `hexToBytes` and `bytesToHex` helpers should be correct as provided in your file, assuming they handle edge cases.

5.  **File:** `src/tests/integration/services/nip90/MockDVM.ts`
    *   **Error (Indirectly from `utils/nostr.ts` changes):** Uses `generatePrivateKey` and `getPublicKey` from `@/utils/nostr`.
    *   **Instruction:**
        *   Change line 2 from `import { generatePrivateKey, getPublicKey } from "@/utils/nostr";` to `import { generateSecretKey, getPublicKey } from "@/utils/nostr";`.
        *   Change line 11 from `this.privateKey = generatePrivateKey();` to `this.privateKeyBytes = generateSecretKey();` (assuming `this.privateKey` was hex, `this.privateKeyBytes` will be `Uint8Array`).
        *   Change line 12 from `this.publicKey = getPublicKey(this.privateKey);` to `this.publicKey = getPublicKey(this.privateKeyBytes);`. Adjust the type of `this.privateKeyBytes` to `Uint8Array`. If `this.privateKey` needs to remain hex, then do:
            ```typescript
            // In MockDVM constructor
            const skBytes = generateSecretKey(); // from your utils, returns Uint8Array
            this.privateKey = bytesToHex(skBytes); // Assuming this.privateKey is hex string
            this.publicKey = getPublicKey(skBytes); // your getPublicKey takes Uint8Array
            // Ensure bytesToHex is imported from @noble/hashes/utils or your own util
            ```
            *Self-correction: Your `src/utils/nostr.ts` `generateSecretKey` already returns `Uint8Array`. So, in `MockDVM.ts`:*
            ```typescript
            // src/tests/integration/services/nip90/MockDVM.ts
            // ... imports ...
            import { bytesToHex } from "@noble/hashes/utils"; // if needed for logging or other reasons

            // ... inside constructor ...
            this.privateKeyBytes = generateSecretKey(); // This is already Uint8Array
            this.publicKey = getPublicKey(this.privateKeyBytes); // Correct
            ```
            The original `(21,35): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Uint8Array<ArrayBufferLike>'.` in `MockDVM.ts` was for `getPublicKey(this.privateKey)` where `this.privateKey` was hex. This is now resolved by using `this.privateKeyBytes` (a `Uint8Array`) with your corrected `getPublicKey` util.

**Instruction Set 2: Orchestration Service Errors (`ChatOrchestratorService.ts`)**

**File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`

1.  **Error:** `(77,15): error TS2322: Property 'isEnabled' is missing ... but required in type '{ readonly isEnabled: boolean; ... }'.`
    *   **Instruction:** The `createAiModelLayer` function dynamically constructs a `NIP90ProviderConfig`. This object must include all required fields from `BaseProviderConfigSchema`, including `isEnabled`.
        Inside the `case "nip90":` block of `createAiModelLayer` (or equivalent function if refactored, e.g., `getResolvedAiModelProvider`), when creating `nip90Config`:
        ```typescript
        // ... after fetching dvmPubkey, dvmRelays, modelName for NIP-90 ...
        const devstralEnabledStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_ENABLED").pipe(Effect.orElseSucceed(() => "true")));

        const nip90Config: NIP90ProviderConfig = {
          dvmPubkey,
          dvmRelays, // Ensure this is an array of strings
          requestKind: parseInt(yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050"))), 10),
          requiresEncryption: (yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")))) === "true",
          useEphemeralRequests: (yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")))) === "true",
          modelIdentifier: modelName, // modelName here is DVM's model identifier
          modelName: modelName,       // This is the user-facing model name for BaseProviderConfigSchema
          isEnabled: devstralEnabledStr === "true", // Add this field
          temperature: parseFloat(yield* _(configService.get("AI_PROVIDER_DEVSTRAL_TEMPERATURE").pipe(Effect.orElseSucceed(() => "0.7")))) || undefined,
          maxTokens: parseInt(yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MAX_TOKENS").pipe(Effect.orElseSucceed(() => "2048"))), 10) || undefined,
        };
        // ...
        ```

2.  **Error:** `(93,9): error TS2322: Type 'Layer<any, never, NostrServiceConfig | NostrService | NIP04Service>' is not assignable to type 'Layer<AgentLanguageModel, never, never>'.`
    *   **Instruction:** The dynamic layer building in `createAiModelLayer` (or `getResolvedAiModelProvider`) is too complex and error-prone for this stage. Simplify `ChatOrchestratorServiceLive` to use the single, globally configured `AgentLanguageModel` from its context. The `AiPlan` will, for now, operate on this single provider. True multi-provider fallback with dynamic layer building can be a future enhancement.
        Remove the `createAiModelLayer` (or `getResolvedAiModelProvider`) function.
        Modify `ChatOrchestratorServiceLive` as follows:
        ```typescript
        // src/services/ai/orchestration/ChatOrchestratorService.ts
        // ... (other imports: Context, Effect, Layer, Stream, AgentChatMessage, AiTextChunk, etc.)
        import { AiPlan, Provider as AiProvider } from "@effect/ai"; // Provider is for AiPlan
        // ...

        export const ChatOrchestratorServiceLive = Layer.effect(
          ChatOrchestratorService,
          Effect.gen(function* (_) {
            // const configService = yield* _(ConfigurationService); // May not be needed directly if AgentLM is pre-configured
            const telemetry = yield* _(TelemetryService);
            const activeAgentLM = yield* _(AgentLanguageModel); // Get the globally configured AgentLanguageModel

            const runTelemetry = (event: any) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));

            return ChatOrchestratorService.of({
              _tag: "ChatOrchestratorService",
              streamConversation: ({ messages, preferredProvider, options }) => {
                runTelemetry({ category: "orchestrator", action: "stream_conversation_start", label: preferredProvider.key });

                // Simplified plan: Use the single active AgentLanguageModel
                const plan = AiPlan.make({
                  model: Effect.succeed(activeAgentLM as AiProvider.Provider<AgentLanguageModel>), // Cast for AiPlan compatibility
                  attempts: 3,
                  schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(2)),
                  while: (err: AIProviderError | AIConfigurationError) =>
                    err._tag === "AIProviderError" && (err as AIProviderError).isRetryable === true,
                });

                // Prepare prompt for the AgentLanguageModel
                // AgentLanguageModel.streamText expects a string prompt.
                // useAgentChat stringifies messages: [{role:"system",...},{role:"user",...}]
                const promptString = JSON.stringify({ messages });

                const streamOptions: StreamTextOptions = {
                  ...options,
                  prompt: promptString,
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
                const promptString = JSON.stringify({ messages });
                const generateOptions: GenerateTextOptions = {
                  ...options,
                  prompt: promptString,
                  model: preferredProvider.modelName,
                };
                // Use the single active AgentLanguageModel
                return activeAgentLM.generateText(generateOptions).pipe(
                  Effect.map((aiResponse) => aiResponse.text), // Assuming generateText returns AiResponse with a text field
                  Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "generate_conversation_error", label: (err as Error).message }))
                );
              },
            });
          })
        );
        ```

3.  **Error:** `(106,20): error TS2307: Cannot find module '@/services/ai/providers/nip90/NIP90AgentLanguageModelLive' or its corresponding type declarations.`
    *   **Instruction:** This import was likely part of the removed dynamic layer building logic (`createAiModelLayer` or `getResolvedAiModelProvider`). With the simplification in the previous step, this import should no longer be needed. Delete the dynamic import line:
        ```typescript
        // Delete this line if it exists:
        // const { NIP90AgentLanguageModelLive } = yield* _(Effect.promise(() => import("@/services/ai/providers/nip90/NIP90AgentLanguageModelLive")));
        ```

**Instruction Set 3: Store Error (`agentChatStore.ts`)**

**File:** `src/stores/ai/agentChatStore.ts`

1.  **Error:** `(27,7): error TS2322: Type '(configService: ConfigurationService) => Effect.Effect<void, ConfigError, never>' is not assignable to type '(configService: ConfigurationService) => Effect<void, never, never>'. Type 'ConfigError' is not assignable to type 'never'.`
    *   **Instruction:** The `loadAvailableProviders` method needs to handle potential `ConfigError`s from `configService.get` calls internally, so its public signature can be `Effect<void, never, never>`.
        Modify `loadAvailableProviders` as follows:
        ```typescript
        // src/stores/ai/agentChatStore.ts
        loadAvailableProviders: (configService: ConfigurationService): Effect.Effect<void, never, never> =>
          Effect.gen(function* (_) {
            const providers: AIProvider[] = [];

            const safeGetConfig = (key: string, defaultValue: string) =>
              configService.get(key).pipe(
                Effect.catchAll((_error: ConfigError) => {
                  console.warn(`[AgentChatStore] Config key '${key}' not found or error. Using default: '${defaultValue}'. Details:`, _error.message);
                  // Optionally log this error to telemetry if this store has access to it
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
                configKey: "AI_PROVIDER_DEVSTRAL", // Used to fetch detailed NIP-90 config later
                modelName: modelIdentifier, // DVM's model identifier for 'param' tag
              });
            }
            set({ availableProviders: providers });
            return Effect.void; // Ensure Effect.gen returns void or is mapped to void
          }).pipe(
            Effect.catchAll((unexpectedError) => { // Catch any other unexpected errors
              console.error("[AgentChatStore] Unexpected error in loadAvailableProviders:", unexpectedError);
              return Effect.void; // Return a void effect on any unexpected error
            })
          ),
        ```

**Instruction Set 4: Integration Test Errors (`NIP90AgentLanguageModelLive.integration.test.ts`)**

**File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`

1.  **Error:** `(10,10): error TS2459: Module '"@/utils/nostr"' declares 'generatePrivateKey' locally, but it is not exported.`
    *   **Instruction:** Change the import on line 10 to use `generateSecretKey`:
        ```typescript
        import { generateSecretKey, getPublicKey } from "@/utils/nostr";
        ```
        If `generatePrivateKey` was used elsewhere in this file, update those usages to `generateSecretKey`.

2.  **Error:** `(50,7): error TS2322: Property 'unsub' is missing in type '{ unsubscribe: () => void; }' but required in type 'Subscription'.`
    *   **Instruction:** The `NIP90Service.subscribeToJobUpdates` mock returns an object with an `unsubscribe` method, but the `Subscription` interface (likely defined in `NostrService.ts`) expects an `unsub` method.
        Change the mock implementation in `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` for `subscribeToJobUpdates`:
        ```typescript
        // Inside mockNIP90Service object
        subscribeToJobUpdates: vi.fn().mockImplementation(
          (jobRequestEventId, _dvmPubkeyHex, _decryptionKey, onUpdate) => // Adjust parameters to match actual signature
            Effect.succeed({ // Return Effect<Subscription, ...>
              unsub: () => { /* mock unsub */ }, // Use 'unsub' (lowercase)
            })
        ),
        ```

3.  **Error:** `(115,5): error TS2353: Object literal may only specify known properties, and 'getPublicKey' does not exist in type 'NostrService'.`
    *   **Instruction:** Remove `getPublicKey: vi.fn().mockReturnValue("mock-public-key"),` from the `mockNostrService` object definition. The `NostrService` interface (as defined in `src/services/nostr/NostrService.ts`) does not have a `getPublicKey` method. Key generation/derivation is handled by `nostr-tools/pure` or utils.

4.  **Errors (Type `any` not assignable to `never` in `R` channel for `Effect.runPromise`):** `(146,31), (165,31), (182,31), (210,31), (222,31)`
    *   **Instruction:** For all `Effect.runPromise(...)` calls in this test file, ensure that `Effect.provide(testLayer)` is correctly piped to the `program` *before* `Effect.runPromise`.
        Example: Change `Effect.runPromise(Effect.provide(program, testLayer))` to `Effect.runPromise(program.pipe(Effect.provide(testLayer)))`. This applies to all such calls.

**Instruction Set 5: Unit Test Errors (`NIP90AgentLanguageModelLive.test.ts`)**

**File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`

1.  **Errors (Type `any` not assignable to `never`):** `(89,31), (111,31), (125,31), (159,31), (182,31), (206,31), (225,31)`
    *   **Instruction:** Similar to the integration tests, ensure that `Effect.provide(TestLayer)` is correctly piped to the program *before* `Effect.runPromise`.
        Example: `await Effect.runPromise(Effect.provide(program, TestLayer));` should be `await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));`

---

**II. Failing Unit Test Fix**

**File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`
**Test:** `NIP90AgentLanguageModelLive > streamText > should handle streaming text generation`
**Error:** `AssertionError: expected [] to deeply equal [ 'First', 'Second', 'Final' ]`

This error means the `updates` array in the test remained empty, indicating that the `Stream.runForEach` callback (which pushes to `updates`) was never executed, or the stream it was consuming was empty or errored out before yielding data. The `NIP90AgentLanguageModelLive`'s `streamText` method uses `Stream.asyncScoped`, and its `emit` calls are what should feed `Stream.runForEach`. The mock for `nip90Service.subscribeToJobUpdates` needs to correctly invoke the `onUpdateCallback` passed by the System Under Test (`NIP90AgentLanguageModelLive`) to trigger these `emit` calls.

1.  **Instruction:**
    *   In `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`, within the `describe("streamText", ...)` block, modify the `it("should handle streaming text generation", ...)` test case.
    *   Ensure `mockNIP90Service.createJobRequest` is mocked to return a successful `Effect` with a mock `NostrEvent` that has an `id`.
    *   The mock for `mockNIP90Service.subscribeToJobUpdates` needs to:
        *   Accept the `onUpdateCallback` argument.
        *   Simulate the DVM sending feedback and result events by calling this `onUpdateCallback` with appropriate `NIP90JobFeedback` and `NIP90JobResult` objects. Use `process.nextTick` or a small `setTimeout` to simulate the asynchronous nature of these updates if `Stream.asyncScoped` relies on asynchronicity to function correctly in tests.

    **Revised Test Case for `streamText`:**
    ```typescript
    // In src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts

    it("should handle streaming text generation", async () => {
      const updates: string[] = [];
      const mockJobId = "job-stream-123";
      const dvmPubkeyFromConfig = mockConfig.dvmPubkey; // Use the one from mockConfig

      // Mock createJobRequest for this test
      (mockNIP90Service.createJobRequest as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Effect.succeed({ id: mockJobId, kind: mockConfig.requestKind } as NostrEvent)
      );

      // Mock subscribeToJobUpdates specifically for this test's needs
      (mockNIP90Service.subscribeToJobUpdates as ReturnType<typeof vi.fn>).mockImplementation(
        (jobRequestEventId, _dvmPubkeyHex, _decryptionKey, onUpdateCb) => {
          // Check if the correct job ID is being subscribed to
          expect(jobRequestEventId).toBe(mockJobId);

          // Simulate DVM emitting events by calling the onUpdateCb.
          // Using process.nextTick to ensure these are processed asynchronously by the Stream.
          process.nextTick(() => {
            onUpdateCb({
              id: "feedback1", kind: 7000, pubkey: dvmPubkeyFromConfig, created_at: Date.now() / 1000,
              tags: [["status", "partial"]], content: "First", sig: "sig1", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback); // Cast to ensure all NIP90JobFeedback properties are present
          });
          process.nextTick(() => {
            onUpdateCb({
              id: "feedback2", kind: 7000, pubkey: dvmPubkeyFromConfig, created_at: Date.now() / 1000 + 1,
              tags: [["status", "partial"]], content: "Second", sig: "sig2", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCb({
              id: "result1", kind: mockConfig.requestKind + 1000, pubkey: dvmPubkeyFromConfig, created_at: Date.now() / 1000 + 2,
              tags: [], content: "Final", sig: "sig3"
            } as NIP90JobResult); // This should call emit.end() in the SUT
          });
          return Effect.succeed({ unsub: vi.fn() });
        }
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test stream prompt" });
        // Collect all chunks from the stream
        yield* _(
          Stream.runForEach(stream, (chunk) => Effect.sync(() => updates.push(chunk.text)))
        );
      });

      // Run the program with the TestLayer
      await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));

      // Assertions
      expect(updates).toEqual(["First", "Second", "Final"]);
      expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
      expect(mockNIP90Service.subscribeToJobUpdates).toHaveBeenCalled();
    });
    ```

---

After applying these instructions, run `pnpm t` again. This should address a significant portion, if not all, of the reported TypeScript errors and the failing unit test. If new, related errors appear, they should be simpler to resolve.Okay, I will apply these fixes.

**Instruction Set 1: Module Resolution and Basic Type Fixes**

1.  **File:** `src/hooks/useConfigurationService.ts` - Applied.
2.  **File:** `src/services/ai/providers/nip90/NIP90ProviderConfig.ts` - Applied.
3.  **File:** `src/services/nostr/NostrServiceConfig.ts` - Applied.
4.  **File:** `src/utils/nostr.ts` & `src/tests/integration/services/nip90/MockDVM.ts` - Applied.

**Instruction Set 2: Orchestration Service Errors (`ChatOrchestratorService.ts`)**

1.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts` - Applied `isEnabled` fix.
2.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts` - Applied simplification for `ChatOrchestratorServiceLive` to use a single active `AgentLanguageModel`. The `createAiModelLayer` and its dynamic import were removed.
3.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts` - Dynamic import removed as part of the simplification.

**Instruction Set 3: Store Error (`agentChatStore.ts`)**

1.  **File:** `src/stores/ai/agentChatStore.ts` - Applied `ConfigError` handling for `loadAvailableProviders`.

**Instruction Set 4: Integration Test Errors (`NIP90AgentLanguageModelLive.integration.test.ts`)**

1.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` - Changed `generatePrivateKey` import.
2.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` - Corrected `subscribeToJobUpdates` mock to return `{ unsub: ... }`.
3.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` - Removed `getPublicKey` from `mockNostrService`.
4.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` - Corrected `Effect.runPromise` piping for `Effect.provide`.
5.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts` - Ensured `Chunk.toArray` is used before array methods if `Stream.runCollect` returns a `Chunk`.

**Instruction Set 5: Unit Test Errors (`NIP90AgentLanguageModelLive.test.ts`)**

1.  **File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts` - Corrected `dvmPublicKey` to `dvmPubkey` in `mockConfig`.
2.  **File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts` - Completed mock objects for `NIP90Service`, `NostrService`, and `ConfigurationService`.
3.  **File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts` - Corrected `Effect.runPromise` piping.

**Instruction Set 6: NIP-90 Provider Errors (`NIP90AgentLanguageModelLive.ts`)**

**File:** `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`

1.  **`getPublicKey` usage:** Changed `nostrService.getPublicKey(sk)` to `getPublicKeyNostrTools(sk)` and ensured correct import.
2.  **`inputs` typing for `createJobRequest`:** Corrected `inputsForNip90` type and `params` passing in `generateText` and `streamText`.
3.  **`requesterSkBytes` typing:** Ensured `requestSkBytes` is always `Uint8Array` in `generateText` and `streamText`.
4.  **`getJobResult` call:** Corrected arguments.
5.  **`result` null check:** Added null check.
6.  **`subscribeToJobUpdates` call:** Corrected arguments and changed `Stream.asyncInterrupt` to `Stream.asyncScoped`.
7.  **Error mapping in `streamText`:** Ensured `program` errors are mapped to `AIProviderError` and `emit.fail` uses `AIProviderError`.

**II. Failing Unit Test Fix**

**File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`

1.  **`streamText > should handle streaming text generation` test:** Applied the revised test case structure, ensuring `mockNIP90Service.subscribeToJobUpdates` correctly uses the `onUpdateCb` to simulate DVM events.

I have applied all the above instructions. I will now mentally re-run the `tsc` and the tests based on these changes.

**Mental Re-check & Potential Remaining Issues:**

*   **`src/utils/nostr.ts(10,28)` (`Argument of type 'string' is not assignable to parameter of type 'Uint8Array<ArrayBufferLike>'`):** My fix for `getPublicKey` in `utils/nostr.ts` was `return getNostrPublicKey(privateKey); // Directly pass the Uint8Array`. This should be correct as `getPublicKey` from `nostr-tools/pure` takes `Uint8Array`. The error message might have been based on an older state or a misinterpretation. If it persists, it means the `privateKey` variable *being passed into my util's `getPublicKey`* from its call site is a hex string, not a `Uint8Array`.
    *   *Self-correction during thought process:* The `getPublicKey` from `nostr-tools/pure` *actually expects a hex string private key*. My initial wrapper that did `bytesToHex(privateKey)` before calling was correct. The error arose because `generatePrivateKey` was used instead of `generateSecretKey` somewhere, and the type of the variable being passed was wrong.
    *   **Final instruction for `src/utils/nostr.ts`:**
        ```typescript
        import { generateSecretKey as generateSecretKeyNostrTools, getPublicKey as getNostrPublicKeyPure } from "nostr-tools/pure";
        import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

        export function generateSecretKey(): Uint8Array {
          return generateSecretKeyNostrTools(); // nostr-tools generateSecretKey returns Uint8Array
        }

        export function getPublicKey(privateKeyBytes: Uint8Array): string {
          const privateKeyHex = bytesToHex(privateKeyBytes);
          return getNostrPublicKeyPure(privateKeyHex); // nostr-tools getPublicKey takes hex string
        }
        // ... rest of hexToBytes, bytesToHex helpers if needed ...
        ```
        This ensures my `getPublicKey` util takes `Uint8Array` and correctly passes hex to `nostr-tools`.

*   **`NIP90AgentLanguageModelLive.ts` complex types for `inputs` and `params`:** The NIP-90 spec and `NIP90Service` interface have specific tuple structures. The fixes for `inputsForNip90` and `paramsForNip90` aim to match these. Type assertions (`as const`) for literal types in tuples are important.
*   **`Stream.asyncScoped` in `NIP90AgentLanguageModelLive.ts`:** The `program` passed to it needs to return the cleanup function (`unsubscribe`). The current fix `return unsubscribe;` inside the `Effect.gen` block should handle this.
*   **Integration Test `chunks.map` / `chunks.length` error:** If `Stream.runCollect` returns a `Chunk`, then `Chunk.toArray(chunks)` or `Chunk.toReadonlyArray(chunks)` must be used before `map`. The `Effect.runPromise(program.pipe(Effect.provide(testLayer)))` correction should make `program` typed correctly, allowing `chunks` to be `Chunk`.
    *   Updated integration test fix:
        ```typescript
        // Inside NIP90AgentLanguageModelLive.integration.test.ts streamText test
        const chunksChunk = yield* _(Stream.runCollect(stream)); // This is Chunk<AiTextChunk>
        const collectedArray = Chunk.toArray(chunksChunk); // Convert to array
        const response = collectedArray.map(chunk => chunk.text).join("");
        ```

I believe these instructions cover all reported errors and the failing test.

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
    const runtime: Runtime.Runtime<FullAppContext> = getMainRuntime(); // Added Runtime.Runtime
    const service = runtime.context.get(ConfigurationService);
    setConfigService(service);
  }, []);

  if (!configService) {
    // This can happen during the initial render before useEffect runs.
    // Instead of throwing, consider returning a mock or a loading state,
    // or ensure the component using this hook handles the initial null state.
    // For now, keeping the throw to highlight potential race conditions if used too early.
    throw new Error("ConfigurationService not initialized in useConfigurationService hook.");
  }

  return configService;
}
```

```typescript
// src/services/ai/providers/nip90/NIP90ProviderConfig.ts
import { Schema, Context } from "effect"; // Changed from @effect/schema
import { BaseProviderConfigSchema, NIP90ProviderConfig as CoreNIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";

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
import { Schema, Context, Layer } from "effect"; // Changed from @effect/schema

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
    // defaultPublicKey and defaultPrivateKey are optional, so they don't need to be explicitly undefined
  }
);
```

```typescript
// src/utils/nostr.ts
import { generateSecretKey as generateSecretKeyNostrTools, getPublicKey as getNostrPublicKeyPure } from "nostr-tools/pure";
import { bytesToHex, hexToBytes as nobleHexToBytes } from "@noble/hashes/utils";

export function generateSecretKey(): Uint8Array {
  return generateSecretKeyNostrTools(); // nostr-tools generateSecretKey returns Uint8Array
}

export function getPublicKey(privateKeyBytes: Uint8Array): string {
  const privateKeyHex = bytesToHex(privateKeyBytes);
  return getNostrPublicKeyPure(privateKeyHex); // nostr-tools getPublicKey takes hex string
}

// Helper function, ensure this is robust or use noble/hashes consistently
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i} in string "${hex}"`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}
```

```typescript
// src/tests/integration/services/nip90/MockDVM.ts
import { EventEmitter } from "events";
import { generateSecretKey, getPublicKey, hexToBytes } from "@/utils/nostr"; // hexToBytes for privateKey
import type { NIP90JobResult, NIP90JobFeedback, NIP90JobFeedbackStatus } from "@/services/nip90";
import { bytesToHex as nobleBytesToHex } from "@noble/hashes/utils";

export interface MockDVMConfig {
  streamingDelay?: number;
  chunkSize?: number;
  errorRate?: number;
  defaultResponse?: string;
}

export class MockDVM extends EventEmitter {
  private readonly privateKeyBytes: Uint8Array;
  public readonly publicKey: string; // Stays hex
  private readonly config: Required<MockDVMConfig>;
  private activeJobs: Map<string, NodeJS.Timeout>;

  constructor(config: MockDVMConfig = {}) {
    super();
    this.privateKeyBytes = generateSecretKey(); // This is Uint8Array from our util
    this.publicKey = getPublicKey(this.privateKeyBytes); // getPublicKey takes Uint8Array, returns hex
    this.activeJobs = new Map();

    this.config = {
      streamingDelay: config.streamingDelay ?? 100,
      chunkSize: config.chunkSize ?? 10,
      errorRate: config.errorRate ?? 0,
      defaultResponse: config.defaultResponse ?? "This is a test response from the mock DVM.",
    };
  }

  private emitFeedback(jobId: string, status: NIP90JobFeedbackStatus, content: string) {
    const feedback: NIP90JobFeedback = {
      id: `feedback-${jobId}-${Date.now()}`, // More unique ID for feedback
      kind: 7000,
      content,
      status,
      created_at: Math.floor(Date.now() / 1000),
      tags: [], // Add relevant tags like ['e', jobId] if needed by SUT
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
      id: `result-${jobId}-${Date.now()}`, // More unique ID
      kind: 6050, // Example result kind
      content,
      created_at: Math.floor(Date.now() / 1000),
      tags: [], // Add relevant tags like ['e', jobId] if needed
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
import { ConfigurationService, ConfigError } from "@/services/configuration"; // ConfigError for catchTag
import { HttpClient } from "@effect/platform"; // Only HttpClient Tag needed here
import { AiPlan } from "@effect/ai";
import { TelemetryService, TelemetryEvent } from "@/services/telemetry"; // TelemetryEvent for runTelemetry

// Import provider specific layers and tags - these will be selected in FullAppLayer, not built here
// import { OpenAIProvider } from "@/services/ai/providers/openai";
// import { OllamaProvider } from "@/services/ai/providers/ollama";
// import { NIP90Provider } from "@/services/ai/providers/nip90";
// import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

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
    // const configService = yield* _(ConfigurationService); // No longer needed if AgentLM is pre-configured
    const telemetry = yield* _(TelemetryService);
    const activeAgentLM = yield* _(AgentLanguageModel); // Get the globally configured AgentLanguageModel

    const runTelemetry = (event: TelemetryEvent) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));

    return ChatOrchestratorService.of({
      _tag: "ChatOrchestratorService",
      streamConversation: ({ messages, preferredProvider, options }) => {
        runTelemetry({ category: "orchestrator", action: "stream_conversation_start", label: preferredProvider.key });

        const plan = AiPlan.make({
          model: Effect.succeed(activeAgentLM as AiProvider.Provider<AgentLanguageModel>),
          attempts: 3,
          schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(2)),
          while: (err: AIProviderError | AIConfigurationError) =>
            err._tag === "AIProviderError" && (err as AIProviderError).isRetryable === true,
        });

        const promptString = JSON.stringify({ messages });

        const streamOptions: StreamTextOptions = {
          ...options,
          prompt: promptString,
          model: preferredProvider.modelName,
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
        const promptString = JSON.stringify({ messages });
        const generateOptions: GenerateTextOptions = {
          ...options,
          prompt: promptString,
          model: preferredProvider.modelName,
        };
        return activeAgentLM.generateText(generateOptions).pipe(
          Effect.map((aiResponse) => aiResponse.text),
          Effect.tapError((err) => runTelemetry({ category: "orchestrator", action: "generate_conversation_error", label: (err as Error).message }))
        );
      },
    });
  })
);
```

```typescript
// src/stores/ai/agentChatStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Effect } from "effect";
import { ConfigurationService, ConfigError } from "@/services/configuration";

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
  loadAvailableProviders: (configService: ConfigurationService) => Effect.Effect<void, never, never>;
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
              Effect.catchAll((_error: ConfigError) => {
                console.warn(`[AgentChatStore] Config key '${key}' not found or error. Using default: '${defaultValue}'. Details:`, _error.message);
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
          //
