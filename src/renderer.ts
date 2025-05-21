// src/renderer.ts
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { initializeMainRuntime, getMainRuntime } from '@/services/runtime';
import { TelemetryService } from "@/services/telemetry";
import { Effect } from "effect";
import { runFork } from "effect/Effect";

async function startApp() {
  try {
    await initializeMainRuntime(); // Await the runtime initialization
    console.log("Main Effect runtime has been initialized in renderer via startApp.");

    // Optionally, log successful initialization using the now available runtime
    const runtime = getMainRuntime(); // This will now return the initialized runtime
    runFork(
      Effect.flatMap(TelemetryService, ts =>
        ts.trackEvent({ category: "spark:init", action: "renderer_runtime_fully_ready" })
      ).pipe(Effect.provide(runtime))
    );

    const rootElement = document.getElementById("app");
    if (rootElement) {
      const root = createRoot(rootElement);
      // Ensure App component and its children use getMainRuntime()
      root.render(
        React.createElement(React.StrictMode, null, React.createElement(App))
      );
    } else {
      // This is a critical failure if the app div is missing.
      console.error("CRITICAL: Root app element 'app' not found in index.html. React cannot render.");
      const body = document.querySelector("body");
      if (body) {
          body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Critical Error: Application cannot start. Root element missing.</div>`;
      }
    }

  } catch (initializationError) {
    // This catch block now handles the re-thrown error from initializeMainRuntime
    console.error("FATAL: Failed to initialize main Effect runtime. Application cannot start.", initializationError);

    const body = document.querySelector("body");
    if (body) {
      body.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #1a1a1a; color: #ffcccc; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; box-sizing: border-box; z-index: 9999; text-align: center;">
          <h1 style="font-size: 1.5em; color: #ff6666; margin-bottom: 15px;">Application Startup Failed</h1>
          <p style="font-size: 1em; margin-bottom: 10px;">A critical error occurred while initializing essential services, and the application cannot continue.</p>
          <p style="font-size: 0.9em; margin-bottom: 20px;">Please report this issue. More details can be found in the developer console (usually accessible via Ctrl+Shift+I or Cmd+Opt+I).</p>
          ${initializationError instanceof Error
            ? `<div style="background-color: #330000; border: 1px solid #660000; padding: 10px; border-radius: 4px; max-width: 80%; max-height: 50vh; overflow: auto; text-align: left;">
                 <h2 style="font-size: 1.1em; margin-bottom: 5px; color: #ff9999;">Error Details:</h2>
                 <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 0.8em;">${initializationError.stack || initializationError.message}</pre>
               </div>`
            : `<p style="font-size: 0.9em;">Details: ${String(initializationError)}</p>`
          }
        </div>
      `;
    }
    // Do NOT proceed to render the React app. The function will end here.
  }
}

// Start the application
startApp();