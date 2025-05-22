Okay, Agent, this is an exciting step! We're going to integrate a NIP-90 powered AI model ("devstral") into our chat system, allowing users to switch between the local Ollama model and this network-based one.

Here are the detailed instructions:

**Phase 1: Configuration & Backend Abstractions**

**Task 1.1: Update Provider Configuration**

1.  **Modify `src/services/ai/core/ProviderConfig.ts`:**
    *   Define `NIP90ProviderConfigSchema` for NIP-90 DVMs. This schema should extend `BaseProviderConfigSchema`.
        *   `dvmPubkey`: `Schema.String` (hex public key of the DVM).
        *   `dvmRelays`: `Schema.Array(Schema.String)` (relays to publish job requests and listen for results).
        *   `requestKind`: `Schema.Number` (filtered to be between 5000-5999).
        *   `requiresEncryption`: `Schema.Boolean` (if NIP-04 encryption is needed for job inputs).
        *   `useEphemeralRequests`: `Schema.Boolean` (if `true`, generate a new ephemeral keypair for each NIP-90 job request; otherwise, the user's main Nostr identity might be used or another configured key).
        *   `modelIdentifier`: `Schema.optional(Schema.String)` (A string the DVM uses to identify the model/job type, e.g., "devstral". This might be passed as a `param` tag like `["param", "model", "devstral"]`).
        *   `temperature`: `Schema.optional(Schema.Number)` (to be passed as a `param` tag).
        *   `maxTokens`: `Schema.optional(Schema.Number)` (to be passed as a `param` tag).
    *   Add `NIP90ProviderConfigSchema` to the `ProviderConfigSchema` union.
    *   Add a new entry to `TypedProviderConfigSchema` for `"nip90"`:
        ```typescript
        Schema.Struct({ type: Schema.Literal("nip90"), config: NIP90ProviderConfigSchema })
        ```

2.  **Update `src/services/configuration/ConfigurationServiceImpl.ts` (`DefaultDevConfigLayer`):**
    *   Add a default configuration for "devstral" or a generic test DVM.
        *   Example:
            ```typescript
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY", "YOUR_DEVSTRAL_DVM_PUBKEY_HEX")); // Replace with actual or test DVM pubkey
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_RELAYS", JSON.stringify(["wss://relay.damus.io", "wss://relay.nostr.band"])));
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUEST_KIND", "5050")); // Or appropriate kind for text-to-text
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION", "true")); // Assume true for privacy
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS", "true"));
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER", "devstral"));
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_NAME", "Devstral (NIP-90)")); // User-facing name
            yield* _(configService.set("AI_PROVIDER_DEVSTRAL_ENABLED", "true"));
            ```
    *   This implies `ConfigurationService` can store/retrieve these. For `dvmRelays`, store as a JSON string and parse when retrieved.

**Task 1.2: Define `NIP90ProviderConfigTag` (Optional but good practice)**

1.  **Create `src/services/ai/providers/nip90/NIP90ProviderConfig.ts`:**
    *   This file can re-export `NIP90ProviderConfig` type from `core/ProviderConfig.ts`.
    *   Define `NIP90ProviderConfigTag = Context.GenericTag<NIP90ProviderConfig>("NIP90ProviderConfig");`
    *   This tag will be used by `NIP90AgentLanguageModelLive` to get its specific DVM configuration.

**Phase 2: NIP-90 Chat Provider Implementation**

**Task 2.1: Create `NIP90AgentLanguageModelLive.ts`**

1.  **Create Directory:** `src/services/ai/providers/nip90/`
2.  **Create File:** `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`
3.  **Implementation:**
    *   This layer will provide `AgentLanguageModel.Tag`.
    *   **Dependencies:**
        *   `NIP90ProviderConfigTag` (for the specific DVM's settings like pubkey, relays, kind).
        *   `NIP90Service.Tag` (for creating job requests and handling results/feedback).
        *   `NostrService.Tag` (used by `NIP90Service`, so implicitly a dependency).
        *   `NIP04Service.Tag` (for encryption if `requiresEncryption` is true).
        *   `TelemetryService.Tag`.
        *   `WalletStore` (or a way to get the user's current Nostr SK if `useEphemeralRequests` is false). For simplicity, initially assume `useEphemeralRequests` is true or the SK is passed in config.
    *   **`streamText` Method:**
        1.    Get DVM config using `NIP90ProviderConfigTag`.
        2.    Parse `params.prompt` (JSON string of `AgentChatMessage[]`) into an array of messages.
        3.    Format the chat history into a suitable prompt string for the NIP-90 job (e.g., concatenate messages, or use the last user message if DVM prefers simple prompts).
        4.    **Requester Secret Key:**
            *   If `dvmConfig.useEphemeralRequests` is true, call `generateSecretKey()` (from `nostr-tools/pure`) to create a new ephemeral SK for this request. Store this SK (e.g., in `localStorage` associated with the job request ID) so you can decrypt DVM responses later.
            *   Otherwise, get the user's primary Nostr SK (e.g., from `WalletStore` - this might require a new getter in `WalletStore` or passing it through config).
        5.    **Prepare NIP-90 Inputs & Params:**
            *   Create `inputs`: `[["THE_FORMATTED_PROMPT_STRING", "text"]]`.
            *   Create `additionalParams`:
                *   If `dvmConfig.modelIdentifier` is set: `[["param", "model", dvmConfig.modelIdentifier]]`.
                *   If `dvmConfig.temperature` is set: `[["param", "temperature", dvmConfig.temperature.toString()]]`.
                *   If `dvmConfig.maxTokens` is set: `[["param", "max_tokens", dvmConfig.maxTokens.toString()]]`.
        6.    **Create Job Request:**
            *   Call `nip90Service.createJobRequest` with the DVM pubkey, request kind, inputs, params, and SK. Encryption will be handled by `createJobRequest` based on `dvmConfig.requiresEncryption` and the `targetDvmPubkeyHex` argument.
        7.    **Subscribe to Updates:**
            *   Use `nip90Service.subscribeToJobUpdates` to listen for `kind:7000` (feedback) and `kind: (dvmConfig.requestKind + 1000)` (result).
            *   The `decryptionKey` for `subscribeToJobUpdates` will be the ephemeral SK used for the request (or user's SK).
        8.  **Handle Stream:**
            *   Return a `Stream.asyncInterrupt<AiTextChunk, AIProviderError>`.
            *   When `kind:7000` with `status: "partial"` and `content` is received: `emit.single({ text: feedback.content })`.
            *   When `kind: (dvmConfig.requestKind + 1000)` (final result) is received: `emit.single({ text: result.content })`, then `emit.end()`.
            *   When `kind:7000` with `status: "error"` or `status: "payment-required"` (if not handled by pre-payment) is received: `emit.fail(new AIProviderError(...))`.
            *   Handle other statuses appropriately (e.g., "processing" can be logged or ignored for stream).
            *   The `unsub` function from `subscribeToJobUpdates` should be returned by `Stream.asyncInterrupt`'s cleanup.
    *   **`generateText` Method:**
        *   Implement similarly to `streamText` but instead of subscribing, use `nip90Service.getJobResult` after publishing. This might involve polling or a timeout.
        *   For simplicity, you can make `generateText` also use the streaming approach internally and just collect all chunks into a single `AiResponse`.
    *   **`generateStructured` Method:**
        *   `Effect.fail(new AIProviderError({ message: "generateStructured not supported by NIP-90 provider", provider: "NIP90" }))`.

**Task 2.2: Add to Provider Index**

1.  **Create `src/services/ai/providers/nip90/index.ts`:**
    ```typescript
    export * from "./NIP90AgentLanguageModelLive";
    export * from "./NIP90ProviderConfig"; // If you created this file
    ```
2.  **Update `src/services/ai/providers/index.ts`:**
    `export * as NIP90Provider from "./nip90";`

**Phase 3: Runtime and UI Integration**

**Task 3.1: Simplified Model Selection (No Orchestrator Change Yet)**

1.  **`src/stores/agentChatStore.ts` (New Zustand Store):**
    *   State: `selectedProviderKey: string` (default: "ollama_gemma3_1b").
    *   State: `availableProviders: Array<{ key: string; name: string; type: 'ollama' | 'nip90'; configKey?: string }>` (e.g., `configKey` might be "AI_PROVIDER_DEVSTRAL" for NIP-90).
    *   Action: `setSelectedProviderKey(key: string)`.
    *   Action: `loadAvailableProviders(configService: ConfigurationService)`: Fetches provider configs and populates `availableProviders`.

2.  **`src/components/ai/AgentChatPane.tsx`:**
    *   Use `agentChatStore` to get `selectedProviderKey`, `setSelectedProviderKey`, and `availableProviders`.
    *   Add a `Select` component (Shadcn UI) to the title bar.
        *   Items are from `availableProviders`, showing `name`. Value is `key`.
        *   `onValueChange` calls `setSelectedProviderKey`.
    *   Add a small text element next to the "Provider:" display to show the `currentModelName` (from the selected provider's config if available, or a generic name like "Devstral DVM").

3.  **`src/hooks/ai/useAgentChat.ts`:**
    *   Get `selectedProviderKey` from `agentChatStore`.
    *   **Conditionally Provide `AgentLanguageModel`:**
        *   When constructing the Effect program for `sendMessage`, dynamically choose which `AgentLanguageModel` implementation and configuration to provide based on `selectedProviderKey`.
        ```typescript
        // Inside sendMessage or a helper function
        const runtime = runtimeRef.current;
        const agentLMProgram = Effect.gen(function*(_) {
          const configService = yield* _(ConfigurationService); // For NIP-90 config
          const key = selectedProviderKey; // From store

          if (key === "ollama_gemma3_1b") {
            // Provide OllamaAgentLanguageModelLive with its dependencies
            return yield* _(Effect.provide(AgentLanguageModel, OllamaProvider.OllamaAgentLanguageModelLive.pipe(
              Layer.provide(OllamaProvider.OllamaAsOpenAIClientLive.pipe(Layer.provide(runtime))), // OllamaAdapter depends on Telemetry, etc. from runtime
              Layer.provide(runtime) // For ConfigService, TelemetryService needed by OllamaAgentLanguageModelLive
            )));
          } else if (key === "nip90_devstral") { // Example key
            // Fetch specific DVM config for "devstral"
            const dvmPubKey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY"));
            // ... fetch other devstral-specific NIP-90 config values ...
            const devstralNip90Config: NIP90ProviderConfig = { /* ... populate ... */ };

            const DevstralNIP90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, devstralNip90Config);

            // Provide NIP90AgentLanguageModelLive with its dependencies
            return yield* _(Effect.provide(AgentLanguageModel, NIP90Provider.NIP90AgentLanguageModelLive.pipe(
              Layer.provide(DevstralNIP90ConfigLayer),
              Layer.provide(runtime) // For NIP90Service, NostrService, NIP04Service, TelemetryService
            )));
          }
          return yield* _(Effect.fail(new AIConfigurationError({ message: `Unsupported provider: ${key}` })));
        });

        // Then, when running the main chat program:
        const mainChatProgram = Effect.gen(function*(_){
            const agentLM = yield* _(AgentLanguageModel); // This will be the conditionally provided one
            // ... rest of your streamText logic ...
        }).pipe(Effect.provide(runtime), Effect.provideEffect(agentLMProgram)); // Provide the dynamic AgentLM

        Effect.runFork(mainChatProgram);
        ```
    *   This approach localizes the provider switching logic to `useAgentChat` initially.

**Task 3.2: Message Metadata Display**

1.  **`src/hooks/ai/useAgentChat.ts`:**
    *   When adding messages to `messages` state (`UIAgentChatMessage`), populate `providerInfo`.
        *   `name`: e.g., "Ollama", "NIP-90 (Devstral)".
        *   `type`: "local" or "network".
        *   `model`: e.g., "gemma3:1b", `dvmConfig.modelIdentifier` or "devstral".
    *   If NIP-90, also populate `nip90EventData` in the assistant's message with the job request event ID. As results/feedback come in, update this object for that message.

2.  **`src/components/chat/ChatMessage.tsx`:**
    *   If `providerInfo` exists:
        *   Render a small, non-intrusive text like `(via ${providerInfo.name} ${providerInfo.model || ''})`.
        *   Wrap this text in a `<Tooltip>` (Shadcn).
        *   **Tooltip Content:**
            *   If `providerInfo.type === 'network'` and `nip90EventData` exists:
                *   Show "Source: NIP-90 Network"
                *   Show "Model: devstral" (or actual model)
                *   Button/Link: "View NIP-90 Event Data"
                    *   Opens a `Dialog` (Shadcn).
                    *   Dialog content: Display `JSON.stringify(nip90EventData.request, null, 2)`, `...result`, `...feedback` in `<pre>` tags within a `<ScrollArea>`.

**Task 3.3: Runtime Layer Update**

1.  **`src/services/runtime.ts`:**
    *   Add `NIP90AgentLanguageModelLive` to the imports.
    *   Ensure `NIP90ServiceLive` and its dependencies (`NostrService`, `NIP04Service`, `TelemetryService`) are correctly part of `FullAppLayer`.
    *   The `AgentLanguageModel.Tag` provider will be dynamically switched by `useAgentChat.ts`, so `FullAppLayer` doesn't need to provide a default `AgentLanguageModel` if `useAgentChat` always handles the provision. Alternatively, `FullAppLayer` can provide a default (e.g., Ollama) and `useAgentChat` overrides it for NIP-90. The former (dynamic provision in hook) is cleaner for this specific task.

**Phase 4: Testing and Logging**

**Task 4.1: Unit Tests**

1.  **`NIP90AgentLanguageModelLive.test.ts`:**
    *   Mock `NIP90Service`, `NIP04Service`, `ConfigurationService`, `TelemetryService`.
    *   Test `streamText`:
        *   Correct NIP-90 job request creation (check `createJobRequest` mock calls).
        *   Correct subscription to updates.
        *   Correct mapping of `kind:7000 partial` and `kind:6xxx` to `AiTextChunk`.
        *   Error handling for NIP-90 failures.
        *   Correct use of ephemeral SKs if configured.
2.  **`agentChatStore.test.ts` (New):** Test provider selection state.
3.  **`useAgentChat.test.ts`:**
    *   Mock `AgentLanguageModel` and its concrete implementations.
    *   Test that selecting "NIP-90 Devstral" uses the NIP-90 path.
    *   Test that `providerInfo` and `nip90EventData` are correctly set on messages.
4.  **`ChatMessage.test.tsx`:** Test rendering of provider info and NIP-90 data tooltip/dialog.

**Task 4.2: Logging**

1.  **`NIP90AgentLanguageModelLive.ts`:**
    *   Log NIP-90 Job Request ID created.
    *   Log DVM pubkey and relays being used.
    *   Log each feedback/result event received (kind, status, content snippet).
    *   Log encryption/decryption steps if applicable.
2.  **`useAgentChat.ts`:**
    *   Log when provider is switched.
    *   Log which provider is being used for an outgoing message.
3.  Use `TelemetryService.trackEvent` for all logging. Category `nip90_chat`.

**Implementation Notes:**

*   **Error Handling:** Be meticulous. `AIProviderError` should wrap NIP-90 specific errors, including context like job ID, DVM pubkey.
*   **Security:** If not using ephemeral keys for NIP-90 requests, ensure the user's main SK is handled securely and not exposed unnecessarily. Ephemeral is safer for DVM requests.
*   **User Experience:**
    *   Clearly indicate when a NIP-90 request is in progress (loading state).
    *   Display DVM feedback (processing, payment-required) as system messages in the chat.
    *   The "View NIP-90 Event Data" dialog should be user-friendly.

This set of instructions provides a comprehensive plan. Start with the non-streaming `generateText` for `NIP90AgentLanguageModelLive` if `streamText` proves too complex initially. Good luck!

```

Total Token Count: 116692
Total Word Count: 87126

**Summary of Key Changes:**

1.  **Configuration (`ProviderConfig.ts`, `ConfigurationServiceImpl.ts`):**
    *   Added `NIP90ProviderConfigSchema` with DVM-specific fields (pubkey, relays, kind, encryption settings, model identifier, common LLM params).
    *   Integrated this into the main `ProviderConfigSchema` and `TypedProviderConfigSchema`.
    *   Added default config values for a "devstral" NIP-90 provider in `DefaultDevConfigLayer`.

2.  **NIP-90 AI Provider (`NIP90AgentLanguageModelLive.ts`):**
    *   Created a new service layer in `src/services/ai/providers/nip90/`.
    *   This layer implements the `AgentLanguageModel.Tag` interface.
    *   It depends on a `NIP90ProviderConfigTag` (for specific DVM settings), `NIP90Service`, `NostrService`, `NIP04Service`, and `TelemetryService`.
    *   The `streamText` method (and `generateText`) will:
        *   Parse chat history from the input `params.prompt`.
        *   Format this history into a prompt suitable for the NIP-90 DVM.
        *   Manage ephemeral secret keys for requests if configured.
        *   Use `NIP90Service.createJobRequest` to publish the job.
        *   Use `NIP90Service.subscribeToJobUpdates` to stream results (from `kind:7000 partial` feedback and `kind:6xxx` final results).
        *   Map NIP-90 data and errors to `AiTextChunk` and `AIProviderError` respectively.

3.  **Model Selection & UI (`agentChatStore.ts`, `AgentChatPane.tsx`, `useAgentChat.ts`):**
    *   A new Zustand store (`agentChatStore`) manages the `selectedProviderKey` (e.g., "ollama_gemma3_1b", "nip90_devstral") and a list of `availableProviders`.
    *   `AgentChatPane.tsx` will have a `Select` dropdown in its title bar, populated from `agentChatStore`, to allow users to switch AI providers.
    *   `useAgentChat.ts` will:
        *   Read the `selectedProviderKey` from the store.
        *   Dynamically provide the correct `AgentLanguageModel` implementation (e.g., `OllamaAgentLanguageModelLive` or `NIP90AgentLanguageModelLive`) and its specific configuration layer when executing chat Effect programs.
        *   Populate UI messages (`UIAgentChatMessage`) with `providerInfo` (name, type, model) and, for NIP-90, `nip90EventData` (raw request, result, feedback events).

4.  **Message Display (`ChatMessage.tsx`):**
    *   Updated to display the `providerInfo` (e.g., "Network: Devstral") next to messages.
    *   A `Tooltip` on this info will show more details.
    *   If it's a NIP-90 message, the tooltip will include a button to open a `Dialog` displaying the raw NIP-90 event JSON.

5.  **Runtime (`runtime.ts`):**
    *   `FullAppLayer` will be updated to include `NIP90ServiceLive` and its dependencies.
    *   The actual `AgentLanguageModel.Tag` provider will be determined dynamically by `useAgentChat.ts` based on user selection, rather than a single static provider in `FullAppLayer`.

6.  **Logging & Testing:**
    *   Comprehensive telemetry events for NIP-90 interactions (job creation, status updates, errors) using `TelemetryService`.
    *   Unit tests for `NIP90AgentLanguageModelLive`, the new store, and UI components.
    *   Focus on testing the NIP-90 data flow and error handling.

This plan aims for a clear separation of concerns and leverages existing Effect-TS patterns for a robust implementation.

```
