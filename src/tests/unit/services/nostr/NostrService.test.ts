import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import {
  NostrService,
  NostrServiceConfig,
  NostrServiceConfigTag,
  NostrServiceLive,
  NostrEvent,
  NostrFilter,
  NostrPoolError,
  NostrRequestError,
  NostrPublishError,
} from "@/services/nostr";
import { TelemetryService } from "@/services/telemetry";

// Sample test events
const createSampleEvent = (kind: number): NostrEvent => ({
  id: `test-event-${kind}`,
  pubkey: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  created_at: Math.floor(Date.now() / 1000),
  kind,
  tags: [["e", "referenced-event"], ["p", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"]],
  content: "Test content",
  sig: "signaturesignaturesignaturesignaturesignaturesignature",
});

// Mock SimplePool constructor
vi.mock("nostr-tools", async () => {
  const actual = await vi.importActual("nostr-tools");
  return {
    ...actual as any,
    SimplePool: vi.fn(() => ({
      close: vi.fn(),
      querySync: vi.fn().mockImplementation((relays, filter) => {
        if (filter.kinds?.some(k => k >= 5000 && k <= 7000)) {
          // For NIP-90 events
          return [
            createSampleEvent(5100), // Job request
            createSampleEvent(6100), // Job result
            createSampleEvent(7000), // Feedback
          ];
        }
        return [createSampleEvent(1), createSampleEvent(1)]; // Default kind 1 events
      }),
      sub: vi.fn().mockReturnValue({
        unsub: vi.fn(),
      }),
      publish: vi.fn().mockResolvedValue({
        success: true,
        relays: { "wss://relay.example.com": true },
      }),
    })),
  };
});

describe("NostrService", () => {
  let mockTelemetryService: TelemetryService;
  let nostrServiceConfig: NostrServiceConfig;
  let testLayer: Layer.Layer<NostrService>;

  // Helper function to run effects with NostrService
  function runEffectTest<A, E>(
    effect: Effect.Effect<A, E, NostrService>
  ): Effect.Effect<A, E, never> {
    return Effect.provide(effect, testLayer);
  }

  beforeEach(() => {
    // Mock telemetry
    mockTelemetryService = {
      trackEvent: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
      isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
      setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
    };

    // Sample config
    nostrServiceConfig = {
      relays: ["wss://relay.example.com"],
      requestTimeoutMs: 1000,
    };

    // Create test layer
    testLayer = Layer.provide(
      NostrServiceLive,
      Layer.merge(
        Layer.succeed(NostrServiceConfigTag, nostrServiceConfig),
        Layer.succeed(TelemetryService, mockTelemetryService)
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listEvents", () => {
    it("should fetch and return events from relays", async () => {
      const filters: NostrFilter[] = [{ kinds: [1], limit: 10 }];
      
      const program = Effect.flatMap(NostrService, (service) =>
        service.listEvents(filters)
      );
      
      const result = await Effect.runPromise(runEffectTest(program));
      
      expect(result).toHaveLength(2);
      expect(result[0].kind).toBe(1);
    });
  });
  
  // listPublicNip90Events tests have been removed - this method was moved to NIP90Service
  
  // Additional existing tests for service...
});