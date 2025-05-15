import { Effect, Schema, Context, Layer } from "effect";
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpBody from "@effect/platform/HttpBody";
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
    httpClient: HttpClient
): OllamaService {
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

            // Create HTTP request using HttpClient
            // First create the body
            const body = yield* _(
                Effect.try({
                    try: () => JSON.stringify(finalRequestBody),
                    catch: error => new Error(`Failed to serialize request: ${error}`)
                }),
                Effect.map(bodyStr => HttpBody.text(bodyStr, "application/json"))
            );

            // Then create the request with the body
            const httpRequest = HttpClientRequest.post(url).pipe(
                HttpClientRequest.setHeader("Content-Type", "application/json"),
                HttpClientRequest.setBody(body)
            );

            // Execute the request
            const response = yield* _(
                httpClient.execute(httpRequest),
                Effect.mapError(httpClientError => {
                    return new OllamaHttpError(
                        `HTTP request failed: ${httpClientError._tag || "Unknown error"}`,
                        finalRequestBody,
                        httpClientError
                    );
                })
            );

            // Handle error responses
            if (response.status >= 400) {
                // Get the response text from the response
                const errorText = yield* _(
                    Effect.try(() => response.text),
                    Effect.flatMap(textEffect => textEffect),
                    Effect.catchAll(() => Effect.succeed("Unknown API error"))
                );
                
                // Try to parse the error as JSON
                const errorJson = yield* _(
                    Effect.try({
                        try: () => JSON.parse(errorText),
                        catch: () => ({ error: errorText })
                    })
                );
                
                return yield* _(Effect.fail(new OllamaHttpError(
                    `Ollama API Error: ${response.status} - ${JSON.stringify(errorJson)}`,
                    finalRequestBody,
                    { status: response.status, headers: response.headers, body: errorJson }
                )));
            }

            // Parse the successful response
            const responseText = yield* _(
                Effect.try(() => response.text),
                Effect.flatMap(textEffect => textEffect),
                Effect.mapError(e => new OllamaParseError("Failed to parse success response", e))
            );

            const json = yield* _(
                Effect.try({
                    try: () => JSON.parse(responseText),
                    catch: e => new OllamaParseError("Failed to parse success JSON response", e)
                })
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