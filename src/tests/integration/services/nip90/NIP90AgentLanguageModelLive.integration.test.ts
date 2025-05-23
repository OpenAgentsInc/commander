import { Effect, Layer, Stream, Either } from "effect";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AgentLanguageModel } from "@/services/ai/core";
import { AiProviderError } from "@/services/ai/core/AIError";
import { NIP90Service } from "@/services/nip90";
import { NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { SparkServiceTestLive, TestSparkServiceConfigLayer } from "@/services/spark/SparkServiceTestImpl";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { generateSecretKey, getPublicKey } from "@/utils/nostr";

describe.skip("NIP90AgentLanguageModelLive", () => {
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
      trackEvent: vi.fn().mockImplementation(() => Effect.void),
      isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
      setEnabled: vi.fn().mockImplementation(() => Effect.void),
    };


    // Create dependencies layer
    const dependenciesLayer = Layer.mergeAll(
      Layer.succeed(NIP90ProviderConfigTag, mockConfig),
      Layer.succeed(NIP90Service, mockNIP90Service),
      Layer.succeed(NostrService, mockNostrService),
      Layer.succeed(NIP04Service, mockNIP04Service),
      Layer.succeed(TelemetryService, mockTelemetryService),
      SparkServiceTestLive,
      TestSparkServiceConfigLayer
    );

    // Provide dependencies to the NIP90AgentLanguageModelLive layer
    testLayer = NIP90AgentLanguageModelLive.pipe(
      Layer.provide(dependenciesLayer)
    );
  });

  it("should handle text generation", async () => {
    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel.Tag);
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
      const model = yield* _(AgentLanguageModel.Tag);
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
    const mockError = new AiProviderError({
      message: "Mock error",
      provider: "NIP90",
      isRetryable: false
    });

    const errorDependenciesLayer = Layer.mergeAll(
      Layer.succeed(NIP90ProviderConfigTag, mockConfig),
      Layer.succeed(
        NIP90Service,
        {
          ...mockNIP90Service,
          createJobRequest: vi.fn().mockImplementation(() =>
            Effect.fail(mockError)
          ),
        }
      ),
      Layer.succeed(NostrService, mockNostrService),
      Layer.succeed(NIP04Service, mockNIP04Service),
      Layer.succeed(TelemetryService, mockTelemetryService),
      SparkServiceTestLive,
      TestSparkServiceConfigLayer
    );

    const errorLayer = NIP90AgentLanguageModelLive.pipe(
      Layer.provide(errorDependenciesLayer)
    );

    const program = Effect.gen(function* (_) {
      const model = yield* _(AgentLanguageModel.Tag);
      const result = yield* _(
        Effect.either(
          model.generateText({
            prompt: "Test error prompt",
          })
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        const error = result.left;
        expect(error).toBeInstanceOf(AiProviderError);
        expect(error.message).toBe("Mock error");
        expect(error.provider).toBe("NIP90");
        expect(error.isRetryable).toBe(false);
      }
    });

    await Effect.runPromise(program.pipe(Effect.provide(errorLayer)));
  });
});
