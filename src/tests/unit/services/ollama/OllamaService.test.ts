import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { Effect, Cause, Schema, Layer } from 'effect';
import {
    OllamaService,
    OllamaServiceConfig,
    OllamaServiceConfigTag,
    type OllamaChatCompletionRequest,
    type OllamaChatCompletionResponse,
    OllamaMessageSchema,
    OllamaHttpError,
    OllamaParseError
} from '../../../../services/ollama/OllamaService';
import { createOllamaService, OllamaServiceLive } from '../../../../services/ollama/OllamaServiceImpl';
import { server } from '../../../mocks/server';
import { 
    TestHttpClientLive,
    setMockClientResponse, 
    clearMockClientResponses
} from './TestHttpClient';
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";

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
                cause => new Error(`Expected error of type ${ErrorClass.name} but got ${cause}`)
            ),
            Effect.tap(error => {
                if (messagePattern) {
                    expect(error.message).toMatch(messagePattern);
                }
            })
        )
    );
}

const testConfig: OllamaServiceConfig = {
    baseURL: "http://localhost:11434/v1",
    defaultModel: "test-llama",
};

// Define the layers for effect-based testing
const ConfigLive = Layer.succeed(OllamaServiceConfigTag, testConfig);
const ollamaTestLayer = Layer.provide(
    OllamaServiceLive,
    Layer.merge(TestHttpClientLive, ConfigLive)
);

// Set up MSW and Effect test environment
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
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
    contentType: string = 'application/json'
): HttpClientResponse.HttpClientResponse {
    // Create a real Request object
    const mockRequest = HttpClientRequest.get("http://mock-url");
    
    // Create a real Response
    const responseText = typeof body === 'string' ? body : JSON.stringify(body);
    const response = new Response(responseText, {
        status,
        headers: { 'Content-Type': contentType }
    });
    
    // Use the fromWeb utility to create a real HttpClientResponse
    return HttpClientResponse.fromWeb(mockRequest, response);
}

describe('OllamaService', () => {
    describe('generateChatCompletion', () => {
        it('should return a successful chat completion for valid input', async () => {
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
                            content: "Mocked Effect HttpClient response for model llama2 to query: Hello!",
                        },
                        finish_reason: "stop",
                    },
                ],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            // Set up the mock response for HttpClient
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(200, mockOllamaResponse))
                )
            );
                
            const request: OllamaChatCompletionRequest = {
                model: 'llama2',
                messages: [{ role: 'user', content: 'Hello!' }],
                stream: false
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
            expect(result.model).toBe('llama2');
            expect(result.choices).toHaveLength(1);
            expect(result.choices[0].message.role).toBe('assistant');
            expect(result.choices[0].message.content).toContain('Mocked Effect HttpClient response');
        });

        it('should use the default model from config if not specified in request', async () => {
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
                    total_tokens: 30
                }
            };

            // Set up the mock response for HttpClient
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(200, mockOllamaResponse))
                )
            );
            
            // Request without a model specified
            const request: OllamaChatCompletionRequest = {
                messages: [{ role: 'user', content: 'Hello default model!' }],
                stream: false
            };

            // Create a program using the Effect layer system
            const program = Effect.gen(function* (_) {
                const ollamaService = yield* _(OllamaService);
                return yield* _(ollamaService.generateChatCompletion(request));
            }).pipe(Effect.provide(ollamaTestLayer));

            // Run the program and assert
            const result = await Effect.runPromise(program);
                
            expect(result.model).toBe(testConfig.defaultModel);
            expect(result.choices[0].message.content).toContain(`Mocked Effect HttpClient response for model ${testConfig.defaultModel}`);
        });

        it('should fail with OllamaHttpError for API errors (e.g., model not found)', async () => {
            // Set up a mock response for a 404 error
            const mockErrorJson = { error: "Model not found" };
            
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(404, mockErrorJson))
                )
            );
            
            const request: OllamaChatCompletionRequest = {
                model: 'nonexistent-model',
                messages: [{ role: 'user', content: 'Test 404' }],
                stream: false
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
                /Ollama API Error: 404/
            );
            
            // Additional assertions on the error object
            const errorResponse = error.response as any;
            expect(errorResponse?.body?.error).toBe("Model not found");
        });

        it('should fail with OllamaHttpError for server errors (e.g., 500)', async () => {
            // Set up a mock response for a 500 error
            const mockErrorJson = { error: "Internal server error" };
            
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(500, mockErrorJson))
                )
            );
            
            const request: OllamaChatCompletionRequest = {
                model: 'server-error-model',
                messages: [{ role: 'user', content: 'Test 500' }],
                stream: false
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
                /Ollama API Error: 500/
            );
            
            // Additional assertions on the error object
            const errorResponse = error.response as any;
            expect(errorResponse?.body?.error).toBe("Internal server error");
        });

        it('should fail with OllamaParseError if the API returns a malformed JSON success response', async () => {
            // Set up a mock response with malformed JSON
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(200, "this is not json", "text/plain"))
                )
            );
            
            const request: OllamaChatCompletionRequest = {
                model: 'malformed-response-model',
                messages: [{ role: 'user', content: 'Test malformed' }],
                stream: false
            };

            // Create a program using the Effect layer system
            const program = Effect.gen(function* (_) {
                const ollamaService = yield* _(OllamaService);
                return yield* _(ollamaService.generateChatCompletion(request));
            }).pipe(Effect.provide(ollamaTestLayer));

            await expectEffectFailure(
                program,
                OllamaParseError,
                /Failed to parse success JSON response/
            );
        });
        
        it('should fail with OllamaParseError if the API returns a structurally invalid response', async () => {
            // Set up a mock response with an invalid schema
            const invalidResponse = {
                id: `chatcmpl-${Date.now()}`,
                // Missing required 'object', 'created', and 'model' fields
                choices: [
                    {
                        // Missing required 'index' field
                        message: {
                            // Missing required 'role' field
                            content: "This response is missing required schema fields"
                        },
                        // Missing required 'finish_reason' field
                    }
                ]
            };
            
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.succeed(mockHttpClientResponse(200, invalidResponse))
                )
            );
            
            const request: OllamaChatCompletionRequest = {
                model: 'invalid-schema-model',
                messages: [{ role: 'user', content: 'Test invalid schema' }],
                stream: false
            };

            // Create a program using the Effect layer system
            const program = Effect.gen(function* (_) {
                const ollamaService = yield* _(OllamaService);
                return yield* _(ollamaService.generateChatCompletion(request));
            }).pipe(Effect.provide(ollamaTestLayer));

            await expectEffectFailure(
                program,
                OllamaParseError,
                /Invalid Ollama response format/
            );
        });

        it('should fail with OllamaHttpError for network errors', async () => {
            // Set up a mock response that throws a network error
            const mockRequest = HttpClientRequest.post(`${testConfig.baseURL}/chat/completions`);
            Effect.runSync(
                setMockClientResponse(
                    { url: `${testConfig.baseURL}/chat/completions`, method: "POST" },
                    Effect.fail(new HttpClientError.RequestError({
                        request: mockRequest,
                        reason: "Transport",
                        cause: new Error("Network error")
                    }))
                )
            );
            
            const request: OllamaChatCompletionRequest = {
                model: 'network-error-model',
                messages: [{ role: 'user', content: 'Test network error' }],
                stream: false
            };

            // Create a program using the Effect layer system
            const program = Effect.gen(function* (_) {
                const ollamaService = yield* _(OllamaService);
                return yield* _(ollamaService.generateChatCompletion(request));
            }).pipe(Effect.provide(ollamaTestLayer));

            await expectEffectFailure(
                program,
                OllamaHttpError,
                /HTTP request failed/
            );
        });
        
        it('should fail with OllamaParseError if the request contains an invalid message format', async () => {
            // For the parse error test, we don't need a mock response since validation fails before the request
            
            // @ts-ignore - Intentionally bypassing TypeScript to test runtime validation
            const request = {
                model: 'llama2',
                messages: [{ 
                    role: 'invalid-role' as any, // Invalid role not in the schema
                    content: 'This should fail schema validation'
                }],
                stream: false
            };

            // Create a program using the Effect layer system
            const program = Effect.gen(function* (_) {
                const ollamaService = yield* _(OllamaService);
                return yield* _(ollamaService.generateChatCompletion(request as any));
            }).pipe(Effect.provide(ollamaTestLayer));

            await expectEffectFailure(
                program,
                OllamaParseError,
                /Invalid request format/
            );
        });
    });
});