// src/helpers/ipc/claude_code/claude-code-listeners.ts
import { ipcMain } from "electron";
import { Effect, Stream, Layer } from "effect";
import { claudeCodeChannels } from "./claude-code-channels";
import { ClaudeCodeService, ClaudeCodeServiceLive, type ClaudeExecParams } from "@/services/ai/providers/claude_code";
import { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";
import { AiProviderError } from "@/services/ai/core/AIError";

// Track active Claude streams for cancellation
const activeClaudeStreams = new Map<string, AbortController>();

// Interface for IPC error object
interface IpcErrorObject {
  __error: true;
  name: string;
  message: string;
  stack?: string;
  _tag?: string;
  cause?: any;
}

// Helper function to extract error details suitable for IPC
function extractErrorForIPC(error: any): IpcErrorObject {
  const details: IpcErrorObject = {
    __error: true,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  };

  if (error instanceof Error && error.stack) {
    details.stack = error.stack;
  }

  if (error && typeof error === "object") {
    if ("_tag" in error) {
      details._tag = (error as any)._tag;
    }
    if ("cause" in error && error.cause) {
      details.cause = String(error.cause);
    }
  }

  return details;
}

export function addClaudeCodeEventListeners() {
  // Flag to track if we've already registered these handlers
  if ((global as any).__claudeCodeEventListenersRegistered) {
    console.log("[IPC Setup] Claude Code event listeners already registered, skipping...");
    return;
  }

  console.log("[IPC Setup] Beginning Claude Code event listeners registration...");

  // Create layers for the Claude Code service in main process
  let claudeCodeServiceLayer: Layer.Layer<ClaudeCodeService, any, never>;
  let ipcHandlerLayer: Layer.Layer<ClaudeCodeService | TelemetryService | ConfigurationService, any, never>;

  try {
    // Create telemetry layer
    const configuredTelemetryLayer = TelemetryServiceLive.pipe(
      Layer.provide(DefaultTelemetryConfigLayer),
    );

    // Create configuration layer
    const configLayer = ConfigurationServiceLive.pipe(
      Layer.provide(configuredTelemetryLayer),
    );
    const devConfigLayer = DefaultDevConfigLayer.pipe(Layer.provide(configLayer));

    // Create Claude Code service layer with dependencies
    claudeCodeServiceLayer = ClaudeCodeServiceLive.pipe(
      Layer.provide(Layer.mergeAll(devConfigLayer, configuredTelemetryLayer)),
    );

    // Create comprehensive layer for IPC handlers
    ipcHandlerLayer = Layer.mergeAll(
      claudeCodeServiceLayer,
      configuredTelemetryLayer,
      devConfigLayer,
    );

    console.log("[IPC Setup] Claude Code service layer defined successfully.");
  } catch (e) {
    console.error("[IPC Setup] CRITICAL ERROR: Failed to define Claude Code service layer:", e);
    // Create fallback layer
    claudeCodeServiceLayer = Layer.succeed(ClaudeCodeService, {
      executeCommand: () => Effect.fail(new AiProviderError({ message: "Claude Code service not properly initialized", provider: "ClaudeCode", isRetryable: false })),
      streamCommand: () => Stream.fail(new AiProviderError({ message: "Claude Code service not properly initialized", provider: "ClaudeCode", isRetryable: false })),
    });
    ipcHandlerLayer = Layer.mergeAll(
      claudeCodeServiceLayer, 
      TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer)),
      ConfigurationServiceLive.pipe(Layer.provide(TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer))))
    );
    console.log("[IPC Setup] Created fallback Claude Code service layer");
  }

  try {
    // Non-streaming chat completion handler
    console.log(`[IPC Setup] Registering handler for ${claudeCodeChannels.chatCompletion}...`);
    ipcMain.handle(claudeCodeChannels.chatCompletion, async (_, cliParams: ClaudeExecParams) => {
      console.log("[IPC Handler] Received request for Claude Code chat completion");

      if (!claudeCodeServiceLayer) {
        console.error("[IPC Handler] CRITICAL ERROR: claudeCodeServiceLayer is not defined!");
        return { __error: true, message: "Service layer not initialized" };
      }

      const program = Effect.gen(function*(_) {
        const claudeService = yield* _(ClaudeCodeService);
        const telemetry = yield* _(TelemetryService);

        yield* _(telemetry.trackEvent({
          category: "claude_code:ipc",
          action: "chat_completion_request",
          label: cliParams?.outputFormat || "unknown"
        }));

        const result = yield* _(claudeService.executeCommand(cliParams));

        yield* _(telemetry.trackEvent({
          category: "claude_code:ipc", 
          action: "chat_completion_success"
        }));

        return result;
      });

      try {
        const result = await Effect.runPromise(Effect.provide(program, ipcHandlerLayer));
        console.log("[IPC Handler] Claude Code chat completion generated successfully");
        return result;
      } catch (error) {
        console.error("[IPC Handler] Claude Code API call failed:", error);
        return extractErrorForIPC(error);
      }
    });
    console.log(`[IPC Setup] Handler for ${claudeCodeChannels.chatCompletion} registered successfully.`);

    // Streaming chat handler
    console.log(`[IPC Setup] Registering listener for ${claudeCodeChannels.chatStream}...`);
    ipcMain.on(claudeCodeChannels.chatStream, (event, requestId: string, cliParams: ClaudeExecParams) => {
      console.log(`[IPC Listener] Received streaming request ${requestId} for Claude Code`);

      if (!claudeCodeServiceLayer) {
        console.error("[IPC Listener] CRITICAL ERROR: claudeCodeServiceLayer is not defined!");
        event.sender.send(`${claudeCodeChannels.chatStream}:error`, requestId, {
          __error: true,
          message: "Service layer not initialized",
        });
        return;
      }

      const abortController = new AbortController();
      activeClaudeStreams.set(requestId, abortController);

      const program = Effect.gen(function*(_) {
        const claudeService = yield* _(ClaudeCodeService);
        const telemetry = yield* _(TelemetryService);

        yield* _(telemetry.trackEvent({
          category: "claude_code:ipc:stream",
          action: "stream_request_start", 
          label: requestId
        }));

        const claudeStream = claudeService.streamCommand({ ...cliParams, outputFormat: 'stream-json' });

        // Drain the Effect Stream and send chunks over IPC
        yield* _(Stream.runForEach(claudeStream, (chunk: string) => {
          if (event.sender.isDestroyed() || abortController.signal.aborted) {
            return Effect.interrupt;
          }
          event.sender.send(`${claudeCodeChannels.chatStream}:chunk`, requestId, chunk);
          return Effect.void;
        }));
      });

      Effect.runPromise(Effect.provide(program, ipcHandlerLayer))
        .then(() => {
          if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
            console.log(`[IPC Listener] Claude Code stream ${requestId} completed successfully`);
            Effect.runPromise(
              Effect.gen(function*(_) {
                const telemetry = yield* _(TelemetryService);
                yield* _(telemetry.trackEvent({
                  category: "claude_code:ipc:stream",
                  action: "stream_complete_success",
                  label: requestId
                }));
              }).pipe(Effect.provide(ipcHandlerLayer), Effect.ignoreLogged)
            );
            event.sender.send(`${claudeCodeChannels.chatStream}:done`, requestId);
          }
        })
        .catch((error) => {
          console.error(`[IPC Listener] Claude Code stream processing error for ${requestId}:`, error);
          if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
            Effect.runPromise(
              Effect.gen(function*(_) {
                const telemetry = yield* _(TelemetryService);
                yield* _(telemetry.trackEvent({
                  category: "claude_code:ipc:stream",
                  action: "stream_processing_error",
                  label: requestId,
                  value: (error as Error).message
                }));
              }).pipe(Effect.provide(ipcHandlerLayer), Effect.ignoreLogged)
            );
            event.sender.send(`${claudeCodeChannels.chatStream}:error`, requestId, extractErrorForIPC(error));
          }
        })
        .finally(() => {
          activeClaudeStreams.delete(requestId);
        });
    });
    console.log(`[IPC Setup] Listener for ${claudeCodeChannels.chatStream} registered successfully.`);

    // Stream cancellation handler
    console.log(`[IPC Setup] Registering listener for ${claudeCodeChannels.chatStream}:cancel...`);
    ipcMain.on(`${claudeCodeChannels.chatStream}:cancel`, (_, requestId: string) => {
      console.log(`[IPC Listener] Received cancel request for Claude Code stream: ${requestId}`);
      const controller = activeClaudeStreams.get(requestId);
      if (controller) {
        console.log(`[IPC Listener] Cancelling Claude Code stream ${requestId}`);
        controller.abort();
        activeClaudeStreams.delete(requestId);

        Effect.runPromise(
          Effect.gen(function*(_) {
            const telemetry = yield* _(TelemetryService);
            yield* _(telemetry.trackEvent({
              category: "claude_code:ipc:stream",
              action: "stream_cancelled",
              label: requestId
            }));
          }).pipe(Effect.provide(ipcHandlerLayer), Effect.ignoreLogged)
        );
      } else {
        console.log(`[IPC Listener] Cannot cancel: Claude Code stream ${requestId} not found in active streams.`);
      }
    });
    console.log(`[IPC Setup] Listener for ${claudeCodeChannels.chatStream}:cancel registered successfully.`);

    console.log("[IPC Setup] All Claude Code event listeners registered successfully.");

    // Mark that we've successfully registered the listeners
    (global as any).__claudeCodeEventListenersRegistered = true;
  } catch (e) {
    console.error("[IPC Setup] ERROR: Failed to register Claude Code event listeners:", e);
    console.error("[IPC Setup] Details:", e instanceof Error ? e.stack : String(e));
  }
}