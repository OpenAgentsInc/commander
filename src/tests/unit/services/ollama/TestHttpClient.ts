import { Effect, Layer } from "effect";

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
const mockResponses = new Map<string, Effect.Effect<Response, unknown, never>>();

/**
 * Creates a string key from a RequestKey object
 */
function makeRequestKey(request: RequestKey): string {
  return `${request.method}:${request.url}`;
}

/**
 * Mock implementation of global fetch for testing
 */
async function mockFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = input.toString();
  const method = init?.method || 'GET';
  const key = makeRequestKey({ url, method });
  
  const mockResponse = mockResponses.get(key);
  
  if (!mockResponse) {
    throw new Error(
      `No mock response found for ${method} ${url}. ` +
      `Make sure to set up a mock using setMockClientResponse().`
    );
  }
  
  // Run the Effect to get the Response
  return await Effect.runPromise(mockResponse);
}

// Store the original fetch for restoration
const originalFetch = globalThis.fetch;

/**
 * Override the global fetch with our mock implementation
 */
export const enableMockFetch = (): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    globalThis.fetch = mockFetch;
  });
};

/**
 * Restore the original fetch implementation
 */
export const disableMockFetch = (): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    globalThis.fetch = originalFetch;
  });
};

/**
 * Set up a mock response for a specific request
 */
export const setMockResponse = (
  request: RequestKey,
  response: Effect.Effect<Response, unknown, never>
): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    mockResponses.set(makeRequestKey(request), response);
  });
};

/**
 * Clear all mock responses - should be called between tests
 */
export const clearMockResponses = (): Effect.Effect<void, never, never> => {
  return Effect.sync(() => {
    mockResponses.clear();
  });
};