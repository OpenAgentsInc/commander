import { Effect, Layer, Exit } from "effect";
import { NostrService, NostrServiceLive, NostrServiceConfig, NostrServiceConfigTag } from "@/services/nostr";
import { TelemetryService } from "@/services/telemetry";
import { NIP13Service, NIP13ServiceLive } from "@/services/nip13";

// Create test config
const testRelayConfig = Layer.succeed(
  NostrServiceConfigTag,
  {
    relays: ["wss://nostr.mom"],
    relayConfigs: [{ url: "wss://nostr.mom" }],
    enablePoW: false,
    requestTimeoutMs: 30000,
  } as NostrServiceConfig
);

// Mock telemetry
const mockTelemetry = Layer.succeed(TelemetryService, {
  trackEvent: () => Effect.succeed(undefined),
  isEnabled: () => Effect.succeed(true),
  setEnabled: () => Effect.succeed(undefined),
} as TelemetryService);

// Create test layer
const testLayer = NostrServiceLive.pipe(
  Layer.provide(testRelayConfig),
  Layer.provide(mockTelemetry),
  Layer.provide(NIP13ServiceLive)
);

// Debug function
async function debugSubscription() {
  console.log("Starting subscription debug test...");
  
  const program = Effect.gen(function* (_) {
    const nostr = yield* _(NostrService);
    
    console.log("Creating subscription...");
    
    let eventCount = 0;
    const startTime = Date.now();
    
    const subscription = yield* _(
      nostr.subscribeToEvents(
        [{ kinds: [1], limit: 10 }],
        (event) => {
          eventCount++;
          console.log(`Event received (#${eventCount}):`, {
            id: event.id,
            kind: event.kind,
            created_at: event.created_at,
            content: event.content.substring(0, 50) + "...",
          });
        },
        undefined,
        (relay) => {
          console.log(`EOSE received from relay: ${relay || 'unknown'}`);
        }
      )
    );
    
    console.log("Subscription created, waiting for events...");
    
    // Wait for 10 seconds
    yield* _(Effect.sleep("10 seconds"));
    
    const elapsed = Date.now() - startTime;
    console.log(`After ${elapsed}ms: Received ${eventCount} events`);
    
    console.log("Unsubscribing...");
    subscription.unsub();
    
    return eventCount;
  });
  
  try {
    const result = await Effect.runPromise(
      Effect.provide(program, testLayer)
    );
    console.log(`Test completed. Total events received: ${result}`);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the debug test
debugSubscription();