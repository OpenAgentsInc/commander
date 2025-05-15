import { Effect, Layer } from "effect";
import { HttpClient } from "@effect/platform/HttpClient";
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
const mockResponses = new Map<string, Effect.Effect<HttpClientResponse.HttpClientResponse, any, never>>();

/**
 * Creates a string key from a RequestKey object
 */
function makeRequestKey(request: RequestKey): string {
  return `${request.method}:${request.url}`;
}

/**
 * Implementation of the HttpClient interface for testing
 */
const TestHttpClientImpl: HttpClient = {
  execute: (request) => {
    const url = request.url;
    const method = request.method;
    const key = makeRequestKey({ url, method });
    
    const mockResponse = mockResponses.get(key);
    
    if (!mockResponse) {
      // Create a new request error when no mock response is found
      return Effect.fail(new HttpClientError.RequestError({
        request,
        reason: "Other",
        error: new Error(
          `No mock response found for ${method} ${url}. ` +
          `Make sure to set up a mock using setMockClientResponse().`
        )
      }));
    }
    
    return mockResponse;
  },
  get: (url, options) => {
    return HttpClient.execute(HttpClientRequest.get(url, options));
  },
  post: (url, options) => {
    return HttpClient.execute(HttpClientRequest.post(url, options));
  },
  put: (url, options) => {
    return HttpClient.execute(HttpClientRequest.put(url, options));
  },
  patch: (url, options) => {
    return HttpClient.execute(HttpClientRequest.patch(url, options));
  },
  del: (url, options) => {
    return HttpClient.execute(HttpClientRequest.del(url, options));
  },
  head: (url, options) => {
    return HttpClient.execute(HttpClientRequest.head(url, options));
  },
  options: (url, options) => {
    return HttpClient.execute(HttpClientRequest.options(url, options));
  },
  [HttpClient.TypeId]: HttpClient.TypeId as HttpClient.TypeId,
  pipe() {
    return this;
  },
  toJSON() {
    return { _id: "TestHttpClient" };
  }
};

/**
 * Set up a mock response for a specific request
 */
export const setMockClientResponse = (
  request: RequestKey,
  response: Effect.Effect<HttpClientResponse.HttpClientResponse, any, never>
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

/**
 * The TestHttpClientLive layer provides the mock HttpClient implementation
 */
export const TestHttpClientLive = Layer.succeed(
  HttpClient,
  TestHttpClientImpl
);