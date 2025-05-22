import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, pipe, Stream, Chunk } from "effect";
import { AgentLanguageModel, type AiTextChunk } from "@/services/ai/core";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { NIP90Service, type NIP90JobResult, type NIP90JobFeedback } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { generatePrivateKey, getPublicKey } from "@/utils/nostr";

describe("NIP90AgentLanguageModelLive Integration", () => {
  const mockConfig = {
    isEnabled: true,
    modelName: "test-model",
    dvmPubkey: "mock-dvm-pubkey",
    dvmRelays: ["wss://mock.relay"],
    requestKind: 5050,
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: "test-model",
    temperature: 0.7,
    maxTokens: 1000,
  };

  const mockNIP90Service: NIP90Service = {
    createJobRequest: (params) =>
      Effect.succeed({
        id: "mock-job-id",
        kind: params.kind,
        content: "mock-content",
        created_at: Date.now(),
        tags: [],
        pubkey: "mock-pubkey",
        sig: "mock-sig",
      }),

    getJobResult: (jobRequestEventId) =>
      Effect.succeed({
        id: jobRequestEventId,
        kind: 6050,
        content: "mock-result",
        created_at: Date.now(),
        tags: [],
        pubkey: "mock-pubkey",
        sig: "mock-sig",
      }),

    subscribeToJobUpdates: (jobRequestEventId, dvmPubkeyHex, decryptionKey, onUpdate) =>
      Effect.sync(() => {
        // Simulate feedback events
        onUpdate({
          id: "feedback-1",
          kind: 7000,
          content: "First chunk",
          created_at: Date.now(),
          tags: [],
          pubkey: dvmPubkeyHex,
          sig: "mock-sig",
          status: "partial",
        });

        onUpdate({
          id: "feedback-2",
          kind: 7000,
          content: "Second chunk",
          created_at: Date.now(),
          tags: [],
          pubkey: dvmPubkeyHex,
          sig: "mock-sig",
          status: "partial",
        });

        // Simulate final result
        onUpdate({
          id: "result",
          kind: 6050,
          content: "Final result",
          created_at: Date.now(),
          tags: [],
          pubkey: dvmPubkeyHex,
          sig: "mock-sig",
        });

        return {
          unsubscribe: () => {
            // Cleanup subscription
          },
        };
      }),

    listJobFeedback: (jobRequestEventId) =>
      Effect.succeed([
        {
          id: "feedback-1",
          kind: 7000,
          content: "First chunk",
          created_at: Date.now(),
          tags: [],
          pubkey: "mock-pubkey",
          sig: "mock-sig",
          status: "partial",
        },
      ]),

    listPublicEvents: () => Effect.succeed([]),
  };

  const mockNostrService: NostrService = {
    publishEvent: vi.fn().mockReturnValue(Effect.succeed({})),
    listEvents: vi.fn().mockReturnValue(Effect.succeed([])),
    getPool: vi.fn(),
    cleanupPool: vi.fn(),
    subscribeToEvents: vi.fn(),
    getPublicKey: vi.fn().mockReturnValue("mock-public-key"),
  };

  const mockNIP04Service: NIP04Service = {
    encrypt: vi.fn().mockReturnValue(Effect.succeed("encrypted")),
    decrypt: vi.fn().mockReturnValue(Effect.succeed("decrypted")),
  };

  const mockTelemetryService: TelemetryService = {
    isEnabled: vi.fn().mockReturnValue(true),
    setEnabled: vi.fn(),
    trackEvent: vi.fn().mockReturnValue(Effect.succeed(void 0)),
  };

  const testLayer = Layer.mergeAll(
    Layer.succeed(NIP90Service, mockNIP90Service),
    Layer.succeed(NostrService, mockNostrService),
    Layer.succeed(NIP04Service, mockNIP04Service),
    Layer.succeed(TelemetryService, mockTelemetryService),
    Layer.succeed(NIP90ProviderConfigTag, mockConfig),
    NIP90AgentLanguageModelLive,
  );

  describe("generateText", () => {
    it("should handle simple text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(model.generateText({ prompt: "Test prompt" }));
        expect(response.text).toBe("mock-result");
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle chat message format", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
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
        expect(response.text).toBe("mock-result");
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });

  describe("streamText", () => {
    it("should handle streaming text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test prompt" });
        const chunks = yield* _(Stream.runCollect(stream));

        const response = Array.from(chunks).map(chunk => chunk.text).join("");
        expect(response).toContain("First chunk");
        expect(response).toContain("Second chunk");
        expect(response).toContain("Final result");
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle streaming errors", async () => {
      // Override the mock to simulate an error
      const errorMockNIP90Service = {
        ...mockNIP90Service,
        subscribeToJobUpdates: () =>
          Effect.sync(() => {
            throw new Error("Streaming error");
          }),
      };

      const errorLayer = testLayer.pipe(
        Layer.provide(Layer.succeed(NIP90Service, errorMockNIP90Service)),
      );

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test prompt" });
        const result = yield* _(Effect.either(Stream.runCollect(stream)));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toContain("Streaming error");
        }
      });

      await Effect.runPromise(program.pipe(Effect.provide(errorLayer)));
    });

    it("should handle stream interruption", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "Test prompt" });
        const chunks = yield* _(Stream.runCollect(Stream.interruptWhen(stream, Effect.succeed(true))));

        expect(Array.from(chunks).length).toBe(0);
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });
});
