import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Effect, Cause, Schema } from 'effect';
import {
    OllamaService,
    OllamaServiceConfig,
    type OllamaChatCompletionRequest,
    OllamaMessageSchema,
    OllamaHttpError,
    OllamaParseError
} from '../../../../services/ollama/OllamaService';
import { createOllamaService } from '../../../../services/ollama/OllamaServiceImpl';
import { server } from '../../../mocks/server';

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

// Set up MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const testConfig: OllamaServiceConfig = {
    baseURL: "http://localhost:11434/v1",
    defaultModel: "test-llama",
};

describe('OllamaService', () => {
    describe('generateChatCompletion', () => {
        it('should return a successful chat completion for valid input', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'llama2',
                messages: [{ role: 'user', content: 'Hello!' }],
            };

            const result = await Effect.runPromise(ollamaService.generateChatCompletion(request));
                
            expect(result.id).toBeDefined();
            expect(result.model).toBe('llama2');
            expect(result.choices).toHaveLength(1);
            expect(result.choices[0].message.role).toBe('assistant');
            expect(result.choices[0].message.content).toContain('Mock response for model llama2');
        });

        it('should use the default model from config if not specified in request', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            // Request without a model specified
            const request: OllamaChatCompletionRequest = {
                messages: [{ role: 'user', content: 'Hello default model!' }],
            };

            const result = await Effect.runPromise(ollamaService.generateChatCompletion(request));
                
            expect(result.model).toBe(testConfig.defaultModel); // "test-llama"
            expect(result.choices[0].message.content).toContain(`Mock response for model ${testConfig.defaultModel}`);
        });

        it('should fail with OllamaHttpError for API errors (e.g., model not found)', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'nonexistent-model', // This will trigger a 404 in our MSW mock
                messages: [{ role: 'user', content: 'Test 404' }],
            };

            const error = await expectEffectFailure(
                ollamaService.generateChatCompletion(request),
                OllamaHttpError,
                /Ollama API Error: 404/
            );
            
            // Additional assertions on the error object
            const errorResponse = error.response as any;
            expect(errorResponse?.body?.error).toBe("Model not found");
        });

        it('should fail with OllamaHttpError for server errors (e.g., 500)', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'server-error-model', // This will trigger a 500 in our MSW mock
                messages: [{ role: 'user', content: 'Test 500' }],
            };

            const error = await expectEffectFailure(
                ollamaService.generateChatCompletion(request),
                OllamaHttpError,
                /Ollama API Error: 500/
            );
            
            // Additional assertions on the error object
            const errorResponse = error.response as any;
            expect(errorResponse?.body?.error).toBe("Internal server error");
        });

        it('should fail with OllamaParseError if the API returns a malformed JSON success response', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'malformed-response-model', // Triggers malformed JSON in MSW
                messages: [{ role: 'user', content: 'Test malformed' }],
            };

            await expectEffectFailure(
                ollamaService.generateChatCompletion(request),
                OllamaParseError,
                /Failed to parse success JSON response/
            );
        });
        
        it('should fail with OllamaParseError if the API returns a structurally invalid response', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'invalid-schema-model', // Triggers invalid schema response in MSW
                messages: [{ role: 'user', content: 'Test invalid schema' }],
            };

            await expectEffectFailure(
                ollamaService.generateChatCompletion(request),
                OllamaParseError,
                /Invalid Ollama response format/
            );
        });

        it('should fail with OllamaHttpError for network errors', async () => {
            const ollamaService = createOllamaService(testConfig);
                
            const request: OllamaChatCompletionRequest = {
                model: 'network-error-model',
                messages: [{ role: 'user', content: 'Test network error' }],
            };

            await expectEffectFailure(
                ollamaService.generateChatCompletion(request),
                OllamaHttpError,
                /HTTP request failed/
            );
        });
        
        it('should fail with OllamaParseError if the request contains an invalid message format', async () => {
            const ollamaService = createOllamaService(testConfig);
            
            // @ts-ignore - Intentionally bypassing TypeScript to test runtime validation
            const request = {
                model: 'llama2',
                messages: [{ 
                    role: 'invalid-role', // Invalid role not in the schema
                    content: 'This should fail schema validation'
                }]
            };
            
            await expectEffectFailure(
                ollamaService.generateChatCompletion(request as OllamaChatCompletionRequest),
                OllamaParseError,
                /Invalid request format/
            );
        });
    });
});