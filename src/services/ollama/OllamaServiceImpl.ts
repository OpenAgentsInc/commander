import { Effect, Schema, Context, Layer } from "effect";
import { HttpClient } from "@effect/platform/HttpClient"; // This is the Tag
import type { HttpClient as HttpClientService } from "@effect/platform/HttpClient"; // Import the service type alias
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClientError from "@effect/platform/HttpClientError";
import {
    OllamaService,
    OllamaServiceConfig,
    OllamaServiceConfigTag,
    OllamaChatCompletionRequestSchema,
    OllamaChatCompletionResponseSchema,
    type OllamaChatCompletionResponse,
    OllamaHttpError,
    OllamaParseError
} from './OllamaService';

/**
 * Create a Layer providing the OllamaService implementation
 */
export const OllamaServiceLive = Layer.effect(
    OllamaService,
    Effect.gen(function* (_) {
        const config = yield* _(OllamaServiceConfigTag);
        const httpClient = yield* _(HttpClient);
        return createOllamaService(config, httpClient);
    })
);

export function createOllamaService(
    config: OllamaServiceConfig,
    httpClient: HttpClientService
): OllamaService {
    const makeUrl = (path: string) => `${config.baseURL}${path}`;

    const generateChatCompletion = (requestBody: unknown): Effect.Effect<OllamaChatCompletionResponse, OllamaHttpError | OllamaParseError, never> => {
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

            // Create HTTP request using HttpClient
            // First create the body
            const body = yield* _(
                Effect.tryPromise({
                    try: () => Promise.resolve(HttpBody.text(JSON.stringify(finalRequestBody), "application/json")),
                    catch: error => new OllamaParseError(
                        `Failed to create request body: ${String(error)}`,
                        error
                    )
                })
            );

            // Then create the request with the body
            const httpRequest = HttpClientRequest.post(url).pipe(
                HttpClientRequest.setHeader("Content-Type", "application/json"),
                HttpClientRequest.setBody(body)
            );

            // Execute the request
            const response = yield* _(
                httpClient.execute(httpRequest),
                Effect.mapError(httpClientError => 
                    new OllamaHttpError(
                        `HTTP request failed: ${httpClientError._tag || "Unknown error"}`,
                        httpRequest,
                        httpClientError
                    )
                )
            );

            // Handle error responses
            if (response.status >= 400) {
                // Access json method directly on the response object
                const errorJson = yield* _(
                    response.json,
                    Effect.catchAll(() => Effect.succeed({ error: "Unknown API error structure" }))
                );
                
                return yield* _(Effect.fail(new OllamaHttpError(
                    `Ollama API Error: ${response.status} - ${JSON.stringify(errorJson)}`,
                    httpRequest,
                    { status: response.status, headers: response.headers, body: errorJson }
                )));
            }

            // Parse the successful response - access json method directly on the response object
            const json = yield* _(
                response.json,
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