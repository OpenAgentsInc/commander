import { ipcMain, BrowserWindow } from "electron";
import { Effect, Layer, Stream } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { 
  OLLAMA_CHAT_COMPLETION_CHANNEL,
  OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL
} from "./ollama-channels";
import { 
  OllamaService,
  OllamaServiceConfigTag,
  UiOllamaConfigLive
} from "@/services/ollama/OllamaService";
import { OllamaServiceLive } from "@/services/ollama/OllamaServiceImpl";
import type { OllamaService as IOllamaService } from "@/services/ollama/OllamaService"; // For type annotation

// Create a combined layer for the Ollama service with all dependencies
let ollamaServiceLayer: Layer.Layer<IOllamaService, never, never>;
try {
  ollamaServiceLayer = Layer.provide(
    OllamaServiceLive,
    Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer)
  );
} catch (e) {
  console.error("Critical error defining Ollama service layer:", e);
  throw e;
}

// Track active streams for cancellation
const activeStreams = new Map<string, () => void>();

export function addOllamaEventListeners() {
  try {
    // Non-streaming handler (invoke/return)
    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
      // Ensure ollamaServiceLayer was defined
      if (!ollamaServiceLayer) {
        console.error("IPC HANDLER ERROR: ollamaServiceLayer is not defined!");
        return { __error: true, message: "Service layer not initialized" };
      }

      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(
        Effect.provide(ollamaServiceLayer)
      );

      try {
        const result = await Effect.runPromise(program);
        return result;
      } catch (error) {
        console.error("Ollama API call failed:", error);
        // Return the error in a format that can be serialized for IPC
        if (error instanceof Error) {
          return {
            __error: true,
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...((error as any)._tag && { _tag: (error as any)._tag }),
            ...((error as any).cause && { cause: JSON.stringify((error as any).cause, Object.getOwnPropertyNames((error as any).cause)) })
          };
        }
        return { __error: true, message: String(error) };
      }
    });

    // Streaming handler (send/on)
    ipcMain.on(OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, async (event, requestId, request) => {
      // Ensure ollamaServiceLayer was defined
      if (!ollamaServiceLayer) {
        console.error("IPC HANDLER ERROR: ollamaServiceLayer is not defined!");
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, {
          __error: true, 
          message: "Service layer not initialized"
        });
        return;
      }

      // Make sure the request has stream: true
      const streamingRequest = {
        ...request,
        stream: true
      };

      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        return ollamaService.generateChatCompletionStream(streamingRequest);
      }).pipe(
        Effect.provide(ollamaServiceLayer)
      );

      try {
        // Get the stream
        const stream = await Effect.runPromise(program);
        
        // Store a drainer for cancellation
        const abortController = new AbortController();
        const signal = abortController.signal;
        
        // Save the cancel function
        activeStreams.set(requestId, () => {
          abortController.abort();
        });

        // Use streaming with Effect's Stream collector
        const streamRunner = Stream.runForEach(chunk => {
          // Only send if not aborted
          if (!signal.aborted) {
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, requestId, chunk);
          }
        })(stream);

        // Run the stream and handle completion/errors
        await Effect.runPromise(
          Effect.catchAll(
            streamRunner,
            error => {
              if (!signal.aborted) {
                console.error("Ollama streaming error:", error);
                // Send error to renderer
                event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, {
                  __error: true,
                  name: error.name || "Error",
                  message: error.message || String(error),
                  stack: error.stack,
                  ...((error as any)._tag && { _tag: (error as any)._tag })
                });
              }
              return Effect.void;
            }
          )
        );

        // Stream completed successfully
        if (!signal.aborted) {
          event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, requestId);
        }
      } catch (error) {
        console.error("Ollama stream initialization failed:", error);
        // Send error to renderer
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, {
          __error: true,
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error)
        });
      } finally {
        // Clean up
        activeStreams.delete(requestId);
      }
    });

    // Stream cancellation handler
    ipcMain.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, (_, requestId) => {
      if (activeStreams.has(requestId)) {
        activeStreams.get(requestId)?.();
        activeStreams.delete(requestId);
      }
    });
  } catch (e) {
    console.error(`Error registering Ollama event listeners:`, e);
  }
}