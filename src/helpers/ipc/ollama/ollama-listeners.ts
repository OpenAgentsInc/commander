import { ipcMain } from "electron"; // Removed BrowserWindow as it's not used
import { Effect, Layer, Stream, Cause, Exit, Option } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { 
  OLLAMA_CHAT_COMPLETION_CHANNEL,
  OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  OLLAMA_STATUS_CHECK
} from "./ollama-channels";
import { 
  OllamaService,
  UiOllamaConfigLive
} from "@/services/ollama/OllamaService";
import { OllamaServiceLive } from "@/services/ollama/OllamaServiceImpl";
import type { OllamaService as IOllamaService } from "@/services/ollama/OllamaService"; // For type annotation
import { TelemetryService } from "@/services/telemetry";
import { TelemetryServiceLive } from "@/services/telemetry/TelemetryServiceImpl";

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
  // Flag to track if we've already registered these handlers
  // This prevents duplicate handlers if called multiple times
  if ((global as any).__ollamaEventListenersRegistered) {
    console.log("[IPC Setup] Ollama event listeners already registered, skipping...");
    return;
  }

  console.log("[IPC Setup] Beginning Ollama event listeners registration...");
  
  // Create a combined layer for the Ollama service with all dependencies
  // MOVED INSIDE the function to ensure it's created at the right time in Electron's lifecycle
  let ollamaServiceLayer: Layer.Layer<IOllamaService, never, never>;
  try {
    // Add telemetry to the layer for better observability
    ollamaServiceLayer = Layer.provide(
      OllamaServiceLive,
      Layer.merge(
        UiOllamaConfigLive, 
        NodeHttpClient.layer,
        TelemetryServiceLive
      )
    );
    console.log("[IPC Setup] Ollama service layer defined successfully inside addOllamaEventListeners.");
  } catch (e) {
    console.error("[IPC Setup] CRITICAL ERROR: Failed to define Ollama service layer:", e);
    console.error("[IPC Setup] Details:", e instanceof Error ? e.stack : String(e));
    // Don't throw, try to continue but mark that we should do a basic fallback
    ollamaServiceLayer = Layer.succeed(OllamaService, {
      checkOllamaStatus: () => Effect.succeed(false),
      generateChatCompletion: () => Effect.fail({
        _tag: "OllamaHttpError", 
        message: "Ollama service not properly initialized",
        request: {},
        response: {}
      } as any), // Cast to any to avoid TypeScript errors
      generateChatCompletionStream: () => { 
        throw { 
          _tag: "OllamaHttpError", 
          message: "Ollama service not properly initialized",
          request: {},
          response: {}
        };
      }
    });
    console.log("[IPC Setup] Created fallback Ollama service layer");
  }
  try {
    // Status check handler - completely avoids CORS issues by using IPC
    console.log(`[IPC Setup] Registering handler for ${OLLAMA_STATUS_CHECK}...`);
    ipcMain.handle(OLLAMA_STATUS_CHECK, async () => {
      console.log("[IPC Handler] Received request to check Ollama status through IPC");
      
      // The ollamaServiceLayer should be defined at this point since we're within the same scope
      // We're keeping a simplified check as a defense-in-depth measure
      if (!ollamaServiceLayer) {
        console.error("[IPC Handler] CRITICAL ERROR: ollamaServiceLayer is not defined!");
        return false; // Consider it not connected
      }

      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.checkOllamaStatus());
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.catchAll((error) => {
          // Handle error object without using Cause.pretty since it's not a Cause type
          const errorMessage = typeof error === 'object' && error !== null 
            ? (error._tag || '') + ': ' + (error.message || JSON.stringify(error)) 
            : String(error);
          console.error("[IPC Handler] Error during Ollama status check:", errorMessage);
          return Effect.succeed(false); // Return false for any errors
        })
      );

      try {
        const result = await Effect.runPromise(program);
        console.log(`[IPC Handler] Ollama status check result: ${result}`);
        return result;
      } catch (error) {
        console.error("[IPC Handler] Ollama status check runPromise failed:", error);
        return false; // Consider it not connected
      }
    });
    console.log(`[IPC Setup] Handler for ${OLLAMA_STATUS_CHECK} registered successfully.`);
    
    // Non-streaming handler (invoke/return)
    console.log(`[IPC Setup] Registering handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL}...`);
    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
      console.log("[IPC Handler] Received request for chat completion with model:", request?.model || "unspecified");
      
      // The ollamaServiceLayer should be defined at this point
      if (!ollamaServiceLayer) {
        console.error("[IPC Handler] CRITICAL ERROR: ollamaServiceLayer is not defined!");
        return { __error: true, message: "Service layer not initialized" };
      }

      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        const telemetry = yield* _(TelemetryService);

        // Track request for observability
        yield* _(telemetry.trackEvent({
          category: "ollama:ipc",
          action: "chat_completion_request",
          label: request?.model || "unknown_model"
        }));

        // Use OllamaService to call the actual Ollama API
        const result = yield* _(ollamaService.generateChatCompletion(request));

        // Track successful response
        yield* _(telemetry.trackEvent({
          category: "ollama:ipc",
          action: "chat_completion_success",
          label: request?.model || "unknown_model"
        }));

        return result;
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.tapError(error => Effect.sync(() => {
          console.error("[IPC Handler] Error in chat completion program:", 
            error instanceof Error ? error.message : String(error));
        }))
      );

      try {
        const result = await Effect.runPromise(program);
        console.log("[IPC Handler] Chat completion generated successfully");
        return result;
      } catch (error) {
        console.error("[IPC Handler] Ollama API call failed:", error);
        // Return error details in a format that can be serialized over IPC
        return extractErrorForIPC(error);
      }
    });
    console.log(`[IPC Setup] Handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL} registered successfully.`);

    // Streaming handler (send/on)
    console.log(`[IPC Setup] Registering listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}...`);
    ipcMain.on(OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, async (event, requestId, request) => {
      console.log(`[IPC Listener] Received streaming request ${requestId} for model: ${request?.model || 'unspecified'}`);
      
      // The ollamaServiceLayer should be defined at this point
      if (!ollamaServiceLayer) {
        console.error("[IPC Listener] CRITICAL ERROR: ollamaServiceLayer is not defined!");
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

      console.log(`[IPC Listener] Setting up streaming request ${requestId} for model: ${streamingRequest.model || 'unknown'}`);
      
      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        const telemetry = yield* _(TelemetryService);
        
        // Track the stream request for observability
        yield* _(telemetry.trackEvent({
          category: "ollama:ipc:stream",
          action: "stream_request_start",
          label: streamingRequest.model || "unknown_model",
          value: requestId
        }));
        
        console.log(`[IPC Listener] About to call ollamaService.generateChatCompletionStream for ${requestId}`);
        
        // Return the stream from the generator
        return ollamaService.generateChatCompletionStream(streamingRequest);
      }).pipe(
        Effect.provide(ollamaServiceLayer),
        Effect.tapError(err => Effect.gen(function*(_) {
          const telemetry = yield* _(TelemetryService);
          yield* _(telemetry.trackEvent({
            category: "ollama:ipc:stream",
            action: "stream_setup_error",
            label: streamingRequest.model || "unknown_model",
            value: requestId
          }).pipe(Effect.ignoreLogged));
          
          console.error(`[IPC Listener] Error in stream program for ${requestId}:`, err);
        }).pipe(Effect.provide(ollamaServiceLayer), Effect.ignore))
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
          console.error(`[IPC Listener] Ollama stream initialization failed for ${requestId}:`, Cause.pretty(streamResult.cause));
          
          // Extract a serializable error from streamResult.cause
          const errorForIPC = extractErrorForIPC(Cause.squash(streamResult.cause));
          event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          activeStreams.delete(requestId);
          return;
        }

        // We have a valid stream
        const stream = streamResult.value;
        console.log(`[IPC Listener] Stream obtained, starting processing for requestId: ${requestId}`);

        // Initialize or reset chunk counter for this request
        chunkCounter[requestId] = 0;

        // Define the effect for processing each chunk
        const processChunkEffect = (chunk: any) => {
          if (!signal.aborted) {
            // Track chunk count for logging
            chunkCounter[requestId]++;
            
            // Log first chunk and every 10th chunk to reduce noise
            if (chunkCounter[requestId] === 1) {
              console.log(`[IPC Listener] First chunk received for ${requestId}`);
            } else if (chunkCounter[requestId] % 10 === 0) {
              console.log(`[IPC Listener] Received ${chunkCounter[requestId]} chunks for ${requestId}`);
            }
            
            // Send to renderer
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, requestId, chunk);
          }
          return Effect.void; // Must return an Effect for runForEach
        };

        // Define the stream processing effect
        console.log(`[IPC Listener] Creating Stream.runForEach effect for stream ${requestId}`);
        const streamProcessingEffect = Stream.runForEach(stream, processChunkEffect);

        // Run the stream processing
        console.log(`[IPC Listener] Running stream processing effect for ${requestId}`);
        const finalExit = await Effect.runPromiseExit(streamProcessingEffect);

        if (Exit.isSuccess(finalExit)) {
          if (!signal.aborted) {
            console.log(`[IPC Listener] Stream ${requestId} completed successfully with ${chunkCounter[requestId]} chunks.`);
            
            // Track successful completion
            Effect.runPromise(Effect.gen(function*(_) {
              const telemetry = yield* _(TelemetryService);
              yield* _(telemetry.trackEvent({
                category: "ollama:ipc:stream",
                action: "stream_complete_success",
                label: streamingRequest.model || "unknown_model",
                value: requestId,
                context: { chunks: chunkCounter[requestId] }
              }));
            }).pipe(Effect.provide(ollamaServiceLayer), Effect.ignoreLogged));
            
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, requestId);
          } else {
            console.log(`[IPC Listener] Stream ${requestId} was aborted before completion.`);
            
            // Track aborted stream
            Effect.runPromise(Effect.gen(function*(_) {
              const telemetry = yield* _(TelemetryService);
              yield* _(telemetry.trackEvent({
                category: "ollama:ipc:stream",
                action: "stream_aborted",
                label: streamingRequest.model || "unknown_model",
                value: requestId,
                context: { chunks: chunkCounter[requestId] }
              }));
            }).pipe(Effect.provide(ollamaServiceLayer), Effect.ignoreLogged));
          }
        } else { // Stream processing failed
          if (!signal.aborted) {
            console.error(`[IPC Listener] Ollama stream processing error for ${requestId}:`, Cause.pretty(finalExit.cause));
            const errorForIPC = extractErrorForIPC(Cause.squash(finalExit.cause));
            
            // Track stream error
            Effect.runPromise(Effect.gen(function*(_) {
              const telemetry = yield* _(TelemetryService);
              yield* _(telemetry.trackEvent({
                category: "ollama:ipc:stream",
                action: "stream_processing_error",
                label: streamingRequest.model || "unknown_model",
                value: requestId,
                context: { chunks: chunkCounter[requestId], error: errorForIPC.message }
              }));
            }).pipe(Effect.provide(ollamaServiceLayer), Effect.ignoreLogged));
            
            event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
          } else {
            console.log(`[IPC Listener] Stream ${requestId} processing aborted, error not sent:`, Cause.pretty(finalExit.cause));
            
            // Track aborted stream with error
            Effect.runPromise(Effect.gen(function*(_) {
              const telemetry = yield* _(TelemetryService);
              yield* _(telemetry.trackEvent({
                category: "ollama:ipc:stream",
                action: "stream_aborted_with_error",
                label: streamingRequest.model || "unknown_model",
                value: requestId,
                context: { chunks: chunkCounter[requestId] }
              }));
            }).pipe(Effect.provide(ollamaServiceLayer), Effect.ignoreLogged));
          }
        }
      } catch (initialProgramError) { // Catch synchronous errors from runPromiseExit or other setup
        console.error(`[IPC Listener] Critical error during stream setup/run for requestId: ${requestId}`, initialProgramError);
        const errorForIPC = extractErrorForIPC(initialProgramError);
        event.sender.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, requestId, errorForIPC);
      } finally {
        console.log(`[IPC Listener] Cleaning up activeStream for requestId: ${requestId}`);
        activeStreams.delete(requestId);
        delete chunkCounter[requestId]; // Clean up the chunk counter
      }
    });
    console.log(`[IPC Setup] Listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL} registered successfully.`);

    // Stream cancellation handler
    console.log(`[IPC Setup] Registering listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel...`);
    ipcMain.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, (_, requestId) => {
      console.log(`[IPC Listener] Received cancel request for stream: ${requestId}`);
      if (activeStreams.has(requestId)) {
        console.log(`[IPC Listener] Cancelling stream ${requestId}`);
        activeStreams.get(requestId)?.();
        activeStreams.delete(requestId);
      } else {
        console.log(`[IPC Listener] Cannot cancel: stream ${requestId} not found in active streams.`);
      }
    });
    console.log(`[IPC Setup] Listener for ${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel registered successfully.`);
    
    console.log("[IPC Setup] All Ollama event listeners registered successfully.");
    
    // Mark that we've successfully registered the listeners to avoid duplicates
    (global as any).__ollamaEventListenersRegistered = true;
  } catch (e) {
    console.error("[IPC Setup] ERROR: Failed to register Ollama event listeners:", e);
    console.error("[IPC Setup] Details:", e instanceof Error ? e.stack : String(e));
    
    // Register a very basic fallback handler for the status check
    // This ensures that even if the full registration fails,
    // the renderer process won't get a "No handler registered" error
    try {
      if (!ipcMain.listenerCount(OLLAMA_STATUS_CHECK)) {
        console.log("[IPC Setup] Registering emergency fallback handler for status check");
        ipcMain.handle(OLLAMA_STATUS_CHECK, async () => {
          console.log("[IPC Handler] Using emergency fallback handler for status check");
          return false; // Always report as not connected
        });
        console.log("[IPC Setup] Emergency fallback handler registered");
      }
    } catch (fallbackError) {
      console.error("[IPC Setup] Critical failure - could not even register fallback handler:", fallbackError);
    }
  }
}