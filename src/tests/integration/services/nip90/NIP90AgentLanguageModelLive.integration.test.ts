import { Effect, Layer } from "effect";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AgentLanguageModel } from "@/services/ai/core";
import { AIProviderError } from "@/services/ai/core/AIError";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { generateSecretKey, getPublicKey } from "@/utils/nostr";
import { Stream } from "effect";

describe("NIP90AgentLanguageModelLive", () => {
  const mockConfig = {
    dvmPubkey: "mock-dvm-pubkey",
    dvmRelays: ["wss://mock-relay.com"],
    requestKind: 5100,
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: "mock-model",
    modelName: "Mock Model",
    isEnabled: true,
    temperature: 0.7,
    maxTokens: 2048,
  };

  let mockNIP90Service: NIP90Service;
  let mockNostrService: NostrService;
  let mockNIP04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<AgentLanguageModel>;

  beforeEach(() => {
    mockNIP90Service = {
      createJobRequest: vi.fn().mockImplementation(() =>
        Effect.succeed({
          id: "mock-job-id",
          kind: mockConfig.requestKind,
          content: "",
          tags: [],
          pubkey: mockConfig.dvmPubkey,
          created_at: Date.now() / 1000,
          sig: "mock-sig",
        })
      ),
      getJobResult: vi.fn().mockImplementation(() =>
        Effect.succeed({
          id: "mock-result-id",
          kind: mockConfig.requestKind + 1000,
          content: "Mock result",
          tags: [],
          pubkey: mockConfig.dvmPubkey,
          created_at: Date.now() / 1000,
          sig: "mock-sig",
        })
      ),
      subscribeToJobUpdates: vi.fn().mockImplementation(() =>
        Effect.succeed({
          unsub: vi.fn(),
        })
      ),
      listJobFeedback: vi.fn().mockImplementation(() => Effect.succeed([])),
      listPublicEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
    };

    mockNostrService = {
      publishEvent: vi.fn().mockImplementation(() => Effect.void),
      listEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
      getPool: vi.fn().mockImplementation(() => Effect.succeed({})),
      cleanupPool: vi.fn().mockImplementation(() => Effect.void),
      subscribeToEvents: vi.fn().mockImplementation(() =>
        Effect.succeed({
          unsub: vi.fn(),
        })
      ),
    };

    mockNIP04Service = {
      encrypt: vi.fn().mockImplementation(() => Effect.succeed("mock-encrypted")),
      decrypt: vi.fn().mockImplementation(() => Effect.succeed("mock-decrypted")),
    };

    mockTelemetryService = {
      logEvent: vi.fn().mockImplementation(() => Effect.void),
      logError: vi.fn().mockImplementation(() => Effect.void),
    };

    testLayer = Layer.mergeAll(
      Layer.succeed(NIP90ProviderConfigTag, mockConfig),
      Layer.succeed(NIP90Service, mockNIP90Service),
      Layer.succeed(NostrService, mockNostrService),
      Layer.succeed(NIP04Service, mockNIP04Service),
      Layer.succeed(TelemetryService, mockTelemetryService),
      NIP90AgentLanguageModelLive
    );
  });

  it("should handle text generation", async () => {
    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel);
      const response = yield* _(
        model.generateText({
          prompt: "Test prompt",
          temperature: 0.7,
          maxTokens: 100,
        })
      );
      expect(response.text).toBe("Mock result");
    });

    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
    expect(mockNIP90Service.getJobResult).toHaveBeenCalled();
  });

  it("should handle streaming text generation", async () => {
    const updates: string[] = [];

    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel);
      const stream = model.streamText({ prompt: "Test stream prompt" });
      yield* _(
        Stream.runForEach(stream, (chunk) => Effect.sync(() => updates.push(chunk.text)))
      );
    });

    await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    expect(mockNIP90Service.createJobRequest).toHaveBeenCalled();
    expect(mockNIP90Service.subscribeToJobUpdates).toHaveBeenCalled();
  });

  it("should handle errors in text generation", async () => {
    const errorLayer = Layer.mergeAll(
      Layer.succeed(NIP90ProviderConfigTag, mockConfig),
      Layer.succeed(
        NIP90Service,
        {
          ...mockNIP90Service,
          createJobRequest: vi.fn().mockImplementation(() =>
            Effect.fail({
              _tag: "NIP90RequestError",
              message: "Mock error",
            })
          ),
        }
      ),
      Layer.succeed(NostrService, mockNostrService),
      Layer.succeed(NIP04Service, mockNIP04Service),
      Layer.succeed(TelemetryService, mockTelemetryService),
      NIP90AgentLanguageModelLive
    );

    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel);
      try {
        yield* _(
          model.generateText({
            prompt: "Test error prompt",
          })
        );
        throw new Error("Should have failed");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        expect((error as AIProviderError).message).toContain("Mock error");
      }
    });

    await Effect.runPromise(program.pipe(Effect.provide(errorLayer)));
  });
});
