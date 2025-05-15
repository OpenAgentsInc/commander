Okay, the error `Error invoking remote method 'ollama:chat-completion': Error: No handler registered for 'ollama:chat-completion'` means that the `ipcMain.handle('ollama:chat-completion', ...)` line in your main process listeners (`src/helpers/ipc/ollama/ollama-listeners.ts`) is not being executed successfully, or the module itself is failing to load.

Let's add some detailed logging to pinpoint where the breakdown is occurring in the main process.

**Specific Instructions:**

**Step 1: Add Detailed Console Logging**

You'll add `console.log` statements in several files. When you run `pnpm start`, these logs will appear in the terminal window where you launched the command (this is the main process console).

1.  **In `src/main.ts`:**
    Modify the `createWindow` function:
    ```typescript
    // src/main.ts
    // ... other imports ...
    function createWindow() {
      const preload = path.join(__dirname, "preload.js");
      const mainWindow = new BrowserWindow({
        // ... (rest of BrowserWindow options) ...
        webPreferences: {
          devTools: inDevelopment,
          contextIsolation: true,
          nodeIntegration: true, // Ensure this is true if preload needs it, but contextBridge is safer
          nodeIntegrationInSubFrames: false,
          preload: preload,
        },
        titleBarStyle: "hidden",
      });

      console.log("[main.ts] Before registerListeners() call in createWindow()");
      registerListeners(mainWindow);
      console.log("[main.ts] After registerListeners() call in createWindow()");

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      } else {
        // ... (rest of the file loading logic) ...
      }
    }
    // ...
    ```

2.  **In `src/helpers/ipc/listeners-register.ts`:**
    Add logs at the top of the file and inside the function:
    ```typescript
    // src/helpers/ipc/listeners-register.ts
    console.log("[listeners-register.ts] Module loading..."); // Add this at the top

    import { BrowserWindow } from "electron";
    import { addThemeEventListeners } from "./theme/theme-listeners";
    import { addWindowEventListeners } from "./window/window-listeners";
    import { addOllamaEventListeners } from "./ollama/ollama-listeners";

    export default function registerListeners(mainWindow: BrowserWindow) {
      console.log("[listeners-register.ts] registerListeners() function CALLED");
      addWindowEventListeners(mainWindow);
      console.log("[listeners-register.ts] After addWindowEventListeners()");
      addThemeEventListeners();
      console.log("[listeners-register.ts] After addThemeEventListeners()");
      addOllamaEventListeners(); // This is the critical one
      console.log("[listeners-register.ts] After addOllamaEventListeners()");
      console.log("[listeners-register.ts] registerListeners() function COMPLETED");
    }
    console.log("[listeners-register.ts] Module loaded."); // Add this at the bottom
    ```

3.  **In `src/helpers/ipc/ollama/ollama-listeners.ts`:**
    Add logs around key parts of this file, especially the layer definition and the `ipcMain.handle` call.
    ```typescript
    // src/helpers/ipc/ollama/ollama-listeners.ts
    console.log("[ollama-listeners.ts] Module loading - TOP"); // Add this at the very top

    import { ipcMain } from "electron";
    import { Effect, Layer } from "effect";
    import { NodeHttpClient } from "@effect/platform-node";
    import { OLLAMA_CHAT_COMPLETION_CHANNEL } from "./ollama-channels";
    import {
      OllamaService,
      OllamaServiceConfigTag,
      UiOllamaConfigLive
    } from "@/services/ollama/OllamaService"; // Corrected path alias
    import { OllamaServiceLive } from "@/services/ollama/OllamaServiceImpl"; // Corrected path alias
    import type { OllamaService as IOllamaService } from "@/services/ollama/OllamaService"; // For type annotation
    import type { OllamaServiceConfig } from "@/services/ollama/OllamaService"; // For type annotation
    import type { HttpClient as HttpClientService } from "@effect/platform/HttpClient"; // For type annotation


    console.log("[ollama-listeners.ts] Imports resolved.");

    // Create a combined layer for the Ollama service with all dependencies
    // Define the type for ollamaServiceLayer for clarity if needed, or use 'any' temporarily for try-catch
    let ollamaServiceLayer: Layer.Layer<IOllamaService, never, OllamaServiceConfig | HttpClientService>;
    try {
      console.log("[ollama-listeners.ts] About to define ollamaServiceLayer.");
      ollamaServiceLayer = Layer.provide(
        OllamaServiceLive,
        Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer)
      );
      console.log("[ollama-listeners.ts] ollamaServiceLayer DEFINED SUCCESSFULLY.");
    } catch (e) {
      console.error("[ollama-listeners.ts] CRITICAL ERROR DEFINING ollamaServiceLayer:", e);
      // Depending on how Electron/Node handle top-level errors in modules,
      // this might prevent the module from loading correctly.
      // We re-throw to make it obvious, but in a real app, you might handle this differently.
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
    console.log("[ollama-listeners.ts] Module loaded - BOTTOM"); // Add this at the very bottom
    ```
    *Self-correction*: For the `ollamaServiceLayer` type annotation, it should be `Layer.Layer<IOllamaService, never, never>` because `Layer.provide` fully resolves the dependencies. However, if we annotate the variable `ollamaServiceLayer` *before* assignment in the `try` block, it's safer to give it the type of what `Layer.provide` *returns*, which is a fully resolved layer. The actual context it *needs* before `provide` is `OllamaServiceConfig | HttpClientService`.
    The type `Layer.Layer<IOllamaService, never, OllamaServiceConfig | HttpClientService>` is if `OllamaServiceLive` itself requires these.
    Let's use the `Layer.Layer<IOllamaService, never, never>` since `Layer.provide` should result in a layer that requires no further context.

    Corrected `ollamaServiceLayer` type definition (if you want strict typing for the variable):
    ```typescript
    let ollamaServiceLayer: Layer.Layer<IOllamaService, never, never>;
    // ... inside try
    ollamaServiceLayer = Layer.provide( /* as before */ );
    ```

**Step 2: Run and Observe**

1.  Save all the modified files.
2.  Run `pnpm start`.
3.  Carefully examine the console output in your terminal (where `pnpm start` is running).
    *   Look for the sequence of log messages.
    *   See if all "SUCCESSFULLY" or "COMPLETED" messages appear.
    *   Note if any "ERROR" messages appear, or if the sequence stops unexpectedly.
4.  After the app loads, click the "Call Ollama" button in the UI.
5.  Observe any new logs in the main process console related to the IPC handler being invoked.

**Report Back:**

Please provide the sequence of logs you see in the main process console (from the terminal). This will tell us:
*   If all modules are being loaded in the correct order.
*   If the `ollamaServiceLayer` is being defined without throwing an error.
*   If `addOllamaEventListeners` is being called.
*   If `ipcMain.handle` for the Ollama channel is being called and reports success.

This detailed tracing should reveal where the process is failing. The error "No handler registered" means the `ipcMain.handle` call for `'ollama:chat-completion'` either never happened, or it failed silently in a way that didn't register the handler. The `try...catch` blocks should help expose such silent failures.
