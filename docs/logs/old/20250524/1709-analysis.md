Okay, I understand the issue. The core problem is that when a NIP-90 job request is made (e.g., for a "devstral" model), the system might interact with a DVM that _responds_ (e.g., with a payment request) but ultimately _cannot fulfill_ the request because it lacks the specific model. This can happen if the DVM doesn't check its capabilities before requesting payment, or if the client is configured to target a DVM that is not the best fit (like a local DVM being asked to run a model it doesn't have).

We need to:

1.  Make DVMs smarter about only accepting jobs they can handle (Provider-side).
2.  Make the NIP-90 client logic more discerning about which DVM responses to act upon, especially if multiple DVMs could potentially respond to a request (Client-side).
3.  Ensure client-side error handling allows higher-level services (like `ChatOrchestratorService` with `AiPlan`) to try fallbacks if a chosen DVM fails.

Here are the detailed instructions for the coding agent:

---

**I. Enhance DVM Provider-Side Model Validation (in `src/services/dvm/Kind5050DVMServiceImpl.ts`)**

**Objective:** Ensure the local DVM (when active via "Sell Compute") checks for model availability _before_ requesting payment for a job.

1.  **Modify `processJobRequestInternal`:**

    - Locate the section where job request parameters are parsed (after potential decryption, where `inputsSource`, `inputs`, and `paramsMap` are determined).
    - **Early Model Identification:**
      - Extract the `modelIdentifier` requested by the client. This typically comes from a `["param", "model", "<identifier>"]` tag. If this tag is not present in `paramsMap`, the DVM should assume its default configured model (from `effectiveConfig.defaultTextGenerationJobConfig.model`).
        ```typescript
        const requestedModelIdentifier =
          paramsMap.get("model") ||
          effectiveConfig.defaultTextGenerationJobConfig.model;
        ```
    - **Model Availability Check:**

      - Before proceeding to `spark.createLightningInvoice`, use `agentLanguageModel.generateText` with a very short, inexpensive prompt (e.g., "test availability") targeting the `requestedModelIdentifier`. This acts as a probe.

        ```typescript
        const modelCheckEffect = agentLanguageModel
          .generateText({
            prompt: "availability_check", // A minimal, non-meaningful prompt
            model: requestedModelIdentifier,
            maxTokens: 1, // Request minimal generation
            temperature: 0.0, // Deterministic
          })
          .pipe(
            Effect.as(true), // If successful, model is available
            Effect.catchTag("AiProviderError", (e) => {
              // Check if the error message indicates model not found
              // This depends on how Ollama (or other AgentLanguageModel backends) report this.
              // For Ollama via OllamaAsOpenAIClientLive, a 404 for the model results in AiProviderError
              // with a message like "Ollama API Error: 404 - {\"error\":\"model '...' not found\"}"
              if (
                e.message.toLowerCase().includes("model") &&
                e.message.toLowerCase().includes("not found")
              ) {
                return Effect.succeed(false); // Model not found
              }
              // Other provider errors might still mean the model exists but there's another issue.
              // For simplicity, we'll assume other errors don't mean model unavailability here,
              // but in a production DVM, this error handling would need to be more nuanced.
              // For now, rethrow other errors to let the job fail later if it's not a model_not_found.
              // Or, to be safer, treat any AiProviderError during this check as model unavailable.
              return Effect.succeed(false); // Treat any provider error during check as model unavailable for simplicity
            }),
            Effect.catchAll(() => Effect.succeed(false)), // Catch any other unexpected errors
          );

        const isModelAvailable = yield * _(modelCheckEffect);

        if (!isModelAvailable) {
          const errorMsg = `Model '${requestedModelIdentifier}' not available on this DVM.`;
          yield *
            _(
              telemetry
                .trackEvent({
                  category: "dvm:job_reject",
                  action: "model_not_available",
                  label: jobRequestEvent.id,
                  value: `Requested: ${requestedModelIdentifier}`,
                })
                .pipe(Effect.ignoreLogged),
            );

          const errorFeedback = createNip90FeedbackEvent(
            dvmPrivateKeyHex,
            jobRequestEvent,
            "error",
            errorMsg,
            undefined,
            telemetry,
          );
          yield * _(publishFeedback(errorFeedback));
          // Fail the effect for this job request to stop further processing.
          return (
            yield *
            _(Effect.fail(new DVMJobProcessingError({ message: errorMsg })))
          );
        }
        ```

    - **Conditional Logic:** Only if `isModelAvailable` is true, proceed with invoice generation, adding to `pendingJobs`, and sending "payment-required" feedback.

**II. Ensure Robust Client-Side Error Propagation (in `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`)**

**Objective:** Verify that if a DVM (the one this NIP-90 provider is configured to use) returns a `kind:7000 status:"error"`, this error is correctly propagated up so `AiPlan` can handle it.

1.  **Review `handleEvent` (or equivalent logic in `subscribeToJobUpdates`):**

    - When a `kind:7000` event with `status: "error"` is received:

      - The `NIP90AgentLanguageModelLive`'s `streamText` (or `generateText`) method must signal this failure to its caller (the `ChatOrchestratorService`).
      - This typically means the `Stream` should emit an error, or the `Effect` should fail.
      - **Action:** Ensure that if `feedbackEvent.status === "error"`, the `onUpdate` callback (which might be `processNip90Update` in `useNip90ConsumerChat.ts` or stream emission logic within `NIP90AgentLanguageModelLive` itself) ultimately causes the main stream/Effect to fail with an `AiProviderError`. The error message should incorporate `feedbackEvent.statusExtraInfo` or `feedbackEvent.content`.

      ```typescript
      // Conceptual addition within the onUpdate/event handling logic for kind:7000
      if (feedbackEvent.status === "error") {
        const dvmErrorMessage =
          feedbackEvent.statusExtraInfo ||
          feedbackEvent.content ||
          "DVM reported an unspecified error.";
        // This 'emit.fail' or 'Effect.fail' should propagate to the consumer of streamText/generateText
        // For a Stream:
        // emit.fail(new AiProviderError({ message: `NIP-90 DVM Error: ${dvmErrorMessage}`, provider: "NIP-90", isRetryable: false, context: { dvmPubkey: event.pubkey, originalEvent: event } }));
        // emit.end(); // Important to end the stream
        // For an Effect (if generateText path):
        // return yield* _(Effect.fail(new AiProviderError({ message: `NIP-90 DVM Error: ${dvmErrorMessage}`, provider: "NIP-90", isRetryable: false, context: { dvmPubkey: event.pubkey, originalEvent: event } })));

        // In the current structure of NIP90AgentLanguageModelLive.ts, this means ensuring that if
        // the `onUpdate` callback (e.g., in `useNip90ConsumerChat`) sets an error state, this
        // error state is then converted into a failure of the `Stream` or `Effect` that `streamText`
        // or `generateText` returns.
        // The current streamText implementation uses Stream.asyncInterrupt. The `emit.fail` call within it is the correct place.
        // Ensure the `paymentPromise` reject path or other error paths within `streamText` correctly use `emit.fail`.
      }
      ```

    - **Verify current implementation:** The `streamText` method in `NIP90AgentLanguageModelLive.ts` uses `Stream.asyncInterrupt`. Check the `rejectPaymentPromise` path and other error paths within `waitForPaymentAndResult` to ensure they call `emit.fail(new AiProviderError(...))` when the DVM signals a terminal error.

**III. Correct Default Configuration for "nip90_devstral" Provider**

**Objective:** Ensure the pre-configured "devstral" NIP-90 provider targets the actual Devstral DVM, not the local DVM.

1.  **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    - In `DefaultDevConfigLayer`:
      - Locate the line setting `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY`.
      - **Action:** Update the value from the local DVM's pubkey (`714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827`) to the **actual public key of the remote Devstral service provider.**
        - If the actual Devstral pubkey is `32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245` (as previously hardcoded in `Nip90RequestForm.tsx`), use that.
        - **If the actual Devstral pubkey is unknown, inform the user that this provider example cannot be pre-configured correctly without it, and they should use the "nip90_custom" provider or update this default if they know the key.** For now, if it's unknown, leave it as the local DVM's pubkey but add a prominent comment indicating it should be changed to the real Devstral PK for that provider to work as intended.
        ```typescript
        // Example if actual Devstral PK is known:
        yield *
          _(
            configService.set(
              "AI_PROVIDER_DEVSTRAL_DVM_PUBKEY",
              "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
            ),
          ); // TODO: Verify this is the correct Devstral PK
        // If NOT known, keep existing (local DVM PK) but add:
        // // TODO: Replace with actual remote Devstral DVM pubkey for 'nip90_devstral' provider to function against the real service.
        // // Currently, it points to the local DVM.
        ```

**IV. Client-Side Logic for Handling Multiple DVM Offers (Broadcast Scenario - More Advanced)**

This part addresses the "not assuming the first respondent is worth owning the job" more directly for scenarios where the client broadcasts a job request.

**File:** `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`

1.  **Modify `streamText` (and adapt for `generateText`):**
    - **Check for Broadcast:** If `this.config.dvmPubkey` is `undefined`, `null`, or a wildcard like `"*"` (this needs to be a defined convention for your `NIP90ProviderConfig`).
    - **If Broadcast:**
      1.  **Publish Request:** Publish the NIP-90 job request event _without_ a specific `p` tag targeting a DVM.
      2.  **Listen for Offers:**
          - Subscribe to `kind:7000` events, `"#e": [jobRequestEvent.id]`, from _any author_ on the configured `dvmRelays`.
          - Store incoming "payment-required" feedback events in a temporary list (e.g., `Map<string, NIP90JobFeedback> where key is DVM_pubkey`).
          - Implement a timeout (e.g., 5-10 seconds using `Effect.timeout` on the offer collection part of the stream).
      3.  **Select Best Offer:** After the timeout, or when a sufficiently good offer arrives:
          - Filter offers: Look for DVMs that explicitly state they can handle the `this.config.modelIdentifier` (this is the tricky part, as NIP-90 doesn't mandate this in feedback. Heuristics might be needed, e.g., checking invoice memo, or relying on a trusted DVM list for that model).
          - If multiple suitable offers, pick one (e.g., first valid, cheapest, preferred DVM from a list).
          - If no suitable offer, `emit.fail(new AiProviderError({ message: "No suitable DVM found for model X", ... }))`.
      4.  **Proceed with Selected DVM:**
          - Unsubscribe from the general offer subscription.
          - `chosenDvmPubkey = selectedOffer.pubkey`.
          - Pay the invoice from `selectedOffer`.
          - Subscribe _only_ to `chosenDvmPubkey` for `kind:6xxx` (result) and further `kind:7000` (feedback like "processing", "error", "success") related to the job ID.
          - Continue streaming logic with this specific DVM.
    - **If Targeted (config.dvmPubkey is specific):**
      - Maintain current logic: publish with `p` tag to `config.dvmPubkey`, subscribe only to that `config.dvmPubkey`.
      - Ensure that if this DVM sends `kind:7000 status:"error"` (e.g., "model not found" due to provider-side check from Part I), this error correctly fails the `streamText` / `generateText` Effect/Stream.

**Recommendation:**
Start with Parts I, II, and III. These are critical for correctness even in targeted DVM scenarios and directly address the failure seen in the log.
Part IV is a more significant architectural change for true broadcast/discovery and selection. It can be a follow-up if the simpler fixes aren't sufficient for the user's vision of "working with the entire network." The immediate problem in the log is a misconfiguration and lack of DVM-side model validation.

The instructions below will focus on Parts I, II, and III.

---

**Instructions for the Coding Agent (Focused Version):**

**I. Enhance DVM Provider-Side Model Validation (in `src/services/dvm/Kind5050DVMServiceImpl.ts`)**

1.  **Modify `processJobRequestInternal` function:**

    - After parsing `inputsSource` and determining `paramsMap` and `isRequestEncrypted`:

      - Add:

        ```typescript
        const effectiveConfig = useDVMSettingsStore
          .getState()
          .getEffectiveConfig(); // Get current DVM settings
        const dvmDefaultModel =
          effectiveConfig.defaultTextGenerationJobConfig.model;
        const requestedModelIdentifier =
          paramsMap.get("model") || dvmDefaultModel;

        yield *
          _(
            telemetry
              .trackEvent({
                category: "dvm:job_debug",
                action: "model_identifier_check",
                label: jobRequestEvent.id,
                value: `Requested: ${requestedModelIdentifier}, DVM Default: ${dvmDefaultModel}`,
              })
              .pipe(Effect.ignoreLogged),
          );

        // Use agentLanguageModel to check model availability.
        // This assumes agentLanguageModel is configured to use the DVM's local Ollama.
        const modelCheckEffect = agentLanguageModel
          .generateText({
            prompt: "test", // Short, non-functional prompt
            model: requestedModelIdentifier, // Explicitly test the requested model
            maxTokens: 1,
            temperature: 0.1,
          })
          .pipe(
            Effect.as(true), // Model is available
            Effect.catchTag("AiProviderError", (e) => {
              // Heuristic: if the error message indicates model not found, treat as unavailable.
              const lowerMsg = e.message.toLowerCase();
              if (
                lowerMsg.includes("model") &&
                (lowerMsg.includes("not found") ||
                  lowerMsg.includes("does not exist"))
              ) {
                return Effect.succeed(false);
              }
              // For other AiProviderErrors, it might be a temporary issue not related to model absence.
              // To be safe for now, if it's an AiProviderError, we'll assume model might be an issue.
              // In a more robust system, specific error codes/tags from AgentLanguageModel would be better.
              console.warn(
                `[DVM Model Check] AiProviderError for ${requestedModelIdentifier}, assuming unavailable: ${e.message}`,
              );
              return Effect.succeed(false); // Treat as unavailable
            }),
            Effect.catchAll((otherError) => {
              // Catch any other error during the probe
              console.warn(
                `[DVM Model Check] Unknown error probing ${requestedModelIdentifier}, assuming unavailable:`,
                otherError,
              );
              return Effect.succeed(false);
            }),
          );

        const isModelAvailable = yield * _(modelCheckEffect);

        if (!isModelAvailable) {
          const errorMsg = `Model '${requestedModelIdentifier}' is not available on this DVM.`;
          yield *
            _(
              telemetry
                .trackEvent({
                  category: "dvm:job_reject",
                  action: "model_not_available",
                  label: jobRequestEvent.id,
                  value: `Requested: ${requestedModelIdentifier}`,
                })
                .pipe(Effect.ignoreLogged),
            );

          const errorFeedback = createNip90FeedbackEvent(
            effectiveConfig.dvmPrivateKeyHex, // Use current effective config
            jobRequestEvent,
            "error",
            errorMsg,
            undefined,
            telemetry,
          );
          yield * _(publishFeedback(errorFeedback));
          return (
            yield *
            _(
              Effect.fail(
                new DVMJobProcessingError({
                  message: errorMsg,
                  context: { model: requestedModelIdentifier },
                }),
              ),
            )
          );
        }
        ```

    - This check should occur _before_ `spark.createLightningInvoice` is called.

**II. Client-Side: Ensure `NIP90AgentLanguageModelLive.ts` Propagates DVM Errors Correctly**

1.  **File:** `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`
2.  **Review `streamText` method's error handling, specifically inside `waitForPaymentAndResult` or the `onUpdate` callback passed to `nip90Service.subscribeToJobUpdates`:**

    - When a `NIP90JobFeedback` event with `status: "error"` is received:

      - Ensure `emit.fail(new AiProviderError({ ... }))` is called. The error message should include details from the DVM's feedback (e.g., `feedback.statusExtraInfo` or `feedback.content`).
      - The `isRetryable` flag for this `AiProviderError` should likely be `false` if the DVM indicates a definitive error like "model not found".

    - **Specific Action:** Inside the `onUpdate` callback for `subscribeToJobUpdates`:

      ```typescript
      // Inside the onUpdate callback within streamText or generateText's subscription logic
      if (update._tag === "NIP90JobFeedback" && update.status === "error") {
        const dvmErrorMessage =
          update.statusExtraInfo ||
          update.content ||
          "DVM reported an unspecified error.";
        Effect.runFork(
          telemetry.trackEvent({
            /* ... DVM error received ... */
          }),
        );

        // For streamText:
        emit.fail(
          new AiProviderError({
            message: `NIP90 DVM Error (${update.pubkey.substring(0, 6)}...): ${dvmErrorMessage}`,
            provider: "NIP-90",
            isRetryable: false, // DVM error is usually not client-retryable
            context: {
              dvmPubkey: update.pubkey,
              jobId: jobRequestEvent.id,
              feedbackEventId: update.id,
            },
          }),
        );
        emit.end(); // End the stream on DVM error
        paymentPromise?.unsafeInterrupt(); // Interrupt any pending payment logic
        currentSubscription?.unsub(); // Clean up subscription
        return; // Stop further processing for this event
      }
      ```

    - Adapt similar logic for `generateText` if it has a separate implementation path for handling updates. It should `Effect.fail` with `AiProviderError`.

**III. Correct Default Configuration for "nip90_devstral" Provider**

1.  **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    - **In `DefaultDevConfigLayer`:**
      - Locate the line: `yield* _(configService.set("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY", "714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"));`
      - **Change this to the actual Devstral DVM public key if known.** If the pubkey `32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245` is the correct one for the "devstral" service you are referring to, use it.
        ```typescript
        // If the actual Devstral PK is 32e1...
        yield *
          _(
            configService.set(
              "AI_PROVIDER_DEVSTRAL_DVM_PUBKEY",
              "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
            ),
          );
        ```
      - If the actual Devstral pubkey is **not definitively known**, add a comment and keep the local DVM pubkey as a placeholder, but make it clear this needs to be changed for the provider to work with the _actual_ Devstral service.
        ```typescript
        // If actual Devstral PK is NOT known or for local testing of the 'devstral' named provider entry:
        yield *
          _(
            configService.set(
              "AI_PROVIDER_DEVSTRAL_DVM_PUBKEY",
              "714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827",
            ),
          ); // NOTE: This is the local DVM's PK. For actual Devstral service, replace with its real pubkey.
        ```

**IV. Testing Considerations:**

- Test the `Kind5050DVMServiceImpl` (provider-side):
  - Send a job request for a model that Ollama _doesn't_ have. Verify it sends `kind:7000 status:"error"` and _doesn't_ send "payment-required".
  - Send a job request for a model that Ollama _does_ have. Verify it proceeds to "payment-required".
- Test `NIP90AgentLanguageModelLive` (client-side):
  - Configure it to target a DVM (mocked or real).
  - Simulate the DVM sending `kind:7000 status:"error"`. Verify the `streamText` or `generateText` method fails with an `AiProviderError`.
- Test `ChatOrchestratorService` with the updated `NIP90AgentLanguageModelLive`:
  - If the NIP-90 provider (e.g., "nip90_devstral") fails due to the DVM error, verify `AiPlan` attempts a fallback provider if configured.

This refined approach focuses on ensuring DVMs act correctly and clients handle DVM errors robustly, which should resolve the immediate issue seen in the logs and improve overall system reliability. The more advanced client-side DVM discovery and selection can be a separate, subsequent enhancement.
