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

  } catch (initializationError) {
    // initializeMainRuntime already logs and handles fallback creation.
    // This catch is for any unexpected error during the await itself.
    console.error("Error during startApp's initializeMainRuntime:", initializationError);
    // The app will proceed with whatever runtime (main or fallback) initializeMainRuntime managed to set.
  }

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
    // You might want to display an error message to the user directly in the DOM here.
    const body = document.querySelector("body");
    if (body) {
        body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Critical Error: Application cannot start. Root element missing.</div>`;
    }
  }
}

// Start the application
startApp();