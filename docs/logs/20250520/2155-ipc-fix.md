# Fixing CORS Issues with Ollama API Using IPC

## Problem
We were facing a persistent CORS issue when trying to connect directly from the browser to the Ollama API:

```
Access to XMLHttpRequest at 'http://localhost:11434/' from origin 'http://localhost:5173' has been blocked by CORS policy: Request header field traceparent is not allowed by Access-Control-Allow-Headers in preflight response.
```

Our previous attempts to fix this by:
1. Updating the Content Security Policy
2. Adding Access-Control-Allow-Headers meta tag 
3. Creating a custom HTTP client that strips the traceparent header

None of these solutions fully resolved the issue in the browser environment because:
1. CSP only controls what connections are allowed, not the headers sent
2. Meta tags don't influence server-side CORS policies
3. Our HTTP client wrapper was working in tests but not in the real browser environment

## Solution: Use Electron IPC for Ollama API Communication

Since this is an Electron app, we can take advantage of the main process's ability to make HTTP requests without CORS restrictions. By moving the Ollama API communication from the renderer process (browser environment) to the main process (Node.js environment), we can completely bypass CORS issues.

I implemented this solution by:

1. Adding a dedicated IPC channel for Ollama status checks in `ollama-channels.ts`:
```typescript
export const OLLAMA_STATUS_CHECK = "ollama:status-check";

export const ollamaChannels = {
  chatCompletion: OLLAMA_CHAT_COMPLETION_CHANNEL,
  chatCompletionStream: OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  checkStatus: OLLAMA_STATUS_CHECK
};
```

2. Exposing the status check endpoint through the context bridge in `ollama-context.ts`:
```typescript
ollama: {
  // Add a status check endpoint that uses Electron's IPC to avoid CORS
  checkStatus: () => ipcRenderer.invoke(OLLAMA_STATUS_CHECK),
  
  // ... existing methods ...
}
```

3. Adding a handler for the status check in the main process in `ollama-listeners.ts`:
```typescript
// Status check handler - completely avoids CORS issues by using IPC
ipcMain.handle(OLLAMA_STATUS_CHECK, async () => {
  console.log("[IPC Listener] Checking Ollama status through IPC");
  
  // Ensure ollamaServiceLayer was defined
  if (!ollamaServiceLayer) {
    console.error("IPC HANDLER ERROR: ollamaServiceLayer is not defined!");
    return false; // Consider it not connected
  }

  const program = Effect.gen(function*(_) {
    const ollamaService = yield* _(OllamaService);
    return yield* _(ollamaService.checkOllamaStatus());
  }).pipe(
    Effect.provide(ollamaServiceLayer),
    Effect.catchAll(() => Effect.succeed(false)) // Return false for any errors
  );

  try {
    return await Effect.runPromise(program);
  } catch (error) {
    console.error("Ollama status check failed:", error);
    return false; // Consider it not connected
  }
});
```

4. Modifying the SellComputePane component to use the IPC channel instead of direct HTTP requests:
```typescript
const checkOllamaStatus = useCallback(async () => {
  setStatusLoading(s => ({ ...s, ollama: true }));
  
  try {
    // Use the IPC channel for status check to bypass CORS issues
    const isConnected = await window.electronAPI.ollama.checkStatus();
    setIsOllamaConnected(isConnected);
  } catch (error) {
    console.error("Ollama status check failed:", error);
    setIsOllamaConnected(false);
  } finally {
    setStatusLoading(s => ({ ...s, ollama: false }));
  }
}, []);
```

5. Removed the now unnecessary Access-Control-Allow-Headers meta tag from index.html, as we're no longer making direct browser-to-Ollama requests.

## Benefits

This approach:
1. Completely bypasses CORS issues since the HTTP requests are made from the Electron main process
2. Doesn't require modifying or wrapping the HTTP client in a way that might be incompatible with tests
3. Is more secure, as the Electron main process can control and sanitize requests/responses
4. Works with any server configuration without requiring CORS headers

## Future Improvements

If we need to use more Ollama API endpoints directly from the renderer, we should extend this IPC approach with a more comprehensive proxy that can handle all Ollama API endpoints, rather than adding custom headers or client wrappers that may cause compatibility issues.