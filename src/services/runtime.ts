// src/services/runtime.ts
// Import from consolidated Effect library for main types
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Runtime from "effect/Runtime";
import * as _Context from "effect/Context";
import * as RuntimeFlags from "effect/RuntimeFlags";
import * as FiberRefs from "effect/FiberRefs";
import {
  NostrService,
  NostrServiceLive,
  DefaultNostrServiceConfigLayer,
} from "@/services/nostr";
import { NIP04Service, NIP04ServiceLive } from "@/services/nip04";
import { NIP19Service, NIP19ServiceLive } from "@/services/nip19";
import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
import { BIP32Service, BIP32ServiceLive } from "@/services/bip32";
import { NIP28Service, NIP28ServiceLive } from "@/services/nip28";
import {
  TelemetryService,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
} from "@/services/telemetry";
import {
  OllamaService,
  OllamaServiceLive,
  UiOllamaConfigLive,
} from "@/services/ollama";
import { BrowserHttpClient } from "@effect/platform-browser";
import { HttpClient } from "@effect/platform";
import {
  SparkService,
  SparkServiceLive,
  DefaultSparkServiceConfigLayer,
} from "@/services/spark";
import { NIP90Service, NIP90ServiceLive } from "@/services/nip90";
import {
  Kind5050DVMService,
  Kind5050DVMServiceLive,
  DefaultKind5050DVMServiceConfigLayer,
} from "@/services/dvm";
import {
  ConfigurationService,
  ConfigurationServiceLive,
  DefaultDevConfigLayer,
} from "@/services/configuration";
import { OpenAIProvider, OllamaProvider } from "@/services/ai/providers";
import { AgentLanguageModel } from "@/services/ai/core";

// Define the full context type for the runtime
export type FullAppContext =
  | NostrService
  | NIP04Service
  | NIP19Service
  | BIP39Service
  | BIP32Service
  | TelemetryService
  | NIP28Service
  | OllamaService
  | SparkService
  | NIP90Service
  | Kind5050DVMService
  | HttpClient.HttpClient
  | ConfigurationService
  | AgentLanguageModel;

// Runtime instance - will be initialized asynchronously
let mainRuntimeInstance: Runtime.Runtime<FullAppContext>;

// Compose individual services with their direct dependencies
const telemetryLayer = TelemetryServiceLive.pipe(
  Layer.provide(DefaultTelemetryConfigLayer),
);
const configLayer = ConfigurationServiceLive.pipe(
  Layer.provide(telemetryLayer),
);
const devConfigLayer = DefaultDevConfigLayer.pipe(Layer.provide(configLayer));

const nostrLayer = NostrServiceLive.pipe(
  Layer.provide(DefaultNostrServiceConfigLayer),
  Layer.provide(telemetryLayer), // NostrService gets Telemetry
);
const ollamaLayer = OllamaServiceLive.pipe(
  Layer.provide(
    Layer.merge(UiOllamaConfigLive, BrowserHttpClient.layerXMLHttpRequest),
  ),
  Layer.provide(telemetryLayer), // OllamaService might also use telemetry
);
const nip04Layer = NIP04ServiceLive;
const nip28Layer = NIP28ServiceLive.pipe(
  Layer.provide(Layer.mergeAll(nostrLayer, nip04Layer, telemetryLayer)),
);
const sparkLayer = SparkServiceLive.pipe(
  Layer.provide(Layer.merge(DefaultSparkServiceConfigLayer, telemetryLayer)),
);
const nip90Layer = NIP90ServiceLive.pipe(
  Layer.provide(Layer.mergeAll(nostrLayer, nip04Layer, telemetryLayer)),
);

// AI service layers - Ollama provider
const ollamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
  Layer.provide(Layer.mergeAll(ollamaLayer, telemetryLayer)),
);

const ollamaLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ollamaAdapterLayer,
      devConfigLayer,
      telemetryLayer,
      BrowserHttpClient.layerXMLHttpRequest
    ),
  ),
);

// Must be updated to use AgentLanguageModel instead of OllamaService
// This layer setup depends on an AgentLanguageModel provider being available
const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      DefaultKind5050DVMServiceConfigLayer,
      nostrLayer,
      sparkLayer,
      nip04Layer,
      telemetryLayer,
      // Note: No longer depends directly on ollamaLayer
      // Instead will use whichever AgentLanguageModel is provided
    ),
  ),
);

// Full application layer - compose services incrementally using mergeAll
export const FullAppLayer = Layer.mergeAll(
  telemetryLayer, // Provides TelemetryService
  devConfigLayer, // Provides ConfigurationService with development defaults
  nostrLayer, // Provides NostrService (its Telemetry dep is met)
  nip04Layer,
  NIP19ServiceLive,
  BIP39ServiceLive,
  BIP32ServiceLive,
  nip28Layer,
  ollamaLayer,
  sparkLayer,
  nip90Layer,
  BrowserHttpClient.layerXMLHttpRequest, // Provides HttpClient
  ollamaLanguageModelLayer, // Provides AgentLanguageModel through Ollama
  kind5050DVMLayer,
);

// Asynchronous function to initialize the runtime
async function buildRuntimeAsync<ROut, E = any>(
  layer: Layer.Layer<ROut, E, never>,
): Promise<Runtime.Runtime<ROut>> {
  const runtimeContext = await Effect.runPromise(
    Layer.toRuntime(layer).pipe(Effect.scoped),
  );
  return Runtime.make(runtimeContext);
}

// Function to initialize the main runtime, must be called at application startup
export const initializeMainRuntime = async (): Promise<void> => {
  try {
    console.log("Creating a production-ready Effect runtime for renderer...");
    mainRuntimeInstance = await buildRuntimeAsync(
      FullAppLayer as Layer.Layer<FullAppContext, any, never>,
    );
    console.log(
      "Production-ready Effect runtime for renderer created successfully.",
    );
  } catch (e: unknown) {
    console.error("CRITICAL: Failed to create Effect runtime for renderer:", e);
    // Re-throw the error to be caught by the caller (e.g., startApp in renderer.ts)
    throw e;
  }
};

// Getter for the initialized runtime
export const getMainRuntime = (): Runtime.Runtime<FullAppContext> => {
  if (!mainRuntimeInstance) {
    // This state indicates a critical error: initializeMainRuntime() was not awaited or failed without being caught.
    // Throw an error to make this state highly visible, as the application is not correctly initialized.
    const errMessage =
      "CRITICAL: getMainRuntime() called before initializeMainRuntime() completed successfully. Application is in an unstable state.";
    console.error(errMessage);
    throw new Error(errMessage);
  }
  return mainRuntimeInstance;
};
