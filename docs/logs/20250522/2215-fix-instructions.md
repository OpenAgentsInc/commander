# Fix Instructions: Ollama Runtime Initialization Failure

## Priority: CRITICAL - Runtime Cannot Initialize

### Problem Summary
The Agent Chat "Service not found" error occurs because the entire Effect runtime fails to initialize. The root cause is `OllamaAsOpenAIClientLive` using `Effect.die()` when `window.electronAPI` is not available, which creates an unrecoverable defect that aborts runtime initialization.

## Immediate Fix Instructions

### 1. Fix OllamaAsOpenAIClientLive.ts

**File**: `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`

**Current Problem** (Lines 36-61):
```typescript
if (!window.electronAPI?.ollama?.generateChatCompletion || 
    !window.electronAPI?.ollama?.generateChatCompletionStream) {
  return yield* _(Effect.die(new AiProviderError({...})));  // KILLS RUNTIME!
}
```

**Fix Implementation**:

Replace the entire Layer implementation with a lazy-checking version:

```typescript
export const OllamaAsOpenAIClientLive = Layer.succeed(
  OllamaOpenAIClientTag,
  (() => {
    // Helper to check IPC availability
    const checkIPC = () => {
      if (typeof window === 'undefined' || 
          !window.electronAPI?.ollama?.generateChatCompletion ||
          !window.electronAPI?.ollama?.generateChatCompletionStream) {
        return { available: false, ipc: null };
      }
      return { available: true, ipc: window.electronAPI.ollama };
    };

    // Helper to create IPC unavailable error
    const createIPCError = (operation: string) => {
      const request = HttpClientRequest.post(`ollama-ipc-${operation}`);
      const webResponse = new Response(
        JSON.stringify({ 
          error: "Ollama IPC bridge not available",
          details: "The Electron IPC bridge for Ollama is not available in the current environment"
        }), 
        { status: 503 } // Service Unavailable
      );
      return new HttpClientError.ResponseError({
        request,
        response: HttpClientResponse.fromWeb(request, webResponse),
        reason: "StatusCode",
        description: `Ollama IPC not available for ${operation}`,
      });
    };

    // Stub implementation (keep existing stubMethod helper)
    const stubMethod = (methodName: string) => {
      return Effect.fail(createIPCError(methodName));
    };

    return {
      client: {
        createChatCompletion: (options: typeof CreateChatCompletionRequest.Encoded) => 
          Effect.suspend(() => {
            const { available, ipc } = checkIPC();
            if (!available) {
              return Effect.fail(createIPCError("createChatCompletion"));
            }
            
            // Your existing implementation here, using 'ipc' instead of 'ollamaIPC'
            return Effect.tryPromise({
              try: async () => {
                const ipcParams = {
                  model: options.model,
                  messages: options.messages.map(/* existing mapping logic */),
                  temperature: options.temperature,
                  max_tokens: options.max_tokens,
                  stream: false as const,
                };
                
                const response = await ipc!.generateChatCompletion(ipcParams);
                // ... rest of existing implementation
                return response as typeof CreateChatCompletionResponse.Type;
              },
              catch: (error) => {
                // ... existing error handling
              }
            });
          }),

        // Apply same pattern to all other methods
        listChatCompletions: (_options: any) => stubMethod("listChatCompletions"),
        // ... all other stub methods remain the same
      },

      stream: (params: StreamCompletionRequest) => 
        Stream.suspend(() => {
          const { available, ipc } = checkIPC();
          if (!available) {
            return Stream.fail(createIPCError("stream"));
          }

          // Your existing stream implementation, using 'ipc'
          return Stream.async<AiResponse.AiResponse, HttpClientError.HttpClientError>(
            (emit) => {
              // ... existing implementation
              let ipcStreamCancel: (() => void) | undefined;
              
              try {
                ipcStreamCancel = ipc!.generateChatCompletionStream(
                  { ...params, stream: true },
                  // ... existing callbacks
                );
              } catch (e) {
                // ... existing error handling
              }
              
              return Effect.sync(() => {
                if (ipcStreamCancel) {
                  ipcStreamCancel();
                }
              });
            }
          );
        }),

      streamRequest: <A>(_request: HttpClientRequest.HttpClientRequest) => {
        return Stream.fail(createIPCError("streamRequest")) as Stream.Stream<A, HttpClientError.HttpClientError>;
      },
    };
  })()
);
```

**Key Changes**:
1. Use `Layer.succeed` instead of `Layer.effect` - this NEVER fails during construction
2. Move IPC checks into each method using `Effect.suspend()` or `Stream.suspend()`
3. Return proper HTTP 503 Service Unavailable errors instead of dying
4. Check IPC availability lazily when methods are actually called

### 2. Add Telemetry for IPC Availability (Optional but Recommended)

In the same file, add telemetry to track when IPC is not available:

```typescript
// At the top of each method that checks IPC:
const { available, ipc } = checkIPC();
if (!available) {
  Effect.runFork(
    Effect.flatMap(TelemetryService, (ts) =>
      ts.trackEvent({
        category: "ollama_adapter:availability",
        action: "ipc_not_available",
        label: methodName,
      })
    )
  );
  return Effect.fail(createIPCError(methodName));
}
```

### 3. Create Integration Test

**File**: `src/tests/integration/runtime-initialization.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeMainRuntime, getMainRuntime } from "@/services/runtime";
import { Effect } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { AgentLanguageModel } from "@/services/ai/core";

describe("Runtime Initialization Resilience", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = (global as any).window;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it("should initialize runtime successfully without window.electronAPI", async () => {
    // Remove window.electronAPI to simulate non-Electron environment
    (global as any).window = {};
    
    const runtime = await initializeMainRuntime();
    expect(getMainRuntime).not.toThrow();
    
    // Verify other services work
    const result = await Effect.runPromise(
      Effect.flatMap(TelemetryService, (ts) => 
        ts.trackEvent({ category: "test", action: "runtime_init_test" })
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    expect(result).toBeUndefined(); // trackEvent returns void
  });

  it("should return appropriate error when using Ollama without IPC", async () => {
    // Initialize runtime without IPC
    (global as any).window = {};
    await initializeMainRuntime();
    
    // Try to use AgentLanguageModel
    const result = await Effect.runPromiseExit(
      Effect.flatMap(AgentLanguageModel.Tag, (lm) =>
        lm.generateText({ prompt: "test" })
      ).pipe(Effect.provide(getMainRuntime()))
    );
    
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      const error = result.cause;
      // Should get a service unavailable error, not a crash
      expect(error).toBeDefined();
    }
  });

  it("should initialize with partial IPC availability", async () => {
    // Simulate IPC with only some methods available
    (global as any).window = {
      electronAPI: {
        ollama: {
          generateChatCompletion: undefined,
          generateChatCompletionStream: jest.fn(),
        }
      }
    };
    
    const runtime = await initializeMainRuntime();
    expect(getMainRuntime).not.toThrow();
  });
});
```

### 4. Update Runtime Error Handling

**File**: `src/renderer.ts`

Improve error messaging for initialization failures:

```typescript
} catch (initializationError) {
  console.error(
    "FATAL: Failed to initialize main Effect runtime. Application cannot start.",
    initializationError,
  );

  // Check if it's the Ollama IPC issue specifically
  const errorMessage = initializationError instanceof Error ? initializationError.message : String(initializationError);
  const isOllamaError = errorMessage.includes("Ollama") || errorMessage.includes("electronAPI");

  const body = document.querySelector("body");
  if (body) {
    body.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #1a1a1a; color: #ffcccc; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; box-sizing: border-box; z-index: 9999; text-align: center;">
        <h1 style="font-size: 1.5em; color: #ff6666; margin-bottom: 15px;">Application Startup Failed</h1>
        <p style="font-size: 1em; margin-bottom: 10px;">
          ${isOllamaError 
            ? "The application requires Electron IPC for AI features but it's not available." 
            : "A critical error occurred while initializing essential services."}
        </p>
        <p style="font-size: 0.9em; margin-bottom: 20px;">
          ${isOllamaError
            ? "Please ensure you're running the application through Electron, not a web browser."
            : "Please report this issue. More details can be found in the developer console."}
        </p>
        ${/* existing error details */}
      </div>
    `;
  }
}
```

## Testing the Fix

1. **Test in Browser**: Open `http://localhost:5173` - app should now start (without AI features)
2. **Test in Electron**: Run `pnpm start` - app should work with full AI features
3. **Test Agent Chat**: 
   - In browser: Should get "Service Unavailable" error when trying to send message
   - In Electron: Should work normally

## Verification Checklist

- [ ] Runtime initializes successfully without `window.electronAPI`
- [ ] No `Effect.die()` calls during Layer construction
- [ ] Agent Chat shows appropriate error in browser environment
- [ ] Agent Chat works normally in Electron environment
- [ ] All tests pass including new integration test
- [ ] No TypeScript errors

## Next Steps (After Immediate Fix)

1. Implement provider selection logic to automatically fall back to available providers
2. Add NIP-90 as a browser-compatible fallback provider
3. Create comprehensive environment detection service
4. Document the deferred initialization pattern for future services

## Important Notes

- This fix changes Ollama from "fail-fast" to "fail-when-used"
- Users will see runtime errors when trying to use AI features without IPC
- This is the correct behavior - graceful degradation, not total failure
- Future providers should follow this same pattern