// src/services/runtime.ts
import { Layer, Runtime, Effect, Context } from 'effect';
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
import { BrowserHttpClient } from "@effect/platform-browser";
import { HttpClient } from '@effect/platform';

// Helper function to create a runtime from a layer
const createRuntime = <R>(layer: Layer.Layer<R, any, never>): Runtime.Runtime<R> => {
  const runtimeContext = Effect.runSync(Layer.toRuntime(layer).pipe(Effect.scoped));
  return Runtime.make(runtimeContext, Runtime.defaultRuntimeFlags);
};

// Define the full context type for the runtime
type FullAppContext =
  NostrService |
  NIP04Service |
  NIP19Service |
  BIP39Service |
  BIP32Service |
  TelemetryService |
  NIP28Service |
  NostrServiceConfig |
  TelemetryServiceConfig |
  OllamaService |
  HttpClient.HttpClient; // Add HttpClient to the context

// Build the full layer with all services
let mainRuntime: Runtime.Runtime<FullAppContext>;

try {
  console.log("Creating a production-ready Effect runtime for renderer...");
  
  // Merge all the service layers
  const FullAppLayer = Layer.mergeAll(
    NostrServiceLive,
    NIP04ServiceLive,
    NIP19ServiceLive,
    BIP39ServiceLive,
    BIP32ServiceLive,
    TelemetryServiceLive,
    NIP28ServiceLive,
    OllamaServiceLive
  ).pipe(
    // Provide necessary configurations
    Layer.provide(DefaultNostrServiceConfigLayer),
    Layer.provide(DefaultTelemetryConfigLayer),
    Layer.provide(UiOllamaConfigLive),
    Layer.provide(BrowserHttpClient.layer) // Provide BrowserHttpClient for renderer
  );
  
  // Create the runtime with the full layer
  mainRuntime = createRuntime(FullAppLayer);
  console.log("Production-ready Effect runtime for renderer created successfully");
} catch (e: unknown) {
  console.error("CRITICAL: Failed to create Effect runtime for renderer:", e);
  // Create a fallback minimal runtime that will at least not crash the application
  console.log("Creating fallback runtime for renderer...");
  
  // Fallback layer should be minimal and guaranteed to work
  // Start with an empty layer and add configs first, then services that depend on those configs
  const FallbackLayer = Layer.empty.pipe(
    // First provide configs
    Layer.provide(DefaultTelemetryConfigLayer),
    // Then provide services that depend on those configs
    Layer.provide(TelemetryServiceLive)
    // Optionally add NostrServiceLive if needed and its dependencies are minimal
    // Layer.provide(DefaultNostrServiceConfigLayer),
    // Layer.provide(NostrServiceLive)
  );
  
  // Create the fallback runtime with explicit type assertion
  mainRuntime = createRuntime(FallbackLayer as Layer.Layer<FullAppContext, any, never>);
  console.log("Fallback runtime for renderer created");
}

export { mainRuntime };