import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Stream, pipe } from "effect";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";
import { NIP90Service } from "@/services/nip90";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

// Mock dependencies
const mockNIP90Service = {
  createJobRequest: vi.fn(),
  getJobResult: vi.fn(),
  subscribeToJobUpdates: vi.fn(),
  listJobFeedback: vi.fn(),
  listPublicEvents: vi.fn(),
} satisfies NIP90Service;

const mockTelemetryService = {
  trackEvent: vi.fn(),
} satisfies TelemetryService;

const mockConfig = {
  dvmPubkey: "test-pubkey",
  dvmRelays: ["wss://test-relay.com"],
  requestKind: 5050,
  requiresEncryption: true,
  useEphemeralRequests: true,
  modelIdentifier: "devstral",
  modelName: "Devstral Test",
  temperature: 0.7,
  maxTokens: 1000,
};

// Test layer with mocked dependencies
const TestLayer = Layer.mergeAll(
  Layer.succeed(NIP90Service, mockNIP90Service),
  Layer.succeed(TelemetryService, mockTelemetryService),
  Layer.succeed(NIP90ProviderConfigTag, mockConfig),
  NIP90AgentLanguageModelLive
);

describe("NIP90AgentLanguageModelLive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      // Mock successful job creation and result
      const mockJobId = "test-job-123";
      const mockResult = { id: mockJobId, content: "Test response", kind: 5050 };

      mockNIP90Service.createJobRequest.mockResolvedValue({ id: mockJobId });
      mockNIP90Service.getJobResult.mockResolvedValue(mockResult);

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(model.generateText({ prompt: "test prompt" }));
        return response.text;
      });

      const result = await pipe(
        program,
        Effect.provide(TestLayer),
        Effect.runPromise
      );

      expect(result).toBe("Test response");
      expect(mockNIP90Service.createJobRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 5050,
          inputs: [["User: test prompt\n", "text"]],
          targetDvmPubkeyHex: "test-pubkey",
        })
      );
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "nip90_adapter:nonstream",
          action: "create_start",
        })
      );
    });

    it("should handle chat message format", async () => {
      const mockJobId = "test-job-123";
      const mockResult = { id: mockJobId, content: "Test response", kind: 5050 };

      mockNIP90Service.createJobRequest.mockResolvedValue({ id: mockJobId });
      mockNIP90Service.getJobResult.mockResolvedValue(mockResult);

      const chatPrompt = JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful AI", timestamp: Date.now() },
          { role: "user", content: "Hello", timestamp: Date.now() },
        ],
      });

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(model.generateText({ prompt: chatPrompt }));
        return response.text;
      });

      const result = await pipe(
        program,
        Effect.provide(TestLayer),
        Effect.runPromise
      );

      expect(result).toBe("Test response");
      expect(mockNIP90Service.createJobRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: [
            [expect.stringContaining("Instructions: You are a helpful AI"), "text"],
          ],
        })
      );
    });

    it("should handle errors from NIP-90 service", async () => {
      mockNIP90Service.createJobRequest.mockRejectedValue(new Error("Network error"));

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        return yield* _(model.generateText({ prompt: "test prompt" }));
      });

      await expect(
        pipe(program, Effect.provide(TestLayer), Effect.runPromise)
      ).rejects.toThrow("Failed to create NIP-90 job request: Network error");
    });
  });

  describe("streamText", () => {
    it("should handle streaming text generation", async () => {
      const mockJobId = "test-job-123";
      let updateCallback: Function;

      mockNIP90Service.createJobRequest.mockResolvedValue({ id: mockJobId });
      mockNIP90Service.subscribeToJobUpdates.mockImplementation(
        (id, pubkey, sk, callback) => {
          updateCallback = callback;
          return { unsubscribe: vi.fn() };
        }
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "test prompt" });
        return yield* _(Stream.runCollect(stream));
      });

      const resultPromise = pipe(
        program,
        Effect.provide(TestLayer),
        Effect.runPromise
      );

      // Simulate streaming updates
      updateCallback({ status: "partial", content: "First" });
      updateCallback({ status: "partial", content: "Second" });
      updateCallback({ id: mockJobId, content: "Final", kind: 5050 });

      const chunks = await resultPromise;
      expect(chunks.map(chunk => chunk.text)).toEqual([
        "First",
        "Second",
        "Final",
      ]);
    });

    it("should handle streaming errors", async () => {
      const mockJobId = "test-job-123";
      let updateCallback: Function;

      mockNIP90Service.createJobRequest.mockResolvedValue({ id: mockJobId });
      mockNIP90Service.subscribeToJobUpdates.mockImplementation(
        (id, pubkey, sk, callback) => {
          updateCallback = callback;
          return { unsubscribe: vi.fn() };
        }
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "test prompt" });
        return yield* _(Stream.runCollect(stream));
      });

      const resultPromise = pipe(
        program,
        Effect.provide(TestLayer),
        Effect.runPromise
      );

      // Simulate error
      updateCallback({ status: "error", content: "DVM error occurred" });

      await expect(resultPromise).rejects.toThrow("NIP-90 DVM error: DVM error occurred");
    });
  });

  describe("generateStructured", () => {
    it("should return error for unsupported operation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        return yield* _(model.generateStructured({ prompt: "test", schema: {} }));
      });

      await expect(
        pipe(program, Effect.provide(TestLayer), Effect.runPromise)
      ).rejects.toThrow("generateStructured not supported by NIP-90 provider");
    });
  });
});
