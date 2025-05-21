import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nip90GlobalFeedPane from '@/components/nip90_feed/Nip90GlobalFeedPane';
import { NostrService, NostrEvent } from '@/services/nostr/NostrService';
import { Effect, Layer, Exit } from 'effect';
import { TelemetryService } from '@/services/telemetry';

// Mock dependencies
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    context: {
      get: vi.fn((service) => {
        if (service === NostrService) return mockedNostrService;
        if (service === TelemetryService) return mockedTelemetryService;
        return undefined;
      })
    }
  }))
}));

// Mock the useQuery hook
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryFn }) => {
    // Store the function to call later
    lastQueryFn = queryFn;
    
    return {
      data: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false
    };
  })
}));

// Mock the bech32 encoder since we don't need actual encoding in tests
vi.mock('@scure/base', () => ({
  bech32: {
    encode: vi.fn((prefix, data) => `${prefix}1${Buffer.isBuffer(data) ? '0123456789abcdef' : data}`)
  }
}));

// Variables to store mocks
let mockedNostrService: NostrService;
let mockedTelemetryService: TelemetryService;
let lastQueryFn: () => Promise<NostrEvent[]>;
let mockEvents: NostrEvent[];

// Sample events for testing
const createSampleEvent = (kind: number): NostrEvent => ({
  id: `test-event-${kind}-${Math.random().toString(36).substring(2, 8)}`,
  pubkey: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  created_at: Math.floor(Date.now() / 1000),
  kind,
  tags: [
    ["e", "referenced-event"],
    ["p", "target-pubkey"],
    ...(kind === 7000 ? [["status", "success"]] : []),
    ...(kind >= 5000 && kind < 6000 ? [["i", "Example prompt", "text"]] : []),
  ],
  content: kind === 5100 ? "Input prompt" : "Response content",
  sig: "signature",
});

describe('Nip90GlobalFeedPane Component', () => {
  beforeEach(() => {
    // Create sample events of different kinds
    mockEvents = [
      createSampleEvent(5100), // Job request
      createSampleEvent(6100), // Job result
      createSampleEvent(7000), // Feedback
    ];
    
    // Mock NostrService
    mockedNostrService = {
      listPublicNip90Events: vi.fn((limit = 50) => 
        Effect.succeed(mockEvents)
      ),
      // Add other required methods with empty implementations
      getPool: vi.fn(() => Effect.succeed({} as any)),
      listEvents: vi.fn(() => Effect.succeed([])),
      publishEvent: vi.fn(() => Effect.succeed(undefined as void)),
      cleanupPool: vi.fn(() => Effect.succeed(undefined as void)),
      subscribeToEvents: vi.fn(() => Effect.succeed({ unsub: () => {} })),
    };
    
    // Mock TelemetryService
    mockedTelemetryService = {
      trackEvent: vi.fn(() => Effect.succeed(undefined as void)),
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn(() => Effect.succeed(undefined as void)),
    };
    
    // Mock the Effect.runPromiseExit for the query function
    vi.spyOn(Effect, 'runPromiseExit').mockImplementation(async () => {
      return Exit.succeed(mockEvents);
    });
  });
  
  it('renders the component with event cards', async () => {
    render(<Nip90GlobalFeedPane />);
    
    // Check that the title is rendered
    expect(screen.getByText('NIP-90 Global Feed')).toBeInTheDocument();
    
    // Check that cards are rendered for each event
    expect(screen.getByText('Job Request (5100)')).toBeInTheDocument();
    expect(screen.getByText('Job Result (6100)')).toBeInTheDocument();
    expect(screen.getByText('Feedback (success)')).toBeInTheDocument();
  });
  
  it('displays event content correctly', async () => {
    render(<Nip90GlobalFeedPane />);
    
    // Check that content is displayed
    expect(screen.getByText('Input prompt')).toBeInTheDocument();
    expect(screen.getByText('Response content')).toBeInTheDocument();
  });
  
  it('handles empty data gracefully', async () => {
    // Set mockEvents to empty to simulate no events found
    mockEvents = [];
    
    render(<Nip90GlobalFeedPane />);
    
    // Check for empty state message
    expect(screen.getByText('No NIP-90 events found on connected relays.')).toBeInTheDocument();
  });
  
  it('shows loading state', async () => {
    // Override the useQuery mock for this test
    vi.mocked(vi.hoisted(() => import('@tanstack/react-query'))).mockImplementation(() => ({
      useQuery: vi.fn(() => ({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isFetching: true
      }))
    }));
    
    render(<Nip90GlobalFeedPane />);
    
    // No specific loading UI to check, but the component should not crash
    expect(screen.getByText('NIP-90 Global Feed')).toBeInTheDocument();
  });
  
  it('shows error state', async () => {
    // Override the useQuery mock for this test
    vi.mocked(vi.hoisted(() => import('@tanstack/react-query'))).mockImplementation(() => ({
      useQuery: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: new Error('Test error'),
        refetch: vi.fn(),
        isFetching: false
      }))
    }));
    
    render(<Nip90GlobalFeedPane />);
    
    // Check for error message
    expect(screen.getByText('Error Loading NIP-90 Events')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});