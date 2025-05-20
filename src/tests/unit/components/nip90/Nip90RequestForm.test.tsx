import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Effect, Layer } from 'effect'; // Import real Effect types
import type { NostrEvent } from '@/services/nostr';
import { NIP90Service, CreateNIP90JobParams, NIP90RequestError, NIP90ValidationError } from '@/services/nip90';
import { TelemetryService } from '@/services/telemetry';
import { mainRuntime } from '@/services/runtime'; // We will mock parts of mainRuntime or its provided services

// Mock the services that mainRuntime would provide to the Nip90RequestForm
const mockCreateJobRequest = vi.fn();
const mockTrackEvent = vi.fn(() => Effect.succeed(undefined));

// Create a mock NIP90Service implementation
const mockNip90ServiceImpl: NIP90Service = {
  createJobRequest: mockCreateJobRequest,
  getJobResult: vi.fn(() => Effect.succeed(null)),
  listJobFeedback: vi.fn(() => Effect.succeed([])),
  subscribeToJobUpdates: vi.fn(() => Effect.succeed({ unsub: vi.fn() })),
};

// Create a mock TelemetryService implementation
const mockTelemetryServiceImpl: TelemetryService = {
  trackEvent: mockTrackEvent,
  isEnabled: vi.fn(() => Effect.succeed(true)),
  setEnabled: vi.fn(() => Effect.succeed(undefined)),
};

// Create a test-specific runtime that provides these mocked services
const testServiceLayer = Layer.mergeAll(
  Layer.succeed(NIP90Service, mockNip90ServiceImpl),
  Layer.succeed(TelemetryService, mockTelemetryServiceImpl)
  // Add other services from FullAppContext if Nip90RequestForm's effects indirectly require them
);
const testRuntime = Effect.runSync(Layer.toRuntime(testServiceLayer).pipe(Effect.scoped));

// Mock the mainRuntime that the component uses
vi.mock('@/services/runtime', () => ({
  mainRuntime: testRuntime, // Use our testRuntime that provides mocked services
}));

// Mock nostr-tools/pure used by the form
vi.mock('nostr-tools/pure', async (importOriginal) => {
  const original = await importOriginal<typeof import('nostr-tools/pure')>();
  return {
    ...original,
    generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Example mock
    getPublicKey: vi.fn(() => 'mockPublicKeyHex'),
  };
});

// Mock localStorage (already present in your setup)
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('{}'),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Nip90RequestForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <Nip90RequestForm />
    </QueryClientProvider>
  );

  beforeEach(() => {
    mockCreateJobRequest.mockClear();
    mockTrackEvent.mockClear();
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('renders form elements correctly', () => {
    renderComponent();
    expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Input Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output MIME Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bid Amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish.*Request/i })).toBeInTheDocument();
  });

  it('allows input values to be changed', () => {
    renderComponent();
    
    const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
    fireEvent.change(jobKindInput, { target: { value: '5001' } });
    expect(jobKindInput.value).toBe('5001');
    
    const inputDataArea = screen.getByLabelText(/Input Data/i) as HTMLTextAreaElement;
    fireEvent.change(inputDataArea, { target: { value: 'Test input' } });
    expect(inputDataArea.value).toBe('Test input');
  });

  it('calls NIP90Service.createJobRequest on publish', async () => {
    // Mock a successful job creation
    const mockSuccessEventId = 'evt123success';
    mockCreateJobRequest.mockReturnValue(Effect.succeed({ id: mockSuccessEventId } as NostrEvent));

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

    await waitFor(() => {
      expect(mockCreateJobRequest).toHaveBeenCalled();
    });
    // You might want to check arguments to mockCreateJobRequest if they are important
    
    // Check for success message
    expect(await screen.findByText(/Success! Event ID:/i)).toBeInTheDocument();
    expect(screen.getByText(mockSuccessEventId)).toBeInTheDocument();
  });

  it('handles errors from NIP90Service.createJobRequest', async () => {
    // Mock a failed job creation
    const errorMsg = "Failed to create job";
    mockCreateJobRequest.mockReturnValue(Effect.fail(new NIP90RequestError({ message: errorMsg })));

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

    await waitFor(() => {
      expect(mockCreateJobRequest).toHaveBeenCalled();
    });
    expect(await screen.findByText(`Error: ${errorMsg}`)).toBeInTheDocument();
  });
});