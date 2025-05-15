import { ipcMain } from "electron";
import { Effect, Layer } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import { OLLAMA_CHAT_COMPLETION_CHANNEL } from "./ollama-channels";
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

export function addOllamaEventListeners() {
  try {
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
  } catch (e) {
    console.error(`Error registering handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL}:`, e);
  }
}