import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Context } from "effect";
import {
  NIP90Service,
  NIP90ServiceLive,
  NIP90RequestError,
  NIP90ResultError,
  NIP90ValidationError,
  CreateNIP90JobParams,
  NIP90JobFeedback,
  NIP90JobResult,
} from "@/services/nip90";
import { NostrEvent, NostrService } from "@/services/nostr";
import { NIP04Service } from "@/services/nip04";
import { TelemetryService } from "@/services/telemetry";
import { createNip90JobRequest } from "@/helpers/nip90/event_creation";

// Mock dependencies
vi.mock("@/helpers/nip90/event_creation", () => ({
  createNip90JobRequest: vi.fn(),
}));

// Sample test data
const TEST_SK = new Uint8Array(32).fill(1);
const TEST_EVENT_ID = "test-event-id";
const TEST_DVM_PUBKEY = "test-dvm-pubkey";

describe.skip("NIP90Service", () => {
  // Create test mocks for dependencies
  let mockNostrService: NostrService;
  let mockNip04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<NIP90Service>; // This layer provides NIP90ServiceLive and its dependencies

  // Helper function to properly handle Effect context requirements in tests
  // The input 'effect' depends on NIP90Service, and this function provides testLayer which satisfies it
  function runEffectTest<A, E>(
    effect: Effect.Effect<A, E, NIP90Service>,
  ): Effect.Effect<A, E, never> {
    return Effect.provide(effect, testLayer);
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock implementations with R = never
    mockNostrService = {
      publishEvent: vi
        .fn()
        .mockImplementation(() => Effect.succeed(undefined as void)),
      listEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
      subscribeToEvents: vi
        .fn()
        .mockImplementation(() => Effect.succeed({ unsub: vi.fn() })),
      getPool: vi.fn().mockImplementation(() => Effect.succeed({} as any)),
      cleanupPool: vi
        .fn()
        .mockImplementation(() => Effect.succeed(undefined as void)),
    };

    mockNip04Service = {
      encrypt: vi
        .fn()
        .mockImplementation(() => Effect.succeed("encrypted-content")),
      decrypt: vi
        .fn()
        .mockImplementation(() => Effect.succeed("decrypted-content")),
    };

    mockTelemetryService = {
      trackEvent: vi
        .fn()
        .mockImplementation(() => Effect.succeed(undefined as void)),
      isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
      setEnabled: vi
        .fn()
        .mockImplementation(() => Effect.succeed(undefined as void)),
    };

    // Create test layer with mocked dependencies
    // This layer provides NIP90ServiceLive, which in turn depends on NostrService, NIP04Service, and TelemetryService.
    // We provide mock implementations for these dependencies here.
    testLayer = Layer.provide(
      NIP90ServiceLive,
      Layer.succeed(NostrService, mockNostrService)
        .pipe(Layer.merge(Layer.succeed(NIP04Service, mockNip04Service)))
        .pipe(
          Layer.merge(Layer.succeed(TelemetryService, mockTelemetryService)),
        ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createJobRequest", () => {
    it("should create and publish a job request successfully", async () => {
      // Arrange
      const mockJobEvent: NostrEvent = {
        id: "test-event-id",
        pubkey: "test-pubkey",
        created_at: 123456789,
        kind: 5100,
        tags: [["encrypted"], ["output", "text/plain"]],
        content: "encrypted-content",
        sig: "test-sig",
      };

      const mockCreateJobRequestHelper =
        createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequestHelper.mockReturnValue(Effect.succeed(mockJobEvent));

      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [["test input", "text"]],
        requesterSk: TEST_SK,
        outputMimeType: "text/plain",
      };

      // Act
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.createJobRequest(jobParams),
      );
      const result = await Effect.runPromise(runEffectTest(program));

      // Assert
      expect(result).toEqual(mockJobEvent);
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledTimes(2); // start and success
    });

    it("should handle validation errors", async () => {
      // Arrange
      const invalidJobParams = {
        kind: 4999,
        inputs: [["test input", "invalid-type" as any]],
        requesterSk: TEST_SK,
      } as unknown as CreateNIP90JobParams;

      const program = Effect.flatMap(NIP90Service, (service) =>
        service.createJobRequest(invalidJobParams),
      );

      await expect(Effect.runPromise(runEffectTest(program))).rejects.toThrow(
        /Invalid NIP-90 job request parameters/,
      );

      try {
        await Effect.runPromise(runEffectTest(program));
        expect.fail("Should have thrown error");
      } catch (e: unknown) {
        // Just verify that we got a thrown error containing our error message
        // The exact error structure will depend on how Effect wraps the errors
        const errorString = String(e);
        expect(errorString).toContain("Invalid NIP-90 job request parameters");
        expect(errorString).toContain("NIP90ValidationError");
      }

      expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nip90_validation_error",
        }),
      );
    });

    it("should handle encryption errors", async () => {
      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [["test input", "text"]],
        requesterSk: TEST_SK,
        targetDvmPubkeyHex: TEST_DVM_PUBKEY,
        outputMimeType: "text/plain",
      };

      const mockCreateJobRequestHelper =
        createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequestHelper.mockReturnValue(
        Effect.fail(new Error("Encryption failed")),
      );

      const program = Effect.flatMap(NIP90Service, (service) =>
        service.createJobRequest(jobParams),
      );
      await expect(Effect.runPromise(runEffectTest(program))).rejects.toThrow(
        /Encryption failed/,
      );
    });

    it("should handle publishing errors", async () => {
      const mockJobEvent: NostrEvent = {
        id: "test",
        pubkey: "pk",
        kind: 5000,
        created_at: 0,
        tags: [],
        content: "",
        sig: "",
      };
      const mockCreateJobRequestHelper =
        createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequestHelper.mockReturnValue(Effect.succeed(mockJobEvent));

      mockNostrService.publishEvent = vi
        .fn()
        .mockImplementation(() => Effect.fail(new Error("Publishing failed")));

      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [["test input", "text"]],
        requesterSk: TEST_SK,
        outputMimeType: "text/plain",
      };
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.createJobRequest(jobParams),
      );
      await expect(Effect.runPromise(runEffectTest(program))).rejects.toThrow(
        /Publishing failed/,
      );
    });
  });

  describe("getJobResult", () => {
    it("should return null when no results are found", async () => {
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([]));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.getJobResult(TEST_EVENT_ID),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect(result).toBeNull();
    });

    it("should retrieve and return a job result", async () => {
      const mockResultEvent: NostrEvent = {
        id: "res1",
        kind: 6100,
        pubkey: "dvm",
        created_at: 1,
        tags: [
          ["e", TEST_EVENT_ID],
          ["request", "{}"],
        ],
        content: "res",
        sig: "s",
      };
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([mockResultEvent]));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.getJobResult(TEST_EVENT_ID),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect(result).toMatchObject({ id: "res1" });
    });

    it("should handle encrypted results when decryption key is provided", async () => {
      const mockEncryptedResultEvent: NostrEvent = {
        id: "encRes",
        kind: 6100,
        pubkey: TEST_DVM_PUBKEY,
        created_at: 1,
        tags: [["e", TEST_EVENT_ID], ["encrypted"]],
        content: "enc",
        sig: "s",
      };
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([mockEncryptedResultEvent]));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.getJobResult(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect(result?.content).toBe("decrypted-content");
    });

    it("should handle decryption failures", async () => {
      const mockEncryptedResultEvent: NostrEvent = {
        id: "encResFail",
        kind: 6100,
        pubkey: TEST_DVM_PUBKEY,
        created_at: 1,
        tags: [["e", TEST_EVENT_ID], ["encrypted"]],
        content: "enc",
        sig: "s",
      };
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([mockEncryptedResultEvent]));
      mockNip04Service.decrypt = vi
        .fn()
        .mockImplementation(() => Effect.fail(new Error("Decryption failed")));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.getJobResult(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK),
      );
      await expect(Effect.runPromise(runEffectTest(program))).rejects.toThrow(
        /Decryption failed/,
      );
    });
  });

  describe("listJobFeedback", () => {
    it("should return empty array when no feedback is found", async () => {
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([]));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.listJobFeedback(TEST_EVENT_ID),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect(result).toEqual([]);
    });

    it("should retrieve and return feedback events", async () => {
      const mockFeedbackEvents: NostrEvent[] = [
        {
          id: "fb1",
          kind: 7000,
          pubkey: "dvm",
          created_at: 1,
          tags: [
            ["e", TEST_EVENT_ID],
            ["status", "processing"],
          ],
          content: "",
          sig: "s",
        },
      ];
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed(mockFeedbackEvents));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.listJobFeedback(TEST_EVENT_ID),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect(result).toHaveLength(1);
      expect((result[0] as NIP90JobFeedback).status).toBe("processing");
    });

    it("should handle encrypted feedback when decryption key is provided", async () => {
      const mockEncFeedback: NostrEvent = {
        id: "encFb",
        kind: 7000,
        pubkey: TEST_DVM_PUBKEY,
        created_at: 1,
        tags: [["e", TEST_EVENT_ID], ["encrypted"]],
        content: "encFb",
        sig: "s",
      };
      mockNostrService.listEvents = vi
        .fn()
        .mockImplementation(() => Effect.succeed([mockEncFeedback]));
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.listJobFeedback(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK),
      );
      const result = await Effect.runPromise(runEffectTest(program));
      expect((result[0] as NIP90JobFeedback).content).toBe("decrypted-content");
    });
  });

  describe("subscribeToJobUpdates", () => {
    it("should create a subscription for job updates", async () => {
      const mockCallback = vi.fn();
      const program = Effect.flatMap(NIP90Service, (service) =>
        service.subscribeToJobUpdates(
          TEST_EVENT_ID,
          TEST_DVM_PUBKEY,
          TEST_SK,
          mockCallback,
        ),
      );
      const subscription = await Effect.runPromise(runEffectTest(program));
      expect(subscription).toHaveProperty("unsub");
      expect(mockNostrService.subscribeToEvents).toHaveBeenCalled();
    });
  });
});
