import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Stream, pipe } from "effect";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";
import { NIP90Service } from "@/services/nip90";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { ConfigurationService } from "@/services/configuration";
import { NIP90ProviderConfig } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

describe("NIP90AgentLanguageModelLive", () => {
  const mockJobId = "test-job-id";
  const mockDvmPubkey = "test-dvm-pubkey";
  const mockRelays = ["wss://test.relay"];

  const mockConfig: NIP90ProviderConfig = {
    isEnabled: true,
    modelName: "test-model",
    dvmPublicKey: mockDvmPubkey,
    relays: mockRelays,
    modelIdentifier: "test-model",
    dvmPubkey: mockDvmPubkey,
    dvmRelays: mockRelays,
    requestKind: 5050,
    requiresEncryption: false,
    useEphemeralRequests: false,
  };

  const mockNIP90Service = {
    createJobRequest: vi.fn(),
    getJobResult: vi.fn(),
    subscribeToJobUpdates: vi.fn(),
  };

  const mockNostrService = {
    publishEvent: vi.fn(),
    listEvents: vi.fn(),
  };

  const mockNIP04Service = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  const mockTelemetryService = {
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
    trackEvent: vi.fn(),
  };

  const mockConfigurationService = {
    getConfig: vi.fn().mockReturnValue(mockConfig),
  };

  const NIP90ServiceLayer = Layer.succeed(NIP90Service, mockNIP90Service);
  const NostrServiceLayer = Layer.succeed(NostrService, mockNostrService);
  const NIP04ServiceLayer = Layer.succeed(NIP04Service, mockNIP04Service);
  const TelemetryServiceLayer = Layer.succeed(TelemetryService, mockTelemetryService);
  const ConfigurationServiceLayer = Layer.succeed(ConfigurationService, mockConfigurationService);
  const NIP90ProviderConfigLayer = Layer.succeed(NIP90ProviderConfigTag, mockConfig);

  const TestLayer = pipe(
    NIP90AgentLanguageModelLive,
    Layer.provide(NIP90ServiceLayer),
    Layer.provide(NostrServiceLayer),
    Layer.provide(NIP04ServiceLayer),
    Layer.provide(TelemetryServiceLayer),
    Layer.provide(ConfigurationServiceLayer),
    Layer.provide(NIP90ProviderConfigLayer)
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      const mockResponse = "Generated text response";
      mockNIP90Service.createJobRequest.mockReturnValue(Effect.succeed({ id: mockJobId }));
      mockNIP90Service.getJobResult.mockReturnValue(Effect.succeed({
        id: mockJobId,
        content: mockResponse,
        kind: 5050,
      }));

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const result = yield* _(model.generateText({ prompt: "Test prompt" }));
        return result.text;
      });

      const result = await pipe(program, Effect.provide(TestLayer), Effect.runPromise);
      expect(result).toBe(mockResponse);
    });

    it("should handle chat message format", async () => {
      const mockResponse = "Chat response";
      mockNIP90Service.createJobRequest.mockReturnValue(Effect.succeed({ id: mockJobId }));
      mockNIP90Service.getJobResult.mockReturnValue(Effect.succeed({
        id: mockJobId,
        content: mockResponse,
        kind: 5050,
      }));

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const result = yield* _(model.generateText({
          prompt: JSON.stringify({
            messages: [
              { role: "system", content: "You are a helpful assistant" },
              { role: "user", content: "Hello" },
            ],
          }),
        }));
        return result.text;
      });

      const result = await pipe(program, Effect.provide(TestLayer), Effect.runPromise);
      expect(result).toBe(mockResponse);
    });

    it("should handle errors from NIP-90 service", async () => {
      mockNIP90Service.createJobRequest.mockReturnValue(Effect.fail(new Error("Network error")));

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const result = yield* _(model.generateText({ prompt: "Test prompt" }));
        return result.text;
      });

      await expect(
        pipe(program, Effect.provide(TestLayer), Effect.runPromise)
      ).rejects.toThrow("NIP-90 generateText error: Network error");
    });
  });

  describe("streamText", () => {
    it("should handle streaming text generation", async () => {
      const updates: string[] = [];

      mockNIP90Service.createJobRequest.mockReturnValue(Effect.succeed({ id: mockJobId }));
      mockNIP90Service.subscribeToJobUpdates.mockImplementation((params) => {
        // Simulate streaming updates
        setTimeout(() => {
          params.onFeedback({ status: "partial", content: "First" });
          params.onFeedback({ status: "partial", content: "Second" });
          params.onResult({ id: mockJobId, content: "Final", kind: 5050 });
        }, 0);

        return Effect.succeed(() => { });
      });

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({
          prompt: "Test prompt",
          updateCallback: (update) => {
            updates.push(update.text);
          },
        });

        yield* _(Stream.runCollect(stream));
      });

      await pipe(program, Effect.provide(TestLayer), Effect.runPromise);

      expect(updates).toEqual(["First", "Second", "Final"]);
    });

    it("should handle streaming errors", async () => {
      mockNIP90Service.createJobRequest.mockReturnValue(Effect.succeed({ id: mockJobId }));
      mockNIP90Service.subscribeToJobUpdates.mockImplementation((params) => {
        // Simulate error
        setTimeout(() => {
          params.onFeedback({ status: "error", content: "DVM error occurred" });
        }, 0);

        return Effect.succeed(() => { });
      });

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({
          prompt: "Test prompt",
          updateCallback: () => { },
        });

        yield* _(Stream.runCollect(stream));
      });

      await expect(
        pipe(program, Effect.provide(TestLayer), Effect.runPromise)
      ).rejects.toThrow("NIP-90 DVM error: DVM error occurred");
    });
  });

  describe("generateStructured", () => {
    it("should return error for unsupported operation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const result = yield* _(model.generateStructured({ prompt: "Test prompt", schema: {} }));
        return result;
      });

      await expect(
        pipe(program, Effect.provide(TestLayer), Effect.runPromise)
      ).rejects.toThrow("generateStructured not supported by NIP-90 provider");
    });
  });
});
