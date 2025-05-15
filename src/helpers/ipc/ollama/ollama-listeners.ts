import { ipcMain, BrowserWindow } from "electron";
import { Effect, Layer, Stream, Cause, Exit, Option } from "effect";
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

// For tracking chunk counts to reduce logging
const chunkCounter: Record<string, number> = {};

// Helper function to extract error details suitable for IPC
function extractErrorForIPC(error: any): object {
  // Helper for handling Effect Cause objects
  const causeDetails = (err: any) => {
    if (Cause.isCause(err)) {
      // If it's a Cause, try to extract a failure first
      const failure = Cause.failureOption(err as Cause.Cause<any>);
      if (Option.isSome(failure)) {
        return extractErrorForIPC(failure.value); // Recursively extract from failure
      }
      
      // For Die or Interrupt, provide tag and squashed message
      return { 
        name: "CauseError", 
        message: Cause.pretty(err as Cause.Cause<any>), 
        _tag: (err as Cause.Cause<any>)._tag 
      };
    }
    return undefined;
  };

  const details: { __error: true; name: string; message: string; stack?: string; _tag?: string; cause?: any } = {
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
    
    if (Cause.isCause(error)) {
      // If the error itself is a Cause
      details.cause = causeDetails(error);
    } else if (Cause.isCause(error.cause)) {
      // If the error has a cause property that is a Cause
      details.cause = causeDetails(error.cause);
    } else if ('cause' in error && error.cause) {
      // For non-Effect causes, provide a simple representation
      details.cause = String(error.cause);
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

      console.log(`[IPC Listener] Starting streaming request ${requestId} for model: ${streamingRequest.model}`);
      
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
        console.log(`[IPC Listener] Running program to get stream for ${requestId}`);
        // Run the program and get the stream result, with detailed error handling
        const streamResult = await Effect.runPromiseExit(program);

        if (Exit.isFailure(streamResult)) {
          // The program to get the stream itself failed
          console.error("[IPC Listener] Ollama stream initialization failed (program error):", Cause.pretty(streamResult.cause));
          
          // Extract a serializable error from streamResult.cause
          const errorForIPC = extractErrorForIPC(Cause.squash(streamResult.cause));
          event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          activeStreams.delete(requestId);
          return;
        }

        // We have a valid stream
        const stream = streamResult.value;
        console.log(`[IPC Listener] Stream obtained, starting processing for requestId: ${requestId}`);

        // Define the effect for processing each chunk
        const processChunkEffect = (chunk: any) => {
          if (!signal.aborted) {
            // Only log first chunk and every 10th chunk to reduce noise
            if (!chunkCounter[requestId]) {
              chunkCounter[requestId] = 1;
              console.log(`[IPC Listener] First chunk received for ${requestId}`);
            } else {
              chunkCounter[requestId]++;
              if (chunkCounter[requestId] % 10 === 0) {
                console.log(`[IPC Listener] Received ${chunkCounter[requestId]} chunks for ${requestId}`);
              }
            }
            
            // Send to renderer
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, requestId, chunk);
          }
          return Effect.void; // Must return an Effect for runForEach
        };

        // Define the stream processing effect
        console.log(`[IPC Listener] Creating Stream.runForEach effect for stream ${requestId}`);
        // Must call Stream.runForEach with the stream as first argument and the handler function second
        const streamProcessingEffect = Stream.runForEach(stream, processChunkEffect);

        // Run the stream processing without any unnecessary Layer.setRequestCache
        console.log(`[IPC Listener] Running stream processing effect for ${requestId}`);
        const finalExit = await Effect.runPromiseExit(streamProcessingEffect);

        if (Exit.isSuccess(finalExit)) {
          if (!signal.aborted) {
            console.log(`[IPC Listener] Stream ${requestId} completed successfully.`);
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, requestId);
          } else {
            console.log(`[IPC Listener] Stream ${requestId} was aborted before completion.`);
          }
        } else { // Stream processing failed
          if (!signal.aborted) {
            console.error(`[IPC Listener] Ollama stream processing error for ${requestId}:`, Cause.pretty(finalExit.cause));
            const errorForIPC = extractErrorForIPC(Cause.squash(finalExit.cause));
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          } else {
            console.log(`[IPC Listener] Stream ${requestId} processing aborted, error not sent:`, Cause.pretty(finalExit.cause));
          }
        }
      } catch (initialProgramError) { // Catch synchronous errors from runPromiseExit or other setup
        console.error(`[IPC Listener] Critical error during stream setup/run for requestId: ${requestId}`, initialProgramError);
        const errorForIPC = extractErrorForIPC(initialProgramError);
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
      } finally {
        console.log(`[IPC Listener] Cleaning up activeStream for requestId: ${requestId}`);
        activeStreams.delete(requestId);
      }
    });

    // Stream cancellation handler
    ipcMain.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, (_, requestId) => {
      if (activeStreams.has(requestId)) {
        console.log(`[IPC Listener] Cancelling stream ${requestId}`);
        activeStreams.get(requestId)?.();
        activeStreams.delete(requestId);
      } else {
        console.log(`[IPC Listener] Received cancel request for non-existent stream: ${requestId}`);
      }
    });
  } catch (e) {
    console.error(`Error registering Ollama event listeners:`, e);
  }
}