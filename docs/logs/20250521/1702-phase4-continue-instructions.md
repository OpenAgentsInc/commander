Okay, Agent, it looks like the Phase 4 refactor has introduced a number of TypeScript issues, primarily related to Effect-TS patterns, service interface mismatches, and mock structures in tests. Let's address these systematically.

**Overall Strategy:**

1.  **Align Service Interfaces:** Ensure your custom interfaces and implementations strictly match the expected shapes, especially when interacting with `@effect/ai` library components.
2.  **Correct Effect-TS Layering and Dependencies:** Ensure all Effects have their `R` (Requirements) channel satisfied by providing the necessary layers.
3.  **Accurate Mocks:** Test mocks must accurately reflect the interfaces they are mocking.
4.  **Type Safety:** Eliminate `unknown` types by proper error handling and type assertions where safe.

Here are the specific instructions:

**I. Core `OllamaAgentLanguageModelLive.ts` Refactor (Addressing TS2345)**

*   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
*   **Problem:** The custom `OpenAiClientService` interface and `createLanguageModel` function are incompatible with how `@effect/ai-openai`'s `OpenAiLanguageModel.model()` expects to be used. The `ollamaAdaptedClient` (which is `OllamaOpenAIClientTag`) should be provided directly to the library's model factory.
*   **Instructions:**
    1.  Delete the local `OpenAiClientService` interface (lines 20-36 in the diff from the prompt).
    2.  Delete the local `createLanguageModel` function (lines 19 and 38 in the diff).
    3.  Import `OpenAiLanguageModel` from `@effect/ai-openai`.
    4.  Modify the main `Effect.gen` block to use `OpenAiLanguageModel.model()`:

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import {
      AgentLanguageModel,
      GenerateTextOptions,
      StreamTextOptions,
      GenerateStructuredOptions,
      AiTextChunk
    } from "@/services/ai/core";
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"; // Added OpenAiLanguageModel
    import { ConfigurationService } from "@/services/configuration";
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
    import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
    import { TelemetryService } from "@/services/telemetry";
    import type { AiResponse } from "@effect/ai/AiResponse"; // Keep this if AgentLanguageModel uses it

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel, // Use the Tag directly
      Effect.gen(function*(_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag);
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gemma3:1b"),
          Effect.tapError(e => telemetry.trackEvent({
            category: "ai:config:error", action: "ollama_model_name_fetch_failed", label: "OLLAMA_MODEL_NAME", value: (e as Error).message || String(e)
          }).pipe(Effect.ignoreLogged)),
          Effect.mapError(e => new AIConfigurationError({
            message: "Error fetching Ollama Model Name.", cause: e, context: { keyName: "OLLAMA_MODEL_NAME" }
          }))
        );
        const modelName = yield* _(modelNameEffect);
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "ollama_model_name_resolved", value: modelName }).pipe(Effect.ignoreLogged));

        // Use OpenAiLanguageModel.model directly from the library
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

        // Provide the ollamaAdaptedClient (which implements OpenAiClient.Service)
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // The Tag for the service being provided
          ollamaAdaptedClient         // The actual service instance
        );

        const provider = yield* _(configuredAiModelEffect); // This yields Provider<AiLanguageModel from @effect/ai>
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "ollama_language_model_provider_created", value: modelName }).pipe(Effect.ignoreLogged));

        return AgentLanguageModel.of({ // Implement AgentLanguageModel interface
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions) =>
            provider.generateText(params).pipe( // Call the library provider's method
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateText error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          streamText: (params: StreamTextOptions) =>
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `Ollama streamText error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions) =>
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateStructured error for model ${modelName}: ${err instanceof Error ? err.message : String(err) || "Unknown provider error"}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
        });
      })
    );
    ```

**II. Core `OllamaAsOpenAIClientLive.ts` Refactor (Addressing TS2353, TS2339)**

*   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
*   **Problem:** The structure returned by `OllamaOpenAIClientTag.of({...})` must match the `OpenAiClient.Service` interface from `@effect/ai-openai`. This interface has a `client` property (which is the actual `Generated.Client` with methods like `chat.completions.create`) and top-level `streamRequest` and `stream` methods. The `stream` method is used by `OpenAiLanguageModel.model()` for streaming chat completions.
*   **Instructions:**
    1.  **Import necessary types accurately**:
        ```typescript
        // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
        import { Layer, Effect, Stream, Cause, Context } from "effect";
        import { OpenAiClient, OpenAiError } from "@effect/ai-openai"; // OpenAiError is exported
        import type {
          ChatCompletionCreateParams, // Or the correct name for OpenAI chat params
          ChatCompletion,
          ChatCompletionChunk,
          CreateEmbeddingRequest, // If implementing embeddings
          CreateEmbeddingResponse,
          ModelListResponse,
          StreamCompletionRequest // This is likely what the service.stream() method expects
        } from "@effect/ai-openai"; // Check precise export names
        import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
        import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
        import * as HttpClientError from "@effect/platform/HttpClientError";
        // ... other imports
        ```
    2.  **Restructure the returned service object:**
        *   The `client` property should implement methods like `chat.completions.create` for *non-streaming* calls.
        *   The top-level `stream` method should handle *streaming* chat completion calls.
        *   `streamRequest` can be a stub if not fully implemented for Ollama.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    // ... imports ...
    export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient;

    export const OllamaAsOpenAIClientLive = Layer.effect(
      OllamaOpenAIClientTag,
      Effect.gen(function*(_) {
        const telemetry = yield* _(TelemetryService);
        // ... (IPC bridge check) ...
        const ollamaIPC = window.electronAPI.ollama;

        return OllamaOpenAIClientTag.of({
          // client property implementing methods of Generated.Client
          client: {
            // Correctly implement chat.completions.create for non-streaming
            chat: {
              completions: {
                create: (params: ChatCompletionCreateParams) => {
                  // Ensure params.stream is explicitly false or not present for this path
                  const nonStreamingParams = { ...params, stream: false };
                  return Effect.tryPromise({
                    try: async () => {
                      // ... (telemetry start) ...
                      const response = await ollamaIPC.generateChatCompletion(nonStreamingParams);
                      if (response && response.__error) { /* ... telemetry error, throw AIProviderError ... */ throw new AIProviderError(/*...*/); }
                      // ... (telemetry success) ...
                      return response as ChatCompletion; // Ensure response matches OpenAI's ChatCompletion
                    },
                    catch: (error) => {
                      // ... (telemetry error) ...
                      // Map error to OpenAiError
                      const providerError = error instanceof AIProviderError ? error : new AIProviderError({ /*...*/ cause: error });
                      return new OpenAiError({ error: providerError as any });
                    }
                  });
                }
              }
            },
            embeddings: {
              create: (params: CreateEmbeddingRequest) => Effect.die(new AIProviderError({ message: "OllamaAdapter: embeddings.create not implemented", provider:"OllamaAdapter" }))
            },
            models: {
              list: () => Effect.die(new AIProviderError({ message: "OllamaAdapter: models.list not implemented", provider:"OllamaAdapter" }))
            }
            // Add other methods from Generated.Client as stubs if necessary
          },

          // Top-level stream method for streaming chat completions
          stream: (params: StreamCompletionRequest) => { // params here is StreamCompletionRequest
            const streamingParams = { ...params, stream: true }; // Ensure stream is true
            return Stream.async<ChatCompletionChunk, OpenAiError>(emit => { // Errors should be OpenAiError
              // ... (telemetry start) ...
              let ipcStreamCancel: (() => void) | undefined;
              try {
                ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                  streamingParams,
                  (chunk) => {
                    if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                      // IMPORTANT: Map the IPC chunk to OpenAi's ChatCompletionChunk format
                      // This mapping depends on the exact structure of your IPC chunk and ChatCompletionChunk
                      // For example:
                      const openAiChunk: ChatCompletionChunk = {
                        id: chunk.id || `ollama-chunk-${Date.now()}`,
                        object: "chat.completion.chunk",
                        created: chunk.created || Math.floor(Date.now() / 1000),
                        model: chunk.model || params.model,
                        choices: chunk.choices.map((ollamaChoice: any) => ({
                          index: ollamaChoice.index,
                          delta: {
                            role: ollamaChoice.delta?.role,
                            content: ollamaChoice.delta?.content,
                            // tool_calls: ollamaChoice.delta?.tool_calls, // If supporting tool calls
                          },
                          finish_reason: ollamaChoice.finish_reason,
                          // logprobs: ollamaChoice.logprobs // If available & needed
                        })),
                        // usage: chunk.usage // if Ollama stream provides final usage
                      };
                      emit.single(openAiChunk);
                    } else { /* ... handle unexpected chunk, emit.fail with OpenAiError ... */ }
                  },
                  () => { /* ... telemetry done, emit.end() ... */ emit.end(); },
                  (error) => {
                    const providerError = new AIProviderError({ /* ... */ cause: error });
                    emit.failCause(Cause.die(new OpenAiError({ error: providerError as any })));
                  }
                );
              } catch (e) { /* ... handle setup exception, emit.fail with OpenAiError ... */ }
              return Effect.sync(() => {
                if (ipcStreamCancel) { /* ... telemetry cancel, ipcStreamCancel() ... */ }
              });
            });
          },

          // streamRequest can be a stub if not used
          streamRequest: <A>(request: HttpClientRequest.HttpClientRequest) =>
            Stream.die("streamRequest not implemented for OllamaAsOpenAIClient") as Stream.Stream<A, HttpClientError.HttpClientError>,
        });
      })
    );
    ```
    3.  **HttpClientResponse.json Usage**:
        *   The error `Property 'json' does not exist on type 'typeof import("@effect/platform/dist/dts/HttpClientResponse")'` means your attempt to construct error responses is incorrect.
        *   Use `HttpClientResponse.empty({ status: 500 }).pipe(HttpClientResponse.jsonBody(Effect.succeed({ error: "Your error message" })))` to create a JSON error response effect. Or, if the error is already an `OpenAiError` (which it should be for the client interface), let it propagate. If you are constructing an `HttpClientResponse` to *be* the error (e.g., for `HttpClientError.ResponseError`), this is how you'd do it.
        *   However, the `OpenAiClient.Service` methods are expected to fail with `OpenAiError`, not `HttpClientError.ResponseError`. So, simply `Effect.fail(new OpenAiError({ error: yourAIProviderError }))` is the correct pattern for error paths. Remove the `HttpClientResponse.json` calls from error handling.

**III. Telemetry Service Schema Fix (Addressing TS2554, TS2353)**

*   **File:** `src/services/telemetry/TelemetryService.ts`
*   **Problem:** `Schema.Record(Schema.String, Schema.Unknown)` is incorrect. Also, the `context` field was missing from `TelemetryEventSchema`.
*   **Instructions:**
    1.  Correct the `context` field definition:
        ```typescript
        // src/services/telemetry/TelemetryService.ts
        export const TelemetryEventSchema = Schema.Struct({
          category: Schema.String,
          action: Schema.String,
          value: Schema.optional(Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Undefined)),
          label: Schema.optional(Schema.String),
          timestamp: Schema.optional(Schema.Number),
          context: Schema.optional(Schema.record(Schema.String, Schema.Unknown)) // Corrected: use Schema.record
        });
        ```
    This fixes both the `TS2554` (from original error list) and `TS2353` (from logs).

**IV. `ollama-listeners.ts` Error Object Fix (Addressing TS2322)**

*   **File:** `src/helpers/ipc/ollama/ollama-listeners.ts`
*   **Problem:** The error object in `Effect.fail({ _tag: "OllamaHttpError", ... })` (line 129 of error list) is missing the `name` property.
*   **Instruction:**
    1.  Ensure `OllamaHttpError` (defined in `src/services/ollama/OllamaService.ts`) is a class that extends `Error` or `Data.TaggedError`. The provided file content shows it *does* extend `Error`.
    2.  In `ollama-listeners.ts`, instantiate it with `new`:
        ```typescript
        // src/helpers/ipc/ollama/ollama-listeners.ts (around line 129)
        // Instead of:
        // generateChatCompletion: () => Effect.fail({
        //   _tag: "OllamaHttpError", /*...*/
        // }),
        // Use:
        generateChatCompletion: () => Effect.fail(new OllamaHttpError( // Assuming OllamaHttpError constructor matches
          "Simulated Ollama HTTP Error from IPC listener", // message
          {}, // request
          {}  // response
        )),
        ```
        Adjust the constructor arguments to match your `OllamaHttpError` class definition.

**V. Fix Effect `R` Channel and `unknown` Types in Tests and Services**

*   **General Instruction:** For every `Effect.runPromise(program)` or `Effect.runPromiseExit(program)` call that fails with `R` not being `never`, you must use `program.pipe(Effect.provide(yourFullTestLayer))` where `yourFullTestLayer` provides all necessary mocked services.
*   **`src/services/telemetry/TelemetryServiceImpl.ts:62` (TS2322 `unknown` not `never`):**
    *   The `Effect.gen` inside `trackEvent` in `TelemetryServiceImpl.ts` itself looks okay regarding service dependencies. This error likely stems from how `TelemetryServiceLive` is constructed or used elsewhere without `TelemetryServiceConfigTag` being provided. Ensure `TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer))` is used consistently. The fix in `ollama-listeners.ts` (Instruction I) should help.
*   **Test Files (`OllamaAgentLanguageModelLive.test.ts`, `OllamaAsOpenAIClientLive.test.ts`, `runtime.test.ts`):**
    *   **`AgentLanguageModel.Tag` -> `AgentLanguageModel`**: Correct this wherever it occurs.
    *   **Spread `...actual`**: Change to `...(actual || {})`.
    *   **Mock Structures**:
        *   `OllamaAgentLanguageModelLive.test.ts:23`: The mock for `OllamaOpenAIClientTag` needs to be an object implementing `OpenAiClient.Service`. The `client` property of this mock should then implement `Generated.Client`.
            ```typescript
            // In OllamaAgentLanguageModelLive.test.ts
            const mockOllamaServiceClient: OpenAiClient.Service['client'] = { // Type it to match Generated.Client
              chat: { completions: { create: mockChatCompletionsCreateNonStreaming } },
              embeddings: { create: vi.fn(() => Effect.die("mock embeddings not implemented")) },
              models: { list: vi.fn(() => Effect.die("mock models.list not implemented")) }
            };
            const mockOllamaService: OpenAiClient.Service = {
              client: mockOllamaServiceClient,
              stream: mockChatCompletionsStream, // This is the top-level stream method
              streamRequest: vi.fn(() => Stream.die("mock streamRequest not implemented"))
            };
            const MockOllamaOpenAIClientLayer = Layer.succeed(OllamaOpenAIClientTag, mockOllamaService);
            ```
        *   **`OllamaAsOpenAIClientLive.test.ts:57-59`:** These tests access `client.client.chat`. If `OllamaAsOpenAIClientLive.ts` is fixed as per (II), the resolved `client` from `Effect.runPromise(Effect.service(OllamaOpenAIClientTag))` will be an instance of `OpenAiClient.Service`. So, you'd test `client.client.chat.completions.create` (for non-streaming) and `client.stream` (for streaming). The tests need to adapt to the actual service interface.
    *   **Provide Full Layers in Tests:**
        *   For `OllamaAgentLanguageModelLive.test.ts` (Line 128), `OllamaAsOpenAIClientLive.test.ts` (Line 128), `runtime.test.ts` (Lines 100, 111):
            *   The test `program` must be provided with a layer that satisfies *all* its dependencies. For service tests, mock all its direct dependencies. For `runtime.test.ts`, if testing `FullAppLayer`, ensure `FullAppLayer` itself is self-contained or its dependencies are mocked when building it for the test.

**VI. `Effect.runPromise` on `Stream`**

*   **Error:** `Argument of type 'Stream<...>' is not assignable to 'Effect<...>'`.
*   **Cause:** You cannot directly pass a `Stream` to `Effect.runPromise`.
*   **Fix:** If you want to consume the stream in a test, use `Stream.runCollect(myStream).pipe(Effect.runPromise)`.

Apply these changes carefully. Start with the schema and service interface fixes, then move to the implementations, and finally update the tests. Compile frequently.Okay, Agent. This is a substantial refactoring task, and the TypeScript errors indicate a few key areas need attention. Let's break this down.

**Core Issues Identified:**

1.  **Mismatched Interfaces:** Your custom `OpenAiClientService` in `OllamaAgentLanguageModelLive.ts` and the structure of the service provided by `OllamaAsOpenAIClientLive.ts` do not align with the actual `@effect/ai-openai`'s `OpenAiClient.Service` interface that `OpenAiLanguageModel.model()` expects.
2.  **Effect `R` Channel (Requirements):** Many errors are about an Effect still requiring services (its `R` channel is not `never`) when it's being run. This means necessary layers are not being provided.
3.  **Schema Definitions:** The `TelemetryEventSchema` has an issue.
4.  **Test Mocks and Setup:** Mocks in tests aren't correctly structured or provided.

**Here are specific instructions to fix these errors. Apply them in order and re-run `pnpm t` after each significant step.**

**Step 1: Fix `TelemetryService.ts` Schema**

*   **File:** `src/services/telemetry/TelemetryService.ts`
*   **Error:** `TS2554: Expected 1 arguments, but got 2.` for `Schema.Record(Schema.String, Schema.Unknown)` and the related Vitest test failure `TypeError: Cannot read properties of undefined (reading 'ast')`.
*   **Instruction:** Change `Schema.Record(Schema.String, Schema.Unknown)` to the correct functional syntax `Schema.record(Schema.String, Schema.Unknown)`.

    ```typescript
    // src/services/telemetry/TelemetryService.ts
    import { Effect, Context, Data, Schema, Layer } from "effect"; // Ensure Schema is imported

    // ... other code ...
    export const TelemetryEventSchema = Schema.Struct({
      category: Schema.String,
      action: Schema.String,
      value: Schema.optional(Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Undefined)),
      label: Schema.optional(Schema.String),
      timestamp: Schema.optional(Schema.Number),
      context: Schema.optional(Schema.record(Schema.String, Schema.Unknown)) // UPDATED LINE
    });
    // ... other code ...
    ```
    *This should resolve the Vitest startup error and related telemetry type issues.*

**Step 2: Refactor `OllamaAgentLanguageModelLive.ts`**

*   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
*   **Error:** `TS2345: Argument of type 'Service' is not assignable to parameter of type 'OpenAiClientService'.` (Line 128 of error list).
*   **Problem:** Your local `OpenAiClientService` interface and `createLanguageModel` function are incorrect. You should use the standard `OpenAiLanguageModel.model()` factory from `@effect/ai-openai`.
*   **Instructions:**
    1.  Delete the local `OpenAiClientService` interface (was lines 20-36 in your previous diff).
    2.  Delete the local `createLanguageModel` function (was lines 19 and 38 in your previous diff).
    3.  Ensure `OpenAiLanguageModel` is imported from `@effect/ai-openai`.
    4.  The `Effect.gen` block should look like this:

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    import { Layer, Effect, Stream, Context } from "effect";
    import {
      AgentLanguageModel,
      GenerateTextOptions,
      StreamTextOptions,
      GenerateStructuredOptions,
      AiTextChunk // Ensure this type is defined or imported from @effect/ai if used by AgentLanguageModel interface
    } from "@/services/ai/core";
    import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"; // Correct import
    import { ConfigurationService } from "@/services/configuration";
    import { AIProviderError, AIConfigurationError } from "@/services/ai/core/AIError";
    import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
    import { TelemetryService } from "@/services/telemetry";
    import type { AiResponse } from "@effect/ai/AiResponse";

    export const OllamaAgentLanguageModelLive = Layer.effect(
      AgentLanguageModel, // Use the Tag directly
      Effect.gen(function*(_) {
        const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is your Ollama client adapting OpenAiClient.Service
        const configService = yield* _(ConfigurationService);
        const telemetry = yield* _(TelemetryService);

        const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
          Effect.orElseSucceed(() => "gemma3:1b"), // Default model
          Effect.tapError(e => telemetry.trackEvent({ /* ... */ }).pipe(Effect.ignoreLogged)),
          Effect.mapError(e => new AIConfigurationError({ /* ... */ cause: e }))
        );
        const modelName = yield* _(modelNameEffect);
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "ollama_model_name_resolved", value: modelName }).pipe(Effect.ignoreLogged));

        // Use OpenAiLanguageModel.model directly from the library
        const aiModelEffectDefinition = OpenAiLanguageModel.model(modelName);

        // Provide the ollamaAdaptedClient (which implements OpenAiClient.Service)
        // The ollamaAdaptedClient IS the OpenAiClient.Service instance.
        const configuredAiModelEffect = Effect.provideService(
          aiModelEffectDefinition,
          OpenAiClient.OpenAiClient, // The Tag for the service OpenAiLanguageModel.model needs
          ollamaAdaptedClient         // Your Ollama adapter that implements OpenAiClient.Service
        );

        const provider = yield* _(configuredAiModelEffect); // This yields Provider<AiLanguageModel from @effect/ai>
        yield* _(telemetry.trackEvent({ category: "ai:config", action: "ollama_language_model_provider_created", value: modelName }).pipe(Effect.ignoreLogged));

        return AgentLanguageModel.of({
          _tag: "AgentLanguageModel",
          generateText: (params: GenerateTextOptions) =>
            provider.generateText(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateText error for model ${modelName}: ${err instanceof Error ? err.message : String(err)}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          streamText: (params: StreamTextOptions) =>
            provider.streamText(params).pipe(
              Stream.mapError(err => new AIProviderError({
                message: `Ollama streamText error for model ${modelName}: ${err instanceof Error ? err.message : String(err)}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
          generateStructured: (params: GenerateStructuredOptions) =>
            provider.generateStructured(params).pipe(
              Effect.mapError(err => new AIProviderError({
                message: `Ollama generateStructured error for model ${modelName}: ${err instanceof Error ? err.message : String(err)}`,
                cause: err, provider: "Ollama", context: { model: modelName, params, originalErrorTag: (err as any)._tag }
              }))
            ),
        });
      })
    );
    ```

**Step 3: Refactor `OllamaAsOpenAIClientLive.ts` Structure**

*   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
*   **Error:** `TS2353: ...'chat' does not exist in type 'Client'` and `HttpClientResponse.json` errors.
*   **Problem:** The service object must match `@effect/ai-openai`'s `OpenAiClient.Service` interface. This interface has a `client` property (which is the actual client with methods like `chat.completions.create`) and top-level `streamRequest` and `stream` methods. The main `stream` method is used by `OpenAiLanguageModel.model()` for streaming chat.
*   **Instructions:**
    1.  **Correct type imports from `@effect/ai-openai`**:
        ```typescript
        // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
        import { Layer, Effect, Stream, Cause, Context } from "effect";
        import { OpenAiClient, OpenAiError } from "@effect/ai-openai";
        import type {
          ChatCompletionCreateParams, // Correct type for chat completion params
          ChatCompletion,
          ChatCompletionChunk,
          StreamCompletionRequest // Type for the service.stream() method parameters
        } from "@effect/ai-openai"; // Or from a sub-module like @effect/ai-openai/Chat if needed
        import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
        import * as HttpClientResponse from "@effect/platform/HttpClientResponse"; // For constructing responses if needed
        import * as HttpClientError from "@effect/platform/HttpClientError";
        // ... other imports
        ```
    2.  **Restructure the service object:**
        *   The `client` property's methods (like `chat.completions.create`) should handle *non-streaming* IPC calls.
        *   The top-level `stream` method should handle *streaming* IPC calls.
        *   Error handling should use `Effect.fail(new OpenAiError({ error: yourAIProviderError }))`.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    // ... (imports including TelemetryService) ...
    export const OllamaOpenAIClientTag = OpenAiClient.OpenAiClient; // This is Tag<OpenAiClient.Service>

    export const OllamaAsOpenAIClientLive = Layer.effect(
      OllamaOpenAIClientTag,
      Effect.gen(function*(_) {
        const telemetry = yield* _(TelemetryService);
        const ollamaIPC = window.electronAPI?.ollama; // Keep optional chaining for safety

        if (!ollamaIPC?.generateChatCompletion || !ollamaIPC?.generateChatCompletionStream) {
            // ... (error handling as before, returning Effect.die) ...
            const errorMsg = "Ollama IPC bridge is not fully available.";
            yield* _(telemetry.trackEvent({ /* ... */ }).pipe(Effect.ignoreLogged));
            return yield* _(Effect.die(new AIProviderError({ message: errorMsg, provider: "OllamaAdapterSetup" })));
        }

        return OllamaOpenAIClientTag.of({
          // client property must match OpenAiClient.Service['client'] (i.e., Generated.Client)
          client: {
            chat: {
              completions: {
                create: (params: ChatCompletionCreateParams) => { // params is ChatCompletionCreateParams
                  const nonStreamingParams = { ...params, stream: false };
                  return Effect.tryPromise({
                    try: async () => {
                      // ... (telemetry start as before) ...
                      const response = await ollamaIPC.generateChatCompletion(nonStreamingParams);
                      if (response && response.__error) {
                        const providerError = new AIProviderError({ /* ... */ cause: response });
                        // ... (telemetry error as before) ...
                        throw providerError; // Throw to be caught by catch block
                      }
                      // ... (telemetry success as before) ...
                      // Ensure 'response' matches the structure of 'ChatCompletion' from @effect/ai-openai
                      return response as ChatCompletion;
                    },
                    catch: (error) => {
                      // ... (telemetry error as before) ...
                      const providerError = error instanceof AIProviderError ? error : new AIProviderError({ message: `Ollama IPC non-stream request failed: ${error instanceof Error ? error.message : String(error)}`, provider: "OllamaAdapter(IPC-NonStream)", cause: error, context: { model: params.model } });
                      return new OpenAiError({ error: providerError as any }); // Ensure this matches OpenAiError constructor
                    }
                  });
                }
              }
            },
            // Stubs for other Generated.Client methods
            embeddings: { create: (params: any) => Effect.die("embeddings.create not implemented for Ollama") },
            models: { list: () => Effect.die("models.list not implemented for Ollama") }
          },

          // Top-level stream method for streaming chat completions
          stream: (request: StreamCompletionRequest) => { // request is StreamCompletionRequest
            const streamingParams = { ...request, stream: true }; // Ensure stream is true
            return Stream.async<ChatCompletionChunk, OpenAiError>(emit => {
              // ... (telemetry start as before) ...
              let ipcStreamCancel: (() => void) | undefined;
              try {
                ipcStreamCancel = ollamaIPC.generateChatCompletionStream(
                  streamingParams,
                  (chunk) => { // This is your IPC chunk
                    if (chunk && typeof chunk === 'object' && 'choices' in chunk) {
                      // Map the IPC chunk to OpenAi's ChatCompletionChunk format
                      const openAiChunk: ChatCompletionChunk = {
                        id: chunk.id || `ollama-chunk-${Date.now()}`,
                        object: "chat.completion.chunk",
                        created: chunk.created || Math.floor(Date.now() / 1000),
                        model: chunk.model || request.model,
                        choices: chunk.choices.map((ollamaChoice: any) => ({
                          index: ollamaChoice.index,
                          delta: { role: ollamaChoice.delta?.role, content: ollamaChoice.delta?.content },
                          finish_reason: ollamaChoice.finish_reason,
                        })),
                      };
                      emit.single(openAiChunk);
                    } else {
                      const err = new AIProviderError({ message: "Ollama IPC stream received unexpected chunk format", provider: "OllamaAdapter(IPC-Stream)", context: { chunk }});
                      emit.failCause(Cause.die(new OpenAiError({ error: err as any })));
                    }
                  },
                  () => { /* ... telemetry done ... */ emit.end(); },
                  (error) => {
                    const providerError = new AIProviderError({ message: `Ollama IPC stream error: ${(error as any)?.message || String(error)}`, provider: "OllamaAdapter(IPC-Stream)", cause: error, context: { model: request.model }});
                    emit.failCause(Cause.die(new OpenAiError({ error: providerError as any })));
                  }
                );
              } catch (e) {
                const setupError = new AIProviderError({ message: `Failed to setup Ollama IPC stream: ${e instanceof Error ? e.message : String(e)}`, provider: "OllamaAdapterSetup(IPC-Stream)", cause: e });
                emit.failCause(Cause.die(new OpenAiError({ error: setupError as any })));
              }
              return Effect.sync(() => {
                if (ipcStreamCancel) { /* ... telemetry cancel ... */ ipcStreamCancel(); }
              });
            });
          },

          // streamRequest can be a stub
          streamRequest: <A>(request: HttpClientRequest.HttpClientRequest) =>
            Stream.die("streamRequest not implemented for OllamaAsOpenAIClient") as Stream.Stream<A, HttpClientError.HttpClientError>,
        });
      })
    );
    ```

**Step 4: Fix `ollama-listeners.ts` IPC Handlers**

*   **File:** `src/helpers/ipc/ollama/ollama-listeners.ts`
*   **Errors:** `TS2322` (OllamaHttpError shape), `TS2345` (Effect `R` channel), `TS2339` (`errorForIPC.message`).
*   **Instructions:**
    1.  **`OllamaHttpError` instantiation (Line 129 of error list):** Use `new OllamaHttpError(...)` if `OllamaHttpError` is a class defined in `src/services/ollama/OllamaService.ts`. It is. Ensure the constructor signature matches.
        ```typescript
        // src/helpers/ipc/ollama/ollama-listeners.ts, in the fallback OllamaService layer:
        generateChatCompletion: () => Effect.fail(new OllamaHttpError(
          "Ollama service not properly initialized", // message
          {}, // request (placeholder or more specific)
          {}  // response (placeholder or more specific)
        )),
        ```
    2.  **Provide Full Layer for IPC Effects:**
        *   Define a comprehensive layer at the beginning of `addOllamaEventListeners`:
            ```typescript
            // src/helpers/ipc/ollama/ollama-listeners.ts
            const configuredTelemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
            const configuredOllamaServiceLayer = OllamaServiceLive.pipe(
                Layer.provide(UiOllamaConfigLive),
                Layer.provide(NodeHttpClient.layer), // Use NodeHttpClient for main process
                Layer.provide(configuredTelemetryLayer)
            );
            const servicesForIpcHandler = Layer.mergeAll(configuredOllamaServiceLayer, configuredTelemetryLayer);
            ```
        *   Use `program.pipe(Effect.provide(servicesForIpcHandler))` for all `Effect.runPromise` and `Effect.runPromiseExit` calls.
    3.  **`extractErrorForIPC` Return Type:**
        *   Define an interface `IpcErrorObject { __error: true; name: string; message: string; ... }`
        *   Make `extractErrorForIPC` return `IpcErrorObject`. Ensure `message` is always a string. This will fix `TS2339` for `errorForIPC.message`.

**Step 5: Update Test Files**

*   **General:**
    *   Replace `AgentLanguageModel.Tag` with `AgentLanguageModel`.
    *   Guard `...actual` spreads: `...(actual || {})`.
    *   Remove `trackError` from `MockTelemetryService` if it's not in the `TelemetryService` interface.
*   **`src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`:**
    *   **Mock Structure (Line 23):** The mock for `OllamaOpenAIClientTag` should implement `OpenAiClient.Service`.
        ```typescript
        // In OllamaAgentLanguageModelLive.test.ts
        const mockClientImplementation: OpenAiClient.Service['client'] = {
          chat: { completions: { create: mockChatCompletionsCreate /* non-streaming mock */ } },
          // ... other client methods as stubs ...
          embeddings: { create: vi.fn(() => Effect.die("embeddings.create mock")) },
          models: { list: vi.fn(() => Effect.die("models.list mock")) },
        };
        const mockOllamaOpenAIService: OpenAiClient.Service = {
          client: mockClientImplementation,
          stream: mockChatCompletionsStream, // mock for streaming
          streamRequest: vi.fn(() => Stream.die("streamRequest mock")),
        };
        const MockOllamaOpenAIClientLayer = Layer.succeed(OllamaOpenAIClientTag, mockOllamaOpenAIService);
        ```
    *   **Test Layer Dependencies:** The `testLayer` needs to provide `HttpClient.Tag` (even if mocked) because `OpenAiLanguageModel.model()` might require it.
        ```typescript
        const MockHttpClientLayer = Layer.succeed(HttpClient.HttpClient, mockHttpClientImpl); // Define mockHttpClientImpl
        testLayer = OllamaAgentLanguageModelLive.pipe(
          Layer.provide(MockOllamaOpenAIClientLayer),
          Layer.provide(MockConfigurationService),
          Layer.provide(MockTelemetryService),
          Layer.provide(MockHttpClientLayer) // ADD THIS
        );
        // Then program.pipe(Effect.provide(testLayer))
        ```
*   **`src/tests/unit/services/ai/providers/ollama/OllamaAsOpenAIClientLive.test.ts`:**
    *   **Test Layer Dependencies (Line 128):** `OllamaAsOpenAIClientLive` requires `TelemetryService`.
        ```typescript
        const testLayer = OllamaAsOpenAIClientLive.pipe(Layer.provide(MockTelemetryService));
        // program.pipe(Effect.provide(testLayer))
        ```
    *   **Asserting Client Structure (Lines 57-59):** After fixing `OllamaAsOpenAIClientLive.ts`, the `client` variable in the test (which is an instance of `OpenAiClient.Service`) will have `client.client.chat.completions.create` for non-streaming and `client.stream` for streaming. Update assertions.
    *   **`delete global.window.electronAPI.ollama` (Line 74):**
        *   Use `(globalThis as any).window` instead of `global.window`.
        *   Make `ollama` optional in `src/helpers/ipc/ollama/ollama-context.ts`'s global declaration:
            ```typescript
            // src/helpers/ipc/ollama/ollama-context.ts
            interface Window { electronAPI: { ollama?: { /* ... */ }; /* ... */ }; }
            ```
*   **`src/tests/unit/services/runtime.test.ts`:**
    *   **Effect `R` Channel (Lines 100, 111):** Review `FullAppLayer` in `src/services/runtime.ts`. Ensure all layers have their dependencies satisfied *within* `FullAppLayer`. For example, `ollamaLanguageModelLayer` depends on `ollamaAdapterClientLayer`, which needs `TelemetryService`. Ensure `telemetryLayer` is part of `FullAppLayer` and available to `ollamaAdapterClientLayer`.
        *   Modify `FullAppLayer` in `src/services/runtime.ts` to correctly sequence or merge layers:
            ```typescript
            // src/services/runtime.ts
            const telemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
            const configLayer = ConfigurationServiceLive.pipe(Layer.provide(telemetryLayer));
            const devConfigLayer = DefaultDevConfigLayer.pipe(Layer.provide(configLayer));

            const ollamaAdapterClientLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
              Layer.provide(telemetryLayer) // OllamaAdapterClientLive needs Telemetry
            );
            const ollamaLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLive.pipe(
              Layer.provide(ollamaAdapterClientLayer),
              Layer.provide(devConfigLayer), // Needs config for model name
              Layer.provide(telemetryLayer)   // And telemetry
            );
            // ... ensure other layers also get their deps ...

            export const FullAppLayer = Layer.mergeAll(
              telemetryLayer,
              devConfigLayer,
              BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient globally
              // ... other base services ...
              ollamaLanguageModelLayer, // Provides AgentLanguageModel via Ollama
              // ... other app layers ...
            );
            ```
        *   Then, in `runtime.test.ts`, when testing `FullAppLayer`:
            ```typescript
            // line 100:
            // const program = Layer.toRuntime(FullAppLayer).pipe(Effect.scoped); // This IS an Effect
            // await expect(Effect.runPromise(program)).resolves.toBeDefined(); // This is correct if FullAppLayer is R=never

            // line 111:
            // const result = await Effect.runPromise(Effect.provide(program, FullAppLayer)); // This is correct if program needs services from FullAppLayer
            ```
            The errors suggest `FullAppLayer` still has unmet dependencies.

**Final Check:** After these changes, run `pnpm t` again. Address any remaining errors by carefully checking the Effect-TS documentation for layer composition and service dependencies, and the `@effect/ai` library documentation for the exact interfaces of `OpenAiClient.Service` and `OpenAiLanguageModel`.

This is a complex set of fixes. Focus on one file or one error type at a time. Good luck!
