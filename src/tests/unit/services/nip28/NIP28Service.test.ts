// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer } from 'effect';
import { 
    NIP28InvalidInputError,
    createNIP28Service 
} from '@/services/nip28';
import { NostrService } from '@/services/nostr';
import { finalizeEvent } from 'nostr-tools/pure';

// Mock nostr-tools/pure
vi.mock('nostr-tools/pure', () => ({
    finalizeEvent: vi.fn()
}));

// Create mocks
vi.mock('@/services/nostr', () => ({
    NostrService: {
        key: Symbol.for('NostrService')
    }
}));

// Test data
const testSk = new Uint8Array(32).fill(1);
const testPk = 'testpubkey123456789';

// Setup mock NostrService
const mockNostrServiceLayer = Layer.succeed(NostrService, {
    getPool: () => Effect.succeed({} as any),
    publishEvent: vi.fn(() => Effect.succeed(undefined)),
    listEvents: vi.fn(() => Effect.succeed([])),
    cleanupPool: () => Effect.succeed(undefined as void)
});

// Create a service instance directly for testing
const nip28Service = createNIP28Service();

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

    // Helper function to run an effect with the mocked NostrService
    const runWithMocks = <A, E>(effect: Effect.Effect<A, E, NostrService>) => {
        return Effect.runPromise(Effect.provide(effect, mockNostrServiceLayer));
    };

    it('should validate input for createChannel', async () => {
        // Create an effect that will fail with validation
        const effect = nip28Service.createChannel({ 
            name: "", // Invalid: empty name
            secretKey: testSk
        });
        
        // For Effect.js, when runPromise is used, the error will be unwrapped
        // We expect it to fail with our validation error
        await expect(runWithMocks(effect)).rejects.toMatchObject({
            message: expect.stringContaining("Channel name is required")
        });
    });

    it('should validate input for setChannelMetadata', async () => {
        // No metadata fields provided, which should fail validation
        const effect = nip28Service.setChannelMetadata({ 
            channelCreateEventId: "kind40eventid", 
            secretKey: testSk
        });
        
        await expect(runWithMocks(effect)).rejects.toMatchObject({
            message: expect.stringContaining("At least one metadata field")
        });
    });

    it('should validate input for sendChannelMessage', async () => {
        // Empty content should fail validation
        const effect = nip28Service.sendChannelMessage({
            channelCreateEventId: "channel123",
            content: "  ", // Invalid: empty content
            secretKey: testSk
        });
        
        await expect(runWithMocks(effect)).rejects.toMatchObject({
            message: expect.stringContaining("Message content cannot be empty")
        });
    });
});