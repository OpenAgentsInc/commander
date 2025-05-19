// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { NIP28Service, NIP28ServiceLive, NIP28InvalidInputError } from '@/services/nip28';
import { NostrService } from '@/services/nostr';
import { TelemetryService } from '@/services/telemetry';

// Mock nostr-tools/pure must be defined before importing
vi.mock('nostr-tools/pure', () => {
    return {
        finalizeEvent: vi.fn((template) => {
            return {
                ...template,
                id: 'mockeventid-123',
                pubkey: 'mock-pubkey-123456789',
                sig: 'mocksig-456',
                tags: template.tags || [],
                content: template.content || '',
            };
        }),
        getPublicKey: () => 'mock-pubkey-123456789',
        generateSecretKey: () => new Uint8Array(32).fill(1)
    };
});

// Mock TelemetryService
const mockTrackEvent = vi.fn().mockImplementation(() => Effect.succeed(undefined));
const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined)
});

// Mock NostrService
const mockPublishEvent = vi.fn().mockImplementation(() => Effect.succeed(undefined));
const mockListEvents = vi.fn().mockImplementation(() => Effect.succeed([]));
const MockNostrServiceLayer = Layer.succeed(NostrService, {
    getPool: Effect.succeed({}),
    publishEvent: mockPublishEvent,
    listEvents: mockListEvents,
    cleanupPool: Effect.succeed(undefined)
});

// Create test secret key
const testSk = new Uint8Array(32).fill(1);
const testPk = 'mock-pubkey-123456789';

// Combine the mocked layers
const TestServiceLayer = Layer.provide(
    NIP28ServiceLive,
    Layer.merge(MockNostrServiceLayer, MockTelemetryServiceLayer)
);

describe('NIP28Service - Basic functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate input for createChannel', async () => {
        // Test the validation for empty name
        const program = Effect.gen(function* (_) {
            const service = yield* _(NIP28Service);
            return yield* _(service.createChannel({ 
                name: "", 
                secretKey: testSk 
            }));
        });
        
        const result = await Effect.runPromiseExit(Effect.provide(program, TestServiceLayer));
        
        expect(result._tag).toBe('Failure');
        expect(result.cause._tag).toBe('Fail');
        expect(result.cause.error).toBeInstanceOf(NIP28InvalidInputError);
    });
    
    it('should validate input for setChannelMetadata', async () => {
        // Test the validation for no metadata fields
        const program = Effect.gen(function* (_) {
            const service = yield* _(NIP28Service);
            return yield* _(service.setChannelMetadata({ 
                channelCreateEventId: "kind40eventid", 
                secretKey: testSk 
            }));
        });
        
        const result = await Effect.runPromiseExit(Effect.provide(program, TestServiceLayer));
        
        expect(result._tag).toBe('Failure');
        expect(result.cause._tag).toBe('Fail');
        expect(result.cause.error).toBeInstanceOf(NIP28InvalidInputError);
    });
    
    it('should validate input for sendChannelMessage', async () => {
        // Test the validation for empty content
        const program = Effect.gen(function* (_) {
            const service = yield* _(NIP28Service);
            return yield* _(service.sendChannelMessage({ 
                channelCreateEventId: "channel123", 
                content: "  ", 
                secretKey: testSk 
            }));
        });
        
        const result = await Effect.runPromiseExit(Effect.provide(program, TestServiceLayer));
        
        expect(result._tag).toBe('Failure');
        expect(result.cause._tag).toBe('Fail');
        expect(result.cause.error).toBeInstanceOf(NIP28InvalidInputError);
    });
});