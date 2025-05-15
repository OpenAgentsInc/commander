import { ipcMain } from "electron";
import { Effect, Layer } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { OLLAMA_CHAT_COMPLETION_CHANNEL } from "./ollama-channels";
import { 
  OllamaService,
  OllamaServiceConfigTag,
  UiOllamaConfigLive
} from "../../../services/ollama/OllamaService";
import { OllamaServiceLive } from "../../../services/ollama/OllamaServiceImpl";

// Create a combined layer for the Ollama service with all dependencies
const ollamaServiceLayer = Layer.provide(
  OllamaServiceLive,
  Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer)
);

export function addOllamaEventListeners() {
  ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
    const program = Effect.gen(function*(_) {
      const ollamaService = yield* _(OllamaService);
      return yield* _(ollamaService.generateChatCompletion(request));
    }).pipe(
      Effect.provide(ollamaServiceLayer)
    );

    try {
      return await Effect.runPromise(program);
    } catch (error) {
      // Return the error in a format that can be serialized for IPC
      // This preserves error information while allowing it to cross the IPC boundary
      if (error instanceof Error) {
        return {
          __error: true,
          name: error.name,
          message: error.message,
          stack: error.stack,
          // Add any custom properties that might be present on our custom error types
          ...(error as any)._tag && { _tag: (error as any)._tag }
        };
      }
      // For non-Error objects
      return {
        __error: true,
        message: String(error)
      };
    }
  });
}