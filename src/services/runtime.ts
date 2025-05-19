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
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryServiceConfig } from '@/services/telemetry';
import { OllamaService, OllamaServiceConfigTag, UiOllamaConfigLive } from '@/services/ollama/OllamaService';
import { OllamaServiceLive } from '@/services/ollama/OllamaServiceImpl';

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
  OllamaService;

// Build the full layer with all services
let mainRuntime: Runtime.Runtime<FullAppContext>;

try {
  console.log("Creating a production-ready Effect runtime...");
  
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
    Layer.provide(UiOllamaConfigLive)
  );
  
  // Create the runtime with the full layer
  mainRuntime = createRuntime(FullAppLayer);
  console.log("Production-ready Effect runtime created successfully");
} catch (e) {
  console.error("CRITICAL: Failed to create Effect runtime:", e);
  // Create a fallback minimal runtime that will at least not crash the application
  console.log("Creating fallback runtime...");
  
  const FallbackLayer = Layer.mergeAll(
    TelemetryServiceLive,
    NostrServiceLive
  ).pipe(
    Layer.provide(DefaultNostrServiceConfigLayer),
    Layer.provide(DefaultTelemetryConfigLayer)
  );
  
  mainRuntime = createRuntime(FallbackLayer);
  console.log("Fallback runtime created");
}

export { mainRuntime };