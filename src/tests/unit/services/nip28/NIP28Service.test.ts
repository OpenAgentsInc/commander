// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit, Cause, Option, Context } from 'effect';
import { 
    NIP28Service, 
    NIP28ServiceLive, 
    NIP28InvalidInputError,
    NIP28PublishError,
    createNIP28Service 
} from '@/services/nip28';
import { NostrService } from '@/services/nostr';
import { TelemetryService } from '@/services/telemetry';
import { finalizeEvent } from 'nostr-tools/pure';
import type { NostrEvent } from '@/services/nostr';

// Create mocks
vi.mock('@/services/nostr', () => ({
    NostrService: {
        key: Symbol.for('NostrService')
    }
}));

vi.mock('@/services/telemetry', () => ({
    TelemetryService: {
        key: Symbol.for('TelemetryService')
    }
}));

// Mock nostr-tools/pure
vi.mock('nostr-tools/pure', () => ({
    finalizeEvent: vi.fn()
}));

// Test data
const testSk = new Uint8Array(32).fill(1);
const testPk = 'testpubkey123456789';

// Mocks for NostrService and TelemetryService
const mockPublishEvent = vi.fn();
const mockListEvents = vi.fn();
const mockTrackEvent = vi.fn();

const MockNostrServiceLayer = Layer.succeed(NostrService, {
    getPool: () => Effect.succeed({} as any),
    publishEvent: mockPublishEvent,
    listEvents: mockListEvents,
    cleanupPool: () => Effect.succeed(undefined as void)
});

const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined as void)
});

// This is the layer that provides the NIP28Service implementation,
// along with its mocked dependencies (NostrService and TelemetryService).
const TestServiceLayer = NIP28ServiceLive.pipe(
    Layer.provide(MockNostrServiceLayer),
    Layer.provide(MockTelemetryServiceLayer)
);

// Create a service instance directly for the simpler test approach
const directServiceInstance = createNIP28Service();

describe('NIP28Service validation tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock finalizeEvent for nostr-tools/pure, as it's used internally by NIP28ServiceImpl
        (finalizeEvent as ReturnType<typeof vi.fn>).mockImplementation((template: any, _sk: any) => ({
            ...template,
            id: 'mockeventid-' + Math.random(),
            pubkey: testPk, // Use consistent testPk
            sig: 'mocksig-' + Math.random(),
            tags: template.tags || [],
            content: template.content || '',
        }));
    });

    it('should validate input for createChannel', () => {
        // Test with synchronous validation
        expect(() => 
            directServiceInstance.createChannel({ 
                name: "", // Invalid: empty name
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });

    it('should validate input for setChannelMetadata', () => {
        expect(() => 
            directServiceInstance.setChannelMetadata({ 
                channelCreateEventId: "kind40eventid",
                // No actual metadata fields, which is invalid
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });

    it('should validate input for sendChannelMessage', () => {
        expect(() => 
            directServiceInstance.sendChannelMessage({ 
                channelCreateEventId: "channel123",
                content: "  ", // Invalid: empty content
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });
});