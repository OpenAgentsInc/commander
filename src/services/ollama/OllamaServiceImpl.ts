import { Effect, Schema, Context, Layer, Stream, Option } from "effect";
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
    type OllamaChatCompletionRequest,
    type OllamaChatCompletionResponse,
    type OllamaOpenAIChatStreamChunk,
    OllamaOpenAIChatStreamChunkSchema,
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

    const generateChatCompletion = (requestBody: OllamaChatCompletionRequest): Effect.Effect<OllamaChatCompletionResponse, OllamaHttpError | OllamaParseError, never> => {
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

    const generateChatCompletionStream = (
        requestBody: OllamaChatCompletionRequest
    ): Stream.Stream<OllamaOpenAIChatStreamChunk, OllamaHttpError | OllamaParseError, never> => {
        const prepareRequestEffect = Effect.gen(function*(_) {
            const url = makeUrl("/chat/completions");

            // Validate request body using Schema
            const validatedRequestBody = yield* _(
                Schema.decodeUnknown(OllamaChatCompletionRequestSchema)(requestBody),
                Effect.mapError(parseError => new OllamaParseError(
                    "Invalid request format for streaming chat completion",
                    parseError
                ))
            );

            const finalRequestBody = {
                ...validatedRequestBody,
                model: validatedRequestBody.model || config.defaultModel,
                stream: true // Explicitly set stream to true for this method
            };

            const httpBody = yield* _(
                HttpBody.json(finalRequestBody),
                Effect.mapError(bodyError =>
                    new OllamaParseError(
                        `Failed to create streaming request body: ${bodyError.reason._tag === "JsonError" ? "JSON encoding" : "Schema encoding"}`,
                        bodyError
                    )
                )
            );

            return HttpClientRequest.post(url).pipe(
                HttpClientRequest.setHeader("Content-Type", "application/json"),
                HttpClientRequest.setBody(httpBody)
            );
        }).pipe(Effect.mapError(e => e as OllamaParseError | OllamaHttpError));

        return Stream.unwrap(Effect.gen(function*(_) {
            const httpRequest = yield* _(prepareRequestEffect);
            const response = yield* _(
                httpClient.execute(httpRequest),
                Effect.mapError(httpClientError =>
                    new OllamaHttpError(
                        `HTTP request failed for streaming chat: ${httpClientError._tag || "Unknown error"}`,
                        httpRequest,
                        httpClientError
                    )
                )
            );

            if (response.status >= 400) {
                const errorJson = yield* _(
                    response.json,
                    Effect.catchAll(() => Effect.succeed({ error: "Unknown API error structure during stream initiation" }))
                );
                return yield* _(Effect.fail(new OllamaHttpError(
                    `Ollama API Error on stream initiation (chat/completions): ${response.status} - ${JSON.stringify(errorJson)}`,
                    httpRequest,
                    { status: response.status, headers: response.headers, body: errorJson }
                )));
            }

            return Stream.suspend(() => response.stream).pipe(
                stream => Stream.decodeText(stream),
                stream => Stream.splitLines(stream),
                Stream.mapEffect(line => {
                    const lineStr = String(line);
                    if (lineStr.trim() === "" || lineStr === "data: [DONE]") {
                        return Effect.succeed(Option.none<OllamaOpenAIChatStreamChunk>());
                    }
                    if (lineStr.startsWith("data: ")) {
                        const jsonData = lineStr.substring("data: ".length);
                        try {
                            const parsedJson = JSON.parse(jsonData);
                            return Schema.decodeUnknown(OllamaOpenAIChatStreamChunkSchema)(parsedJson).pipe(
                                Effect.map(Option.some),
                                Effect.catchTag("ParseError", pe =>
                                    Effect.fail(new OllamaParseError("Schema parse error in OpenAI stream chunk", { line: jsonData, error: pe }))
                                )
                            );
                        } catch (e) {
                            return Effect.fail(new OllamaParseError("JSON parse error in OpenAI stream chunk", { line: jsonData, error: e }));
                        }
                    }
                    return Effect.fail(new OllamaParseError("Unexpected line format in OpenAI stream", { line: lineStr }));
                }),
                stream => Stream.filterMap((chunk: unknown) => Option.isOption(chunk) && Option.isSome(chunk) ? Option.some(Option.getOrUndefined(chunk) as OllamaOpenAIChatStreamChunk) : Option.none())(stream),
                Stream.mapError(err => {
                    if (err instanceof OllamaParseError || err instanceof OllamaHttpError) return err;
                    if (err instanceof HttpClientError.ResponseError) {
                         return new OllamaHttpError("OpenAI stream body processing error", httpRequest, err);
                    }
                    return new OllamaParseError("Unknown OpenAI stream error", err);
                })
            );
        }));
    };

    return {
        generateChatCompletion,
        generateChatCompletionStream
    };
}