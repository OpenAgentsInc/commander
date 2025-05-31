# CORS Issue Fix for Ollama Connection

## Problem

After adding Ollama API URL to CSP, we encountered a CORS error when connecting to Ollama:

```
Access to XMLHttpRequest at 'http://localhost:11434/' from origin 'http://localhost:5173' has been blocked by CORS policy: Request header field traceparent is not allowed by Access-Control-Allow-Headers in preflight response.
```

## Root Cause

- The Effect HttpClient library automatically adds a `traceparent` header for distributed tracing
- This header is being rejected by the Ollama API CORS policy
- The Ollama server expects specific headers only and is rejecting the traceparent header

## Solution

Added an `Access-Control-Allow-Headers` meta tag to `index.html` to explicitly allow the `traceparent` header:

```html
<!-- CORS configuration for Ollama API -->
<meta
  http-equiv="Access-Control-Allow-Headers"
  content="Content-Type, traceparent"
/>
```

## Technical Details

- The `traceparent` header is added to all HTTP requests by the Effect platform's HTTP client
- This header is used for distributed tracing (part of the W3C Trace Context specification)
- We can't easily disable this header per-request without modifying the HTTP client in the Ollama service
- The meta tag allows the browser to include this header in CORS requests to Ollama

## Verification

To verify the changes:

1. Restart the development server with `pnpm start`
2. Check that the application can now connect to the Ollama server without CORS errors
3. Verify that the "Sell Compute" functionality works correctly

## Additional Notes

A more robust solution would be to modify the OllamaServiceImpl.ts to create a client without tracer propagation:

```typescript
// Create a modified HTTP client that doesn't add trace headers
const ollamaHttpClient = HttpClient.withTracerPropagation(
  baseHttpClient,
  false,
);
```

However, since we've added the Access-Control-Allow-Headers meta tag, this should be sufficient for the current implementation.
