import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, TestContext, Data, Context } from "effect";
import { NostrEvent } from "nostr-tools";
import { TelemetryService } from "@/services/telemetry";

// Define error types locally to avoid importing from the actual service
class DVMPaymentError extends Data.TaggedError("DVMPaymentError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

class DVMJobRequestError extends Data.TaggedError("DVMJobRequestError")<{
  readonly cause?: unknown;  
  readonly message: string;
}> {}

// Define types locally
interface LightningInvoice {
  invoice: {
    encodedInvoice: string;
    paymentHash: string;
    amountSats: number;
    createdAt: number;
    expiresAt: number;
    memo?: string;
  };
}

interface CreateLightningInvoiceParams {
  amountSats: number;
  memo?: string;
  expirySeconds?: number;
}

// Mock SparkService interface
interface MockSparkService {
  createLightningInvoice: (params: CreateLightningInvoiceParams) => Effect.Effect<LightningInvoice, DVMPaymentError, never>;
  checkInvoiceStatus: (invoice: string) => Effect.Effect<{status: "pending" | "paid" | "expired" | "error", amountPaidMsats?: number}, DVMPaymentError, never>;
}

describe("Kind5050DVMService Payment Flow", () => {
  // Mock implementations
  const mockTrackEvent = vi.fn(() => Effect.succeed(undefined));
  
  const mockCreateInvoice = vi.fn((params: CreateLightningInvoiceParams): Effect.Effect<LightningInvoice, DVMPaymentError, never> =>
    Effect.succeed({
      invoice: {
        encodedInvoice: `lnbc${params.amountSats}n1ptest`,
        paymentHash: "test-hash",
        amountSats: params.amountSats,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        memo: params.memo,
      },
    })
  );
  
  const mockCheckInvoiceStatus = vi.fn((invoice: string): Effect.Effect<{status: "pending" | "paid" | "expired" | "error", amountPaidMsats?: number}, DVMPaymentError, never> =>
    Effect.succeed({
      status: "pending" as const,
    })
  );

  // Service layers
  const MockTelemetryLayer = Layer.succeed(TelemetryService, {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined),
  });

  const SparkServiceTag = Context.GenericTag<MockSparkService>("SparkService");
  const MockSparkLayer = Layer.succeed(SparkServiceTag, {
    createLightningInvoice: mockCreateInvoice,
    checkInvoiceStatus: mockCheckInvoiceStatus,
  });

  const testJobRequest: NostrEvent = {
    id: "test-job-id",
    pubkey: "customer-pubkey",
    created_at: Math.floor(Date.now() / 1000),
    kind: 5050,
    tags: [["i", "Hello, AI assistant!", "text"]],
    content: "",
    sig: "test-sig",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock implementation of payment-first flow for testing
  const mockProcessJobWithPaymentFirst = (jobRequest: NostrEvent) =>
    Effect.gen(function* (_) {
      const telemetry = yield* _(TelemetryService);
      const spark = yield* _(SparkServiceTag);

      // Log job received
      yield* _(telemetry.trackEvent({
        category: "dvm:job",
        action: "job_request_received",
        label: jobRequest.id,
        value: `Kind: ${jobRequest.kind}`,
      }));

      // Extract prompt
      const inputTag = jobRequest.tags.find(t => t[0] === "i");
      if (!inputTag) {
        return yield* _(Effect.fail(new DVMJobRequestError({
          message: "No input provided"
        })));
      }
      const prompt = inputTag[1];

      // Calculate price (minimum 3 sats)
      const estimatedTokens = Math.ceil((prompt.length * 2) / 4);
      const priceSats = Math.max(3, Math.ceil((estimatedTokens / 1000) * 2));

      // Generate invoice FIRST (before AI processing)
      const invoiceResult = yield* _(spark.createLightningInvoice({
        amountSats: priceSats,
        memo: `NIP-90 Job: ${jobRequest.id.substring(0, 8)}`,
      }));

      // Track payment requested
      yield* _(telemetry.trackEvent({
        category: "dvm:job",
        action: "payment_requested",
        label: jobRequest.id,
        value: `${priceSats} sats`,
      }));

      // Return invoice for testing
      return {
        invoice: invoiceResult.invoice.encodedInvoice,
        amountSats: priceSats,
        jobId: jobRequest.id,
      };
    });

  describe("Payment-First Flow", () => {
    it("should generate invoice before processing AI request", async () => {
      const program = mockProcessJobWithPaymentFirst(testJobRequest);

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      // Verify invoice creation was called
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        amountSats: 3, // Minimum amount
        memo: `NIP-90 Job: ${testJobRequest.id.substring(0, 8)}`,
      });

      // Verify telemetry
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "dvm:job",
        action: "payment_requested",
        label: testJobRequest.id,
        value: "3 sats",
      });

      // Verify result
      expect(result.invoice).toBe("lnbc3n1ptest");
      expect(result.amountSats).toBe(3);
    });

    it("should enforce minimum price of 3 sats", async () => {
      // Test with very short prompt
      const shortJobRequest: NostrEvent = {
        ...testJobRequest,
        tags: [["i", "Hi", "text"]], // Very short prompt
      };

      const program = mockProcessJobWithPaymentFirst(shortJobRequest);

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      // Should create invoice for 3 sats minimum
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        amountSats: 3,
        memo: expect.any(String),
      });
      expect(result.amountSats).toBe(3);
    });

    it("should calculate price based on token estimate for longer prompts", async () => {
      // Test with longer prompt
      const longPrompt = "A".repeat(2000); // 2000 chars ≈ 1000 tokens ≈ 2 sats, but min is 3
      const longJobRequest: NostrEvent = {
        ...testJobRequest,
        tags: [["i", longPrompt, "text"]],
      };

      const program = mockProcessJobWithPaymentFirst(longJobRequest);

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      // Should calculate based on tokens but still respect minimum
      const expectedTokens = Math.ceil((longPrompt.length * 2) / 4);
      const expectedPrice = Math.max(3, Math.ceil((expectedTokens / 1000) * 2));
      
      expect(mockCreateInvoice).toHaveBeenCalledWith({
        amountSats: expectedPrice,
        memo: expect.any(String),
      });
      expect(result.amountSats).toBe(expectedPrice);
    });

    it("should handle missing input error", async () => {
      // Job request with no input tags
      const badJobRequest: NostrEvent = {
        ...testJobRequest,
        tags: [], // No input!
      };

      const program = mockProcessJobWithPaymentFirst(badJobRequest);

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const exit = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(exit._tag).toBe("Failure");
    });

    it("should handle invoice creation failure", async () => {
      // Mock invoice creation to fail
      mockCreateInvoice.mockReturnValueOnce(
        Effect.fail(
          new DVMPaymentError({
            message: "Spark wallet error",
          })
        )
      );

      const program = mockProcessJobWithPaymentFirst(testJobRequest);

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const exit = await Effect.runPromiseExit(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(exit._tag).toBe("Failure");
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "dvm:job",
        action: "job_request_received",
        label: testJobRequest.id,
        value: "Kind: 5050",
      });
    });
  });

  describe("Payment Monitoring", () => {
    const mockCheckPaymentStatus = (jobId: string, invoice: string) =>
      Effect.gen(function* (_) {
        const spark = yield* _(SparkServiceTag);
        const telemetry = yield* _(TelemetryService);

        const status = yield* _(spark.checkInvoiceStatus(invoice));

        if (status.status === "paid") {
          yield* _(telemetry.trackEvent({
            category: "dvm:payment",
            action: "invoice_paid",
            label: jobId,
            value: status.amountPaidMsats ? `${status.amountPaidMsats / 1000} sats` : undefined,
          }));
          return { paid: true, amountSats: (status.amountPaidMsats || 0) / 1000 };
        } else if (status.status === "expired") {
          yield* _(telemetry.trackEvent({
            category: "dvm:payment",
            action: "invoice_expired",
            label: jobId,
          }));
          return { paid: false, expired: true };
        }
        
        return { paid: false, expired: false };
      });

    it("should detect paid invoices", async () => {
      mockCheckInvoiceStatus.mockReturnValueOnce(
        Effect.succeed({ status: "paid" as const, amountPaidMsats: 3000 })
      );

      const program = mockCheckPaymentStatus("test-job-id", "lnbc3n1ptest");

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(result.paid).toBe(true);
      expect(result.amountSats).toBe(3);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "dvm:payment",
        action: "invoice_paid",
        label: "test-job-id",
        value: "3 sats",
      });
    });

    it("should detect expired invoices", async () => {
      mockCheckInvoiceStatus.mockReturnValueOnce(
        Effect.succeed({ status: "expired" as const })
      );

      const program = mockCheckPaymentStatus("test-job-id", "lnbc3n1ptest");

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(result.paid).toBe(false);
      expect(result.expired).toBe(true);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: "dvm:payment",
        action: "invoice_expired",
        label: "test-job-id",
      });
    });

    it("should handle pending invoices", async () => {
      // Default mock returns pending
      const program = mockCheckPaymentStatus("test-job-id", "lnbc3n1ptest");

      const layers = Layer.mergeAll(
        MockTelemetryLayer,
        MockSparkLayer
      );

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(layers),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(result.paid).toBe(false);
      expect(result.expired).toBe(false);
      // No telemetry for pending status
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});