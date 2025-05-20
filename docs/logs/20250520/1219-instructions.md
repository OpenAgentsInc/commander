Okay, Agent, the primary issue is the `AsyncFiberException` caused by using `Effect.runSync` on an Effect program that requires asynchronous work during its layer construction, specifically due to `SparkWallet.initialize` in `SparkServiceImpl.ts`. This leads to the creation of a fallback runtime that's missing most services, causing the subsequent "Service not found" errors.

Here's the plan:

1.  **Modify `src/services/runtime.ts`**:
    *   Make the runtime initialization asynchronous.
    *   Create an `initializeMainRuntime` async function that builds the `FullAppLayer` and uses `Effect.runPromise` to create the runtime.
    *   Store the initialized runtime in the `mainRuntime` variable.
    *   Provide a getter `getMainRuntime()` for synchronous access once initialization is complete. This helps avoid modules caching an initially undefined `mainRuntime`.

2.  **Modify `src/renderer.ts`**:
    *   Call and `await` the new `initializeMainRuntime()` function *before* rendering the React application. This ensures the full runtime is available when React components mount and attempt to use services.

3.  **Update Service/Hook Usage**:
    *   Change all direct imports and usage of `mainRuntime` to use the `getMainRuntime()` getter function. This applies to files like `src/hooks/useNostrChannelChat.ts`, `src/components/nip90/*`, and `src/stores/panes/actions/*`.

Here are the instructions:

**Step 1: Modify `src/services/runtime.ts`**

Replace the content of `src/services/runtime.ts` with the following:

```typescript
// src/services/runtime.ts
import { Layer, toRuntime, provide as layerProvide, mergeAll as layerMergeAll, succeed as layerSucceed } from "effect/Layer";
import { Runtime, make as runtimeMake } from "effect/Runtime";
import { Effect, runSync, runPromise, succeed as effectSucceed, scoped as effectScoped, flatMap as effectFlatMap, provide as effectProvide, runFork } from "effect/Effect";
import { Context } from "effect/Context";
import {
  NostrService, NostrServiceLive,
  DefaultNostrServiceConfigLayer
} from '@/services/nostr';
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';
import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
import { NIP28Service, NIP28ServiceLive } from '@/services/nip28';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from '@/services/telemetry';
import { OllamaService, OllamaServiceLive, UiOllamaConfigLive } from '@/services/ollama';
import { BrowserHttpClient } from "@effect/platform-browser";
import { HttpClient } from '@effect/platform';
import { SparkService, SparkServiceLive, DefaultSparkServiceConfigLayer } from '@/services/spark';
import { NIP90Service, NIP90ServiceLive } from '@/services/nip90';

// Define the full context type for the runtime
export type FullAppContext =
  NostrService |
  NIP04Service |
  NIP19Service |
  BIP39Service |
  BIP32Service |
  TelemetryService |
  NIP28Service |
  OllamaService |
  SparkService |
  NIP90Service |
  HttpClient.HttpClient;

// Runtime instance - will be initialized asynchronously
let mainRuntimeInstance: Runtime<FullAppContext>;

// Compose individual services with their direct dependencies
const nostrLayer = NostrServiceLive.pipe(layerProvide(DefaultNostrServiceConfigLayer));
const telemetryLayer = TelemetryServiceLive.pipe(layerProvide(DefaultTelemetryConfigLayer));
const ollamaLayer = OllamaServiceLive.pipe(
  layerProvide(layerMergeAll(UiOllamaConfigLive, BrowserHttpClient.layerXMLHttpRequest))
);
const nip04Layer = NIP04ServiceLive;
const nip28Layer = NIP28ServiceLive.pipe(
  layerProvide(layerMergeAll(nostrLayer, nip04Layer, telemetryLayer)) // Added telemetryLayer
);
const sparkLayer = SparkServiceLive.pipe(
  layerProvide(layerMergeAll(DefaultSparkServiceConfigLayer, telemetryLayer))
);
const nip90Layer = NIP90ServiceLive.pipe(
  layerProvide(layerMergeAll(nostrLayer, nip04Layer, telemetryLayer))
);

// Full application layer
const FullAppLayer = layerMergeAll(
  nostrLayer,
  nip04Layer,
  NIP19ServiceLive,
  BIP39ServiceLive,
  BIP32ServiceLive,
  telemetryLayer,
  nip28Layer,
  ollamaLayer,
  sparkLayer,
  nip90Layer
);

// Asynchronous function to initialize the runtime
async function buildRuntimeAsync<ROut, E = any>(layer: Layer<ROut, E, never>): Promise<Runtime<ROut>> {
  const runtimeContext = await runPromise(toRuntime(layer).pipe(effectScoped));
  return runtimeMake(runtimeContext);
}

// Function to initialize the main runtime, must be called at application startup
export const initializeMainRuntime = async (): Promise<void> => {
  try {
    console.log("Creating a production-ready Effect runtime for renderer...");
    mainRuntimeInstance = await buildRuntimeAsync(FullAppLayer as Layer<FullAppContext, any, never>);
    console.log("Production-ready Effect runtime for renderer created successfully.");
  } catch (e: unknown) {
    console.error("CRITICAL: Failed to create Effect runtime for renderer:", e);
    console.log("Creating fallback runtime for renderer...");

    // Fallback runtime with minimal services (e.g., only Telemetry)
    const MinimalLayer = layerMergeAll(
      TelemetryServiceLive.pipe(layerProvide(DefaultTelemetryConfigLayer))
      // Add other essential, synchronously initializable services if needed for fallback
    );
    // Fallback creation must be synchronous if the app structure depends on immediate availability
    // However, the error was from runSync, so the async buildRuntimeAsync has a better chance.
    // If even async build fails, this is a last resort.
    try {
        mainRuntimeInstance = await buildRuntimeAsync(MinimalLayer as Layer<FullAppContext, any, never>);
    } catch (fallbackError) {
        console.error("CRITICAL: Failed to create even the fallback runtime:", fallbackError);
        // As an absolute last resort, create a runtime with no services.
        // This will likely lead to errors if services are expected.
        const emptyContext = Context.empty();
        mainRuntimeInstance = runtimeMake(emptyContext as Context.Context<FullAppContext>);
    }
    console.log("Fallback runtime created with minimal functionality. Some services may be unavailable.");
  }
};

// Getter for the initialized runtime
export const getMainRuntime = (): Runtime<FullAppContext> => {
  if (!mainRuntimeInstance) {
    // This state should ideally be prevented by awaiting initializeMainRuntime at app start.
    // If it occurs, it's a critical error in the app's startup sequence.
    console.error("CRITICAL: getMainRuntime() called before initializeMainRuntime() completed. Using a temporary emergency runtime.");
    // Create an emergency synchronous fallback if called too early.
    // This is a safety net but indicates a logic flaw in startup.
    const emergencyLayer = TelemetryServiceLive.pipe(layerProvide(DefaultTelemetryConfigLayer));
    const emergencyContext = runSync(toRuntime(emergencyLayer as Layer<FullAppContext, any, never>).pipe(effectScoped));
    return runtimeMake(emergencyContext);
  }
  return mainRuntimeInstance;
};
```

**Step 2: Modify `src/renderer.ts`**

Replace the content of `src/renderer.ts` with the following:

```typescript
// src/renderer.ts
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { initializeMainRuntime, getMainRuntime } from '@/services/runtime';
import { TelemetryService } from "@/services/telemetry";
import { Effect } from "effect";

async function startApp() {
  try {
    await initializeMainRuntime(); // Await the runtime initialization
    console.log("Main Effect runtime has been initialized in renderer via startApp.");

    // Optionally, log successful initialization using the now available runtime
    const runtime = getMainRuntime(); // This will now return the initialized runtime
    runFork(
      Effect.flatMap(TelemetryService, ts =>
        ts.trackEvent({ category: "spark:init", action: "renderer_runtime_fully_ready" })
      ).pipe(effectProvide(runtime))
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
```

**Step 3: Update Service/Hook Usage to `getMainRuntime()`**

You need to find all instances where `mainRuntime` is imported directly from `@/services/runtime` and change them to use the `getMainRuntime()` getter.

*   **File: `src/hooks/useNostrChannelChat.ts`**
    *   Change `import { mainRuntime } from '@/services/runtime';` to `import { getMainRuntime } from '@/services/runtime';`
    *   Change `const runtimeRef = useRef(mainRuntime);` to `const runtimeRef = useRef(getMainRuntime());`
    *   Ensure `rt` is correctly assigned from `runtimeRef.current` before use in `Effect.provide`.

*   **File: `src/components/nip90/Nip90EventList.tsx`**
    *   Change `import { mainRuntime } from '@/services/runtime';` to `import { getMainRuntime } from '@/services/runtime';`
    *   In `fetchNip90JobRequests` and `useNip19Encoding`'s `queryFn`, change `Effect.provide(program, mainRuntime)` to `Effect.provide(program, getMainRuntime())`.

*   **File: `src/components/nip90/Nip90RequestForm.tsx`**
    *   Change `import { mainRuntime } from '@/services/runtime';` to `import { getMainRuntime } from '@/services/runtime';`
    *   In `handlePublishRequest`, change `Effect.provide(programToRun, mainRuntime)` to `Effect.provide(programToRun, getMainRuntime())`.

*   **File: `src/pages/HomePageOld.tsx` (if still relevant)**
    *   Apply similar changes if `mainRuntime` is used.

*   **File: `src/stores/panes/actions/createNip28ChannelPane.ts`**
    *   Change `import { mainRuntime } from '@/services/runtime';` to `import { getMainRuntime } from '@/services/runtime';`
    *   Change `const rt = mainRuntime;` to `const rt = getMainRuntime();`
    *   Change `Effect.provide(createChannelEffect, mainRuntime)` to `Effect.provide(createChannelEffect, rt)`.

**Explanation of Changes:**

*   The `SparkServiceLive` layer uses `Layer.scoped` and its initialization involves an `async` operation (`SparkWallet.initialize`). When `Layer.toRuntime(...).pipe(Effect.scoped)` is run, it attempts to build all layers. If this entire process is wrapped in `Effect.runSync`, the asynchronous nature of `SparkWallet.initialize` causes the `AsyncFiberException`.
*   By making `initializeMainRuntime` an `async` function that uses `Effect.runPromise` for building the runtime context, we allow asynchronous operations during layer setup.
*   `renderer.ts` now `await`s this asynchronous initialization, ensuring that `mainRuntimeInstance` is set (either to the full runtime or a fallback) before React rendering begins.
*   Using `getMainRuntime()` ensures that any module accessing the runtime gets the instance that was set after initialization, rather than a potentially `undefined` value if they imported `mainRuntime` directly before it was asynchronously set.

After these changes, the "CRITICAL: Failed to create Effect runtime" error should be resolved, and the application should initialize with the full set of services. This, in turn, should fix the "Service not found" errors.
