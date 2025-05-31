Okay, the error `Error: No handler registered for 'ollama:status-check'` means that when the renderer process (`SellComputePane.tsx`) tries to call `window.electronAPI.ollama.checkStatus()`, which internally uses `ipcRenderer.invoke('ollama:status-check')`, the main Electron process does not have a corresponding handler set up using `ipcMain.handle('ollama:status-check', ...)`.

This usually happens if:

1.  The `ipcMain.handle` call was never made.
2.  An error occurred during the setup of the module containing `ipcMain.handle` (i.e., `ollama-listeners.ts`), preventing the handler from being registered.
3.  The module containing the handler (`ollama-listeners.ts`) is not imported or the function `addOllamaEventListeners()` is not called by `listeners-register.ts`, which in turn should be called by `main.ts`.

Given your file structure and previous logs, the registration chain (`main.ts` -> `listeners-register.ts` -> `ollama-listeners.ts`) is likely in place. The most probable cause is an issue within `ollama-listeners.ts` itself, specifically with the definition or availability of `ollamaServiceLayer` when the module's top-level code is executed. If `ollamaServiceLayer` fails to initialize (e.g., because `NodeHttpClient.layer` is problematic at that early stage of main process startup) and throws an unhandled error, the subsequent `ipcMain.handle` calls in `addOllamaEventListeners` might not occur.

To make this more robust, we'll move the `ollamaServiceLayer` definition _inside_ the `addOllamaEventListeners` function. This defers its creation until `addOllamaEventListeners` is called, which happens after `app.whenReady()` and `createWindow()`, a safer point in the Electron lifecycle.

Here are the specific instructions for the coding agent:

**File to Modify: `src/helpers/ipc/ollama/ollama-listeners.ts`**

**Instructions:**

1.  Locate the `ollamaServiceLayer` variable declaration and its initialization block (the `try...catch` block where `Layer.provide` is called).
2.  Move this entire declaration and initialization block _inside_ the `addOllamaEventListeners` function, making `ollamaServiceLayer` a local constant within that function's scope.
3.  Remove the `if (!ollamaServiceLayer)` check from inside the `ipcMain.handle(OLLAMA_STATUS_CHECK, ...)` handler, as the layer will now be defined in the same scope and guaranteed to exist if the function execution reaches that point (or the layer definition itself would have thrown an error).
4.  Ensure the `ipcMain.handle` for `OLLAMA_STATUS_CHECK` uses this locally defined `ollamaServiceLayer`.
5.  (Optional but good practice) Add a `try...catch` around the `ipcMain.handle` calls within `addOllamaEventListeners` to log any errors during handler registration itself, though the primary fix is moving the layer definition. The existing top-level `try...catch` in `ollama-listeners.ts` might be catching errors in `ollamaServiceLayer` definition if it was outside. Now, errors in `ollamaServiceLayer` definition (if any persist) would be caught by the `try...catch` that should wrap the _contents_ of `addOllamaEventListeners`.

```typescript
// src/helpers/ipc/ollama/ollama-listeners.ts
import { ipcMain } from "electron"; // Removed BrowserWindow as it's not used here
import { Effect, Layer, Cause, Option } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import {
  OLLAMA_CHAT_COMPLETION_CHANNEL,
  OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  OLLAMA_STATUS_CHECK,
} from "./ollama-channels";
import {
  OllamaService,
  OllamaServiceConfigTag, // Assuming this is still needed by OllamaServiceLive if not UiOllamaConfigLive
  UiOllamaConfigLive, // Provides OllamaServiceConfigTag
} from "@/services/ollama/OllamaService"; // Ensure IOllamaService matches the exported interface name
import { OllamaServiceLive } from "@/services/ollama/OllamaServiceImpl";
import type { OllamaService as IOllamaService } from "@/services/ollama/OllamaService"; // For type annotation on the layer

// Track active streams for cancellation
const activeStreams = new Map<string, () => void>();

// Helper function to extract error details suitable for IPC (as provided in 2155-ipc-fix.md)
function extractErrorForIPC(error: any): object {
  const causeDetails = (err: any) => {
    if (Cause.isCause(err)) {
      const failure = Cause.failureOption(err as Cause.Cause<any>);
      if (Option.isSome(failure)) return extractErrorForIPC(failure.value);
      return {
        name: "CauseError",
        message: Cause.pretty(err as Cause.Cause<any>),
        _tag: (err as Cause.Cause<any>)._tag,
      };
    }
    return undefined;
  };
  const details: {
    __error: true;
    name: string;
    message: string;
    stack?: string;
    _tag?: string;
    cause?: any;
  } = {
    __error: true,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  };
  if (error instanceof Error && error.stack) details.stack = error.stack;
  if (error && typeof error === "object") {
    if ("_tag" in error) details._tag = (error as any)._tag;
    if (Cause.isCause(error)) details.cause = causeDetails(error);
    else if (Cause.isCause(error.cause))
      details.cause = causeDetails(error.cause);
    else if ("cause" in error && error.cause)
      details.cause = String(error.cause);
  }
  return details;
}

export function addOllamaEventListeners() {
  // --- MODIFICATION: Define ollamaServiceLayer inside this function ---
  let ollamaServiceLayer: Layer.Layer<IOllamaService, any, any>; // Use 'any' for E and R for simplicity if exact types are complex/cause issues here
  try {
    ollamaServiceLayer = Layer.provide(
      OllamaServiceLive,
      Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer),
    );
    console.log(
      "[IPC Listener] Ollama service layer defined successfully within addOllamaEventListeners.",
    );
  } catch (e) {
    console.error(
      "[IPC Listener] Critical error defining Ollama service layer inside addOllamaEventListeners:",
      e,
    );
    // If layer definition fails, the handlers below that depend on it might not work as expected.
    // It's crucial this part succeeds.
    // We re-throw to make it clear initialization failed, rather than letting handlers fail mysteriously.
    throw e;
  }
  // --- END MODIFICATION ---

  try {
    ipcMain.handle(OLLAMA_STATUS_CHECK, async () => {
      console.log(
        "[IPC Listener] Received OLLAMA_STATUS_CHECK. Attempting to check Ollama status through IPC.",
      );
      // The ollamaServiceLayer is now defined in this function's scope.
      // The previous `if (!ollamaServiceLayer)` check is less critical but can remain as a defensive measure
      // in case the try-catch above is modified to not re-throw.

      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.checkOllamaStatus());
      }).pipe(
        Effect.provide(ollamaServiceLayer), // Provide the locally defined layer
        Effect.catchAll((cause) => {
          console.error(
            "[IPC Listener] Error during Ollama status check Effect program:",
            Cause.pretty(cause),
          );
          return Effect.succeed(false);
        }),
      );

      try {
        const result = await Effect.runPromise(program);
        console.log(`[IPC Listener] Ollama status check result: ${result}`);
        return result;
      } catch (error) {
        // Catch synchronous errors from runPromise itself
        console.error(
          "[IPC Listener] Ollama status check runPromise failed:",
          error,
        );
        return false;
      }
    });

    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
      console.log(
        "[IPC Listener] Received OLLAMA_CHAT_COMPLETION_CHANNEL request.",
      );
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(
        Effect.provide(ollamaServiceLayer), // Provide the locally defined layer
      );

      try {
        const result = await Effect.runPromise(program);
        return result;
      } catch (error) {
        console.error("[IPC Listener] Ollama chat completion failed:", error);
        return extractErrorForIPC(error);
      }
    });

    ipcMain.on(
      OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
      async (event, requestId, request) => {
        console.log(
          `[IPC Listener] Received OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL request: ${requestId}`,
        );
        const streamingRequest = { ...request, stream: true };
        const abortController = new AbortController();
        activeStreams.set(requestId, () => abortController.abort());

        const program = Effect.gen(function* (_) {
          const ollamaService = yield* _(OllamaService);
          return ollamaService.generateChatCompletionStream(streamingRequest);
        }).pipe(
          Effect.provide(ollamaServiceLayer), // Provide the locally defined layer
        );

        try {
          const streamResult = await Effect.runPromiseExit(program);

          if (Effect.Exit.isFailure(streamResult)) {
            console.error(
              "[IPC Listener] Ollama stream initialization failed (program error):",
              Cause.pretty(streamResult.cause),
            );
            const errorForIPC = extractErrorForIPC(
              Cause.squash(streamResult.cause),
            );
            event.sender.send(
              `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
              requestId,
              errorForIPC,
            );
            activeStreams.delete(requestId);
            return;
          }

          const stream = streamResult.value;
          const streamProcessingEffect = Stream.runForEach(stream, (chunk) => {
            if (!abortController.signal.aborted) {
              event.sender.send(
                `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`,
                requestId,
                chunk,
              );
            }
            return Effect.void;
          });

          const finalExit = await Effect.runPromiseExit(streamProcessingEffect);

          if (Effect.Exit.isSuccess(finalExit)) {
            if (!abortController.signal.aborted) {
              event.sender.send(
                `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`,
                requestId,
              );
            }
          } else {
            if (!abortController.signal.aborted) {
              console.error(
                `[IPC Listener] Ollama stream processing error for ${requestId}:`,
                Cause.pretty(finalExit.cause),
              );
              const errorForIPC = extractErrorForIPC(
                Cause.squash(finalExit.cause),
              );
              event.sender.send(
                `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
                requestId,
                errorForIPC,
              );
            }
          }
        } catch (initialProgramError) {
          console.error(
            `[IPC Listener] Critical error during stream setup/run for ${requestId}`,
            initialProgramError,
          );
          const errorForIPC = extractErrorForIPC(initialProgramError);
          event.sender.send(
            `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
            requestId,
            errorForIPC,
          );
        } finally {
          activeStreams.delete(requestId);
        }
      },
    );

    ipcMain.on(
      `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`,
      (_, requestId) => {
        if (activeStreams.has(requestId)) {
          activeStreams.get(requestId)?.();
          activeStreams.delete(requestId);
        }
      },
    );

    console.log(
      "[IPC Listener] Ollama event listeners registered successfully.",
    );
  } catch (e) {
    console.error(
      "[IPC Listener] Error registering Ollama event listeners:",
      e,
    );
    // If handler registration itself fails, this log is crucial.
  }
}
```

**Reasoning for the fix:**

The primary change is moving the `ollamaServiceLayer` definition (and its `try...catch` block) from the module's top level to _inside_ the `addOllamaEventListeners` function.

- **Deferred Initialization:** This ensures that `NodeHttpClient.layer` (a dependency of `ollamaServiceLayer`) is accessed and used at a point where Electron's main process and its Node.js environment are more fully initialized (i.e., after `app.whenReady()` and `createWindow()` have completed, because `addOllamaEventListeners` is called within this sequence via `registerListeners`). This reduces the risk of errors caused by trying to use Node.js-specific platform features too early.
- **Scope:** `ollamaServiceLayer` is now a local constant within `addOllamaEventListeners`. The IPC handlers defined within this function will close over it, ensuring they use the correctly initialized layer.
- **Error Handling:** The `try...catch` around the layer definition is now within the function. If it throws, it will be logged, and the subsequent `ipcMain.handle` calls might still fail to register or the function might exit early. However, the likelihood of the layer definition itself failing is reduced by deferring it. I've also added more logging within the `OLLAMA_STATUS_CHECK` handler to trace its execution flow.
- **Removed Redundant Check:** The `if (!ollamaServiceLayer)` check inside the `OLLAMA_STATUS_CHECK` handler is less critical now because if the layer definition failed, the function would likely have thrown an error before reaching the handler registration. However, it's kept as a defensive measure.

This change should make the registration of the `ollama:status-check` IPC handler more reliable by ensuring its dependencies are initialized at a more appropriate time in the Electron main process lifecycle.The error "No handler registered for 'ollama:status-check'" means that the main Electron process isn't listening for this specific IPC message when the renderer process tries to send it.

This is typically due to an issue in `src/helpers/ipc/ollama/ollama-listeners.ts`, where the `ipcMain.handle('ollama:status-check', ...)` call either isn't happening or is failing during its setup. A common cause for this in more complex Effect-TS setups within Electron's main process is attempting to initialize layers that depend on Node.js platform features (like `NodeHttpClient.layer`) at the module's top-level, before the Electron app environment is fully ready.

We will fix this by moving the initialization of `ollamaServiceLayer` _inside_ the `addOllamaEventListeners` function. This ensures that the layer, and its dependencies like `NodeHttpClient`, are initialized at a later, safer point in the Electron lifecycle (after `app.whenReady()` and window creation).

**Instructions for the coding agent:**

Modify the file `src/helpers/ipc/ollama/ollama-listeners.ts` as follows:

1.  **Move `ollamaServiceLayer` Definition:**

    - Cut the `ollamaServiceLayer` variable declaration and its `try...catch` initialization block from the module's top level.
    - Paste this entire block _inside_ the `addOllamaEventListeners` function, making `ollamaServiceLayer` a local constant within that function.

2.  **Refine Handler Logic (Optional but good practice):**
    - The `if (!ollamaServiceLayer)` check inside the `OLLAMA_STATUS_CHECK` handler is now less critical as the layer is defined in the same scope. It can be removed for conciseness or kept as a defensive measure. The primary goal is that the layer definition must succeed for the handler to be registered and functional.
    - Add console logs at the beginning of `addOllamaEventListeners` and immediately before `ipcMain.handle(OLLAMA_STATUS_CHECK, ...)` to confirm these parts of the code are being reached.

**Here is the updated content for `src/helpers/ipc/ollama/ollama-listeners.ts`:**

```typescript
import { ipcMain } from "electron";
import { Effect, Layer, Cause, Option } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import {
  OLLAMA_CHAT_COMPLETION_CHANNEL,
  OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  OLLAMA_STATUS_CHECK,
} from "./ollama-channels";
import {
  OllamaService,
  UiOllamaConfigLive,
} from "@/services/ollama/OllamaService";
import { OllamaServiceLive } from "@/services/ollama/OllamaServiceImpl";
import type { OllamaService as IOllamaService } from "@/services/ollama/OllamaService";

const activeStreams = new Map<string, () => void>();
const chunkCounter: Record<string, number> = {};

function extractErrorForIPC(error: any): object {
  const causeDetails = (err: any) => {
    if (Cause.isCause(err)) {
      const failure = Cause.failureOption(err as Cause.Cause<any>);
      if (Option.isSome(failure)) return extractErrorForIPC(failure.value);
      return {
        name: "CauseError",
        message: Cause.pretty(err as Cause.Cause<any>),
        _tag: (err as Cause.Cause<any>)._tag,
      };
    }
    return undefined;
  };
  const details: {
    __error: true;
    name: string;
    message: string;
    stack?: string;
    _tag?: string;
    cause?: any;
  } = {
    __error: true,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  };
  if (error instanceof Error && error.stack) details.stack = error.stack;
  if (error && typeof error === "object") {
    if ("_tag" in error) details._tag = (error as any)._tag;
    if (Cause.isCause(error)) details.cause = causeDetails(error);
    else if (Cause.isCause(error.cause))
      details.cause = causeDetails(error.cause);
    else if ("cause" in error && error.cause)
      details.cause = String(error.cause);
  }
  return details;
}

export function addOllamaEventListeners() {
  console.log("[IPC Setup] Attempting to add Ollama event listeners...");

  let ollamaServiceLayer: Layer.Layer<IOllamaService, any, any>;
  try {
    ollamaServiceLayer = Layer.provide(
      OllamaServiceLive,
      Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer),
    );
    console.log(
      "[IPC Setup] Ollama service layer defined successfully within addOllamaEventListeners.",
    );
  } catch (e) {
    console.error(
      "[IPC Setup] CRITICAL: Error defining Ollama service layer:",
      e,
    );
    // If the layer definition fails, subsequent handlers will not work correctly.
    // It's important to know if this happens.
    throw e; // Re-throwing might be too aggressive, consider just logging and returning.
    // For now, let's keep throw to see if this is the source of the original "no handler" issue.
  }

  try {
    console.log(`[IPC Setup] Registering handler for ${OLLAMA_STATUS_CHECK}`);
    ipcMain.handle(OLLAMA_STATUS_CHECK, async () => {
      console.log(`[IPC Handler] Received ${OLLAMA_STATUS_CHECK}.`);

      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.checkOllamaStatus());
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.catchAll((cause) => {
          console.error(
            `[IPC Handler] Error during Ollama status check Effect program for ${OLLAMA_STATUS_CHECK}:`,
            Cause.pretty(cause),
          );
          return Effect.succeed(false);
        }),
      );

      try {
        const result = await Effect.runPromise(program);
        console.log(
          `[IPC Handler] Ollama status check result for ${OLLAMA_STATUS_CHECK}: ${result}`,
        );
        return result;
      } catch (error) {
        console.error(
          `[IPC Handler] Ollama status check runPromise failed for ${OLLAMA_STATUS_CHECK}:`,
          error,
        );
        return false;
      }
    });
    console.log(`[IPC Setup] Handler for ${OLLAMA_STATUS_CHECK} registered.`);

    // Handler for non-streaming chat completion
    console.log(
      `[IPC Setup] Registering handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL}`,
    );
    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
      console.log(`[IPC Handler] Received ${OLLAMA_CHAT_COMPLETION_CHANNEL}.`);
      const program = Effect.gen(function* (_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(Effect.provide(ollamaServiceLayer));
      try {
        return await Effect.runPromise(program);
      } catch (error) {
        console.error(
          `[IPC Handler] Ollama chat completion failed for ${OLLAMA_CHAT_COMPLETION_CHANNEL}:`,
          error,
        );
        return extractErrorForIPC(error);
      }
    });
    console.log(
      `[IPC Setup] Handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL} registered.`,
    );

    // Handler for streaming chat completion
    console.log(
      `[IPC Setup] Registering listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}`,
    );
    ipcMain.on(
      OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
      async (event, requestId, request) => {
        console.log(
          `[IPC Listener] Received ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL} request: ${requestId}`,
        );
        const streamingRequest = { ...request, stream: true };
        const abortController = new AbortController();
        activeStreams.set(requestId, () => abortController.abort());

        const program = Effect.gen(function* (_) {
          const ollamaService = yield* _(OllamaService);
          return ollamaService.generateChatCompletionStream(streamingRequest);
        }).pipe(Effect.provide(ollamaServiceLayer));

        try {
          const streamResult = await Effect.runPromiseExit(program);

          if (Effect.Exit.isFailure(streamResult)) {
            console.error(
              `[IPC Listener] Ollama stream initialization failed for ${requestId}:`,
              Cause.pretty(streamResult.cause),
            );
            event.sender.send(
              `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
              requestId,
              extractErrorForIPC(Cause.squash(streamResult.cause)),
            );
            activeStreams.delete(requestId);
            return;
          }

          const stream = streamResult.value;
          console.log(
            `[IPC Listener] Stream obtained for ${requestId}, starting processing.`,
          );
          chunkCounter[requestId] = 0; // Reset chunk counter for this stream

          const streamProcessingEffect = Stream.runForEach(
            stream,
            (chunk: any) => {
              if (!abortController.signal.aborted) {
                chunkCounter[requestId]++;
                if (
                  chunkCounter[requestId] === 1 ||
                  chunkCounter[requestId] % 10 === 0
                ) {
                  console.log(
                    `[IPC Listener] Sending chunk ${chunkCounter[requestId]} for ${requestId}`,
                  );
                }
                event.sender.send(
                  `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`,
                  requestId,
                  chunk,
                );
              }
              return Effect.void;
            },
          );

          const finalExit = await Effect.runPromiseExit(streamProcessingEffect);

          if (Effect.Exit.isSuccess(finalExit)) {
            if (!abortController.signal.aborted) {
              console.log(
                `[IPC Listener] Stream ${requestId} completed successfully.`,
              );
              event.sender.send(
                `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`,
                requestId,
              );
            } else {
              console.log(
                `[IPC Listener] Stream ${requestId} was aborted before completion.`,
              );
            }
          } else {
            if (!abortController.signal.aborted) {
              console.error(
                `[IPC Listener] Ollama stream processing error for ${requestId}:`,
                Cause.pretty(finalExit.cause),
              );
              event.sender.send(
                `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
                requestId,
                extractErrorForIPC(Cause.squash(finalExit.cause)),
              );
            } else {
              console.log(
                `[IPC Listener] Stream ${requestId} processing aborted, error not sent to renderer:`,
                Cause.pretty(finalExit.cause),
              );
            }
          }
        } catch (initialProgramError) {
          console.error(
            `[IPC Listener] Critical error during stream setup/run for ${requestId}:`,
            initialProgramError,
          );
          event.sender.send(
            `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`,
            requestId,
            extractErrorForIPC(initialProgramError),
          );
        } finally {
          console.log(`[IPC Listener] Cleaning up for stream ${requestId}.`);
          activeStreams.delete(requestId);
          delete chunkCounter[requestId];
        }
      },
    );
    console.log(
      `[IPC Setup] Listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL} registered.`,
    );

    // Handler for stream cancellation
    ipcMain.on(
      `${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`,
      (_, requestId) => {
        console.log(
          `[IPC Listener] Received cancel request for stream: ${requestId}`,
        );
        if (activeStreams.has(requestId)) {
          activeStreams.get(requestId)?.();
          activeStreams.delete(requestId); // Clean up immediately
          console.log(
            `[IPC Listener] Stream ${requestId} cancellation processed.`,
          );
        } else {
          console.log(
            `[IPC Listener] No active stream found to cancel for ID: ${requestId}`,
          );
        }
      },
    );
    console.log(
      `[IPC Setup] Listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel registered.`,
    );
    console.log(
      "[IPC Setup] All Ollama event listeners registered successfully.",
    );
  } catch (e) {
    console.error(
      "[IPC Setup] Error during registration of Ollama IPC handlers:",
      e,
    );
  }
}
```
