import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
} from "vitest";
import { Effect, Schema, Layer, Stream, Option, Exit, Cause } from "effect";
import {
  OllamaService,
  OllamaServiceConfig,
  OllamaServiceConfigTag,
  type OllamaChatCompletionRequest,
  type OllamaChatCompletionResponse,
  type OllamaOpenAIChatStreamChunk,
  OllamaMessageSchema,
  OllamaHttpError,
  OllamaParseError,
} from "../../../../services/ollama/OllamaService";
import {
  createOllamaService,
  OllamaServiceLive,
} from "../../../../services/ollama/OllamaServiceImpl";
import { server } from "../../../mocks/server";
import {
  TestHttpClientLive,
  setMockClientResponse,
  clearMockClientResponses,
} from "./TestHttpClient";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import type * as Cookies from "@effect/platform/Cookies";

// Helper function for testing error types from Effect failures
function expectEffectFailure<E extends Error, T extends E>(
  effect: Effect.Effect<unknown, E, never>,
  ErrorClass: new (...args: any[]) => T,
  messagePattern?: string | RegExp,
): Promise<T> {
  return Effect.runPromise(
    Effect.flip(effect).pipe(
      Effect.filterOrFail(
        (cause): cause is T => cause instanceof ErrorClass,
        (cause) =>
          new Error(
            `Expected error of type ${ErrorClass.name} but got ${String(cause?.constructor.name)}: ${String(cause)}`,
          ),
      ),
      Effect.tap((error) => {
        if (messagePattern) {
          expect(error.message).toMatch(messagePattern);
        }
      }),
    ),
  );
}

const testConfig: OllamaServiceConfig = {
  baseURL: "http://localhost:11434/v1", // OpenAI compatible endpoint
  defaultModel: "test-llama",
};

// Define the layers for effect-based testing
const ConfigLive = Layer.succeed(OllamaServiceConfigTag, testConfig);
const ollamaTestLayer = Layer.provide(
  OllamaServiceLive,
  Layer.merge(TestHttpClientLive, ConfigLive),
);

// Set up MSW and Effect test environment
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => Effect.runSync(clearMockClientResponses()));
afterEach(() => {
  server.resetHandlers();
  Effect.runSync(clearMockClientResponses());
});
afterAll(() => server.close());

/**
 * Helper to create a mock HttpClientResponse
 */
function mockHttpClientResponse(
  status: number,
  body: any,
  contentType: string = "application/json",
): HttpClientResponse.HttpClientResponse {
  // Create a real Request object
  const mockRequest = HttpClientRequest.get("http://mock-url");

  // Create a real Response
  const responseText = typeof body === "string" ? body : JSON.stringify(body);
  const response = new Response(responseText, {
    status,
    headers: { "Content-Type": contentType },
  });

  // Use the fromWeb utility to create a real HttpClientResponse
  return HttpClientResponse.fromWeb(mockRequest, response);
}

/**
 * Helper to create a mock HTTP streaming response
 */
function mockOpenAIHttpStreamingResponse(
  status: number,
  sseEvents: string[] | null,
  contentType: string = "text/event-stream",
): HttpClientResponse.HttpClientResponse {
  const mockRequest = HttpClientRequest.get("http://mock-openai-stream-url");

  let streamOfBytes: Stream.Stream<Uint8Array, HttpClientError.ResponseError> =
    Stream.empty;

  if (status < 400 && sseEvents) {
    streamOfBytes = Stream.fromIterable(sseEvents).pipe(
      // SSE events are separated by one or more newlines
      (stream) => Stream.map((eventLine: string) => eventLine + "\n")(stream), // Ensure each event is treated as a distinct line for splitLines
      (stream) => Stream.encodeText(stream),
      Stream.mapError(
        (e) =>
          new HttpClientError.ResponseError({
            request: mockRequest,
            reason: "Decode",
            cause: e,
            response: null as any,
          }),
      ),
    );
  }

  // Create a new Response object with the status and content type
  const webResponse = new Response("", {
    status,
    headers: { "Content-Type": contentType },
  });

  // Convert it to an HttpClientResponse
  const baseResponse = HttpClientResponse.fromWeb(mockRequest, webResponse);

  return {
    ...baseResponse,
    stream: streamOfBytes,
    json: Effect.tryPromise({
      try: async () => {
        if (
          status >= 400 &&
          sseEvents &&
          sseEvents.length > 0 &&
          !sseEvents[0].startsWith("data:")
        ) {
          return JSON.parse(sseEvents[0]);
        }
        return {
          error:
            "Mock error JSON not provided or not applicable for OpenAI stream init",
        };
      },
      catch: (e) =>
        new HttpClientError.ResponseError({
          request: mockRequest,
          reason: "Decode",
          cause: e,
          response: null as any,
        }),
    }),
    text: Effect.succeed(
      "mock text body if needed for OpenAI stream init errors",
    ),
    formData: Effect.dieMessage(
      "formData not mocked for OpenAI stream response",
    ),
    urlParamsBody: Effect.dieMessage(
      "urlParamsBody not mocked for OpenAI stream response",
    ),
  } as HttpClientResponse.HttpClientResponse;
}

describe("OllamaService (/v1/chat/completions)", () => {
  describe("generateChatCompletion (non-streaming)", () => {
    it("should return a successful chat completion for valid input", async () => {
      // Create a mock response for our test
      const mockOllamaResponse: OllamaChatCompletionResponse = {
        id: "chatcmpl-test123",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "llama2",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content:
                "Mocked Effect HttpClient response for model llama2 to query: Hello!",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      // Set up the mock response for HttpClient
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(200, mockOllamaResponse)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "llama2",
        messages: [{ role: "user", content: "Hello!" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        // Acquire the OllamaService from the layer
        const ollamaService = yield* _(OllamaService);
        // Call the method under test
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      // Run the program and assert
      const result = await Effect.runPromise(program);

      expect(result.id).toBeDefined();
      expect(result.model).toBe("llama2");
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.role).toBe("assistant");
      expect(result.choices[0].message.content).toContain(
        "Mocked Effect HttpClient response",
      );
    });

    it("should use the default model from config if not specified in request", async () => {
      // Create a mock response using the default model from config
      const mockOllamaResponse: OllamaChatCompletionResponse = {
        id: "chatcmpl-testdefault",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: testConfig.defaultModel,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Mocked Effect HttpClient response for model ${testConfig.defaultModel} to query: Hello default model!`,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      // Set up the mock response for HttpClient
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(200, mockOllamaResponse)),
        ),
      );

      // Request without a model specified
      const request: OllamaChatCompletionRequest = {
        messages: [{ role: "user", content: "Hello default model!" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      // Run the program and assert
      const result = await Effect.runPromise(program);

      expect(result.model).toBe(testConfig.defaultModel);
      expect(result.choices[0].message.content).toContain(
        `Mocked Effect HttpClient response for model ${testConfig.defaultModel}`,
      );
    });

    it("should fail with OllamaHttpError for API errors (e.g., model not found)", async () => {
      // Set up a mock response for a 404 error
      const mockErrorJson = { error: "Model not found" };

      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(404, mockErrorJson)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "nonexistent-model",
        messages: [{ role: "user", content: "Test 404" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      // Test the error
      const error = await expectEffectFailure(
        program,
        OllamaHttpError,
        /Ollama API Error: 404/,
      );

      // Additional assertions on the error object
      const errorResponse = error.response as any;
      expect(errorResponse?.body?.error).toBe("Model not found");
    });

    it("should fail with OllamaHttpError for server errors (e.g., 500)", async () => {
      // Set up a mock response for a 500 error
      const mockErrorJson = { error: "Internal server error" };

      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(500, mockErrorJson)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "server-error-model",
        messages: [{ role: "user", content: "Test 500" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      // Test the error
      const error = await expectEffectFailure(
        program,
        OllamaHttpError,
        /Ollama API Error: 500/,
      );

      // Additional assertions on the error object
      const errorResponse = error.response as any;
      expect(errorResponse?.body?.error).toBe("Internal server error");
    });

    it("should fail with OllamaParseError if the API returns a malformed JSON success response", async () => {
      // Set up a mock response with malformed JSON
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(
            mockHttpClientResponse(200, "this is not json", "text/plain"),
          ),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "malformed-response-model",
        messages: [{ role: "user", content: "Test malformed" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      await expectEffectFailure(
        program,
        OllamaParseError,
        /Failed to parse success JSON response/,
      );
    });

    it("should fail with OllamaParseError if the API returns a structurally invalid response", async () => {
      // Set up a mock response with an invalid schema
      const invalidResponse = {
        id: `chatcmpl-${Date.now()}`,
        // Missing required 'object', 'created', and 'model' fields
        choices: [
          {
            // Missing required 'index' field
            message: {
              // Missing required 'role' field
              content: "This response is missing required schema fields",
            },
            // Missing required 'finish_reason' field
          },
        ],
      };

      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(200, invalidResponse)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "invalid-schema-model",
        messages: [{ role: "user", content: "Test invalid schema" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      await expectEffectFailure(
        program,
        OllamaParseError,
        /Invalid Ollama response format/,
      );
    });

    it("should fail with OllamaHttpError for network errors", async () => {
      // Set up a mock response that throws a network error
      const mockRequest = HttpClientRequest.post(
        `${testConfig.baseURL}/chat/completions`,
      );
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.fail(
            new HttpClientError.RequestError({
              request: mockRequest,
              reason: "Transport",
              cause: new Error("Network error"),
            }),
          ),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "network-error-model",
        messages: [{ role: "user", content: "Test network error" }],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaTestLayer));

      await expectEffectFailure(
        program,
        OllamaHttpError,
        /HTTP request failed/,
      );
    });

    it("should fail with OllamaParseError if the request contains an invalid message format", async () => {
      // For the parse error test, we don't need a mock response since validation fails before the request

      // @ts-ignore - Intentionally bypassing TypeScript to test runtime validation
      const request = {
        model: "llama2",
        messages: [
          {
            role: "invalid-role" as any, // Invalid role not in the schema
            content: "This should fail schema validation",
          },
        ],
        stream: false,
      };

      // Create a program using the Effect layer system
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request as any));
      }).pipe(Effect.provide(ollamaTestLayer));

      await expectEffectFailure(
        program,
        OllamaParseError,
        /Invalid request format/,
      );
    });
  });

  describe("generateChatCompletionStream (OpenAI-compatible)", () => {
    it("should return a stream of chat completion chunks for valid input", async () => {
      const mockSseEvents = [
        `data: ${JSON.stringify({ id: "chatcmpl-test1", object: "chat.completion.chunk", created: 123, model: "test-llama", choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] })}`,
        `data: ${JSON.stringify({ id: "chatcmpl-test1", object: "chat.completion.chunk", created: 123, model: "test-llama", choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }] })}`,
        `data: ${JSON.stringify({ id: "chatcmpl-test1", object: "chat.completion.chunk", created: 123, model: "test-llama", choices: [{ index: 0, delta: { content: " world" }, finish_reason: null }] })}`,
        `data: ${JSON.stringify({ id: "chatcmpl-test1", object: "chat.completion.chunk", created: 123, model: "test-llama", choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } })}`,
        "data: [DONE]",
      ];

      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockOpenAIHttpStreamingResponse(200, mockSseEvents)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "test-llama-stream",
        messages: [{ role: "user", content: "Stream Hello!" }],
      };

      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return ollamaService.generateChatCompletionStream(request);
      }).pipe(Effect.provide(ollamaTestLayer));

      const stream = await Effect.runPromise(program);
      const resultChunks = await Effect.runPromise(Stream.runCollect(stream));

      const resultArray = [...resultChunks];
      expect(resultArray.length).toBe(4); // [DONE] is filtered out
      expect(resultArray[0].choices[0].delta.role).toBe("assistant");
      expect(resultArray[1].choices[0].delta.content).toBe("Hello");
      expect(resultArray[2].choices[0].delta.content).toBe(" world");
      expect(resultArray[3].choices[0].finish_reason).toBe("stop");
      expect(resultArray[3].usage?.total_tokens).toBe(7);
    });

    it("should fail the stream with OllamaHttpError for API errors on initial request (e.g., 404)", async () => {
      const mockErrorBody = {
        error: {
          message: "Chat stream model not found",
        },
      };

      // Create a regular HTTP response for the error, not a streaming one
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockHttpClientResponse(404, mockErrorBody)),
        ),
      );

      const request: OllamaChatCompletionRequest = {
        model: "nonexistent-chat-stream-model",
        messages: [{ role: "user", content: "Test stream 404" }],
      };

      // Create a program to get the stream and try to consume it
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        const stream = ollamaService.generateChatCompletionStream(request);
        // Attempt to take one element. If stream init fails, this will fail.
        return yield* _(Stream.runCollect(stream));
      }).pipe(Effect.provide(ollamaTestLayer));

      // Use Effect.runPromiseExit to get the full Exit value with detailed cause information
      const exit = await Effect.runPromiseExit(program);

      // Verify it's a failure
      expect(Exit.isFailure(exit)).toBe(true);

      if (Exit.isFailure(exit)) {
        const cause = exit.cause;

        // Check if the cause is a Die with our expected error as the defect
        const dieOption = Cause.dieOption(cause);
        if (Option.isSome(dieOption)) {
          const defect = dieOption.value;
          expect(defect).toBeInstanceOf(OllamaHttpError);
          if (defect instanceof OllamaHttpError) {
            expect(defect.message).toContain(
              "Ollama API Error on stream initiation (chat/completions): 404",
            );
            const errorResponse = defect.response as any;
            expect(errorResponse?.body?.error?.message).toBe(
              "Chat stream model not found",
            );
          }
        } else {
          // If it's not a Die, check if it's a Fail with our error
          const failureOption = Cause.failureOption(cause);
          if (Option.isSome(failureOption)) {
            const error = failureOption.value;
            expect(error).toBeInstanceOf(OllamaHttpError);
            if (error instanceof OllamaHttpError) {
              expect(error.message).toContain(
                "Ollama API Error on stream initiation (chat/completions): 404",
              );
            }
          } else {
            // If neither Die nor Fail contains OllamaHttpError, fail the test
            throw new Error(
              "Expected stream to fail with OllamaHttpError due to 404, but got different failure: " +
                Cause.pretty(cause),
            );
          }
        }
      } else {
        throw new Error("Expected program to fail but it succeeded.");
      }
    });

    it("should fail the stream with OllamaParseError if a chunk contains malformed JSON", async () => {
      const mockSseEvents = ["data: this is not valid JSON"];
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockOpenAIHttpStreamingResponse(200, mockSseEvents)),
        ),
      );
      const request: OllamaChatCompletionRequest = {
        model: "malformed-json-chat-stream",
        messages: [{ role: "user", content: "Test malformed" }],
      };
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return ollamaService.generateChatCompletionStream(request);
      }).pipe(Effect.provide(ollamaTestLayer));
      const stream = await Effect.runPromise(program);
      const error = await Effect.runPromise(
        Stream.runCollect(stream).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(OllamaParseError);
      expect((error as OllamaParseError).message).toContain(
        "JSON parse error in OpenAI stream chunk",
      );
    });

    it("should fail the stream with OllamaParseError if a chunk JSON does not match OpenAI schema", async () => {
      const mockSseEvents = [
        `data: ${JSON.stringify({ idz: "chatcmpl-invalid" })}`,
      ]; // idz is wrong
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockOpenAIHttpStreamingResponse(200, mockSseEvents)),
        ),
      );
      const request: OllamaChatCompletionRequest = {
        model: "invalid-schema-chat-stream",
        messages: [{ role: "user", content: "Test invalid schema" }],
      };
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return ollamaService.generateChatCompletionStream(request);
      }).pipe(Effect.provide(ollamaTestLayer));
      const stream = await Effect.runPromise(program);
      const error = await Effect.runPromise(
        Stream.runCollect(stream).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(OllamaParseError);
      expect((error as OllamaParseError).message).toContain(
        "Schema parse error in OpenAI stream chunk",
      );
      const errorData = (error as OllamaParseError).data as any;
      expect(errorData.error).toBeDefined();
    });

    it("should handle empty lines in stream gracefully", async () => {
      const mockSseEvents = [
        "",
        `data: ${JSON.stringify({ id: "c1", object: "c.c", created: 1, model: "m", choices: [{ index: 0, delta: { content: "Hi" }, finish_reason: null }] })}`,
        "",
      ];
      Effect.runSync(
        setMockClientResponse(
          { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
          Effect.succeed(mockOpenAIHttpStreamingResponse(200, mockSseEvents)),
        ),
      );
      const request: OllamaChatCompletionRequest = {
        model: "empty-lines",
        messages: [{ role: "user", content: "T" }],
      };
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return ollamaService.generateChatCompletionStream(request);
      }).pipe(Effect.provide(ollamaTestLayer));
      const stream = await Effect.runPromise(program);
      const resultChunks = await Effect.runPromise(Stream.runCollect(stream));
      const resultArray = [...resultChunks];
      expect(resultArray.length).toBe(1);
      expect(resultArray[0].choices[0].delta.content).toBe("Hi");
    });
  });
});
