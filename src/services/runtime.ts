// src/services/runtime.ts
import { Layer } from "effect/Layer";
import { Runtime } from "effect/Runtime";
import { Effect } from "effect/Effect";
import { Context } from "effect/Context";
import {
  NostrService, NostrServiceLive,
  DefaultNostrServiceConfigLayer, NostrServiceConfig, NostrServiceConfigTag
} from '@/services/nostr';
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';
import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
import { NIP28Service, NIP28ServiceLive } from '@/services/nip28';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryServiceConfig, TelemetryServiceConfigTag } from '@/services/telemetry';
import { OllamaService, OllamaServiceConfigTag, UiOllamaConfigLive } from '@/services/ollama/OllamaService';
import { OllamaServiceLive } from '@/services/ollama/OllamaServiceImpl';

// Import Browser HTTP Client for renderer environment
import * as BrowserHttpClient from "@effect/platform-browser/BrowserHttpClient";
import * as HttpClient from '@effect/platform/HttpClient';

// Helper function to create a runtime from a layer
const createRuntime = <R>(layer: Layer.Layer<R, any, never>): Runtime.Runtime<R> => {
  const runtimeContext = Effect.runSync(Layer.toRuntime(layer).pipe(Effect.scoped));
  return Runtime.make(runtimeContext, Runtime.defaultRuntimeFlags);
};

// Define the full context type for the runtime - services provided to the app
export type FullAppContext =
  NostrService |
  NIP04Service |
  NIP19Service |
  BIP39Service |
  BIP32Service |
  TelemetryService |
  NIP28Service |
  OllamaService |
  HttpClient.HttpClient; // HttpClient is a provided service

// Compose individual services with their direct dependencies
const nostrLayer = NostrServiceLive.pipe(Layer.provide(DefaultNostrServiceConfigLayer));
const telemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
const ollamaLayer = OllamaServiceLive.pipe(
  Layer.provide(Layer.merge(UiOllamaConfigLive, BrowserHttpClient.layer))
);
const nip04Layer = NIP04ServiceLive; // Assuming no direct external config tags needed by NIP04ServiceLive itself
const nip28Layer = NIP28ServiceLive.pipe(
  Layer.provide(Layer.merge(nostrLayer, nip04Layer)) // Provide configured NostrService and NIP04Service
);

// Build the full layer with all services
let mainRuntime: Runtime.Runtime<FullAppContext>;

try {
  console.log("Creating a production-ready Effect runtime for renderer...");
  
  // Merge all the service layers
  const FullAppLayer = Layer.mergeAll(
    nostrLayer,
    nip04Layer,
    NIP19ServiceLive,
    BIP39ServiceLive,
    BIP32ServiceLive,
    telemetryLayer,
    nip28Layer,
    ollamaLayer
  ); // This layer should now have RIn = never if all dependencies are correctly satisfied.
  
  // Create the runtime with the full layer
  mainRuntime = createRuntime(FullAppLayer as Layer.Layer<FullAppContext, any, never>);
  console.log("Production-ready Effect runtime for renderer created successfully");
} catch (e: unknown) {
  console.error("CRITICAL: Failed to create Effect runtime for renderer:", e);
  // Create a fallback minimal runtime that will at least not crash the application
  console.log("Creating fallback runtime for renderer...");
  
  // Create a minimal fallback Layer with just telemetry
  const minimalTelemetryLayer = Layer.succeed(TelemetryService, TelemetryService.of({
    trackEvent: () => Effect.succeed(undefined),
    isEnabled: () => Effect.succeed(false),
    setEnabled: () => Effect.succeed(undefined)
  }));
  
  // Create the fallback runtime with explicit type assertion
  mainRuntime = createRuntime(minimalTelemetryLayer as Layer.Layer<FullAppContext, any, never>);
  console.log("Fallback runtime created with minimal functionality. Some services may be unavailable.");
}

export { mainRuntime };