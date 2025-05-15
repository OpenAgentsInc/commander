import { Effect, Schema, Context, Layer } from "effect";
import {
    OllamaService,
    OllamaServiceConfig,
    OllamaServiceConfigTag,
    OllamaChatCompletionRequestSchema,
    type OllamaChatCompletionRequest,
    OllamaChatCompletionResponseSchema,
    type OllamaChatCompletionResponse,
    OllamaHttpError,
    OllamaParseError
} from './OllamaService';

/**
 * Create an implementation of the OllamaService that uses fetch for HTTP requests
 * @param config The Ollama service configuration
 * @returns An implementation of the OllamaService interface
 */
/**
 * Create a Layer providing the OllamaService implementation
 */
export const OllamaServiceLive = Layer.effect(
    OllamaService,
    Effect.gen(function* (_) {
        const config = yield* _(OllamaServiceConfigTag);
        return createOllamaService(config);
    })
);

export function createOllamaService(config: OllamaServiceConfig): OllamaService {
    const makeUrl = (path: string) => `${config.baseURL}${path}`;

    const generateChatCompletion = (requestBody: unknown) => {
        return Effect.gen(function* (_) {
            const url = makeUrl("/chat/completions");

            // Validate request body using Schema
            const decodedRequest = yield* _(
                Schema.decodeUnknown(OllamaChatCompletionRequestSchema)(requestBody),
                Effect.mapError(parseError => new OllamaParseError(
                    "Invalid request format", 
                    parseError
                ))
            );

            const finalRequestBody = {
                ...decodedRequest,
                model: decodedRequest.model || config.defaultModel,
            };

            // Make the HTTP request
            let response: Response;
            response = yield* _(
                Effect.tryPromise(() => 
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(finalRequestBody)
                    })
                ).pipe(
                    Effect.mapError(error => 
                        new OllamaHttpError(
                            `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
                            finalRequestBody,
                            error
                        )
                    )
                )
            );

            // Handle error responses
            if (!response.ok) {
                const errorJson = yield* _(
                    Effect.tryPromise(() => response.json()),
                    Effect.catchAll(() => Effect.succeed({ error: "Unknown API error structure" }))
                );
                
                return yield* _(Effect.fail(new OllamaHttpError(
                    `Ollama API Error: ${response.status} - ${JSON.stringify(errorJson)}`,
                    finalRequestBody,
                    { status: response.status, headers: response.headers, body: errorJson }
                )));
            }

            // Parse the successful response
            const json = yield* _(
                Effect.tryPromise(() => response.json()),
                Effect.mapError(e => new OllamaParseError("Failed to parse success JSON response", e))
            );

            // Validate the response shape using Schema
            return yield* _(
                Schema.decodeUnknown(OllamaChatCompletionResponseSchema)(json),
                Effect.mapError(parseError => new OllamaParseError(
                    "Invalid Ollama response format",
                    parseError
                ))
            );
        });
    };

    return {
        generateChatCompletion
    };
}