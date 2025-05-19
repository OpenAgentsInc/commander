// src/tests/unit/services/nip28/NIP28Service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NIP28InvalidInputError, createNIP28Service } from '@/services/nip28';
import { NostrService } from '@/services/nostr';
import { TelemetryService } from '@/services/telemetry';

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
    finalizeEvent: vi.fn(() => ({
        id: 'mockeventid-123',
        pubkey: 'mock-pubkey-123456789',
        sig: 'mocksig-456',
        tags: [],
        content: ''
    }))
}));

// Test data
const testSk = new Uint8Array(32).fill(1);

describe('NIP28Service validation tests', () => {
    let service: ReturnType<typeof createNIP28Service>;
    
    beforeEach(() => {
        service = createNIP28Service();
        vi.clearAllMocks();
    });
    
    it('should validate input for createChannel', () => {
        expect(() => 
            service.createChannel({ 
                name: "", 
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });
    
    it('should validate input for setChannelMetadata', () => {
        expect(() => 
            service.setChannelMetadata({ 
                channelCreateEventId: "kind40eventid", 
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });
    
    it('should validate input for sendChannelMessage', () => {
        expect(() => 
            service.sendChannelMessage({ 
                channelCreateEventId: "channel123", 
                content: "  ", 
                secretKey: testSk 
            })
        ).toThrow(NIP28InvalidInputError);
    });
});