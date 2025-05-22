Here are specific instructions to fix the TypeScript errors and failing tests:

**I. TypeScript Error Fixes**

1.  **File:** `src/hooks/useConfigurationService.ts`
    *   **Instruction (Line 12):** Change `const service = runtime.get(ConfigurationService);`
        to `const service = runtime.context.get(ConfigurationService);`.
        Add `Runtime` to the import from `effect/Runtime` if not already present: `import { Runtime } from "effect/Runtime";` and type `runtime` as `Runtime.Runtime<FullAppContext>`.

2.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   **Instruction (Line 11 & 14):** Verify `@effect/ai` version `^0.2.0` exports `Provider` and `AiPlan`.
        If not, check the `node_modules/@effect/ai/dist/dts/index.d.ts` file for correct export names or namespaces.
        The type `Provider` is often inferred from `Effect.Effect.Success<typeof AiModel>`. `AiPlan` should be a direct export.
        If errors persist, ensure `@effect/ai` is correctly installed and consider that `Provider` might be `import type { Provider as AiProvider } from "@effect/ai";` as used, but `AiPlan` might be missing due to version/export issues.
        *Self-correction: The error log indicates these are not exported. Change the import for `Provider` to `import type { Provider as AiProviderType } from "@effect/ai/AiModel";` (or similar, based on actual `@effect/ai` structure for the `Provider` type if it's distinct from `AiModel`'s success type). For `AiPlan`, ensure it's exported from `@effect/ai` or `@effect/ai/AiPlan`.*
        **Update:** Given the problem, `AiPlan` is indeed exported from `@effect/ai`. The `Provider` type is more nuanced. The file uses `import { AiPlan, Provider as AiProvider } from "@effect/ai";`. If `Provider` isn't exported, it's likely meant to be `Effect.Effect.Success<AiModel<S, R>>`. For now, focus on the errors we can fix.
        *   **Instruction (Line 11 & 14):** Ensure `@effect/ai` is installed correctly. If `Provider` is not exported, alias `Effect.Effect.Success<AiModel<AgentLanguageModel, any>>` as `AiProviderType` for the `getResolvedAiModelProvider` return. `AiPlan` should be directly importable. If not, there's an issue with the `@effect/ai` package version or installation.

    *   **Instruction (Line 54 - `Schedule.compose` error):** The `while` predicate in `AiPlan.make` expects a function `(error: E) => boolean`. The `schedule` parameter takes a `Schedule<any, any, any>`. The TS error implies an issue with the `Schedule.recurs(N).pipe(Schedule.compose(Schedule.exponential("100 millis").pipe(Schedule.jittered)))` structure or its inferred types.
        Change the schedule composition to ensure the types align. A common pattern is `Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(X)))`.
        Simplify the schedule for now: `schedule: Schedule.exponential("100 millis").pipe(Schedule.jittered, Schedule.recurs(pConfig.key === preferredProvider.key ? 2 : 0))`
        The root cause is likely the type of `self` in your `Schedule.compose` argument, which is too generic. The `while` predicate expects `AIProviderError | AIConfigurationError`.
        The error indicates `Schedule<Duration, unknown, never>` vs `never`. The `while` predicate should not be part of the `Schedule` itself but a separate parameter to `AiPlan.make`'s step.
        **Revised Instruction (Line 54-59):** The `while` predicate in the plan step is for retrying the *model call*. The `schedule` is for *how often* to retry. Ensure `while` receives the correct error type and `schedule` is a valid `Schedule` instance.
        ```typescript
        // Ensure 'while' predicate type is correct
        while: (err: AIProviderError | AIConfigurationError): boolean => // Explicitly type err
          pConfig.key === preferredProvider.key &&
          err._tag === "AIProviderError" && // Check tag before accessing specific properties
          (err as AIProviderError).isRetryable === true // Cast after type guard
        ```

    *   **Instruction (Line 56 - `isRetryable`):** In the `while` predicate, check `err._tag` before accessing `isRetryable`.
        ```typescript
        while: (err: AIProviderError | AIConfigurationError) => {
          if (err._tag === "AIProviderError") {
            return err.isRetryable === true || /* other retryable conditions */;
          }
          return false; // AIConfigurationError is not retryable by this logic
        }
        ```

    *   **Instruction (Line 67 - `builtPlan` unknown):** Add a type hint or ensure `plan` is correctly typed.
        `const builtPlan = yield* _(plan) as AiProvider.Provider<AgentLanguageModel>;`
        Or, ensure `plan` is typed as `AiPlan.AiPlan<AIProviderError | AIConfigurationError, AgentLanguageModel, any>`.

3.  **File:** `src/stores/ai/agentChatStore.ts`
    *   **Instruction (Line 73):** The `createJSONStorage` function should correctly handle the `localStorage` potentially being undefined in non-browser environments (like Vitest's Node.js environment by default).
        Change: `storage: createJSONStorage(() => localStorage),`
        To: `storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : undefined)),`
        (This assumes your `agentChatStore.ts` file itself is not modified if the provided snippet is up-to-date).

4.  **File:** `src/tests/integration/services/nip90/NIP90AgentLanguageModelLive.integration.test.ts`
    *   **Instruction (Line 83 - `logEvent`):** Change `logEvent` to `trackEvent` in `mockTelemetryService`.
        ```typescript
        mockTelemetryService = {
          trackEvent: vi.fn().mockImplementation(() => Effect.void), // Changed logEvent to trackEvent
          isEnabled: vi.fn(() => Effect.succeed(true)),
          setEnabled: vi.fn((_enabled: boolean) => Effect.void),
        };
        ```
    *   **Instruction (Line 87 - Layer type mismatch):**
        The `testLayer` in `NIP90AgentLanguageModelLive.integration.test.ts` needs to provide all dependencies for `NIP90AgentLanguageModelLive`. This includes `NIP90ProviderConfigTag`, `NIP90Service.Tag`, `NostrService.Tag`, `NIP04Service.Tag`, and `TelemetryService.Tag`.
        Ensure `testLayer` is constructed like this:
        ```typescript
        testLayer = NIP90AgentLanguageModelLive.pipe(
          Layer.provide(Layer.succeed(NIP90ProviderConfigTag, mockConfig)),
          Layer.provide(Layer.succeed(NIP90Service, mockNIP90Service)),
          Layer.provide(Layer.succeed(NostrService, mockNostrService)),
          Layer.provide(Layer.succeed(NIP04Service, mockNIP04Service)),
          Layer.provide(Layer.succeed(TelemetryService, mockTelemetryService))
        ) as Layer.Layer<AgentLanguageModel, never, never>; // Assert R to never if all deps are met
        ```
        Also, ensure `mockConfig` (defined around line 11) includes `isEnabled: true`.

**II. Failing Test Fixes**

**File:** `src/tests/unit/services/ai/providers/nip90/NIP90AgentLanguageModelLive.test.ts`
The error `TypeError: params.onFeedback is not a function` indicates the mock for `nip90Service.subscribeToJobUpdates` is incorrect. `NIP90AgentLanguageModelLive` passes an `onUpdate` callback.

*   **Instruction:** Revise the mock implementation of `mockNIP90Service.subscribeToJobUpdates` in this unit test file.
    ```typescript
    // Inside beforeEach or the specific test:
    (mockNIP90Service.subscribeToJobUpdates as ReturnType<typeof vi.fn>).mockImplementation(
      (jobRequestEventId, dvmPubkeyHex, decryptionKey, onUpdateCallbackFromSUT) => {
        // Simulate DVM emitting events by calling the onUpdateCallbackFromSUT
        // Example for "should handle streaming text generation":
        if (jobRequestEventId === "job-stream-123") { // Match specific test if needed
          process.nextTick(() => {
            onUpdateCallbackFromSUT({
              id: "feedback1", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000,
              tags: [["status", "partial"]], content: "First", sig: "sig1", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCallbackFromSUT({
              id: "feedback2", kind: 7000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000 + 1,
              tags: [["status", "partial"]], content: "Second", sig: "sig2", status: "partial" as NIP90JobFeedbackStatus
            } as NIP90JobFeedback);
          });
          process.nextTick(() => {
            onUpdateCallbackFromSUT({
              id: "result1", kind: mockConfig.requestKind + 1000, pubkey: mockConfig.dvmPubkey, created_at: Date.now() / 1000 + 2,
              tags: [], content: "Final", sig: "sig3"
            } as NIP90JobResult); // This should trigger emit.end() in the SUT
          });
        }
        return Effect.succeed({ unsub: vi.fn() });
      }
    );
    // Ensure createJobRequest is also mocked for streamText tests:
    (mockNIP90Service.createJobRequest as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Effect.succeed({ id: "job-stream-123", /* other necessary NostrEvent fields */ } as NostrEvent)
    );
    ```
    Adjust the simulated events for other test cases (`should handle streaming errors`, `should handle normal completion`) accordingly. For errors, simulate an error status feedback. For normal completion, ensure a result event (kind 6xxx) is sent.

This approach ensures the mock correctly interacts with the callback system of `NIP90AgentLanguageModelLive`.
