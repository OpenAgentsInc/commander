console.log("[ollama-listeners.ts] Module loading - TOP");

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

console.log("[ollama-listeners.ts] Imports resolved.");

// Create a combined layer for the Ollama service with all dependencies
let ollamaServiceLayer: Layer.Layer<IOllamaService, never, never>;
try {
  console.log("[ollama-listeners.ts] About to define ollamaServiceLayer.");
  ollamaServiceLayer = Layer.provide(
    OllamaServiceLive,
    Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer)
  );
  console.log("[ollama-listeners.ts] ollamaServiceLayer DEFINED SUCCESSFULLY.");
} catch (e) {
  console.error("[ollama-listeners.ts] CRITICAL ERROR DEFINING ollamaServiceLayer:", e);
  throw e;
}

console.log("[ollama-listeners.ts] ollamaServiceLayer variable is set.");

export function addOllamaEventListeners() {
  console.log("[ollama-listeners.ts] addOllamaEventListeners() function CALLED.");
  try {
    console.log(`[ollama-listeners.ts] About to call ipcMain.handle for channel: ${OLLAMA_CHAT_COMPLETION_CHANNEL}`);
    ipcMain.handle(OLLAMA_CHAT_COMPLETION_CHANNEL, async (_, request) => {
      console.log(`[ollama-listeners.ts] IPC HANDLER for ${OLLAMA_CHAT_COMPLETION_CHANNEL} INVOKED with request:`, request);

      // Ensure ollamaServiceLayer was defined
      if (!ollamaServiceLayer) {
        console.error("[ollama-listeners.ts] IPC HANDLER ERROR: ollamaServiceLayer is not defined!");
        return { __error: true, message: "Service layer not initialized" };
      }

      const program = Effect.gen(function*(_) {
        const ollamaService = yield* _(OllamaService);
        return yield* _(ollamaService.generateChatCompletion(request));
      }).pipe(
        Effect.provide(ollamaServiceLayer)
      );

      try {
        console.log(`[ollama-listeners.ts] IPC HANDLER: Running Effect program for ${OLLAMA_CHAT_COMPLETION_CHANNEL}`);
        const result = await Effect.runPromise(program);
        console.log(`[ollama-listeners.ts] IPC HANDLER: Effect program SUCCEEDED for ${OLLAMA_CHAT_COMPLETION_CHANNEL}`);
        return result;
      } catch (error) {
        console.error(`[ollama-listeners.ts] IPC HANDLER: Effect program FAILED for ${OLLAMA_CHAT_COMPLETION_CHANNEL}`, error);
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
    console.log(`[ollama-listeners.ts] ipcMain.handle for ${OLLAMA_CHAT_COMPLETION_CHANNEL} REGISTERED SUCCESSFULLY.`);
  } catch (e) {
    console.error(`[ollama-listeners.ts] CRITICAL ERROR in addOllamaEventListeners trying to register handler for ${OLLAMA_CHAT_COMPLETION_CHANNEL}:`, e);
  }
}
console.log("[ollama-listeners.ts] Module loaded - BOTTOM");