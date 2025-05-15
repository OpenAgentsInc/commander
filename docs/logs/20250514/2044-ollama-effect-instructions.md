Okay, this is a great use case for Effect-TS and TDD! We'll build an `OllamaService` that provides an Effect-ful way to interact with the Ollama OpenAI-compatible chat completions endpoint.

**Core Idea:**
We'll define an `OllamaService` interface (a "Tag" in Effect-TS) and then a "Live" implementation. This service will primarily have one method initially: `generateChatCompletion`. We'll use TDD to build out this method, handling success and various error scenarios.

**Key Technologies:**
*   **Effect-TS:** For managing effects, dependencies (Layers), and error handling.
*   **@effect/platform:** For HTTP client capabilities.
*   **Vitest:** For running our tests.
*   **msw (Mock Service Worker):** To mock the Ollama HTTP API endpoints at the network level. This is crucial for reliable TDD without needing a running Ollama instance during tests.
*   **Schema (@effect/schema):** For defining and validating request/response structures.

**Analysis of the Ollama API (from your doc):**
*   **Endpoint:** `http://localhost:11434/v1/chat/completions`
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Request Body (JSON):**
    ```json
    {
        "model": "string",
        "messages": [
            { "role": "system" | "user" | "assistant", "content": "string" }
        ]
        // Potentially other OpenAI compatible fields like 'stream', 'temperature' etc.
    }
    ```
*   **Success Response (JSON, non-streaming for now):**
    ```json
    // Based on standard OpenAI format
    {
        "id": "chatcmpl-...",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "llama2",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "The response from the model."
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 9,
            "completion_tokens": 12,
            "total_tokens": 21
        }
    }
    ```
*   **Error Response (JSON):** Ollama might return specific error structures. We'll assume standard HTTP error codes (4xx, 5xx) and potentially a JSON body with an error message.

---

**Instructions for the Coding Agent (TDD with Vitest & Effect-TS):**

**Phase 1: Setup and Basic Structure**

1.  **Initialize Project & Install Dependencies:**
    *   Ensure you have a Node.js project set up.
    *   Install necessary dependencies:
        ```bash
        npm install effect @effect/platform @effect/schema zod # zod is for schema inference if needed
        npm install -D vitest msw @types/node
        ```
    *   Configure Vitest (e.g., `vitest.config.ts`).

2.  **Directory Structure (Suggestion):**
    ```
    src/
    ├── OllamaService.ts       # Service definition, Tag, errors, schemas
    ├── OllamaServiceLive.ts   # Live implementation of the service
    test/
    ├── OllamaService.test.ts  # Vitest tests
    └── mocks/                 # MSW mock handlers
        └── handlers.ts
        └── server.ts          # MSW server setup
    ```

3.  **Define Schemas and Types (`src/OllamaService.ts`):**
    *   Start by defining the data structures using `@effect/schema/Schema`. This gives us parsing, validation, and type safety.

    ```typescript
    // src/OllamaService.ts
    import * as S from "@effect/schema/Schema";
    import * as Effect from "effect/Effect";
    import * as Context from "effect/Context";
    import * as Layer from "effect/Layer";
    import { HttpClient } from "@effect/platform/HttpClient"; // We'll need this later

    // --- Configuration Schema ---
    export class OllamaServiceConfig extends S.Class<OllamaServiceConfig>()({
        baseURL: S.string.pipe(S.pattern(/^https?:\/\//)), // Ensure it's a URL
        defaultModel: S.optional(S.string).withDefault(() => "llama2"),
        // apiKey: S.string, // "ollama" - required but unused by server, useful for abstraction
    }) {}
    export const OllamaServiceConfigTag = Context.Tag<OllamaServiceConfig>("OllamaServiceConfig");

    // --- API Request/Response Schemas ---
    export const OllamaMessageSchema = S.Struct({
        role: S.Literal("system", "user", "assistant"),
        content: S.string,
    });
    export type OllamaMessage = S.Schema.To<typeof OllamaMessageSchema>;

    export const OllamaChatCompletionRequestSchema = S.Struct({
        model: S.string,
        messages: S.Array(OllamaMessageSchema),
        stream: S.optional(S.boolean).withDefault(() => false),
        // Add other OpenAI params like temperature, top_p if needed
    });
    export type OllamaChatCompletionRequest = S.Schema.To<typeof OllamaChatCompletionRequestSchema>;

    export const OllamaChatCompletionChoiceSchema = S.Struct({
        index: S.number,
        message: OllamaMessageSchema,
        finish_reason: S.string, // e.g., "stop", "length"
    });

    export const OllamaChatCompletionUsageSchema = S.Struct({
        prompt_tokens: S.number,
        completion_tokens: S.number,
        total_tokens: S.number,
    });

    export const OllamaChatCompletionResponseSchema = S.Struct({
        id: S.string,
        object: S.string, // "chat.completion"
        created: S.number, // timestamp
        model: S.string,
        choices: S.Array(OllamaChatCompletionChoiceSchema),
        usage: S.optional(OllamaChatCompletionUsageSchema), // Usage might not be there for all models/setups
    });
    export type OllamaChatCompletionResponse = S.Schema.To<typeof OllamaChatCompletionResponseSchema>;

    // --- Custom Error Types ---
    export class OllamaError extends S.TaggedError<OllamaError>()("OllamaError", {
      message: S.string,
      cause: S.optional(S.unknown), // To wrap underlying errors
    }) {}

    export class OllamaHttpError extends S.TaggedError<OllamaHttpError>()("OllamaHttpError", {
      request: S.unknown,
      response: S.unknown, // Could be HttpClient.error.ResponseError
      message: S.string,
    }) {}

    export class OllamaParseError extends S.TaggedError<OllamaParseError>()("OllamaParseError", {
      message: S.string,
      data: S.unknown, // The data that failed to parse
    }) {}

    // --- Service Definition (Interface) ---
    export interface OllamaService {
        readonly generateChatCompletion: (
            request: OllamaChatCompletionRequest
        ) => Effect.Effect<
                OllamaChatCompletionResponse,
                OllamaHttpError | OllamaParseError, // Add more specific errors as needed
                OllamaServiceConfig | HttpClient.HttpClient // Dependencies
            >;
    }

    export const OllamaService = Context.Tag<OllamaService>("OllamaService");
    ```

4.  **Setup MSW (`test/mocks/server.ts` and `test/mocks/handlers.ts`):**
    *   `test/mocks/handlers.ts`:
        ```typescript
        // test/mocks/handlers.ts
        import { http, HttpResponse } from 'msw';
        import type { OllamaChatCompletionRequest, OllamaChatCompletionResponse } from '../../src/OllamaService';

        // Helper to get baseURL from config if you make it dynamic in tests
        const getBaseUrl = (defaultUrl = "http://localhost:11434/v1") => {
            // In a real test setup, you might inject config or read it
            return defaultUrl;
        };

        export const handlers = [
            http.post(`${getBaseUrl()}/chat/completions`, async ({ request }) => {
                const body = await request.json() as OllamaChatCompletionRequest;

                if (body.model === 'nonexistent-model') {
                    return HttpResponse.json({ error: 'Model not found' }, { status: 404 });
                }
                if (body.model === 'server-error-model') {
                    return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
                }
                if (body.model === 'malformed-response-model') {
                    return new HttpResponse("this is not json", { status: 200, headers: { 'Content-Type': 'text/plain' } });
                }

                // Happy path
                const response: OllamaChatCompletionResponse = {
                    id: `chatcmpl-${Date.now()}`,
                    object: "chat.completion",
                    created: Math.floor(Date.now() / 1000),
                    model: body.model,
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: "assistant",
                                content: `Mock response for model ${body.model} to query: ${body.messages[body.messages.length -1]?.content || 'N/A'}`,
                            },
                            finish_reason: "stop",
                        },
                    ],
                    usage: { // Optional
                        prompt_tokens: 10,
                        completion_tokens: 20,
                        total_tokens: 30,
                    },
                };
                return HttpResponse.json(response);
            }),
        ];
        ```
    *   `test/mocks/server.ts`:
        ```typescript
        // test/mocks/server.ts
        import { setupServer } from 'msw/node';
        import { handlers } from './handlers';

        export const server = setupServer(...handlers);
        ```
    *   Integrate MSW with Vitest (e.g., in a `vitest.setup.ts` file or at the top of your test file):
        ```typescript
        // vitest.setup.ts or at top of OllamaService.test.ts
        import { beforeAll, afterEach, afterAll } from 'vitest';
        import { server } from './mocks/server'; // Adjust path

        beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
        afterEach(() => server.resetHandlers());
        afterAll(() => server.close());
        ```
        Make sure your `vitest.config.ts` runs this setup file:
        ```typescript
        // vitest.config.ts
        import { defineConfig } from 'vitest/config';

        export default defineConfig({
          test: {
            globals: true, // if you want `describe`, `it`, etc. globally
            setupFiles: ['./test/vitest.setup.ts'], // Path to your setup file
          },
        });
        ```

**Phase 2: TDD for `generateChatCompletion`**

Now, let's write tests first, then the implementation.

1.  **Test 1: Successful Chat Completion (Red)**
    *   `test/OllamaService.test.ts`:

    ```typescript
    // test/OllamaService.test.ts
    import { describe, it, expect } from 'vitest';
    import * as Effect from 'effect/Effect';
    import * as Layer from 'effect/Layer';
    import * as Context from "effect/Context";
    import {
        OllamaService,
        OllamaServiceConfig,
        OllamaServiceConfigTag,
        type OllamaChatCompletionRequest,
        type OllamaChatCompletionResponse
    } from '../src/OllamaService'; // Adjust path
    import { OllamaServiceLive } from '../src/OllamaServiceLive'; // We'll create this next
    import { HttpClient } from '@effect/platform/HttpClient';
    import { NodeHttpClient } from "@effect/platform-node"; // Or your chosen HttpClient impl

    const testConfig: OllamaServiceConfig = {
        baseURL: "http://localhost:11434/v1",
        defaultModel: "test-llama",
    };

    const testLayer = Layer.provide(
        OllamaServiceLive, // The live implementation layer
        Layer.merge(
            NodeHttpClient.layer, // Provide the HttpClient dependency
            Layer.succeed(OllamaServiceConfigTag, testConfig) // Provide the config
        )
    );

    describe('OllamaService', () => {
        describe('generateChatCompletion', () => {
            it('should return a successful chat completion for valid input', async () => {
                const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer)); // Get service instance

                const request: OllamaChatCompletionRequest = {
                    model: 'llama2',
                    messages: [{ role: 'user', content: 'Hello!' }],
                };

                const program = ollamaService.generateChatCompletion(request);
                const result = await Effect.runPromise(Effect.provide(program, testLayer));

                expect(result.id).toBeDefined();
                expect(result.model).toBe('llama2');
                expect(result.choices).toHaveLength(1);
                expect(result.choices[0].message.role).toBe('assistant');
                expect(result.choices[0].message.content).toContain('Mock response for model llama2');
            });

            // Test for default model usage will go here later
        });
    });
    ```
    *   This test will fail because `OllamaServiceLive.ts` and its implementation don't exist yet.

2.  **Implement `OllamaServiceLive.ts` (Green)**
    *   `src/OllamaServiceLive.ts`:

    ```typescript
    // src/OllamaServiceLive.ts
    import * as Effect from 'effect/Effect';
    import * as Layer from 'effect/Layer';
    import * as S from "@effect/schema/Schema";
    import {
        OllamaService,
        OllamaServiceConfigTag,
        type OllamaChatCompletionRequest,
        type OllamaChatCompletionResponse,
        OllamaChatCompletionResponseSchema,
        OllamaHttpError,
        OllamaParseError
    } from './OllamaService';
    import { HttpClient } from '@effect/platform/HttpClient';

    export const OllamaServiceLive = Layer.effect(
        OllamaService,
        Effect.gen(function* (_) {
            const httpClient = yield* _(HttpClient.HttpClient);
            const config = yield* _(OllamaServiceConfigTag);

            const makeUrl = (path: string) => `${config.baseURL}${path}`;

            return OllamaService.of({
                generateChatCompletion: (requestBody) =>
                    Effect.gen(function* (_) {
                        const url = makeUrl("/chat/completions");

                        const actualRequest = HttpClient.request.post(url).pipe(
                            HttpClient.request.setHeader("Content-Type", "application/json"),
                            // No Authorization header needed based on Ollama's curl example for this endpoint
                            HttpClient.request.jsonBody(requestBody)
                        );

                        const response = yield* _(
                            httpClient.execute(actualRequest),
                            Effect.mapError((httpClientError) =>
                                new OllamaHttpError({
                                    message: `HTTP request failed: ${httpClientError._tag}`,
                                    request: httpClientError.request,
                                    response: httpClientError.response, // If ResponseError
                                    // cause: httpClientError // if you want to keep original
                                })
                            )
                        );

                        if (!response.ok) {
                            // Attempt to parse error body from Ollama
                            const errorJson = yield* _(
                                response.json,
                                Effect.catchAll(() => Effect.succeed({ error: "Unknown API error structure" }))
                            );
                            return yield* _(Effect.fail(new OllamaHttpError({
                                message: `Ollama API Error: ${response.status} - ${JSON.stringify(errorJson)}`,
                                request: actualRequest, // The request we made
                                response: { status: response.status, headers: response.headers, body: errorJson },
                            })));
                        }

                        const json = yield* _(
                            response.json,
                            Effect.mapError((e) => new OllamaParseError({ message: "Failed to parse success JSON response", data: e }))
                        );

                        return yield* _(
                            S.decodeUnknown(OllamaChatCompletionResponseSchema)(json),
                            Effect.mapError((parseError) => new OllamaParseError({ message: "Failed to decode Ollama response", data: parseError.errors }))
                        );
                    }),
            });
        })
    );
    ```
    *   Run `npm test`. The first test should now pass.

3.  **Refactor (if needed):**
    *   At this stage, the code is relatively simple. We can look for opportunities to extract helper functions if the request logic becomes more complex (e.g., common headers, error parsing).

4.  **Test 2: Using Default Model (Red)**
    *   Add to `test/OllamaService.test.ts`:
    ```typescript
    // ... inside describe('generateChatCompletion', () => { ... })
    it('should use the default model from config if not specified in request', async () => {
        const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer));

        // Request without a model specified
        const request: Omit<OllamaChatCompletionRequest, 'model'> & { model?: string } = {
            messages: [{ role: 'user', content: 'Hello default model!' }],
        };

        // We type cast here for the test, knowing the service should fill it.
        const program = ollamaService.generateChatCompletion(request as OllamaChatCompletionRequest);
        const result = await Effect.runPromise(Effect.provide(program, testLayer));

        expect(result.model).toBe(testConfig.defaultModel); // "test-llama"
        expect(result.choices[0].message.content).toContain(`Mock response for model ${testConfig.defaultModel}`);
    });
    ```
    *   This test will fail.

5.  **Implement Default Model Logic (Green)**
    *   Modify `src/OllamaServiceLive.ts` in the `generateChatCompletion` method:
    ```typescript
    // src/OllamaServiceLive.ts
    // ... inside generateChatCompletion: (requestBody) =>
    Effect.gen(function* (_) {
        const url = makeUrl("/chat/completions");

        const finalRequestBody = {
            ...requestBody,
            model: requestBody.model || config.defaultModel, // Use default if not provided
        };

        const actualRequest = HttpClient.request.post(url).pipe(
            HttpClient.request.setHeader("Content-Type", "application/json"),
            HttpClient.request.jsonBody(finalRequestBody) // Use finalRequestBody
        );
        // ... rest of the implementation
    })
    // ...
    ```
    *   Run `npm test`. This test should now pass.

6.  **Test 3: Handling Ollama API Error (e.g., Model Not Found - 404) (Red)**
    *   Add to `test/OllamaService.test.ts`:
    ```typescript
    // ... inside describe('generateChatCompletion', () => { ... })
    it('should fail with OllamaHttpError for API errors (e.g., model not found)', async () => {
        const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer));

        const request: OllamaChatCompletionRequest = {
            model: 'nonexistent-model', // This will trigger a 404 in our MSW mock
            messages: [{ role: 'user', content: 'Test 404' }],
        };

        const program = ollamaService.generateChatCompletion(request);
        const result = await Effect.runPromise(Effect.flip(Effect.provide(program, testLayer))); // Use Effect.flip to get the error

        expect(result).toBeInstanceOf(OllamaHttpError);
        expect(result.message).toContain("Ollama API Error: 404");
        // @ts-ignore
        expect(result.response?.body?.error).toBe("Model not found");
    });
    ```
    *   This test should pass because our MSW handler and the `OllamaServiceLive` implementation already account for non-ok responses. If it didn't, this would be the red step.

7.  **Test 4: Handling Server Error (e.g., 500) (Red)**
    *   Add to `test/OllamaService.test.ts`:
    ```typescript
    // ... inside describe('generateChatCompletion', () => { ... })
    it('should fail with OllamaHttpError for server errors (e.g., 500)', async () => {
        const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer));
        const request: OllamaChatCompletionRequest = {
            model: 'server-error-model', // This will trigger a 500 in our MSW mock
            messages: [{ role: 'user', content: 'Test 500' }],
        };

        const program = ollamaService.generateChatCompletion(request);
        const result = await Effect.runPromise(Effect.flip(Effect.provide(program, testLayer)));

        expect(result).toBeInstanceOf(OllamaHttpError);
        expect(result.message).toContain("Ollama API Error: 500");
        // @ts-ignore
        expect(result.response?.body?.error).toBe("Internal server error");
    });
    ```
    *   This test should also pass with the current implementation.

8.  **Test 5: Handling Malformed JSON Response (Red)**
    *   Add to `test/OllamaService.test.ts`:
    ```typescript
    // ... inside describe('generateChatCompletion', () => { ... })
    it('should fail with OllamaParseError if the API returns a malformed JSON success response', async () => {
        const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer));
        const request: OllamaChatCompletionRequest = {
            model: 'malformed-response-model', // Triggers malformed JSON in MSW
            messages: [{ role: 'user', content: 'Test malformed' }],
        };

        const program = ollamaService.generateChatCompletion(request);
        const result = await Effect.runPromise(Effect.flip(Effect.provide(program, testLayer)));

        expect(result).toBeInstanceOf(OllamaParseError);
        expect(result.message).toBe("Failed to parse success JSON response");
    });
    ```
    *   This test should pass with the current implementation's error handling for `response.json`.

9.  **Test 6: Handling Network Error (MSW can simulate this too, or you can mock HttpClient to fail) (Red)**
    *   For this, you might need to temporarily change an MSW handler or mock `HttpClient.execute` directly if `msw`'s network error simulation is tricky for a specific test case. A simple way with MSW is to make it return a network error:
    *   Modify `test/mocks/handlers.ts` for a specific model:
        ```typescript
        // In handlers.ts
        // ...
        if (body.model === 'network-error-model') {
            return HttpResponse.error(); // Simulates a network error
        }
        // ...
        ```
    *   Add to `test/OllamaService.test.ts`:
    ```typescript
    // ... inside describe('generateChatCompletion', () => { ... })
    it('should fail with OllamaHttpError for network errors', async () => {
        const ollamaService = Effect.runSync(Effect.provide(OllamaService, testLayer));
        const request: OllamaChatCompletionRequest = {
            model: 'network-error-model',
            messages: [{ role: 'user', content: 'Test network error' }],
        };

        const program = ollamaService.generateChatCompletion(request);
        const result = await Effect.runPromise(Effect.flip(Effect.provide(program, testLayer)));

        expect(result).toBeInstanceOf(OllamaHttpError);
        expect(result.message).toContain("HTTP request failed"); // From our mapping
    });
    ```
    *   This test should pass as `HttpClient.execute` will fail and be mapped to `OllamaHttpError`.

**Phase 3: Streaming (Future Enhancement - More Complex)**

If you want to implement streaming:
1.  **Define Stream-related Schemas:**
    *   `OllamaChatCompletionChunkSchema` (similar to `OllamaChatCompletionResponse` but with partial data, typically a `delta` field in `choices`).
2.  **Update `OllamaService` Interface:**
    *   Add a method like `generateChatCompletionStream` that returns an `Stream.Stream<OllamaChatCompletionChunk, OllamaHttpError | OllamaParseError, ...>`.
3.  **Write Tests for Streaming:**
    *   Mock MSW to return a stream of Server-Sent Events (SSEs).
    *   Test that the stream yields the correct chunks.
    *   Test error handling during streaming.
4.  **Implement Streaming Logic:**
    *   Use `HttpClient.request.stream` and parse SSEs. `@effect/platform` has utilities for SSEs or you might need to handle line-by-line NDJSON.

---

This detailed plan provides a solid TDD foundation for your `OllamaService`. Remember to commit after each green step. The coding agent should follow these steps sequentially, writing the test (red), then the minimal code to make it pass (green), and then refactoring if necessary.
