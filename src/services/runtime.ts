// src/services/runtime.ts
import { Layer, toRuntime, provide as layerProvide, mergeAll as layerMergeAll, succeed as layerSucceed } from "effect/Layer";
import { Runtime, make as runtimeMake } from "effect/Runtime";
import { Effect, runSync, runPromise, succeed as effectSucceed, scoped as effectScoped, flatMap as effectFlatMap, provide as effectProvide, runFork } from "effect/Effect";
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

const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
  layerProvide(layerMergeAll(
    DefaultKind5050DVMServiceConfigLayer,
    nostrLayer,
    ollamaLayer,
    sparkLayer,
    telemetryLayer
  ))
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
  nip90Layer,
  kind5050DVMLayer
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
        console.error("CRITICAL: Failed to create even the fallback runtime with MinimalLayer:", fallbackError);

        // As an absolute last resort, create a runtime with only TelemetryService,
        // built synchronously if possible, or an empty context if even that fails.
        try {
            console.warn("Attempting emergency synchronous TelemetryService-only runtime.");
            const emergencyTelemetryLayer = TelemetryServiceLive.pipe(layerProvide(DefaultTelemetryConfigLayer));
            // Provide a minimal context satisfying FullAppContext, even if most services are NoOp or missing.
            // This cast is risky but is a last-ditch effort.
            const emergencyContext = runSync(toRuntime(emergencyTelemetryLayer as Layer<FullAppContext, any, never>).pipe(effectScoped));
            mainRuntimeInstance = runtimeMake(emergencyContext);
            console.error("CRITICAL: Using an emergency runtime with ONLY TelemetryService. Most services will be unavailable.");
        } catch (emergencyError) {
            console.error("CRITICAL: Failed to create emergency TelemetryService-only runtime. Creating empty context runtime.", emergencyError);
            // Create a minimal TelemetryService for the fallback
            const minimalTelemetryService = TelemetryService.of({
              trackEvent: () => effectSucceed(undefined),
              isEnabled: () => effectSucceed(false),
              setEnabled: () => effectSucceed(undefined)
            });
            
            // Create a context with at least the TelemetryService
            const minimalServiceContext = _Context.make(TelemetryService, minimalTelemetryService);
            
            // Create a runtime with this minimal context
            mainRuntimeInstance = runtimeMake({
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