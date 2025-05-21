// src/services/runtime.ts
// Import from consolidated Effect library for main types
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Runtime from "effect/Runtime";
import * as _Context from "effect/Context";
import * as RuntimeFlags from "effect/RuntimeFlags";
import * as FiberRefs from "effect/FiberRefs";
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
import { Kind5050DVMService, Kind5050DVMServiceLive, DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm';

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
  Kind5050DVMService |
  HttpClient.HttpClient;

// Runtime instance - will be initialized asynchronously
let mainRuntimeInstance: Runtime.Runtime<FullAppContext>;

// We're directly using the browser HTTP client layer

// Compose individual services with their direct dependencies
const nostrLayer = NostrServiceLive.pipe(Layer.provide(DefaultNostrServiceConfigLayer));
const telemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
const ollamaLayer = OllamaServiceLive.pipe(
  Layer.provide(Layer.merge(UiOllamaConfigLive, BrowserHttpClient.layerXMLHttpRequest))
);
const nip04Layer = NIP04ServiceLive;
const nip28Layer = NIP28ServiceLive.pipe(
  Layer.provide(Layer.merge(Layer.merge(nostrLayer, nip04Layer), telemetryLayer)) // Added telemetryLayer
);
const sparkLayer = SparkServiceLive.pipe(
  Layer.provide(Layer.merge(DefaultSparkServiceConfigLayer, telemetryLayer))
);
const nip90Layer = NIP90ServiceLive.pipe(
  Layer.provide(Layer.merge(Layer.merge(nostrLayer, nip04Layer), telemetryLayer))
);

const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
  Layer.provide(
    Layer.merge(DefaultKind5050DVMServiceConfigLayer,
      Layer.merge(nostrLayer,
        Layer.merge(ollamaLayer,
          Layer.merge(sparkLayer,
            Layer.merge(nip04Layer, telemetryLayer)
          )
        )
      )
    )
  )
);

// Full application layer - compose services incrementally using merge
const FullAppLayer = Layer.merge(
  nostrLayer,
  Layer.merge(
    nip04Layer,
    Layer.merge(
      NIP19ServiceLive,
      Layer.merge(
        BIP39ServiceLive,
        Layer.merge(
          BIP32ServiceLive,
          Layer.merge(
            telemetryLayer,
            Layer.merge(
              nip28Layer,
              Layer.merge(
                ollamaLayer,
                Layer.merge(
                  sparkLayer,
                  Layer.merge(
                    nip90Layer,
                    Layer.merge(
                      kind5050DVMLayer,
                      BrowserHttpClient.layerXMLHttpRequest
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
);

// Asynchronous function to initialize the runtime
async function buildRuntimeAsync<ROut, E = any>(layer: Layer.Layer<ROut, E, never>): Promise<Runtime.Runtime<ROut>> {
  const runtimeContext = await Effect.runPromise(Layer.toRuntime(layer).pipe(Effect.scoped));
  return Runtime.make(runtimeContext);
}

// Function to initialize the main runtime, must be called at application startup
export const initializeMainRuntime = async (): Promise<void> => {
  try {
    console.log("Creating a production-ready Effect runtime for renderer...");
    mainRuntimeInstance = await buildRuntimeAsync(FullAppLayer as Layer.Layer<FullAppContext, any, never>);
    console.log("Production-ready Effect runtime for renderer created successfully.");
  } catch (e: unknown) {
    console.error("CRITICAL: Failed to create Effect runtime for renderer:", e);
    console.log("Creating fallback runtime for renderer...");

    // Fallback runtime with minimal services (e.g., only Telemetry)
    const MinimalLayer = Layer.merge(
      TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer)),
      BrowserHttpClient.layerXMLHttpRequest
      // Add other essential, synchronously initializable services if needed for fallback
    );
    // Fallback creation must be synchronous if the app structure depends on immediate availability
    // However, the error was from runSync, so the async buildRuntimeAsync has a better chance.
    // If even async build fails, this is a last resort.
    try {
        mainRuntimeInstance = await buildRuntimeAsync(MinimalLayer as Layer.Layer<FullAppContext, any, never>);
    } catch (fallbackError) {
        console.error("CRITICAL: Failed to create even the fallback runtime with MinimalLayer:", fallbackError);

        // As an absolute last resort, create a runtime with only TelemetryService,
        // built synchronously if possible, or an empty context if even that fails.
        try {
            console.warn("Attempting emergency synchronous TelemetryService-only runtime.");
            const emergencyTelemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
            // Provide a minimal context satisfying FullAppContext, even if most services are NoOp or missing.
            // This cast is risky but is a last-ditch effort.
            const emergencyContext = Effect.runSync(Layer.toRuntime(emergencyTelemetryLayer as Layer.Layer<FullAppContext, any, never>).pipe(Effect.scoped));
            mainRuntimeInstance = Runtime.make(emergencyContext);
            console.error("CRITICAL: Using an emergency runtime with ONLY TelemetryService. Most services will be unavailable.");
        } catch (emergencyError) {
            console.error("CRITICAL: Failed to create emergency TelemetryService-only runtime. Creating empty context runtime.", emergencyError);
            // Create a minimal TelemetryService for the fallback
            const minimalTelemetryService = TelemetryService.of({
              trackEvent: () => Effect.succeed(undefined),
              isEnabled: () => Effect.succeed(false),
              setEnabled: () => Effect.succeed(undefined)
            });
            
            // Create a context with at least the TelemetryService
            const minimalServiceContext = _Context.make(TelemetryService, minimalTelemetryService);
            
            // Create a runtime with this minimal context
            mainRuntimeInstance = Runtime.make({
              context: minimalServiceContext as unknown as _Context.Context<FullAppContext>,
              runtimeFlags: RuntimeFlags.make(),
              fiberRefs: FiberRefs.empty()
            });
            console.error("CRITICAL: Using an absolutely minimal runtime. Most services will be unavailable.");
        }
    }
    console.log("Fallback runtime created with minimal functionality. Some services may be unavailable.");
  }
};

// Getter for the initialized runtime
export const getMainRuntime = (): Runtime.Runtime<FullAppContext> => {
  if (!mainRuntimeInstance) {
    // This state should ideally be prevented by awaiting initializeMainRuntime at app start.
    // If it occurs, it's a critical error in the app's startup sequence.
    console.error("CRITICAL: getMainRuntime() called before initializeMainRuntime() completed. Using a temporary emergency runtime.");
    // Create an emergency synchronous fallback if called too early.
    // This is a safety net but indicates a logic flaw in startup.
    const emergencyLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
    const emergencyContext = Effect.runSync(Layer.toRuntime(emergencyLayer as Layer.Layer<FullAppContext, any, never>).pipe(Effect.scoped));
    return Runtime.make(emergencyContext);
  }
  return mainRuntimeInstance;
};