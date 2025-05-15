import { ipcMain, BrowserWindow } from "electron";
import { Effect, Layer, Stream, Cause, Exit } from "effect";
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

// Helper function to extract error details suitable for IPC
function extractErrorForIPC(error: any): object {
  const details: { __error: true; name: string; message: string; stack?: string; _tag?: string; cause?: string } = {
    __error: true,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error)
  };
  
  if (error instanceof Error && error.stack) {
    details.stack = error.stack;
  }
  
  if (error && typeof error === 'object') {
    if ('_tag' in error) {
      details._tag = (error as any)._tag;
    }
    
    if ('cause' in error && error.cause) {
      try {
        // Try to serialize the cause
        if (Cause && typeof Cause.pretty === 'function') {
          details.cause = Cause.pretty(error.cause);
        } else {
          details.cause = JSON.stringify(error.cause, (k, v) => 
            k === 'cause' ? undefined : v
          );
        }
      } catch (e) {
        details.cause = "Error serializing cause: " + String(error.cause);
      }
    }
  }
  
  return details;
}

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
        // Return error details
        return extractErrorForIPC(error);
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

      console.log("Preparing streaming request for model:", streamingRequest.model);
      
      // Create a program that obtains the stream
      // Note: We can't yield a Stream directly in an Effect.gen, 
      // so we need a different approach to get the stream
      console.log("[IPC Listener] Preparing to get stream from OllamaService");
      
      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        console.log("[IPC Listener] About to call ollamaService.generateChatCompletionStream");
        // Don't try to yield the stream directly - it's not an Effect
        // Instead, we return it from the generator
        return ollamaService.generateChatCompletionStream(streamingRequest);
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.tapError(err => Effect.sync(() => {
          console.error("[IPC Listener] Error in Effect program that was supposed to yield a Stream:", err);
        }))
      );

      // Abort controller for cancellation
      const abortController = new AbortController();
      const signal = abortController.signal;
      
      // Save cancel function in map
      activeStreams.set(requestId, () => {
        abortController.abort();
      });

      try {
        // Run the program and get the stream result, with detailed error handling
        const streamResult = await Effect.runPromiseExit(program);

        if (Exit.isFailure(streamResult)) {
          // The program to get the stream itself failed
          console.error("Ollama stream initialization failed (program error):", streamResult.cause);
          
          // Extract a serializable error from streamResult.cause
          const errorForIPC = extractErrorForIPC(Cause.squash(streamResult.cause));
          event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          activeStreams.delete(requestId);
          return;
        }

        // We have a valid stream
        const stream = streamResult.value;
        console.log("[IPC Listener] Successfully obtained stream from program. Type:", typeof stream);

        // Set up stream processing effect 
        // Make sure to create the processing effect correctly
        const streamProcessingEffect = Stream.runForEach(stream, (chunk) => {
          if (!signal.aborted) {
            // For debugging, log the chunk content
            console.log(`[IPC Listener] Stream.runForEach received chunk:`, JSON.stringify(chunk, null, 2).substring(0, 100) + "...");
            // Send to renderer
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, requestId, chunk);
          }
          return Effect.void; // Correct for runForEach's callback
        });

        // Run the stream processing with detailed exit handling
        // Remove the Layer.setRequestCache() since it needs an argument we don't have
        const finalExit = await Effect.runPromiseExit(streamProcessingEffect);

        if (Exit.isSuccess(finalExit)) {
          if (!signal.aborted) {
            console.log(`Stream ${requestId} completed successfully.`);
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, requestId);
          }
        } else { // Stream processing failed
          if (!signal.aborted) {
            console.error(`Ollama stream processing error for ${requestId}:`, finalExit.cause);
            const errorForIPC = extractErrorForIPC(Cause.squash(finalExit.cause));
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          }
        }
      } catch (initialProgramError) { // Catch synchronous errors from runPromiseExit or other setup
        console.error("Critical error during stream setup/run:", initialProgramError);
        const errorForIPC = extractErrorForIPC(initialProgramError);
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
      } finally {
        activeStreams.delete(requestId);
      }
    });

    // Stream cancellation handler
    ipcMain.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, (_, requestId) => {
      if (activeStreams.has(requestId)) {
        console.log(`Cancelling stream ${requestId}`);
        activeStreams.get(requestId)?.();
        activeStreams.delete(requestId);
      }
    });
  } catch (e) {
    console.error(`Error registering Ollama event listeners:`, e);
  }
}