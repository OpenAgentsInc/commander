import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Context } from 'effect';
import {
  NIP90Service,
  NIP90ServiceLive,
  NIP90RequestError,
  NIP90ResultError,
  CreateNIP90JobParams,
  NIP90JobFeedback,
  NIP90JobResult
} from '@/services/nip90';
import { NostrEvent, NostrService } from '@/services/nostr';
import { NIP04Service } from '@/services/nip04';
import { TelemetryService } from '@/services/telemetry';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';

// Mock dependencies
vi.mock('@/helpers/nip90/event_creation', () => ({
  createNip90JobRequest: vi.fn()
}));

// Sample test data
const TEST_SK = new Uint8Array(32).fill(1);
const TEST_EVENT_ID = 'test-event-id';
const TEST_DVM_PUBKEY = 'test-dvm-pubkey';

describe('NIP90Service', () => {
  // Create test mocks for dependencies
  let mockNostrService: NostrService;
  let mockNip04Service: NIP04Service;
  let mockTelemetryService: TelemetryService;
  let testLayer: Layer.Layer<NIP90Service>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock implementations
    mockNostrService = {
      publishEvent: vi.fn().mockImplementation((event) => Effect.succeed(event)),
      listEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
      subscribeToEvents: vi.fn().mockImplementation(() => Effect.succeed({ unsub: () => {} }))
    } as unknown as NostrService;

    mockNip04Service = {
      encrypt: vi.fn().mockImplementation(() => Effect.succeed("encrypted-content")),
      decrypt: vi.fn().mockImplementation(() => Effect.succeed("decrypted-content"))
    } as unknown as NIP04Service;

    mockTelemetryService = {
      trackEvent: vi.fn().mockImplementation(() => Effect.void())
    } as unknown as TelemetryService;

    // Create test layer with mocked dependencies
    testLayer = Layer.provide(
      NIP90ServiceLive,
      Layer.succeed(NostrService, mockNostrService)
        .pipe(Layer.merge(Layer.succeed(NIP04Service, mockNip04Service)))
        .pipe(Layer.merge(Layer.succeed(TelemetryService, mockTelemetryService)))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createJobRequest', () => {
    it('should create and publish a job request successfully', async () => {
      // Arrange
      const mockJobEvent: NostrEvent = {
        id: 'test-event-id',
        pubkey: 'test-pubkey',
        created_at: 123456789,
        kind: 5100,
        tags: [['encrypted'], ['output', 'text/plain']],
        content: 'encrypted-content',
        sig: 'test-sig'
      };

      const mockCreateJobRequest = createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequest.mockReturnValue(Effect.succeed(mockJobEvent));

      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [['test input', 'text']],
        requesterSk: TEST_SK,
        outputMimeType: 'text/plain'
      };

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.createJobRequest(jobParams)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).toEqual(mockJobEvent);
      expect(mockTelemetryService.trackEvent).toHaveBeenCalledTimes(2); // start and success
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidJobParams = {
        // Missing required fields
        kind: 4999, // Invalid kind (should be 5000-5999)
        inputs: [['test input', 'invalid-type']],
        requesterSk: TEST_SK
      } as unknown as CreateNIP90JobParams;

      // Act & Assert
      await expect(
        Effect.runPromise(
          Effect.flatMap(
            NIP90Service,
            service => service.createJobRequest(invalidJobParams)
          ).pipe(Effect.provide(testLayer))
        )
      ).rejects.toThrow(/Invalid NIP-90 job request parameters/);
    });

    it('should handle encryption errors', async () => {
      // Arrange
      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [['test input', 'text']],
        requesterSk: TEST_SK,
        targetDvmPubkeyHex: TEST_DVM_PUBKEY,
        outputMimeType: 'text/plain'
      };

      const mockCreateJobRequest = createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequest.mockReturnValue(Effect.fail(new Error('Encryption failed')));

      // Act & Assert
      await expect(
        Effect.runPromise(
          Effect.flatMap(
            NIP90Service,
            service => service.createJobRequest(jobParams)
          ).pipe(Effect.provide(testLayer))
        )
      ).rejects.toThrow(/Encryption failed/);
    });

    it('should handle publishing errors', async () => {
      // Arrange
      const mockJobEvent: NostrEvent = {
        id: 'test-event-id',
        pubkey: 'test-pubkey',
        created_at: 123456789,
        kind: 5100,
        tags: [['encrypted'], ['output', 'text/plain']],
        content: 'encrypted-content',
        sig: 'test-sig'
      };

      const mockCreateJobRequest = createNip90JobRequest as unknown as ReturnType<typeof vi.fn>;
      mockCreateJobRequest.mockReturnValue(Effect.succeed(mockJobEvent));

      // Override publishEvent to simulate error
      mockNostrService.publishEvent = vi.fn().mockImplementation(() => 
        Effect.fail(new Error('Publishing failed'))
      );

      const jobParams: CreateNIP90JobParams = {
        kind: 5100,
        inputs: [['test input', 'text']],
        requesterSk: TEST_SK,
        outputMimeType: 'text/plain'
      };

      // Act & Assert
      await expect(
        Effect.runPromise(
          Effect.flatMap(
            NIP90Service,
            service => service.createJobRequest(jobParams)
          ).pipe(Effect.provide(testLayer))
        )
      ).rejects.toThrow(/Publishing failed/);
    });
  });

  describe('getJobResult', () => {
    it('should return null when no results are found', async () => {
      // Arrange
      mockNostrService.listEvents = vi.fn().mockImplementation(() => Effect.succeed([]));

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.getJobResult(TEST_EVENT_ID)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).toBeNull();
      expect(mockNostrService.listEvents).toHaveBeenCalledWith([{
        kinds: expect.arrayContaining([6000]), // Should include kinds 6000-6999
        '#e': [TEST_EVENT_ID],
        limit: 1
      }]);
    });

    it('should retrieve and return a job result', async () => {
      // Arrange
      const mockResultEvent: NostrEvent = {
        id: 'result-event-id',
        pubkey: TEST_DVM_PUBKEY,
        created_at: 123456789,
        kind: 6100, // Result kind
        tags: [
          ['e', TEST_EVENT_ID],
          ['request', '{"some":"request data"}'],
          ['amount', '1000', 'bolt11invoice']
        ],
        content: 'result-content',
        sig: 'test-sig'
      };

      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.succeed([mockResultEvent])
      );

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.getJobResult(TEST_EVENT_ID)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: 'result-event-id',
        kind: 6100,
        content: 'result-content',
        parsedRequest: { some: 'request data' },
        paymentAmount: 1000,
        paymentInvoice: 'bolt11invoice',
        isEncrypted: false
      });
    });

    it('should handle encrypted results when decryption key is provided', async () => {
      // Arrange
      const mockEncryptedResultEvent: NostrEvent = {
        id: 'encrypted-result-id',
        pubkey: TEST_DVM_PUBKEY,
        created_at: 123456789,
        kind: 6100,
        tags: [
          ['e', TEST_EVENT_ID],
          ['encrypted']
        ],
        content: 'encrypted-content',
        sig: 'test-sig'
      };

      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.succeed([mockEncryptedResultEvent])
      );

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.getJobResult(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.isEncrypted).toBe(true);
      expect(result?.content).toBe('decrypted-content');
      expect(mockNip04Service.decrypt).toHaveBeenCalledWith(
        TEST_SK,
        TEST_DVM_PUBKEY,
        'encrypted-content'
      );
    });

    it('should handle decryption failures', async () => {
      // Arrange
      const mockEncryptedResultEvent: NostrEvent = {
        id: 'encrypted-result-id',
        pubkey: TEST_DVM_PUBKEY,
        created_at: 123456789,
        kind: 6100,
        tags: [
          ['e', TEST_EVENT_ID],
          ['encrypted']
        ],
        content: 'encrypted-content',
        sig: 'test-sig'
      };

      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.succeed([mockEncryptedResultEvent])
      );

      mockNip04Service.decrypt = vi.fn().mockImplementation(() => 
        Effect.fail(new Error('Decryption failed'))
      );

      // Act & Assert
      await expect(
        Effect.runPromise(
          Effect.flatMap(
            NIP90Service,
            service => service.getJobResult(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK)
          ).pipe(Effect.provide(testLayer))
        )
      ).rejects.toThrow(/Decryption failed/);
    });
  });

  describe('listJobFeedback', () => {
    it('should return empty array when no feedback is found', async () => {
      // Arrange
      mockNostrService.listEvents = vi.fn().mockImplementation(() => Effect.succeed([]));

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.listJobFeedback(TEST_EVENT_ID)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockNostrService.listEvents).toHaveBeenCalledWith([{
        kinds: [7000],
        '#e': [TEST_EVENT_ID]
      }]);
    });

    it('should retrieve and return feedback events', async () => {
      // Arrange
      const mockFeedbackEvents: NostrEvent[] = [
        {
          id: 'feedback-1',
          pubkey: TEST_DVM_PUBKEY,
          created_at: 123456789,
          kind: 7000,
          tags: [
            ['e', TEST_EVENT_ID],
            ['status', 'processing']
          ],
          content: '',
          sig: 'test-sig'
        },
        {
          id: 'feedback-2',
          pubkey: TEST_DVM_PUBKEY,
          created_at: 123456790,
          kind: 7000,
          tags: [
            ['e', TEST_EVENT_ID],
            ['status', 'success'],
            ['amount', '2000']
          ],
          content: 'Completed successfully',
          sig: 'test-sig'
        }
      ];

      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.succeed(mockFeedbackEvents)
      );

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.listJobFeedback(TEST_EVENT_ID)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('processing');
      expect(result[1].status).toBe('success');
      expect(result[1].paymentAmount).toBe(2000);
    });

    it('should handle encrypted feedback when decryption key is provided', async () => {
      // Arrange
      const mockEncryptedFeedback: NostrEvent = {
        id: 'encrypted-feedback',
        pubkey: TEST_DVM_PUBKEY,
        created_at: 123456789,
        kind: 7000,
        tags: [
          ['e', TEST_EVENT_ID],
          ['status', 'payment-required'],
          ['encrypted']
        ],
        content: 'encrypted-content',
        sig: 'test-sig'
      };

      mockNostrService.listEvents = vi.fn().mockImplementation(() => 
        Effect.succeed([mockEncryptedFeedback])
      );

      // Act
      const result = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.listJobFeedback(TEST_EVENT_ID, TEST_DVM_PUBKEY, TEST_SK)
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('payment-required');
      expect(result[0].isEncrypted).toBe(true);
      expect(result[0].content).toBe('decrypted-content');
      expect(mockNip04Service.decrypt).toHaveBeenCalledWith(
        TEST_SK,
        TEST_DVM_PUBKEY,
        'encrypted-content'
      );
    });
  });

  describe('subscribeToJobUpdates', () => {
    it('should create a subscription for job updates', async () => {
      // Arrange
      const mockCallback = vi.fn();
      
      // Act
      const subscription = await Effect.runPromise(
        Effect.flatMap(
          NIP90Service,
          service => service.subscribeToJobUpdates(
            TEST_EVENT_ID,
            TEST_DVM_PUBKEY,
            TEST_SK,
            mockCallback
          )
        ).pipe(Effect.provide(testLayer))
      );

      // Assert
      expect(subscription).toHaveProperty('unsub');
      expect(mockNostrService.subscribeToEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kinds: expect.arrayContaining([6000]), // Should include 6000-6999
            '#e': [TEST_EVENT_ID],
            authors: [TEST_DVM_PUBKEY]
          }),
          expect.objectContaining({
            kinds: [7000],
            '#e': [TEST_EVENT_ID],
            authors: [TEST_DVM_PUBKEY]
          })
        ]),
        expect.any(Function)
      );
    });
  });
});