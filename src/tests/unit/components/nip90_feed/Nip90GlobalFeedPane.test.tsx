import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nip90GlobalFeedPane from '@/components/nip90_feed/Nip90GlobalFeedPane';
import { NostrEvent } from '@/services/nostr/NostrService';
import { NIP90Service } from '@/services/nip90/NIP90Service';
import { Effect, Exit } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { useQuery } from '@tanstack/react-query';
import type { Mock } from 'vitest';

// Mock the @tanstack/react-query module
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

// Mock dependencies
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    context: {
      get: vi.fn((service) => {
        if (service === NIP90Service) return mockedNip90Service;
        if (service === TelemetryService) return mockedTelemetryService;
        return undefined;
      })
    }
  }))
}));

// Mock the bech32 encoder since we don't need actual encoding in tests
vi.mock('@scure/base', () => ({
  bech32: {
    encode: vi.fn((prefix, data) => `${prefix}1${Buffer.isBuffer(data) ? '0123456789abcdef' : data}`)
  }
}));

// Mock the ui components we're using
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
}));

// Variables to store mocks
let mockedNip90Service: Partial<NIP90Service>;
let mockedTelemetryService: Partial<TelemetryService>;
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
    
    // Mock NIP90Service
    mockedNip90Service = {
      listPublicEvents: vi.fn((limit = 50) => 
        Effect.succeed(mockEvents)
      ),
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

    // Mock useQuery to return the data
    (useQuery as Mock).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false
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
    (useQuery as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false
    });
    
    render(<Nip90GlobalFeedPane />);
    
    // Check for empty state message
    expect(screen.getByText('No NIP-90 events found on connected relays.')).toBeInTheDocument();
  });
  
  it('shows loading state', async () => {
    // Override the useQuery mock for this test
    (useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isFetching: true
    });
    
    render(<Nip90GlobalFeedPane />);
    
    // No specific loading UI to check, but the component should not crash
    expect(screen.getByText('NIP-90 Global Feed')).toBeInTheDocument();
  });
  
  it('shows error state', async () => {
    // Override the useQuery mock for this test
    (useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Test error'),
      refetch: vi.fn(),
      isFetching: false
    });
    
    render(<Nip90GlobalFeedPane />);
    
    // Check for error message
    expect(screen.getByText('Error Loading NIP-90 Events')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});