import { Effect, Layer } from "effect";
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientModule from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpClientError from "@effect/platform/HttpClientError";

/**
 * Type for the key used to identify HTTP requests in our mock client
 */
export interface RequestKey {
  url: string;
  method: string;
}

/**
 * Global storage for mocked responses
 * This needs to be module-level to persist between test runs
 */
const mockResponses = new Map<string, Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError, never>>();

/**
 * Creates a string key from a RequestKey object
 */
function makeRequestKey(request: RequestKey): string {
  return `${request.method}:${request.url}`;
}

/**
 * Set up mock responses
 */
export const setMockClientResponse = (
  request: RequestKey,
  response: Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError, never>
): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    mockResponses.set(makeRequestKey(request), response);
  });
};

/**
 * Clear all mock responses - should be called between tests
 */
export const clearMockClientResponses = (): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    mockResponses.clear();
  });
};

// Function that creates a mock client for tests
function createMockClient() {
  const executeMock = (request: HttpClientRequest.HttpClientRequest) => {
    const url = request.url;
    const method = request.method;
    const key = makeRequestKey({ url, method });
    
    const mockResponse = mockResponses.get(key);
    
    if (!mockResponse) {
      return Effect.fail(new HttpClientError.RequestError({
        request,
        reason: "Transport", 
        cause: new Error(
          `No mock response found for ${method} ${url}. ` +
          `Make sure to set up a mock using setMockClientResponse().`
        )
      }));
    }
    
    return mockResponse;
  };

  // Due to the complexity of the HttpClient interface structure,
  // we're using a type assertion here for simplicity.
  const client = {
    execute: executeMock,
    get: (url: string | URL, options?: HttpClientRequest.Options.NoBody) => {
      const request = HttpClientRequest.get(url, options);
      return executeMock(request);
    },
    post: (url: string | URL, options?: HttpClientRequest.Options.NoUrl) => {
      const request = HttpClientRequest.post(url, options);
      return executeMock(request);
    },
    put: (url: string | URL, options?: HttpClientRequest.Options.NoUrl) => {
      const request = HttpClientRequest.put(url, options);
      return executeMock(request);
    },
    patch: (url: string | URL, options?: HttpClientRequest.Options.NoUrl) => {
      const request = HttpClientRequest.patch(url, options);
      return executeMock(request);
    },
    del: (url: string | URL, options?: HttpClientRequest.Options.NoUrl) => {
      const request = HttpClientRequest.del(url, options);
      return executeMock(request);
    },
    head: (url: string | URL, options?: HttpClientRequest.Options.NoBody) => {
      const request = HttpClientRequest.head(url, options);
      return executeMock(request);
    },
    options: (url: string | URL, options?: HttpClientRequest.Options.NoUrl) => {
      const request = HttpClientRequest.options(url, options);
      return executeMock(request);
    },
    pipe() {
      return this;
    },
    toJSON() {
      return { _tag: "TestHttpClient" };
    },
    // Mock implementation needed for withTracerPropagation to work
    preprocess: null
  };
  
  // Note: We're no longer using withTracerPropagation for testing
  // Since HttpClientModule is read-only, we can't modify it here
  // Instead, we're using the base client directly in OllamaServiceImpl.ts
  
  return client;
}

// Create a Layer with the mock HttpClient
// We use unknown as an intermediate step to work around the complex type structure
export const TestHttpClientLive = Layer.succeed(
  HttpClient, 
  createMockClient() as unknown as HttpClient
);