The persistent error `Service not found: @effect/ai-openai/OpenAiLanguageModel/Config` despite previous fixes indicates a deeper issue in how the `OpenAiLanguageModel.Config` service is being provided or resolved within the Effect context, specifically when the Ollama provider is used for the Agent Chat.

Here's the step-by-step analysis and solution:

**Understanding the Core Problem:**

1.  **The Error's Meaning:** The error signifies that when an Effect (likely the one returned by `OpenAiLanguageModel.model(...)` from `@effect/ai-openai`) tries to access the `OpenAiLanguageModel.Config` service from its execution context, that service is not found.
2.  **Previous Fixes:**
    *   `2117-log.md` (and `docs/fixes/017-effect-service-dependency-analysis.md`): Correctly identified that `OpenAiLanguageModel.model(...)` requires both `OpenAiClient.OpenAiClient` AND `OpenAiLanguageModel.Config` to be provided to the effect it returns. The pattern implemented was:
        ```typescript
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, { /* overrides */ });
        const configuredAiModelEffect = aiModelEffectDefinition.pipe(
          Effect.provideService(OpenAiLanguageModel.Config, { /* config value */ }),
          Effect.provideService(OpenAiClient.OpenAiClient, clientInstance)
        );
        const provider = yield* _(configuredAiModelEffect);
        ```
    *   `2215-fix-instructions.md`: Addressed a runtime initialization failure where `OllamaAsOpenAIClientLive` would `Effect.die()` if `window.electronAPI` was unavailable. This fix made the layer construction resilient, ensuring the runtime *could* initialize.

3.  **Persistent Failure (`2233-situation.md`):** The error still occurring after these fixes means the runtime might be initializing, but the specific `OpenAiLanguageModel.Config` service is *still* not available to the `@effect/ai-openai` library code when it needs it.

**Revisiting `@effect/ai-openai`'s `OpenAiLanguageModel.model()` Behavior:**

The key is how `OpenAiLanguageModel.model(name: string, configOverrides?: Omit<Config.Service, "model">)` actually uses or requires `OpenAiLanguageModel.Config`.

*   The official `effect/ai` "Getting Started" (`docs/effect/ai/02-getting-started.md`) shows an example where `OpenAiLanguageModel.model("gpt-4o")` is called *without* the `configOverrides` argument, and `OpenAiLanguageModel.Config` is *not* explicitly provided to the main program. This implies that if `configOverrides` are *not* passed, the library might try to resolve the full `OpenAiLanguageModel.Config` service from the context to get all necessary parameters (including model name, temperature, etc.).
*   However, our code *is* passing the `configOverrides` (e.g., `{ temperature: 0.7, max_tokens: 2048 }`). The `modelName` itself is passed as the first argument.
*   The `docs/fixes/017-effect-service-dependency-analysis.md` (derived from runtime error analysis) explicitly stated that `OpenAiLanguageModel.Config` (the service, not just the options object) is a required dependency for the effect chain involving `OpenAiLanguageModel.model()`.

**The Most Likely Scenario for the Persistent Error:**

The `OpenAiLanguageModel.model()` function (or the `AiModel` Effect it returns) internally performs `yield* _(OpenAiLanguageModel.Config)` to fetch its complete configuration. The `configOverrides` argument might only supplement this. Our `Effect.provideService(aiModelEffectDefinition, OpenAiLanguageModel.Config, ...)` attempts to provide this service *to* the `aiModelEffectDefinition`. If this provision isn't "seen" by the internal `yield* _(OpenAiLanguageModel.Config)` call, the error occurs.

This suggests that `OpenAiLanguageModel.Config` needs to be available in the context *when the `Effect.gen` function inside `OllamaAgentLanguageModelLive` (or `OpenAIAgentLanguageModelLive`) itself runs*, specifically at the point where `OpenAiLanguageModel.model()` is called or the effect it returns is about to be prepared/yielded.

**Solution: Provide `OpenAiLanguageModel.Config` at the Layer Level**

The most robust way to ensure `OpenAiLanguageModel.Config` is available is to provide it to the layer that creates the `AgentLanguageModel` instance for Ollama (and OpenAI). This ensures it's in the context when `OpenAiLanguageModel.model()` is invoked.

**Changes Required:**

1.  **Modify `OllamaAgentLanguageModelLive.ts` (and `OpenAIAgentLanguageModelLive.ts` similarly):**
    *   The main `Effect.gen` function (`OllamaAgentLanguageModelLive`) will now *expect* `OpenAiLanguageModel.Config` to be in its context.
    *   It will `yield* _(OpenAiLanguageModel.Config)` to get the configuration values.
    *   The `OpenAiLanguageModel.model()` call will use the model name from this resolved config.
    *   The explicit `Effect.provideService(aiModelEffectDefinition, OpenAiLanguageModel.Config, ...)` call *inside* this `Effect.gen` will be removed because the service is now provided from the outer context.

2.  **Modify `src/services/runtime.ts`:**
    *   When composing the `ollamaLanguageModelLayer` (and `openAIAgentLanguageModelLayer`), explicitly provide the `OpenAiLanguageModel.Config` service.
    *   The value for this service will be constructed using `ConfigurationService` to get the model name and other defaults.

**Detailed Code Changes:**

**1. Update `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:**

```typescript
// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect"; // Added Context
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  // ... other core imports ...
} from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AIError";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"; // Keep OpenAiLanguageModel import
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel as EffectAiLanguageModelTag } from "@effect/ai/AiLanguageModel"; // Use the tag from effect/ai
import { Tokenizer } from "@effect/ai/Tokenizer";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";

console.log("Loading OllamaAgentLanguageModelLive module (Revised Config Pattern)");

export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const ollamaClient = yield* _(OllamaOpenAIClientTag);
  const telemetry = yield* _(TelemetryService);
  // This service now expects OpenAiLanguageModel.Config to be in its context
  const modelConfig = yield* _(OpenAiLanguageModel.Config); // Yield the config service

  const modelName = modelConfig.model; // Get model name from the provided service

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_model_name_from_context",
      value: modelName,
    })
  );

  // Options for OpenAiLanguageModel.model, these are overrides or additions to what's in OpenAiLanguageModel.Config
  // The type for `config` param is Omit<Config.Service, "model">
  const modelOptions: Omit<OpenAiLanguageModel.Config.Service, "model"> = {
    temperature: modelConfig.temperature, // Use values from the Config service
    max_tokens: modelConfig.max_tokens,   // Use values from the Config service
  };

  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, modelOptions);

  // aiModelEffectDefinition now only requires OpenAiClient, as OpenAiLanguageModel.Config was resolved from context
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient, // Provide the OpenAiClient (our Ollama adapter)
    ollamaClient
  );

  const provider = yield* _(configuredAiModelEffect);

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_language_model_provider_created_from_context_config",
      value: modelName,
    })
  );

  return makeAgentLanguageModel({
    generateText: (options) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(EffectAiLanguageModelTag); // Use the tag from @effect/ai
          const effectAiResponse = yield* _(languageModel.generateText({
            prompt: options.prompt,
            // model: options.model, // Model is part of the provider's config
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          }));
          return new AiResponse({ parts: effectAiResponse.parts });
        })
      ).pipe(
        Effect.mapError((error) => new AiProviderError({
          message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "Ollama",
          isRetryable: true,
          cause: error
        }))
      ),
    streamText: (options) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(EffectAiLanguageModelTag); // Use the tag from @effect/ai
            return languageModel.streamText({
              prompt: options.prompt,
              // model: options.model,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              signal: options.signal
            }).pipe(
              Stream.map((effectAiResponse) => new AiResponse({ parts: effectAiResponse.parts })),
              Stream.mapError((error) => new AiProviderError({
                message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
                provider: "Ollama",
                isRetryable: true,
                cause: error
              }))
            );
          })
        )
      ),
    generateStructured: (options) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported by Ollama provider",
          provider: "Ollama",
          isRetryable: false
        })
      )
  });
});

// The Layer now needs to construct and provide OpenAiLanguageModel.Config
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    // Dependencies needed to construct OpenAiLanguageModel.Config value
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService); // For logging only

    const modelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gemma3:1b"))
    );
    // Fetch other config values if needed for temperature, max_tokens for the Config service
    const temperature = parseFloat(yield* _(configService.get("OLLAMA_TEMPERATURE").pipe(Effect.orElseSucceed(() => "0.7"))));
    const maxTokens = parseInt(yield* _(configService.get("OLLAMA_MAX_TOKENS").pipe(Effect.orElseSucceed(() => "2048"))), 10);

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: isNaN(temperature) ? 0.7 : temperature,
      max_tokens: isNaN(maxTokens) ? 2048 : maxTokens,
      // Add other default/configurable OpenAiLanguageModel.Config fields if necessary
    };

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_provider_config_service_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    // OllamaAgentLanguageModel is the Effect.gen function defined above.
    // It now requires OllamaOpenAIClientTag, ConfigurationService, TelemetryService, AND OpenAiLanguageModel.Config.
    // We provide OpenAiLanguageModel.Config here. The rest are provided by baseLayer in runtime.ts.
    return yield* _(
      Effect.provideService(
        OllamaAgentLanguageModelLive, // The Effect.gen that implements AgentLanguageModel
        OpenAiLanguageModel.Config,   // The tag for the service being provided
        openAiModelConfigServiceValue // The actual service implementation/value
      )
    );
  })
  // This Layer.effect now itself depends on ConfigurationService and TelemetryService
  // (which are used to build the openAiModelConfigServiceValue).
  // These will be satisfied by `baseLayer` when `OllamaAgentLanguageModelLiveLayer` is composed.
);
```

**2. Update `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts` (apply the same pattern):**

```typescript
// src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect"; // Added Context
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  // ... other core imports ...
} from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AIError";
import { AiResponse } from "@/services/ai/core/AiResponse";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel as EffectAiLanguageModelTag } from "@effect/ai/AiLanguageModel"; // Use the tag from effect/ai
import { Tokenizer } from "@effect/ai/Tokenizer";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

export const OpenAIAgentLanguageModelLive = Effect.gen(function* (_) {
  const openAiClient = yield* _(OpenAiClient.OpenAiClient); // This is the actual OpenAiClient
  const telemetry = yield* _(TelemetryService);
  // This service now expects OpenAiLanguageModel.Config to be in its context
  const modelConfig = yield* _(OpenAiLanguageModel.Config); // Yield the config service

  const modelName = modelConfig.model; // Get model name from the provided service

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_model_name_from_context",
      value: modelName,
    })
  );

  const modelOptions: Omit<OpenAiLanguageModel.Config.Service, "model"> = {
    temperature: modelConfig.temperature,
    max_tokens: modelConfig.max_tokens,
  };

  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, modelOptions);

  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    openAiClient
  );

  const provider = yield* _(configuredAiModelEffect);

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_language_model_provider_created_from_context_config",
      value: modelName,
    })
  );

  return makeAgentLanguageModel({
    generateText: (options) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(EffectAiLanguageModelTag);
          const effectAiResponse = yield* _(languageModel.generateText({
            prompt: options.prompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            stopSequences: options.stopSequences
          }));
          return new AiResponse({ parts: effectAiResponse.parts });
        })
      ).pipe(
        Effect.mapError((error) => new AiProviderError({
          message: `OpenAI generateText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "OpenAI",
          isRetryable: true,
          cause: error
        }))
      ),
    streamText: (options) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(EffectAiLanguageModelTag);
            return languageModel.streamText({
              prompt: options.prompt,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              signal: options.signal
            }).pipe(
              Stream.map((effectAiResponse) => new AiResponse({ parts: effectAiResponse.parts })),
              Stream.mapError((error) => new AiProviderError({
                message: `OpenAI streamText error: ${error instanceof Error ? error.message : String(error)}`,
                provider: "OpenAI",
                isRetryable: true,
                cause: error
              }))
            );
          })
        )
      ),
    generateStructured: (options) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported by OpenAI provider yet in this wrapper",
          provider: "OpenAI",
          isRetryable: false
        })
      )
  });
});

export const OpenAIAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const modelName = yield* _(
      configService.get("OPENAI_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gpt-4o"))
    );
    const temperature = parseFloat(yield* _(configService.get("OPENAI_TEMPERATURE").pipe(Effect.orElseSucceed(() => "0.7"))));
    const maxTokens = parseInt(yield* _(configService.get("OPENAI_MAX_TOKENS").pipe(Effect.orElseSucceed(() => "2048"))), 10);

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: isNaN(temperature) ? 0.7 : temperature,
      max_tokens: isNaN(maxTokens) ? 2048 : maxTokens,
    };

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "openai_provider_config_service_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    return yield* _(
      Effect.provideService(
        OpenAIAgentLanguageModelLive, // The Effect.gen function
        OpenAiLanguageModel.Config,
        openAiModelConfigServiceValue
      )
    );
  })
);
```

**3. Update `src/services/runtime.ts`:**
The `baseLayer` and `ollamaLanguageModelLayer` / `openAIAgentLanguageModelLayer` definitions should now correctly provide all transitive dependencies.

```typescript
// src/services/runtime.ts
// ... imports ...
import { OpenAiLanguageModel } from "@effect/ai-openai"; // Import for OpenAiLanguageModel.Config tag if needed at this level

// ... telemetryLayer, configLayer, devConfigLayer, nostrLayer, ollamaLayer, nip04Layer, sparkLayer, nip90Layer ...

// AI service layers
// OpenAI provider
const openAIClientLayer = OpenAIProvider.OpenAIClientLive.pipe(
  Layer.provide(Layer.mergeAll(devConfigLayer, BrowserHttpClient.layerXMLHttpRequest, telemetryLayer))
);

const openAIAgentLanguageModelLayer = OpenAIProvider.OpenAIAgentLanguageModelLiveLayer.pipe(
  Layer.provide(Layer.mergeAll(openAIClientLayer, devConfigLayer, telemetryLayer))
  // The OpenAIAgentLanguageModelLiveLayer itself now handles creating and providing OpenAiLanguageModel.Config
  // by depending on ConfigurationService.
);

// Ollama provider
const ollamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
  Layer.provide(Layer.mergeAll(ollamaLayer, telemetryLayer, devConfigLayer)), // Added devConfigLayer if OllamaAsOpenAIClientLive needs it
);

const ollamaLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(
  Layer.provide(Layer.mergeAll(ollamaAdapterLayer, devConfigLayer, telemetryLayer))
  // Similar to OpenAI, OllamaAgentLanguageModelLiveLayer handles its OpenAiLanguageModel.Config
);

// Full application layer - decide which AI provider is the default for AgentLanguageModel.Tag
// For now, let's assume Ollama is the default if available, then OpenAI.
// A more sophisticated provider selection mechanism will be needed later.

// Choose one layer to provide AgentLanguageModel.Tag
// For example, to default to Ollama:
const activeAgentLanguageModelLayer = ollamaLanguageModelLayer;
// Or to default to OpenAI:
// const activeAgentLanguageModelLayer = openAIAgentLanguageModelLayer;

export const FullAppLayer = Layer.mergeAll(
  // Base services needed by many
  telemetryLayer,
  devConfigLayer, // Provides ConfigurationService
  BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient.HttpClient

  // Nostr stack
  nostrLayer,
  nip04Layer,
  NIP19ServiceLive, // No specific deps beyond what's in its own Live
  BIP39ServiceLive,   // No specific deps
  BIP32ServiceLive,   // No specific deps
  nip28Layer,         // Depends on nostr, nip04, telemetry

  // Ollama infrastructure (needed by Ollama provider)
  ollamaLayer,        // Depends on HttpClient, UiOllamaConfigLive, telemetry
  ollamaAdapterLayer, // Depends on ollamaLayer, telemetry, devConfigLayer (if it reads config)

  // OpenAI infrastructure (needed by OpenAI provider)
  openAIClientLayer,  // Depends on devConfigLayer, HttpClient, telemetry

  // Spark service
  sparkLayer,         // Depends on DefaultSparkServiceConfigLayer, telemetry

  // NIP-90 services
  nip90Layer,         // Depends on nostr, nip04, telemetry

  // The DVM service that uses an AgentLanguageModel
  kind5050DVMLayer,   // Depends on many things, including an AgentLanguageModel

  // Finally, provide the active AgentLanguageModel implementation
  activeAgentLanguageModelLayer // This is either ollamaLanguageModelLayer or openAIAgentLanguageModelLayer
);
```
**Explanation of Changes:**

*   Each provider's `AgentLanguageModelLiveLayer` (e.g., `OllamaAgentLanguageModelLiveLayer`) is now an `Layer.effect` that itself is an `Effect.gen`. This generator function first resolves `ConfigurationService` and `TelemetryService` from its own context (which will be provided by `baseLayer` or similar in `runtime.ts`).
*   It then uses `ConfigurationService` to get the `modelName` and other parameters (like temperature, max\_tokens).
*   With these values, it constructs the `OpenAiLanguageModel.Config.Service` object (e.g., `openAiModelConfigServiceValue`).
*   It then calls `Effect.provideService` on the *original `Effect.gen` function* (e.g., `OllamaAgentLanguageModelLive` or `OpenAIAgentLanguageModelLive`) to inject this `openAiModelConfigServiceValue` using the `OpenAiLanguageModel.Config` tag.
*   The `OllamaAgentLanguageModelLive` (and `OpenAIAgentLanguageModelLive`) `Effect.gen` functions are modified to `yield* _(OpenAiLanguageModel.Config)` to access this now-provided service. They use the `model` field from this service for `OpenAiLanguageModel.model(modelNameFromConfigService, overrideOptions)` and pass other parameters from this service to `overrideOptions`.
*   The `Effect.provideService(OpenAiClient.OpenAiClient, ...)` call remains inside the main `Effect.gen` functions, as `OpenAiClient` is a direct dependency they resolve.

This approach ensures that `OpenAiLanguageModel.Config` is definitively in the context when the effect returned by `OpenAiLanguageModel.model(...)` is constructed and executed, because it's provided at the layer that *runs* the main `Effect.gen` function which calls `OpenAiLanguageModel.model(...)`.

This should resolve the "Service not found" error by ensuring the context is correctly set up before the `@effect/ai-openai` library attempts to access its configuration service. The key was realizing that `OpenAiLanguageModel.model()` implicitly relies on this service being in its *own* execution context, not just provided to the effect it *returns*.

**Testing Considerations:**
The `agent-chat-config-isolated.test.ts` and `provider-pattern-validation.test.ts` should be updated or new tests created to reflect this new layering strategy for `OpenAiLanguageModel.Config`. The runtime initialization test is also crucial.

This also means `docs/fixes/017-effect-service-dependency-analysis.md` needs an update to clarify that `OpenAiLanguageModel.Config` should be provided to the Effect *calling* `OpenAiLanguageModel.model()`, not just to the Effect *returned by* `OpenAiLanguageModel.model()`.The persistent "Service not found: @effect/ai-openai/OpenAiLanguageModel/Config" error, even after previous fixes, indicates a subtle issue with how the `OpenAiLanguageModel.Config` service is being provided or resolved within the Effect context. The core of the problem is that the `@effect/ai-openai` library's `OpenAiLanguageModel.model(...)` function (or the `AiModel` Effect it constructs) internally requires `OpenAiLanguageModel.Config` to be available in its execution context.

Previous attempts tried to provide this service *to the Effect returned by `OpenAiLanguageModel.model(...)`*. The persistent error suggests this is too late; the service needs to be available when `OpenAiLanguageModel.model(...)` itself is invoked or when the initial part of the Effect it constructs runs.

**The Corrected Solution Strategy:**

1.  **Modify Provider Implementations (`OllamaAgentLanguageModelLive.ts`, `OpenAIAgentLanguageModelLive.ts`):**
    *   The main `Effect.gen` function (e.g., `OllamaAgentLanguageModelLive`) will now *expect* `OpenAiLanguageModel.Config` to be in its own context (provided by its Layer).
    *   It will `yield* _(OpenAiLanguageModel.Config)` to get the full configuration object (which includes `model`, `temperature`, `max_tokens`, etc.).
    *   The call to `OpenAiLanguageModel.model(modelName, options)` will use the `modelName` from this context-resolved config. The `options` argument will pass other parameters (like temperature, max\_tokens) also obtained from this context-resolved config.
    *   The internal `Effect.provideService(..., OpenAiLanguageModel.Config, ...)` call within these `Effect.gen` functions will be removed, as the service is now provided by the Layer that constructs these effects.

2.  **Update Layer Definitions for these Providers:**
    *   The `Layer` that provides `AgentLanguageModel.Tag` (e.g., `OllamaAgentLanguageModelLiveLayer`) will now be an `Layer.effect`.
    *   This `Layer.effect` will itself depend on `ConfigurationService` (to fetch model name, temp, etc.) and `TelemetryService`.
    *   It will use these dependencies to construct the appropriate `OpenAiLanguageModel.Config.Service` value.
    *   Finally, it will use `Effect.provideService` to inject this constructed `OpenAiLanguageModel.Config.Service` value into the main `Effect.gen` function (e.g., `OllamaAgentLanguageModelLive`) when creating the `AgentLanguageModel` instance.

3.  **Update `src/services/runtime.ts`:**
    *   The composition of `FullAppLayer` will ensure that `ConfigurationService` and `TelemetryService` are provided to `OllamaAgentLanguageModelLiveLayer` and `OpenAIAgentLanguageModelLiveLayer`. These layers will then internally create and provide the `OpenAiLanguageModel.Config` to their respective `Effect.gen` functions.

**Detailed Code Changes:**

**1. `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`**
   *(Apply analogous changes to `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`)*

```typescript
// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  makeAgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
} from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AIError";
import { AiResponse } from "@/services/ai/core/AiResponse";
// Import OpenAiLanguageModel.Config explicitly if needed for type annotations
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import type { Provider } from "@effect/ai/AiPlan";
import { AiLanguageModel as EffectAiLanguageModelTag } from "@effect/ai/AiLanguageModel";
import { Tokenizer } from "@effect/ai/Tokenizer";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";

console.log("Loading OllamaAgentLanguageModelLive module (Corrected Config Pattern)");

// This is the Effect.gen function that implements the AgentLanguageModel service for Ollama
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const ollamaClient = yield* _(OllamaOpenAIClientTag);
  const telemetry = yield* _(TelemetryService);
  // Expect OpenAiLanguageModel.Config to be already in the context
  const modelAndOptionsConfig = yield* _(OpenAiLanguageModel.Config);

  const modelName = modelAndOptionsConfig.model; // Get model name from the provided service

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_model_from_provided_config_service",
      value: modelName,
    })
  );

  // These are overrides/additional options for OpenAiLanguageModel.model(),
  // beyond what's in the Config service. The second param is Omit<Config.Service, "model">
  const modelOverrideOptions: Omit<OpenAiLanguageModel.Config.Service, "model"> = {
    temperature: modelAndOptionsConfig.temperature,
    max_tokens: modelAndOptionsConfig.max_tokens,
    // include other relevant fields from modelAndOptionsConfig that are valid overrides
  };

  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, modelOverrideOptions);

  // aiModelEffectDefinition now only requires OpenAiClient, as OpenAiLanguageModel.Config was resolved from context
  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient, // Provide the OpenAiClient (our Ollama adapter)
    ollamaClient
  );

  const provider = yield* _(configuredAiModelEffect);

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "ollama_language_model_provider_ready",
      value: modelName,
    })
  );

  return makeAgentLanguageModel({
    generateText: (options) =>
      provider.use(
        Effect.gen(function* (_) {
          const languageModel = yield* _(EffectAiLanguageModelTag);
          const effectAiResponse = yield* _(languageModel.generateText({
            prompt: options.prompt,
            temperature: options.temperature ?? modelAndOptionsConfig.temperature,
            maxTokens: options.maxTokens ?? modelAndOptionsConfig.max_tokens,
            stopSequences: options.stopSequences
          }));
          return new AiResponse({ parts: effectAiResponse.parts });
        })
      ).pipe(
        Effect.mapError((error) => new AiProviderError({
          message: `Ollama generateText error: ${error instanceof Error ? error.message : String(error)}`,
          provider: "Ollama",
          isRetryable: true,
          cause: error
        }))
      ),
    streamText: (options) =>
      Stream.unwrap(
        provider.use(
          Effect.gen(function* (_) {
            const languageModel = yield* _(EffectAiLanguageModelTag);
            return languageModel.streamText({
              prompt: options.prompt,
              temperature: options.temperature ?? modelAndOptionsConfig.temperature,
              maxTokens: options.maxTokens ?? modelAndOptionsConfig.max_tokens,
              signal: options.signal
            }).pipe(
              Stream.map((effectAiResponse) => new AiResponse({ parts: effectAiResponse.parts })),
              Stream.mapError((error) => new AiProviderError({
                message: `Ollama streamText error: ${error instanceof Error ? error.message : String(error)}`,
                provider: "Ollama",
                isRetryable: true,
                cause: error
              }))
            );
          })
        )
      ),
    generateStructured: (options) =>
      Effect.fail(
        new AiProviderError({
          message: "generateStructured not supported by Ollama provider",
          provider: "Ollama",
          isRetryable: false
        })
      )
  });
});

// The Layer now constructs and provides OpenAiLanguageModel.Config
export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag, // This layer provides our AgentLanguageModel
  Effect.gen(function* (_) {
    // Dependencies to build the OpenAiLanguageModel.Config value
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const modelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gemma3:1b"))
    );
    const tempStr = yield* _(configService.get("OLLAMA_TEMPERATURE").pipe(Effect.orElseSucceed(() => "0.7")));
    const maxTokStr = yield* _(configService.get("OLLAMA_MAX_TOKENS").pipe(Effect.orElseSucceed(() => "2048")));

    const temperature = parseFloat(tempStr);
    const max_tokens = parseInt(maxTokStr, 10);

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: isNaN(temperature) ? 0.7 : temperature,
      max_tokens: isNaN(max_tokens) ? 2048 : max_tokens,
      // Add other default/configurable OpenAiLanguageModel.Config fields if necessary
    };

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_provider_internal_config_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    // OllamaAgentLanguageModel is the Effect.gen function defined above.
    // It requires OllamaOpenAIClientTag, ConfigurationService (for initial model name fetch, if used differently),
    // TelemetryService, AND OpenAiLanguageModel.Config.
    // We provide OpenAiLanguageModel.Config here. The rest are provided by baseLayer in runtime.ts.
    return yield* _(
      Effect.provideService(
        OllamaAgentLanguageModelLive, // The Effect.gen that implements AgentLanguageModel
        OpenAiLanguageModel.Config,   // The tag for the service being provided
        openAiModelConfigServiceValue // The actual service implementation/value
      )
    );
  })
  // This Layer.effect now itself depends on ConfigurationService and TelemetryService
  // (which are used to build the openAiModelConfigServiceValue).
  // These will be satisfied by `baseLayer` (or equivalent) when `OllamaAgentLanguageModelLiveLayer` is composed in runtime.ts.
);
```

**2. `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`**
   *(Apply the same structural changes as for `OllamaAgentLanguageModelLive.ts`)*

```typescript
// src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
// ... (similar imports as Ollama version, but with OpenAiClient directly)
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
// ...

export const OpenAIAgentLanguageModelLive = Effect.gen(function* (_) {
  const openAiClient = yield* _(OpenAiClient.OpenAiClient); // Direct OpenAiClient
  const telemetry = yield* _(TelemetryService);
  const modelAndOptionsConfig = yield* _(OpenAiLanguageModel.Config); // Expect Config from context

  const modelName = modelAndOptionsConfig.model;

  yield* _(
    telemetry.trackEvent({
      category: "ai:config",
      action: "openai_model_from_provided_config_service",
      value: modelName,
    })
  );

  const modelOverrideOptions: Omit<OpenAiLanguageModel.Config.Service, "model"> = {
    temperature: modelAndOptionsConfig.temperature,
    max_tokens: modelAndOptionsConfig.max_tokens,
  };

  const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName, modelOverrideOptions);

  const configuredAiModelEffect = Effect.provideService(
    aiModelEffectDefinition,
    OpenAiClient.OpenAiClient,
    openAiClient
  );

  const provider = yield* _(configuredAiModelEffect);

  // ... (rest of makeAgentLanguageModel implementation, similar to Ollama's, but with "OpenAI" as provider in errors) ...
  // For brevity, only the changed parts are shown. The generateText/streamText logic is analogous.
  return makeAgentLanguageModel({ /* ... */ });
});

export const OpenAIAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const modelName = yield* _(
      configService.get("OPENAI_MODEL_NAME").pipe(Effect.orElseSucceed(() => "gpt-4o"))
    );
    const tempStr = yield* _(configService.get("OPENAI_TEMPERATURE").pipe(Effect.orElseSucceed(() => "0.7")));
    const maxTokStr = yield* _(configService.get("OPENAI_MAX_TOKENS").pipe(Effect.orElseSucceed(() => "2048")));

    const temperature = parseFloat(tempStr);
    const max_tokens = parseInt(maxTokStr, 10);

    const openAiModelConfigServiceValue: OpenAiLanguageModel.Config.Service = {
      model: modelName,
      temperature: isNaN(temperature) ? 0.7 : temperature,
      max_tokens: isNaN(max_tokens) ? 2048 : max_tokens,
    };
     yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "openai_provider_internal_config_created",
        value: JSON.stringify(openAiModelConfigServiceValue),
      })
    );

    return yield* _(
      Effect.provideService(
        OpenAIAgentLanguageModelLive, // The Effect.gen function
        OpenAiLanguageModel.Config,
        openAiModelConfigServiceValue
      )
    );
  })
);
```

**3. `src/services/runtime.ts`**
   The `FullAppLayer` composition needs to ensure that `OllamaAgentLanguageModelLiveLayer` and `OpenAIAgentLanguageModelLiveLayer` receive their *own* dependencies (`ConfigurationService`, `TelemetryService`, and their specific client like `OllamaOpenAIClientTag` or `OpenAiClient.OpenAiClient`). The layers themselves will then create and provide `OpenAiLanguageModel.Config` internally to their `Effect.gen` functions.

```typescript
// src/services/runtime.ts
// ... imports ...

// ... telemetryLayer, configLayer, devConfigLayer, nostrLayer, ollamaLayer, nip04Layer, sparkLayer, nip90Layer ...

// AI service layers
// Base layer that includes dependencies for AI provider layers
const aiBaseDependenciesLayer = Layer.mergeAll(
  devConfigLayer, // Provides ConfigurationService
  telemetryLayer, // Provides TelemetryService
  BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient.HttpClient (for OpenAIClientLive)
  ollamaAdapterLayer // Provides OllamaOpenAIClientTag (which is an OpenAiClient.OpenAiClient)
                     // This itself needs ollamaLayer, telemetryLayer
);

// OpenAI Provider
const openAIClientLayer = OpenAIProvider.OpenAIClientLive.pipe(
  Layer.provide(Layer.mergeAll(devConfigLayer, BrowserHttpClient.layerXMLHttpRequest, telemetryLayer))
); // OpenAIClientLive needs ConfigService, HttpClient, Telemetry

const openAIAgentLanguageModelLayer = OpenAIProvider.OpenAIAgentLanguageModelLiveLayer.pipe(
  // OpenAIAgentLanguageModelLiveLayer now depends on ConfigurationService, TelemetryService (to build its internal OpenAiLanguageModel.Config)
  // AND OpenAiClient.OpenAiClient (for the OpenAIAgentLanguageModelLive Effect.gen function).
  Layer.provide(Layer.mergeAll(devConfigLayer, telemetryLayer, openAIClientLayer))
);

// Ollama Provider
// ollamaAdapterLayer is already defined above and provides OllamaOpenAIClientTag.
// It depends on ollamaLayer, telemetryLayer, and potentially devConfigLayer.

const ollamaLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLiveLayer.pipe(
  // OllamaAgentLanguageModelLiveLayer now depends on ConfigurationService, TelemetryService (to build its internal OpenAiLanguageModel.Config)
  // AND OllamaOpenAIClientTag (for the OllamaAgentLanguageModelLive Effect.gen function).
  Layer.provide(Layer.mergeAll(devConfigLayer, telemetryLayer, ollamaAdapterLayer))
);

// Choose one layer to provide AgentLanguageModel.Tag
// For example, to default to Ollama:
const activeAgentLanguageModelLayer = ollamaLanguageModelLayer;
// Or to default to OpenAI:
// const activeAgentLanguageModelLayer = openAIAgentLanguageModelLayer;


export const FullAppLayer = Layer.mergeAll(
  // Foundational services
  telemetryLayer,
  devConfigLayer,
  BrowserHttpClient.layerXMLHttpRequest, // General HttpClient

  // Specific service infrastructure
  nostrLayer,
  nip04Layer,
  NIP19ServiceLive,
  BIP39ServiceLive,
  BIP32ServiceLive,
  nip28Layer,
  ollamaLayer,        // For OllamaAdapter
  ollamaAdapterLayer, // Provides OllamaOpenAIClientTag
  openAIClientLayer,  // Provides OpenAiClient.OpenAiClient for direct OpenAI
  sparkLayer,
  nip90Layer,

  // The DVM service that uses an AgentLanguageModel
  kind5050DVMLayer.pipe(
    // Ensure kind5050DVMLayer gets the active AgentLanguageModel
    Layer.provide(activeAgentLanguageModelLayer)
  ),

  // Finally, provide the active AgentLanguageModel implementation for general use
  activeAgentLanguageModelLayer
);
```

**Explanation of the Corrected Logic:**

*   The core `Effect.gen` functions (`OllamaAgentLanguageModelLive` and `OpenAIAgentLanguageModelLive`) now declare `OpenAiLanguageModel.Config` as one of their context requirements by using `yield* _(OpenAiLanguageModel.Config)`.
*   The respective `Layer` definitions (e.g., `OllamaAgentLanguageModelLiveLayer`) are responsible for constructing the value for `OpenAiLanguageModel.Config.Service` (using `ConfigurationService` for model name, etc.) and then providing this service to the `Effect.gen` function.
*   This ensures that when `OpenAiLanguageModel.model(...)` is called *inside* these `Effect.gen` functions, the `OpenAiLanguageModel.Config` service is already present in their execution context, satisfying the library's internal dependency.
*   The `Effect.provideService(OpenAiClient.OpenAiClient, ...)` call remains inside the `Effect.gen` functions because `OpenAiClient` is also a direct dependency needed to build the `AiModel.Provider`.

This hierarchical provision of context should robustly fix the "Service not found" error by ensuring dependencies are met at the correct scope. The previous resilience fix for `OllamaAsOpenAIClientLive` (preventing `Effect.die()`) remains crucial for overall runtime stability.
