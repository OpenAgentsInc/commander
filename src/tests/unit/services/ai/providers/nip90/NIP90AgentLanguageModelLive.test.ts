import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, pipe, Stream } from "effect";
import { AgentLanguageModel } from "@/services/ai/core";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";

describe("NIP90AgentLanguageModelLive", () => {
  const mockDvmPubkey = "mock-dvm-pubkey";
  const mockRelays = ["wss://mock.relay"];

  const mockConfig = {
    isEnabled: true,
    modelName: "test-model",
    dvmPubkey: mockDvmPubkey,
    dvmRelays: mockRelays,
    requestKind: 5050,
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: "test-model",
    temperature: 0.7,
    maxTokens: 1000,
  };

  const mockNIP90Service = {
    createJobRequest: vi.fn().mockImplementation(() => Effect.succeed({ id: "job-123" })),
    getJobResult: vi.fn().mockImplementation(() => Effect.succeed({ content: "Test response" })),
    subscribeToJobUpdates: vi.fn(),
    listJobFeedback: vi.fn(),
    listPublicEvents: vi.fn(),
  };

  const mockNostrService = {
    publishEvent: vi.fn(),
    listEvents: vi.fn(),
    getPool: vi.fn(),
    cleanupPool: vi.fn(),
    subscribeToEvents: vi.fn(),
    getPublicKey: vi.fn().mockReturnValue("mock-public-key"),
  };

  const mockNIP04Service = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  const mockTelemetryService = {
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
    trackEvent: vi.fn().mockReturnValue(Effect.succeed(void 0)),
  };

  const mockConfigurationService = {
    get: vi.fn(),
    getSecret: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
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
    Layer.provide(NIP90ProviderConfigLayer),
  );

  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const response = yield* _(model.generateText({ prompt: "Test prompt" }));
        expect(response.text).toBe("Test response");
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));

      expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
      expect(mockNIP90Service.getJobResult).toHaveBeenCalled();
    });

    it("should handle chat message format", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const response = yield* _(
          model.generateText({
            prompt: JSON.stringify({
              messages: [
                { role: "system", content: "You are a test AI." },
                { role: "user", content: "Hello" },
              ],
            }),
          }),
        );
        expect(response.text).toBe("Test response");
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });

    it("should handle errors from NIP-90 service", async () => {
      mockNIP90Service.createJobRequest.mockImplementationOnce(() => Effect.fail(new Error("NIP-90 error")));

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const result = yield* _(
          Effect.either(model.generateText({ prompt: "Test prompt" })),
        );
        expect(result._tag).toBe("Left");
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });

  describe("streamText", () => {
    beforeEach(() => {
      // Reset the mock implementation for each test
      mockNIP90Service.subscribeToJobUpdates.mockReset();
    });

    it("should handle streaming text generation", async () => {
      // Setup mock to emit chunks synchronously
      mockNIP90Service.subscribeToJobUpdates.mockImplementation((params) =>
        Effect.sync(() => {
          params.onFeedback({ status: "partial", content: "First" });
          params.onFeedback({ status: "partial", content: "Second" });
          params.onFeedback({ status: "partial", content: "Final" });
          params.onResult({ content: "" }); // This will end the stream
          return () => { }; // Cleanup function
        })
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const stream = model.streamText({ prompt: "Test prompt" });
        const chunks = yield* _(Stream.runCollect(stream));

        expect(Array.from(chunks).map(chunk => chunk.text)).toEqual([
          "First",
          "Second",
          "Final"
        ]);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });

    it("should handle streaming errors", async () => {
      // Setup mock to emit error
      mockNIP90Service.subscribeToJobUpdates.mockImplementation((params) =>
        Effect.sync(() => {
          params.onFeedback({ status: "error", content: "Streaming error" });
          return () => { }; // Cleanup function
        })
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const stream = model.streamText({ prompt: "Test prompt" });
        const result = yield* _(Effect.either(Stream.runCollect(stream)));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("Streaming error");
        }
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });

    it("should handle normal completion", async () => {
      // Setup mock to emit chunks and complete normally
      mockNIP90Service.subscribeToJobUpdates.mockImplementation((params) =>
        Effect.sync(() => {
          params.onFeedback({ status: "partial", content: "Content" });
          params.onResult({ content: "Final content" }); // This will emit final content and end the stream
          return () => { }; // Cleanup function
        })
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const stream = model.streamText({ prompt: "Test prompt" });
        const chunks = yield* _(Stream.runCollect(stream));

        expect(Array.from(chunks).map(chunk => chunk.text)).toEqual([
          "Content",
          "Final content"
        ]);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });

  describe("generateStructured", () => {
    it("should return error for unsupported operation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel.Tag);
        const result = yield* _(
          Effect.either(
            model.generateStructured({
              prompt: "Test prompt",
              schema: { type: "object" },
            }),
          ),
        );
        expect(result._tag).toBe("Left");
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });
});
