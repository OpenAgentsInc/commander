import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Stream, pipe } from "effect";
import { NIP90AgentLanguageModelLive } from "@/services/ai/providers/nip90/NIP90AgentLanguageModelLive";
import { AgentLanguageModel } from "@/services/ai/core";
import { NIP90Service } from "@/services/nip90";
import { TelemetryService } from "@/services/telemetry";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import { createMockDVM, type MockDVM } from "./MockDVM";

describe("NIP90AgentLanguageModelLive Integration", () => {
  let mockDVM: MockDVM;
  let mockNIP90Service: NIP90Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<never, never, AgentLanguageModel>;

  beforeEach(() => {
    // Create mock DVM with custom configuration
    mockDVM = createMockDVM({
      streamingDelay: 50, // Faster for tests
      chunkSize: 5,
      errorRate: 0.1, // 10% chance of errors
      defaultResponse: "Integration test response",
    });

    // Create NIP90Service implementation that uses the mock DVM
    mockNIP90Service = {
      createJobRequest: async (params) => {
        const jobId = `test-${Date.now()}`;
        // Start handling the job in the background
        mockDVM.handleJobRequest(
          jobId,
          params.inputs[0][0],
          !!params.targetDvmPubkeyHex
        );
        return { id: jobId };
      },

      getJobResult: (jobId) => {
        return new Promise((resolve) => {
          const handler = (result: any) => {
            if (result.id === jobId) {
              mockDVM.off("result", handler);
              resolve(result);
            }
          };
          mockDVM.on("result", handler);
        });
      },

      subscribeToJobUpdates: (jobId, pubkey, sk, callback) => {
        const resultHandler = (result: any) => {
          if (result.id === jobId) callback(result);
        };
        const feedbackHandler = (feedback: any) => {
          if (feedback.id === jobId) callback(feedback);
        };

        mockDVM.on("result", resultHandler);
        mockDVM.on("feedback", feedbackHandler);

        return {
          unsubscribe: () => {
            mockDVM.off("result", resultHandler);
            mockDVM.off("feedback", feedbackHandler);
          },
        };
      },

      listJobFeedback: () => Promise.resolve([]),
      listPublicEvents: () => Promise.resolve([]),
    };

    // Create mock telemetry service
    mockTelemetryService = {
      trackEvent: () => Effect.unit(),
    };

    // Create test configuration
    const mockConfig = {
      dvmPubkey: mockDVM.publicKey,
      dvmRelays: ["wss://test.relay"],
      requestKind: 5050,
      requiresEncryption: true,
      useEphemeralRequests: true,
      modelIdentifier: "mock-model",
      modelName: "Mock Model",
      temperature: 0.7,
      maxTokens: 1000,
    };

    // Create test layer
    testLayer = Layer.mergeAll(
      Layer.succeed(NIP90Service, mockNIP90Service),
      Layer.succeed(TelemetryService, mockTelemetryService),
      Layer.succeed(NIP90ProviderConfigTag, mockConfig),
      NIP90AgentLanguageModelLive
    );
  });

  afterEach(() => {
    mockDVM.removeAllListeners();
  });

  describe("Integration Tests", () => {
    it("should handle basic text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(
          model.generateText({ prompt: "test prompt" })
        );
        return response.text;
      });

      const result = await pipe(
        program,
        Effect.provide(testLayer),
        Effect.runPromise
      );

      expect(result).toBe("This is a test response from the mock DVM.");
    });

    it("should handle streaming text generation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({ prompt: "hello" });
        return yield* _(Stream.runCollect(stream));
      });

      const chunks = await pipe(
        program,
        Effect.provide(testLayer),
        Effect.runPromise
      );

      const response = chunks.map(chunk => chunk.text).join("");
      expect(response).toBe("Hello! I am a mock DVM. How can I help you today?");
    });

    it("should handle errors from DVM", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        return yield* _(
          model.generateText({ prompt: "trigger error" })
        );
      });

      await expect(
        pipe(program, Effect.provide(testLayer), Effect.runPromise)
      ).rejects.toThrow();
    });

    it("should handle chat message format", async () => {
      const chatPrompt = JSON.stringify({
        messages: [
          { role: "system", content: "You are a test AI", timestamp: Date.now() },
          { role: "user", content: "test", timestamp: Date.now() },
        ],
      });

      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const response = yield* _(
          model.generateText({ prompt: chatPrompt })
        );
        return response.text;
      });

      const result = await pipe(
        program,
        Effect.provide(testLayer),
        Effect.runPromise
      );

      expect(result).toBe("This is a test response from the mock DVM.");
    });

    it("should handle streaming cancellation", async () => {
      const program = Effect.gen(function* (_) {
        const model = yield* _(AgentLanguageModel);
        const stream = model.streamText({
          prompt: "a very long response that will be cancelled",
        });

        // Start collecting chunks but cancel after a short delay
        const collectionPromise = Stream.runCollect(stream);

        // Wait a bit then cancel the stream
        yield* _(Effect.sleep(100));
        yield* _(Stream.interruptWith(stream));

        return yield* _(collectionPromise);
      });

      const chunks = await pipe(
        program,
        Effect.provide(testLayer),
        Effect.runPromise
      );

      // We should have received some chunks before cancellation
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(10); // Should not have completed
    });
  });
});
