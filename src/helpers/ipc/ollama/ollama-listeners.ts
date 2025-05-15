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

      console.log("Preparing streaming request:", JSON.stringify(streamingRequest));
      
      // Create a complete program that includes all dependencies
      const program = Effect.gen(function*(_) {
        // Access the service through the layer
        const ollamaService = yield* _(OllamaService);
        
        // Generate the stream with explicit arguments for clarity
        console.log("About to call generateChatCompletionStream");
        const stream = yield* _(ollamaService.generateChatCompletionStream(streamingRequest));
        console.log("Stream created successfully");
        
        return stream;
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.tapError(err => Effect.sync(() => {
          console.error("Error in streaming program:", err);
        }))
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

        // Process stream chunks manually to avoid Effect.js compatibility issues
        try {
          // Create a consumer for the stream
          console.log("Starting stream processing...");
          
          // Convert Stream to Effect for safe consumption
          const processStreamEffect = Stream.runForEach(
            (chunk: any) => {
              // Log the received chunk
              console.log(`Stream chunk received:`, 
                JSON.stringify(chunk, (key, value) => 
                  key === 'cause' ? undefined : value, 2)
              );
              
              // Only send if not aborted
              if (!signal.aborted) {
                event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, requestId, chunk);
              }
              
              // Always return an Effect to signify successful processing
              return Effect.succeed(undefined);
            }
          )(stream);
          
          // Create a safe runner for the stream
          const safeStreamRunner = Effect.catchAllCause(
            processStreamEffect,
            cause => {
              console.error("Stream processing causeError:", cause);
              if (!signal.aborted) {
                event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, {
                  __error: true,
                  message: `Stream processing failed: ${cause._tag}`,
                  cause: JSON.stringify(cause, (k, v) => k === 'cause' ? undefined : v)
                });
              }
              return Effect.succeed(undefined);
            }
          );
          
          // Run the stream with a request cache layer to prevent potential deadlocks
          await Effect.runPromise(safeStreamRunner.pipe(
            Effect.provide(Layer.setRequestCache())
          ));
          
          console.log("Stream processing completed successfully");
        } catch (error) {
          if (!signal.aborted) {
            console.error("Ollama streaming error during processing:", error);
            // Send error to renderer
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, {
              __error: true,
              name: error.name || "Error",
              message: error.message || String(error),
              stack: error.stack,
              ...((error as any)._tag && { _tag: (error as any)._tag })
            });
          }
        }

        // Stream completed successfully
        if (!signal.aborted) {
          event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, requestId);
        }
      } catch (error) {
        console.error("Ollama stream initialization failed:", error);
        
        // Create a more detailed error representation for debugging
        let errorDetails = {
          __error: true,
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error)
        };
        
        // Add stack trace if available
        if (error instanceof Error && error.stack) {
          errorDetails = { ...errorDetails, stack: error.stack };
        }
        
        // Add Effect-specific error tags if present
        if (error && typeof error === 'object') {
          // Add _tag if present (Effect.js error category)
          if ('_tag' in error) {
            errorDetails = { ...errorDetails, _tag: (error as any)._tag };
          }
          
          // Add cause if present
          if ('cause' in error) {
            try {
              const causeStr = JSON.stringify((error as any).cause);
              errorDetails = { ...errorDetails, cause: causeStr };
            } catch (e) {
              errorDetails = { ...errorDetails, cause: "Error serializing cause" };
            }
          }
        }
        
        // Log the error details we're sending
        console.error("Sending error details to renderer:", errorDetails);
        
        // Send error to renderer
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorDetails);
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