// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit, Cause, Option } from 'effect';

import {
    NIP28Service,
    NIP28ServiceLive,
    NIP28InvalidInputError,
    NIP28PublishError,
    NIP28FetchError,
    createNIP28Service 
} from '@/services/nip28';
import {
    NostrService,
    type NostrEvent
} from '@/services/nostr';
import {
    TelemetryService
} from '@/services/telemetry';
import { finalizeEvent } from 'nostr-tools/pure';

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

// Define mocks for dependent services
const mockPublishEvent = vi.fn();
const mockListEvents = vi.fn();
const mockTrackEvent = vi.fn();

// Mock NostrService Layer
const MockNostrServiceLayer = Layer.succeed(NostrService, {
    getPool: () => Effect.succeed({} as any),
    publishEvent: mockPublishEvent,
    listEvents: mockListEvents,
    cleanupPool: () => Effect.succeed(undefined as void)
});

// Mock TelemetryService Layer
const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined as void)
});

// Helper function to create a test program
const createTestProgram = <A, E>(program: (service: NIP28Service) => Effect.Effect<A, E, NostrService>) => {
    const nip28Service = createNIP28Service();
    const effect = program(nip28Service);
    return Effect.provide(effect, MockNostrServiceLayer);
};

// Helper to extract success value
const getSuccess = <A, E>(exit: Exit.Exit<A, E>): A => {
    if (Exit.isSuccess(exit)) {
        return exit.value;
    }
    throw new Error(`Test Helper: Effect failed when success was expected. Cause: ${Cause.pretty(exit.cause)}`);
};

// Helper to extract failure value
const getFailure = <A, E>(exit: Exit.Exit<A, E>): E => {
    if (Exit.isFailure(exit)) {
        const errorOpt = Cause.failureOption(exit.cause);
        if (Option.isSome(errorOpt)) {
            return errorOpt.value;
        }
        throw new Error(`Test Helper: Effect failed, but no specific failure value found. Cause: ${Cause.pretty(exit.cause)}`);
    }
    throw new Error("Test Helper: Effect succeeded when failure was expected.");
};

describe('NIP28Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations for each test
        mockPublishEvent.mockImplementation(() => Effect.succeed(undefined as void));
        mockListEvents.mockImplementation(() => Effect.succeed([] as NostrEvent[]));
        mockTrackEvent.mockImplementation(() => Effect.succeed(undefined as void));
        // Mock finalizeEvent for nostr-tools/pure
        (finalizeEvent as ReturnType<typeof vi.fn>).mockImplementation((template: any, _sk: any) => ({
            ...template,
            id: 'mockeventid-' + Math.random(),
            pubkey: testPk,
            sig: 'mocksig-' + Math.random(),
            tags: template.tags || [],
            content: template.content || '',
        }));
    });

    describe('createChannel', () => {
        it('should fail with NIP28InvalidInputError if name is empty', async () => {
            const program = createTestProgram(service => 
                service.createChannel({ name: "", secretKey: testSk })
            );
            
            const exit = await Effect.runPromiseExit(program);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            expect(error.message).toContain("Channel name is required");
            expect(mockPublishEvent).not.toHaveBeenCalled();
        });
    });

    describe('setChannelMetadata', () => {
        it('should fail with NIP28InvalidInputError if no metadata fields are provided', async () => {
            const program = createTestProgram(service =>
                service.setChannelMetadata({
                    channelCreateEventId: "kind40eventid",
                    secretKey: testSk
                })
            );
            
            const exit = await Effect.runPromiseExit(program);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            expect(error.message).toContain("At least one metadata field");
            expect(mockPublishEvent).not.toHaveBeenCalled();
        });
    });

    describe('sendChannelMessage', () => {
        it('should fail with NIP28InvalidInputError if content is empty', async () => {
            const program = createTestProgram(service =>
                service.sendChannelMessage({
                    channelCreateEventId: "channel123",
                    content: "  ", // Invalid: empty content
                    secretKey: testSk
                })
            );
            
            const exit = await Effect.runPromiseExit(program);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            expect(error.message).toContain("Message content cannot be empty");
            expect(mockPublishEvent).not.toHaveBeenCalled();
        });
    });
});