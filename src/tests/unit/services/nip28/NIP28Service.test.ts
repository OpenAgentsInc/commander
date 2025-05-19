// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit, Cause, Option } from 'effect';

import {
    NIP28Service,
    NIP28ServiceLive,
    NIP28InvalidInputError,
    NIP28PublishError,
    NIP28FetchError
} from '@/services/nip28';
import { DefaultTelemetryConfigLayer } from '@/services/telemetry';
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
const mockSubscribeToEvents = vi.fn(() => Effect.succeed({ unsub: vi.fn() }));

const MockNostrServiceLayer = Layer.succeed(NostrService, {
    getPool: () => Effect.succeed({} as any),
    publishEvent: mockPublishEvent,
    listEvents: mockListEvents,
    cleanupPool: () => Effect.succeed(undefined as void),
    subscribeToEvents: mockSubscribeToEvents
});

// Mock TelemetryService Layer
const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined as void)
});

// Helper function to create a test program
const createTestProgram = <A, E>(program: (service: NIP28Service) => Effect.Effect<A, E, NostrService>) => {
    // Use NIP28ServiceLive instead of createNIP28Service
    return Effect.gen(function* (_) {
        const service = yield* _(NIP28Service);
        return yield* _(program(service));
    }).pipe(
        Effect.provide(Layer.mergeAll(
            MockNostrServiceLayer,
            MockTelemetryServiceLayer,
            NIP28ServiceLive
        ))
    );
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
            
            // Create a test runtime with all necessary services
            const testRuntime = Effect.provide(program, Layer.provideMerge(
                Layer.mergeAll(MockNostrServiceLayer, MockTelemetryServiceLayer),
                DefaultTelemetryConfigLayer
            ));
            // Run the program with the test runtime
            const exit = await Effect.runPromiseExit(testRuntime);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            if (error instanceof NIP28InvalidInputError) {
                expect(error.message).toContain("Channel name is required");
            }
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
            
            // Create a test runtime with all necessary services
            const testRuntime = Effect.provide(program, Layer.provideMerge(
                Layer.mergeAll(MockNostrServiceLayer, MockTelemetryServiceLayer),
                DefaultTelemetryConfigLayer
            ));
            // Run the program with the test runtime
            const exit = await Effect.runPromiseExit(testRuntime);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            if (error instanceof NIP28InvalidInputError) {
                expect(error.message).toContain("Channel name is required");
            }
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
            
            // Create a test runtime with all necessary services
            const testRuntime = Effect.provide(program, Layer.provideMerge(
                Layer.mergeAll(MockNostrServiceLayer, MockTelemetryServiceLayer),
                DefaultTelemetryConfigLayer
            ));
            // Run the program with the test runtime
            const exit = await Effect.runPromiseExit(testRuntime);

            expect(Exit.isFailure(exit)).toBe(true);
            const error = getFailure(exit);
            expect(error).toBeInstanceOf(NIP28InvalidInputError);
            if (error instanceof NIP28InvalidInputError) {
                expect(error.message).toContain("Channel name is required");
            }
            expect(error.message).toContain("Message content cannot be empty");
            expect(mockPublishEvent).not.toHaveBeenCalled();
        });
    });
});