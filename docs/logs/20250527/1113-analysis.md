Okay, Agent, this runtime error "Service not found: ConfigurationService" during the reinitialization of the Effect runtime (triggered by `walletStore`) indicates a problem with layer composition or dependency resolution, specifically when `ProviderFactoryServiceImpl.ts` is being constructed.

The error is likely occurring because `ProviderFactoryServiceLive` attempts to resolve `ConfigurationService` (and other services) within its main `Layer.effect(Effect.gen(...))` constructor block. While you correctly provide dependencies to this layer in `runtime.ts`, the reinitialization process might be exposing a subtle issue where `ConfigurationService` isn't available in the context *at the exact moment* `ProviderFactoryServiceLive`'s constructor effect is being run.

**The core principle to fix this is: A service's `Layer` constructor effect should be minimal. Dependencies required by the service's *methods* should be resolved when those methods are called, inheriting them from the context the methods run in.**

Here are the specific instructions to refactor `ProviderFactoryServiceImpl.ts` and update `runtime.ts`:

**I. Refactor `ProviderFactoryServiceImpl.ts`**

1.  **Modify `ProviderFactoryServiceLive` Layer Definition:**
    *   Change `ProviderFactoryServiceLive` to be a `Layer.succeed` or a `Layer.effect` with minimal dependencies (e.g., only if it needs some configuration for its own instantiation, not for its methods' dependencies).
    *   The service object methods (`createProvider`, `listProviders`) will now be `Effect`s that themselves declare their dependencies (like `ConfigurationService`, `TelemetryService`, etc.) in their `R` (requirements) channel.

    **Current problematic structure (conceptual):**
    ```typescript
    // ProviderFactoryServiceImpl.ts
    export const ProviderFactoryServiceLive = Layer.effect(
      ProviderFactoryService,
      Effect.gen(function* (_) { // Outer Gen for Layer Construction
        // Yielding all dependencies needed by methods HERE is problematic
        const config = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);
        // ...

        return ProviderFactoryService.of({
          createProvider: (providerKey, modelName) =>
            Effect.gen(function* (methodContext) { // Inner Gen for method execution
              // Uses 'config', 'telemetry' from outer scope
              // ...
            }).pipe(Effect.provide(/* context built from outer 'config', 'telemetry' */)),
          // ...
        });
      })
    );
    ```

    **Refactor to this structure:**
    ```typescript
    // src/services/ai/providers/ProviderFactoryServiceImpl.ts

    // (Keep existing imports)
    // ...
    // import { _Context } from "effect"; // Add this if using _Context.add

    export const ProviderFactoryServiceLive = Layer.succeed(
      ProviderFactoryService,
      ProviderFactoryService.of({
        _tag: "ProviderFactoryService",

        createProvider: (providerKey: string, modelName?: string): Effect.Effect<AgentLanguageModel, AiProviderError | AiConfigurationError,
          // Declare ALL services needed by ANY provider creation path here
          ConfigurationService | TelemetryService | OllamaService | NostrService | NIP04Service | NIP90Service | SparkService | AgentLanguageModel /* for defaultAgentLM if used */
        > =>
          Effect.gen(function* (_) {
            // Resolve dependencies *inside* the method's Effect
            const config = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);
            // ... resolve other needed services for specific provider logic below ...

            // --- Start of existing createProvider logic ---
            // (Telemetry logging within this method needs to be adjusted to use the yielded 'telemetry' service)
            // Example:
            // yield* _(telemetry.trackEvent({ category: "provider_factory", action: "create_provider_start", label: providerKey }));

            switch (providerKey) {
              case "ollama": {
                const ollama = yield* _(OllamaService); // Resolve OllamaService here
                const isEnabled = yield* _( /* ... config.get(...) ... */ );
                if (!isEnabled) { /* ... fail ... */ }

                const ollamaConfig = { modelName: modelName || (yield* _( /* config.get(...) */ )) };

                const ollamaModule = yield* _(
                  Effect.tryPromise({
                    try: () => import("./ollama/index.js"), // Ensure .js for NodeNext
                    catch: (error) => new AiProviderError({ /* ... */ })
                  })
                );

                const { OllamaAgentLanguageModelLiveLayer, OllamaAsOpenAIClientLive } = ollamaModule;

                // Build the Ollama specific layer, providing its specific needs
                const ollamaAgentLMLayer = OllamaAgentLanguageModelLiveLayer.pipe(
                  Layer.provide(OllamaAsOpenAIClientLive),
                  Layer.provide(Layer.succeed(OllamaService, ollama)), // Provide resolved ollama
                  Layer.provide(Layer.succeed(TelemetryService, telemetry)), // Provide resolved telemetry
                  Layer.provide(Layer.succeed(ConfigurationService, config)) // Provide resolved config
                );

                const ollamaAgentLM = yield* _(
                  Layer.build(ollamaAgentLMLayer).pipe(
                    Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                    Effect.scoped,
                    Effect.mapError((error) => new AiProviderError({ /* ... */ }))
                  )
                );
                return ollamaAgentLM;
              }

              case "claude_code": {
                // Claude Code logic largely remains the same as it uses window.electronAPI
                // which doesn't involve Effect services directly in its AgentLanguageModel methods.
                // Ensure any telemetry calls use the yielded 'telemetry' instance.
                const claudeCodeAgentLM: AgentLanguageModel = makeAgentLanguageModel({
                  generateText: (options: GenerateTextOptions) => Effect.gen(function* (_genCtx) {
                    yield* _(_genCtx(telemetry).trackEvent({ /* ... */})); // Example of using telemetry from method context
                    /* ... existing generateText logic ... */
                  }),
                  streamText: (options: StreamTextOptions) => Stream.asyncScoped((emit) => Effect.gen(function* (_genCtx) {
                    yield* _(_genCtx(telemetry).trackEvent({ /* ... */}));
                    /* ... existing streamText logic ... */
                  })),
                  generateStructured: (options: GenerateStructuredOptions) => Effect.fail(/* ... */)
                });
                return claudeCodeAgentLM;
              }

              default: {
                if (providerKey.startsWith("nip90:")) {
                  const nostr = yield* _(NostrService); // Resolve NIP-90 specific services
                  const nip04 = yield* _(NIP04Service);
                  const nip90 = yield* _(NIP90Service);
                  const spark = yield* _(SparkService);

                  const nip90Config = yield* _(Effect.gen(function* (_) { /* ... existing config fetch ... */ }));

                  const nip90Module = yield* _(
                    Effect.tryPromise({
                      try: () => import("./nip90/index.js"), // Ensure .js
                      catch: (error) => new AiProviderError({ /* ... */ })
                    })
                  );

                  const { NIP90AgentLanguageModelLive, NIP90ProviderConfigTag } = nip90Module;

                  const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);
                  const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
                    Layer.provide(nip90ConfigLayer),
                    Layer.provide(Layer.succeed(NIP90Service, nip90)),
                    Layer.provide(Layer.succeed(NostrService, nostr)),
                    Layer.provide(Layer.succeed(NIP04Service, nip04)),
                    Layer.provide(Layer.succeed(TelemetryService, telemetry)),
                    Layer.provide(Layer.succeed(SparkService, spark))
                  );

                  const nip90AgentLM = yield* _(
                    Layer.build(nip90AgentLMLayer).pipe(
                      Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                      Effect.scoped,
                      Effect.mapError((error) => new AiProviderError({ /* ... */ }))
                    )
                  );
                  return nip90AgentLM;
                }

                return yield* _(Effect.fail(new AiConfigurationError({ /* ... */ })));
              }
            }
            // --- End of existing createProvider logic ---
          }),

        listProviders: (): Effect.Effect<string[], never, ConfigurationService> => // Only needs ConfigurationService
          Effect.gen(function* (_) {
            const config = yield* _(ConfigurationService); // Resolve config for this method
            const providers: string[] = ["claude_code"];

            const ollamaEnabled = yield* _( /* ... config.get(...) ... */ );
            if (ollamaEnabled) providers.push("ollama");

            providers.push("nip90:testing_provider");
            return providers;
          })
      })
    );
    ```

**II. Update `src/services/runtime.ts`**

1.  **Simplify `providerFactoryLayer` Definition:**
    *   Since `ProviderFactoryServiceLive` is now likely a `Layer.succeed` or has minimal construction dependencies, it no longer needs a complex `Layer.provide(Layer.mergeAll(...))` for its *own construction*.
    *   Change:
        ```typescript
        // Old:
        // const providerFactoryLayer = ProviderFactoryServiceLive.pipe(
        //   Layer.provide(
        //     Layer.mergeAll(
        //       devConfigLayer, telemetryLayer, ollamaLayer, nostrLayer, nip04Layer, nip90Layer, sparkLayer,
        //     ),
        //   ),
        // );

        // New:
        const providerFactoryLayer = ProviderFactoryServiceLive; // Or if it had minimal construction deps: ProviderFactoryServiceLive.pipe(Layer.provide(MinimalDepLayer))
        ```

2.  **Augment `chatOrchestratorLayer` Dependencies:**
    *   The `ChatOrchestratorService` uses `ProviderFactoryService`. The methods of `ProviderFactoryService` (like `createProvider`) now carry their own dependencies in their `R` channel.
    *   When `ChatOrchestratorService` calls `providerFactory.createProvider(...)`, the resulting `Effect` needs these dependencies provided.
    *   The `chatOrchestratorLayer` must now ensure all these transitive dependencies are met. Most of them were already dependencies of `ProviderFactoryServiceLive`'s construction, so they just need to be part of the context where `ChatOrchestratorServiceLive`'s methods run.
    *   Update the `Layer.provide` for `chatOrchestratorLayer` to include all services that any provider built by the factory might need. This likely means `Layer.mergeAll` here will include `devConfigLayer`, `telemetryLayer`, `ollamaLayer`, `nostrLayer`, `nip04Layer`, `nip90Layer`, `sparkLayer`.

    ```typescript
    // In runtime.ts, buildFullAppLayer()

    // ... (devConfigLayer, telemetryLayer, ollamaLayer, etc. are defined as before) ...

    const providerFactoryLayer = ProviderFactoryServiceLive; // Simplified

    const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          // Dependencies for ChatOrchestratorService itself:
          devConfigLayer,       // Provides ConfigurationService
          telemetryLayer,       // Provides TelemetryService
          providerFactoryLayer, // Provides ProviderFactoryService

          // Dependencies potentially required by methods of ProviderFactoryService
          // (i.e., for constructing various AI providers):
          ollamaLayer,          // Provides OllamaService
          nostrLayer,           // Provides NostrService
          nip04Layer,           // Provides NIP04Service
          nip90Layer,           // Provides NIP90Service
          sparkLayer,           // Provides SparkService
          ollamaLanguageModelLayer // Provides AgentLanguageModel (for defaultAgentLM if ProviderFactory resolves it)
                                   // Or ensure AgentLanguageModel.Tag is provided if ProviderFactory needs to yield it for default cases.
                                   // If defaultAgentLM was yielded inside ProviderFactory, that now also becomes a requirement here.
        )
      )
    );

    // Ensure FullAppLayer correctly merges all necessary final layers.
    // This part should largely remain the same, as it's about providing all unique service tags.
    // FullAppLayer = Layer.mergeAll(baseLayer, ..., providerFactoryLayer, chatOrchestratorLayer, ...);
    ```
    *   **Crucial Note**: The `ollamaLanguageModelLayer` (or any default `AgentLanguageModel.Tag` provider) might be needed in the context provided to `chatOrchestratorLayer` if `ProviderFactoryService.createProvider` can fall back to a "default" `AgentLanguageModel` from its own context, or if `ChatOrchestratorService` itself uses a default `AgentLanguageModel.Tag`. Examine the actual implementation details. The current `ProviderFactoryServiceImpl.ts` seems to build all providers from scratch, so it might not need a pre-existing `AgentLanguageModel.Tag` in its own construction context but its methods will.

**III. Test Thoroughly**

1.  Run `pnpm run t` to ensure all TypeScript errors are resolved.
2.  Run `pnpm test` to ensure all unit and integration tests pass.
3.  Manually test the application, focusing on:
    *   Initial startup (without wallet initialized).
    *   Wallet initialization and subsequent runtime reinitialization.
    *   Using various AI providers (Ollama, Claude Code, NIP-90 DVMs) via `AgentChatPane`.
    *   Ensure there are no "Service not found" errors.

**Explanation of the Fix Rationale:**
By refactoring `ProviderFactoryServiceLive` this way, we adhere more closely to Effect's idiomatic service and layer patterns. The construction of the `ProviderFactoryService` instance becomes simpler (often just `Layer.succeed`). The actual work, including resolving dependencies like `ConfigurationService`, is deferred to when its methods (`createProvider`, `listProviders`) are called. This means these methods will correctly use the fully built and potentially reinitialized context (including `ConfigurationService` from `populatedConfigLayer` and `SparkService` with user's mnemonic) that `ChatOrchestratorService` runs within. This should resolve the "Service not found" error during reinitialization.

The core idea is to make service methods themselves carry their dependencies in their `R` channel, which are then satisfied by the context in which those methods are executed (typically by a "higher-level" service like `ChatOrchestratorService` or directly in the UI hooks if running effects there).Okay, Agent, the "Service not found: ConfigurationService" error during runtime reinitialization is a classic Effect layer composition issue. It means that when `ProviderFactoryServiceLive`'s constructor effect (`Layer.effect(Effect.gen(...))`) is being run, the `ConfigurationService` it tries to `yield*` is not available in the context provided to it.

The primary fix is to **defer the resolution of dependencies like `ConfigurationService` to when the methods of `ProviderFactoryService` are actually called**, rather than trying to resolve them all during the `ProviderFactoryServiceLive` layer's own construction.

Here are the specific instructions:

**I. Refactor `src/services/ai/providers/ProviderFactoryServiceImpl.ts`**

1.  **Change `ProviderFactoryServiceLive` to `Layer.succeed`**:
    The `ProviderFactoryServiceLive` layer should not perform complex Effectful operations (like yielding other services) for its own construction. It should simply provide an object that implements the `ProviderFactoryService` interface. The methods of this object will be Effectful and declare their own dependencies.

2.  **Move Dependency Resolution into Service Methods**:
    The logic that `yield* _(ConfigurationService)`, `yield* _(TelemetryService)`, etc., must be moved *inside* the `createProvider` and `listProviders` methods' `Effect.gen` blocks.

    ```typescript
    // src/services/ai/providers/ProviderFactoryServiceImpl.ts
    import { Effect, Layer, Context, Stream } from "effect"; // Ensure Context and Stream are imported
    import { ProviderFactoryService } from "./ProviderFactoryService";
    import { AgentLanguageModel, makeAgentLanguageModel, AiResponse, AiProviderError, AiConfigurationError, GenerateTextOptions, StreamTextOptions, GenerateStructuredOptions } from "@/services/ai/core";
    import { ConfigurationService, CONFIG_KEYS } from "@/services/configuration";
    import { TelemetryService } from "@/services/telemetry";
    import { OllamaService } from "@/services/ollama";
    import { NostrService } from "@/services/nostr";
    import { NIP04Service } from "@/services/nip04";
    import { NIP90Service } from "@/services/nip90";
    import { SparkService } from "@/services/spark";
    // Import other necessary types and modules like formatMessagesForClaudeCli, AiResponse.fromSimple etc.
    import { formatMessagesForClaudeCli } from "./claude_code/claudeFormatters";


    // Helper function (from your existing code)
    const getErrorMessage = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) return String(error.message);
      return String(error);
    };

    export const ProviderFactoryServiceLive = Layer.succeed(
      ProviderFactoryService,
      ProviderFactoryService.of({
        _tag: "ProviderFactoryService",

        createProvider: (providerKey: string, modelName?: string): Effect.Effect<
          AgentLanguageModel,
          AiProviderError | AiConfigurationError,
          // Declare ALL services that *any* provider creation path might need:
          ConfigurationService | TelemetryService | OllamaService | NostrService | NIP04Service | NIP90Service | SparkService | AgentLanguageModel
        > =>
          Effect.gen(function* (_) {
            // Resolve dependencies *inside* this method's Effect
            const config = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);
            // Other services will be yielded as needed within the switch cases

            // yield* _(telemetry.trackEvent({ category: "provider_factory", action: "create_provider_start", label: providerKey }));

            switch (providerKey.toLowerCase()) { // Use toLowerCase for case-insensitivity
              case "ollama": { // Changed from "ollama" to match agentChatStore key "ollama_gemma3_1b" if that's the intent
                               // OR handle "ollama_gemma3_1b" specifically and keep "ollama" as a general fallback.
                               // For now, assuming "ollama" is a general key and modelName specifies the model.
                const ollama = yield* _(OllamaService);
                const isEnabled = yield* _(
                  config.get(CONFIG_KEYS.OLLAMA_MODEL_ENABLED).pipe(
                    Effect.map(value => value === "true"),
                    Effect.catchAll(() => Effect.succeed(false))
                  )
                );
                if (!isEnabled) {
                  return yield* _(Effect.fail(new AiConfigurationError({ message: "Ollama provider is disabled" })));
                }
                const ollamaModelName = modelName || (yield* _(config.get(CONFIG_KEYS.OLLAMA_MODEL_NAME).pipe(Effect.orElseSucceed(() => "gemma3:1b"))));

                const ollamaModule = yield* _(
                  Effect.tryPromise({
                    try: () => import("./ollama/index.js"),
                    catch: (error) => new AiProviderError({ message: `Failed to load Ollama provider: ${getErrorMessage(error)}`, cause: error, isRetryable: false, provider: "ollama" })
                  })
                );
                const { OllamaAgentLanguageModelLiveLayer, OllamaAsOpenAIClientLive } = ollamaModule;

                const ollamaAgentLMLayer = OllamaAgentLanguageModelLiveLayer.pipe(
                  Layer.provide(OllamaAsOpenAIClientLive),
                  Layer.provide(Layer.succeed(OllamaService, ollama)),
                  Layer.provide(Layer.succeed(TelemetryService, telemetry)),
                  Layer.provide(Layer.succeed(ConfigurationService, config))
                );

                return yield* _(
                  Layer.build(ollamaAgentLMLayer).pipe(
                    Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                    Effect.scoped,
                    Effect.mapError((error) => new AiProviderError({ message: `Failed to build Ollama provider: ${getErrorMessage(error)}`, cause: error, isRetryable: false, provider: "ollama" }))
                  )
                );
              }

              case "claude_code": {
                // This logic uses window.electronAPI and does not yield Effect services directly for its operations.
                // Telemetry calls within its methods should use the `telemetry` instance yielded above.
                const claudeCodeAgentLM: AgentLanguageModel = makeAgentLanguageModel({
                  generateText: (options: GenerateTextOptions) => Effect.gen(function* (_) {
                    // Use the 'telemetry' instance from the outer scope of createProvider
                    yield* _(telemetry.trackEvent({ category: "claude_code_provider", action: "generate_text_start" }));
                    // ... (rest of existing generateText logic for claude_code) ...
                    const parsedMessages: AgentChatMessage[] = JSON.parse(options.prompt).messages; // Simplified
                    const cliPrompt = formatMessagesForClaudeCli(parsedMessages);
                    const cliParams: ClaudeExecParams = { prompt: cliPrompt, outputFormat: 'json', model: options.model || "claude-3-opus-20240229", sessionId: (options as any).sessionId };
                    const response = yield* _(Effect.tryPromise({
                      try: () => window.electronAPI.claudeCode!.chatCompletion(cliParams),
                      catch: (e) => new AiProviderError({ message: "Claude IPC fail", cause: e, provider: "claude_code", isRetryable: false })
                    }));
                    if ((response as any).__error) return yield* _(Effect.fail(new AiProviderError({ message: (response as any).message, provider: "claude_code", isRetryable: false})));
                    return AiResponse.fromSimple({ text: typeof response === 'string' ? response : JSON.stringify(response) });

                  }),
                  streamText: (options: StreamTextOptions) => Stream.asyncScoped((emit) => Effect.gen(function* (_) {
                    yield* _(telemetry.trackEvent({ category: "claude_code_provider", action: "stream_text_start" }));
                     // ... (rest of existing streamText logic for claude_code, ensure telemetry calls are adapted) ...
                    const parsedMessages: AgentChatMessage[] = JSON.parse(options.prompt).messages; // Simplified
                    const cliPrompt = formatMessagesForClaudeCli(parsedMessages);
                    const cliParams: ClaudeExecParams = { prompt: cliPrompt, outputFormat: 'stream-json', model: options.model || "claude-sonnet", sessionId: (options as any).sessionId };
                    let cleanupIPC: (() => void) | undefined;
                    try {
                      cleanupIPC = window.electronAPI.claudeCode!.streamChat(cliParams,
                        (chunk) => emit.single(AiResponse.fromSimple({ text: chunk })),
                        () => emit.end(),
                        (err) => emit.fail(new AiProviderError({ message: `Claude stream error: ${getErrorMessage(err)}`, cause: err, provider:"claude_code", isRetryable: false}))
                      );
                    } catch (e) {
                      emit.fail(new AiProviderError({ message: `Claude stream setup fail: ${getErrorMessage(e)}`, cause: e, provider:"claude_code", isRetryable: false}));
                    }
                    return Effect.sync(() => { cleanupIPC?.() });
                  })),
                  generateStructured: (options: GenerateStructuredOptions) => Effect.fail(new AiProviderError({ message: "generateStructured not implemented for ClaudeCode", provider: "ClaudeCode", isRetryable: false }))
                });
                return claudeCodeAgentLM;
              }

              default: {
                if (providerKey.startsWith("nip90:")) {
                  const nostr = yield* _(NostrService);
                  const nip04 = yield* _(NIP04Service);
                  const nip90 = yield* _(NIP90Service);
                  const spark = yield* _(SparkService);
                  const defaultAgentLM_for_nip90 = yield* _(AgentLanguageModel.Tag); // If NIP90 needs a base LM

                  const pubkeyOrAlias = providerKey.substring(6);
                  const aliasMap: Record<string, string> = { /* ... */ };
                  const resolvedPubkey = aliasMap[pubkeyOrAlias] || pubkeyOrAlias;

                  const nip90Config = { /* ... fetch from config using 'config' instance ... */
                    modelName: modelName || "default_nip90_model",
                    isEnabled: true,
                    dvmPubkey: resolvedPubkey,
                    dvmRelays: JSON.parse(yield* _(config.get(CONFIG_KEYS.AI_PROVIDER_DEVSTRAL_RELAYS).pipe(Effect.orElseSucceed(() => '["wss://relay.damus.io"]')))),
                    requestKind: parseInt(yield* _(config.get(CONFIG_KEYS.AI_PROVIDER_DEVSTRAL_REQUEST_KIND).pipe(Effect.orElseSucceed(() => "5050")))),
                    requiresEncryption: (yield* _(config.get(CONFIG_KEYS.AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION).pipe(Effect.orElseSucceed(() => "true")))) === "true",
                    useEphemeralRequests: (yield* _(config.get(CONFIG_KEYS.AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS).pipe(Effect.orElseSucceed(() => "true")))) === "true",
                  };

                  const nip90Module = yield* _(
                    Effect.tryPromise({
                      try: () => import("./nip90/index.js"),
                      catch: (error) => new AiProviderError({ message: `Failed to load NIP90 provider: ${getErrorMessage(error)}`, cause: error, isRetryable: false, provider: providerKey })
                    })
                  );
                  const { NIP90AgentLanguageModelLive, NIP90ProviderConfigTag } = nip90Module;

                  const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);
                  const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
                    Layer.provide(nip90ConfigLayer),
                    Layer.provide(Layer.succeed(NIP90Service, nip90)),
                    Layer.provide(Layer.succeed(NostrService, nostr)),
                    Layer.provide(Layer.succeed(NIP04Service, nip04)),
                    Layer.provide(Layer.succeed(TelemetryService, telemetry)),
                    Layer.provide(Layer.succeed(SparkService, spark)),
                    Layer.provide(Layer.succeed(AgentLanguageModel.Tag, defaultAgentLM_for_nip90)) // If needed by NIP90AgentLanguageModelLive
                  );

                  return yield* _(
                    Layer.build(nip90AgentLMLayer).pipe(
                      Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
                      Effect.scoped,
                      Effect.mapError((error) => new AiProviderError({ message: `Failed to build NIP90 provider: ${getErrorMessage(error)}`, cause: error, isRetryable: false, provider: providerKey }))
                    )
                  );
                }
                return yield* _(Effect.fail(new AiConfigurationError({ message: `Unknown provider: ${providerKey}` })));
              }
            }
          }),

        listProviders: (): Effect.Effect<string[], never, ConfigurationService> =>
          Effect.gen(function* (_) {
            const config = yield* _(ConfigurationService); // Resolve config for this method
            const providers: string[] = ["claude_code"];
            const ollamaEnabled = yield* _(
              config.get(CONFIG_KEYS.OLLAMA_MODEL_ENABLED).pipe(
                Effect.map(value => value === "true"),
                Effect.catchAll(() => Effect.succeed(false))
              )
            );
            if (ollamaEnabled) providers.push("ollama");
            providers.push("nip90:testing_provider"); // Example NIP90 provider
            return providers;
          })
      })
    );
    ```

**II. Update `src/services/runtime.ts`**

1.  **Simplify `providerFactoryLayer` Construction:**
    Since `ProviderFactoryServiceLive` is now a simple `Layer.succeed`, it doesn't need its dependencies provided at construction time.
    ```typescript
    // In src/services/runtime.ts
    // ... other layer definitions ...

    const providerFactoryLayer = ProviderFactoryServiceLive; // Simplified
    ```

2.  **Ensure `chatOrchestratorLayer` Provides All Transitive Dependencies:**
    The `ChatOrchestratorService` uses `ProviderFactoryService`. The methods of `ProviderFactoryService` (like `createProvider`) now carry their own dependencies (e.g., `ConfigurationService`, `OllamaService`). These must be satisfied by the context in which `chatOrchestratorLayer` runs.
    ```typescript
    // In src/services/runtime.ts -> buildFullAppLayer()
    // ... (devConfigLayer, telemetryLayer, ollamaLayer, etc. are defined as before) ...

    const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          // Dependencies for ChatOrchestratorService itself:
          populatedConfigLayer, // This is your `devConfigLayer`
          telemetryLayer,
          providerFactoryLayer, // The simplified ProviderFactoryServiceLive layer

          // Transitive dependencies needed by ProviderFactoryService.createProvider methods:
          ollamaLayer,
          nostrLayer,
          nip04Layer,
          nip90Layer,
          sparkLayer,
          // Add the default AgentLanguageModel provider if NIP90 or other internal factory logic needs it:
          ollamaLanguageModelLayer, // Assuming this provides AgentLanguageModel.Tag by default
        )
      )
    );
    ```
    *   **Adjust `FullAppLayer`:** Ensure that `Layer.mergeAll` for `FullAppLayer` correctly includes all unique layers. Many dependencies previously provided directly to `providerFactoryLayer` construction will now be implicitly handled by being part of `FullAppLayer` and thus available to `chatOrchestratorLayer`'s context.

**III. Review and Test**
1.  Run `pnpm run t` to ensure all TypeScript errors are resolved.
2.  Run `pnpm test`. You may need to update test setups for `ChatOrchestratorService.test.ts` and `ProviderFactoryService.test.ts` to mock/provide the now extended set of dependencies required by their methods.
3.  Manually test the application, especially:
    *   Wallet initialization and runtime reinitialization.
    *   Switching between and using different AI providers (Ollama, Claude Code, NIP-90).

This refactoring separates the *construction* of the `ProviderFactoryService` from the *resolution of dependencies for its operations*, which is a more robust pattern in Effect-TS and should resolve the "Service not found" error during reinitialization.
