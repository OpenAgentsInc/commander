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

        console.log("[Service] generateChatCompletionStream: Preparing to unwrap effect for stream");
        
        // Here we create an effect that yields a stream of the correct type
        type StreamResult = Stream.Stream<OllamaOpenAIChatStreamChunk, OllamaHttpError | OllamaParseError, never>;
        
        // Create an effect that will yield our stream
        const streamEffect: Effect.Effect<StreamResult, OllamaHttpError | OllamaParseError, never> = 
            Effect.gen(function*(_) {
                // Get HTTP request
                const httpRequest = yield* _(prepareRequestEffect);
                console.log("[Service Stream] HTTP Request prepared:", JSON.stringify(httpRequest.urlParams));
                
                // Execute request and get response
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
                console.log("[Service Stream] HTTP Response status:", response.status);

                // Handle error responses
                if (response.status >= 400) {
                    const errorJson = yield* _(
                        response.json,
                        Effect.catchAll(() => Effect.succeed({ error: "Unknown API error structure during stream initiation" }))
                    );
                    console.error("[Service Stream] HTTP Error for stream init:", response.status, JSON.stringify(errorJson));
                    throw new OllamaHttpError(
                        `Ollama API Error on stream initiation (chat/completions): ${response.status} - ${JSON.stringify(errorJson)}`,
                        httpRequest,
                        { status: response.status, headers: response.headers, body: errorJson }
                    );
                }

                console.log("[Service Stream] Successfully got response, building stream processing pipeline");
        
        // For tracking parsed chunks to reduce logging
        let parsedJsonLogged = false;
                
                // STEP 1: Get the raw bytes stream
                const rawStream = response.stream;
                
                // STEP 2: Decode bytes to text
                console.log("[Service Stream] Applying decodeText");
                const textStream = Stream.decodeText(rawStream);
                
                // STEP 3: Split text into lines
                console.log("[Service Stream] Applying splitLines");
                const lineStream = Stream.splitLines(textStream);
                
                // STEP 4: Process each line and convert to Option<OllamaOpenAIChatStreamChunk>
                console.log("[Service Stream] Applying mapEffect for line processing");
                
                // Define a function for processing each line
                const processLine = (line: string) => {
                    const lineStr = String(line).trim();
                    // Skip line-by-line logging to reduce noise
                    // console.log("[Service Stream] Processing line");
                    
                    // Skip empty lines and [DONE] marker
                    if (lineStr === "" || lineStr === "data: [DONE]") {
                        return Effect.succeed(Option.none<OllamaOpenAIChatStreamChunk>());
                    }
                    
                    // Process SSE data lines
                    if (lineStr.startsWith("data: ")) {
                        const jsonData = lineStr.substring("data: ".length);
                        
                        try {
                            // Parse JSON
                            const parsedJson = JSON.parse(jsonData);
                            // Log first chunk and completion only
                            if (!parsedJsonLogged) {
                                console.log("[Service Stream] First chunk parsed successfully");
                                parsedJsonLogged = true;
                            } else if (parsedJson.choices?.[0]?.finish_reason) {
                                console.log("[Service Stream] Final completion chunk received");
                            }
                            
                            // Validate against schema and convert to Option.some
                            return Schema.decodeUnknown(OllamaOpenAIChatStreamChunkSchema)(parsedJson).pipe(
                                Effect.map(chunk => Option.some(chunk)),
                                Effect.catchTag("ParseError", parseError =>
                                    Effect.fail(new OllamaParseError(
                                        "Schema parse error in OpenAI stream chunk", 
                                        { line: jsonData, error: parseError }
                                    ))
                                )
                            );
                        } catch (error) {
                            // Handle JSON parse errors
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error("[Service Stream Pipe] Error processing line:", errorMessage, 
                                jsonData.substring(0, Math.min(100, jsonData.length)));
                            
                            return Effect.fail(new OllamaParseError(
                                "JSON parse error in OpenAI stream chunk", 
                                { line: jsonData, error }
                            ));
                        }
                    }
                    
                    // Any other format is unexpected
                    console.error("[Service Stream Pipe] Unexpected line format:", lineStr);
                    return Effect.fail(new OllamaParseError(
                        "Unexpected line format in OpenAI stream", 
                        { line: lineStr }
                    ));
                };
                
                // Apply processLine to each line
                const parsedStream = Stream.mapEffect(processLine)(lineStream) as Stream.Stream<
                    Option.Option<OllamaOpenAIChatStreamChunk>, 
                    OllamaHttpError | OllamaParseError, 
                    never
                >;
                
                // STEP 5: Filter out None values and unwrap Some values
                console.log("[Service Stream] Applying filterMap to handle Options");
                
                // Define a function to filter and unwrap Options
                const extractOptionValue = (
                    maybeChunk: Option.Option<OllamaOpenAIChatStreamChunk>
                ): Option.Option<OllamaOpenAIChatStreamChunk> => {
                    if (Option.isSome(maybeChunk)) {
                        return Option.some(maybeChunk.value);
                    }
                    return Option.none();
                };
                
                // Apply the filterMap with our extract function
                const filteredStream = Stream.filterMap(parsedStream, extractOptionValue) as Stream.Stream<
                    OllamaOpenAIChatStreamChunk, 
                    OllamaHttpError | OllamaParseError, 
                    never
                >;
                
                // STEP 6: Do final error mapping to ensure consistent error types
                console.log("[Service Stream] Applying error mapping");
                
                // Define a function to map errors to our custom error types
                const mapStreamError = (err: unknown): OllamaHttpError | OllamaParseError => {
                    // We already have our custom error types
                    if (err instanceof OllamaParseError || err instanceof OllamaHttpError) {
                        return err;
                    }
                    
                    // HTTP client errors
                    if (err instanceof HttpClientError.ResponseError) {
                        return new OllamaHttpError("OpenAI stream body processing error", httpRequest, err);
                    }
                    
                    // Schema.ParseError (via _tag)
                    if (err && typeof err === 'object' && '_tag' in err && (err as any)._tag === 'ParseError') {
                        return new OllamaParseError("Schema parse error in OpenAI stream chunk", err);
                    }
                    
                    // Any other error
                    return new OllamaParseError("Unknown OpenAI stream error", err);
                };
                
                // Apply error mapping
                const finalStream = Stream.mapError(filteredStream, mapStreamError);
                console.log("[Service Stream] Stream processing pipeline complete");
                
                // Return the fully processed stream
                return finalStream as StreamResult;
            });
            
        // Unwrap the effect to get the stream
        return Stream.unwrap(streamEffect);
    };

    return {
        generateChatCompletion,
        generateChatCompletionStream,
        
        /**
         * Checks if the Ollama service is available and responding
         */
        checkOllamaStatus: () => Effect.gen(function* (_) {
            // For most Ollama installs, the root URL returns a simple response like "Ollama is running"
            // We'll use the base URL without any API path to check the service
            const rootUrl = config.baseURL.replace("/v1", "");
            const httpRequest = HttpClientRequest.get(rootUrl);

            try {
                const response = yield* _(
                    httpClient.execute(httpRequest),
                    Effect.mapError(httpClientError =>
                        new OllamaHttpError(
                            `HTTP request failed for Ollama status check: ${httpClientError._tag || "Unknown error"}`,
                            httpRequest,
                            httpClientError
                        )
                    )
                );

                if (response.status === 200) {
                    // Try to get the response body as text
                    const textResponse = yield* _(
                        response.text,
                        Effect.mapError(e => new OllamaParseError("Failed to parse Ollama status text response", e))
                    );
                    
                    // Usually "Ollama is running" or something similar
                    return textResponse.toLowerCase().includes("ollama is running") || 
                           textResponse.toLowerCase().includes("ollama") ||
                           response.status === 200; // Fall back to just checking status
                }
                return false; // Unexpected status code
            } catch (error) {
                // Any error means Ollama is unreachable
                return false;
            }
        })
    };
}