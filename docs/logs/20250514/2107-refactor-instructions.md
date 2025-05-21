Okay, this is an excellent opportunity to elevate the robustness and idiomaticity of the `OllamaService` by re-integrating Schemas for validation and adopting full Layer-based testing. This will make the service more resilient to unexpected API changes and ensure its dependencies are correctly managed and tested.

Here are the detailed instructions for the coding agent:

**Overall Goal:**
Refactor the existing `OllamaService` to:

1.  Utilize Effect's `Schema` module (from the main `effect` package) for robust request validation and response parsing.
2.  Employ Layer-based testing to resolve `OllamaService` and its dependencies (`HttpClient`, `OllamaServiceConfig`) in tests, ensuring proper dependency injection and test isolation.

**Important Notes for the Agent:**

- **TDD is Key:** For each sub-step, aim to write a failing test (or identify how an existing test would fail/improve) before implementing the change. Run `pnpm run t` (typecheck) and `pnpm test` frequently.
- **Schema API:** You will need to consult the official Effect Schema documentation at `https://effect.website/docs/schema/introduction/` to understand the current API. You can also directly inspect the `node_modules/effect/Schema` source code if needed. The API may differ from the older standalone `@effect/schema` package.
- **Logging:** Continue to log your progress, challenges, and solutions in `docs/logs/20250514/2044-ollama-effect-log.md`.

---

**Phase 1: Re-integrate Effect Schemas**

**Step 1.1: Research and Initial Schema Definition**

- **Action:** Before writing code, consult `https://effect.website/docs/schema/introduction/` and related pages (`Structs`, `Transformations`, `Encoding & Decoding`, `Errors`).
- **Goal:** Understand how to define structs, optional fields, default values, and how to perform parsing/decoding that results in an `Effect`.
- **File:** `src/services/ollama/OllamaService.ts`
- **Task 1:** Redefine `OllamaMessage` using the new `Schema` API.

  ```typescript
  // Example structure to aim for (adapt based on current Schema API)
  import * as S from "effect/Schema";

  export const OllamaMessageSchema = S.Struct({
    role: S.Literal("system", "user", "assistant"),
    content: S.String,
  });
  export type OllamaMessage = S.Schema.Type<typeof OllamaMessageSchema>;
  ```

- **Task 2:** Redefine `OllamaServiceConfig` using `S.Struct` (or `S.Class` if appropriate and well-understood from docs). Pay attention to how `defaultModel` can be handled.
  ```typescript
  // Example
  export const OllamaServiceConfigSchema = S.Struct({
    baseURL: S.String, // Add .pipe(S.pattern(...)) if straightforward
    defaultModel: S.optional(S.String, {
      exact: true,
      default: () => "llama2",
    }), // Check API for optional with default
  });
  export type OllamaServiceConfig = S.Schema.Type<
    typeof OllamaServiceConfigSchema
  >;
  // Keep the OllamaServiceConfigTag = Context.Tag<OllamaServiceConfig>();
  ```
- **Typecheck:** Run `pnpm run t`.

**Step 1.2: Schema for Request (`OllamaChatCompletionRequestSchema`)**

- **File:** `src/services/ollama/OllamaService.ts`
- **Task:** Define `OllamaChatCompletionRequestSchema` using `S.Struct` and referencing `OllamaMessageSchema`. Handle the optional `model` and `stream` (with default `false`).
  ```typescript
  // Example structure to aim for
  export const OllamaChatCompletionRequestSchema = S.Struct({
    model: S.optional(S.String, { exact: true }), // Optional, no default here, handled in service logic or config
    messages: S.Array(OllamaMessageSchema),
    stream: S.optional(S.Boolean, { exact: true, default: () => false }),
  });
  export type OllamaChatCompletionRequest = S.Schema.Type<
    typeof OllamaChatCompletionRequestSchema
  >;
  ```
- **Typecheck:** `pnpm run t`.

**Step 1.3: Schema for Response (`OllamaChatCompletionResponseSchema`)**

- **File:** `src/services/ollama/OllamaService.ts`
- **Task:** Define `OllamaChatCompletionChoiceSchema`, `OllamaChatCompletionUsageSchema`, and `OllamaChatCompletionResponseSchema`. Pay attention to optional fields like `usage`.
- **Typecheck:** `pnpm run t`.

**Step 1.4: Integrate Request Validation into `OllamaServiceImpl.ts`**

- **File:** `src/services/ollama/OllamaServiceImpl.ts`
- **Background:** Currently, the `requestBody` is used directly. We need to parse/decode it first.
- **Task:**


      1.  In `generateChatCompletion`, before making the HTTP request, use `S.decodeUnknown(OllamaChatCompletionRequestSchema)(requestBody)` (or the equivalent API for decoding an `unknown` input).
      2.  This decoding will return an `Effect`. If it fails, it should yield an `OllamaParseError`. You'll need to `Effect.mapError` the schema parsing error into your `OllamaParseError`.
      3.  The successfully decoded request (let's call it `decodedRequest`) should then be used to construct `finalRequestBody`. The logic for `model: decodedRequest.model || config.defaultModel` should now use the potentially decoded and defaulted values from the schema if applicable, or remain explicit.

- **Test (Mental or Actual):**
- How would an invalid `requestBody` (e.g., `messages` is not an array, or `role` is invalid) be handled? It should result in an `OllamaParseError`.
- Add a new test case in `OllamaService.test.ts` that sends a structurally invalid request body and asserts that an `OllamaParseError` is produced.
- **Typecheck & Test:** `pnpm run t && pnpm test`.

**Step 1.5: Integrate Response Parsing into `OllamaServiceImpl.ts`**

- **File:** `src/services/ollama/OllamaServiceImpl.ts`
- **Background:** Currently, response parsing involves `response.json()` followed by manual type checks.
- **Task:**


      1.  After `const json = yield* _(Effect.tryPromise(() => response.json())...);`, replace the manual validation checks with `S.decodeUnknown(OllamaChatCompletionResponseSchema)(json)`.
      2.  This will return an `Effect`. Map its error to `OllamaParseError`.
      3.  The success value of this effect will be the strongly-typed `OllamaChatCompletionResponse`.

- **Test (Mental or Actual):**
- Modify the MSW handler for `malformed-response-model` to return a JSON object that is structurally valid JSON but _not_ a valid `OllamaChatCompletionResponse` (e.g., missing `choices` array, or `choices[0].message` is incorrect).
- The existing test for `malformed-response-model` should still pass, but now the error should originate from schema decoding.
- **Typecheck & Test:** `pnpm run t && pnpm test`.

**Step 1.6: (Optional but Recommended) Redefine Custom Errors with Schema**

- **File:** `src/services/ollama/OllamaService.ts`
- **Background:** You currently have custom error classes. `effect/Schema` might offer `S.TaggedError` or a similar constructor for creating schema-backed error classes.
- **Task:**


      1.  Investigate if `S.TaggedError` (or its equivalent in the current Schema API) is suitable.
      2.  If so, redefine `OllamaError`, `OllamaHttpError`, and `OllamaParseError` using it. This provides schema validation for your error objects themselves.
         ```typescript
         // Example from original instructions, adapt to new Schema API
         // export class OllamaParseError extends S.TaggedError<OllamaParseError>()("OllamaParseError", {
         //   message: S.String,
         //   data: S.Unknown, // The data that failed to parse
         // }) {}
         ```

- **Impact:** Update `OllamaServiceImpl.ts` where these errors are instantiated.
- **Typecheck & Test:** `pnpm run t && pnpm test`. Ensure error tests still correctly identify error types and messages.

---

**Phase 2: Implement Layer-Based Testing**

**Background:**
The current tests in `OllamaService.test.ts` use `createOllamaService(testConfig)` which directly instantiates the service implementation. We want to test the `OllamaServiceLive` Layer, which involves providing its dependencies (`HttpClient.HttpClient` and `OllamaServiceConfigTag`) as Layers.

**Step 2.1: Create a Mock `HttpClient` Layer (`TestHttpClientLive`)**

- **File:** `src/tests/unit/services/ollama/TestHttpClient.ts` (new file)
- **Goal:** Create a mock implementation of `HttpClient.HttpClient` that can be controlled by tests to return specific responses or errors.
- **Task:**

  ```typescript
  import { Effect, Layer, Context, Data } from "effect";
  import {
    HttpClient,
    HttpClientRequest,
    HttpClientResponse,
    HttpClientError,
  } from "@effect/platform/HttpClient";

  // Define a type for expected mock responses, keyed by something identifiable from the request
  // For simplicity, let's use URL and method, or a more specific request signature.
  export type MockClientResponse = Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >;
  export const mockClientResponses = new Map<string, MockClientResponse>();

  // Helper to create a request key (customize as needed)
  const makeRequestKey = (req: HttpClientRequest.HttpClientRequest): string => {
    return `${req.method}:${req.url}`;
  };

  // The mock HttpClient implementation
  const TestHttpClientImpl = HttpClient.HttpClient.of({
    execute: (request: HttpClientRequest.HttpClientRequest) =>
      Effect.gen(function* (_) {
        const key = makeRequestKey(request);
        const mockEffect = mockClientResponses.get(key);
        if (mockEffect) {
          // If you need to simulate delay or other aspects:
          // yield* _(Effect.sleep("1 ms"));
          return yield* _(mockEffect);
        }
        return yield* _(
          Effect.fail(
            HttpClientError.RequestError({
              request,
              reason: "NetworkError", // Or a more specific error
              error: new Error(`No mock response configured for ${key}`),
            }),
          ),
        );
      }),
  });

  // The Layer for the mock HttpClient
  export const TestHttpClientLive = Layer.succeed(
    HttpClient.HttpClient,
    TestHttpClientImpl,
  );

  // Utility for tests to set up responses
  export const setMockClientResponse = (
    requestMatcher: { url: string; method: string }, // Or a more complex matcher
    responseEffect: MockClientResponse,
  ) =>
    Effect.sync(() =>
      mockClientResponses.set(
        `${requestMatcher.method}:${requestMatcher.url}`,
        responseEffect,
      ),
    );

  export const clearMockClientResponses = () =>
    Effect.sync(() => mockClientResponses.clear());
  ```

- **Typecheck:** `pnpm run t`.

**Step 2.2: Update `OllamaService.test.ts` to Use Layers**

- **File:** `src/tests/unit/services/ollama/OllamaService.test.ts`
- **Task 1:** Import `TestHttpClientLive`, `setMockClientResponse`, `clearMockClientResponses` from your new `TestHttpClient.ts`. Import `OllamaServiceLive` from `src/services/ollama/index.ts` (or `OllamaServiceImpl.ts` if it's still exporting the Layer directly).
- **Task 2:** Define the `ConfigLive` layer (you might already have this or similar):
  ```typescript
  const testConfig: OllamaServiceConfig = {
    /* ... */
  }; // Your existing test config
  const ConfigLive = Layer.succeed(OllamaServiceConfigTag, testConfig);
  ```
- **Task 3:** Define the main `testLayer` that combines `OllamaServiceLive` with its mocked dependencies:
  ```typescript
  const ollamaTestLayer = Layer.provide(
    OllamaServiceLive, // The actual service layer we want to test
    Layer.merge(TestHttpClientLive, ConfigLive), // Its dependencies
  );
  ```
- **Task 4:** In your `beforeEach` or `afterEach` test hooks, use `Effect.runSync(clearMockClientResponses())` to ensure mocks are cleared between tests.
- **Typecheck:** `pnpm run t`.

**Step 2.3: Refactor Tests to Resolve Service from Layer and Use Mock `HttpClient`**

- **File:** `src/tests/unit/services/ollama/OllamaService.test.ts`
- **Task (for each test case):**


      1.  **Remove Direct Instantiation:** Delete `const ollamaService = createOllamaService(testConfig);`.
      2.  **Set Mock Response:** Before running the Effect that uses the service, use `Effect.runSync(setMockClientResponse(...))` to configure the `TestHttpClientLive`'s behavior for the specific request that test will make.
          *   You'll need to know the URL (`config.baseURL + "/chat/completions"`) and method (`POST`).
          *   The response you set should be an `Effect` that yields an `HttpClientResponse.HttpClientResponse` or fails with an `HttpClientError.HttpClientError`.
          *   Example for a success case:
             ```typescript
             const mockApiResponse = { id: "...", choices: [/*...*/] }; // Your expected Ollama JSON
             Effect.runSync(setMockClientResponse(
               { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
               Effect.succeed(HttpClientResponse.unsafeJson(mockApiResponse)) // Or .json() if that returns an Effect
             ));
             ```
          *   Example for an API error case (e.g., model not found):
             ```typescript
             const mockApiError = { error: "Model not found" };
             Effect.runSync(setMockClientResponse(
               { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
               Effect.succeed(HttpClientResponse.unsafeJson(mockApiError, { status: 404 }))
             ));
             ```
          *   Example for a network error:
             ```typescript
             Effect.runSync(setMockClientResponse(
               { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
               Effect.fail(HttpClientError.RequestError({ request: /* dummy request */, reason: "NetworkError", error: new Error("Simulated network failure")}))
             ));
             ```
      3.  **Acquire Service and Run:** Wrap your test logic in an `Effect.gen` that acquires `OllamaService` and then calls its method. Provide the `ollamaTestLayer`.
          ```typescript
          // Inside an 'it' block
          const program = Effect.gen(function* (_) {
            const ollamaService = yield* _(OllamaService); // Acquire service from context
            // ... your existing request setup ...
            return yield* _(ollamaService.generateChatCompletion(request));
          }).pipe(Effect.provide(ollamaTestLayer)); // Provide the layer

          const result = await Effect.runPromise(program); // Or use expectEffectFailure
          // ... your assertions ...
          ```
          Or, for error tests using your `expectEffectFailure` helper:
          ```typescript
          // Inside an 'it' block for an error test
          const program = Effect.gen(function* (_) {
            const ollamaService = yield* _(OllamaService);
            return yield* _(ollamaService.generateChatCompletion(requestToFail));
          }).pipe(Effect.provide(ollamaTestLayer));

          const error = await expectEffectFailure(program, OllamaHttpError, /Ollama API Error: 404/);
          // ... additional assertions on error ...
          ```

- **MSW's Role:** With this `TestHttpClientLive`, MSW handlers will _not_ be hit by these unit tests because `fetch` is no longer being called by the (mocked) `HttpClient`. MSW remains useful if you had separate integration tests that use the _real_ `NodeHttpClient.layer` to test against the MSW mocks. For these unit tests, `TestHttpClientLive` provides more direct control.
- **Typecheck & Test:** `pnpm run t && pnpm test`. Iterate until all tests pass with the new Layer-based setup. This will likely be the most challenging part, requiring careful setup of mock responses.

**Final Review:**

- Once all tests pass and typechecking is clean, review the changes.
- Is the code more robust with schema validation?
- Are the tests cleaner and more representative of how the service would be used in an Effect application?
- Update the log file with the new steps, challenges, and solutions.

This is a significant refactoring. Take it step-by-step, focusing on one schema or one test at a time. Good luck!
