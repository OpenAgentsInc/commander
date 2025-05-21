Okay, agent, let's get these type errors sorted out. We'll go step-by-step, focusing on the easier fixes first.

**Instruction Set 1: Easy Fixes - Schemas, Error Handling, and Basic Mocks**

**1. Fix `TelemetryService.ts` Schema Error**
   *   **File:** `src/services/telemetry/TelemetryService.ts`
   *   **Error:** `TS2554: Expected 1 arguments, but got 2.` (Line 10)
   *   **Instruction:** The `Schema.Record` constructor expects a single argument defining the structure. For a record with string keys and unknown values, you should use `Schema.record(Schema.String, Schema.Unknown)`.

    ```typescript
    // src/services/telemetry/TelemetryService.ts
    // ...
    export const TelemetryEventSchema = Schema.Struct({
      category: Schema.String,
      action: Schema.String,
      value: Schema.optional(Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Undefined)),
      label: Schema.optional(Schema.String),
      timestamp: Schema.optional(Schema.Number),
      context: Schema.optional(Schema.record(Schema.String, Schema.Unknown)) // FIX: Use Schema.record
    });
    // ...
    ```

**2. Fix `instanceof Error` and `.message` Access in `OllamaAgentLanguageModelLive.ts`**
   *   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
   *   **Error:** `TS2358` (instanceof on `never`), `TS2339` (property `message` on `never`) (Line 64)
   *   **Cause:** The error variable `e` in `Effect.tapError(e => ...)` or `Effect.mapError(e => ...)` after an `Effect.orElseSucceed(...)` has its error channel typed as `never`.
   *   **Instruction:** Move the `tapError` and `mapError` calls *before* `Effect.orElseSucceed(...)` so that `e` is still typed as the original error (e.g., `ConfigError`).

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    // ...
    const modelNameEffect = configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.tapError(e => telemetry.trackEvent({ // MOVED UP
        category: "ai:config:error", action: "ollama_model_name_fetch_failed_raw", label: "OLLAMA_MODEL_NAME",
        value: (e instanceof Error ? e.message : String(e)) // 'e' should now be ConfigError
      }).pipe(Effect.ignoreLogged)),
      Effect.mapError(e => new AIConfigurationError({ // MOVED UP
        message: "Error fetching Ollama Model Name config.", cause: e, context: { keyName: "OLLAMA_MODEL_NAME" }
      })),
      Effect.orElseSucceed(() => "gemma3:1b") // Default model if not configured
      // REMOVE tapError and mapError from here
    );
    // ...
    ```

**3. Fix `reason: "NotImplemented"` in `OllamaAsOpenAIClientLive.ts`**
   *   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
   *   **Error:** `TS2322` ("NotImplemented" is not assignable to "StatusCode" | "Decode" | "EmptyBody") (Lines 163, 175, 325)
   *   **Instruction:** Change `reason: "NotImplemented"` to `reason: "StatusCode"` for these `HttpClientError.ResponseError` instances, as this is a valid reason and appropriate for a 501 status.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    // Example for line 163 (apply to 175 and 325 as well):
    // ...
    // response: HttpClientResponse.empty({ status: 501 }), // Keep this if it works
    // reason: "NotImplemented", // OLD
    reason: "StatusCode", // FIX
    // ...
    ```

**4. Fix `error: providerError` in `OllamaAsOpenAIClientLive.ts`**
   *   **File:** `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`
   *   **Error:** `TS2353` ('error' does not exist in type '{...}') (Lines 151, 242, 277, 301)
   *   **Cause:** The `HttpClientError.ResponseError` (or similar error constructors) expect the underlying error to be passed via the `cause` property.
   *   **Instruction:** Change `error: providerError` (or similar) to `cause: providerError`.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts
    // Example for line 151 (apply to 242, 277, 301 as well):
    // ...
    // error: providerError, // OLD
    cause: providerError, // FIX
    // ...
    ```

**5. Fix `HttpClient.Tag` in `OllamaAgentLanguageModelLive.test.ts`**
   *   **File:** `src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts`
   *   **Error:** `TS2339: Property 'Tag' does not exist on type 'Tag<HttpClient, HttpClient>'` (Line 48)
   *   **Cause:** If `HttpClient` is imported from `@effect/platform/HttpClient`, the service tag is usually `HttpClient.HttpClient` or simply `HttpClient` if it's the default export or a re-exported tag.
   *   **Instruction:** Change `HttpClient.Tag` to `HttpClient.HttpClient`.

    ```typescript
    // src/tests/unit/services/ai/providers/ollama/OllamaAgentLanguageModelLive.test.ts
    // ...
    import * as HttpClient from "@effect/platform/HttpClient"; // Assuming this is the import
    // ...
    // const MockHttpClient = Layer.succeed(HttpClient.Tag, mockHttpClient); // OLD
    const MockHttpClient = Layer.succeed(HttpClient.HttpClient, mockHttpClient); // FIX
    // ...
    ```

**6. Fix Spread Operator in `runtime.test.ts`**
   *   **File:** `src/tests/unit/services/runtime.test.ts`
   *   **Error:** `TS2698: Spread types may only be created from object types.` (Line 10)
   *   **Cause:** The `actual` variable (likely from `await importOriginal()`) might be `undefined` if the module doesn't exist or the mock is faulty.
   *   **Instruction:** Guard the spread operator by providing an empty object fallback.

    ```typescript
    // src/tests/unit/services/runtime.test.ts
    // Inside vi.mock:
    // const actual = await importOriginal(); // OLD
    // return {
    //   ...actual, // OLD
    //   // ... your overrides ...
    // };
    const actual = await importOriginal<typeof import('some-module-being-mocked')>(); // Type the import
    return {
      ...(actual || {}), // FIX
      // ... your overrides ...
    };
    ```
    *(Apply this pattern to Line 10 in `runtime.test.ts` and similarly to Line 15 in `OllamaAgentLanguageModelLive.test.ts` and Line 11 in `OllamaAsOpenAIClientLive.test.ts` if they follow the same `vi.mock` pattern.)*

**7. Update `OllamaAgentLanguageModelLive.ts` Mock `AiResponse` and `AiTextChunk`**
   *   **File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`
   *   **Error:** `TS2352` (Conversion to `AiResponse` missing properties) (Lines 23, 31, 36, 45)
   *   **Instruction:** The mock objects cast to `AiResponse` and `AiTextChunk` must include the minimum required properties. Refer to `@effect/ai/AiResponse` for the `AiResponse` interface structure (it includes `role: string` and `parts: ReadonlyArray<AiMessagePart>`). `AiTextChunk` typically has `{ text: string; isComplete?: boolean }`.

    ```typescript
    // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
    // Inside the mock OpenAiLanguageModel.model:

    // For AiResponse (e.g., generateText and generateStructured):
    // ...
    generateText: (params: any): Effect.Effect<AiResponse, unknown> => Effect.succeed({
      text: "Not implemented in mock",
      usage: { total_tokens: 0 },
      imageUrl: "", // Common optional field, add if in your AiResponse
      content: [],  // Common optional field for raw content parts
      role: "assistant", // REQUIRED by AiResponse
      parts: [{ _tag: "text", content: "Not implemented in mock" }], // REQUIRED by AiResponse (minimal part)
      // Add other stubs for AiResponse methods if necessary for type-checking
      withToolCallsJson: () => ({} as AiResponse), // Stub
      withToolCallsUnknown: () => ({} as AiResponse), // Stub
      concat: (_other: AiResponse) => ({} as AiResponse), // Stub
      // TypeId symbols if AiResponse extends Equal/Hash from Effect Data
      [Symbol.for("@effect/data/Equal")]: () => false,
      [Symbol.for("@effect/data/Hash")]: () => 0,
    } as AiResponse),

    // For AiTextChunk (e.g., streamText):
    streamText: (params: any): Stream.Stream<AiTextChunk, unknown> => Stream.succeed({
      text: "Not implemented in mock",
      isComplete: false // Often part of AiTextChunk
    } as AiTextChunk),
    // ... apply similar minimal structure to generateStructured mock ...
    ```
    *You'll need to inspect the actual `AiResponse` and `AiTextChunk` interfaces from `@effect/ai` (or your core types if you re-defined them) and ensure your mocks satisfy their structure.*

After applying these fixes, run `pnpm t` again. This should clear out a good chunk of the "easy" errors. We can then tackle the more complex ones related to layer provisioning and mock interface structures.
