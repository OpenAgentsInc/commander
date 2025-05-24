Okay, I see the issue. The telemetry clearly shows that even after an attempt to switch to "devstral" (which I understand to be your NIP-90 DVM provider), the AI requests are still being handled by the Ollama provider.

This usually happens due to one or a combination of these reasons:
1.  The UI selection for "devstral" is not correctly updating the state that the AI request logic uses.
2.  The AI request logic (likely in `useAgentChat.ts`) is hardwired to use a default provider or doesn't dynamically select the provider based on the current configuration/selection.
3.  The `ChatOrchestratorService` (if in use by `useAgentChat.ts` as per Phase 6 of your AI roadmap) is not correctly interpreting the `preferredProvider` for "devstral" or is defaulting to Ollama.
4.  The `FullAppLayer` in `src/services/runtime.ts` is providing `OllamaAgentLanguageModelLive` as the default (or only) implementation for `AgentLanguageModel.Tag`, and this isn't being overridden.

Given the telemetry `agent_language_model_resolved_successfully` followed by Ollama logs, it's highly probable that `useAgentChat.ts` is resolving the `AgentLanguageModel.Tag` to its default Ollama implementation from the runtime, irrespective of any UI selection.

Here's the diagnosis and instructions for the coding agent to fix this:

## Diagnosis:

1.  **Provider Selection Disconnect:** The `AgentChatPane.tsx` (via `useAgentChatStore`) correctly updates the `selectedProviderKey` when the user chooses "devstral". However, `useAgentChat.ts` is not using this `selectedProviderKey` to dynamically obtain the NIP-90 implementation of `AgentLanguageModel`. Instead, it's likely fetching the default `AgentLanguageModel` from the runtime, which is configured to be `OllamaAgentLanguageModelLive` in `FullAppLayer`.
2.  **`useAgentChat.ts` Using Default `AgentLanguageModel`:** The telemetry line `agent_language_model_resolved_successfully` suggests `useAgentChat.ts` directly `yield* _(AgentLanguageModel.Tag)`. This resolves to whatever `FullAppLayer` provides for that tag, currently Ollama.
3.  **`ChatOrchestratorService` Not Utilized or Misconfigured for "devstral":** Phase 6 of your AI roadmap introduces `ChatOrchestratorService` to handle provider selection and resilience.
    *   If `useAgentChat.ts` has *not* yet been refactored to use `ChatOrchestratorService`, then the dynamic provider selection logic is entirely missing from the hook.
    *   If `useAgentChat.ts` *is* using `ChatOrchestratorService`, then the orchestrator's `getResolvedAiModelProvider` (or similar logic) might not have a case for `"nip90_devstral"` or is failing to construct/provide the `NIP90AgentLanguageModelLive` correctly.

## Instructions for the Coding Agent to Fix:

The primary fix involves ensuring that `useAgentChat.ts` uses the `ChatOrchestratorService` to get the language model based on the user's selection from `agentChatStore`.

**Target Files for Modification:**

1.  `src/hooks/ai/useAgentChat.ts`
2.  `src/services/ai/orchestration/ChatOrchestratorService.ts`
3.  `src/services/runtime.ts` (Verification, potentially minor adjustments for NIP-90 provider dependencies)
4.  `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts` (Verification)

**Step 1: Refactor `useAgentChat.ts` to Use `ChatOrchestratorService`**

```typescript
// src/hooks/ai/useAgentChat.ts

// Add ChatOrchestratorService import
import {
  ChatOrchestratorService,
  type PreferredProviderConfig, // Import if not already
} from "@/services/ai/orchestration";
// Import the store for provider selection
import { useAgentChatStore } from "@/stores/ai/agentChatStore";
// Other imports ...
// AgentLanguageModel.Tag will no longer be directly used here for requests

// Inside useAgentChat function:
// ...
const runtimeRef = useRef(getMainRuntime());
const { selectedProviderKey } = useAgentChatStore(); // Get selected provider from store

// ... inside sendMessage callback ...
const sendMessage = useCallback(
  async (promptText: string) => {
    // ... (user message setup, isLoading, setError, telemetry as before) ...

    // Prepare PreferredProviderConfig
    const providerConfig: PreferredProviderConfig = {
      key: selectedProviderKey, // Use the key from the store
      // modelName: selectedModelName, // If you also have model selection in the store/UI
    };
    const currentProviderInfoFromStore = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);


    const streamTextOptionsForOrchestrator: Parameters<ChatOrchestratorService['streamConversation']>[0] = {
      messages: conversationHistoryForLLM, // Ensure this is AgentChatMessage[]
      preferredProvider: providerConfig,
      options: {
        // Pass other options like temperature, maxTokens if your orchestrator/LLM supports them
        // model: providerConfig.modelName, // Model name for the specific provider
      },
    };

    const program = Effect.gen(function* (_) {
      // Use ChatOrchestratorService instead of AgentLanguageModel directly
      const orchestrator = yield* _(ChatOrchestratorService);
      yield* _(
        telemetry.trackEvent({
          category: "agent_chat",
          action: "chat_orchestrator_resolved_successfully",
          label: `Orchestrator resolved for provider: ${selectedProviderKey}`,
          value: assistantMsgId,
        })
      );

      console.log(
        "[useAgentChat] Starting stream via Orchestrator for message:",
        assistantMsgId,
        "Provider:",
        selectedProviderKey
      );

      // Call the orchestrator to get the stream
      // The orchestrator handles AiPlan, fallbacks, retries, and provider selection
      const textStream = orchestrator.streamConversation(streamTextOptionsForOrchestrator);

      // The rest of the stream handling logic (runForEach, setMessages, error handling)
      // should remain largely the same, consuming AiResponse chunks.
      yield* _(
        Stream.runForEach(textStream, (chunk: AiResponse) => // Ensure chunk is AiResponse
          Effect.sync(() => {
            // ... (same chunk processing logic as before) ...
            // Update messages with provider info from the store
            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: (msg.content || "") + chunk.text, // Assuming chunk has .text
                      _updateId: Date.now(),
                      providerInfo: currentProviderInfoFromStore
                        ? {
                            name: currentProviderInfoFromStore.name,
                            type: currentProviderInfoFromStore.type,
                            model: currentProviderInfoFromStore.modelName,
                          }
                        : undefined,
                    }
                  : msg,
              ),
            );
          }),
        { signal },
        ),
      );
    }).pipe(
      // Ensure ChatOrchestratorService and TelemetryService are provided by the runtime
      Effect.provide(runtimeRef.current),
      // ... (rest of tapErrorCause and ensuring blocks) ...
    );

    Effect.runFork(program);
  },
  [messages, initialSystemMessage, runTelemetry, selectedProviderKey], // Add selectedProviderKey to dependencies
);
// ...
```

**Step 2: Ensure `ChatOrchestratorServiceLive.ts` Can Resolve and Use `NIP90AgentLanguageModelLive`**

The `getResolvedAiModelProvider` function within `ChatOrchestratorServiceLive` needs a case for `"nip90_devstral"` (or whatever key you use for it). This case should correctly construct and provide the `NIP90AgentLanguageModelLiveLayer` with *its* dependencies.

```typescript
// src/services/ai/orchestration/ChatOrchestratorService.ts
// ... (other imports) ...
import { NIP90AgentLanguageModelLiveLayer } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NIP90ServiceLive } from "@/services/nip90";
import { NostrServiceLive } from "@/services/nostr";
import { NIP04ServiceLive } from "@/services/nip04";
// AgentLanguageModel.Tag is already imported

// ... inside ChatOrchestratorServiceLive ...
// ... inside getResolvedAiModelProvider function ...
switch (key.toLowerCase()) {
  // ... existing cases for openai, anthropic, ollama ...
  case "nip90_devstral": { // Or your specific key for devstral
    runTelemetry({
      category: "orchestrator",
      action: "get_resolved_model_attempt_nip90",
      label: key,
      value: modelNameOverride,
    });

    // Fetch NIP-90 specific config for Devstral
    const dvmPubkey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(Effect.orElseSucceed(() => "MISSING_DVM_PUBKEY")));
    const relaysStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_RELAYS").pipe(Effect.orElseSucceed(() => "[]")));
    const relays = JSON.parse(relaysStr) as string[];
    const reqKindStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
    const reqKind = parseInt(reqKindStr, 10);
    const reqEncryptionStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
    const useEphemeralStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
    const modelId = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "devstral")));

    const nip90DevstralProviderConfig: NIP90ProviderConfig = {
      modelName: modelNameOverride || devstralDefaultModelName, // Use override or a sensible default for NIP-90
      isEnabled: true, // Assume enabled if selected
      dvmPubkey: dvmPubkey,
      dvmRelays: relays,
      requestKind: reqKind,
      requiresEncryption: reqEncryptionStr === "true",
      useEphemeralRequests: useEphemeralStr === "true",
      modelIdentifier: modelId,
      // temperature, maxTokens could be passed via options or set here from configService
    };

    const DevstralConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90DevstralProviderConfig);

    // NIP90AgentLanguageModelLiveLayer already provides AgentLanguageModel.Tag
    // It needs NIP90Service, NostrService, NIP04Service, TelemetryService, and NIP90ProviderConfigTag
    // These service dependencies (NIP90ServiceLive, NostrServiceLive, etc.) should be available
    // in the ChatOrchestratorService's main context or fully composed here.
    // Assuming they are provided by FullAppLayer to the orchestrator.
    const completeNIP90Layer = NIP90AgentLanguageModelLiveLayer.pipe(
      Layer.provide(DevstralConfigLayer),
      // These dependencies are part of the 'baseLayer' or 'FullAppLayer' provided to ChatOrchestratorServiceLive
      // So, we don't need to provide them again here IF ChatOrchestratorServiceLive receives them.
      // Layer.provide(NIP90ServiceLive),
      // Layer.provide(NostrServiceLive),
      // Layer.provide(NIP04ServiceLive),
      // Layer.provide(telemetryLayer) // telemetry is already available in this Effect.gen
    );

    // The goal is to get an AgentLanguageModel instance.
    const serviceInstance = yield* _(
      completeNIP90Layer.pipe(
        Layer.buildAndGet(AgentLanguageModel.Tag)
      )
    );

    // AiPlan.make expects an Effect<Provider<Service>, ...>
    // Our 'serviceInstance' is the 'Service' itself. We need to wrap it in a 'Provider' structure.
    // This wrapper makes the service instance conform to the Provider<AgentLanguageModel> interface
    // that AiPlan expects.
    const providerWrapper: AiProvider.Provider<AgentLanguageModel> = {
      use: <A, E_INNER, R_INNER>(effect: Effect.Effect<A, E_INNER, R_INNER | AgentLanguageModel>) =>
        Effect.provideService(effect, AgentLanguageModel.Tag, serviceInstance)
    };

    specificAiModelEffect = Effect.succeed(providerWrapper) as any; // Cast to AiModel-like structure for AiPlan
    break;
  }
  // ...
}
// ...
// When constructing AiPlan:
const planSteps = [preferredProvider, ...fallbackProviders].map(
  (pConfig) => ({
    model: getResolvedAiModelProvider(pConfig), // This now returns Effect<Provider<AgentLanguageModel>, ...>
    // ... attempts, schedule, while ...
  }),
);
const plan = AiPlan.make(...planSteps); // This AiPlan becomes a Provider<AgentLanguageModel>
const planProvider = yield* _(plan); // Build the plan into the actual provider

// Use this planProvider:
return planProvider.streamText(streamOptions); // Pass the prompt and options here
// ...
```

**Step 3: Verify `NIP90AgentLanguageModelLive.ts`**

Ensure that `NIP90AgentLanguageModelLive.ts`:
*   Correctly uses `NIP90ProviderConfigTag` to get its specific configuration (DVM pubkey, relays, kind for "devstral").
*   The `generateText` and `streamText` methods are correctly implemented to:
    *   Parse the prompt (which might be a JSON string of messages from `useAgentChat`).
    *   Use the `NIP90Service` to create a job request, using ephemeral keys if `useEphemeralRequests` is true.
    *   For `streamText`, subscribe to job updates and `emit.single(createAiResponse(content))` for partial results and `emit.end()` or `emit.fail()` appropriately.
    *   Correctly handle encryption/decryption using `NIP04Service` if `requiresEncryption` is true.

**Step 4: Verify `src/services/runtime.ts` (`FullAppLayer`)**

*   `ChatOrchestratorServiceLive` must be part of `FullAppLayer`.
*   All *dependencies* required by the `NIP90AgentLanguageModelLiveLayer` and its sub-dependencies (like `NIP90ServiceLive`, `NostrServiceLive`, `NIP04ServiceLive`, `TelemetryServiceLive`) must be available in the context provided to `ChatOrchestratorServiceLive`.
    *   This means `FullAppLayer` should include `NIP90ServiceLive`, `NostrServiceLive`, `NIP04ServiceLive` (these are already in the `nip90Layer` which `kind5050DVMLayer` uses, but ensure orchestrator has access).
    *   The `NIP90ProviderConfigTag` is provided *dynamically* by the orchestrator in `getResolvedAiModelProvider` for the "devstral" case, which is correct.

**Step 5: Configuration for "devstral"**

Ensure `src/services/configuration/ConfigurationServiceImpl.ts` (specifically `DefaultDevConfigLayer`) has the correct configuration keys for the "devstral" NIP-90 provider, e.g.:
*   `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY`
*   `AI_PROVIDER_DEVSTRAL_RELAYS` (as a JSON string array)
*   `AI_PROVIDER_DEVSTRAL_REQUEST_KIND`
*   `AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION` ("true" or "false")
*   `AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS` ("true" or "false")
*   `AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER`
*   `AI_PROVIDER_DEVSTRAL_MODEL_NAME` (for UI display)
*   `AI_PROVIDER_DEVSTRAL_ENABLED` ("true")

**Reasoning for this Approach:**

*   **Centralized Provider Logic:** The `ChatOrchestratorService` becomes the single point for obtaining an `AgentLanguageModel`, abstracting away the specific provider implementation details and `AiPlan` resilience logic.
*   **Dynamic Selection:** `useAgentChat` now correctly uses the user's selection from the store to inform the orchestrator.
*   **Alignment with Roadmap:** This implements the core idea of Phase 6.
*   **NIP-90 as a First-Class Provider:** The NIP-90 DVM is treated as another AI provider, managed through the same orchestration mechanism.

After these changes, when "devstral" is selected in the `AgentChatPane`, `useAgentChat` will request it from the `ChatOrchestratorService`, which will then construct and use the `NIP90AgentLanguageModelLive` implementation, correctly routing requests to the NIP-90 DVM.Okay, Agent, this is a critical fix. The telemetry clearly shows that the application is defaulting to Ollama (`OllamaAgentLanguageModelLive`) even when "devstral" (NIP-90) is selected. This means the provider selection mechanism isn't correctly influencing which `AgentLanguageModel` implementation is used.

The core issue is that `useAgentChat.ts` likely resolves `AgentLanguageModel.Tag` from the global runtime, which is hardwired in `FullAppLayer` to provide the Ollama implementation, and it's not dynamically choosing the NIP-90 provider based on the selection stored in `agentChatStore`.

The fix involves ensuring that `useAgentChat.ts` uses the `ChatOrchestratorService` (as intended in Phase 6), which *can* dynamically select and build the correct provider implementation based on the user's choice.

Here are the precise instructions:

**High-Level Goal:** Refactor `useAgentChat.ts` to use `ChatOrchestratorService` for AI interactions, passing the selected provider key from `agentChatStore`. Ensure `ChatOrchestratorService` can correctly instantiate and use `NIP90AgentLanguageModelLive` when "devstral" (your NIP-90 provider key) is selected.

---

**I. Modify `src/hooks/ai/useAgentChat.ts`**

1.  **Import necessary services and types:**
    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... existing imports ...
    import {
      ChatOrchestratorService, // NEW: Import the orchestrator service
      type PreferredProviderConfig,
    } from "@/services/ai/orchestration";
    import { useAgentChatStore } from "@/stores/ai/agentChatStore"; // To get selected provider
    import { AiResponse } from "@/services/ai/core/AiResponse"; // Ensure using your core AiResponse if different from @effect/ai

    // Remove or comment out direct import of AgentLanguageModel.Tag if no longer directly used for requests
    // import { AgentLanguageModel } from "@/services/ai/core";
    ```

2.  **Update the `sendMessage` callback:**
    *   Get `selectedProviderKey` from `useAgentChatStore`.
    *   Replace direct calls to `agentLM.streamText` with `orchestrator.streamConversation`.
    *   Construct `PreferredProviderConfig` based on `selectedProviderKey`.
    *   Ensure the `prompt` passed to `streamConversation` is in the format expected by your `AgentChatMessageSchema` (likely an array of `AgentChatMessage` objects, stringified if necessary for the orchestrator's `StreamTextOptions`).

    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... inside useAgentChat function ...

    const { selectedProviderKey } = useAgentChatStore(); // Get the currently selected provider key

    // ... inside sendMessage useCallback ...
    const sendMessage = useCallback(
      async (promptText: string) => {
        // ... (userMessage setup, setIsLoading, setError, telemetry as before) ...

        // --- THIS IS THE CRITICAL CHANGE ---
        // Prepare PreferredProviderConfig for the orchestrator
        const preferredProvider: PreferredProviderConfig = {
          key: selectedProviderKey, // Use the selected key from the store
          // modelName: "default", // Optionally, if you have model selection per provider
        };
        const currentProviderInfoFromStore = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);


        const streamOptionsForOrchestrator: Parameters<ChatOrchestratorService['streamConversation']>[0]['options'] = {
          // model: preferredProvider.modelName, // Pass model if orchestrator or underlying provider needs it
          // temperature: 0.7, // Pass other LLM params if needed
        };

        // The prompt for streamConversation should be AgentChatMessage[]
        // `conversationHistoryForLLM` should already be AgentChatMessage[]
        const messagesForOrchestrator = [
          { role: "system", content: initialSystemMessage, timestamp: Date.now() }, // Ensure system prompt is part of the history
          ...conversationHistoryForLLM, // This should be AgentChatMessage[]
        ];

        const program = Effect.gen(function* (_) {
          // Get ChatOrchestratorService from the runtime
          const orchestrator = yield* _(ChatOrchestratorService);
          yield* _(
            telemetry.trackEvent({
              category: "agent_chat",
              action: "chat_orchestrator_resolved_successfully",
              label: `Orchestrator resolved for provider: ${selectedProviderKey}`,
              value: assistantMsgId,
            })
          );

          console.log(
            "[useAgentChat] Starting stream via Orchestrator for message:",
            assistantMsgId,
            "Provider:",
            selectedProviderKey
          );

          // Call the orchestrator's streamConversation method
          const textStream = orchestrator.streamConversation({
            messages: messagesForOrchestrator, // Pass AgentChatMessage[]
            preferredProvider: preferredProvider,
            options: streamOptionsForOrchestrator,
          });

          // The stream from orchestrator should yield AiResponse (your core type)
          yield* _(
            Stream.runForEach(textStream, (chunk: AiResponse) => // Expecting your core AiResponse
              Effect.sync(() => {
                if (signal.aborted) {
                  // ... (abort logic as before) ...
                  return;
                }
                setMessages((prevMsgs) =>
                  prevMsgs.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content: (msg.content || "") + chunk.text, // Access .text from your AiResponse
                          _updateId: Date.now(),
                          providerInfo: currentProviderInfoFromStore
                            ? {
                                name: currentProviderInfoFromStore.name,
                                type: currentProviderInfoFromStore.type,
                                model: currentProviderInfoFromStore.modelName,
                              }
                            : undefined,
                        }
                      : msg,
                  ),
                );
                // ... (logging as before) ...
              }),
            { signal }, // Pass the AbortSignal
            ),
          );
        }).pipe(
          Effect.provide(runtimeRef.current), // Provide the main runtime
          // ... (rest of tapErrorCause and ensuring blocks as before) ...
        );

        Effect.runFork(program); // No need to provide AgentLanguageModel.Tag here anymore
      },
      [messages, initialSystemMessage, runTelemetry, selectedProviderKey], // Add selectedProviderKey
    );
    // ...
    ```

**II. Ensure `ChatOrchestratorServiceLive.ts` Correctly Handles "nip90_devstral"**

1.  **Import NIP-90 specific layers and types:**
    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... existing imports ...
    import { AgentLanguageModel } from "@/services/ai/core"; // Your core AgentLanguageModel Tag
    import { NIP90AgentLanguageModelLiveLayer } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
    import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
    import { NIP90ServiceLive } from "@/services/nip90";       // Assuming this provides NIP90Service.Tag
    import { NostrServiceLive } from "@/services/nostr";       // Assuming this provides NostrService.Tag
    import { NIP04ServiceLive } from "@/services/nip04";       // Assuming this provides NIP04Service.Tag
    import { TelemetryServiceLive } from "@/services/telemetry"; // Assuming this provides TelemetryService.Tag
    import type { Provider as AiProviderEffect } from "@effect/ai"; // Type from @effect/ai
    ```

2.  **Update `getResolvedAiModelProvider` in `ChatOrchestratorServiceLive.ts`:**
    *   Add a `case` for your NIP-90 provider key (e.g., `"nip90_devstral"`).
    *   This case must:
        *   Fetch the specific `NIP90ProviderConfig` for "devstral" from `ConfigurationService`.
        *   Create a `Layer` for this specific `NIP90ProviderConfigTag`.
        *   Build the `NIP90AgentLanguageModelLiveLayer` by providing it with this config layer and all other necessary service layers (`NIP90ServiceLive`, `NostrServiceLive`, `NIP04ServiceLive`, `TelemetryServiceLive`). These other service layers should already be part of the context available to `ChatOrchestratorServiceLive` via `FullAppLayer`.
        *   Get the `AgentLanguageModel` instance from the built layer.
        *   Wrap this instance into an object that conforms to the `AiProvider.Provider<AgentLanguageModel>` interface (which has a `.use` method) expected by `AiPlan.make`.

    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... inside ChatOrchestratorServiceLive / getResolvedAiModelProvider ...

    case "nip90_devstral": { // Use your actual key for the NIP-90 devstral provider
      runTelemetry({ /* ... */ });

      // Fetch NIP-90 specific config for Devstral from ConfigurationService
      const dvmPubkey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(Effect.orElseSucceed(() => "default_dvm_pk_if_missing")));
      const relaysStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_RELAYS").pipe(Effect.orElseSucceed(() => "[]")));
      const relays = JSON.parse(relaysStr) as string[]; // Add error handling for JSON.parse
      const reqKindStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
      const reqKind = parseInt(reqKindStr, 10);
      const reqEncryptionStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
      const useEphemeralStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
      const modelIdFromConfig = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "devstral_default_model")));

      const devstralSpecificConfig: NIP90ProviderConfig = {
        modelName: modelNameOverride || modelIdFromConfig, // modelNameOverride from preferredProvider, fallback to config
        isEnabled: true, // Assumed as it's being resolved
        dvmPubkey: dvmPubkey,
        dvmRelays: relays.length > 0 ? relays : ["wss://relay.damus.io"], // Default relay if none configured
        requestKind: !isNaN(reqKind) ? reqKind : 5050,
        requiresEncryption: reqEncryptionStr === "true",
        useEphemeralRequests: useEphemeralStr === "true",
        modelIdentifier: modelIdFromConfig,
        // Optional LLM params for DVM jobs (if your NIP90AgentLanguageModel uses them)
        // temperature: yield* _(Effect.optional(configService.get("AI_PROVIDER_DEVSTRAL_TEMPERATURE"))).pipe(Option.map(parseFloat), Option.getOrElse(() => 0.7)),
        // maxTokens: yield* _(Effect.optional(configService.get("AI_PROVIDER_DEVSTRAL_MAX_TOKENS"))).pipe(Option.map(parseInt), Option.getOrElse(() => 2048)),
      };

      const DevstralProviderConfigLayer = Layer.succeed(NIP90ProviderConfigTag, devstralSpecificConfig);

      // NIP90AgentLanguageModelLiveLayer provides AgentLanguageModel.Tag.
      // Its dependencies (NIP90Service, NostrService, NIP04Service, TelemetryService)
      // are assumed to be provided to ChatOrchestratorServiceLive's context via FullAppLayer.
      // So, we only need to provide the specific NIP90ProviderConfigTag for Devstral.
      const nip90AgentLMInstanceEffect = NIP90AgentLanguageModelLiveLayer.pipe(
        Layer.provide(DevstralProviderConfigLayer),
        // The dependencies below are expected to be in the context ChatOrchestratorServiceLive runs in.
        // Layer.provide(NIP90ServiceLive), // Example if they weren't global
        // Layer.provide(NostrServiceLive),
        // Layer.provide(NIP04ServiceLive),
        // Layer.provide(telemetryLayer),
        Layer.buildAndGet(AgentLanguageModel.Tag) // This gets the AgentLanguageModel instance
      );

      // Wrap the AgentLanguageModel service instance in a Provider structure for AiPlan
      specificAiModelEffect = Effect.map(nip90AgentLMInstanceEffect, serviceInstance => ({
        use: <A_INNER, E_INNER, R_INNER>(effectToRun: Effect.Effect<A_INNER, E_INNER, R_INNER | AgentLanguageModel>) =>
          Effect.provideService(effectToRun, AgentLanguageModel.Tag, serviceInstance)
      })) as any; // Cast to AiModel-like for AiPlan.make
      break;
    }
    // ...
    ```

**III. Verify `src/services/runtime.ts` (`FullAppLayer`)**

1.  Ensure `ChatOrchestratorServiceLive` is correctly added to `FullAppLayer`.
2.  Ensure `FullAppLayer` also provides all the *base dependencies* that `NIP90AgentLanguageModelLiveLayer` itself requires, such as:
    *   `NIP90ServiceLive`
    *   `NostrServiceLive`
    *   `NIP04ServiceLive`
    *   `TelemetryServiceLive` (which `chatOrchestratorLayer` already depends on)
    *   `ConfigurationServiceLive` (which `chatOrchestratorLayer` already depends on)
    *   `HttpClient.Tag` (if any of these NIP-90 services need it directly; `NostrServiceLive` does).

    Your current `FullAppLayer` seems to compose most of these already. The key is that `ChatOrchestratorServiceLive` has access to them in its own context so it can provide them when building the NIP-90 provider dynamically if needed, or that `NIP90AgentLanguageModelLiveLayer` can resolve them from the context provided to it by the orchestrator.
    The structure `Layer.provide(NIP90AgentLanguageModelLiveLayer, Layer.provide(NIP90ProviderConfigTag, ...))` within the orchestrator is viable if the other dependencies of `NIP90AgentLanguageModelLiveLayer` are already in the orchestrator's context.

**IV. Verify `NIP90AgentLanguageModelLive.ts`**

1.  **Prompt Parsing:** The `parsePromptMessages` helper should handle both plain string prompts and JSON stringified `AgentChatMessage[]`.
2.  **Parameter Usage:** Ensure `GenerateTextOptions` or `StreamTextOptions` (like `temperature`, `maxTokens`) from `useAgentChat` are correctly passed through the orchestrator and then used to form `additionalParams` for the NIP-90 job request if the DVM supports them.
3.  **Output Formatting:** `streamText` should yield `AiResponse` objects (your core type). The example in Phase 6 already aims for this.

**V. Verify `agentChatStore.ts`**

1.  Ensure the "devstral" provider key (e.g., `"nip90_devstral"`) used in `AgentChatPane` and `ChatOrchestratorService` matches the key defined in `agentChatStore`'s `availableProviders`.
    The `AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER` (e.g., "devstral") from config should be used as the `modelName` for the `NIP90ProviderConfig`, and this can also be the `modelName` property in the `AIProvider` entry in `agentChatStore`.

**After applying these changes:**

*   When "devstral" is selected in `AgentChatPane`, `useAgentChat` will call `ChatOrchestratorService` with `preferredProvider.key = "nip90_devstral"`.
*   `ChatOrchestratorService`'s `getResolvedAiModelProvider` will hit the new "nip90_devstral" case.
*   It will correctly build and return an `AgentLanguageModel` (wrapped as a Provider) implemented by `NIP90AgentLanguageModelLive`, configured with Devstral's DVM details.
*   The AI requests will then be processed via the NIP-90 protocol.

This should resolve the issue of requests defaulting to Ollama when Devstral (NIP-90) is intended.## Diagnosis & Fix: Model Switching Still Uses Ollama

The telemetry and your file structure confirm the issue: even when "devstral" (your NIP-90 DVM provider) is selected, AI requests are still being routed through the Ollama provider. This typically occurs when the UI's provider selection doesn't correctly influence the AI request logic or when the `ChatOrchestratorService` (responsible for dynamic provider selection as per Phase 6) isn't properly configured or utilized for the NIP-90 provider.

**Root Cause:**

The `useAgentChat.ts` hook, which handles sending messages, is likely resolving `AgentLanguageModel.Tag` to its default Ollama implementation from `FullAppLayer` and is not yet fully leveraging the `ChatOrchestratorService` to dynamically select the NIP-90 provider based on the `selectedProviderKey` from `agentChatStore`.

Additionally, the `ChatOrchestratorService` itself needs a proper case to handle the "nip90_devstral" provider key and instantiate `NIP90AgentLanguageModelLive` with its specific dependencies.

**Instructions for the Coding Agent:**

The primary fix involves refactoring `useAgentChat.ts` to use `ChatOrchestratorService` and ensuring the orchestrator can correctly instantiate and use `NIP90AgentLanguageModelLive`.

---

**I. Modify `src/hooks/ai/useAgentChat.ts`**

1.  **Import `ChatOrchestratorService` and related types:**
    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... existing imports ...
    import {
      ChatOrchestratorService,
      type PreferredProviderConfig,
    } from "@/services/ai/orchestration";
    import { useAgentChatStore } from "@/stores/ai/agentChatStore";
    import { AiResponse } from "@/services/ai/core/AiResponse"; // Your core AiResponse
    // Remove or comment out direct import of AgentLanguageModel.Tag
    // import { AgentLanguageModel } from "@/services/ai/core";
    ```

2.  **Update the `sendMessage` callback:**
    *   Get `selectedProviderKey` from `useAgentChatStore`.
    *   Replace direct `AgentLanguageModel.Tag` resolution and usage with calls to `ChatOrchestratorService.streamConversation`.
    *   Construct `PreferredProviderConfig` and options for the orchestrator.

    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... inside useAgentChat function ...
    const runtimeRef = useRef(getMainRuntime());
    const { selectedProviderKey } = useAgentChatStore(); // Get selected provider

    // ... inside sendMessage useCallback ...
    const sendMessage = useCallback(
      async (promptText: string) => {
        // ... (userMessage setup, isLoading, setError, telemetry as before) ...

        const preferredProvider: PreferredProviderConfig = {
          key: selectedProviderKey,
          // modelName: "default-model-for-provider" // If you have model selection per provider
        };
        const currentProviderInfo = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);

        const conversationHistoryForOrchestrator = [
          { role: "system", content: initialSystemMessage, timestamp: Date.now() } as AgentChatMessage,
          ...conversationHistoryForLLM, // This should be AgentChatMessage[]
        ];

        const orchestratorOptions: Parameters<ChatOrchestratorService['streamConversation']>[0]['options'] = {
          // model: preferredProvider.modelName, // Pass if orchestrator or underlying provider needs it
          temperature: 0.7, // Example, make this configurable if needed
          maxTokens: 2048,  // Example
        };

        const program = Effect.gen(function* (_) {
          const orchestrator = yield* _(ChatOrchestratorService);
          // ... (telemetry for orchestrator resolved) ...

          console.log(
            "[useAgentChat] Orchestrator: Starting stream via provider:",
            selectedProviderKey,
            "for message:", assistantMsgId
          );

          const textStream = orchestrator.streamConversation({
            messages: conversationHistoryForOrchestrator,
            preferredProvider: preferredProvider,
            options: orchestratorOptions,
          });

          yield* _(
            Stream.runForEach(textStream, (chunk: AiResponse) => // Expecting your core AiResponse
              Effect.sync(() => {
                if (signal.aborted) { /* ... */ return; }
                setMessages((prevMsgs) =>
                  prevMsgs.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content: (msg.content || "") + chunk.text,
                          _updateId: Date.now(),
                          providerInfo: currentProviderInfo
                            ? {
                                name: currentProviderInfo.name,
                                type: currentProviderInfo.type as "local" | "network",
                                model: currentProviderInfo.modelName,
                              }
                            : undefined,
                        }
                      : msg,
                  ),
                );
                // ... (logging as before) ...
              }),
            { signal },
            ),
          );
        }).pipe(
          Effect.provide(runtimeRef.current),
          // ... (rest of tapErrorCause and ensuring blocks as before) ...
        );
        Effect.runFork(program);
      },
      [messages, initialSystemMessage, runTelemetry, selectedProviderKey],
    );
    // ...
    ```

---

**II. Update `src/services/ai/orchestration/ChatOrchestratorService.ts`**

1.  **Import NIP-90 specific layers and types:**
    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... existing imports ...
    import { AgentLanguageModel } from "@/services/ai/core";
    import { NIP90AgentLanguageModelLiveLayer } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
    import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
    // Import LIVE layers for NIP90 dependencies
    import { NIP90ServiceLive } from "@/services/nip90";
    import { NostrServiceLive } from "@/services/nostr";
    import { NIP04ServiceLive } from "@/services/nip04";
    // TelemetryServiceLive is already imported if telemetryLayer is used

    import type { Provider as EffectAiProvider } from "@effect/ai"; // Type from @effect/ai
    // OllamaAsOpenAIClientTag might not be needed if OllamaAgentLanguageModelLive directly uses its client
    // import { OllamaOpenAIClientTag } from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
    ```

2.  **Enhance `getResolvedAiModelProvider` to handle "nip90_devstral":**
    *   This function must construct the `NIP90AgentLanguageModelLiveLayer` correctly, providing all its dependencies.

    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... inside ChatOrchestratorServiceLive / getResolvedAiModelProvider helper function ...
    // ...

    // Helper function to run telemetry (avoids repeating Effect.provide)
    const runTel = (event: TelemetryEvent) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));


    // --- Helper to build an AiModel<Provider<AgentLanguageModel>, never> for a given provider config ---
    const getResolvedAiModelProvider = (
      providerConfigFromHook: PreferredProviderConfig,
    ): Effect.Effect<
      EffectAiProvider.Provider<AgentLanguageModel>, // Expecting the Provider wrapper from @effect/ai
      AiConfigurationError | AiProviderError,
      // This context implies these services are available in ChatOrchestratorServiceLive's environment
      ConfigurationService | HttpClient.HttpClient | TelemetryService | NIP90Service | NostrService | NIP04Service | OllamaOpenAIClientTag // Ollama's client if needed
    > => Effect.gen(function* (_) {
      const { key: providerKey, modelName: modelNameOverride } = providerConfigFromHook;
      let specificAiModelProviderEffect: Effect.Effect<EffectAiProvider.Provider<AgentLanguageModel>, AiConfigurationError | AiProviderError, any>;

      runTel({ /* ... */ });

      switch (providerKey.toLowerCase()) {
        // ... existing cases for openai, anthropic, ollama ...
        // Important: Ensure Ollama case uses OllamaAgentLanguageModelLiveLayer, not OpenAI directly for Ollama.

        case "ollama_gemma3_1b": { // Example key for Ollama
            const modelName = yield* _(getModelName(configService, "OLLAMA", modelNameOverride, "gemma3:1b"));
            const { OllamaAgentLanguageModelLiveLayer } = yield* _(Effect.promise(() => import("@/services/ai/providers/ollama")));
            const { OllamaAsOpenAIClientLive } = yield* _(Effect.promise(() => import("@/services/ai/providers/ollama/OllamaAsOpenAIClientLive")));

            // OllamaAgentLanguageModelLiveLayer depends on OllamaAsOpenAIClientLive (which provides OpenAiClient.OpenAiClient for Ollama)
            // And OllamaAsOpenAIClientLive depends on TelemetryService (already in context)
            // And ConfigurationService (for OLLAMA_BASE_URL, via UiOllamaConfigLive in ollamaAdapterLayer)
            const ollamaClientLayerForThisModel = OllamaAsOpenAIClientLive.pipe(
                 // Assuming TelemetryService is already in the outer context of ChatOrchestratorServiceLive
                 // Layer.provide(Layer.succeed(TelemetryService, telemetry)), // This is redundant if telemetry is already in context
                 // ConfigurationService is also assumed to be in the outer context
            );

            const ollamaLMServiceInstanceEffect = OllamaAgentLanguageModelLiveLayer.pipe(
                Layer.provide(ollamaClientLayerForThisModel),
                Layer.provide(Layer.succeed(ConfigurationService, configService)), // It needs its own model name config
                Layer.provide(Layer.succeed(TelemetryService, telemetry)), // And telemetry
                Layer.buildAndGet(AgentLanguageModel.Tag)
            );
            specificAiModelProviderEffect = Effect.map(ollamaLMServiceInstanceEffect, serviceInstance => ({
                use: <A_INNER, E_INNER, R_INNER>(effectToRun: Effect.Effect<A_INNER, E_INNER, R_INNER | AgentLanguageModel>) =>
                    Effect.provideService(effectToRun, AgentLanguageModel.Tag, serviceInstance)
            })) as any;
            break;
        }


        case "nip90_devstral": { // Your key for the NIP-90 DVM provider
          runTel({ category: "orchestrator", action: "get_resolved_model_attempt_nip90", label: providerKey });

          const dvmPubkey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(Effect.orElseSucceed(() => "default_dvm_pk_if_missing")));
          const relaysStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_RELAYS").pipe(Effect.orElseSucceed(() => "[]")));
          const relays = JSON.parse(relaysStr); // TODO: Add error handling for JSON.parse
          const reqKindStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
          const reqKind = parseInt(reqKindStr, 10);
          const reqEncryptionStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
          const useEphemeralStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
          const modelIdFromConfig = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "devstral_default_model")));

          const devstralSpecificNip90Config: NIP90ProviderConfig = {
            modelName: modelNameOverride || modelIdFromConfig,
            isEnabled: true,
            dvmPubkey: dvmPubkey,
            dvmRelays: relays,
            requestKind: !isNaN(reqKind) ? reqKind : 5050,
            requiresEncryption: reqEncryptionStr === "true",
            useEphemeralRequests: useEphemeralStr === "true",
            modelIdentifier: modelIdFromConfig,
          };

          const DevstralConfigLayerForNIP90 = Layer.succeed(NIP90ProviderConfigTag, devstralSpecificNip90Config);

          // NIP90AgentLanguageModelLiveLayer provides AgentLanguageModel.Tag.
          // It needs NIP90ProviderConfigTag (which we just created),
          // and NIP90Service, NostrService, NIP04Service, TelemetryService.
          // These global services (NIP90ServiceLive, etc.) MUST be in the context
          // that ChatOrchestratorServiceLive itself runs in (i.e., provided by FullAppLayer).
          const nip90LMServiceInstanceEffect = NIP90AgentLanguageModelLiveLayer.pipe(
            Layer.provide(DevstralConfigLayerForNIP90),
            // The following are assumed to be in the orchestrator's context:
            // Layer.provide(NIP90ServiceLive),
            // Layer.provide(NostrServiceLive),
            // Layer.provide(NIP04ServiceLive),
            // Layer.provide(Layer.succeed(TelemetryService, telemetry)), // telemetry is available in this Effect.gen
            Layer.buildAndGet(AgentLanguageModel.Tag) // Get the AgentLanguageModel instance
          );

          // Wrap the AgentLanguageModel service instance in a Provider structure for AiPlan
          specificAiModelProviderEffect = Effect.map(nip90LMServiceInstanceEffect, serviceInstance => ({
            use: <A_INNER, E_INNER, R_INNER>(effectToRun: Effect.Effect<A_INNER, E_INNER, R_INNER | AgentLanguageModel>) =>
              Effect.provideService(effectToRun, AgentLanguageModel.Tag, serviceInstance)
          })) as any; // Cast as AiModel-like for AiPlan.make
          break;
        }
        default:
          runTel({ /* ... unknown provider ... */ });
          return yield* _(Effect.fail(new AiConfigurationError({ message: `Unsupported provider key: ${providerKey}` })));
      }
      // This specificAiModelProviderEffect should yield Provider<AgentLanguageModel>
      return yield* _(specificAiModelProviderEffect);
    });
    // ...
    // The rest of the streamConversation method in ChatOrchestratorService:
    // ...
    const planSteps = [preferredProviderConfigFromHook, ...fallbackProviders].map(
      (pConfig) => ({
        model: getResolvedAiModelProvider(pConfig), // This is Effect<Provider<AgentLanguageModel>, ...>
        // ... attempts, schedule, while ...
      }),
    );

    // @ts-ignore - Bypassing complex AiPlan type for now, assuming structure is compatible
    const plan = AiPlan.make(...planSteps);
    const planProvider = yield* _(plan); // Builds the plan into a Provider<AgentLanguageModel>

    const conversationHistoryObject = { messages }; // Should match @effect/ai 'prompt' structure if different
    const streamOptionsForProvider: StreamTextOptions = {
      ...options, // from hook
      prompt: JSON.stringify(conversationHistoryObject), // Ensure prompt is stringified if underlying providers expect it
      model: preferredProviderConfigFromHook.modelName, // Pass model name from the specific config
    };

    return planProvider.streamText(streamOptionsForProvider) // Call streamText on the resolved provider from the plan
      .pipe(
          // Tap errors from the plan execution
          Stream.tapError((err) => runTel({
            category: "orchestrator",
            action: "stream_conversation_error_final",
            label: err instanceof Error ? err.message : String(err)
          }))
      );
    // ...
    ```

---

**III. Verify `src/services/runtime.ts` (`FullAppLayer`)**

1.  Ensure `ChatOrchestratorServiceLive` is part of `FullAppLayer`.
2.  Crucially, `FullAppLayer` must also provide all the *dependencies* that `NIP90AgentLanguageModelLiveLayer` (and `OllamaAgentLanguageModelLiveLayer`, `OpenAIAgentLanguageModelLiveLayer`) require. These are:
    *   `NIP90ServiceLive`
    *   `NostrServiceLive`
    *   `NIP04ServiceLive`
    *   `TelemetryServiceLive`
    *   `ConfigurationServiceLive`
    *   `HttpClient.Tag` (via `BrowserHttpClient.layerXMLHttpRequest`)
    *   `OllamaOpenAIClientTag` (provided by `ollamaAdapterLayer` which itself needs `UiOllamaConfigLive`, `TelemetryServiceLive`, etc.)
    *   `OpenAiClient.OpenAiClient` (provided by `OpenAIClientLive` which needs `ConfigurationServiceLive`, `HttpClient.Tag`, `TelemetryServiceLive`)

    Your `FullAppLayer` composition:
    ```typescript
    // src/services/runtime.ts
    // ...
    // Ensure these layers are correctly defined and included
    const ollamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
      Layer.provide(Layer.mergeAll(UiOllamaConfigLive, telemetryLayer)) // HttpClient provided by baseLayer
    );

    // OllamaAgentLanguageModelLiveLayer needs ollamaAdapterLayer for OpenAiClient.OpenAiClient (Ollama's version)
    const ollamaLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(
      Layer.provide(Layer.mergeAll(ollamaAdapterLayer, devConfigLayer, telemetryLayer))
    );

    // If you had an OpenAI specific Language Model Layer:
    // const openAIClientLayer = OpenAIProvider.OpenAIClientLive.pipe( /* ... its deps ... */ );
    // const openAIAgentLanguageModelLayer = OpenAIProvider.OpenAIAgentLanguageModelLiveLayer.pipe(
    //   Layer.provide(Layer.mergeAll(openAIClientLayer, devConfigLayer, telemetryLayer))
    // );

    // The NIP90AgentLanguageModelLiveLayer itself should be available to be built by the orchestrator.
    // So, its direct dependencies (NIP90ServiceLive, etc.) need to be in FullAppLayer.
    const nip90ServiceLayer = NIP90ServiceLive.pipe(Layer.provide(Layer.mergeAll(nostrLayer, nip04Layer, telemetryLayer)));

    const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
      Layer.provide(Layer.mergeAll(
        devConfigLayer, // For ConfigurationService
        BrowserHttpClient.layerXMLHttpRequest, // For HttpClient
        telemetryLayer, // For TelemetryService
        // Ensure services needed by NIP90AgentLanguageModelLive are here or in baseLayer for orchestrator
        nip90ServiceLayer,
        nostrLayer, // Already part of nip90ServiceLayer composition effectively
        nip04Layer,   // Already part of nip90ServiceLayer composition effectively
        // The orchestrator will build specific client layers (like ollamaAdapterLayer or a new one for OpenAI) internally
        // So FullAppLayer doesn't need to provide OpenAiClient.OpenAiClient directly to the orchestrator,
        // but it needs to provide HttpClient and ConfigService for the orchestrator to build those clients.
      ))
    );

    export const FullAppLayer = Layer.mergeAll(
      telemetryLayer,
      devConfigLayer,
      BrowserHttpClient.layerXMLHttpRequest,
      nostrLayer,
      nip04Layer,
      NIP19ServiceLive,
      BIP39ServiceLive,
      BIP32ServiceLive,
      nip28Layer,
      sparkLayer,
      nip90ServiceLayer, // Ensure NIP90Service is available for the orchestrator to build NIP90AgentLanguageModelLive
      ollamaLanguageModelLayer, // Provide one AgentLanguageModel as default/fallback IF orchestrator is not the sole provider
      // openAIAgentLanguageModelLayer, // If you have it
      chatOrchestratorLayer, // This is key
      kind5050DVMLayer,
    );
    ```
    **Refinement for `FullAppLayer`:** The `ChatOrchestratorService` dynamically builds the chosen `AgentLanguageModel` provider. So, `FullAppLayer` should primarily provide `ChatOrchestratorServiceLive` and *all the base services* that any of the concrete `AgentLanguageModel` providers (Ollama, NIP-90, OpenAI) might need. The `AgentLanguageModel.Tag` itself might not be directly provided in `FullAppLayer` anymore if `useAgentChat` only uses the orchestrator.

    The `getResolvedAiModelProvider` method in `ChatOrchestratorServiceLive` needs access to the *Live Layers* of individual components (like `NIP90ServiceLive`, `NostrServiceLive`, `NIP04ServiceLive`, and `NIP90AgentLanguageModelLiveLayer` itself's definition) to construct the full dependency chain for the NIP-90 provider. It might be cleaner if `FullAppLayer` provides fully built concrete providers under specific tags, and the orchestrator selects from those. However, the current Phase 6 design for the orchestrator builds them dynamically.

---

**IV. Verify `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`**

1.  Ensure the `streamText` method correctly handles parsing the input `prompt` (which might be a JSON string from `useAgentChat`) and uses `NIP90ProviderConfigTag` for its DVM parameters.
2.  The `NIP90AgentLanguageModelLiveLayer` should be exported.

---

**V. Confirm Configuration in `src/services/configuration/ConfigurationServiceImpl.ts`**

1.  Ensure `DefaultDevConfigLayer` (or your actual config source) includes all necessary keys for `"nip90_devstral"`:
    *   `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY`
    *   `AI_PROVIDER_DEVSTRAL_RELAYS` (JSON string array)
    *   `AI_PROVIDER_DEVSTRAL_REQUEST_KIND`
    *   `AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION`
    *   `AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS`
    *   `AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER` (used as `modelName` in `NIP90ProviderConfig`)
    *   `AI_PROVIDER_DEVSTRAL_ENABLED`

This approach ensures that:
- `useAgentChat` correctly uses the user's provider selection.
- `ChatOrchestratorService` handles the dynamic instantiation of the selected provider.
- The NIP-90 provider is correctly configured and its dependencies are met.

After these changes, selecting "devstral" should route requests through `NIP90AgentLanguageModelLive` via the `ChatOrchestratorService`. The telemetry should reflect calls to the NIP-90 provider and not Ollama when Devstral is selected.Okay, Agent, this is a critical fix. The telemetry clearly shows that the application is defaulting to Ollama (`OllamaAgentLanguageModelLive`) even when "devstral" (NIP-90) is selected. This means the provider selection mechanism isn't correctly influencing which `AgentLanguageModel` implementation is used.

**Root Cause:**

The `useAgentChat.ts` hook is likely resolving `AgentLanguageModel.Tag` from the global runtime, which is hardwired in `FullAppLayer` to provide the Ollama implementation. It's not dynamically choosing the NIP-90 provider based on the selection stored in `agentChatStore`.

The fix involves ensuring that `useAgentChat.ts` uses the `ChatOrchestratorService` (as intended in Phase 6), which *can* dynamically select and build the correct provider implementation based on the user's choice.

Here are the precise instructions:

---

**I. Modify `src/hooks/ai/useAgentChat.ts`**

1.  **Import `ChatOrchestratorService` and related types:**
    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... existing imports ...
    import {
      ChatOrchestratorService,
      type PreferredProviderConfig,
    } from "@/services/ai/orchestration";
    import { useAgentChatStore } from "@/stores/ai/agentChatStore";
    import { AiResponse } from "@/services/ai/core/AiResponse"; // Your core AiResponse
    // Remove or comment out direct import of AgentLanguageModel.Tag if not used for requests
    // import { AgentLanguageModel } from "@/services/ai/core";
    ```

2.  **Update the `sendMessage` callback:**
    *   Get `selectedProviderKey` from `useAgentChatStore`.
    *   Replace direct `AgentLanguageModel.Tag` resolution and usage with calls to `ChatOrchestratorService.streamConversation`.
    *   Construct `PreferredProviderConfig` and options for the orchestrator.

    ```typescript
    // src/hooks/ai/useAgentChat.ts
    // ... inside useAgentChat function ...
    const runtimeRef = useRef(getMainRuntime());
    const { selectedProviderKey } = useAgentChatStore();

    // ... inside sendMessage useCallback ...
    const sendMessage = useCallback(
      async (promptText: string) => {
        // ... (userMessage setup, setIsLoading, setError, telemetry as before) ...

        const preferredProvider: PreferredProviderConfig = {
          key: selectedProviderKey,
          // modelName: "default-model-for-provider" // If you have model selection per provider
        };
        const currentProviderInfo = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);

        const conversationHistoryForOrchestrator = [
          { role: "system", content: initialSystemMessage, timestamp: Date.now() } as AgentChatMessage,
          ...conversationHistoryForLLM,
        ];

        const orchestratorOptions: Parameters<ChatOrchestratorService['streamConversation']>[0]['options'] = {
          temperature: 0.7,
          maxTokens: 2048,
        };

        const program = Effect.gen(function* (_) {
          const orchestrator = yield* _(ChatOrchestratorService);
          yield* _(
            telemetry.trackEvent({
              category: "agent_chat",
              action: "chat_orchestrator_resolved_successfully",
              label: `Orchestrator resolved for provider: ${selectedProviderKey}`,
              value: assistantMsgId,
            })
          );

          console.log(
            "[useAgentChat] Orchestrator: Starting stream via provider:",
            selectedProviderKey,
            "for message:", assistantMsgId
          );

          const textStream = orchestrator.streamConversation({
            messages: conversationHistoryForOrchestrator,
            preferredProvider: preferredProvider,
            options: orchestratorOptions,
          });

          yield* _(
            Stream.runForEach(textStream, (chunk: AiResponse) =>
              Effect.sync(() => {
                if (signal.aborted) { /* ... */ return; }
                setMessages((prevMsgs) =>
                  prevMsgs.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content: (msg.content || "") + chunk.text,
                          _updateId: Date.now(),
                          providerInfo: currentProviderInfo
                            ? {
                                name: currentProviderInfo.name,
                                type: currentProviderInfo.type as "local" | "network",
                                model: currentProviderInfo.modelName,
                              }
                            : undefined,
                        }
                      : msg,
                  ),
                );
              }),
            { signal },
            ),
          );
        }).pipe(
          Effect.provide(runtimeRef.current),
          // ... (rest of tapErrorCause and ensuring blocks as before) ...
        );
        Effect.runFork(program);
      },
      [messages, initialSystemMessage, runTelemetry, selectedProviderKey],
    );
    // ...
    ```

---

**II. Update `src/services/ai/orchestration/ChatOrchestratorService.ts`**

1.  **Import NIP-90 specific layers and types:**
    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... existing imports ...
    import { AgentLanguageModel } from "@/services/ai/core";
    import { NIP90AgentLanguageModelLiveLayer } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
    import { NIP90ProviderConfigTag, type NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
    import { NIP90ServiceLive, NIP90Service } from "@/services/nip90";
    import { NostrServiceLive, NostrService } from "@/services/nostr";
    import { NIP04ServiceLive, NIP04Service } from "@/services/nip04";
    import { TelemetryServiceLive } from "@/services/telemetry"; // Already imported if telemetryLayer is used
    import type { Provider as EffectAiProvider } from "@effect/ai";
    import { OpenAiClient } from "@effect/ai-openai"; // For Ollama client tag
    import { OllamaOpenAIClientTag } from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
    ```

2.  **Enhance `getResolvedAiModelProvider` to handle `"nip90_devstral"` and fix Ollama case:**

    ```typescript
    // src/services/ai/orchestration/ChatOrchestratorService.ts
    // ... inside ChatOrchestratorServiceLive Layer.effect ...
    // const telemetry = yield* _(TelemetryService); // Already defined
    // const configService = yield* _(ConfigurationService); // Already defined
    // const httpClient = yield* _(HttpClient.HttpClient); // Already defined

    const runTel = (event: TelemetryEvent) => Effect.runFork(telemetry.trackEvent(event).pipe(Effect.ignoreLogged));

    const getModelName = (
      // ... (getModelName helper from Phase 6 if it exists, otherwise define it here)
      configService: ConfigurationService,
      providerKey: string,
      overrideModelName?: string,
      defaultModel?: string,
    ): Effect.Effect<string, AiConfigurationError> => {
      if (overrideModelName) return Effect.succeed(overrideModelName);
      return configService.get(`${providerKey}_MODEL_NAME`).pipe(
        Effect.orElseSucceed(() => defaultModel || "default-model-not-set"),
        Effect.catchTag("ConfigError", (e) =>
          Effect.fail(
            new AiConfigurationError({
              message: `Error fetching ${providerKey} Model Name configuration.`,
              cause: e,
              context: { keyName: `${providerKey}_MODEL_NAME` },
            }),
          ),
        ),
      );
    };


    const getResolvedAiModelProvider = (
      providerConfigFromHook: PreferredProviderConfig,
    ): Effect.Effect<
      EffectAiProvider.Provider<AgentLanguageModel>,
      AiConfigurationError | AiProviderError,
      // Dependencies that getResolvedAiModelProvider itself needs from its parent context (ChatOrchestratorServiceLive)
      // These are HttpClient, TelemetryService, ConfigurationService, and all specific client/service Tags
      // that are NOT dynamically created within this function.
      | HttpClient.HttpClient
      | TelemetryService
      | ConfigurationService
      | NIP90Service
      | NostrService
      | NIP04Service
      | OpenAiClient // For Ollama and OpenAI providers
      // Add AnthropicClient.Tag if/when Anthropic is implemented
    > => Effect.gen(function* (_) {
      const { key: providerKey, modelName: modelNameOverride } = providerConfigFromHook;
      let specificAiModelProviderEffect: Effect.Effect<EffectAiProvider.Provider<AgentLanguageModel>, AiConfigurationError | AiProviderError, any>;

      runTel({ category: "orchestrator", action: "get_resolved_model_start", label: providerKey, value: modelNameOverride });

      switch (providerKey.toLowerCase()) {
        case "ollama_gemma3_1b": { // Key for Ollama
          const modelName = yield* _(getModelName(configService, "OLLAMA", modelNameOverride, "gemma3:1b"));
          const { OllamaAgentLanguageModelLiveLayer } = yield* _(Effect.promise(() => import("@/services/ai/providers/ollama")));
          const { OllamaAsOpenAIClientLive } = yield* _(Effect.promise(() => import("@/services/ai/providers/ollama/OllamaAsOpenAIClientLive")));

          // OllamaAgentLanguageModelLiveLayer needs OllamaAsOpenAIClientLive (which provides OpenAiClient.OpenAiClient for Ollama)
          // It also needs ConfigurationService (for OLLAMA_MODEL_NAME) and TelemetryService.
          // HttpClient is needed by OllamaAsOpenAIClientLive (indirectly via UiOllamaConfigLive if it makes direct calls, or if OllamaService itself needs it)
          const ollamaClientAdapterLayer = OllamaAsOpenAIClientLive.pipe(
            // These are already in ChatOrchestratorServiceLive's context, no need to re-provide if accessed via yield* _(...)
            // Layer.provide(Layer.succeed(TelemetryService, telemetry)),
            // Layer.provide(Layer.succeed(ConfigurationService, configService))
          );

          const ollamaLMServiceInstanceEffect = OllamaAgentLanguageModelLiveLayer.pipe(
            Layer.provide(ollamaClientAdapterLayer), // Provides OpenAiClient.Tag (Ollama's version)
            Layer.provide(Layer.succeed(ConfigurationService, configService)), // For OLLAMA_MODEL_NAME
            Layer.provide(Layer.succeed(TelemetryService, telemetry)),     // For telemetry within Ollama's LM
            Layer.buildAndGet(AgentLanguageModel.Tag)
          );

          specificAiModelProviderEffect = Effect.map(ollamaLMServiceInstanceEffect, serviceInstance => ({
            use: <A_INNER, E_INNER, R_INNER>(effectToRun: Effect.Effect<A_INNER, E_INNER, R_INNER | AgentLanguageModel>) =>
              Effect.provideService(effectToRun, AgentLanguageModel.Tag, serviceInstance)
          })) as any;
          break;
        }

        case "nip90_devstral": {
          runTel({ category: "orchestrator", action: "get_resolved_model_attempt_nip90", label: providerKey });

          const dvmPubkey = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(Effect.orElseSucceed(() => "default_dvm_pk_if_missing")));
          const relaysStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_RELAYS").pipe(Effect.orElseSucceed(() => "[]")));
          const relays = JSON.parse(relaysStr);
          const reqKindStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
          const reqKind = parseInt(reqKindStr, 10);
          const reqEncryptionStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
          const useEphemeralStr = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
          const modelIdFromConfig = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "devstral")));

          const devstralSpecificNip90Config: NIP90ProviderConfig = {
            modelName: modelNameOverride || modelIdFromConfig,
            isEnabled: true,
            dvmPubkey,
            dvmRelays: relays,
            requestKind: !isNaN(reqKind) ? reqKind : 5050,
            requiresEncryption: reqEncryptionStr === "true",
            useEphemeralRequests: useEphemeralStr === "true",
            modelIdentifier: modelIdFromConfig,
          };

          const DevstralNIP90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, devstralSpecificNip90Config);

          // NIP90AgentLanguageModelLiveLayer provides AgentLanguageModel.Tag.
          // It depends on: NIP90Service, NostrService, NIP04Service, TelemetryService, NIP90ProviderConfigTag.
          // These dependencies must be available in the current Effect context (which they are if ChatOrchestratorServiceLive receives them).
          const nip90LMServiceInstanceEffect = NIP90AgentLanguageModelLiveLayer.pipe(
            Layer.provide(DevstralNIP90ConfigLayer),
            // The following will be resolved from the context ChatOrchestratorServiceLive runs in:
            // Layer.provide(Layer.succeed(NIP90Service, yield* _(NIP90Service))),
            // Layer.provide(Layer.succeed(NostrService, yield* _(NostrService))),
            // Layer.provide(Layer.succeed(NIP04Service, yield* _(NIP04Service))),
            // Layer.provide(Layer.succeed(TelemetryService, telemetry)),
            Layer.buildAndGet(AgentLanguageModel.Tag)
          );

          specificAiModelProviderEffect = Effect.map(nip90LMServiceInstanceEffect, serviceInstance => ({
            use: <A_INNER, E_INNER, R_INNER>(effectToRun: Effect.Effect<A_INNER, E_INNER, R_INNER | AgentLanguageModel>) =>
              Effect.provideService(effectToRun, AgentLanguageModel.Tag, serviceInstance)
          })) as any;
          break;
        }
        // ... other provider cases (OpenAI, Anthropic) should follow a similar pattern,
        // building their respective AgentLanguageModelLiveLayer and providing necessary client + config.
        default:
          runTel({ category: "orchestrator", action: "get_resolved_model_unknown_provider", label: providerKey });
          return yield* _(Effect.fail(new AiConfigurationError({ message: `Unsupported provider key: ${providerKey}` })));
      }
      return yield* _(specificAiModelProviderEffect);
    }).pipe(
        Effect.mapError((err) => { /* ... map error ... */ })
    );
    // ...
    // In streamConversation method:
    // ...
    const planSteps = [preferredProviderConfigFromHook, ...fallbackProviders].map(
      (pConfig) => ({
        model: getResolvedAiModelProvider(pConfig).pipe(
          // Ensure that the R channel (dependencies) for getResolvedAiModelProvider is satisfied
          // by the context ChatOrchestratorServiceLive runs in.
          // This means FullAppLayer must provide NIP90Service, NostrService, NIP04Service, HttpClient, etc.
          // which are then available to ChatOrchestratorServiceLive.
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(ConfigurationService, configService),
              Layer.succeed(HttpClient.HttpClient, httpClient), // General HttpClient
              Layer.succeed(TelemetryService, telemetry),
              // Provide other global services needed by getResolvedAiModelProvider's cases
              // e.g. if a case builds OpenAiClient.OpenAiClient, it needs OpenAiClient.Tag
              Layer.succeed(NIP90Service, yield* _(NIP90Service)), // These are already in the context of ChatOrchestratorServiceLive
              Layer.succeed(NostrService, yield* _(NostrService)),
              Layer.succeed(NIP04Service, yield* _(NIP04Service)),
              Layer.succeed(OllamaOpenAIClientTag, yield* _(OllamaOpenAIClientTag)), // For Ollama's specific client
              // Add OpenAIClient.OpenAiClient here if needed for a direct OpenAI provider
            )
          )
        ),
        // ... attempts, schedule, while ...
      }),
    );

    const plan = AiPlan.make(...planSteps); // This might need a type hint if TypeScript struggles
    const planProvider = yield* _(plan);

    const promptObjectForProvider = { messages }; // Format for the @effect/ai providers
    const streamOptionsForProvider: StreamTextOptions = {
      ...options,
      prompt: JSON.stringify(promptObjectForProvider), // Or however the provider expects its prompt
      model: preferredProviderConfigFromHook.modelName,
    };

    return planProvider.streamText(streamOptionsForProvider).pipe(/* ... */);
    // ...
    ```

---

**III. Verify `src/services/runtime.ts` (`FullAppLayer`)**

1.  Ensure `ChatOrchestratorServiceLive` is correctly composed into `FullAppLayer`.
2.  `FullAppLayer` must provide all dependencies that `ChatOrchestratorServiceLive` itself needs, and also all dependencies that the *dynamic provider construction* within `getResolvedAiModelProvider` might need. This includes:
    *   `ConfigurationServiceLive`
    *   `HttpClient.Tag` (e.g., `BrowserHttpClient.layerXMLHttpRequest`)
    *   `TelemetryServiceLive`
    *   `NIP90ServiceLive`
    *   `NostrServiceLive`
    *   `NIP04ServiceLive`
    *   `OllamaAsOpenAIClientLive` (for `OllamaOpenAIClientTag`)
    *   `OpenAIClientLive` (if you have a direct OpenAI provider, for `OpenAiClient.OpenAiClient`)

    Your `FullAppLayer` from the logs looks mostly correct, but ensure all these are effectively provided to the context `ChatOrchestratorServiceLive` runs in.

    The key part of `FullAppLayer` to verify:
    ```typescript
    // src/services/runtime.ts
    // ... (definitions for telemetryLayer, devConfigLayer, httpClientLayer, nostrLayer, nip04Layer, ollamaAdapterLayer etc.)

    // Ensure NIP90Service is available
    const nip90ServiceLayer = NIP90ServiceLive.pipe(
      Layer.provide(Layer.mergeAll(nostrLayer, nip04Layer, telemetryLayer))
    );

    const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
      Layer.provide(Layer.mergeAll(
        devConfigLayer,                     // Provides ConfigurationService
        BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient.Tag
        telemetryLayer,                     // Provides TelemetryService
        nip90ServiceLayer,                  // Provides NIP90Service
        nostrLayer,                         // Provides NostrService (also dep of nip90ServiceLayer)
        nip04Layer,                         // Provides NIP04Service (also dep of nip90ServiceLayer)
        ollamaAdapterLayer,                 // Provides OllamaOpenAIClientTag
        // Add OpenAIClientLive here if OpenAI provider case is added to orchestrator
        // OpenAIClientLive,
      ))
    );

    export const FullAppLayer = Layer.mergeAll(
      telemetryLayer,
      devConfigLayer,
      BrowserHttpClient.layerXMLHttpRequest,
      nostrLayer,
      nip04Layer,
      NIP19ServiceLive,
      BIP39ServiceLive,
      BIP32ServiceLive,
      nip28Layer,
      sparkLayer,
      nip90ServiceLayer, // Make NIP90Service directly available if NIP90AgentLanguageModelLive needs it
      ollamaAdapterLayer, // Make Ollama's client adapter available
      // Do NOT provide AgentLanguageModel.Tag directly here if orchestrator is the sole entry point.
      // Or, provide a default/fallback AgentLanguageModel if orchestrator is optional.
      // For this fix, assuming orchestrator is primary:
      // ollamaLanguageModelLayer, // This might be removed if only used via orchestrator

      chatOrchestratorLayer, // This now effectively provides AgentLanguageModel through its methods
      kind5050DVMLayer,      // This should also use ChatOrchestratorService if it makes AI calls
    );
    ```

---

**IV. Verify `NIP90AgentLanguageModelLive.ts`**

1.  Ensure it correctly uses `NIP90ProviderConfigTag` (which will be provided by the orchestrator).
2.  Confirm that `parsePromptMessages` correctly handles the stringified JSON of `AgentChatMessage[]` passed from `useAgentChat` via the orchestrator.
3.  The `streamText` method should emit `AiResponse` objects as expected by `useAgentChat`.

---

**Rationale:**

*   By making `useAgentChat` use `ChatOrchestratorService`, we centralize provider selection and AI plan execution.
*   The `ChatOrchestratorService` can then dynamically build and provide the correct `AgentLanguageModel` implementation (Ollama, NIP-90, OpenAI, etc.) with all its specific dependencies.
*   This ensures that the user's selection in the UI (`selectedProviderKey`) is honored.

After these changes, when "devstral" is selected, `useAgentChat` will invoke the `ChatOrchestratorService`, which in turn will instantiate and use `NIP90AgentLanguageModelLive` with the correct configuration for "devstral". Telemetry should then reflect NIP-90 related actions rather than Ollama.
