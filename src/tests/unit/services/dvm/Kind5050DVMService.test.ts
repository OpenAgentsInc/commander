import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Context } from "effect";
import {
  Kind5050DVMService,
  DVMError,
  DVMJobRequestError,
  DVMConfigError,
  Kind5050DVMServiceConfigTag,
  defaultKind5050DVMServiceConfig,
} from "@/services/dvm/Kind5050DVMService";
import { Kind5050DVMServiceLive } from "@/services/dvm";
import { NostrService, NostrEvent, NostrFilter, Subscription } from "@/services/nostr";
import { OllamaService, OllamaChatCompletionResponse } from "@/services/ollama";
import { SparkService, LightningInvoice } from "@/services/spark";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import type { JobHistoryEntry, JobStatistics } from "@/types/dvm";

// Use our own bytesToHex to avoid dependencies on @noble/hashes
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Mock the dvmSettingsStore
vi.mock("@/stores/dvmSettingsStore", () => ({
  useDVMSettingsStore: {
    getState: () => ({
      getEffectiveConfig: () => defaultKind5050DVMServiceConfig,
      getDerivedPublicKeyHex: () => defaultKind5050DVMServiceConfig.dvmPublicKeyHex,
    }),
  },
}));

// Create a complete mock setup for the bitcoin-related libraries
vi.mock("@noble/secp256k1", () => ({
  schnorr: {
    verify: vi.fn().mockReturnValue(true),
    sign: vi.fn().mockReturnValue(new Uint8Array(64).fill(1)),
  },
  utils: {
    randomPrivateKey: vi.fn().mockReturnValue(new Uint8Array(32).fill(1)),
  },
  getPublicKey: vi.fn().mockReturnValue(new Uint8Array(33).fill(2)),
}));

// Mock all bitcoin and cryptography-related modules
vi.mock("bitcoinjs-lib", () => {
  return {
    initEccLib: vi.fn(),
    networks: {
      bitcoin: { bip32: { public: 0, private: 0 } },
      testnet: { bip32: { public: 0, private: 0 } },
    },
    payments: {
      p2pkh: vi.fn().mockReturnValue({ address: "mockAddress" }),
    },
    Psbt: function() {
      return {
        addInput: vi.fn(),
        addOutput: vi.fn(),
        signInput: vi.fn(),
        validateSignaturesOfInput: vi.fn().mockReturnValue(true),
        finalizeAllInputs: vi.fn(),
        extractTransaction: vi.fn().mockReturnValue({ toHex: () => "mocktxhex" }),
      };
    },
  };
});

// Mock Spark SDK and any ECC library it might use
vi.mock("@buildonspark/lrc20-sdk", () => ({
  default: {
    initEccLib: vi.fn(),
    createLightningInvoice: vi.fn().mockResolvedValue({
      invoice: {
        encodedInvoice: "lnbc10...",
        paymentHash: "0001020304050607080900010203040506070809000102030405060708090102",
      }
    }),
  },
}));

// Prevent any actual cryptographic operations
vi.mock("noble-hashes/hmac", () => ({
  hmac: vi.fn().mockReturnValue(new Uint8Array(32).fill(3)),
}));

vi.mock("noble-hashes/sha256", () => ({
  sha256: vi.fn().mockReturnValue(new Uint8Array(32).fill(4)),
}));

// Sample test data
const TEST_DVM_PUBKEY = defaultKind5050DVMServiceConfig.dvmPublicKeyHex;
const TEST_DVM_SK = defaultKind5050DVMServiceConfig.dvmPrivateKeyHex;
const TEST_EVENT_ID = "test-event-id-for-dvm";
const TEST_USER_PUBKEY = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

describe("Kind5050DVMService", () => {
  // Create test mocks for dependencies
  let mockNostrService: NostrService;
  let mockOllamaService: OllamaService;
  let mockSparkService: SparkService;
  let mockNip04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<Kind5050DVMService>;

  // Helper function to properly handle Effect context requirements in tests
  function runEffectTest<A, E>(
    effect: Effect.Effect<A, E, Kind5050DVMService>
  ): Effect.Effect<A, E, never> {
    return Effect.provide(effect, testLayer);
  }

  // Helper function to create mock job request event
  function createMockJobRequestEvent(isEncrypted = false): NostrEvent {
    return {
      id: TEST_EVENT_ID,
      pubkey: TEST_USER_PUBKEY,
      created_at: Math.floor(Date.now() / 1000),
      kind: 5100, // Text generation job
      tags: [
        ["i", "Test prompt for DVM", "text"],
        ["p", TEST_DVM_PUBKEY],
        ...(isEncrypted ? [["encrypted"]] : []),
      ],
      content: isEncrypted ? "encrypted-content" : "",
      sig: "test-signature",
    };
  }

  // Helper to create mock job result events (kind 6xxx)
  function createMockJobResultEvent(): NostrEvent {
    return {
      id: "result-" + TEST_EVENT_ID,
      pubkey: TEST_DVM_PUBKEY,
      created_at: Math.floor(Date.now() / 1000),
      kind: 6100,
      tags: [
        ["e", TEST_EVENT_ID],
        ["p", TEST_USER_PUBKEY],
        ["amount", "10000", "mock-bolt11-invoice"]
      ],
      content: "Mock DVM response text",
      sig: "result-signature",
    };
  }

  // Helper to create mock feedback events (kind 7000)
  function createMockFeedbackEvent(status: string): NostrEvent {
    return {
      id: `feedback-${status}-${TEST_EVENT_ID}`,
      pubkey: TEST_DVM_PUBKEY,
      created_at: Math.floor(Date.now() / 1000),
      kind: 7000,
      tags: [
        ["e", TEST_EVENT_ID],
        ["p", TEST_USER_PUBKEY],
        ["status", status]
      ],
      content: status === "error" ? "Error message details" : "",
      sig: "feedback-signature",
    };
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Nostr service
    mockNostrService = {
      publishEvent: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
      listEvents: vi.fn().mockImplementation((filters: NostrFilter[]) => {
        // Mock different responses based on filters
        if (filters.some(f => f.kinds?.includes(7000))) {
          // If requesting feedback events
          return Effect.succeed([
            createMockFeedbackEvent("success"),
            createMockFeedbackEvent("error"),
            createMockFeedbackEvent("payment-required")
          ]);
        } else if (filters.some(f => f.kinds?.some(k => k >= 6000 && k <= 6999))) {
          // If requesting result events
          return Effect.succeed([createMockJobResultEvent()]);
        }
        return Effect.succeed([]);
      }),
      subscribeToEvents: vi.fn().mockImplementation((filters, onEvent, relays, onEOSE) => {
        // Simulate EOSE callback for each relay
        if (onEOSE && relays) {
          relays.forEach(relay => {
            setTimeout(() => onEOSE(relay), 10);
          });
        }
        return Effect.succeed({
          unsub: vi.fn() as () => void,
        } as Subscription);
      }),
      getPool: vi.fn().mockImplementation(() => Effect.succeed({} as any)),
      cleanupPool: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
    };

    // Create mock Ollama service
    mockOllamaService = {
      generateChatCompletion: vi.fn().mockImplementation(() => {
        const response: OllamaChatCompletionResponse = {
          object: "chat.completion",
          model: "gemma2:latest",
          id: "mock-completion-id",
          created: Math.floor(Date.now() / 1000),
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "This is a mock response from the Ollama service for testing."
              },
              finish_reason: "stop",
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        };
        return Effect.succeed(response);
      }),
      generateChatCompletionStream: vi.fn(),
      checkOllamaStatus: vi.fn().mockImplementation(() => Effect.succeed(true)),
    };

    // Create mock Spark service
    mockSparkService = {
      createLightningInvoice: vi.fn().mockImplementation(() => {
        return Effect.succeed({
          invoice: {
            encodedInvoice: "lnbc10m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w",
            paymentHash: "0001020304050607080900010203040506070809000102030405060708090102",
            amountSats: 10,
            createdAt: Math.floor(Date.now() / 1000),
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
          }
        } as LightningInvoice);
      }),
      checkInvoiceStatus: vi.fn().mockImplementation(() => {
        return Effect.succeed({
          status: 'paid',
          amountPaidMsats: 10000,
        });
      }),
      getBalance: vi.fn().mockImplementation(() => Effect.succeed({
        totalBalanceSats: 1000000,
        spendableBalanceSats: 900000,
      })),
      payLightningInvoice: vi.fn(),
      getSingleUseDepositAddress: vi.fn().mockImplementation(() => Effect.succeed("bc1qzxcvbnmlkjhgfdsaqwertyuiop")),
      checkWalletStatus: vi.fn().mockImplementation(() => Effect.succeed({ isOperational: true })),
    };

    // Create mock NIP04 service
    mockNip04Service = {
      encrypt: vi.fn().mockImplementation(() => Effect.succeed("encrypted-content")),
      decrypt: vi.fn().mockImplementation(() => {
        // Return JSON string with tags for encrypted content
        return Effect.succeed(JSON.stringify([
          ["i", "Decrypted prompt content for DVM", "text"],
          ["output", "text/plain"]
        ]));
      }),
    };

    // Create mock Telemetry service
    mockTelemetryService = {
      trackEvent: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
      isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
      setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined as void)),
    };

    // Create test layer with mocked dependencies
    testLayer = Layer.provide(
      Kind5050DVMServiceLive,
      Layer.succeed(NostrService, mockNostrService)
        .pipe(Layer.merge(Layer.succeed(OllamaService, mockOllamaService)))
        .pipe(Layer.merge(Layer.succeed(SparkService, mockSparkService)))
        .pipe(Layer.merge(Layer.succeed(NIP04Service, mockNip04Service)))
        .pipe(Layer.merge(Layer.succeed(TelemetryService, mockTelemetryService)))
        .pipe(Layer.merge(Layer.succeed(Kind5050DVMServiceConfigTag, defaultKind5050DVMServiceConfig)))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startListening", () => {
    it("should successfully start listening", async () => {
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.startListening()
      );
      
      await Effect.runPromise(runEffectTest(program));
      
      expect(mockNostrService.subscribeToEvents).toHaveBeenCalledTimes(1);
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "start_listening_attempt"
        })
      );
    });

    it("should fail with DVMConfigError if no DVM private key is provided", async () => {
      // Override the config for this test
      const badConfigLayer = Layer.succeed(
        Kind5050DVMServiceConfigTag,
        { ...defaultKind5050DVMServiceConfig, dvmPrivateKeyHex: "" }
      );
      
      const testLayerWithBadConfig = Layer.provide(
        Kind5050DVMServiceLive,
        Layer.succeed(NostrService, mockNostrService)
          .pipe(Layer.merge(Layer.succeed(OllamaService, mockOllamaService)))
          .pipe(Layer.merge(Layer.succeed(SparkService, mockSparkService)))
          .pipe(Layer.merge(Layer.succeed(NIP04Service, mockNip04Service)))
          .pipe(Layer.merge(Layer.succeed(TelemetryService, mockTelemetryService)))
          .pipe(Layer.merge(badConfigLayer))
      );

      // The store mock is already set up at the top of the file by vi.mock

      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.startListening()
      );
      
      await expect(
        Effect.runPromise(Effect.provide(program, testLayerWithBadConfig))
      ).rejects.toThrow(DVMConfigError);
    });
  });

  describe("stopListening", () => {
    it("should successfully stop listening after starting", async () => {
      // First start listening
      const startProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.startListening()
      );
      await Effect.runPromise(runEffectTest(startProgram));
      
      // Then stop listening
      const stopProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.stopListening()
      );
      await Effect.runPromise(runEffectTest(stopProgram));
      
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stop_listening_success"
        })
      );
    });
  });

  describe("isListening", () => {
    it("should report correct listening status", async () => {
      // Initial status should be not listening (false)
      const initialStatusProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.isListening()
      );
      const initialStatus = await Effect.runPromise(runEffectTest(initialStatusProgram));
      expect(initialStatus).toBe(false);

      // Start listening
      const startProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.startListening()
      );
      await Effect.runPromise(runEffectTest(startProgram));
      
      // Status should now be listening (true)
      const afterStartProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.isListening()
      );
      const afterStartStatus = await Effect.runPromise(runEffectTest(afterStartProgram));
      expect(afterStartStatus).toBe(true);
      
      // Stop listening
      const stopProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.stopListening()
      );
      await Effect.runPromise(runEffectTest(stopProgram));
      
      // Status should now be not listening (false) again
      const afterStopProgram = Effect.flatMap(Kind5050DVMService, (service) =>
        service.isListening()
      );
      const afterStopStatus = await Effect.runPromise(runEffectTest(afterStopProgram));
      expect(afterStopStatus).toBe(false);
    });
  });

  describe("processLocalTestJob", () => {
    it("should process a local test job successfully", async () => {
      const testPrompt = "Test prompt for local job processing";
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.processLocalTestJob(testPrompt)
      );
      
      const result = await Effect.runPromise(runEffectTest(program));
      
      // Result should include the mock response and some invoice info
      expect(result).toContain("This is a mock response");
      expect(result).toContain("Tokens: 30");
      expect(result).toContain("Price: 10 sats");
      expect(result).toContain("Invoice: lnbc10m1pvjluezpp5qqq");
      
      expect(mockOllamaService.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemma2:latest",
          messages: [{ role: "user", content: testPrompt }]
        })
      );
      
      expect(mockSparkService.createLightningInvoice).toHaveBeenCalled();
    });

    it("should fail appropriately when OllamaService throws an error", async () => {
      const testPrompt = "Test prompt that causes error";
      
      // Mock OllamaService to throw an error
      mockOllamaService.generateChatCompletion = vi.fn().mockImplementation(() => 
        Effect.fail(new Error("Ollama model not available"))
      );
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.processLocalTestJob(testPrompt)
      );
      
      await expect(
        Effect.runPromise(runEffectTest(program))
      ).rejects.toThrow("Ollama model not available");
    });
  });

  describe("getJobHistory", () => {
    it("should retrieve job history entries with pagination", async () => {
      const historyOptions = {
        page: 1,
        pageSize: 10
      };
      
      // Mock NostrService to return a mix of result and feedback events
      mockNostrService.listEvents = vi.fn().mockImplementation(() => {
        const events: NostrEvent[] = [
          createMockJobResultEvent(),
          createMockFeedbackEvent("success"),
          createMockFeedbackEvent("error")
        ];
        return Effect.succeed(events);
      });
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobHistory(historyOptions)
      );
      
      const result = await Effect.runPromise(runEffectTest(program));
      
      expect(result.entries).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(mockNostrService.listEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kinds: expect.arrayContaining([expect.any(Number)]),
            authors: [TEST_DVM_PUBKEY]
          })
        ])
      );
      
      // Verify the entries have expected shape
      expect(result.entries[0]).toHaveProperty('id');
      expect(result.entries[0]).toHaveProperty('timestamp');
      expect(result.entries[0]).toHaveProperty('jobRequestEventId');
      expect(result.entries[0]).toHaveProperty('requesterPubkey');
      expect(result.entries[0]).toHaveProperty('status');
    });

    it("should return empty results when no events found", async () => {
      const historyOptions = {
        page: 1,
        pageSize: 10
      };
      
      // Mock NostrService to return no events
      mockNostrService.listEvents = vi.fn().mockImplementation(() => Effect.succeed([]));
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobHistory(historyOptions)
      );
      
      const result = await Effect.runPromise(runEffectTest(program));
      
      expect(result.entries).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should handle NostrService errors appropriately", async () => {
      const historyOptions = {
        page: 1,
        pageSize: 10
      };
      
      // Mock NostrService to throw an error
      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.fail(new Error("Failed to connect to relays"))
      );
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobHistory(historyOptions)
      );
      
      await expect(
        Effect.runPromise(runEffectTest(program))
      ).rejects.toThrow("Failed to fetch DVM history from relays");
    });
  });

  describe("getJobStatistics", () => {
    it("should calculate and return job statistics", async () => {
      // Mock NostrService to return a good mix of events for statistics
      mockNostrService.listEvents = vi.fn().mockImplementation(() => {
        const events: NostrEvent[] = [
          createMockJobResultEvent(), // success with invoice
          createMockFeedbackEvent("success"),
          createMockFeedbackEvent("error"),
          createMockFeedbackEvent("payment-required")
        ];
        return Effect.succeed(events);
      });
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobStatistics()
      );
      
      const stats = await Effect.runPromise(runEffectTest(program));
      
      expect(stats).toHaveProperty('totalJobsProcessed');
      expect(stats).toHaveProperty('totalSuccessfulJobs');
      expect(stats).toHaveProperty('totalFailedJobs');
      expect(stats).toHaveProperty('totalRevenueSats');
      expect(stats).toHaveProperty('jobsPendingPayment');
      
      // Validate some expected values based on our mock events
      expect(stats.totalSuccessfulJobs).toBeGreaterThan(0);
      expect(stats.totalFailedJobs).toBeGreaterThan(0);
      expect(stats.jobsPendingPayment).toBeGreaterThan(0);
    });

    it("should return zero statistics when no events found", async () => {
      // Mock NostrService to return no events
      mockNostrService.listEvents = vi.fn().mockImplementation(() => Effect.succeed([]));
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobStatistics()
      );
      
      const stats = await Effect.runPromise(runEffectTest(program));
      
      expect(stats.totalJobsProcessed).toBe(0);
      expect(stats.totalSuccessfulJobs).toBe(0);
      expect(stats.totalFailedJobs).toBe(0);
      expect(stats.totalRevenueSats).toBe(0);
      expect(stats.jobsPendingPayment).toBe(0);
    });

    it("should handle NostrService errors appropriately", async () => {
      // Mock NostrService to throw an error
      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.fail(new Error("Failed to connect to relays"))
      );
      
      const program = Effect.flatMap(Kind5050DVMService, (service) =>
        service.getJobStatistics()
      );
      
      await expect(
        Effect.runPromise(runEffectTest(program))
      ).rejects.toThrow("Failed to fetch DVM stats from relays");
    });
  });
});