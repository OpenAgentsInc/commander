import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
// import userEvent from '@testing-library/user-event'; // Not used in current tests
import type { Mock } from "vitest";

// Set test environment
process.env.NODE_ENV = "test";

// Mock Effect module
vi.mock("effect", async (importOriginal) => {
  const actual = await importOriginal<typeof import("effect")>();
  return {
    ...actual, // Preserve all original exports (Exit, Cause, Schema, Data, etc.)
    Effect: {
      // Target the 'Effect' named export (which is an object/namespace)
      ...(actual.Effect as object), // Spread its original members
      runFork: vi.fn(), // Specifically mock runFork, as used by component for telemetry
      // runPromiseExit is used in the component's queryFn, but useQuery itself is mocked,
      // so its queryFn won't execute with the real Effect.runPromiseExit in these tests.
    },
  };
});

// Mock the @tanstack/react-query module
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  // Keep QueryClient and QueryClientProvider real as they are used for wrapping
  QueryClient: vi.fn(() => ({
    clear: vi.fn(), // Mock methods used by tests if any
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Import after mocks are defined
import Nip90GlobalFeedPane from "@/components/nip90_feed/Nip90GlobalFeedPane";
import { NostrEvent } from "@/services/nostr/NostrService";
import { NIP90Service } from "@/services/nip90/NIP90Service";
// Effect will be the mocked version here
import { Effect } from "effect";  
import { TelemetryService } from "@/services/telemetry";
import { useQuery } from "@tanstack/react-query";  

// Mock dependencies
vi.mock("@/services/runtime", () => ({
  getMainRuntime: vi.fn(() => ({
    context: {
      get: vi.fn((serviceTag) => {
        if (serviceTag === NIP90Service) return mockedNip90Service;
        if (serviceTag === TelemetryService) return mockedTelemetryService;
        return undefined;
      }),
    },
    pipe: vi.fn().mockReturnThis(), // Mock chaining for provide
    provide: vi.fn().mockReturnThis(),
  })),
}));

// Mock the bech32 encoder since we don't need actual encoding in tests
vi.mock("@scure/base", () => ({
  bech32: {
    encode: vi.fn(
      (prefix, data) =>
        `${prefix}1mockencoded${data.toString().substring(0, 5)}`,
    ),
  },
}));

// Mock the ui components we're using
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

// Variables to store mocks
let mockedNip90Service: Partial<NIP90Service>;
let mockedTelemetryService: Partial<TelemetryService>;
let mockEvents: NostrEvent[];

// Sample events for testing
const createSampleEvent = (kind: number): NostrEvent => ({
  id: `test-event-${kind}-${Math.random().toString(36).substring(2, 8)}`,
  pubkey: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100), // Add some variance
  kind,
  tags: [
    ["e", "referenced-event"],
    ["p", "target-pubkey"],
    ...(kind === 7000 ? [["status", "success"]] : []),
    ...(kind >= 5000 && kind < 6000 ? [["i", "Example prompt", "text"]] : []),
  ],
  content: kind === 5100 ? "Input prompt content" : "Response result content",
  sig: "signature",
});

describe("Nip90GlobalFeedPane Component", () => {
  beforeEach(() => {
    mockEvents = [
      createSampleEvent(5100),
      createSampleEvent(6100),
      createSampleEvent(7000),
    ].sort((a, b) => b.created_at - a.created_at); // Ensure sorted by date desc

    mockedNip90Service = {
      listPublicEvents: vi.fn(() => Effect.succeed(mockEvents)),
    };

    mockedTelemetryService = {
      trackEvent: vi.fn(() => Effect.succeed(undefined as void)),
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn(() => Effect.succeed(undefined as void)),
    };

    (useQuery as Mock).mockReturnValue({
      data: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
  });

  it("renders the component with event cards", async () => {
    render(<Nip90GlobalFeedPane />);
    expect(screen.getByText("NIP-90 Global Feed")).toBeInTheDocument();
    expect(screen.getByText(/Job Request \(5100\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Job Result \(6100\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Feedback \(success\)/i)).toBeInTheDocument();
  });

  it("displays event content correctly", async () => {
    render(<Nip90GlobalFeedPane />);
    // Look for content sections rather than specific content text
    expect(screen.getAllByText(/Content:/i).length).toBeGreaterThan(0);
  });

  it("handles empty data gracefully", async () => {
    (useQuery as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
    render(<Nip90GlobalFeedPane />);
    expect(
      screen.getByText("No NIP-90 events found on connected relays."),
    ).toBeInTheDocument();
  });

  it("shows loading state placeholders", async () => {
    (useQuery as Mock).mockReturnValue({
      data: undefined, // No data yet
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    });
    render(<Nip90GlobalFeedPane />);
    // Check for placeholder cards (based on current placeholder implementation)
    const placeholderElements = document.querySelectorAll(".animate-pulse");
    expect(placeholderElements.length).toBeGreaterThan(0); // At least one placeholder element
  });

  it("shows error state", async () => {
    (useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network request failed"),
      refetch: vi.fn(),
      isFetching: false,
    });
    render(<Nip90GlobalFeedPane />);
    expect(screen.getByText("Error Loading NIP-90 Events")).toBeInTheDocument();
    expect(screen.getByText("Network request failed")).toBeInTheDocument();
  });
});
