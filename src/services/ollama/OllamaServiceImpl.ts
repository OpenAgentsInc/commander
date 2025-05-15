import { Effect } from "effect";
import {
    OllamaService,
    OllamaServiceConfig,
    type OllamaChatCompletionRequest,
    type OllamaChatCompletionResponse,
    OllamaHttpError,
    OllamaParseError
} from './OllamaService';

/**
 * Create an implementation of the OllamaService that uses fetch for HTTP requests
 * @param config The Ollama service configuration
 * @returns An implementation of the OllamaService interface
 */
export function createOllamaService(config: OllamaServiceConfig): OllamaService {
    const makeUrl = (path: string) => `${config.baseURL}${path}`;

    const generateChatCompletion = (requestBody: OllamaChatCompletionRequest) => {
        return Effect.gen(function* (_) {
            const url = makeUrl("/chat/completions");

            const finalRequestBody = {
                ...requestBody,
                model: requestBody.model || config.defaultModel,
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

            // Validate the response shape
            if (!json || typeof json !== 'object' || !('choices' in json)) {
                return yield* _(Effect.fail(new OllamaParseError(
                    "Invalid Ollama response format", 
                    json
                )));
            }
            
            const typedJson = json as Record<string, unknown>;
            
            // Simple type check on important fields
            if (
                typeof typedJson.id !== 'string' ||
                typeof typedJson.model !== 'string' ||
                !Array.isArray(typedJson.choices) ||
                typedJson.choices.length === 0
            ) {
                return yield* _(Effect.fail(new OllamaParseError(
                    "Missing required fields in Ollama response", 
                    json
                )));
            }

            return json as OllamaChatCompletionResponse;
        });
    };

    return {
        generateChatCompletion
    };
}